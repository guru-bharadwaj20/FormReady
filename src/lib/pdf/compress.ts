import { PDFDocument } from 'pdf-lib';
import type { Codec } from '../codec/types.js';
import { fitToByteRange, type FitStep } from '../image/kbsearch.js';
import type { RawImage } from '../image/raw.js';
import { resample } from '../image/resize.js';
import { toGreyscale } from '../image/colour.js';
import { savePdf } from './metadata.js';

/**
 * Renders every page of a PDF to RGBA at the given pixel density. The
 * browser implementation uses pdf.js; tests inject a synthetic one.
 */
export type Rasteriser = (
  bytes: Uint8Array,
  dpi: number,
) => Promise<{ image: RawImage; widthPt: number; heightPt: number }[]>;

export interface CompressOptions {
  maxBytes: number;
  /** Render density tried first. Default 110 dpi, readable for text scans. */
  startDpi?: number;
  /** Lowest density before giving up. Default 50. */
  minDpi?: number;
  /** Convert pages to greyscale, which halves most scans. Default false. */
  greyscale?: boolean;
}

export interface CompressResult {
  bytes: Uint8Array;
  pages: number;
  dpi: number;
  quality: number;
  steps: FitStep[];
}

export class SizeUnreachableError extends Error {
  constructor(
    public readonly bestBytes: number,
    public readonly target: number,
  ) {
    super(`could not compress below ${target} bytes; best was ${bestBytes}`);
    this.name = 'SizeUnreachableError';
  }
}

/**
 * Rebuilds a PDF as one JPEG per page and searches quality, then render
 * density, until the file fits (FR-6.1, ADR-0004). Text stays legible far
 * longer than with generic stream recompression because the search only
 * lowers density when quality alone cannot get there.
 */
export async function compressPdf(
  input: Uint8Array,
  opts: CompressOptions,
  rasterise: Rasteriser,
  codec: Codec,
): Promise<CompressResult> {
  let dpi = opts.startDpi ?? 110;
  const minDpi = opts.minDpi ?? 50;
  const pages = await rasterise(input, dpi);
  if (pages.length === 0) throw new RangeError('PDF has no pages');
  if (opts.greyscale) for (const p of pages) toGreyscale(p.image);

  const build = async (quality: number): Promise<Uint8Array> => {
    const doc = await PDFDocument.create();
    for (const p of pages) {
      const jpg = await doc.embedJpg(await codec.encodeJpeg(p.image, quality));
      const page = doc.addPage([p.widthPt, p.heightPt]);
      page.drawImage(jpg, { x: 0, y: 0, width: p.widthPt, height: p.heightPt });
    }
    return savePdf(doc);
  };

  let best: Uint8Array | undefined;
  try {
    const fit = await fitToByteRange(
      {
        encode: async (q) => {
          const out = await build(q);
          if (!best || out.length < best.length) best = out;
          return out;
        },
        shrink: async (k) => {
          const next = Math.round(dpi * k);
          if (next < minDpi) throw new RangeError('below minimum density');
          dpi = next;
          for (const p of pages) {
            p.image = resample(
              p.image,
              Math.max(1, Math.round(p.image.width * k)),
              Math.max(1, Math.round(p.image.height * k)),
            );
          }
        },
      },
      { maxBytes: opts.maxBytes, floorQuality: 35, ceilQuality: 85, maxShrinks: 8 },
    );
    return { bytes: fit.bytes, pages: pages.length, dpi, quality: fit.quality, steps: fit.steps };
  } catch (e) {
    if (e instanceof RangeError)
      throw new SizeUnreachableError(best?.length ?? input.length, opts.maxBytes);
    throw e;
  }
}
