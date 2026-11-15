import { createRaw, type RawImage } from '$lib/image/raw';

/** Solid colour image. */
export const solid = (w: number, h: number, rgb: [number, number, number]) => createRaw(w, h, rgb);

/** Light backdrop with a dark rectangle in the middle: a stand-in portrait. */
export function portrait(w: number, h: number, bg: [number, number, number] = [235, 235, 240]) {
  const img = createRaw(w, h, bg);
  const x = Math.round(w * 0.3);
  const y = Math.round(h * 0.25);
  paintRect(img, x, y, Math.round(w * 0.4), Math.round(h * 0.6), [120, 80, 60]);
  return img;
}

/** Beige paper with a dark wavy stroke, like a photographed signature. */
export function signatureScan(w = 300, h = 120): RawImage {
  const img = createRaw(w, h, [225, 215, 190]);
  for (let x = 40; x < w - 40; x++) {
    const y = Math.round(h / 2 + Math.sin(x / 15) * h * 0.2);
    for (let t = -2; t <= 2; t++) setPixel(img, x, y + t, [30, 30, 60]);
  }
  return img;
}

/** Coloured noise so the JPEG encoder cannot compress it away. */
export function noisy(w: number, h: number, seed = 7): RawImage {
  const img = createRaw(w, h);
  let s = seed;
  const rnd = () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  for (let i = 0; i < img.data.length; i += 4) {
    img.data[i] = rnd() * 255;
    img.data[i + 1] = rnd() * 255;
    img.data[i + 2] = rnd() * 255;
  }
  return img;
}

export function paintRect(
  img: RawImage,
  x0: number,
  y0: number,
  w: number,
  h: number,
  rgb: [number, number, number],
) {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) setPixel(img, x, y, rgb);
}

export function setPixel(img: RawImage, x: number, y: number, rgb: [number, number, number]) {
  if (x < 0 || y < 0 || x >= img.width || y >= img.height) return;
  const i = (y * img.width + x) * 4;
  img.data[i] = rgb[0];
  img.data[i + 1] = rgb[1];
  img.data[i + 2] = rgb[2];
  img.data[i + 3] = 255;
}

export function pixel(img: RawImage, x: number, y: number): [number, number, number, number] {
  const i = (y * img.width + x) * 4;
  return [img.data[i]!, img.data[i + 1]!, img.data[i + 2]!, img.data[i + 3]!];
}
