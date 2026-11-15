import type { RawImage } from './raw.js';

/** Rec. 601 luma, the same weights JPEG uses for Y. */
export function luma(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

/** Converts to greyscale in place (FR-3.5). */
export function toGreyscale(img: RawImage): RawImage {
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const y = Math.round(luma(d[i]!, d[i + 1]!, d[i + 2]!));
    d[i] = y;
    d[i + 1] = y;
    d[i + 2] = y;
  }
  return img;
}

/**
 * True when the image is effectively greyscale. A small per-channel
 * tolerance absorbs JPEG chroma noise around neutral colours.
 */
export function isGreyscale(img: RawImage, tolerance = 6): boolean {
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i]!;
    const g = d[i + 1]!;
    const b = d[i + 2]!;
    if (Math.abs(r - g) > tolerance || Math.abs(g - b) > tolerance || Math.abs(r - b) > tolerance) {
      return false;
    }
  }
  return true;
}

/** 256-bin histogram of luma values. */
export function lumaHistogram(img: RawImage): Uint32Array {
  const hist = new Uint32Array(256);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    hist[Math.round(luma(d[i]!, d[i + 1]!, d[i + 2]!))]!++;
  }
  return hist;
}

/** Otsu's method: threshold that minimises intra-class variance. */
export function otsuThreshold(hist: Uint32Array): number {
  let total = 0;
  let sum = 0;
  for (let i = 0; i < 256; i++) {
    total += hist[i]!;
    sum += i * hist[i]!;
  }
  let sumB = 0;
  let wB = 0;
  let best = 0;
  let bestEnd = 0;
  let bestVar = -1;
  for (let t = 0; t < 256; t++) {
    wB += hist[t]!;
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;
    sumB += t * hist[t]!;
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) * (mB - mF);
    if (between > bestVar) {
      bestVar = between;
      best = t;
      bestEnd = t;
    } else if (between === bestVar) {
      bestEnd = t;
    }
  }
  // A plateau (clean bimodal input) is split in the middle, away from both modes.
  return (best + bestEnd) >> 1;
}
