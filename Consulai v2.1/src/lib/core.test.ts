import test from 'node:test';
import assert from 'node:assert/strict';
import { detectTextDirection, generateConversationTitle } from './language';
import {
  createStreamAccumulator,
  parseFollowUpSection,
  splitAnswerAndFollowUps,
} from './streamParser';
import {
  buildSystemInstruction,
  resolveEligibleModel,
  validateChatRequest,
} from './chatValidation';
import {
  exportConversationsAsJson,
  exportConversationsAsTxt,
  mergeImportedConversations,
  parseImportedConversations,
} from './storage';
import { tokenizeCodeLine } from './syntaxHighlight';
import {
  extractClientIp,
  isPublicRoutableIp,
  isValidIanaTimeZone,
  normalizeIpCandidate,
} from '../../server/location';
import { extractGroundingSourcesFromChunk } from '../../server/gemini';
import type { GroundingSource } from '../types/chat';

test('detectTextDirection identifies Urdu RTL vs English and Roman Urdu LTR', () => {
  assert.equal(detectTextDirection('Explain Next.js in simple terms.'), 'ltr');
  assert.equal(detectTextDirection('Mujhe Next.js samjhao.'), 'ltr');
  assert.equal(detectTextDirection('مجھے جاوا اسکرپٹ سمجھائیں۔'), 'rtl');
  assert.equal(detectTextDirection('مجھے JavaScript اور React سکھائیں۔'), 'rtl');
  assert.equal(detectTextDirection('   '), 'ltr');
});

test('generateConversationTitle creates clean bounded titles', () => {
  assert.equal(generateConversationTitle('   '), 'New conversation');
  assert.equal(generateConversationTitle('What is AI?'), 'What is AI?');
  const long =
    'How can a small consulting business structure quarterly financial reviews effectively?';
  const title = generateConversationTitle(long);
  assert.ok(title.length <= 47);
  assert.ok(title.endsWith('…'));
});

test('createStreamAccumulator buffers split marker chunks without leaking marker text', () => {
  const acc = createStreamAccumulator();
  const chunks = [
    'Artificial intelligence helps computers ',
    'learn from examples.\n\n---FOLL',
    'OWUPS---\n["How does AI learn?", ',
    '"What are AI risks?", "How can I use AI daily?"]',
  ];

  let visible = '';
  for (const c of chunks) {
    visible += acc.push(c);
  }
  const done = acc.finalize();
  visible += done.remainingDelta;

  assert.equal(visible.trim(), 'Artificial intelligence helps computers learn from examples.');
  assert.equal(visible.includes('FOLLOWUPS'), false);
  assert.deepEqual(done.followUps, [
    'How does AI learn?',
    'What are AI risks?',
    'How can I use AI daily?',
  ]);
});

test('parseFollowUpSection handles fenced JSON and numbered list fallbacks', () => {
  const fenced = '```json\n["One?", "Two?", "Three?", "Four?"]\n```';
  assert.deepEqual(parseFollowUpSection(fenced), ['One?', 'Two?', 'Three?']);

  const numbered = '1. پہلا سوال؟\n2. دوسرا سوال؟\n3. تیسرا سوال؟';
  assert.deepEqual(parseFollowUpSection(numbered), [
    'پہلا سوال؟',
    'دوسرا سوال؟',
    'تیسرا سوال؟',
  ]);

  const split = splitAnswerAndFollowUps('Short answer.\n---FOLLOWUPS---\n["A?", "B?", "C?"]');
  assert.equal(split.answer, 'Short answer.');
  assert.deepEqual(split.followUps, ['A?', 'B?', 'C?']);
});

test('validateChatRequest rejects empty or oversized messages and caps history', () => {
  assert.equal(validateChatRequest(null).ok, false);
  assert.equal(validateChatRequest({ message: '   ' }).ok, false);
  assert.equal(validateChatRequest({ message: 'a'.repeat(9000) }).ok, false);

  const manyTurns = Array.from({ length: 30 }, (_, i) => ({
    role: i % 2 === 0 ? 'user' : 'model',
    content: `Turn ${i}`,
  }));
  const valid = validateChatRequest({
    message: 'Explain cash flow',
    history: manyTurns,
    responseLength: 'balanced',
    model: 'gemini-3.1-flash-lite',
  });
  assert.equal(valid.ok, true);
  if (valid.ok) {
    assert.equal(valid.data.history.length, 20);
    assert.equal(valid.data.responseLength, 'balanced');
    assert.equal(valid.data.model, 'gemini-3.1-flash-lite');
  }
});

test('resolveEligibleModel enforces free-tier allowlist', () => {
  assert.equal(resolveEligibleModel('gemini-1.5-pro', null), 'gemini-3.1-flash-lite');
  assert.equal(resolveEligibleModel(undefined, 'gemini-4-hydrogen'), 'gemini-4-hydrogen');
  assert.ok(buildSystemInstruction('concise').includes('---FOLLOWUPS---'));
});

test('export and import conversations validate and merge cleanly', () => {
  const sample = [
    {
      id: 'c1',
      title: 'Strategy review',
      createdAt: 1000,
      updatedAt: 2000,
      messages: [
        { id: 'm1', role: 'user' as const, content: 'Hello', createdAt: 1000 },
        {
          id: 'm2',
          role: 'assistant' as const,
          content: 'How can I assist?',
          createdAt: 1500,
          followUpQuestions: ['Q1?', 'Q2?', 'Q3?'],
        },
      ],
    },
  ];

  const json = exportConversationsAsJson(sample);
  const parsed = parseImportedConversations(json);
  assert.equal(parsed.ok, true);
  if (parsed.ok) {
    assert.equal(parsed.conversations.length, 1);
    assert.equal(parsed.conversations[0].messages[1].followUpQuestions?.length, 3);
  }

  const bad = parseImportedConversations('{not valid json');
  assert.equal(bad.ok, false);

  const txt = exportConversationsAsTxt(sample);
  assert.ok(txt.includes('Title: Strategy review'));
  assert.ok(txt.includes('Suggested follow-ups:'));

  const merged = mergeImportedConversations(sample, [
    {
      id: 'c2',
      title: 'Urdu chat',
      createdAt: 3000,
      updatedAt: 3000,
      messages: [],
    },
  ]);
  assert.equal(merged.length, 2);
  assert.equal(merged[0].id, 'c2');
});

test('tokenizeCodeLine identifies keywords, strings, comments, and numbers', () => {
  const tokens = tokenizeCodeLine('const count = 42; // items', 'typescript');
  assert.ok(tokens.some((t) => t.type === 'keyword' && t.value === 'const'));
  assert.ok(tokens.some((t) => t.type === 'number' && t.value === '42'));
  assert.ok(tokens.some((t) => t.type === 'comment' && t.value === '// items'));
});

test('IP validation blocks private/loopback ranges and extracts public client IP safely', () => {
  assert.equal(isPublicRoutableIp('127.0.0.1'), false);
  assert.equal(isPublicRoutableIp('10.0.0.5'), false);
  assert.equal(isPublicRoutableIp('192.168.1.10'), false);
  assert.equal(isPublicRoutableIp('172.16.4.2'), false);
  assert.equal(isPublicRoutableIp('169.254.169.254'), false);
  assert.equal(isPublicRoutableIp('::1'), false);
  assert.equal(isPublicRoutableIp('fe80::1'), false);
  assert.equal(isPublicRoutableIp('8.8.8.8'), true);
  assert.equal(isPublicRoutableIp('1.1.1.1'), true);

  assert.equal(normalizeIpCandidate('::ffff:203.0.113.9'), '203.0.113.9');
  assert.equal(normalizeIpCandidate('203.0.113.9:41234'), '203.0.113.9');
  assert.equal(normalizeIpCandidate('not-an-ip'), undefined);

  assert.equal(
    extractClientIp({ 'x-forwarded-for': '127.0.0.1, 8.8.4.4' }, '127.0.0.1'),
    '8.8.4.4'
  );
  assert.equal(isValidIanaTimeZone('Asia/Karachi'), true);
  assert.equal(isValidIanaTimeZone('Invalid/Zone'), false);
});

test('extractGroundingSourcesFromChunk deduplicates and filters unsafe URLs', () => {
  const seen = new Set<string>();
  const collected: GroundingSource[] = [];
  extractGroundingSourcesFromChunk(
    {
      candidates: [
        {
          groundingMetadata: {
            groundingChunks: [
              { web: { uri: 'https://example.com/news', title: 'Example News' } },
              { web: { uri: 'https://example.com/news', title: 'Duplicate' } },
              { web: { uri: 'javascript:alert(1)', title: 'Bad XSS' } },
              { web: { uri: 'https://gemini.google.com', title: '' } },
            ],
          },
        },
      ],
    },
    seen,
    collected
  );

  assert.equal(collected.length, 2);
  assert.equal(collected[0].title, 'Example News');
  assert.equal(collected[1].title, 'gemini.google.com');
});

test('buildSystemInstruction injects detected user location and timezone context', () => {
  const prompt = buildSystemInstruction('concise', {
    city: 'Lahore',
    region: 'Punjab',
    country: 'Pakistan',
    timezone: 'Asia/Karachi',
    localTimeFormatted: 'Monday, November 23, 2026 at 4:45 PM PKT',
    source: 'ip+browser',
  });
  assert.ok(prompt.includes('Lahore, Punjab, Pakistan'));
  assert.ok(prompt.includes('Asia/Karachi'));
  assert.ok(prompt.includes('Monday, November 23, 2026'));
});
