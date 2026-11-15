/**
 * Validates every spec under specs/ against specs/schema.json and a set of
 * cross-field sanity rules the schema cannot express (FR-1.4).
 * Exit code 1 on any failure so CI blocks the merge.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import type { PortalSpec } from '../src/lib/specs/types.js';
import { lintSpec } from '../src/lib/specs/lint.js';

const root = join(import.meta.dirname, '..', 'specs');
const schema = JSON.parse(readFileSync(join(root, 'schema.json'), 'utf8'));
const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
const validate = ajv.compile<PortalSpec>(schema);

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return walk(full);
    return name.endsWith('.json') && name !== 'schema.json' ? [full] : [];
  });
}

let failures = 0;
const files = walk(root);
const seenIds = new Set<string>();

for (const file of files) {
  const rel = relative(root, file).split(sep).join('/');
  const expectedId = rel.replace(/\.json$/, '');
  let data: unknown;
  try {
    data = JSON.parse(readFileSync(file, 'utf8'));
  } catch (err) {
    console.error(`FAIL ${rel}: not valid JSON (${(err as Error).message})`);
    failures++;
    continue;
  }
  const problems: string[] = [];
  if (!validate(data)) {
    for (const e of validate.errors ?? []) {
      problems.push(`${e.instancePath || '/'} ${e.message ?? ''}`.trim());
    }
  } else {
    if (data.id !== expectedId) problems.push(`id "${data.id}" must equal path "${expectedId}"`);
    if (seenIds.has(data.id)) problems.push(`duplicate id ${data.id}`);
    seenIds.add(data.id);
    problems.push(...lintSpec(data));
  }
  if (problems.length) {
    failures++;
    console.error(`FAIL ${rel}`);
    for (const p of problems) console.error(`  - ${p}`);
  }
}

console.log(`${files.length - failures}/${files.length} specs valid`);
process.exit(failures ? 1 : 0);
