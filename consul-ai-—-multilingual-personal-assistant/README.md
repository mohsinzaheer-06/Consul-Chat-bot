# Consul AI — Multilingual Personal Assistant

A private, modern personal AI assistant built with React, TypeScript, Tailwind CSS, Express, and the official `@google/genai` SDK. Supports **English**, **Urdu (اردو)** with automatic RTL rendering, and **Roman Urdu**, generates **3 contextual follow-up questions** after every reply, and stores conversation history locally in your browser.

---

## Features

- **Professional Consultant Persona**: Direct, clear, polite, and simple explanations structured with headings, bullet points, and practical examples.
- **Multilingual & RTL Intelligence**: Automatically detects English, Urdu script (`اردو`), Roman Urdu, and mixed-language messages, replying in the user's language with proper RTL/LTR layout.
- **Smart Follow-Up Suggestions**: Automatically generates 3 relevant, non-repetitive follow-up questions after every response; clicking any suggestion sends it immediately.
- **Local Browser Memory**: Auto-saves conversations in `localStorage` with instant title generation, search, inline rename, individual delete, clear-all confirmation, JSON/TXT export, and validated JSON import.
- **Streaming & Error Handling**: Real-time SSE response streaming with Stop Generation, Regenerate, Copy response/code, and graceful rate-limit/network error handling.
- **Light & Dark Modes**: Clean dual-theme UI with responsive mobile drawer navigation.

---

## Project Structure

- `server.ts` — Express server serving `/api/health`, `/api/chat` (SSE streaming + validation + rate limiting), and Vite dev / static production assets.
- `server/gemini.ts` — Server-side `@google/genai` client initialization, conversation history normalization, error mapping, and follow-up fallback helper.
- `src/App.tsx` — Main workspace layout, header controls, chat viewport, and modal wiring.
- `src/hooks/useChatStore.ts` — Conversation state, SSE stream reader, `localStorage` sync, theme toggling, and export/import handlers.
- `src/components/` — Modular UI components (`Sidebar.tsx`, `WelcomeScreen.tsx`, `MessageBubble.tsx`, `MarkdownContent.tsx`, `CodeBlock.tsx`, `ChatInput.tsx`, `SettingsModal.tsx`).
- `src/lib/` — Pure, unit-tested logic (`language.ts`, `streamParser.ts`, `chatValidation.ts`, `storage.ts`, `syntaxHighlight.ts`, `core.test.ts`).
- `src/types/chat.ts` — Shared TypeScript types and interfaces.

---

## Getting a Free Gemini API Key

1. Open [Google AI Studio](https://aistudio.google.com/apikey).
2. Sign in with your Google account and click **Create API key**.
3. Copy the generated key and keep it strictly server-side (never commit it to Git or expose it in client code).

---

## Local Setup & Running

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment variables**:
   Copy `.env.example` to `.env.local` (or `.env`) and insert your key:
   ```bash
   cp .env.example .env.local
   ```
   Edit `.env.local`:
   ```env
   GEMINI_API_KEY="your_actual_gemini_api_key"
   GEMINI_MODEL="gemini-4-hydrogen"
   APP_URL="http://localhost:3000"
   ```
   Eligible free-tier models: `gemini-4-hydrogen` (default) and `gemini-3.1-flash-lite`.

3. **Run in development**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000`.

4. **Run unit tests, type-check, and production build**:
   ```bash
   npx tsx --test src/lib/core.test.ts
   npm run lint
   npm run build
   npm start
   ```

---

## Privacy Note on Local Storage

Conversations are saved locally in your browser's `localStorage`. Browser storage is **not encrypted**, and clearing browser site data removes saved conversations. Avoid storing confidential passwords, financial credentials, or sensitive private records in browser-local chat history.
