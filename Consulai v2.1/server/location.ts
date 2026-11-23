import { isIP } from 'node:net';
import type { ClientContext, UserLocationContext } from '../src/types/chat';

interface CachedGeo {
  city?: string;
  region?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  expiresAt: number;
}

const GEO_CACHE_TTL_MS = 15 * 60 * 1000;
const GEO_CACHE_MAX_SIZE = 500;
const GEO_FETCH_TIMEOUT_MS = 850;
const geoCache = new Map<string, CachedGeo>();

type HeaderBag =
  | Headers
  | Record<string, string | string[] | undefined>
  | undefined;

function readHeader(headers: HeaderBag, name: string): string | undefined {
  if (!headers) return undefined;
  if (typeof (headers as Headers).get === 'function') {
    return (headers as Headers).get(name) ?? undefined;
  }
  const record = headers as Record<string, string | string[] | undefined>;
  const direct = record[name] ?? record[name.toLowerCase()];
  if (Array.isArray(direct)) return direct[0];
  return direct;
}

export function normalizeIpCandidate(raw?: string | null): string | undefined {
  if (!raw) return undefined;
  let candidate = raw.trim();
  if (!candidate) return undefined;

  // Strip surrounding quotes if present
  candidate = candidate.replace(/^["']|["']$/g, '').trim();

  // Strip IPv6 bracket notation [::1]:1234
  if (candidate.startsWith('[')) {
    const closing = candidate.indexOf(']');
    if (closing !== -1) {
      candidate = candidate.slice(1, closing);
    }
  } else if (candidate.includes('.') && candidate.includes(':')) {
    // IPv4 with port e.g. 203.0.113.5:41234 (ignore ::ffff:1.2.3.4)
    if (!candidate.toLowerCase().startsWith('::ffff:')) {
      const lastColon = candidate.lastIndexOf(':');
      const potentialPort = candidate.slice(lastColon + 1);
      if (/^\d+$/.test(potentialPort)) {
        candidate = candidate.slice(0, lastColon);
      }
    }
  }

  // Unwrap IPv4-mapped IPv6 addresses
  if (candidate.toLowerCase().startsWith('::ffff:')) {
    candidate = candidate.slice(7);
  }

  return isIP(candidate) !== 0 ? candidate : undefined;
}

export function isPublicRoutableIp(ip: string): boolean {
  const version = isIP(ip);
  if (version === 4) {
    const parts = ip.split('.').map(Number);
    if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
      return false;
    }
    const [a, b] = parts;
    if (a === 0) return false; // 0.0.0.0/8
    if (a === 10) return false; // 10.0.0.0/8 (RFC1918)
    if (a === 100 && b >= 64 && b <= 127) return false; // 100.64.0.0/10 (CGNAT)
    if (a === 127) return false; // 127.0.0.0/8 (Loopback)
    if (a === 169 && b === 254) return false; // 169.254.0.0/16 (Link-local)
    if (a === 172 && b >= 16 && b <= 31) return false; // 172.16.0.0/12 (RFC1918)
    if (a === 192 && b === 0 && parts[2] === 0) return false; // 192.0.0.0/24
    if (a === 192 && b === 168) return false; // 192.168.0.0/16 (RFC1918)
    if (a === 198 && (b === 18 || b === 19)) return false; // Benchmark
    if (a >= 224) return false; // Multicast & reserved
    return true;
  }

  if (version === 6) {
    const lower = ip.toLowerCase();
    if (lower === '::' || lower === '::1') return false;
    if (lower.startsWith('fe80:') || lower.startsWith('fe9') || lower.startsWith('fea') || lower.startsWith('feb')) {
      return false; // Link-local fe80::/10
    }
    if (lower.startsWith('fc') || lower.startsWith('fd')) {
      return false; // Unique local fc00::/7
    }
    if (lower.startsWith('ff')) {
      return false; // Multicast
    }
    return true;
  }

  return false;
}

export function extractClientIp(
  headers: HeaderBag,
  remoteAddress?: string | null
): string | undefined {
  const candidates: string[] = [];

  const cfIp = readHeader(headers, 'cf-connecting-ip');
  if (cfIp) candidates.push(cfIp);

  const realIp = readHeader(headers, 'x-real-ip');
  if (realIp) candidates.push(realIp);

  const vercelFwd = readHeader(headers, 'x-vercel-forwarded-for');
  if (vercelFwd) {
    for (const part of vercelFwd.split(',')) {
      candidates.push(part);
    }
  }

  const forwarded = readHeader(headers, 'x-forwarded-for');
  if (forwarded) {
    for (const part of forwarded.split(',')) {
      candidates.push(part);
    }
  }

  if (remoteAddress) {
    candidates.push(remoteAddress);
  }

  const normalized = candidates
    .map((c) => normalizeIpCandidate(c))
    .filter((ip): ip is string => Boolean(ip));

  const publicIp = normalized.find((ip) => isPublicRoutableIp(ip));
  return publicIp ?? normalized[0];
}

export function isValidIanaTimeZone(tz?: string | null): tz is string {
  if (!tz || typeof tz !== 'string') return false;
  const trimmed = tz.trim();
  if (!trimmed || trimmed.length > 64) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: trimmed });
    return true;
  } catch {
    return false;
  }
}

function formatLocalDateTime(timeZone: string, now: Date): string {
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone,
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short',
    }).format(now);
  } catch {
    return now.toUTCString();
  }
}

async function lookupPublicIpGeo(ip: string): Promise<Omit<CachedGeo, 'expiresAt'> | null> {
  if (!isPublicRoutableIp(ip)) return null;

  const now = Date.now();
  const cached = geoCache.get(ip);
  if (cached && cached.expiresAt > now) {
    return {
      city: cached.city,
      region: cached.region,
      country: cached.country,
      latitude: cached.latitude,
      longitude: cached.longitude,
      timezone: cached.timezone,
    };
  }

  try {
    const response = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(GEO_FETCH_TIMEOUT_MS),
    });

    if (!response.ok) return null;
    const data = (await response.json()) as {
      success?: boolean;
      city?: unknown;
      region?: unknown;
      country?: unknown;
      latitude?: unknown;
      longitude?: unknown;
      timezone?: { id?: unknown };
    };

    if (data.success === false) return null;

    const entry: Omit<CachedGeo, 'expiresAt'> = {
      city: typeof data.city === 'string' && data.city.trim() ? data.city.trim() : undefined,
      region: typeof data.region === 'string' && data.region.trim() ? data.region.trim() : undefined,
      country:
        typeof data.country === 'string' && data.country.trim() ? data.country.trim() : undefined,
      latitude:
        typeof data.latitude === 'number' && Number.isFinite(data.latitude)
          ? data.latitude
          : undefined,
      longitude:
        typeof data.longitude === 'number' && Number.isFinite(data.longitude)
          ? data.longitude
          : undefined,
      timezone:
        typeof data.timezone?.id === 'string' && isValidIanaTimeZone(data.timezone.id)
          ? data.timezone.id.trim()
          : undefined,
    };

    if (geoCache.size >= GEO_CACHE_MAX_SIZE) {
      const oldestKey = geoCache.keys().next().value;
      if (oldestKey) geoCache.delete(oldestKey);
    }

    geoCache.set(ip, {
      ...entry,
      expiresAt: now + GEO_CACHE_TTL_MS,
    });

    return entry;
  } catch {
    return null;
  }
}

export async function resolveUserLocationContext(params: {
  headers?: HeaderBag;
  remoteAddress?: string | null;
  clientContext?: ClientContext;
}): Promise<UserLocationContext> {
  const clientTz = isValidIanaTimeZone(params.clientContext?.timezone)
    ? params.clientContext.timezone.trim()
    : undefined;

  const extractedIp = extractClientIp(params.headers, params.remoteAddress);
  const hasPublicIp = Boolean(extractedIp && isPublicRoutableIp(extractedIp));
  const geo = hasPublicIp && extractedIp ? await lookupPublicIpGeo(extractedIp) : null;

  const timezone = clientTz ?? geo?.timezone ?? 'UTC';
  const now = new Date();

  const source: UserLocationContext['source'] =
    geo && clientTz ? 'ip+browser' : geo ? 'ip' : 'browser';

  return {
    ip: hasPublicIp ? extractedIp : undefined,
    city: geo?.city,
    region: geo?.region,
    country: geo?.country,
    latitude: geo?.latitude,
    longitude: geo?.longitude,
    timezone,
    localTimeFormatted: formatLocalDateTime(timezone, now),
    source,
  };
}
