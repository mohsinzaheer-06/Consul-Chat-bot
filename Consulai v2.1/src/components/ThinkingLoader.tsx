import { Globe2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';

const LOADING_PHASES = [
  'Reading your location & timezone…',
  'Scanning live web context…',
  'Synthesizing a crisp answer…',
];

const BAR_HEIGHTS = [14, 22, 18, 26, 16];

export function ThinkingLoader() {
  const [phaseIdx, setPhaseIdx] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setPhaseIdx((prev) => (prev + 1) % LOADING_PHASES.length);
    }, 1500);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div
      className="py-1.5"
      role="status"
      aria-live="polite"
      aria-label="Generating response"
      data-testid="thinking-loader"
    >
      <div className="flex items-center gap-3.5">
        {/* Kinetic geometric orb + live equalizer bars */}
        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-zinc-900/12 bg-[#D9F99D] text-zinc-950 dark:border-emerald-400/30 dark:bg-emerald-400/15 dark:text-emerald-300">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 4.5, repeat: Infinity, ease: 'linear' }}
            className="absolute inset-1 rounded-lg border border-dashed border-zinc-900/25 dark:border-emerald-300/35"
            aria-hidden="true"
          />
          <div className="relative flex items-end gap-0.5" aria-hidden="true">
            {BAR_HEIGHTS.map((peak, idx) => (
              <motion.span
                key={idx}
                className="w-0.5 rounded-full bg-zinc-950 dark:bg-emerald-300"
                animate={{
                  height: [6, peak * 0.65, 8],
                }}
                transition={{
                  duration: 0.9,
                  repeat: Infinity,
                  repeatType: 'mirror',
                  ease: 'easeInOut',
                  delay: idx * 0.11,
                }}
              />
            ))}
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-xs font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
            <Globe2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
            <span>Consul AI is thinking</span>
          </div>

          <div className="relative mt-0.5 h-5 overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.p
                key={phaseIdx}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className="truncate text-xs text-zinc-500 dark:text-zinc-400"
              >
                {LOADING_PHASES[phaseIdx]}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Kinetic shimmer bars matching response rhythm */}
      <div className="mt-3.5 space-y-2" aria-hidden="true">
        <div className="relative h-2.5 w-[88%] overflow-hidden rounded-full bg-zinc-200/80 dark:bg-white/10">
          <motion.div
            className="absolute inset-y-0 w-1/2 bg-linear-to-r from-transparent via-white/80 to-transparent dark:via-white/20"
            animate={{ x: ['-100%', '220%'] }}
            transition={{ duration: 1.35, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>
        <div className="relative h-2.5 w-[72%] overflow-hidden rounded-full bg-zinc-200/70 dark:bg-white/8">
          <motion.div
            className="absolute inset-y-0 w-1/2 bg-linear-to-r from-transparent via-white/80 to-transparent dark:via-white/20"
            animate={{ x: ['-100%', '220%'] }}
            transition={{ duration: 1.35, repeat: Infinity, ease: 'easeInOut', delay: 0.15 }}
          />
        </div>
        <div className="relative h-2.5 w-[54%] overflow-hidden rounded-full bg-zinc-200/60 dark:bg-white/6">
          <motion.div
            className="absolute inset-y-0 w-1/2 bg-linear-to-r from-transparent via-white/80 to-transparent dark:via-white/20"
            animate={{ x: ['-100%', '220%'] }}
            transition={{ duration: 1.35, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
          />
        </div>
      </div>
    </div>
  );
}
