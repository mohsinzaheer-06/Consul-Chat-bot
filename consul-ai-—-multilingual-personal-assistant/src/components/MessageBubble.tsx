import { ArrowRight, Check, Copy, RotateCcw } from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';
import { detectTextDirection } from '../lib/language';
import type { ChatMessage } from '../types/chat';
import { MarkdownContent } from './MarkdownContent';

interface MessageBubbleProps {
  message: ChatMessage;
  isLatestAssistant: boolean;
  isGenerating: boolean;
  onSelectFollowUp: (question: string) => void;
  onRegenerate: () => void;
}

export function MessageBubble({
  message,
  isLatestAssistant,
  isGenerating,
  onSelectFollowUp,
  onRegenerate,
}: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);

  const timeLabel = new Date(message.createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  const handleCopyResponse = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard blocked
    }
  };

  if (message.role === 'user') {
    const dir = detectTextDirection(message.content);
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
        className="flex justify-end"
      >
        <div
          dir={dir}
          data-testid="user-message"
          className="max-w-[88%] rounded-2xl bg-slate-900 px-4 py-3 text-[15px] leading-relaxed text-white sm:max-w-[78%] dark:bg-slate-800 dark:text-slate-100"
        >
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        </div>
      </motion.div>
    );
  }

  const isWaitingFirstToken = isGenerating && isLatestAssistant && !message.content;
  const followUps = message.followUpQuestions ?? [];
  const followUpDir =
    followUps.length > 0 ? detectTextDirection(followUps[0]) : detectTextDirection(message.content);

  return (
    <motion.article
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
      data-testid="assistant-message"
      className="rounded-2xl border border-slate-200/90 bg-white px-4 py-4 sm:px-5 sm:py-4.5 dark:border-slate-800 dark:bg-slate-900/70"
    >
      <div className="mb-2.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-slate-900 text-[11px] font-semibold text-white dark:bg-slate-100 dark:text-slate-900">
            C
          </span>
          <span className="font-display text-xs font-semibold text-slate-900 dark:text-slate-100">
            Consul AI
          </span>
        </div>
        <span className="text-xs text-slate-400 tabular-nums dark:text-slate-500">
          {timeLabel}
        </span>
      </div>

      {isWaitingFirstToken ? (
        <div
          className="flex items-center gap-2 py-2 text-sm text-slate-500 dark:text-slate-400"
          role="status"
          aria-live="polite"
        >
          <span className="inline-flex gap-1" aria-hidden="true">
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.2s] dark:bg-slate-500" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.1s] dark:bg-slate-500" />
            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-400 dark:bg-slate-500" />
          </span>
          <span>Drafting response…</span>
        </div>
      ) : (
        <MarkdownContent content={message.content} />
      )}

      {message.stopped && (
        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
          Response generation stopped.
        </p>
      )}

      {message.content && !(isGenerating && isLatestAssistant) && (
        <div className="mt-3.5 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 dark:border-slate-800/80">
          <button
            type="button"
            onClick={handleCopyResponse}
            className="inline-flex min-h-[34px] items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white whitespace-nowrap shrink-0"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Copy</span>
              </>
            )}
          </button>

          {isLatestAssistant && (
            <button
              type="button"
              onClick={onRegenerate}
              disabled={isGenerating}
              className="inline-flex min-h-[34px] items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white whitespace-nowrap shrink-0"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Regenerate</span>
            </button>
          )}
        </div>
      )}

      {isLatestAssistant && followUps.length > 0 && !isGenerating && (
        <div
          dir={followUpDir}
          data-testid="followup-suggestions"
          className="mt-3.5 border-t border-slate-100 pt-3.5 dark:border-slate-800/80"
        >
          <p className="mb-2 text-xs font-medium text-slate-500 dark:text-slate-400">
            Suggested follow-ups
          </p>
          <div className="flex flex-col gap-2">
            {followUps.map((question) => (
              <button
                key={question}
                type="button"
                onClick={() => onSelectFollowUp(question)}
                dir={detectTextDirection(question)}
                className="group flex min-h-[40px] w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-2 text-start text-sm font-medium text-slate-800 transition-colors hover:border-blue-300 hover:bg-blue-50/60 hover:text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-200 dark:hover:border-blue-700/70 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                <span className="leading-snug">{question}</span>
                <ArrowRight
                  className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-blue-600 rtl:rotate-180 rtl:group-hover:-translate-x-0.5 dark:group-hover:text-blue-400"
                  aria-hidden="true"
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </motion.article>
  );
}
