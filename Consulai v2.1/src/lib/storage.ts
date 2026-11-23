import type {
  ChatMessage,
  Conversation,
  ExportPayload,
  UserSettings,
} from '../types/chat';
import { DEFAULT_ELIGIBLE_MODEL, ELIGIBLE_MODELS } from './chatValidation';

const CONVERSATIONS_KEY = 'consul_ai_conversations_v1';
const SETTINGS_KEY = 'consul_ai_settings_v1';
const ACTIVE_ID_KEY = 'consul_ai_active_conversation_v1';

export const DEFAULT_SETTINGS: UserSettings = {
  theme: 'light',
  responseLength: 'concise',
  model: DEFAULT_ELIGIBLE_MODEL,
};

export function loadConversations(): Conversation[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(CONVERSATIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return sanitizeConversations(parsed);
  } catch {
    return [];
  }
}

export function saveConversations(conversations: Conversation[]): boolean {
  if (typeof window === 'undefined') return false;
  try {
    window.localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(conversations));
    return true;
  } catch {
    return false;
  }
}

export function loadActiveConversationId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(ACTIVE_ID_KEY);
  } catch {
    return null;
  }
}

export function saveActiveConversationId(id: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (id) {
      window.localStorage.setItem(ACTIVE_ID_KEY, id);
    } else {
      window.localStorage.removeItem(ACTIVE_ID_KEY);
    }
  } catch {
    // Ignore storage access errors
  }
}

export function loadSettings(): UserSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<UserSettings>;
    return {
      theme: parsed.theme === 'dark' ? 'dark' : 'light',
      responseLength:
        parsed.responseLength === 'balanced' || parsed.responseLength === 'detailed'
          ? parsed.responseLength
          : 'concise',
      model:
        parsed.model && (ELIGIBLE_MODELS as readonly string[]).includes(parsed.model)
          ? parsed.model
          : DEFAULT_ELIGIBLE_MODEL,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: UserSettings): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage errors
  }
}

export function clearAllStoredConversations(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(CONVERSATIONS_KEY);
    window.localStorage.removeItem(ACTIVE_ID_KEY);
  } catch {
    // Ignore storage errors
  }
}

function sanitizeMessage(raw: unknown): ChatMessage | null {
  if (!raw || typeof raw !== 'object') return null;
  const item = raw as Record<string, unknown>;
  const role = item.role === 'user' || item.role === 'assistant' ? item.role : null;
  const content = typeof item.content === 'string' ? item.content : null;
  if (!role || content === null) return null;

  const followUpQuestions = Array.isArray(item.followUpQuestions)
    ? item.followUpQuestions
        .filter((q): q is string => typeof q === 'string' && q.trim().length > 0)
        .slice(0, 3)
    : undefined;

  const sources = Array.isArray(item.sources)
    ? item.sources
        .filter((s): s is { title: string; uri: string } => {
          if (!s || typeof s !== 'object') return false;
          const entry = s as Record<string, unknown>;
          if (typeof entry.uri !== 'string' || typeof entry.title !== 'string') return false;
          try {
            const parsed = new URL(entry.uri);
            return parsed.protocol === 'http:' || parsed.protocol === 'https:';
          } catch {
            return false;
          }
        })
        .slice(0, 6)
    : undefined;

  return {
    id:
      typeof item.id === 'string' && item.id.trim()
        ? item.id
        : `msg-${Math.random().toString(36).slice(2, 10)}`,
    role,
    content,
    createdAt:
      typeof item.createdAt === 'number' && Number.isFinite(item.createdAt)
        ? item.createdAt
        : Date.now(),
    followUpQuestions: followUpQuestions && followUpQuestions.length > 0 ? followUpQuestions : undefined,
    sources: sources && sources.length > 0 ? sources : undefined,
    isError: Boolean(item.isError),
    stopped: Boolean(item.stopped),
    model: typeof item.model === 'string' ? item.model : undefined,
  };
}

export function sanitizeConversations(raw: unknown): Conversation[] {
  if (!Array.isArray(raw)) return [];
  const valid: Conversation[] = [];

  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const conv = item as Record<string, unknown>;
    const rawMessages = Array.isArray(conv.messages) ? conv.messages : [];
    const messages = rawMessages
      .map(sanitizeMessage)
      .filter((m): m is ChatMessage => m !== null);

    valid.push({
      id:
        typeof conv.id === 'string' && conv.id.trim()
          ? conv.id
          : `conv-${Math.random().toString(36).slice(2, 10)}`,
      title:
        typeof conv.title === 'string' && conv.title.trim()
          ? conv.title.trim().slice(0, 120)
          : 'Imported conversation',
      createdAt:
        typeof conv.createdAt === 'number' && Number.isFinite(conv.createdAt)
          ? conv.createdAt
          : Date.now(),
      updatedAt:
        typeof conv.updatedAt === 'number' && Number.isFinite(conv.updatedAt)
          ? conv.updatedAt
          : Date.now(),
      messages,
    });
  }

  return valid.sort((a, b) => b.updatedAt - a.updatedAt);
}

export function exportConversationsAsJson(conversations: Conversation[]): string {
  const payload: ExportPayload = {
    app: 'Consul AI',
    version: 1,
    exportedAt: new Date().toISOString(),
    conversations,
  };
  return JSON.stringify(payload, null, 2);
}

export function exportConversationsAsTxt(conversations: Conversation[]): string {
  if (conversations.length === 0) {
    return 'Consul AI — No conversations to export.\n';
  }

  const sections = conversations.map((conv) => {
    const header = `============================================================\nTitle: ${conv.title}\nUpdated: ${new Date(conv.updatedAt).toLocaleString()}\n============================================================`;
    const body = conv.messages
      .map((msg) => {
        const speaker = msg.role === 'user' ? 'You' : 'Consul AI';
        const time = new Date(msg.createdAt).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        });
        let block = `[${time}] ${speaker}:\n${msg.content}`;
        if (msg.followUpQuestions && msg.followUpQuestions.length > 0) {
          block += `\n\nSuggested follow-ups:\n${msg.followUpQuestions
            .map((q, idx) => `  ${idx + 1}. ${q}`)
            .join('\n')}`;
        }
        return block;
      })
      .join('\n\n------------------------------------------------------------\n\n');

    return `${header}\n\n${body}`;
  });

  return sections.join('\n\n\n') + '\n';
}

export function parseImportedConversations(
  rawJson: string
): { ok: true; conversations: Conversation[] } | { ok: false; error: string } {
  if (!rawJson || !rawJson.trim()) {
    return { ok: false, error: 'The selected file is empty.' };
  }

  if (rawJson.length > 5_000_000) {
    return { ok: false, error: 'Import file exceeds the 5MB safety limit.' };
  }

  try {
    const parsed: unknown = JSON.parse(rawJson);
    const list: unknown[] | null = Array.isArray(parsed)
      ? parsed
      : parsed &&
          typeof parsed === 'object' &&
          Array.isArray((parsed as Record<string, unknown>).conversations)
        ? ((parsed as Record<string, unknown>).conversations as unknown[])
        : null;

    if (!list) {
      return {
        ok: false,
        error: 'Invalid format. Please choose a JSON file exported from Consul AI.',
      };
    }

    const conversations = sanitizeConversations(list);
    if (conversations.length === 0 && list.length > 0) {
      return {
        ok: false,
        error: 'No valid conversations were found inside the selected file.',
      };
    }

    return { ok: true, conversations };
  } catch {
    return {
      ok: false,
      error: 'Could not read JSON file. Please verify the file is valid JSON.',
    };
  }
}

export function mergeImportedConversations(
  existing: Conversation[],
  imported: Conversation[]
): Conversation[] {
  const byId = new Map<string, Conversation>();
  for (const conv of existing) {
    byId.set(conv.id, conv);
  }
  for (const conv of imported) {
    const current = byId.get(conv.id);
    if (!current || conv.updatedAt >= current.updatedAt) {
      byId.set(conv.id, conv);
    }
  }
  return Array.from(byId.values()).sort((a, b) => b.updatedAt - a.updatedAt);
}
