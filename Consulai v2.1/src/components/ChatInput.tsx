import { ArrowUp, Square, X } from 'lucide-react';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { detectTextDirection } from '../lib/language';

interface ChatInputProps {
  isGenerating: boolean;
  focusSignal?: number;
  onSend: (text: string) => void;
  onStop: () => void;
}

export function ChatInput({ isGenerating, focusSignal = 0, onSend, onStop }: ChatInputProps) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (focusSignal > 0) {
      textareaRef.current?.focus();
    }
  }, [focusSignal]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
  }, [value]);

  const trimmed = value.trim();
  const dir = detectTextDirection(value);

  const handleSubmit = () => {
    if (!trimmed || isGenerating) return;
    onSend(trimmed);
    setValue('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="border-t border-zinc-900/10 bg-[#F5F4EE]/95 px-3 pt-3 pb-3 backdrop-blur-xs sm:px-6 sm:pb-4 dark:border-white/10 dark:bg-[#09090E]/95">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-end gap-2 rounded-2xl border border-zinc-900/15 bg-white p-2 shadow-[0_2px_0_0_rgba(24,24,27,0.07)] focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-600/15 dark:border-white/12 dark:bg-[#111118] dark:shadow-none dark:focus-within:border-blue-400 dark:focus-within:ring-blue-400/20">
          <textarea
            ref={textareaRef}
            rows={1}
            value={value}
            dir={dir}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask in English, اردو, or Roman Urdu…"
            aria-label="Message input"
            maxLength={8000}
            className="max-h-[180px] min-h-[44px] w-full resize-none bg-transparent px-2.5 py-2.5 text-[15px] leading-snug text-zinc-950 placeholder:text-zinc-400 focus:outline-none dark:text-zinc-100 dark:placeholder:text-zinc-500"
          />

          <div className="flex shrink-0 items-center gap-1.5 pb-0.5">
            {value.length > 0 && !isGenerating && (
              <button
                type="button"
                onClick={() => {
                  setValue('');
                  textareaRef.current?.focus();
                }}
                aria-label="Clear input"
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:text-zinc-500 dark:hover:bg-white/10 dark:hover:text-zinc-200"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            )}

            {isGenerating ? (
              <button
                type="button"
                onClick={onStop}
                aria-label="Stop generation"
                className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-zinc-950 px-3.5 text-xs font-semibold text-white transition-colors hover:bg-zinc-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white whitespace-nowrap shrink-0"
              >
                <Square className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                <span>Stop</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!trimmed}
                aria-label="Send message"
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:bg-blue-600 dark:hover:bg-blue-500 dark:disabled:bg-white/10 dark:disabled:text-zinc-600"
              >
                <ArrowUp className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
        <p className="mt-1.5 text-center text-[11px] text-zinc-500 dark:text-zinc-400">
          Enter to send · Shift + Enter for new line · Live web &amp; local context enabled
        </p>
      </div>
    </div>
  );
}
