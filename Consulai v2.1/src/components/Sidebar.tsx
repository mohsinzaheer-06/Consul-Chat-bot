import {
  Check,
  MessageSquare,
  PanelLeftClose,
  Pencil,
  Plus,
  Search,
  Settings,
  Trash2,
  X,
} from 'lucide-react';
import { useState, type KeyboardEvent } from 'react';
import { detectTextDirection, formatRelativeDate } from '../lib/language';
import type { Conversation } from '../types/chat';

interface SidebarProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  searchQuery: string;
  isDesktopOpen: boolean;
  isMobileOpen: boolean;
  onSearchChange: (value: string) => void;
  onNewChat: () => void;
  onSelectConversation: (id: string) => void;
  onRenameConversation: (id: string, title: string) => void;
  onDeleteConversation: (id: string) => void;
  onOpenSettings: () => void;
  onCloseDesktop: () => void;
  onCloseMobile: () => void;
}

export function Sidebar({
  conversations,
  activeConversationId,
  searchQuery,
  isDesktopOpen,
  isMobileOpen,
  onSearchChange,
  onNewChat,
  onSelectConversation,
  onRenameConversation,
  onDeleteConversation,
  onOpenSettings,
  onCloseDesktop,
  onCloseMobile,
}: SidebarProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState('');

  const startRename = (conv: Conversation) => {
    setEditingId(conv.id);
    setDraftTitle(conv.title);
  };

  const commitRename = (id: string) => {
    const trimmed = draftTitle.trim();
    if (trimmed) {
      onRenameConversation(id, trimmed);
    }
    setEditingId(null);
    setDraftTitle('');
  };

  const handleRenameKeyDown = (e: KeyboardEvent<HTMLInputElement>, id: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitRename(id);
    } else if (e.key === 'Escape') {
      setEditingId(null);
      setDraftTitle('');
    }
  };

  const sidebarContent = (isMobile: boolean) => (
    <div className="flex h-full w-[280px] flex-col border-e border-zinc-900/10 bg-[#FFFFFF] dark:border-white/10 dark:bg-[#0D0D14]">
      {/* Brand + Collapse Header */}
      <div className="flex items-center justify-between gap-2 px-4 py-3.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-zinc-900/15 bg-[#D9F99D] text-zinc-950 dark:border-emerald-400/30 dark:bg-emerald-400/15 dark:text-emerald-300">
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.1"
              aria-hidden="true"
            >
              <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7a2.5 2.5 0 0 1-2.5 2.5H10l-4.5 3.5V16H6.5A2.5 2.5 0 0 1 4 13.5v-7Z" />
            </svg>
          </div>
          <span className="font-display truncate text-base font-bold tracking-tight text-zinc-950 dark:text-white whitespace-nowrap">
            Consul AI
          </span>
        </div>

        <button
          type="button"
          onClick={isMobile ? onCloseMobile : onCloseDesktop}
          aria-label="Collapse sidebar"
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-white"
        >
          {isMobile ? (
            <X className="h-4 w-4" aria-hidden="true" />
          ) : (
            <PanelLeftClose className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
      </div>

      {/* New Chat Button */}
      <div className="px-3 pb-2.5">
        <button
          type="button"
          onClick={() => {
            onNewChat();
            if (isMobile) onCloseMobile();
          }}
          className="flex min-h-[42px] w-full items-center justify-center gap-2 rounded-xl border border-zinc-950 bg-zinc-950 px-3.5 py-2 text-sm font-semibold text-white shadow-[0_2px_0_0_rgba(37,99,235,0.4)] transition-all hover:-translate-y-0.5 hover:bg-blue-600 hover:border-blue-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:border-blue-500/40 dark:bg-blue-600 dark:shadow-none dark:hover:bg-blue-500 whitespace-nowrap"
        >
          <Plus className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>New chat</span>
        </button>
      </div>

      {/* Search Conversations */}
      <div className="px-3 pb-3">
        <div className="relative flex items-center">
          <Search
            className="pointer-events-none absolute start-3 h-3.5 w-3.5 text-zinc-400"
            aria-hidden="true"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search chats…"
            aria-label="Search conversations"
            className="h-9 w-full rounded-xl border border-zinc-900/12 bg-[#F5F4EE] ps-8 pe-7 text-xs text-zinc-900 placeholder:text-zinc-400 focus:border-blue-600 focus:bg-white focus:outline-none dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-blue-400 dark:focus:bg-[#14141D]"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              aria-label="Clear search"
              className="absolute end-1.5 inline-flex h-6 w-6 items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {/* Conversation List */}
      <nav aria-label="Conversation history" className="flex-1 overflow-y-auto px-2.5 py-1">
        {conversations.length === 0 ? (
          <div className="px-2 py-8 text-center text-xs text-zinc-500 dark:text-zinc-400">
            {searchQuery.trim()
              ? 'No matching conversations found.'
              : 'Your saved conversations will appear here.'}
          </div>
        ) : (
          <ul className="space-y-1">
            {conversations.map((conv) => {
              const isActive = conv.id === activeConversationId;
              const isEditing = editingId === conv.id;
              const titleDir = detectTextDirection(conv.title);

              return (
                <li key={conv.id} className="group relative">
                  {isEditing ? (
                    <div className="flex items-center gap-1 rounded-xl border border-blue-600 bg-white px-2 py-1.5 dark:border-blue-400 dark:bg-[#14141D]">
                      <input
                        type="text"
                        value={draftTitle}
                        onChange={(e) => setDraftTitle(e.target.value)}
                        onKeyDown={(e) => handleRenameKeyDown(e, conv.id)}
                        aria-label={`Rename conversation ${conv.title}`}
                        autoFocus
                        className="min-w-0 flex-1 bg-transparent text-xs font-medium text-zinc-900 focus:outline-none dark:text-zinc-100"
                      />
                      <button
                        type="button"
                        onClick={() => commitRename(conv.id)}
                        aria-label="Save conversation title"
                        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-emerald-600 hover:bg-zinc-100 dark:text-emerald-400 dark:hover:bg-white/10"
                      >
                        <Check className="h-3.5 w-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  ) : (
                    <div
                      className={`flex items-center gap-1 rounded-xl px-2 py-1.5 transition-colors ${
                        isActive
                          ? 'border border-zinc-900/12 bg-[#F5F4EE] text-zinc-950 dark:border-white/12 dark:bg-white/[0.08] dark:text-white'
                          : 'border border-transparent text-zinc-700 hover:bg-[#F5F4EE]/70 dark:text-zinc-300 dark:hover:bg-white/[0.04]'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          onSelectConversation(conv.id);
                          if (isMobile) onCloseMobile();
                        }}
                        className="flex min-w-0 flex-1 items-start gap-2.5 rounded-lg py-1 text-start focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                      >
                        <MessageSquare
                          className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${
                            isActive
                              ? 'text-blue-600 dark:text-blue-400'
                              : 'text-zinc-400 dark:text-zinc-500'
                          }`}
                          aria-hidden="true"
                        />
                        <div className="min-w-0 flex-1">
                          <p
                            dir={titleDir}
                            className="truncate text-[13px] font-medium leading-snug"
                          >
                            {conv.title}
                          </p>
                          <p className="font-mono-code mt-0.5 text-[11px] text-zinc-400 tabular-nums dark:text-zinc-500">
                            {formatRelativeDate(conv.updatedAt)} · {conv.messages.length}{' '}
                            {conv.messages.length === 1 ? 'msg' : 'msgs'}
                          </p>
                        </div>
                      </button>

                      <div className="flex shrink-0 items-center gap-0.5 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                        <button
                          type="button"
                          onClick={() => startRename(conv)}
                          aria-label={`Rename "${conv.title}"`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-200/70 hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-blue-600 dark:hover:bg-white/10 dark:hover:text-white"
                        >
                          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteConversation(conv.id)}
                          aria-label={`Delete "${conv.title}"`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-rose-50 hover:text-rose-600 focus-visible:outline-2 focus-visible:outline-blue-600 dark:hover:bg-rose-950/60 dark:hover:text-rose-400"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </nav>

      {/* Bottom Settings Trigger */}
      <div className="border-t border-zinc-900/10 p-3 dark:border-white/10">
        <button
          type="button"
          onClick={() => {
            onOpenSettings();
            if (isMobile) onCloseMobile();
          }}
          className="flex min-h-[42px] w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-[#F5F4EE] hover:text-zinc-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:text-zinc-300 dark:hover:bg-white/[0.06] dark:hover:text-white whitespace-nowrap"
        >
          <Settings className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span>Settings</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {isDesktopOpen && (
        <aside className="hidden h-full shrink-0 lg:block">{sidebarContent(false)}</aside>
      )}

      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 flex lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Conversation navigation"
        >
          <div
            className="fixed inset-0 bg-zinc-950/50 backdrop-blur-xs"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside className="relative z-50 h-full shadow-2xl">{sidebarContent(true)}</aside>
        </div>
      )}
    </>
  );
}
