export type TokenType =
  | 'keyword'
  | 'string'
  | 'comment'
  | 'number'
  | 'type'
  | 'function'
  | 'plain';

export interface CodeToken {
  type: TokenType;
  value: string;
}

const KEYWORDS = new Set([
  'import',
  'from',
  'export',
  'default',
  'const',
  'let',
  'var',
  'function',
  'return',
  'if',
  'else',
  'for',
  'while',
  'switch',
  'case',
  'break',
  'continue',
  'async',
  'await',
  'try',
  'catch',
  'finally',
  'throw',
  'new',
  'class',
  'extends',
  'implements',
  'interface',
  'type',
  'enum',
  'true',
  'false',
  'null',
  'undefined',
  'def',
  'elif',
  'lambda',
  'pass',
  'with',
  'as',
  'in',
  'not',
  'and',
  'or',
  'SELECT',
  'FROM',
  'WHERE',
  'INSERT',
  'INTO',
  'VALUES',
  'UPDATE',
  'DELETE',
  'CREATE',
  'TABLE',
  'JOIN',
  'ON',
  'ORDER',
  'BY',
]);

const TOKEN_PATTERN =
  /(\/\/[^\n]*|#[^\n]*|\/\*[\s\S]*?\*\/|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\b\d+(?:\.\d+)?\b|\b[A-Z][A-Za-z0-9_]*\b|\b[a-zA-Z_]\w*(?=\s*\()|\b[a-zA-Z_]\w*\b)/g;

export function tokenizeCodeLine(line: string, language?: string): CodeToken[] {
  const tokens: CodeToken[] = [];
  let lastIndex = 0;
  const lang = (language || '').toLowerCase();
  const supportsHashComments =
    lang === 'python' ||
    lang === 'py' ||
    lang === 'bash' ||
    lang === 'sh' ||
    lang === 'zsh' ||
    lang === 'yaml' ||
    lang === 'yml';

  for (const match of line.matchAll(TOKEN_PATTERN)) {
    const idx = match.index ?? 0;
    if (idx > lastIndex) {
      tokens.push({ type: 'plain', value: line.slice(lastIndex, idx) });
    }

    const value = match[0];
    let type: TokenType = 'plain';

    if (value.startsWith('//') || value.startsWith('/*')) {
      type = 'comment';
    } else if (value.startsWith('#')) {
      type = supportsHashComments ? 'comment' : 'plain';
    } else if (
      value.startsWith('"') ||
      value.startsWith("'") ||
      value.startsWith('`')
    ) {
      type = 'string';
    } else if (/^\d/.test(value)) {
      type = 'number';
    } else if (KEYWORDS.has(value)) {
      type = 'keyword';
    } else if (/^[A-Z]/.test(value)) {
      type = 'type';
    } else {
      const nextChar = line[idx + value.length];
      if (nextChar === '(') {
        type = 'function';
      }
    }

    tokens.push({ type, value });
    lastIndex = idx + value.length;
  }

  if (lastIndex < line.length) {
    tokens.push({ type: 'plain', value: line.slice(lastIndex) });
  }

  return tokens;
}
