import { describe, expect, it } from 'vitest';
import { jsquashCodec } from '$lib/codec/jsquash';
import { UnsupportedFormatError } from '$lib/codec/types';
import { fixImage, inspectImage } from '$lib/image/pipeline';
import { readJfifDpi } from '$lib/image/jfif';
import { getAsset, getSpec } from '$lib/specs/registry';
import { validate } from '$lib/validate/validate';
import type { AssetSpec } from '$lib/specs/types';
import { noisy, portrait, signatureScan } from './helpers';

const ssc = getSpec('ssc/cgl-2026')!;
const photo = getAsset(ssc, 'photo')!;
const signature = getAsset(ssc, 'signature')!;

describe('fixImage', () => {
  it('turns a large camera photo into a compliant SSC photo', async () => {
    const input = await jsquashCodec.encodeJpeg(noisy(1600, 1200), 92);
    const r = await fixImage(input, photo, jsquashCodec);
    expect(r.format).toBe('jpeg');
    const report = validate(r.facts, photo);
    expect(report.checks.filter((c) => c.status === 'fail')).toEqual([]);
    expect(report.compliant).toBe(true);
    expect(r.facts.bytes).toBeLessThanOrEqual(photo.size.maxBytes);
    if (photo.size.minBytes) expect(r.facts.bytes).toBeGreaterThanOrEqual(photo.size.minBytes);
    if (photo.dpi) expect(readJfifDpi(r.bytes)).toBe(photo.dpi);
    expect(r.steps.map((s) => s.kind)).toContain('fit');
  }, 30000);

  it('pads a tiny flat image up to the minimum size', async () => {
    const input = await jsquashCodec.encodePng(portrait(300, 400));
    const r = await fixImage(input, photo, jsquashCodec);
    expect(r.facts.bytes).toBeGreaterThanOrEqual(photo.size.minBytes ?? 0);
    expect(r.facts.bytes).toBeLessThanOrEqual(photo.size.maxBytes);
    const fit = r.steps.find((s) => s.kind === 'fit');
    expect(fit && fit.kind === 'fit' && fit.steps.some((s) => s.kind === 'pad')).toBe(true);
  }, 30000);

  it('cleans and fits a signature', async () => {
    const input = await jsquashCodec.encodeJpeg(signatureScan(900, 300), 85);
    const r = await fixImage(input, signature, jsquashCodec);
    expect(validate(r.facts, signature).compliant).toBe(true);
    expect(r.steps.map((s) => s.kind)).toContain('signature');
  }, 30000);

  it('honours greyscale and png output', async () => {
    const asset: AssetSpec = {
      id: 'thumb',
      kind: 'thumb',
      label: 'Thumb',
      formats: ['png', 'jpeg'],
      size: { maxBytes: 200 * 1024 },
      pixels: { width: 120, height: 80 },
      colour: 'greyscale',
      dpi: 96,
    };
    const input = await jsquashCodec.encodeJpeg(portrait(600, 400), 80);
    const r = await fixImage(input, asset, jsquashCodec);
    expect(r.format).toBe('png');
    expect(r.facts).toMatchObject({
      format: 'png',
      width: 120,
      height: 80,
      greyscale: true,
      dpi: 96,
    });
    expect(validate(r.facts, asset).compliant).toBe(true);
  }, 30000);

  it('fails clearly when pixel and size rules cannot both hold', async () => {
    const asset: AssetSpec = {
      id: 'x',
      kind: 'photo',
      label: 'x',
      formats: ['jpeg'],
      size: { maxBytes: 1500 },
      pixels: { width: 800, height: 600 },
    };
    const input = await jsquashCodec.encodeJpeg(noisy(800, 600), 80);
    await expect(fixImage(input, asset, jsquashCodec)).rejects.toThrow(RangeError);
  }, 30000);

  it('downscales free-size images to meet a byte cap', async () => {
    const asset: AssetSpec = {
      id: 'doc',
      kind: 'document',
      label: 'doc',
      formats: ['jpeg'],
      size: { maxBytes: 40 * 1024 },
    };
    const input = await jsquashCodec.encodeJpeg(noisy(1200, 900), 90);
    const r = await fixImage(input, asset, jsquashCodec);
    expect(r.facts.bytes).toBeLessThanOrEqual(asset.size.maxBytes);
    expect(r.facts.width!).toBeLessThan(1200);
  }, 30000);
});

describe('inspectImage', () => {
  it('reports container and pixel facts', async () => {
    const input = await jsquashCodec.encodeJpeg(portrait(276, 354), 80);
    const { facts } = await inspectImage(input, jsquashCodec, photo);
    expect(facts).toMatchObject({ format: 'jpeg', width: 276, height: 354, greyscale: false });
    expect(facts.backgroundPlainness).toBeGreaterThan(0.9);
  });
  it('rejects unknown formats', async () => {
    await expect(inspectImage(new Uint8Array([1, 2, 3, 4]), jsquashCodec)).rejects.toBeInstanceOf(
      UnsupportedFormatError,
    );
  });
});
