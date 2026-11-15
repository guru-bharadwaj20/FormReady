import { jsquashCodec } from './jsquash.js';
import type { Codec } from './types.js';
import { UnsupportedFormatError } from './types.js';
import type { RawImage } from '../image/raw.js';
import type { DetectedFormat } from '../validate/facts.js';

/**
 * Browser codec: jSquash for JPEG and PNG, with the platform decoder as a
 * fallback for WebP, GIF, BMP and HEIC where the browser supports them.
 * Encoding always goes through jSquash so output is byte-identical across
 * browsers, which the exact-KB search depends on.
 */
export const browserCodec: Codec = {
  async decode(bytes: Uint8Array, format: DetectedFormat): Promise<RawImage> {
    if (format === 'jpeg' || format === 'png') return jsquashCodec.decode(bytes, format);
    if (typeof createImageBitmap !== 'function' || typeof OffscreenCanvas === 'undefined') {
      throw new UnsupportedFormatError(format);
    }
    let bitmap: ImageBitmap;
    try {
      bitmap = await createImageBitmap(new Blob([bytes as BlobPart]));
    } catch {
      throw new UnsupportedFormatError(format);
    }
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new UnsupportedFormatError(format);
    ctx.drawImage(bitmap, 0, 0);
    bitmap.close();
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    return { width: data.width, height: data.height, data: data.data };
  },
  encodeJpeg: (img, q) => jsquashCodec.encodeJpeg(img, q),
  encodePng: (img) => jsquashCodec.encodePng(img),
};
