import {
  AlertTriangle,
  Download,
  FileText,
  Globe2,
  Moon,
  Sun,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import type { EligibleModel, ResponseLength, ThemeMode, UserSettings } from '../types/chat';

interface SettingsModalProps {
  isOpen: boolean;
  settings: UserSettings;
  conversationCount: number;
  detectedContext: {
    timezone: string;
    locationLabel?: string;
  };
  onClose: () => void;
  onUpdateTheme: (theme: ThemeMode) => void;
  onUpdateResponseLength: (length: ResponseLength) => void;
  onUpdateModel: (model: EligibleModel) => void;
  onExportJson: () => void;
  onExportTxt: () => void;
  onImportJson: (raw: string) => { ok: true; count: number } | { ok: false; error: string };
  onClearAllHistory: () => void;
}

export function SettingsModal({
  isOpen,
  settings,
  conversationCount,
  detectedContext,
  onClose,
  onUpdateTheme,
  onUpdateResponseLength,
  onUpdateModel,
  onExportJson,
  onExportTxt,
  onImportJson,
  onClearAllHistory,
}: SettingsModalProps) {
  const [confirmClear, setConfirmClear] = useState(false);
  const [importStatus, setImportStatus] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setConfirmClear(false);
      setImportStatus(null);
      return;
    }

    const onKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleFileSelected = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    try {
      const text = await file.text();
      const result = onImportJson(text);
      if (result.ok) {
        setImportStatus({
          type: 'success',
          text: `Imported ${result.count} conversation${result.count === 1 ? '' : 's'}.`,
        });
      } else {
        setImportStatus({ type: 'error', text: result.error });
      }
    } catch {
      setImportStatus({
        type: 'error',
        text: 'Unable to read the selected file.',
      });
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
    >
      <div
        className="fixed inset-0 bg-zinc-950/60 backdrop-blur-xs"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-zinc-900/15 bg-white p-6 shadow-2xl dark:border-white/12 dark:bg-[#111118]">
        <div className="flex items-center justify-between gap-4 border-b border-zinc-200 pb-4 dark:border-white/10">
          <h2
            id="settings-modal-title"
            className="font-display text-lg font-bold tracking-tight text-zinc-950 dark:text-white"
          >
            Settings
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-950 focus-visible:outline-2 focus-visible:outline-blue-600 dark:text-zinc-400 dark:hover:bg-white/10 dark:hover:text-white"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-5 space-y-6">
          {/* Theme Selection */}
          <section>
            <h3 className="text-sm font-semibold text-zinc-950 dark:text-zinc-100">
              Appearance
            </h3>
            <div className="mt-2.5 grid grid-cols-2 gap-2 rounded-xl bg-[#F5F4EE] p-1 dark:bg-white/[0.06]">
              <button
                type="button"
                onClick={() => onUpdateTheme('light')}
                className={`flex min-h-[38px] items-center justify-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                  settings.theme === 'light'
                    ? 'bg-white text-zinc-950 shadow-xs dark:bg-[#1A1A24] dark:text-white'
                    : 'text-zinc-600 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-white'
                }`}
              >
                <Sun className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Light mode</span>
              </button>
              <button
                type="button"
                onClick={() => onUpdateTheme('dark')}
                className={`flex min-h-[38px] items-center justify-center gap-2 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                  settings.theme === 'dark'
                    ? 'bg-white text-zinc-950 shadow-xs dark:bg-[#1A1A24] dark:text-white'
                    : 'text-zinc-600 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-white'
                }`}
              >
                <Moon className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Dark mode</span>
              </button>
            </div>
          </section>

          {/* Response Length */}
          <section>
            <h3 className="text-sm font-semibold text-zinc-950 dark:text-zinc-100">
              Response length
            </h3>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Controls how brief or detailed replies are by default.
            </p>
            <div className="mt-2.5 grid grid-cols-3 gap-1.5 rounded-xl bg-[#F5F4EE] p-1 dark:bg-white/[0.06]">
              {(
                [
                  { id: 'concise', label: 'Concise' },
                  { id: 'balanced', label: 'Balanced' },
                  { id: 'detailed', label: 'Detailed' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onUpdateResponseLength(opt.id)}
                  className={`min-h-[38px] rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                    settings.responseLength === opt.id
                      ? 'bg-white text-zinc-950 shadow-xs dark:bg-[#1A1A24] dark:text-white'
                      : 'text-zinc-600 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </section>

          {/* Model Configuration */}
          <section>
            <label
              htmlFor="gemini-model-select"
              className="block text-sm font-semibold text-zinc-950 dark:text-zinc-100"
            >
              Gemini model (free tier)
            </label>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              Switch to the lighter model if you encounter free-tier rate limits.
            </p>
            <select
              id="gemini-model-select"
              value={settings.model}
              onChange={(e) => onUpdateModel(e.target.value as EligibleModel)}
              className="mt-2.5 h-10 w-full rounded-xl border border-zinc-900/15 bg-white px-3 text-sm text-zinc-950 focus:border-blue-600 focus:outline-none dark:border-white/12 dark:bg-[#181822] dark:text-zinc-100"
            >
              <option value="gemini-3.1-flash-lite">
                gemini-3.1-flash-lite (Recommended — Fast Free Tier)
              </option>
              <option value="gemini-4-hydrogen">gemini-4-hydrogen (Standard)</option>
            </select>
          </section>

          {/* Live Web & Context */}
          <section className="rounded-xl border border-zinc-200 bg-[#FAF9F5] p-3.5 text-xs dark:border-white/10 dark:bg-white/[0.04]">
            <div className="flex items-center gap-2 font-semibold text-zinc-950 dark:text-zinc-100">
              <Globe2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
              <span>Automatic live context</span>
            </div>
            <p className="mt-1.5 leading-relaxed text-zinc-600 dark:text-zinc-300">
              Timezone: <span className="font-mono-code font-medium">{detectedContext.timezone}</span>
              {detectedContext.locationLabel ? ` · Location: ${detectedContext.locationLabel}` : ''}
            </p>
          </section>

          {/* Conversation Management */}
          <section className="border-t border-zinc-200 pt-5 dark:border-white/10">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-zinc-950 dark:text-zinc-100">
                Conversation history
              </h3>
              <span className="font-mono-code text-xs text-zinc-500 tabular-nums dark:text-zinc-400">
                {conversationCount} saved
              </span>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onExportJson}
                disabled={conversationCount === 0}
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-zinc-900/12 bg-white px-3.5 py-1.5 text-xs font-medium text-zinc-800 transition-colors hover:bg-zinc-50 disabled:opacity-50 dark:border-white/12 dark:bg-white/[0.06] dark:text-zinc-100 dark:hover:bg-white/10 whitespace-nowrap"
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Export JSON</span>
              </button>

              <button
                type="button"
                onClick={onExportTxt}
                disabled={conversationCount === 0}
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-zinc-900/12 bg-white px-3.5 py-1.5 text-xs font-medium text-zinc-800 transition-colors hover:bg-zinc-50 disabled:opacity-50 dark:border-white/12 dark:bg-white/[0.06] dark:text-zinc-100 dark:hover:bg-white/10 whitespace-nowrap"
              >
                <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Export TXT</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-zinc-900/12 bg-white px-3.5 py-1.5 text-xs font-medium text-zinc-800 transition-colors hover:bg-zinc-50 dark:border-white/12 dark:bg-white/[0.06] dark:text-zinc-100 dark:hover:bg-white/10 whitespace-nowrap"
              >
                <Upload className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Import JSON</span>
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleFileSelected}
                className="sr-only"
                aria-label="Import conversations JSON file"
              />
            </div>

            {importStatus && (
              <p
                role="status"
                className={`mt-2.5 text-xs font-medium ${
                  importStatus.type === 'success'
                    ? 'text-emerald-700 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {importStatus.text}
              </p>
            )}

            <div className="mt-4">
              {!confirmClear ? (
                <button
                  type="button"
                  onClick={() => setConfirmClear(true)}
                  disabled={conversationCount === 0}
                  className="inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50/70 px-3.5 py-1.5 text-xs font-medium text-rose-700 transition-colors hover:bg-rose-100 disabled:opacity-50 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-950/70 whitespace-nowrap"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Clear all history</span>
                </button>
              ) : (
                <div className="rounded-xl border border-rose-200 bg-rose-50/80 p-3 dark:border-rose-900/60 dark:bg-rose-950/40">
                  <div className="flex items-start gap-2 text-xs text-rose-800 dark:text-rose-200">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    <p>
                      Delete all {conversationCount} locally saved conversations? This cannot be undone.
                    </p>
                  </div>
                  <div className="mt-2.5 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        onClearAllHistory();
                        setConfirmClear(false);
                      }}
                      className="min-h-[34px] rounded-lg bg-rose-600 px-3 py-1 text-xs font-medium text-white hover:bg-rose-700 whitespace-nowrap"
                    >
                      Confirm clear all
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmClear(false)}
                      className="min-h-[34px] rounded-lg border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-white/15 dark:bg-white/10 dark:text-zinc-200 whitespace-nowrap"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>

          <section className="rounded-xl border border-zinc-200 bg-[#FAF9F5] p-3.5 text-xs leading-relaxed text-zinc-600 dark:border-white/10 dark:bg-white/[0.04] dark:text-zinc-300">
            <p className="font-semibold text-zinc-900 dark:text-zinc-100">
              Local browser storage notice
            </p>
            <p className="mt-1">
              Conversations are saved locally in your browser&apos;s unencrypted storage. Clearing browser data removes your history, so avoid storing sensitive personal or financial secrets here.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
