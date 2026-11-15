import { luma } from './colour.js';
import type { RawImage } from './raw.js';

export interface BackgroundStats {
  /** 0..1; 1 means the border is a single flat tone. */
  plainness: number;
  /** Mean luma of the border, 0..1. */
  lightness: number;
}

/**
 * Advisory background estimate (FR-5.3). Samples a frame around the image
 * edge (where a passport photo should show only backdrop) and reports how
 * uniform and how light it is. The validator turns these into a warning,
 * never a failure, because the sample can include hair or shoulders.
 */
export function measureBackground(img: RawImage, borderFraction = 0.08): BackgroundStats {
  const bw = Math.max(1, Math.round(img.width * borderFraction));
  const bh = Math.max(1, Math.round(img.height * borderFraction));
  // Shoulders occupy the bottom edge, so sample top and sides only.
  const topLimit = Math.round(img.height * 0.6);
  const values: number[] = [];
  const d = img.data;
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      const inTop = y < bh;
      const inSide = (x < bw || x >= img.width - bw) && y < topLimit;
      if (!inTop && !inSide) continue;
      const i = (y * img.width + x) * 4;
      values.push(luma(d[i]!, d[i + 1]!, d[i + 2]!));
    }
  }
  if (values.length === 0) return { plainness: 0, lightness: 0 };
  let sum = 0;
  for (const v of values) sum += v;
  const mean = sum / values.length;
  let variance = 0;
  for (const v of values) variance += (v - mean) * (v - mean);
  const sd = Math.sqrt(variance / values.length);
  // A standard deviation of 64 luma levels or more counts as fully busy.
  const plainness = Math.max(0, Math.min(1, 1 - sd / 64));
  return { plainness: round3(plainness), lightness: round3(mean / 255) };
}

const round3 = (n: number) => Math.round(n * 1000) / 1000;
