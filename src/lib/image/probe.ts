import type { DetectedFormat, FileFacts } from '../validate/facts.js';
import { isJpeg, readJfifDpi, readJpegSize } from './jfif.js';
import { isPng, readPngDpi, readPngSize } from './png.js';

/** Detects the container format from magic bytes, never from the file name. */
export function detectFormat(bytes: Uint8Array): DetectedFormat {
  if (isJpeg(bytes)) return 'jpeg';
  if (isPng(bytes)) return 'png';
  if (bytes.length >= 5 && ascii(bytes, 0, 5) === '%PDF-') return 'pdf';
  if (bytes.length >= 12 && ascii(bytes, 0, 4) === 'RIFF' && ascii(bytes, 8, 12) === 'WEBP')
    return 'webp';
  if (bytes.length >= 6 && (ascii(bytes, 0, 6) === 'GIF87a' || ascii(bytes, 0, 6) === 'GIF89a'))
    return 'gif';
  if (bytes.length >= 2 && ascii(bytes, 0, 2) === 'BM') return 'bmp';
  if (bytes.length >= 12 && ascii(bytes, 4, 8) === 'ftyp') {
    const brand = ascii(bytes, 8, 12);
    if (/^(heic|heix|hevc|hevx|mif1|msf1|heim|heis|avif)$/.test(brand)) return 'heic';
  }
  return 'unknown';
}

/**
 * Reads what can be known from the container alone: format, byte length,
 * dimensions and DPI tag. Pixel-derived facts are added by the pipeline.
 */
export function probe(bytes: Uint8Array): FileFacts {
  const format = detectFormat(bytes);
  const facts: FileFacts = { format, bytes: bytes.length };
  try {
    if (format === 'jpeg') {
      Object.assign(facts, readJpegSize(bytes));
      facts.dpi = readJfifDpi(bytes);
    } else if (format === 'png') {
      Object.assign(facts, readPngSize(bytes));
      facts.dpi = readPngDpi(bytes);
    } else if (format === 'gif') {
      facts.width = bytes[6]! | (bytes[7]! << 8);
      facts.height = bytes[8]! | (bytes[9]! << 8);
    } else if (format === 'bmp' && bytes.length >= 26) {
      const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      facts.width = v.getInt32(18, true);
      facts.height = Math.abs(v.getInt32(22, true));
    } else if (format === 'webp') {
      Object.assign(facts, readWebpSize(bytes));
    }
  } catch {
    // A truncated header yields fewer facts, not a crash.
  }
  if (facts.dpi === undefined) delete facts.dpi;
  return facts;
}

function readWebpSize(b: Uint8Array): { width: number; height: number } | undefined {
  const chunk = ascii(b, 12, 16);
  if (chunk === 'VP8 ' && b.length >= 30) {
    return { width: (b[26]! | (b[27]! << 8)) & 0x3fff, height: (b[28]! | (b[29]! << 8)) & 0x3fff };
  }
  if (chunk === 'VP8L' && b.length >= 25) {
    const bits = b[21]! | (b[22]! << 8) | (b[23]! << 16) | (b[24]! << 24);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  if (chunk === 'VP8X' && b.length >= 30) {
    return {
      width: 1 + (b[24]! | (b[25]! << 8) | (b[26]! << 16)),
      height: 1 + (b[27]! | (b[28]! << 8) | (b[29]! << 16)),
    };
  }
  return undefined;
}

function ascii(b: Uint8Array, from: number, to: number): string {
  let s = '';
  for (let i = from; i < to; i++) s += String.fromCharCode(b[i]!);
  return s;
}
