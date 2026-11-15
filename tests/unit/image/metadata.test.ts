import { describe, expect, it } from 'vitest';
import { jsquashCodec } from '$lib/codec/jsquash';
import {
  isJpeg,
  padWithComment,
  parseSegments,
  readJfifDpi,
  readJpegSize,
  setJfifDensity,
  stripMetadata,
} from '$lib/image/jfif';
import {
  crc32,
  isPng,
  parseChunks,
  readPngDpi,
  readPngSize,
  setPngDpi,
  stripPngMetadata,
} from '$lib/image/png';
import { detectFormat, probe } from '$lib/image/probe';
import { portrait } from './helpers';

const jpegOf = (w: number, h: number, q = 80) => jsquashCodec.encodeJpeg(portrait(w, h), q);

describe('jfif', () => {
  it('parses segments and reads the frame size', async () => {
    const bytes = await jpegOf(64, 48);
    expect(isJpeg(bytes)).toBe(true);
    const markers = parseSegments(bytes).map((s) => s.marker);
    expect(markers[0]).toBe(0xe0);
    expect(markers.at(-1)).toBe(0xda);
    expect(readJpegSize(bytes)).toEqual({ width: 64, height: 48 });
  });

  it('writes and reads a DPI tag', async () => {
    const bytes = await jpegOf(32, 32);
    expect(readJfifDpi(bytes)).toBeUndefined();
    const tagged = setJfifDensity(bytes, 300);
    expect(tagged.length).toBe(bytes.length);
    expect(readJfifDpi(tagged)).toBe(300);
    // Inserts a header when stripping removed it entirely.
    const noApp0 = new Uint8Array([
      ...bytes.subarray(0, 2),
      ...bytes.subarray(parseSegments(bytes)[0]!.end),
    ]);
    const inserted = setJfifDensity(noApp0, 200);
    expect(inserted.length).toBe(noApp0.length + 18);
    expect(readJfifDpi(inserted)).toBe(200);
    expect(readJpegSize(inserted)).toEqual({ width: 32, height: 32 });
  });

  it('strips comments and APPn but keeps JFIF', async () => {
    const bytes = padWithComment(await jpegOf(32, 32), 5000);
    expect(bytes.length).toBe(5000);
    const stripped = stripMetadata(bytes);
    expect(parseSegments(stripped).some((s) => s.marker === 0xfe)).toBe(false);
    expect(parseSegments(stripped)[0]!.marker).toBe(0xe0);
    const img = await jsquashCodec.decode(stripped, 'jpeg');
    expect([img.width, img.height]).toEqual([32, 32]);
  });

  it('pads to exact sizes including multi-segment and awkward remainders', async () => {
    const bytes = await jpegOf(32, 32);
    for (const target of [
      bytes.length + 4,
      bytes.length + 5,
      bytes.length + 70000,
      bytes.length + 65540,
    ]) {
      const padded = padWithComment(bytes, target);
      expect(padded.length).toBe(target);
      const img = await jsquashCodec.decode(padded, 'jpeg');
      expect(img.width).toBe(32);
    }
    expect(padWithComment(bytes, bytes.length)).toBe(bytes);
    expect(() => padWithComment(bytes, bytes.length - 1)).toThrow(RangeError);
    expect(() => padWithComment(bytes, bytes.length + 2)).toThrow(RangeError);
  });
});

describe('png', () => {
  it('reads size, writes pHYs and strips text chunks', async () => {
    const bytes = await jsquashCodec.encodePng(portrait(20, 30));
    expect(isPng(bytes)).toBe(true);
    expect(readPngSize(bytes)).toEqual({ width: 20, height: 30 });
    expect(readPngDpi(bytes)).toBeUndefined();
    const tagged = setPngDpi(bytes, 200);
    expect(readPngDpi(tagged)).toBe(200);
    expect(parseChunks(tagged)[1]!.type).toBe('pHYs');
    // Re-tagging replaces rather than duplicates.
    expect(parseChunks(setPngDpi(tagged, 300)).filter((c) => c.type === 'pHYs')).toHaveLength(1);
    const img = await jsquashCodec.decode(stripPngMetadata(tagged), 'png');
    expect(img.width).toBe(20);
    expect(crc32(new TextEncoder().encode('IEND'))).toBe(0xae426082);
  });
});

describe('probe', () => {
  it('detects formats from magic bytes', async () => {
    expect(detectFormat(new TextEncoder().encode('%PDF-1.7'))).toBe('pdf');
    expect(detectFormat(new TextEncoder().encode('GIF89a\u0010\u0000\u0008\u0000'))).toBe('gif');
    expect(detectFormat(new TextEncoder().encode('RIFF....WEBPVP8 '))).toBe('webp');
    expect(detectFormat(new TextEncoder().encode('BM..........'))).toBe('bmp');
    expect(detectFormat(new TextEncoder().encode('....ftypheic'))).toBe('heic');
    expect(detectFormat(new Uint8Array([1, 2, 3]))).toBe('unknown');
  });
  it('fills facts for jpeg and png', async () => {
    const j = probe(setJfifDensity(await jpegOf(40, 50), 150));
    expect(j).toMatchObject({ format: 'jpeg', width: 40, height: 50, dpi: 150 });
    const p = probe(await jsquashCodec.encodePng(portrait(12, 14)));
    expect(p).toMatchObject({ format: 'png', width: 12, height: 14 });
    expect('dpi' in p).toBe(false);
    const gif = probe(new Uint8Array([71, 73, 70, 56, 57, 97, 0x10, 0, 8, 0]));
    expect(gif).toMatchObject({ width: 16, height: 8 });
  });
});
