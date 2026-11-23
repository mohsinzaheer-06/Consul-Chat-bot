export const FOLLOWUP_MARKER = '---FOLLOWUPS---';

export interface ParsedAssistantPayload {
  answer: string;
  followUps: string[];
}

export function parseFollowUpSection(rawFollowUpText: string): string[] {
  const cleaned = rawFollowUpText
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  if (!cleaned) {
    return [];
  }

  // Try direct JSON array parse first
  try {
    const startIdx = cleaned.indexOf('[');
    const endIdx = cleaned.lastIndexOf(']');
    if (startIdx !== -1 && endIdx > startIdx) {
      const parsed = JSON.parse(cleaned.slice(startIdx, endIdx + 1));
      if (Array.isArray(parsed)) {
        return normalizeFollowUps(
          parsed.filter((item): item is string => typeof item === 'string')
        );
      }
    }
  } catch {
    // Fall back to line-based extraction below
  }

  const lines = cleaned
    .split('\n')
    .map((line) =>
      line
        .replace(/^\s*(?:[-*•]|\d+[.)\]])\s*/, '')
        .replace(/^["']|["'],?$/g, '')
        .trim()
    )
    .filter((line) => line.length >= 2 && line !== '[' && line !== ']');

  return normalizeFollowUps(lines);
}

function normalizeFollowUps(items: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const raw of items) {
    const normalized = raw.replace(/\s+/g, ' ').trim();
    if (!normalized || normalized.length < 2) continue;
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(normalized);
    if (result.length === 3) break;
  }

  return result;
}

export function splitAnswerAndFollowUps(fullText: string): ParsedAssistantPayload {
  const markerIndex = fullText.indexOf(FOLLOWUP_MARKER);
  if (markerIndex === -1) {
    return {
      answer: fullText.trimEnd(),
      followUps: [],
    };
  }

  const answer = fullText.slice(0, markerIndex).trimEnd();
  const followUpRaw = fullText.slice(markerIndex + FOLLOWUP_MARKER.length);
  return {
    answer,
    followUps: parseFollowUpSection(followUpRaw),
  };
}

/**
 * Incremental streaming accumulator that suppresses any partial prefix of
 * "---FOLLOWUPS---" from leaking into the visible answer stream, while
 * streaming all normal text immediately.
 */
export function createStreamAccumulator() {
  let pending = '';
  let inFollowUps = false;
  let followUpRaw = '';
  let emittedAnswer = '';

  function findPartialMarkerOverlap(text: string): number {
    const maxCheck = Math.min(text.length, FOLLOWUP_MARKER.length - 1);
    for (let len = maxCheck; len >= 1; len--) {
      if (FOLLOWUP_MARKER.startsWith(text.slice(text.length - len))) {
        return len;
      }
    }
    return 0;
  }

  return {
    push(chunk: string): string {
      if (!chunk) return '';

      if (inFollowUps) {
        followUpRaw += chunk;
        return '';
      }

      pending += chunk;
      const markerIdx = pending.indexOf(FOLLOWUP_MARKER);
      if (markerIdx !== -1) {
        const visiblePart = pending.slice(0, markerIdx).replace(/\n+$/, (match) =>
          match.length > 2 ? '\n\n' : match
        );
        const trimmedVisible = pending.slice(0, markerIdx);
        inFollowUps = true;
        followUpRaw = pending.slice(markerIdx + FOLLOWUP_MARKER.length);
        pending = '';

        // Trim trailing blank lines directly preceding the marker
        const finalDelta = trimmedVisible.replace(/\n{1,2}$/, '');
        if (visiblePart.length > 0 && finalDelta.length === 0) {
          return '';
        }
        emittedAnswer += finalDelta;
        return finalDelta;
      }

      const overlap = findPartialMarkerOverlap(pending);
      const safeLength = pending.length - overlap;
      if (safeLength <= 0) {
        return '';
      }

      const toEmit = pending.slice(0, safeLength);
      pending = pending.slice(safeLength);
      emittedAnswer += toEmit;
      return toEmit;
    },

    finalize(): { remainingDelta: string; fullAnswer: string; followUps: string[] } {
      let remainingDelta = '';
      if (!inFollowUps && pending.length > 0) {
        remainingDelta = pending;
        emittedAnswer += remainingDelta;
        pending = '';
      }

      return {
        remainingDelta,
        fullAnswer: emittedAnswer.trimEnd(),
        followUps: inFollowUps ? parseFollowUpSection(followUpRaw) : [],
      };
    },
  };
}
