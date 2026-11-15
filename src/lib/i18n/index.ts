import en from './locales/en.json';
import { type Messages, type Params, detectLocale, translate } from './core.js';
import { DEFAULT_LOCALE, localeInfo } from './locales.js';

export * from './core.js';
export * from './locales.js';

const STORAGE_KEY = 'formready.locale';

const loaders = import.meta.glob<{ default: Messages }>('./locales/*.json');

const cache = new Map<string, Messages>([[DEFAULT_LOCALE, en as Messages]]);

/** Loads a locale table (code-split per language) and caches it. */
export async function loadMessages(code: string): Promise<Messages> {
  const hit = cache.get(code);
  if (hit) return hit;
  const load = loaders[`./locales/${code}.json`];
  if (!load) return en as Messages;
  const mod = await load();
  cache.set(code, mod.default);
  return mod.default;
}

export interface I18n {
  readonly locale: string;
  readonly dir: 'ltr' | 'rtl';
  t(key: string, params?: Params): string;
  setLocale(code: string): Promise<void>;
  subscribe(fn: (locale: string) => void): () => void;
}

/**
 * Framework-free translator. The Svelte layer wraps it in a rune; tests and
 * workers use it directly.
 */
export function createI18n(initial?: string): I18n {
  let locale = initial ?? detectLocale(readSaved(), navigatorLanguages());
  let messages: Messages = cache.get(locale) ?? (en as Messages);
  const listeners = new Set<(l: string) => void>();
  return {
    get locale() {
      return locale;
    },
    get dir() {
      return localeInfo(locale)?.dir ?? 'ltr';
    },
    t: (key, params) => translate(key, messages, en as Messages, params),
    async setLocale(code) {
      if (!localeInfo(code)) code = DEFAULT_LOCALE;
      messages = await loadMessages(code);
      locale = code;
      writeSaved(code);
      for (const fn of listeners) fn(code);
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}

function readSaved(): string | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeSaved(code: string): void {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, code);
  } catch {
    // Private mode or storage quota: the choice simply does not persist.
  }
}

function navigatorLanguages(): readonly string[] {
  if (typeof navigator === 'undefined') return [];
  return navigator.languages?.length ? navigator.languages : [navigator.language ?? ''];
}
