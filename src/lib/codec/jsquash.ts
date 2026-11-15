import type { Codec } from './types.js';
import { UnsupportedFormatError } from './types.js';
import type { RawImage } from '../image/raw.js';
import type { DetectedFormat } from '../validate/facts.js';

type WasmLoader = (name: 'jpeg-enc' | 'jpeg-dec' | 'png') => Promise<WebAssembly.Module>;

let loader: WasmLoader | undefined;

/**
 * Supplies precompiled WASM modules. The browser never calls this: jSquash
 * fetches its own binaries through the bundler. Node tests use it because
 * there is no fetch for file URLs.
 */
export function configureWasm(load: WasmLoader | undefined): void {
  loader = load;
  ready = undefined;
}

interface Mods {
  jpeg: typeof import('@jsquash/jpeg');
  png: typeof import('@jsquash/png');
}

let ready: Promise<Mods> | undefined;

async function mods(): Promise<Mods> {
  ready ??= (async () => {
    const [jpeg, png] = await Promise.all([import('@jsquash/jpeg'), import('@jsquash/png')]);
    if (loader) {
      const [enc, dec, pngMod] = await Promise.all([
        loader('jpeg-enc'),
        loader('jpeg-dec'),
        loader('png'),
      ]);
      const encMod = await import('@jsquash/jpeg/encode.js');
      const decMod = await import('@jsquash/jpeg/decode.js');
      const pngEnc = await import('@jsquash/png/encode.js');
      const pngDec = await import('@jsquash/png/decode.js');
      await encMod.init(enc);
      await decMod.init(dec);
      await pngEnc.init(pngMod);
      await pngDec.init(pngMod);
    }
    return { jpeg, png };
  })();
  return ready;
}

const toImageData = (img: RawImage): ImageData =>
  ({ width: img.width, height: img.height, data: img.data, colorSpace: 'srgb' }) as ImageData;

const fromImageData = (d: ImageData): RawImage => ({
  width: d.width,
  height: d.height,
  data: new Uint8ClampedArray(d.data.buffer, d.data.byteOffset, d.data.length),
});

const view = (b: Uint8Array): ArrayBuffer =>
  b.byteOffset === 0 && b.byteLength === b.buffer.byteLength
    ? (b.buffer as ArrayBuffer)
    : (b.slice().buffer as ArrayBuffer);

/** Codec backed by the mozjpeg and squoosh-png WASM builds from jSquash. */
export const jsquashCodec: Codec = {
  async decode(bytes: Uint8Array, format: DetectedFormat): Promise<RawImage> {
    const m = await mods();
    if (format === 'jpeg') return fromImageData(await m.jpeg.decode(view(bytes)));
    if (format === 'png') return fromImageData(await m.png.decode(view(bytes)));
    throw new UnsupportedFormatError(format);
  },
  async encodeJpeg(img: RawImage, quality: number): Promise<Uint8Array> {
    const m = await mods();
    const q = Math.max(1, Math.min(100, Math.round(quality)));
    const out = await m.jpeg.encode(toImageData(img), {
      quality: q,
      baseline: true,
      progressive: false,
      optimize_coding: true,
      // 4:4:4 above 90 keeps red stamps and ink edges crisp.
      chroma_subsample: q > 90 ? 1 : 2,
    });
    return new Uint8Array(out);
  },
  async encodePng(img: RawImage): Promise<Uint8Array> {
    const m = await mods();
    return new Uint8Array(await m.png.encode(toImageData(img)));
  },
};
