/**
 * Supported interface languages (FR-7). Codes are BCP 47; native names are
 * what the language switcher shows. English is the source of truth and the
 * fallback for any missing key.
 */
export interface LocaleInfo {
  code: string;
  /** Name in the language itself. */
  native: string;
  /** English name, for tooltips and the spec guide. */
  english: string;
  dir: 'ltr' | 'rtl';
}

export const LOCALES: readonly LocaleInfo[] = [
  { code: 'en', native: 'English', english: 'English', dir: 'ltr' },
  { code: 'hi', native: 'हिन्दी', english: 'Hindi', dir: 'ltr' },
  { code: 'bn', native: 'বাংলা', english: 'Bengali', dir: 'ltr' },
  { code: 'te', native: 'తెలుగు', english: 'Telugu', dir: 'ltr' },
  { code: 'mr', native: 'मराठी', english: 'Marathi', dir: 'ltr' },
  { code: 'ta', native: 'தமிழ்', english: 'Tamil', dir: 'ltr' },
  { code: 'gu', native: 'ગુજરાતી', english: 'Gujarati', dir: 'ltr' },
  { code: 'kn', native: 'ಕನ್ನಡ', english: 'Kannada', dir: 'ltr' },
];

export const DEFAULT_LOCALE = 'en';

export function localeInfo(code: string): LocaleInfo | undefined {
  return LOCALES.find((l) => l.code === code);
}
