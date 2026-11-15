/**
 * Exact-byte-range search (ADR-0004). Generic over the encoder so the same
 * routine serves JPEG photos, PNG signatures and PDF page images.
 */

export interface FitOptions {
  minBytes?: number;
  maxBytes: number;
  /** Lowest quality the search may fall to before downscaling. Default 40. */
  floorQuality?: number;
  /** Highest quality tried. Default 95. */
  ceilQuality?: number;
  /** Fraction of the long edge to keep per downscale step. Default 0.85. */
  shrinkStep?: number;
  /** Maximum downscale rounds. Default 6. */
  maxShrinks?: number;
}

export interface FitStep {
  kind: 'encode' | 'pad' | 'shrink';
  quality?: number;
  bytes?: number;
  scale?: number;
}

export interface FitResult {
  bytes: Uint8Array;
  quality: number;
  /** Cumulative scale applied to the source, 1 when none. */
  scale: number;
  steps: FitStep[];
}

export interface FitCodec {
  /** Encodes the current image at the given quality (1..100). */
  encode(quality: number): Promise<Uint8Array>;
  /** Grows the file to exactly target bytes without changing pixels, or returns undefined. */
  pad?(bytes: Uint8Array, target: number): Uint8Array | undefined;
  /** Replaces the current image with a smaller one; later encodes use it. */
  shrink(scale: number): Promise<void>;
}

/**
 * Binary-searches quality for the largest file that fits under maxBytes.
 * Falls back to padding when even top quality is under the minimum, and to
 * downscaling when the floor quality still overshoots the maximum.
 */
export async function fitToByteRange(codec: FitCodec, opts: FitOptions): Promise<FitResult> {
  const min = opts.minBytes ?? 0;
  const max = opts.maxBytes;
  const floor = opts.floorQuality ?? 40;
  const ceil = opts.ceilQuality ?? 95;
  const shrinkStep = opts.shrinkStep ?? 0.85;
  const maxShrinks = opts.maxShrinks ?? 6;
  if (min > max) throw new RangeError('minBytes exceeds maxBytes');
  const steps: FitStep[] = [];
  let scale = 1;

  for (let round = 0; ; round++) {
    const top = await codec.encode(ceil);
    steps.push({ kind: 'encode', quality: ceil, bytes: top.length });
    if (top.length <= max) {
      if (top.length >= min) return { bytes: top, quality: ceil, scale, steps };
      const padded = codec.pad?.(top, min);
      if (padded) {
        steps.push({ kind: 'pad', bytes: padded.length });
        return { bytes: padded, quality: ceil, scale, steps };
      }
      return { bytes: top, quality: ceil, scale, steps };
    }

    let lo = floor;
    let hi = ceil - 1;
    let best: { bytes: Uint8Array; quality: number } | undefined;
    while (lo <= hi) {
      const q = (lo + hi) >> 1;
      const out = await codec.encode(q);
      steps.push({ kind: 'encode', quality: q, bytes: out.length });
      if (out.length <= max) {
        best = { bytes: out, quality: q };
        lo = q + 1;
      } else hi = q - 1;
    }
    if (best) {
      if (best.bytes.length >= min) return { ...best, scale, steps };
      const padded = codec.pad?.(best.bytes, min);
      if (padded) {
        steps.push({ kind: 'pad', bytes: padded.length });
        return { bytes: padded, quality: best.quality, scale, steps };
      }
      return { ...best, scale, steps };
    }
    if (round >= maxShrinks) {
      throw new RangeError(`cannot fit image under ${max} bytes`);
    }
    scale *= shrinkStep;
    await codec.shrink(shrinkStep);
    steps.push({ kind: 'shrink', scale });
  }
}
