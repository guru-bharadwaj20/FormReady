import { createI18n, LOCALES, DEFAULT_LOCALE, type Params } from '$lib/i18n/index.js';

/**
 * Rune wrapper over the framework-free translator. Reading `i18n.t()` in a
 * template subscribes to the locale signal, so every string re-renders when
 * the user switches language.
 */
const core = createI18n();

let locale = $state(core.locale);
let ready = $state(core.locale === DEFAULT_LOCALE);

core.subscribe((l) => {
  locale = l;
  ready = true;
});

// The detected locale may not be English; load its table before first paint.
if (!ready) void core.setLocale(core.locale);

export const i18n = {
  get locale(): string {
    return locale;
  },
  get ready(): boolean {
    return ready;
  },
  get dir(): 'ltr' | 'rtl' {
    void locale;
    return core.dir;
  },
  t(key: string, params?: Params): string {
    void locale;
    return core.t(key, params);
  },
  setLocale(code: string): Promise<void> {
    return core.setLocale(code);
  },
  locales: LOCALES,
};

export type T = typeof i18n.t;
