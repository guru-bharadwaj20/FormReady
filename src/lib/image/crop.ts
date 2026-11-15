import { createRaw, type RawImage } from './raw.js';
import { resample } from './resize.js';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Copies a rectangle out of the source. Clamped to the source bounds. */
export function cropRect(src: RawImage, rect: Rect): RawImage {
  const x0 = Math.max(0, Math.floor(rect.x));
  const y0 = Math.max(0, Math.floor(rect.y));
  const x1 = Math.min(src.width, Math.ceil(rect.x + rect.width));
  const y1 = Math.min(src.height, Math.ceil(rect.y + rect.height));
  const w = x1 - x0;
  const h = y1 - y0;
  if (w <= 0 || h <= 0) throw new RangeError('crop rectangle is outside the image');
  const out = createRaw(w, h);
  for (let y = 0; y < h; y++) {
    const s = ((y0 + y) * src.width + x0) * 4;
    out.data.set(src.data.subarray(s, s + w * 4), y * w * 4);
  }
  return out;
}

/**
 * Largest rectangle with the given aspect ratio that fits the source,
 * positioned around a focus point (defaults to centre). Focus is a fraction
 * 0..1 of width/height, letting the face detector bias the crop upward.
 */
export function coverRect(
  src: { width: number; height: number },
  aspect: number,
  focus: { x: number; y: number } = { x: 0.5, y: 0.5 },
): Rect {
  const srcAspect = src.width / src.height;
  let width = src.width;
  let height = src.height;
  if (srcAspect > aspect) width = Math.round(src.height * aspect);
  else height = Math.round(src.width / aspect);
  const x = clamp(Math.round(focus.x * src.width - width / 2), 0, src.width - width);
  const y = clamp(Math.round(focus.y * src.height - height / 2), 0, src.height - height);
  return { x, y, width, height };
}

/** Centre-crops to the target aspect and resamples to exactly width x height (FR-3.2). */
export function coverResize(
  src: RawImage,
  width: number,
  height: number,
  focus?: { x: number; y: number },
): RawImage {
  const rect = coverRect(src, width / height, focus);
  const cropped =
    rect.width === src.width && rect.height === src.height ? src : cropRect(src, rect);
  return resample(cropped, width, height);
}

/**
 * Scales to fit inside width x height without cropping and pads the rest with
 * a background colour. Used for signatures, where cutting ink is worse than a
 * white margin.
 */
export function containOnCanvas(
  src: RawImage,
  width: number,
  height: number,
  bg: [number, number, number] = [255, 255, 255],
): RawImage {
  const k = Math.min(width / src.width, height / src.height);
  const w = Math.max(1, Math.round(src.width * k));
  const h = Math.max(1, Math.round(src.height * k));
  const scaled = resample(src, w, h);
  const out = createRaw(width, height, bg);
  const ox = Math.floor((width - w) / 2);
  const oy = Math.floor((height - h) / 2);
  for (let y = 0; y < h; y++) {
    out.data.set(scaled.data.subarray(y * w * 4, (y + 1) * w * 4), ((oy + y) * width + ox) * 4);
  }
  return out;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);
