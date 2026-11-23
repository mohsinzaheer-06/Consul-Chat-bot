export type ThemeMode = 'light' | 'dark';

export type ResponseLength = 'concise' | 'balanced' | 'detailed';

export type EligibleModel = 'gemini-4-hydrogen' | 'gemini-3.1-flash-lite';

export type MessageRole = 'user' | 'assistant';

export type TextDirection = 'ltr' | 'rtl';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: number;
  followUpQuestions?: string[];
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
}

export interface ExportPayload {
  app: string;
  version: number;
  exportedAt: string;
  conversations: Conversation[];
}
