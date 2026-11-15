import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import {
  specs,
  getSpec,
  getAsset,
  targetPixels,
  outputFilename,
  reportChangeUrl,
} from '$lib/specs/registry';
import { lintSpec } from '$lib/specs/lint';
import { searchSpecs } from '$lib/specs/search';

const schema = JSON.parse(
  readFileSync(new URL('../../../specs/schema.json', import.meta.url), 'utf8'),
);
const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
const validate = ajv.compile(schema);

describe('spec registry', () => {
  it('bundles every spec and none are duplicated', () => {
    expect(specs.length).toBeGreaterThanOrEqual(20);
    expect(new Set(specs.map((s) => s.id)).size).toBe(specs.length);
  });

  it.each(specs.map((s) => [s.id, s] as const))('%s satisfies schema and lint', (_, spec) => {
    expect(validate(spec), JSON.stringify(validate.errors)).toBe(true);
    expect(lintSpec(spec)).toEqual([]);
  });

  it('looks up specs and assets by id', () => {
    const ssc = getSpec('ssc/cgl-2026');
    expect(ssc?.portal).toBe('SSC');
    expect(getAsset(ssc!, 'photo')?.kind).toBe('photo');
    expect(getAsset(ssc!, 'nope')).toBeUndefined();
    expect(getSpec('missing/spec')).toBeUndefined();
  });

  it('derives pixel targets from physical size', () => {
    expect(targetPixels({ physical: { widthMm: 35, heightMm: 45, dpi: 200 } } as never)).toEqual({
      width: 276,
      height: 354,
    });
    expect(targetPixels({ pixels: { width: 200, height: 230 } } as never)).toEqual({
      width: 200,
      height: 230,
    });
    expect(targetPixels({} as never)).toBeUndefined();
  });

  it('builds filenames and report links', () => {
    const spec = getSpec('ssc/cgl-2026')!;
    const asset = getAsset(spec, 'photo')!;
    expect(outputFilename(spec, asset, 'jpg')).toBe('ssc-cgl-2026-photo.jpg');
    const url = new URL(reportChangeUrl(spec, asset));
    expect(url.searchParams.get('spec')).toBe('ssc/cgl-2026');
    expect(url.searchParams.get('asset')).toBe('photo');
    expect(url.searchParams.get('template')).toBe('spec_change.yml');
  });
});

describe('searchSpecs', () => {
  it('returns everything for an empty query', () => {
    expect(searchSpecs(specs, '  ', 5)).toHaveLength(5);
  });
  it('ranks exact alias above partial matches', () => {
    const hits = searchSpecs(specs, 'ssc cgl');
    expect(hits[0]?.spec.id).toBe('ssc/cgl-2026');
  });
  it('is forgiving about punctuation and case', () => {
    expect(searchSpecs(specs, 'DS-160')[0]?.spec.id).toBe('us-visa/ds-160');
    expect(searchSpecs(specs, 'Neet!')[0]?.spec.id).toBe('nta/neet-ug-2026');
  });
  it('matches on individual tokens when the phrase does not match', () => {
    const ids = searchSpecs(specs, 'railway ntpc').map((h) => h.spec.id);
    expect(ids).toContain('rrb/ntpc-2026');
  });
  it('returns nothing for garbage', () => {
    expect(searchSpecs(specs, 'zzqqxx')).toEqual([]);
  });
});
