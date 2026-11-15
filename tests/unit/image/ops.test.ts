import { describe, expect, it } from 'vitest';
import { createRaw, flattenAlpha, fromImageData, longEdge } from '$lib/image/raw';
import { limitLongEdge, resample } from '$lib/image/resize';
import { containOnCanvas, coverRect, coverResize, cropRect } from '$lib/image/crop';
import { isGreyscale, lumaHistogram, otsuThreshold, toGreyscale } from '$lib/image/colour';
import { cleanSignature, fitSignature, inkBounds } from '$lib/image/signature';
import { measureBackground } from '$lib/image/background';
import { noisy, paintRect, pixel, portrait, signatureScan, solid } from './helpers';

describe('raw', () => {
  it('creates opaque images and rejects bad sizes', () => {
    const img = createRaw(2, 2, [1, 2, 3]);
    expect(pixel(img, 1, 1)).toEqual([1, 2, 3, 255]);
    expect(() => createRaw(0, 2)).toThrow(RangeError);
    expect(() => createRaw(1.5, 2)).toThrow(RangeError);
    expect(longEdge(img)).toBe(2);
  });
  it('flattens alpha over white', () => {
    const img = createRaw(1, 1, [0, 0, 0]);
    img.data[3] = 0;
    flattenAlpha(img);
    expect(pixel(img, 0, 0)).toEqual([255, 255, 255, 255]);
    expect(() => fromImageData({ width: 2, height: 2, data: new Uint8ClampedArray(4) })).toThrow();
  });
});

describe('resample', () => {
  it('returns the same object when size is unchanged', () => {
    const img = solid(4, 4, [9, 9, 9]);
    expect(resample(img, 4, 4)).toBe(img);
  });
  it('averages when downscaling', () => {
    const img = createRaw(4, 1);
    paintRect(img, 0, 0, 2, 1, [0, 0, 0]);
    paintRect(img, 2, 0, 2, 1, [200, 200, 200]);
    expect(pixel(resample(img, 1, 1), 0, 0)[0]).toBe(100);
  });
  it('interpolates when upscaling and keeps edges', () => {
    const img = createRaw(2, 1);
    paintRect(img, 0, 0, 1, 1, [0, 0, 0]);
    paintRect(img, 1, 0, 1, 1, [100, 100, 100]);
    const out = resample(img, 4, 1);
    expect(pixel(out, 0, 0)[0]).toBe(0);
    expect(pixel(out, 3, 0)[0]).toBe(100);
    expect(pixel(out, 1, 0)[0]).toBeGreaterThan(0);
    expect(pixel(out, 1, 0)[0]).toBeLessThan(pixel(out, 2, 0)[0]);
  });
  it('limits the long edge preserving aspect', () => {
    const out = limitLongEdge(solid(4000, 2000, [1, 1, 1]), 1000);
    expect([out.width, out.height]).toEqual([1000, 500]);
    expect(limitLongEdge(out, 2000)).toBe(out);
  });
});

describe('crop', () => {
  it('computes cover rectangles around a focus point', () => {
    expect(coverRect({ width: 400, height: 200 }, 1)).toEqual({
      x: 100,
      y: 0,
      width: 200,
      height: 200,
    });
    expect(coverRect({ width: 200, height: 400 }, 1, { x: 0.5, y: 0 })).toEqual({
      x: 0,
      y: 0,
      width: 200,
      height: 200,
    });
  });
  it('crops exact pixels and clamps to bounds', () => {
    const img = solid(10, 10, [0, 0, 0]);
    paintRect(img, 5, 5, 5, 5, [255, 0, 0]);
    const out = cropRect(img, { x: 5, y: 5, width: 50, height: 50 });
    expect([out.width, out.height]).toEqual([5, 5]);
    expect(pixel(out, 0, 0)).toEqual([255, 0, 0, 255]);
    expect(() => cropRect(img, { x: 20, y: 20, width: 5, height: 5 })).toThrow(RangeError);
  });
  it('coverResize yields the exact target size', () => {
    const out = coverResize(portrait(1200, 1600), 276, 354);
    expect([out.width, out.height]).toEqual([276, 354]);
  });
  it('containOnCanvas pads with the background', () => {
    const out = containOnCanvas(solid(100, 50, [0, 0, 0]), 100, 100, [255, 255, 255]);
    expect(pixel(out, 50, 0)).toEqual([255, 255, 255, 255]);
    expect(pixel(out, 50, 50)).toEqual([0, 0, 0, 255]);
  });
});

describe('colour', () => {
  it('detects and converts greyscale', () => {
    const img = portrait(40, 50);
    expect(isGreyscale(img)).toBe(false);
    toGreyscale(img);
    expect(isGreyscale(img)).toBe(true);
    expect(isGreyscale(solid(2, 2, [100, 104, 98]))).toBe(true);
  });
  it('finds an Otsu threshold between two modes', () => {
    const t = otsuThreshold(lumaHistogram(signatureScan()));
    expect(t).toBeGreaterThan(60);
    expect(t).toBeLessThan(200);
  });
});

describe('signature', () => {
  it('whitens paper, keeps ink and trims to the stroke', () => {
    const out = cleanSignature(signatureScan(300, 120));
    expect(out.width).toBeLessThan(300);
    expect(out.height).toBeLessThan(120);
    expect(pixel(out, 0, 0)).toEqual([255, 255, 255, 255]);
    const box = inkBounds(out, 128);
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(200);
  });
  it('returns a blank page untouched when there is no ink', () => {
    expect(inkBounds(solid(10, 10, [250, 250, 250]))).toBeNull();
    const out = cleanSignature(solid(10, 10, [250, 250, 250]));
    expect([out.width, out.height]).toEqual([10, 10]);
  });
  it('fits onto the exact canvas', () => {
    const out = fitSignature(signatureScan(), 140, 60);
    expect([out.width, out.height]).toEqual([140, 60]);
  });
});

describe('background', () => {
  it('rates a plain light backdrop high and noise low', () => {
    const plain = measureBackground(portrait(200, 260));
    expect(plain.plainness).toBeGreaterThan(0.9);
    expect(plain.lightness).toBeGreaterThan(0.85);
    expect(measureBackground(noisy(200, 260)).plainness).toBeLessThan(0.3);
    expect(measureBackground(portrait(200, 260, [40, 40, 40])).lightness).toBeLessThan(0.3);
  });
});
