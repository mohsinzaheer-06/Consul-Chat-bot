import {
  AlertCircle,
  Menu,
  Moon,
  PanelLeftOpen,
  Plus,
  RefreshCw,
  Settings,
  Sun,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { ChatInput } from './components/ChatInput';
import { MessageBubble } from './components/MessageBubble';
import { SettingsModal } from './components/SettingsModal';
import { Sidebar } from './components/Sidebar';
import { WelcomeScreen } from './components/WelcomeScreen';
import { useChatStore } from './hooks/useChatStore';

export default function App() {
  const {
    conversations,
    filteredConversations,
    activeConversation,
    activeConversationId,
    settings,
    searchQuery,
    setSearchQuery,
    isGenerating,
    errorState,
    clearError,
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
  } = useChatStore();

  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const messages = activeConversation?.messages ?? [];
  const lastAssistantId = (() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'assistant') return messages[i].id;
    }
    return null;
  })();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, messages[messages.length - 1]?.content]);

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-[#FAFAFA] text-slate-900 dark:bg-[#0B0F17] dark:text-slate-100">
      <Sidebar
        conversations={filteredConversations}
        activeConversationId={activeConversationId}
        searchQuery={searchQuery}
        isDesktopOpen={isDesktopSidebarOpen}
        isMobileOpen={isMobileSidebarOpen}
        onSearchChange={setSearchQuery}
        onNewChat={createNewChat}
        onSelectConversation={selectConversation}
        onRenameConversation={renameConversation}
        onDeleteConversation={deleteConversation}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onCloseDesktop={() => setIsDesktopSidebarOpen(false)}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Clean, single-row top workspace header */}
        <header className="flex h-13 shrink-0 items-center justify-between gap-4 border-b border-slate-200/80 bg-white/80 px-3 backdrop-blur-xs sm:px-5 dark:border-slate-800/80 dark:bg-[#0F1522]/85">
          <div className="flex min-w-0 items-center gap-2">
            {/* Mobile drawer toggle */}
            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen(true)}
              aria-label="Open conversation sidebar"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-2 focus-visible:outline-blue-600 lg:hidden dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>

            {/* Desktop reopen toggle when collapsed */}
            {!isDesktopSidebarOpen && (
              <button
                type="button"
                onClick={() => setIsDesktopSidebarOpen(true)}
                aria-label="Expand sidebar"
                className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-2 focus-visible:outline-blue-600 lg:inline-flex dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                <PanelLeftOpen className="h-4 w-4" aria-hidden="true" />
              </button>
            )}

            <span className="font-display truncate text-sm font-semibold text-slate-900 dark:text-white">
              {activeConversation ? activeConversation.title : 'Consul AI'}
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={createNewChat}
              aria-label="Start new chat"
              className={`${
                isDesktopSidebarOpen ? 'lg:hidden' : ''
              } inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-950 focus-visible:outline-2 focus-visible:outline-blue-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 whitespace-nowrap shrink-0`}
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              <span>New chat</span>
            </button>

            <button
              type="button"
              onClick={() => updateTheme(settings.theme === 'dark' ? 'light' : 'dark')}
              aria-label={
                settings.theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
              }
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-2 focus-visible:outline-blue-600 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              {settings.theme === 'dark' ? (
                <Sun className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Moon className="h-4 w-4" aria-hidden="true" />
              )}
            </button>

            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              aria-label="Open settings"
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-2 focus-visible:outline-blue-600 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              <Settings className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </header>

        {/* Main Scrollable Chat Viewport */}
        <main className="flex flex-1 flex-col overflow-y-auto">
          {storageWarning && (
            <div className="mx-auto mt-3 w-full max-w-3xl px-4">
              <div
                role="status"
                className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200"
              >
                <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{storageWarning}</span>
              </div>
            </div>
          )}

          {messages.length === 0 ? (
            <WelcomeScreen onSelectPrompt={sendMessage} />
          ) : (
            <div className="mx-auto w-full max-w-3xl flex-1 space-y-4 px-3 py-6 sm:px-6">
              {messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  isLatestAssistant={msg.id === lastAssistantId}
                  isGenerating={isGenerating}
                  onSelectFollowUp={sendMessage}
                  onRegenerate={regenerateLastResponse}
                />
              ))}

              {errorState && (
                <div
                  role="alert"
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200"
                >
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>{errorState.message}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {errorState.retryable && (
                      <button
                        type="button"
                        onClick={retryLastError}
                        className="inline-flex min-h-[34px] items-center gap-1.5 rounded-lg bg-rose-700 px-3 py-1 text-xs font-medium text-white hover:bg-rose-800 whitespace-nowrap"
                      >
                        <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Retry</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={clearError}
                      className="min-h-[34px] rounded-lg px-2.5 py-1 text-xs font-medium text-rose-700 hover:bg-rose-100 dark:text-rose-300 dark:hover:bg-rose-900/50 whitespace-nowrap"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} className="h-2" />
            </div>
          )}
        </main>

        <ChatInput
          isGenerating={isGenerating}
          focusSignal={focusInputSignal}
          onSend={sendMessage}
          onStop={stopGeneration}
        />
      </div>

      <SettingsModal
        isOpen={isSettingsOpen}
        settings={settings}
        conversationCount={conversations.length}
        onClose={() => setIsSettingsOpen(false)}
        onUpdateTheme={updateTheme}
        onUpdateResponseLength={updateResponseLength}
        onUpdateModel={updateModel}
        onExportJson={exportJson}
        onExportTxt={exportTxt}
        onImportJson={importJson}
        onClearAllHistory={clearAllHistory}
      />
    </div>
  );
}
