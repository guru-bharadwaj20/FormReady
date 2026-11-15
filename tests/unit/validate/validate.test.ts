import { describe, expect, it } from 'vitest';
import { validate } from '$lib/validate/validate';
import { formatBytes, formatRange, formatMm } from '$lib/validate/format';
import type { AssetSpec } from '$lib/specs/types';
import type { FileFacts } from '$lib/validate/facts';

const photo: AssetSpec = {
  id: 'photo',
  kind: 'photo',
  label: 'Photograph',
  formats: ['jpeg'],
  size: { minBytes: 20 * 1024, maxBytes: 50 * 1024 },
  pixels: { width: 276, height: 354, tolerance: 0.05 },
  physical: { widthMm: 35, heightMm: 45, dpi: 200 },
  dpi: 200,
  aspect: { ratio: 0.7778, tolerance: 0.05 },
  colour: 'colour',
  face: { minHeightFraction: 0.5, maxHeightFraction: 0.85 },
  background: { kind: 'light' },
};

const good: FileFacts = {
  format: 'jpeg',
  bytes: 30 * 1024,
  width: 276,
  height: 354,
  dpi: 200,
  greyscale: false,
  faceChecked: true,
  faceHeightFraction: 0.7,
  backgroundPlainness: 0.9,
  backgroundLightness: 0.85,
};

const byId = (r: ReturnType<typeof validate>, id: string) => r.checks.find((c) => c.id === id)!;

describe('validate', () => {
  it('passes a compliant photo', () => {
    const r = validate(good, photo);
    expect(r.compliant).toBe(true);
    expect(r.warnings).toBe(0);
    expect(r.checks.map((c) => c.id)).toEqual([
      'format',
      'size',
      'pixels',
      'aspect',
      'dpi',
      'colour',
      'face',
      'background',
    ]);
    expect(r.checks.every((c) => c.messageKey === `check.${c.id}.${c.status}`)).toBe(true);
  });

  it('fails on wrong format and size', () => {
    const r = validate({ ...good, format: 'png', bytes: 80 * 1024 }, photo);
    expect(r.compliant).toBe(false);
    expect(byId(r, 'format')).toMatchObject({ status: 'fail', observed: 'PNG', expected: 'JPEG' });
    expect(byId(r, 'size')).toMatchObject({
      status: 'fail',
      observed: '80 KB',
      expected: '20 KB to 50 KB',
    });
  });

  it('respects pixel tolerance', () => {
    expect(byId(validate({ ...good, width: 285 }, photo), 'pixels').status).toBe('pass');
    expect(byId(validate({ ...good, width: 320 }, photo), 'pixels').status).toBe('fail');
    const strict = { ...photo, pixels: { width: 276, height: 354 } };
    expect(byId(validate({ ...good, width: 277 }, strict), 'pixels').status).toBe('fail');
  });

  it('uses the physical check only when no pixel rule exists', () => {
    const phys = { ...photo, pixels: undefined };
    const r = validate(good, phys);
    expect(byId(r, 'physical')).toMatchObject({
      status: 'pass',
      expected: '3.5 x 4.5 cm at 200 DPI',
    });
    expect(r.checks.find((c) => c.id === 'pixels')).toBeUndefined();
    const blind = validate({ ...good, width: undefined, height: undefined }, phys);
    expect(byId(blind, 'physical').status).toBe('skip');
  });

  it('skips the DPI check when no tag exists and fails when it is wrong', () => {
    expect(byId(validate({ ...good, dpi: undefined }, photo), 'dpi').status).toBe('skip');
    expect(byId(validate({ ...good, dpi: 72 }, photo), 'dpi')).toMatchObject({
      status: 'fail',
      observed: '72 DPI',
    });
    expect(byId(validate({ ...good, dpi: 200.6 }, photo), 'dpi').status).toBe('pass');
  });

  it('checks colour mode', () => {
    expect(byId(validate({ ...good, greyscale: true }, photo), 'colour').status).toBe('fail');
    const grey = { ...photo, colour: 'greyscale' as const };
    expect(byId(validate({ ...good, greyscale: true }, grey), 'colour').status).toBe('pass');
    expect(byId(validate({ ...good, greyscale: undefined }, grey), 'colour').status).toBe('skip');
    const any = validate(good, { ...photo, colour: 'any' });
    expect(any.checks.find((c) => c.id === 'colour')).toBeUndefined();
  });

  it('never lets advisory checks block compliance', () => {
    const r = validate({ ...good, faceHeightFraction: 0.3, backgroundLightness: 0.2 }, photo);
    expect(r.compliant).toBe(true);
    expect(r.warnings).toBe(2);
    expect(byId(r, 'face')).toMatchObject({
      status: 'warn',
      advisory: true,
      observed: '30%',
      expected: '50% to 85%',
    });
    expect(byId(r, 'background').status).toBe('warn');
  });

  it('marks face and background as skipped when not measured', () => {
    const r = validate({ format: 'jpeg', bytes: 30 * 1024, width: 276, height: 354 }, photo);
    expect(byId(r, 'face').status).toBe('skip');
    expect(byId(r, 'background').status).toBe('skip');
    expect(r.compliant).toBe(true);
  });

  it('requires a lighter background for white than for light', () => {
    const facts = { ...good, backgroundLightness: 0.7 };
    expect(byId(validate(facts, photo), 'background').status).toBe('pass');
    const white = { ...photo, background: { kind: 'white' as const } };
    expect(byId(validate(facts, white), 'background').status).toBe('warn');
  });

  it('validates PDFs by page count', () => {
    const doc: AssetSpec = {
      id: 'doc',
      kind: 'document',
      label: 'Doc',
      formats: ['pdf'],
      size: { maxBytes: 300 * 1024 },
      pdf: { maxPages: 2 },
    };
    const ok = validate({ format: 'pdf', bytes: 1000, pages: 2 }, doc);
    expect(ok.compliant).toBe(true);
    expect(byId(ok, 'pages')).toMatchObject({ observed: '2', expected: '1 to 2' });
    expect(byId(validate({ format: 'pdf', bytes: 1000, pages: 3 }, doc), 'pages').status).toBe(
      'fail',
    );
    expect(byId(validate({ format: 'pdf', bytes: 1000 }, doc), 'pages').status).toBe('skip');
    const one = { ...doc, pdf: { minPages: 1, maxPages: 1 } };
    expect(byId(validate({ format: 'pdf', bytes: 1000, pages: 1 }, one), 'pages').expected).toBe(
      '1',
    );
    const atLeast = { ...doc, pdf: { minPages: 2 } };
    expect(
      byId(validate({ format: 'pdf', bytes: 1000, pages: 1 }, atLeast), 'pages'),
    ).toMatchObject({ status: 'fail', expected: 'at least 2' });
    const sizeOnly = validate({ format: 'pdf', bytes: 1000 }, { ...doc, pdf: { pageSize: 'A4' } });
    expect(sizeOnly.checks.find((c) => c.id === 'pages')).toBeUndefined();
  });

  it('fails pixels when dimensions are unreadable', () => {
    expect(byId(validate({ format: 'jpeg', bytes: 100 }, photo), 'pixels').status).toBe('fail');
    expect(byId(validate({ format: 'jpeg', bytes: 100 }, photo), 'aspect').status).toBe('skip');
  });
});

describe('format helpers', () => {
  it('formats bytes', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(5 * 1024 + 100)).toBe('5.1 KB');
    expect(formatBytes(50 * 1024)).toBe('50 KB');
    expect(formatBytes(2 * 1024 * 1024)).toBe('2.00 MB');
  });
  it('formats ranges and sizes', () => {
    expect(formatRange(undefined, 2048, formatBytes)).toBe('up to 2.0 KB');
    expect(formatRange(0, 2048, formatBytes)).toBe('up to 2.0 KB');
    expect(formatMm(35, 45)).toBe('3.5 x 4.5 cm');
    expect(formatMm(40, 20)).toBe('4 x 2 cm');
  });
});
