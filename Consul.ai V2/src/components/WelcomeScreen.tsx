import { ArrowUpRight } from 'lucide-react';
import { detectTextDirection } from '../lib/language';

interface StarterPrompt {
  label: string;
  prompt: string;
  languageLabel: string;
}

const STARTER_PROMPTS: StarterPrompt[] = [
  {
    languageLabel: 'English',
    label: 'Simplify a complex idea',
    prompt: 'Explain how compound interest works in simple terms with a small example.',
  },
  {
    languageLabel: 'Roman Urdu',
    label: 'Tech guidance in Roman Urdu',
    prompt: 'Mujhe Next.js aur React ka farq simple Roman Urdu mein samjhao.',
  },
  {
    languageLabel: 'اردو',
    label: 'کاروباری مشورہ',
    prompt: 'چھوٹا کاروبار شروع کرنے کے تین اہم مراحل مختصر اور آسان الفاظ میں بتائیں۔',
  },
  {
    languageLabel: 'English',
    label: 'Executive communication',
    prompt: 'Write a polite, concise email to reschedule a client meeting to next Tuesday.',
  },
];

interface WelcomeScreenProps {
  onSelectPrompt: (prompt: string) => void;
}

export function WelcomeScreen({ onSelectPrompt }: WelcomeScreenProps) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-4 py-10 sm:px-6">
      <div className="mb-8 max-w-xl">
        <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-900 shadow-xs dark:border-slate-800 dark:bg-slate-900 dark:text-white">
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            aria-hidden="true"
          >
            <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7a2.5 2.5 0 0 1-2.5 2.5H10l-4.5 3.5V16H6.5A2.5 2.5 0 0 1 4 13.5v-7Z" />
            <path d="M8.5 9.5h7M8.5 12.5h4.5" strokeLinecap="round" />
          </svg>
        </div>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl dark:text-white [text-wrap:balance]">
          Clear answers for decisions, learning, and daily work.
        </h1>
        <p className="mt-2.5 text-[15px] leading-relaxed text-slate-600 dark:text-slate-300">
          Write naturally in English, اردو, or Roman Urdu. Consul AI replies in your language with concise guidance and practical next questions.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {STARTER_PROMPTS.map((item) => {
          const dir = detectTextDirection(item.prompt);
          return (
            <button
              key={item.prompt}
              type="button"
              onClick={() => onSelectPrompt(item.prompt)}
              dir={dir}
              className="group flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 text-start transition-colors hover:border-slate-300 hover:bg-slate-50/80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:border-slate-800 dark:bg-slate-900/70 dark:hover:border-slate-700 dark:hover:bg-slate-900"
            >
              <div className="flex w-full items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span className="font-medium">
                  {item.languageLabel} · {item.label}
                </span>
                <ArrowUpRight
                  className="h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-slate-700 dark:group-hover:text-slate-200"
                  aria-hidden="true"
                />
              </div>
              <span className="mt-2 text-sm font-medium leading-snug text-slate-800 dark:text-slate-100">
                {item.prompt}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
