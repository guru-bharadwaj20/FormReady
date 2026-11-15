/**
 * Locale parity check, run in CI as `npm run i18n:check`.
 * Every locale file must have exactly the English keys, the same {placeholders}
 * per key, no empty strings, and a LOCALES entry; every LOCALES entry must
 * have a file.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { placeholders } from '../src/lib/i18n/core.js';
import { LOCALES } from '../src/lib/i18n/locales.js';

const dir = join(process.cwd(), 'src/lib/i18n/locales');
const files = readdirSync(dir).filter((f) => f.endsWith('.json'));
const read = (f: string) =>
  JSON.parse(readFileSync(join(dir, f), 'utf8')) as Record<string, string>;
const en = read('en.json');
const enKeys = Object.keys(en);
const problems: string[] = [];

for (const file of files) {
  const code = file.replace(/\.json$/, '');
  if (!LOCALES.some((l) => l.code === code)) problems.push(`${file}: not listed in LOCALES`);
  if (code === 'en') continue;
  const table = read(file);
  const keys = Object.keys(table);
  for (const k of enKeys) if (!(k in table)) problems.push(`${file}: missing key ${k}`);
  for (const k of keys) if (!(k in en)) problems.push(`${file}: unknown key ${k}`);
  for (const k of keys) {
    const v = table[k]!;
    if (typeof v !== 'string' || v.trim() === '') problems.push(`${file}: empty value for ${k}`);
    else if (k in en) {
      const want = placeholders(en[k]!).join(',');
      const got = placeholders(v).join(',');
      if (want !== got) problems.push(`${file}: ${k} has {${got}} but English has {${want}}`);
    }
  }
}
for (const l of LOCALES) {
  if (!files.includes(`${l.code}.json`)) problems.push(`LOCALES lists ${l.code} but no file`);
}

if (problems.length) {
  console.error(problems.join('\n'));
  console.error(`\n${problems.length} i18n problem(s)`);
  process.exit(1);
}
console.log(`i18n ok: ${files.length} locales, ${enKeys.length} keys each`);
