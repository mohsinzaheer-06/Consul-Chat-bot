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
    <div className="border-t border-slate-200/80 bg-[#FAFAFA]/95 px-3 pt-3 pb-3 backdrop-blur-xs sm:px-6 sm:pb-4 dark:border-slate-800/80 dark:bg-[#0B0F17]/95">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-xs focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-600/15 dark:border-slate-800 dark:bg-slate-900 dark:focus-within:border-blue-500 dark:focus-within:ring-blue-500/20">
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
            className="max-h-[180px] min-h-[44px] w-full resize-none bg-transparent px-2.5 py-2.5 text-[15px] leading-snug text-slate-900 placeholder:text-slate-400 focus:outline-none dark:text-slate-100 dark:placeholder:text-slate-500"
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
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            )}

            {isGenerating ? (
              <button
                type="button"
                onClick={onStop}
                aria-label="Stop generation"
                className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 text-xs font-medium text-white transition-colors hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white whitespace-nowrap shrink-0"
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
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-700 text-white transition-colors hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:bg-blue-600 dark:hover:bg-blue-500 dark:disabled:bg-slate-800 dark:disabled:text-slate-600"
              >
                <ArrowUp className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
        <p className="mt-1.5 text-center text-[11px] text-slate-500 dark:text-slate-400">
          Enter to send · Shift + Enter for new line · Saved locally in this browser
        </p>
      </div>
    </div>
  );
}
