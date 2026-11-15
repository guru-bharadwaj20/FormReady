import { describe, expect, it } from 'vitest';
import { detectLocale, interpolate, placeholders, translate } from '$lib/i18n/core';
import { createI18n, loadMessages, LOCALES } from '$lib/i18n';
import en from '$lib/i18n/locales/en.json';

describe('i18n core', () => {
  it('interpolates named params and leaves unknown ones visible', () => {
    const params = { observed: '80 KB', expected: '50 KB' };
    expect(interpolate('File is {observed}, needs {expected}.', params)).toBe(
      'File is 80 KB, needs 50 KB.',
    );
    expect(interpolate('{count} page(s)', { count: 3 })).toBe('3 page(s)');
    expect(interpolate('{missing}', {})).toBe('{missing}');
  });
  it('falls back to English and then to the key', () => {
    expect(translate('a', { a: 'x' }, { a: 'y' })).toBe('x');
    expect(translate('a', {}, { a: 'y' })).toBe('y');
    expect(translate('nope', {}, {})).toBe('nope');
  });
  it('detects the locale from saved choice then browser languages', () => {
    expect(detectLocale('ta', ['en-US'])).toBe('ta');
    expect(detectLocale('xx', ['hi-IN', 'en'])).toBe('hi');
    expect(detectLocale(null, ['fr', 'de'])).toBe('en');
    expect(detectLocale(null, [])).toBe('en');
  });
  it('lists placeholders sorted', () => {
    expect(placeholders('{b} and {a} and {b}')).toEqual(['a', 'b', 'b']);
  });
});

describe('i18n runtime', () => {
  it('translates, switches locale and notifies', async () => {
    const i18n = createI18n('en');
    expect(i18n.t('nav.fix')).toBe(en['nav.fix']);
    const seen: string[] = [];
    const off = i18n.subscribe((l) => seen.push(l));
    await i18n.setLocale('hi');
    expect(i18n.locale).toBe('hi');
    expect(i18n.t('nav.fix')).not.toBe(en['nav.fix']);
    expect(i18n.t('footer.specCount', { count: 25 })).toContain('25');
    await i18n.setLocale('zz');
    expect(i18n.locale).toBe('en');
    off();
    expect(seen).toEqual(['hi', 'en']);
  });
  it('ships a table for every listed locale with English key parity', async () => {
    for (const l of LOCALES) {
      const table = await loadMessages(l.code);
      expect(Object.keys(table).sort(), l.code).toEqual(Object.keys(en).sort());
    }
  });
});
