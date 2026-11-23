import type { TextDirection } from '../types/chat';

const RTL_CHAR_REGEX = /[\u0590-\u05FF\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
const RTL_CHAR_GLOBAL = /[\u0590-\u05FF\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/g;
const LTR_CHAR_GLOBAL = /[A-Za-z\u00C0-\u024F]/g;

export function detectTextDirection(text: string): TextDirection {
  if (!text || !text.trim()) {
    return 'ltr';
  }

  const rtlMatches = text.match(RTL_CHAR_GLOBAL);
  const rtlCount = rtlMatches ? rtlMatches.length : 0;

  if (rtlCount === 0) {
    return 'ltr';
  }

  const ltrMatches = text.match(LTR_CHAR_GLOBAL);
  const ltrCount = ltrMatches ? ltrMatches.length : 0;

  if (ltrCount === 0) {
    return 'rtl';
  }

  // Check first strong directional character
  for (const ch of text) {
    if (RTL_CHAR_REGEX.test(ch)) {
      return rtlCount / (rtlCount + ltrCount) >= 0.25 ? 'rtl' : 'ltr';
    }
    if (/[A-Za-z\u00C0-\u024F]/.test(ch)) {
      break;
    }
  }

  return rtlCount / (rtlCount + ltrCount) >= 0.45 ? 'rtl' : 'ltr';
}

export function generateConversationTitle(firstMessage: string): string {
  const cleaned = firstMessage
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[`*_#>\[\]()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) {
    return 'New conversation';
  }

  const maxLength = 46;
  if (cleaned.length <= maxLength) {
    return cleaned;
  }

  const slice = cleaned.slice(0, maxLength);
  const lastSpace = slice.lastIndexOf(' ');
  const trimmed = lastSpace > 18 ? slice.slice(0, lastSpace) : slice;
  return `${trimmed.trim()}…`;
}

export function formatRelativeDate(timestamp: number, now = Date.now()): string {
  const diffMs = Math.max(0, now - timestamp);
  const diffMinutes = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;

  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}
