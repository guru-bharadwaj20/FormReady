import type { Codec } from '../codec/types.js';
import type { AssetSpec, ImageFormat } from '../specs/types.js';
import { targetPixels } from '../specs/registry.js';
import type { FileFacts } from '../validate/facts.js';
import { measureBackground } from './background.js';
import { isGreyscale, toGreyscale } from './colour.js';
import { coverResize } from './crop.js';
import { padWithComment, setJfifDensity, stripMetadata } from './jfif.js';
import { fitToByteRange, type FitStep } from './kbsearch.js';
import { setPngDpi } from './png.js';
import { probe } from './probe.js';
import { flattenAlpha, type RawImage } from './raw.js';
import { limitLongEdge, resample } from './resize.js';
import { fitSignature } from './signature.js';

export interface FixOptions {
  /** Output container; defaults to the first format the asset accepts. */
  format?: Exclude<ImageFormat, 'pdf'>;
  /** Crop focus 0..1 (from the face detector); centre when omitted. */
  focus?: { x: number; y: number };
  /** Treat the input as a signature regardless of asset kind. */
  signature?: boolean;
  /** Hard cap on decoded long edge (NFR-3 memory). Default 4000. */
  maxDecodedEdge?: number;
}

export type PipelineStep =
  | { kind: 'decode'; width: number; height: number }
  | { kind: 'downscale'; width: number; height: number }
  | { kind: 'signature' }
  | { kind: 'resize'; width: number; height: number }
  | { kind: 'greyscale' }
  | { kind: 'fit'; steps: FitStep[]; quality: number; scale: number }
  | { kind: 'dpi'; dpi: number }
  | { kind: 'encode-png'; bytes: number };

export interface FixResult {
  bytes: Uint8Array;
  facts: FileFacts;
  steps: PipelineStep[];
  format: Exclude<ImageFormat, 'pdf'>;
}

/** Measures a decoded image: facts the container alone cannot provide. */
export function measurePixels(img: RawImage, asset?: AssetSpec): Partial<FileFacts> {
  const facts: Partial<FileFacts> = { greyscale: isGreyscale(img) };
  if (asset?.kind === 'photo') {
    const bg = measureBackground(img);
    facts.backgroundPlainness = bg.plainness;
    facts.backgroundLightness = bg.lightness;
  }
  return facts;
}

/** Decodes and gathers every measurable fact about an input (FR-2). */
export async function inspectImage(
  bytes: Uint8Array,
  codec: Codec,
  asset?: AssetSpec,
): Promise<{ facts: FileFacts; image: RawImage }> {
  const facts = probe(bytes);
  const image = await codec.decode(bytes, facts.format);
  facts.width = image.width;
  facts.height = image.height;
  Object.assign(facts, measurePixels(image, asset));
  return { facts, image };
}

/**
 * Turns any supported image into a file that satisfies the asset rules:
 * exact pixels, colour mode, DPI tag and byte range (FR-3).
 */
export async function fixImage(
  input: Uint8Array,
  asset: AssetSpec,
  codec: Codec,
  opts: FixOptions = {},
): Promise<FixResult> {
  const steps: PipelineStep[] = [];
  const format = opts.format ?? (asset.formats.find((f) => f !== 'pdf') as 'jpeg' | 'png');
  if (!format) throw new TypeError(`asset ${asset.id} accepts no image format`);

  const facts = probe(input);
  let img = await codec.decode(input, facts.format);
  steps.push({ kind: 'decode', width: img.width, height: img.height });
  flattenAlpha(img);

  const cap = opts.maxDecodedEdge ?? 4000;
  if (Math.max(img.width, img.height) > cap) {
    img = limitLongEdge(img, cap);
    steps.push({ kind: 'downscale', width: img.width, height: img.height });
  }

  const target = targetPixels(asset);
  const isSignature = opts.signature ?? asset.kind === 'signature';
  if (isSignature) {
    img = target
      ? fitSignature(img, target.width, target.height)
      : fitSignature(img, img.width, img.height);
    steps.push({ kind: 'signature' });
  } else if (target) {
    img = coverResize(img, target.width, target.height, opts.focus);
    steps.push({ kind: 'resize', width: img.width, height: img.height });
  }

  if (asset.colour === 'greyscale') {
    toGreyscale(img);
    steps.push({ kind: 'greyscale' });
  }

  const dpi = asset.dpi ?? asset.physical?.dpi;
  let out: Uint8Array;

  if (format === 'jpeg') {
    let current = img;
    const finish = (b: Uint8Array) => {
      let f = stripMetadata(b);
      if (dpi) f = setJfifDensity(f, dpi);
      return f;
    };
    const fit = await fitToByteRange(
      {
        encode: async (q) => finish(await codec.encodeJpeg(current, q)),
        pad: (b, t) => {
          try {
            return padWithComment(b, t);
          } catch {
            return undefined;
          }
        },
        shrink: async (k) => {
          // Pixel rules forbid shrinking; the search will throw if it must.
          if (target) throw new RangeError('cannot meet both the pixel and size rules');
          current = resample(
            current,
            Math.max(1, Math.round(current.width * k)),
            Math.max(1, Math.round(current.height * k)),
          );
        },
      },
      { minBytes: asset.size.minBytes, maxBytes: asset.size.maxBytes },
    );
    steps.push({ kind: 'fit', steps: fit.steps, quality: fit.quality, scale: fit.scale });
    if (dpi) steps.push({ kind: 'dpi', dpi });
    out = fit.bytes;
    img = current;
  } else {
    out = await codec.encodePng(img);
    if (dpi) {
      out = setPngDpi(out, dpi);
      steps.push({ kind: 'dpi', dpi });
    }
    steps.push({ kind: 'encode-png', bytes: out.length });
    if (out.length > asset.size.maxBytes) {
      throw new RangeError('PNG output exceeds the size limit; choose JPEG if the portal allows');
    }
  }

  const outFacts = probe(out);
  Object.assign(outFacts, measurePixels(img, asset));
  return { bytes: out, facts: outFacts, steps, format };
}
