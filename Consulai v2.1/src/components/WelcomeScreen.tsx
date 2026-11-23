import { ArrowUpRight, Globe2 } from 'lucide-react';
import { motion } from 'motion/react';
import { detectTextDirection } from '../lib/language';

interface StarterPrompt {
  label: string;
  prompt: string;
  languageLabel: string;
}

const STARTER_PROMPTS: StarterPrompt[] = [
  {
    languageLabel: 'Live Web · Local',
    label: 'Time, weather & top news',
    prompt: 'What is the current local time, weather, and top headlines for my location today?',
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
  detectedContext: {
    timezone: string;
    locationLabel?: string;
  };
  onSelectPrompt: (prompt: string) => void;
}

export function WelcomeScreen({ detectedContext, onSelectPrompt }: WelcomeScreenProps) {
  const contextLine = detectedContext.locationLabel
    ? `${detectedContext.locationLabel} · ${detectedContext.timezone}`
    : detectedContext.timezone;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-4 py-10 sm:px-6">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        className="mb-8 max-w-xl"
      >
        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-zinc-900/15 bg-[#D9F99D] text-zinc-950 shadow-[0_2px_0_0_rgba(24,24,27,0.12)] dark:border-emerald-400/30 dark:bg-emerald-400/15 dark:text-emerald-300 dark:shadow-none">
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v7a2.5 2.5 0 0 1-2.5 2.5H10l-4.5 3.5V16H6.5A2.5 2.5 0 0 1 4 13.5v-7Z" />
            <path d="M8.5 9.5h7M8.5 12.5h4.5" strokeLinecap="round" />
          </svg>
        </div>

        <h1 className="font-display text-3xl font-bold tracking-tight text-zinc-950 sm:text-4xl dark:text-white [text-wrap:balance]">
          Sharp answers. Real-time web. Any language.
        </h1>

        <p className="mt-3 text-[15px] leading-relaxed text-zinc-600 dark:text-zinc-300">
          Write naturally in English, اردو, or Roman Urdu. Consul AI detects your language, time zone, and live web facts automatically.
        </p>

        <div className="mt-3.5 flex items-center gap-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
          <Globe2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
          <span className="truncate">Live web grounding active · {contextLine}</span>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {STARTER_PROMPTS.map((item, idx) => {
          const dir = detectTextDirection(item.prompt);
          return (
            <motion.button
              key={item.prompt}
              type="button"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.24, delay: idx * 0.04, ease: [0.16, 1, 0.3, 1] }}
              onClick={() => onSelectPrompt(item.prompt)}
              dir={dir}
              className="group flex flex-col justify-between rounded-2xl border border-zinc-900/12 bg-white p-4 text-start shadow-[0_2px_0_0_rgba(24,24,27,0.06)] transition-all hover:-translate-y-0.5 hover:border-blue-600/50 hover:bg-[#FAF9F5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:border-white/10 dark:bg-[#111118] dark:shadow-none dark:hover:border-blue-400/50 dark:hover:bg-[#161620]"
            >
              <div className="flex w-full items-center justify-between gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                <span className="font-semibold tracking-tight text-blue-700 dark:text-blue-400">
                  {item.languageLabel} · {item.label}
                </span>
                <ArrowUpRight
                  className="h-4 w-4 shrink-0 text-zinc-400 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-zinc-950 dark:group-hover:text-white"
                  aria-hidden="true"
                />
              </div>
              <span className="mt-2.5 text-sm font-medium leading-snug text-zinc-900 dark:text-zinc-100">
                {item.prompt}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
