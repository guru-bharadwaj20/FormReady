import { lumaHistogram, otsuThreshold, luma } from './colour.js';
import { containOnCanvas, cropRect, type Rect } from './crop.js';
import { createRaw, type RawImage } from './raw.js';

export interface SignatureOptions {
  /** Extra margin around the ink as a fraction of the longer ink edge. Default 0.08. */
  marginFraction?: number;
  /** Force ink pixels to pure black. Default true. */
  binarise?: boolean;
}

/**
 * Cleans a scanned or photographed signature (FR-3.6): estimates the paper
 * tone, separates ink from paper with Otsu, whitens the paper, optionally
 * blackens the ink and crops to the ink bounding box plus a margin.
 */
export function cleanSignature(src: RawImage, opts: SignatureOptions = {}): RawImage {
  const threshold = otsuThreshold(lumaHistogram(src));
  const out = createRaw(src.width, src.height, [255, 255, 255]);
  const s = src.data;
  const d = out.data;
  for (let i = 0; i < s.length; i += 4) {
    const y = luma(s[i]!, s[i + 1]!, s[i + 2]!);
    if (y <= threshold) {
      if (opts.binarise === false) {
        d[i] = s[i]!;
        d[i + 1] = s[i + 1]!;
        d[i + 2] = s[i + 2]!;
      } else {
        // Keep anti-aliased edges soft: scale darkness relative to the threshold.
        const v = Math.round((y / Math.max(threshold, 1)) * 96);
        d[i] = v;
        d[i + 1] = v;
        d[i + 2] = v;
      }
    }
  }
  const box = inkBounds(out, 200);
  if (!box) return out;
  const margin = Math.round(Math.max(box.width, box.height) * (opts.marginFraction ?? 0.08));
  const rect: Rect = {
    x: box.x - margin,
    y: box.y - margin,
    width: box.width + margin * 2,
    height: box.height + margin * 2,
  };
  return cropRect(out, rect);
}

/** Bounding box of pixels darker than the given luma, or null when blank. */
export function inkBounds(img: RawImage, darkerThan = 200): Rect | null {
  let x0 = img.width;
  let y0 = img.height;
  let x1 = -1;
  let y1 = -1;
  const d = img.data;
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      const i = (y * img.width + x) * 4;
      if (luma(d[i]!, d[i + 1]!, d[i + 2]!) < darkerThan) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  if (x1 < 0) return null;
  return { x: x0, y: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 };
}

/** Cleans and fits a signature on a white canvas of exactly width x height. */
export function fitSignature(
  src: RawImage,
  width: number,
  height: number,
  opts?: SignatureOptions,
): RawImage {
  return containOnCanvas(cleanSignature(src, opts), width, height, [255, 255, 255]);
}
