import { ArrowRight, ArrowUpRight, Check, Copy, Globe2, RotateCcw } from 'lucide-react';
import { motion } from 'motion/react';
import { useState } from 'react';
import { detectTextDirection } from '../lib/language';
import type { ChatMessage } from '../types/chat';
import { MarkdownContent } from './MarkdownContent';
import { ThinkingLoader } from './ThinkingLoader';

interface MessageBubbleProps {
  message: ChatMessage;
  isLatestAssistant: boolean;
  isGenerating: boolean;
  onSelectFollowUp: (question: string) => void;
  onRegenerate: () => void;
}

function getHostname(uri: string): string {
  try {
    return new URL(uri).hostname.replace(/^www\./, '');
  } catch {
    return 'web';
  }
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
        initial={{ opacity: 0, y: 8, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
        className="flex justify-end"
      >
        <div
          dir={dir}
          data-testid="user-message"
          className="max-w-[88%] rounded-2xl border border-zinc-900/15 bg-zinc-950 px-4 py-3 text-[15px] leading-relaxed text-zinc-50 shadow-[0_2px_0_0_rgba(24,24,27,0.12)] sm:max-w-[78%] dark:border-blue-500/35 dark:bg-blue-600 dark:text-white dark:shadow-none"
        >
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        </div>
      </motion.div>
    );
  }

  const isWaitingFirstToken = isGenerating && isLatestAssistant && !message.content;
  const followUps = message.followUpQuestions ?? [];
  const sources = (message.sources ?? []).filter(
    (s) => s.uri.startsWith('https://') || s.uri.startsWith('http://')
  );
  const followUpDir =
    followUps.length > 0 ? detectTextDirection(followUps[0]) : detectTextDirection(message.content);

  return (
    <motion.article
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      data-testid="assistant-message"
      className="rounded-2xl border border-zinc-900/12 bg-white px-4 py-4 shadow-[0_2px_0_0_rgba(24,24,27,0.06)] sm:px-5 sm:py-4.5 dark:border-white/10 dark:bg-[#111118] dark:shadow-none"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="font-display inline-flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-900/15 bg-[#D9F99D] text-xs font-extrabold text-zinc-950 dark:border-emerald-400/30 dark:bg-emerald-400/15 dark:text-emerald-300">
            C
          </span>
          <span className="font-display text-xs font-bold tracking-tight text-zinc-950 dark:text-zinc-100">
            Consul AI
          </span>
        </div>
        <span className="font-mono-code text-[11px] text-zinc-400 tabular-nums dark:text-zinc-500">
          {timeLabel}
        </span>
      </div>

      {isWaitingFirstToken ? <ThinkingLoader /> : <MarkdownContent content={message.content} />}

      {message.stopped && (
        <p className="mt-2.5 text-xs text-zinc-500 dark:text-zinc-400">
          Response generation stopped.
        </p>
      )}

      {sources.length > 0 && !(isGenerating && isLatestAssistant) && (
        <div
          data-testid="grounding-sources"
          className="mt-4 border-t border-zinc-200/80 pt-3 dark:border-white/10"
        >
          <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-zinc-600 dark:text-zinc-400">
            <Globe2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
            <span>Web sources</span>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {sources.map((src) => (
              <a
                key={src.uri}
                href={src.uri}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center justify-between gap-2 rounded-xl border border-zinc-200 bg-[#FAF9F5] px-3 py-2 text-xs transition-colors hover:border-blue-500/60 hover:bg-blue-50/50 focus-visible:outline-2 focus-visible:outline-blue-600 dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-blue-400/50 dark:hover:bg-blue-500/10"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-zinc-900 dark:text-zinc-100">
                    {src.title}
                  </p>
                  <p className="font-mono-code truncate text-[11px] text-zinc-500 dark:text-zinc-400">
                    {getHostname(src.uri)}
                  </p>
                </div>
                <ArrowUpRight
                  className="h-3.5 w-3.5 shrink-0 text-zinc-400 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-blue-600 dark:group-hover:text-blue-400"
                  aria-hidden="true"
                />
              </a>
            ))}
          </div>
        </div>
      )}

      {message.content && !(isGenerating && isLatestAssistant) && (
        <div className="mt-3.5 flex flex-wrap items-center gap-2 border-t border-zinc-200/80 pt-3 dark:border-white/10">
          <button
            type="button"
            onClick={handleCopyResponse}
            className="inline-flex min-h-[34px] items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:text-zinc-300 dark:hover:bg-white/10 dark:hover:text-white whitespace-nowrap shrink-0"
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
              className="inline-flex min-h-[34px] items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-950 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:text-zinc-300 dark:hover:bg-white/10 dark:hover:text-white whitespace-nowrap shrink-0"
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
          className="mt-3.5 border-t border-zinc-200/80 pt-3.5 dark:border-white/10"
        >
          <p className="mb-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
            Keep exploring
          </p>
          <div className="flex flex-col gap-2">
            {followUps.map((question) => (
              <button
                key={question}
                type="button"
                onClick={() => onSelectFollowUp(question)}
                dir={detectTextDirection(question)}
                className="group flex min-h-[42px] w-full items-center justify-between gap-3 rounded-xl border border-zinc-900/12 bg-[#FAF9F5] px-3.5 py-2 text-start text-sm font-medium text-zinc-800 transition-all hover:-translate-y-0.5 hover:border-blue-600/50 hover:bg-blue-50/70 hover:text-zinc-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-200 dark:hover:border-blue-400/50 dark:hover:bg-blue-500/10 dark:hover:text-white"
              >
                <span className="leading-snug">{question}</span>
                <ArrowRight
                  className="h-4 w-4 shrink-0 text-zinc-400 transition-transform group-hover:translate-x-0.5 group-hover:text-blue-600 rtl:rotate-180 rtl:group-hover:-translate-x-0.5 dark:group-hover:text-blue-400"
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
