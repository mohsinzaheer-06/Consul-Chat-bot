import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { generateConversationTitle } from '../lib/language';
import {
  clearAllStoredConversations,
  exportConversationsAsJson,
  exportConversationsAsTxt,
  loadActiveConversationId,
  loadConversations,
  loadSettings,
  mergeImportedConversations,
  parseImportedConversations,
  saveActiveConversationId,
  saveConversations,
  saveSettings,
} from '../lib/storage';
import type {
  ChatHistoryTurn,
  ChatMessage,
  Conversation,
  EligibleModel,
  ResponseLength,
  ThemeMode,
  UserSettings,
} from '../types/chat';

function createId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export interface ChatErrorState {
  message: string;
  retryable: boolean;
  lastPrompt?: string;
}

export function useChatStore() {
  const [conversations, setConversations] = useState<Conversation[]>(() => loadConversations());
  const [activeConversationId, setActiveConversationId] = useState<string | null>(() => {
    const savedId = loadActiveConversationId();
    const list = loadConversations();
    if (savedId && list.some((c) => c.id === savedId)) {
      return savedId;
    }
    return list[0]?.id ?? null;
  });
  const [settings, setSettings] = useState<UserSettings>(() => loadSettings());
  const [searchQuery, setSearchQuery] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorState, setErrorState] = useState<ChatErrorState | null>(null);
  const [storageWarning, setStorageWarning] = useState<string | null>(null);
  const [focusInputSignal, setFocusInputSignal] = useState(0);

  const isGeneratingRef = useRef(false);
  const generationTokenRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const conversationsRef = useRef(conversations);
  conversationsRef.current = conversations;

  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  // Apply dark mode class to <html> and persist settings
  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    saveSettings(settings);
  }, [settings]);

  // Persist conversations
  useEffect(() => {
    const ok = saveConversations(conversations);
    if (!ok) {
      setStorageWarning(
        'Browser storage is nearly full. Export and clear older conversations to avoid losing new messages.'
      );
    } else {
      setStorageWarning(null);
    }
  }, [conversations]);

  // Persist active conversation id
  useEffect(() => {
    saveActiveConversationId(activeConversationId);
  }, [activeConversationId]);

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeConversationId) ?? null,
    [conversations, activeConversationId]
  );

  const filteredConversations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((conv) => {
      if (conv.title.toLowerCase().includes(q)) return true;
      return conv.messages.some((m) => m.content.toLowerCase().includes(q));
    });
  }, [conversations, searchQuery]);

  const updateTheme = useCallback((theme: ThemeMode) => {
    setSettings((prev) => ({ ...prev, theme }));
  }, []);

  const updateResponseLength = useCallback((responseLength: ResponseLength) => {
    setSettings((prev) => ({ ...prev, responseLength }));
  }, []);

  const updateModel = useCallback((model: EligibleModel) => {
    setSettings((prev) => ({ ...prev, model }));
  }, []);

  const stopGeneration = useCallback(() => {
    generationTokenRef.current += 1;
    isGeneratingRef.current = false;
    setIsGenerating(false);
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  const createNewChat = useCallback(() => {
    if (isGeneratingRef.current) {
      stopGeneration();
    }
    setErrorState(null);
    setActiveConversationId(null);
    setFocusInputSignal((prev) => prev + 1);
  }, [stopGeneration]);

  const selectConversation = useCallback(
    (id: string) => {
      if (isGeneratingRef.current) {
        stopGeneration();
      }
      setErrorState(null);
      setActiveConversationId(id);
    },
    [stopGeneration]
  );

  const renameConversation = useCallback((id: string, nextTitle: string) => {
    const trimmed = nextTitle.trim();
    if (!trimmed) return;
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title: trimmed.slice(0, 120) } : c))
    );
  }, []);

  const deleteConversation = useCallback(
    (id: string) => {
      if (id === activeConversationId && isGeneratingRef.current) {
        stopGeneration();
      }
      setConversations((prev) => {
        const next = prev.filter((c) => c.id !== id);
        if (activeConversationId === id) {
          setActiveConversationId(next[0]?.id ?? null);
        }
        return next;
      });
    },
    [activeConversationId, stopGeneration]
  );

  const clearAllHistory = useCallback(() => {
    if (isGeneratingRef.current) {
      stopGeneration();
    }
    clearAllStoredConversations();
    setConversations([]);
    setActiveConversationId(null);
    setErrorState(null);
  }, [stopGeneration]);

  const streamAssistantTurn = useCallback(
    async (params: {
      conversationId: string;
      userMessageText: string;
      history: ChatHistoryTurn[];
      assistantMsgId: string;
    }) => {
      const { conversationId, userMessageText, history, assistantMsgId } = params;
      const myToken = ++generationTokenRef.current;
      const controller = new AbortController();
      abortControllerRef.current = controller;
      isGeneratingRef.current = true;
      setIsGenerating(true);
      setErrorState(null);

      let accumulatedText = '';
      let activeModel = settingsRef.current.model;

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: userMessageText,
            history,
            responseLength: settingsRef.current.responseLength,
            model: settingsRef.current.model,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          let errMessage =
            response.status === 404 || response.status === 405
              ? 'Chat API endpoint (/api/chat) is unavailable on this deployment. Verify that serverless API routes are deployed and GEMINI_API_KEY is set.'
              : `Request failed (HTTP ${response.status}). Please try again.`;
          let retryable = response.status >= 500 || response.status === 429;
          try {
            const errJson = (await response.json()) as {
              message?: string;
              retryable?: boolean;
            };
            if (errJson.message) errMessage = errJson.message;
            if (typeof errJson.retryable === 'boolean') retryable = errJson.retryable;
          } catch {
            // Keep HTTP status error message when body is non-JSON
          }
          throw Object.assign(new Error(errMessage), { retryable });
        }

        if (!response.body) {
          throw Object.assign(new Error('Streaming response is unavailable.'), {
            retryable: true,
          });
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let sseBuffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          sseBuffer += decoder.decode(value, { stream: true });
          const events = sseBuffer.split('\n\n');
          sseBuffer = events.pop() ?? '';

          for (const rawEvent of events) {
            const lines = rawEvent.split('\n');
            for (const line of lines) {
              if (!line.startsWith('data: ')) continue;
              const jsonPart = line.slice(6).trim();
              if (!jsonPart) continue;

              let evt: {
                type: string;
                text?: string;
                questions?: string[];
                message?: string;
                retryable?: boolean;
                model?: string;
              };
              try {
                evt = JSON.parse(jsonPart);
              } catch {
                continue;
              }

              if (evt.type === 'meta' && evt.model) {
                activeModel = evt.model as EligibleModel;
              } else if (evt.type === 'delta' && typeof evt.text === 'string') {
                accumulatedText += evt.text;
                setConversations((prev) =>
                  prev.map((conv) => {
                    if (conv.id !== conversationId) return conv;
                    return {
                      ...conv,
                      updatedAt: Date.now(),
                      messages: conv.messages.map((m) =>
                        m.id === assistantMsgId
                          ? { ...m, content: accumulatedText, model: activeModel }
                          : m
                      ),
                    };
                  })
                );
              } else if (evt.type === 'followups' && Array.isArray(evt.questions)) {
                const followUps = evt.questions.slice(0, 3);
                setConversations((prev) =>
                  prev.map((conv) => {
                    if (conv.id !== conversationId) return conv;
                    return {
                      ...conv,
                      messages: conv.messages.map((m) =>
                        m.id === assistantMsgId ? { ...m, followUpQuestions: followUps } : m
                      ),
                    };
                  })
                );
              } else if (evt.type === 'error') {
                throw Object.assign(
                  new Error(evt.message || 'An error occurred while generating a response.'),
                  { retryable: Boolean(evt.retryable) }
                );
              }
            }
          }
        }

        if (!accumulatedText.trim() && !controller.signal.aborted) {
          throw Object.assign(
            new Error('No response was received from the AI service. Please try again.'),
            { retryable: true }
          );
        }
      } catch (err) {
        const isAborted =
          controller.signal.aborted ||
          (err instanceof DOMException && err.name === 'AbortError');

        if (isAborted) {
          setConversations((prev) =>
            prev.map((conv) => {
              if (conv.id !== conversationId) return conv;
              if (!accumulatedText.trim()) {
                return {
                  ...conv,
                  messages: conv.messages.filter((m) => m.id !== assistantMsgId),
                };
              }
              return {
                ...conv,
                messages: conv.messages.map((m) =>
                  m.id === assistantMsgId ? { ...m, stopped: true } : m
                ),
              };
            })
          );
        } else {
          const message =
            err instanceof Error
              ? err.message
              : 'Network error. Please check your connection and try again.';
          const retryable =
            typeof (err as { retryable?: unknown })?.retryable === 'boolean'
              ? Boolean((err as { retryable: boolean }).retryable)
              : true;

          setErrorState({
            message,
            retryable,
            lastPrompt: userMessageText,
          });

          setConversations((prev) =>
            prev.map((conv) => {
              if (conv.id !== conversationId) return conv;
              if (!accumulatedText.trim()) {
                return {
                  ...conv,
                  messages: conv.messages.filter((m) => m.id !== assistantMsgId),
                };
              }
              return {
                ...conv,
                messages: conv.messages.map((m) =>
                  m.id === assistantMsgId ? { ...m, isError: true } : m
                ),
              };
            })
          );
        }
      } finally {
        if (generationTokenRef.current === myToken) {
          isGeneratingRef.current = false;
          abortControllerRef.current = null;
          setIsGenerating(false);
        }
      }
    },
    []
  );

  const sendMessage = useCallback(
    async (rawText: string) => {
      const trimmed = rawText.trim();
      if (!trimmed || isGeneratingRef.current) return;

      const now = Date.now();
      const userMsg: ChatMessage = {
        id: createId('msg'),
        role: 'user',
        content: trimmed,
        createdAt: now,
      };
      const assistantMsg: ChatMessage = {
        id: createId('msg'),
        role: 'assistant',
        content: '',
        createdAt: now + 1,
      };

      let targetConversationId = activeConversationId;
      let priorHistory: ChatHistoryTurn[] = [];

      if (!targetConversationId) {
        const newConv: Conversation = {
          id: createId('conv'),
          title: generateConversationTitle(trimmed),
          createdAt: now,
          updatedAt: now,
          messages: [userMsg, assistantMsg],
        };
        targetConversationId = newConv.id;
        setConversations((prev) => [newConv, ...prev]);
        setActiveConversationId(newConv.id);
      } else {
        const existing = conversationsRef.current.find((c) => c.id === targetConversationId);
        if (existing) {
          priorHistory = existing.messages
            .filter((m) => !m.isError && m.content.trim().length > 0)
            .map((m) => ({
              role: m.role === 'user' ? 'user' : 'model',
              content: m.content,
            }));
        }

        setConversations((prev) => {
          const updated = prev.map((c) => {
            if (c.id !== targetConversationId) return c;
            const shouldRetitle = c.messages.length === 0;
            return {
              ...c,
              title: shouldRetitle ? generateConversationTitle(trimmed) : c.title,
              updatedAt: now,
              messages: [...c.messages, userMsg, assistantMsg],
            };
          });
          return [...updated].sort((a, b) => b.updatedAt - a.updatedAt);
        });
      }

      await streamAssistantTurn({
        conversationId: targetConversationId,
        userMessageText: trimmed,
        history: priorHistory,
        assistantMsgId: assistantMsg.id,
      });
    },
    [activeConversationId, streamAssistantTurn]
  );

  const regenerateLastResponse = useCallback(async () => {
    if (isGeneratingRef.current || !activeConversation) return;

    const messages = activeConversation.messages;
    let lastUserIdx = -1;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        lastUserIdx = i;
        break;
      }
    }
    if (lastUserIdx === -1) return;

    const lastUserMessage = messages[lastUserIdx];
    const priorHistory: ChatHistoryTurn[] = messages
      .slice(0, lastUserIdx)
      .filter((m) => !m.isError && m.content.trim().length > 0)
      .map((m) => ({
        role: m.role === 'user' ? 'user' : 'model',
        content: m.content,
      }));

    const newAssistantMsg: ChatMessage = {
      id: createId('msg'),
      role: 'assistant',
      content: '',
      createdAt: Date.now(),
    };

    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== activeConversation.id) return c;
        return {
          ...c,
          updatedAt: Date.now(),
          messages: [...messages.slice(0, lastUserIdx + 1), newAssistantMsg],
        };
      })
    );

    await streamAssistantTurn({
      conversationId: activeConversation.id,
      userMessageText: lastUserMessage.content,
      history: priorHistory,
      assistantMsgId: newAssistantMsg.id,
    });
  }, [activeConversation, streamAssistantTurn]);

  const retryLastError = useCallback(async () => {
    if (isGeneratingRef.current || !activeConversation) return;
    const messages = activeConversation.messages;
    const lastMsg = messages[messages.length - 1];
    if (lastMsg?.role === 'user') {
      const priorHistory: ChatHistoryTurn[] = messages
        .slice(0, -1)
        .filter((m) => !m.isError && m.content.trim().length > 0)
        .map((m) => ({
          role: m.role === 'user' ? 'user' : 'model',
          content: m.content,
        }));

      const newAssistantMsg: ChatMessage = {
        id: createId('msg'),
        role: 'assistant',
        content: '',
        createdAt: Date.now(),
      };

      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConversation.id
            ? { ...c, messages: [...c.messages, newAssistantMsg] }
            : c
        )
      );

      await streamAssistantTurn({
        conversationId: activeConversation.id,
        userMessageText: lastMsg.content,
        history: priorHistory,
        assistantMsgId: newAssistantMsg.id,
      });
      return;
    }

    await regenerateLastResponse();
  }, [activeConversation, regenerateLastResponse, streamAssistantTurn]);

  const exportJson = useCallback(() => {
    const content = exportConversationsAsJson(conversations);
    const blob = new Blob([content], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `consul-ai-history-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }, [conversations]);

  const exportTxt = useCallback(() => {
    const content = exportConversationsAsTxt(conversations);
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `consul-ai-history-${new Date().toISOString().slice(0, 10)}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }, [conversations]);

  const importJson = useCallback(
    (rawJson: string): { ok: true; count: number } | { ok: false; error: string } => {
      const parsed = parseImportedConversations(rawJson);
      if (!parsed.ok) {
        return { ok: false, error: parsed.error };
      }
      setConversations((prev) => {
        const merged = mergeImportedConversations(prev, parsed.conversations);
        if (!activeConversationId && merged[0]) {
          setActiveConversationId(merged[0].id);
        }
        return merged;
      });
      return { ok: true, count: parsed.conversations.length };
    },
    [activeConversationId]
  );

  return {
    conversations,
    filteredConversations,
    activeConversation,
    activeConversationId,
    settings,
    searchQuery,
    setSearchQuery,
    isGenerating,
    errorState,
    clearError: () => setErrorState(null),
    storageWarning,
    updateTheme,
    updateResponseLength,
    updateModel,
    createNewChat,
    selectConversation,
    renameConversation,
    deleteConversation,
    clearAllHistory,
    sendMessage,
    stopGeneration,
    regenerateLastResponse,
    retryLastError,
    exportJson,
    exportTxt,
    importJson,
    focusInputSignal,
  };
}
