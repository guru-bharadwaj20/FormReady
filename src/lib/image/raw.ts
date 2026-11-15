/**
 * RawImage is the single pixel representation used by every pure operation
 * in this module: tightly packed 8-bit RGBA, row-major, top-left origin.
 * It is structurally compatible with ImageData so it can cross the worker
 * boundary and be handed to canvas or WASM codecs without copying.
 */
export interface RawImage {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

export function createRaw(
  width: number,
  height: number,
  fill?: [number, number, number],
): RawImage {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    throw new RangeError(`invalid image size ${width}x${height}`);
  }
  const data = new Uint8ClampedArray(width * height * 4);
  if (fill) {
    const [r, g, b] = fill;
    for (let i = 0; i < data.length; i += 4) {
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = 255;
    }
  } else {
    for (let i = 3; i < data.length; i += 4) data[i] = 255;
  }
  return { width, height, data };
}

export function cloneRaw(img: RawImage): RawImage {
  return { width: img.width, height: img.height, data: new Uint8ClampedArray(img.data) };
}

/** Wraps an ImageData-like object without copying. */
export function fromImageData(img: {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}): RawImage {
  if (img.data.length !== img.width * img.height * 4) {
    throw new RangeError('ImageData buffer length does not match its dimensions');
  }
  return { width: img.width, height: img.height, data: img.data };
}

/** Composites transparent pixels over white in place (JPEG has no alpha). */
export function flattenAlpha(
  img: RawImage,
  bg: [number, number, number] = [255, 255, 255],
): RawImage {
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const a = d[i + 3]!;
    if (a === 255) continue;
    const t = a / 255;
    d[i] = Math.round(d[i]! * t + bg[0] * (1 - t));
    d[i + 1] = Math.round(d[i + 1]! * t + bg[1] * (1 - t));
    d[i + 2] = Math.round(d[i + 2]! * t + bg[2] * (1 - t));
    d[i + 3] = 255;
  }
  return img;
}

/** Longest edge, used for the NFR-3 memory cap. */
export function longEdge(img: { width: number; height: number }): number {
  return Math.max(img.width, img.height);
}
