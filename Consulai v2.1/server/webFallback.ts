import type { GroundingSource, UserLocationContext } from '../src/types/chat';

const WEB_FETCH_TIMEOUT_MS = 1400;

function stripHtmlTags(input: string): string {
  return input
    .replace(/<[^>]*>/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function shouldLookupWeather(query: string): boolean {
  return /\b(weather|temperature|forecast|rain|sunny|cloudy|humidity|wind|temp|mausam)\b|موسم|درجہ حرارت/i.test(
    query
  );
}

function isPersonalContextOnlyQuery(query: string): boolean {
  return /\b(my location|my ip|my timezone|my time zone|where am i|current local time|what time is it)\b/i.test(
    query
  );
}

function extractSearchTopic(query: string): string {
  return query
    .replace(
      /^(search the web[:\s]*|tell me about|what is the|what is|who is|when did|explain|latest news on|latest on)\s+/i,
      ''
    )
    .replace(/[?!.]+$/g, '')
    .trim()
    .slice(0, 120);
}

function shouldLookupWeb(query: string): boolean {
  if (query.trim().length < 4) return false;
  if (isPersonalContextOnlyQuery(query) && !/\b(news|headline|stock|price|release)\b/i.test(query)) {
    return false;
  }
  return /\b(latest|news|headline|current|price|rate|exchange|who is|what is|when did|update|search|web|version|release|stock|score|match|capital)\b|\?/i.test(
    query
  );
}

async function fetchOpenMeteoWeather(
  latitude: number,
  longitude: number,
  timezone: string,
  cityLabel?: string
): Promise<{ line: string; source: GroundingSource } | null> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(
      String(latitude)
    )}&longitude=${encodeURIComponent(
      String(longitude)
    )}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m&timezone=${encodeURIComponent(
      timezone
    )}`;

    const res = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(WEB_FETCH_TIMEOUT_MS),
    });
    if (!res.ok) return null;

    const data = (await res.json()) as {
      current?: {
        temperature_2m?: number;
        apparent_temperature?: number;
        relative_humidity_2m?: number;
        wind_speed_10m?: number;
      };
    };

    if (!data.current || typeof data.current.temperature_2m !== 'number') return null;

    const c = data.current;
    const place = cityLabel ? ` in ${cityLabel}` : '';
    const line = `Live local weather${place} (Open-Meteo): ${c.temperature_2m}°C (feels like ${
      c.apparent_temperature ?? c.temperature_2m
    }°C), humidity ${c.relative_humidity_2m ?? 'N/A'}%, wind ${c.wind_speed_10m ?? 'N/A'} km/h.`;

    return {
      line,
      source: {
        title: `Live Weather${place} — Open-Meteo`,
        uri: `https://open-meteo.com/`,
      },
    };
  } catch {
    return null;
  }
}

async function fetchWikipediaSummary(
  topic: string
): Promise<{ lines: string[]; sources: GroundingSource[] }> {
  try {
    if (!topic || topic.length < 3) return { lines: [], sources: [] };

    const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
      topic
    )}&srlimit=2&format=json&utf8=1`;

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'User-Agent': 'ConsulAI/1.0 (https://localhost)',
      },
      signal: AbortSignal.timeout(WEB_FETCH_TIMEOUT_MS),
    });

    if (!res.ok) return { lines: [], sources: [] };
    const data = (await res.json()) as {
      query?: {
        search?: Array<{ title?: string; snippet?: string }>;
      };
    };

    const items = data.query?.search ?? [];
    const lines: string[] = [];
    const sources: GroundingSource[] = [];

    for (const item of items.slice(0, 2)) {
      if (!item.title || !item.snippet) continue;
      const cleanSnippet = stripHtmlTags(item.snippet);
      if (!cleanSnippet) continue;
      const pageUrl = `https://en.wikipedia.org/wiki/${encodeURIComponent(
        item.title.replace(/\s+/g, '_')
      )}`;
      lines.push(`- [Wikipedia: ${item.title}] ${cleanSnippet}`);
      sources.push({ title: `${item.title} — Wikipedia`, uri: pageUrl });
    }

    return { lines, sources };
  } catch {
    return { lines: [], sources: [] };
  }
}

async function fetchDuckDuckGoInstant(
  topic: string
): Promise<{ lines: string[]; sources: GroundingSource[] }> {
  try {
    if (!topic || topic.length < 3) return { lines: [], sources: [] };

    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(
      topic
    )}&format=json&no_html=1&skip_disambig=1`;

    const res = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(WEB_FETCH_TIMEOUT_MS),
    });

    if (!res.ok) return { lines: [], sources: [] };
    const data = (await res.json()) as {
      Heading?: string;
      AbstractText?: string;
      AbstractURL?: string;
      Answer?: string;
    };

    const lines: string[] = [];
    const sources: GroundingSource[] = [];

    if (typeof data.Answer === 'string' && data.Answer.trim()) {
      lines.push(`- [Web Instant Answer] ${data.Answer.trim()}`);
    }

    if (typeof data.AbstractText === 'string' && data.AbstractText.trim()) {
      const heading = data.Heading?.trim() || 'Web Summary';
      lines.push(`- [${heading}] ${data.AbstractText.trim()}`);
      if (typeof data.AbstractURL === 'string') {
        try {
          const parsed = new URL(data.AbstractURL);
          if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
            sources.push({ title: heading, uri: parsed.toString() });
          }
        } catch {
          // ignore malformed url
        }
      }
    }

    return { lines, sources };
  } catch {
    return { lines: [], sources: [] };
  }
}

export async function fetchLiveWebFallback(
  query: string,
  locationContext?: UserLocationContext
): Promise<{ webSnippet?: string; sources: GroundingSource[] }> {
  const wantsWeather =
    shouldLookupWeather(query) &&
    typeof locationContext?.latitude === 'number' &&
    typeof locationContext?.longitude === 'number';
  const wantsWeb = shouldLookupWeb(query) && !wantsWeather;

  if (!wantsWeather && !wantsWeb) {
    return { sources: [] };
  }

  const topic = extractSearchTopic(query);
  const cityLabel = [locationContext?.city, locationContext?.country].filter(Boolean).join(', ');

  const weatherTask = wantsWeather
    ? fetchOpenMeteoWeather(
        locationContext!.latitude!,
        locationContext!.longitude!,
        locationContext!.timezone,
        cityLabel || undefined
      )
    : Promise.resolve(null);

  const wikiTask = wantsWeb
    ? fetchWikipediaSummary(topic)
    : Promise.resolve({ lines: [], sources: [] });

  const ddgTask = wantsWeb
    ? fetchDuckDuckGoInstant(topic)
    : Promise.resolve({ lines: [], sources: [] });

  const [weatherRes, wikiRes, ddgRes] = await Promise.all([weatherTask, wikiTask, ddgTask]);

  const lines: string[] = [];
  const sources: GroundingSource[] = [];
  const seen = new Set<string>();

  if (weatherRes) {
    lines.push(weatherRes.line);
    seen.add(weatherRes.source.uri);
    sources.push(weatherRes.source);
  }

  for (const line of ddgRes.lines) lines.push(line);
  for (const src of ddgRes.sources) {
    if (!seen.has(src.uri)) {
      seen.add(src.uri);
      sources.push(src);
    }
  }

  for (const line of wikiRes.lines) lines.push(line);
  for (const src of wikiRes.sources) {
    if (!seen.has(src.uri) && sources.length < 4) {
      seen.add(src.uri);
      sources.push(src);
    }
  }

  return {
    webSnippet: lines.length > 0 ? lines.join('\n') : undefined,
    sources,
  };
}
