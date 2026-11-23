export type ThemeMode = 'light' | 'dark';

export type ResponseLength = 'concise' | 'balanced' | 'detailed';

export type EligibleModel = 'gemini-4-hydrogen' | 'gemini-3.1-flash-lite';

export type MessageRole = 'user' | 'assistant';

export type TextDirection = 'ltr' | 'rtl';

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface ClientContext {
  timezone?: string;
  localTimeIso?: string;
  locale?: string;
}

export interface UserLocationContext {
  ip?: string;
  city?: string;
  region?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  timezone: string;
  localTimeFormatted: string;
  source: 'ip+browser' | 'ip' | 'browser';
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: number;
  followUpQuestions?: string[];
  sources?: GroundingSource[];
  isError?: boolean;
  stopped?: boolean;
  model?: string;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
}

export interface UserSettings {
  theme: ThemeMode;
  responseLength: ResponseLength;
  model: EligibleModel;
}

export interface ChatHistoryTurn {
  role: 'user' | 'model';
  content: string;
}

export interface ChatRequestPayload {
  message: string;
  history: ChatHistoryTurn[];
  responseLength: ResponseLength;
  model?: EligibleModel;
  clientContext?: ClientContext;
}

export interface ExportPayload {
  app: string;
  version: number;
  exportedAt: string;
  conversations: Conversation[];
}
