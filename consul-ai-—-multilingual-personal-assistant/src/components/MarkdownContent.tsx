import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { detectTextDirection } from '../lib/language';
import { CodeBlock } from './CodeBlock';

interface MarkdownContentProps {
  content: string;
}

function isSafeHref(href?: string): boolean {
  if (!href) return false;
  const trimmed = href.trim().toLowerCase();
  return (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('mailto:')
  );
}

export function MarkdownContent({ content }: MarkdownContentProps) {
  const dir = detectTextDirection(content);

  return (
    <div
      dir={dir}
      className="prose-chat max-w-none text-[15px] leading-[1.68] text-slate-800 dark:text-slate-100"
    >
      <Markdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="font-display mt-5 mb-2.5 text-xl font-semibold tracking-tight text-slate-900 dark:text-white first:mt-0">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="font-display mt-4 mb-2 text-lg font-semibold tracking-tight text-slate-900 dark:text-white first:mt-0">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="font-display mt-3.5 mb-1.5 text-base font-semibold text-slate-900 dark:text-white first:mt-0">
              {children}
            </h3>
          ),
          p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
          ul: ({ children }) => (
            <ul className="mb-3 list-disc space-y-1.5 ps-5 last:mb-0">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-3 list-decimal space-y-1.5 ps-5 last:mb-0">{children}</ol>
          ),
          li: ({ children }) => <li className="leading-[1.65]">{children}</li>,
          strong: ({ children }) => (
            <strong className="font-semibold text-slate-950 dark:text-white">{children}</strong>
          ),
          blockquote: ({ children }) => (
            <blockquote className="my-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-700 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-4 border-slate-200 dark:border-slate-800" />,
          table: ({ children }) => (
            <div className="my-3 overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
              <table className="w-full border-collapse text-left text-sm">{children}</table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-slate-100 text-slate-900 dark:bg-slate-800/80 dark:text-slate-100">
              {children}
            </thead>
          ),
          th: ({ children }) => (
            <th className="border-b border-slate-200 px-3 py-2 font-semibold dark:border-slate-700">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border-b border-slate-200/80 px-3 py-2 dark:border-slate-800">
              {children}
            </td>
          ),
          a: ({ href, children }) =>
            isSafeHref(href) ? (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-blue-700 underline underline-offset-2 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
              >
                {children}
              </a>
            ) : (
              <span>{children}</span>
            ),
          code: ({ className, children, ...props }) => {
            const match = /language-(\w+)/.exec(className || '');
            const text = String(children ?? '').replace(/\n$/, '');
            const isBlock = Boolean(match) || text.includes('\n');

            if (isBlock) {
              return <CodeBlock code={text} language={match?.[1]} />;
            }

            return (
              <code
                dir="ltr"
                className="font-mono-code rounded bg-slate-100 px-1.5 py-0.5 text-[13px] text-slate-900 dark:bg-slate-800 dark:text-slate-100"
                {...props}
              >
                {children}
              </code>
            );
          },
          pre: ({ children }) => <>{children}</>,
        }}
      >
        {content}
      </Markdown>
    </div>
  );
}
