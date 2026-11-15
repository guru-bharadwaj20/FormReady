import { describe, expect, it } from 'vitest';
import { fitToByteRange, type FitCodec } from '$lib/image/kbsearch';

/** Fake encoder: size grows linearly with quality and with pixel area. */
function fake(bytesPerQuality: number, pad = true) {
  let area = 1;
  const codec: FitCodec = {
    encode: async (q) => new Uint8Array(Math.round(q * bytesPerQuality * area)),
    pad: pad ? (b, t) => new Uint8Array(t) : undefined,
    shrink: async (k) => {
      area *= k * k;
    },
  };
  return codec;
}

describe('fitToByteRange', () => {
  it('returns the top quality when it already fits the range', async () => {
    const r = await fitToByteRange(fake(100), { minBytes: 5000, maxBytes: 20000 });
    expect(r.quality).toBe(95);
    expect(r.bytes.length).toBe(9500);
    expect(r.scale).toBe(1);
  });
  it('binary-searches the highest quality under the maximum', async () => {
    const r = await fitToByteRange(fake(100), { maxBytes: 5000 });
    expect(r.bytes.length).toBeLessThanOrEqual(5000);
    expect(r.quality).toBe(50);
  });
  it('pads up to the minimum when the file is too small', async () => {
    const r = await fitToByteRange(fake(10), { minBytes: 2000, maxBytes: 3000 });
    expect(r.bytes.length).toBe(2000);
    expect(r.steps.at(-1)?.kind).toBe('pad');
  });
  it('returns the small file when padding is unavailable', async () => {
    const r = await fitToByteRange(fake(10, false), { minBytes: 2000, maxBytes: 3000 });
    expect(r.bytes.length).toBe(950);
  });
  it('downscales when the floor quality is still too large', async () => {
    const r = await fitToByteRange(fake(1000), { maxBytes: 20000, floorQuality: 40 });
    expect(r.bytes.length).toBeLessThanOrEqual(20000);
    expect(r.scale).toBeLessThan(1);
    expect(r.steps.some((s) => s.kind === 'shrink')).toBe(true);
  });
  it('gives up after the shrink budget', async () => {
    await expect(fitToByteRange(fake(1e6), { maxBytes: 100, maxShrinks: 1 })).rejects.toThrow(
      RangeError,
    );
    await expect(fitToByteRange(fake(1), { minBytes: 10, maxBytes: 5 })).rejects.toThrow(
      RangeError,
    );
  });
});
