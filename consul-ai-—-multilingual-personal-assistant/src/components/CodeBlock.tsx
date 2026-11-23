import { Check, Copy } from 'lucide-react';
import { useState } from 'react';
import { tokenizeCodeLine, type TokenType } from '../lib/syntaxHighlight';

interface CodeBlockProps {
  code: string;
  language?: string;
}

const TOKEN_CLASSES: Record<TokenType, string> = {
  keyword: 'text-sky-300 font-medium',
  string: 'text-emerald-300',
  comment: 'text-slate-400 italic',
  number: 'text-amber-300',
  type: 'text-cyan-200',
  function: 'text-indigo-200',
  plain: 'text-slate-100',
};

export function CodeBlock({ code, language }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard blocked in restricted contexts
    }
  };

  const lines = code.replace(/\n$/, '').split('\n');
  const displayLang = language || 'text';

  return (
    <div
      dir="ltr"
      className="my-3 overflow-hidden rounded-xl border border-slate-800 bg-slate-900 text-slate-100 dark:border-slate-700/80 dark:bg-slate-950"
    >
      <div className="flex items-center justify-between border-b border-slate-800 px-3.5 py-2 text-xs text-slate-300">
        <span className="font-mono-code uppercase tracking-wide text-[11px] text-slate-400">
          {displayLang}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          aria-label={`Copy ${displayLang} code`}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400 whitespace-nowrap shrink-0"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
              <span>Copied</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="overflow-x-auto p-3.5 text-[13px] leading-relaxed font-mono-code">
        <code>
          {lines.map((line, lineIdx) => {
            const tokens = tokenizeCodeLine(line, language);
            return (
              <div key={lineIdx} className="min-h-[1.35em]">
                {tokens.length === 0
                  ? ' '
                  : tokens.map((token, tokIdx) => (
                      <span key={tokIdx} className={TOKEN_CLASSES[token.type]}>
                        {token.value}
                      </span>
                    ))}
              </div>
            );
          })}
        </code>
      </pre>
    </div>
  );
}
