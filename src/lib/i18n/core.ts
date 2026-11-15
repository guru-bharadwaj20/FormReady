import { DEFAULT_LOCALE, LOCALES } from './locales.js';

export type Messages = Record<string, string>;
export type Params = Record<string, string | number>;

/** Replaces {name} placeholders. Unknown names are left visible so they are easy to spot. */
export function interpolate(template: string, params?: Params): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (m, k: string) => (k in params ? String(params[k]) : m));
}

/** Pure lookup with English fallback; returns the key itself when nothing matches. */
export function translate(
  key: string,
  messages: Messages,
  fallback: Messages,
  params?: Params,
): string {
  const template = messages[key] ?? fallback[key];
  if (template === undefined) return key;
  return interpolate(template, params);
}

/**
 * Picks the best supported locale: an explicit saved choice wins, then the
 * first browser language whose base tag we ship, else English.
 */
export function detectLocale(
  saved: string | null | undefined,
  browserLanguages: readonly string[],
): string {
  const supported = new Set(LOCALES.map((l) => l.code));
  if (saved && supported.has(saved)) return saved;
  for (const lang of browserLanguages) {
    const base = lang.toLowerCase().split('-')[0]!;
    if (supported.has(base)) return base;
  }
  return DEFAULT_LOCALE;
}

/** Placeholder names used by a template, sorted, for the parity check. */
export function placeholders(template: string): string[] {
  return [...template.matchAll(/\{(\w+)\}/g)].map((m) => m[1]!).sort();
}
