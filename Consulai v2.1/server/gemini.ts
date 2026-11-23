import { GoogleGenAI, ThinkingLevel, type Content } from '@google/genai';
import {
  buildSystemInstruction,
  resolveEligibleModel,
} from '../src/lib/chatValidation';
import { fetchLiveWebFallback } from './webFallback';
import type {
  ChatHistoryTurn,
  EligibleModel,
  GroundingSource,
  ResponseLength,
  UserLocationContext,
} from '../src/types/chat';

export interface MappedApiError {
  status: number;
  code: string;
  message: string;
  retryable: boolean;
}

export function isApiKeyConfigured(): boolean {
  const key = process.env.GEMINI_API_KEY?.trim();
  return Boolean(key && key !== 'MY_GEMINI_API_KEY');
}

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error('MISSING_API_KEY');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export function normalizeGeminiContents(
  history: ChatHistoryTurn[],
  latestMessage: string
): Content[] {
  const normalized: Content[] = [];

  for (const turn of history) {
    if (!turn.content.trim()) continue;
    const prev = normalized[normalized.length - 1];
    if (!prev) {
      if (turn.role === 'user') {
        normalized.push({ role: 'user', parts: [{ text: turn.content }] });
      }
      continue;
    }

    if (prev.role === turn.role && prev.parts?.[0]?.text) {
      prev.parts[0].text = `${prev.parts[0].text}\n\n${turn.content}`;
    } else {
      normalized.push({ role: turn.role, parts: [{ text: turn.content }] });
    }
  }

  const last = normalized[normalized.length - 1];
  if (last && last.role === 'user' && last.parts?.[0]?.text) {
    last.parts[0].text = `${last.parts[0].text}\n\n${latestMessage}`;
  } else {
    normalized.push({ role: 'user', parts: [{ text: latestMessage }] });
  }

  return normalized;
}

export function extractGroundingSourcesFromChunk(
  chunk: unknown,
  seenUris: Set<string>,
  collected: GroundingSource[]
): void {
  if (!chunk || typeof chunk !== 'object' || collected.length >= 6) return;
  const candidate = (chunk as { candidates?: Array<{ groundingMetadata?: { groundingChunks?: unknown[] } }> })
    .candidates?.[0];
  const groundingChunks = candidate?.groundingMetadata?.groundingChunks;
  if (!Array.isArray(groundingChunks)) return;

  for (const item of groundingChunks) {
    if (collected.length >= 6) break;
    if (!item || typeof item !== 'object') continue;
    const web = (item as { web?: { uri?: unknown; title?: unknown } }).web;
    if (!web || typeof web.uri !== 'string') continue;

    let safeUri = '';
    try {
      const parsed = new URL(web.uri.trim());
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') continue;
      safeUri = parsed.toString();
    } catch {
      continue;
    }

    if (seenUris.has(safeUri)) continue;
    seenUris.add(safeUri);

    const rawTitle = typeof web.title === 'string' ? web.title.trim() : '';
    let fallbackHost = safeUri;
    try {
      fallbackHost = new URL(safeUri).hostname.replace(/^www\./, '');
    } catch {
      // keep uri
    }

    collected.push({
      title: rawTitle || fallbackHost,
      uri: safeUri,
    });
  }
}

export function mapGeminiError(err: unknown): MappedApiError {
  const rawMessage = err instanceof Error ? err.message : String(err ?? 'Unknown error');
  const statusMatch = rawMessage.match(/\b(400|401|403|404|429|500|502|503|504)\b/);
  const numericStatus =
    typeof (err as { status?: unknown })?.status === 'number'
      ? (err as { status: number }).status
      : statusMatch
        ? Number(statusMatch[1])
        : 500;

  if (rawMessage === 'MISSING_API_KEY') {
    return {
      status: 503,
      code: 'MISSING_API_KEY',
      message:
        'Gemini API key is not configured on the server. Please add GEMINI_API_KEY in Settings > Secrets (or .env.local when running locally).',
      retryable: false,
    };
  }

  if (
    numericStatus === 429 ||
    /RESOURCE_EXHAUSTED|quota|rate limit|too many requests/i.test(rawMessage)
  ) {
    return {
      status: 429,
      code: 'RATE_LIMIT_EXCEEDED',
      message:
        'The free-tier API rate limit or quota has been reached. Please wait a few seconds and try again, or switch to the lighter model in Settings.',
      retryable: true,
    };
  }

  if (
    numericStatus === 401 ||
    numericStatus === 403 ||
    /PERMISSION_DENIED|API_KEY_INVALID|invalid api key/i.test(rawMessage)
  ) {
    return {
      status: 403,
      code: 'API_KEY_INVALID',
      message:
        'The configured Gemini API key was rejected. Please verify GEMINI_API_KEY in Settings > Secrets.',
      retryable: false,
    };
  }

  if (numericStatus === 404 || /NOT_FOUND/i.test(rawMessage)) {
    return {
      status: 404,
      code: 'MODEL_NOT_FOUND',
      message:
        'The selected Gemini model is currently unavailable. Please try switching models in Settings.',
      retryable: false,
    };
  }

  if (numericStatus === 400) {
    return {
      status: 400,
      code: 'BAD_REQUEST',
      message:
        'The request could not be processed. Please shorten your message or start a new conversation.',
      retryable: false,
    };
  }

  console.error('[gemini-api-error]', numericStatus, rawMessage.slice(0, 300));

  return {
    status: 502,
    code: 'UPSTREAM_ERROR',
    message:
      'Unable to reach the AI service right now. Please check your connection and try again.',
    retryable: true,
  };
}

const SEARCH_COOLDOWN_MS = 60_000;
const searchCooldownUntil = new Map<EligibleModel, number>();

export async function generateChatStream(params: {
  message: string;
  history: ChatHistoryTurn[];
  responseLength: ResponseLength;
  requestedModel?: EligibleModel;
  locationContext?: UserLocationContext;
  signal: AbortSignal;
}) {
  const ai = getGeminiClient();
  const primaryModel = resolveEligibleModel(params.requestedModel, process.env.GEMINI_MODEL);
  const fallbackModel: EligibleModel =
    primaryModel === 'gemini-4-hydrogen' ? 'gemini-3.1-flash-lite' : 'gemini-4-hydrogen';
  const allContents = normalizeGeminiContents(params.history, params.message);
  const priorHistory = allContents.slice(0, -1);

  let cachedFallbackWeb: { webSnippet?: string; sources: GroundingSource[] } | null = null;
  const getFallbackWeb = async () => {
    if (!cachedFallbackWeb) {
      cachedFallbackWeb = await fetchLiveWebFallback(params.message, params.locationContext);
    }
    return cachedFallbackWeb;
  };

  const openStreamForModel = async (targetModel: EligibleModel, enableSearch: boolean) => {
    const fallbackWeb = enableSearch ? { webSnippet: undefined, sources: [] } : await getFallbackWeb();
    const systemInstruction = buildSystemInstruction(
      params.responseLength,
      params.locationContext,
      fallbackWeb.webSnippet
    );

    const toolsConfig = enableSearch ? { tools: [{ googleSearch: {} }] } : {};
    const config =
      targetModel === 'gemini-4-hydrogen'
        ? {
            systemInstruction,
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            ...toolsConfig,
          }
        : {
            systemInstruction,
            ...toolsConfig,
          };

    if (priorHistory.length > 0) {
      const chat = ai.chats.create({
        model: targetModel,
        history: priorHistory,
        config,
      });
      const stream = await chat.sendMessageStream({
        message: params.message,
      });
      return { stream, model: targetModel, fallbackSources: fallbackWeb.sources };
    }

    const stream = await ai.models.generateContentStream({
      model: targetModel,
      contents: allContents,
      config,
    });
    return { stream, model: targetModel, fallbackSources: fallbackWeb.sources };
  };

  const now = Date.now();
  const rawAttempts: Array<{ model: EligibleModel; search: boolean }> = [
    { model: primaryModel, search: true },
    { model: fallbackModel, search: true },
    { model: primaryModel, search: false },
    { model: fallbackModel, search: false },
  ];

  const attempts = rawAttempts.filter(
    (a) => !a.search || (searchCooldownUntil.get(a.model) ?? 0) <= now
  );

  let lastErr: unknown;

  for (let i = 0; i < attempts.length; i++) {
    const attempt = attempts[i];
    if (params.signal.aborted) {
      throw lastErr ?? new Error('Aborted');
    }

    try {
      return await openStreamForModel(attempt.model, attempt.search);
    } catch (err) {
      lastErr = err;
      if (params.signal.aborted) {
        throw err;
      }

      const mapped = mapGeminiError(err);

      if (attempt.search && (mapped.code === 'RATE_LIMIT_EXCEEDED' || mapped.code === 'BAD_REQUEST')) {
        searchCooldownUntil.set(attempt.model, Date.now() + SEARCH_COOLDOWN_MS);
        continue;
      }

      if (mapped.code === 'RATE_LIMIT_EXCEEDED') {
        continue;
      }

      if (mapped.retryable) {
        await new Promise((resolve) => setTimeout(resolve, 450));
        try {
          return await openStreamForModel(attempt.model, attempt.search);
        } catch (retryErr) {
          lastErr = retryErr;
          continue;
        }
      }

      throw err;
    }
  }

  throw lastErr;
}

export async function generateFollowUpsFallback(params: {
  userMessage: string;
  assistantAnswer: string;
  requestedModel?: EligibleModel;
}): Promise<string[]> {
  try {
    const ai = getGeminiClient();
    const model = resolveEligibleModel(params.requestedModel, process.env.GEMINI_MODEL);
    const { Type } = await import('@google/genai');

    const response = await ai.models.generateContent({
      model,
      contents: `User message: ${params.userMessage}\n\nAssistant answer: ${params.assistantAnswer}\n\nGenerate exactly 3 short, practical, non-generic follow-up questions directly related to this conversation, in the exact same language and script (English, Urdu script, or Roman Urdu) as the assistant answer. Avoid questions already answered.`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            followUps: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
          required: ['followUps'],
        },
        ...(model === 'gemini-4-hydrogen'
          ? { thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } }
          : {}),
      },
    });

    const parsed = JSON.parse((response.text ?? '{}').trim()) as { followUps?: unknown };
    if (Array.isArray(parsed.followUps)) {
      return parsed.followUps
        .filter((q): q is string => typeof q === 'string' && q.trim().length >= 2)
        .map((q) => q.trim())
        .slice(0, 3);
    }
  } catch {
    // Do not fail the main response if fallback follow-up call hits transient error
  }
  return [];
}
