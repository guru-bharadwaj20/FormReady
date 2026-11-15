import { createRaw, type RawImage } from './raw.js';

/**
 * Resamples to exactly width x height. Downscaling uses area averaging
 * (box filter), which is what keeps photos and scanned text free of the
 * aliasing that nearest-neighbour produces. Upscaling uses bilinear
 * interpolation. Separable passes keep it O(w*h) per axis.
 */
export function resample(src: RawImage, width: number, height: number): RawImage {
  if (width === src.width && height === src.height) return src;
  const horizontal = resampleAxis(src, width, src.height, true);
  return resampleAxis(horizontal, width, height, false);
}

function resampleAxis(src: RawImage, width: number, height: number, alongX: boolean): RawImage {
  const srcLen = alongX ? src.width : src.height;
  const dstLen = alongX ? width : height;
  if (srcLen === dstLen) return src;
  const out = createRaw(width, height);
  const lines = alongX ? src.height : src.width;
  const srcStride = alongX ? 4 : src.width * 4;
  const srcLineStride = alongX ? src.width * 4 : 4;
  const dstStride = alongX ? 4 : width * 4;
  const dstLineStride = alongX ? width * 4 : 4;
  const scale = srcLen / dstLen;
  const s = src.data;
  const d = out.data;

  if (scale > 1) {
    // Box filter: each destination sample averages the source span it covers.
    for (let line = 0; line < lines; line++) {
      const sBase = line * srcLineStride;
      const dBase = line * dstLineStride;
      for (let i = 0; i < dstLen; i++) {
        const start = i * scale;
        const end = start + scale;
        let r = 0;
        let g = 0;
        let b = 0;
        let a = 0;
        let total = 0;
        for (let j = Math.floor(start); j < Math.ceil(end) && j < srcLen; j++) {
          const w = Math.min(j + 1, end) - Math.max(j, start);
          if (w <= 0) continue;
          const p = sBase + j * srcStride;
          r += s[p]! * w;
          g += s[p + 1]! * w;
          b += s[p + 2]! * w;
          a += s[p + 3]! * w;
          total += w;
        }
        const q = dBase + i * dstStride;
        d[q] = r / total;
        d[q + 1] = g / total;
        d[q + 2] = b / total;
        d[q + 3] = a / total;
      }
    }
  } else {
    // Bilinear: sample between the two nearest source pixels (pixel centres).
    for (let line = 0; line < lines; line++) {
      const sBase = line * srcLineStride;
      const dBase = line * dstLineStride;
      for (let i = 0; i < dstLen; i++) {
        const pos = Math.min(Math.max((i + 0.5) * scale - 0.5, 0), srcLen - 1);
        const j0 = Math.floor(pos);
        const j1 = Math.min(j0 + 1, srcLen - 1);
        const t = pos - j0;
        const p0 = sBase + j0 * srcStride;
        const p1 = sBase + j1 * srcStride;
        const q = dBase + i * dstStride;
        for (let c = 0; c < 4; c++) d[q + c] = s[p0 + c]! * (1 - t) + s[p1 + c]! * t;
      }
    }
  }
  return out;
}

/** Scales so the longest edge is at most maxEdge, preserving aspect ratio. */
export function limitLongEdge(src: RawImage, maxEdge: number): RawImage {
  const edge = Math.max(src.width, src.height);
  if (edge <= maxEdge) return src;
  const k = maxEdge / edge;
  return resample(
    src,
    Math.max(1, Math.round(src.width * k)),
    Math.max(1, Math.round(src.height * k)),
  );
}
