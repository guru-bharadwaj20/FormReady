import type { RawImage } from '../image/raw.js';
import type { DetectedFormat } from '../validate/facts.js';

/**
 * Codec boundary. Pure image operations never import a codec; the pipeline
 * receives one so Node tests and the browser worker can supply different
 * loaders for the same WASM.
 */
export interface Codec {
  /** Decodes any supported container to RGBA. Throws for unsupported input. */
  decode(bytes: Uint8Array, format: DetectedFormat): Promise<RawImage>;
  /** Baseline JPEG, 4:2:0 at low quality, 4:4:4 at high. quality 1..100. */
  encodeJpeg(img: RawImage, quality: number): Promise<Uint8Array>;
  /** Lossless PNG. */
  encodePng(img: RawImage): Promise<Uint8Array>;
}

export class UnsupportedFormatError extends Error {
  constructor(public readonly format: DetectedFormat) {
    super(`unsupported input format: ${format}`);
    this.name = 'UnsupportedFormatError';
  }
}
