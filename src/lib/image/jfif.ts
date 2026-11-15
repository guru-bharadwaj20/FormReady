/**
 * Minimal JPEG segment tooling: enough to read and write the JFIF density
 * (DPI) tag, strip privacy-leaking metadata and pad a file to an exact byte
 * size with a COM segment (ADR-0004). No pixel data is touched.
 */

export interface JpegSegment {
  marker: number;
  /** Offset of the 0xFF byte. */
  start: number;
  /** Offset one past the end of the segment payload. */
  end: number;
}

const SOI = 0xd8;
const SOS = 0xda;
const EOI = 0xd9;
const APP0 = 0xe0;
const APP1 = 0xe1;
const COM = 0xfe;

export function isJpeg(bytes: Uint8Array): boolean {
  return bytes.length > 3 && bytes[0] === 0xff && bytes[1] === SOI && bytes[2] === 0xff;
}

/** Lists marker segments up to and including SOS (scan data is not parsed). */
export function parseSegments(bytes: Uint8Array): JpegSegment[] {
  if (!isJpeg(bytes)) throw new TypeError('not a JPEG file');
  const segments: JpegSegment[] = [];
  let pos = 2;
  while (pos + 3 < bytes.length) {
    if (bytes[pos] !== 0xff) throw new TypeError(`bad JPEG marker at ${pos}`);
    const marker = bytes[pos + 1]!;
    if (marker === 0xff) {
      pos++;
      continue;
    }
    if (marker === SOS) {
      segments.push({ marker, start: pos, end: bytes.length });
      break;
    }
    if (marker === EOI || (marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) {
      segments.push({ marker, start: pos, end: pos + 2 });
      pos += 2;
      continue;
    }
    const len = (bytes[pos + 2]! << 8) | bytes[pos + 3]!;
    segments.push({ marker, start: pos, end: pos + 2 + len });
    pos += 2 + len;
  }
  return segments;
}

function isJfifApp0(bytes: Uint8Array, seg: JpegSegment): boolean {
  return (
    seg.marker === APP0 &&
    seg.end - seg.start >= 18 &&
    bytes[seg.start + 4] === 0x4a &&
    bytes[seg.start + 5] === 0x46 &&
    bytes[seg.start + 6] === 0x49 &&
    bytes[seg.start + 7] === 0x46 &&
    bytes[seg.start + 8] === 0x00
  );
}

/** Reads the density from the JFIF APP0 header, converted to DPI. */
export function readJfifDpi(bytes: Uint8Array): number | undefined {
  for (const seg of parseSegments(bytes)) {
    if (!isJfifApp0(bytes, seg)) continue;
    const units = bytes[seg.start + 11]!;
    const x = (bytes[seg.start + 12]! << 8) | bytes[seg.start + 13]!;
    if (units === 1) return x;
    if (units === 2) return Math.round(x * 2.54);
    return undefined;
  }
  return readExifDpi(bytes);
}

/** Reads XResolution from an EXIF APP1 block (TIFF IFD0), if present. */
export function readExifDpi(bytes: Uint8Array): number | undefined {
  for (const seg of parseSegments(bytes)) {
    if (seg.marker !== APP1) continue;
    const p = seg.start + 4;
    if (
      bytes[p] !== 0x45 ||
      bytes[p + 1] !== 0x78 ||
      bytes[p + 2] !== 0x69 ||
      bytes[p + 3] !== 0x66
    )
      continue;
    const tiff = p + 6;
    const le = bytes[tiff] === 0x49;
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const u16 = (o: number) => view.getUint16(o, le);
    const u32 = (o: number) => view.getUint32(o, le);
    if (tiff + 8 > seg.end) continue;
    const ifd = tiff + u32(tiff + 4);
    if (ifd + 2 > seg.end) continue;
    const n = u16(ifd);
    let xres: number | undefined;
    let unit = 2;
    for (let i = 0; i < n; i++) {
      const e = ifd + 2 + i * 12;
      if (e + 12 > seg.end) break;
      const tag = u16(e);
      if (tag === 0x011a) {
        const off = tiff + u32(e + 8);
        if (off + 8 <= seg.end) {
          const den = u32(off + 4);
          if (den) xres = u32(off) / den;
        }
      } else if (tag === 0x0128) unit = u16(e + 8);
    }
    if (xres === undefined) return undefined;
    return Math.round(unit === 3 ? xres * 2.54 : xres);
  }
  return undefined;
}

/**
 * Returns a copy whose JFIF APP0 carries the given DPI. If no JFIF header
 * exists one is inserted right after SOI (FR-3.4).
 */
export function setJfifDensity(bytes: Uint8Array, dpi: number): Uint8Array {
  const segs = parseSegments(bytes);
  const existing = segs.find((s) => isJfifApp0(bytes, s));
  const hi = (dpi >> 8) & 0xff;
  const lo = dpi & 0xff;
  if (existing) {
    const out = new Uint8Array(bytes);
    out[existing.start + 11] = 1;
    out[existing.start + 12] = hi;
    out[existing.start + 13] = lo;
    out[existing.start + 14] = hi;
    out[existing.start + 15] = lo;
    return out;
  }
  const app0 = new Uint8Array([
    0xff,
    APP0,
    0x00,
    0x10,
    0x4a,
    0x46,
    0x49,
    0x46,
    0x00,
    0x01,
    0x01,
    0x01,
    hi,
    lo,
    hi,
    lo,
    0x00,
    0x00,
  ]);
  const out = new Uint8Array(bytes.length + app0.length);
  out.set(bytes.subarray(0, 2), 0);
  out.set(app0, 2);
  out.set(bytes.subarray(2), 2 + app0.length);
  return out;
}

/**
 * Removes EXIF, XMP, ICC, comments and every other APPn except JFIF APP0.
 * This drops GPS and device data (NFR-2) and makes the size search
 * deterministic.
 */
export function stripMetadata(bytes: Uint8Array): Uint8Array {
  const segs = parseSegments(bytes);
  const keep: JpegSegment[] = [];
  for (const s of segs) {
    const isApp = s.marker >= 0xe0 && s.marker <= 0xef;
    if (isApp && !isJfifApp0(bytes, s)) continue;
    if (s.marker === COM) continue;
    keep.push(s);
  }
  const total = 2 + keep.reduce((n, s) => n + (s.end - s.start), 0);
  const out = new Uint8Array(total);
  out[0] = 0xff;
  out[1] = SOI;
  let pos = 2;
  for (const s of keep) {
    out.set(bytes.subarray(s.start, s.end), pos);
    pos += s.end - s.start;
  }
  return out;
}

/** Maximum payload a single COM segment can hold. */
export const MAX_COMMENT = 0xffff - 2;

/**
 * Pads the file to exactly targetBytes by inserting COM segments before SOS.
 * Throws when the file is already larger than the target.
 */
export function padWithComment(bytes: Uint8Array, targetBytes: number): Uint8Array {
  let extra = targetBytes - bytes.length;
  if (extra < 0) throw new RangeError('file is larger than the padding target');
  if (extra === 0) return bytes;
  const sos = parseSegments(bytes).find((s) => s.marker === SOS);
  if (!sos) throw new TypeError('JPEG has no scan');
  const chunks: Uint8Array[] = [];
  // Each segment costs 4 bytes of framing; a 1..3 byte remainder cannot be
  // expressed alone, so fold it into the previous chunk.
  while (extra > 0) {
    let payload = Math.min(extra - 4, MAX_COMMENT);
    if (extra - (payload + 4) > 0 && extra - (payload + 4) < 4) payload -= 4;
    if (payload < 0) throw new RangeError('padding of 1 to 3 bytes is impossible');
    const seg = new Uint8Array(payload + 4);
    seg[0] = 0xff;
    seg[1] = COM;
    seg[2] = ((payload + 2) >> 8) & 0xff;
    seg[3] = (payload + 2) & 0xff;
    seg.fill(0x20, 4);
    chunks.push(seg);
    extra -= seg.length;
  }
  const out = new Uint8Array(targetBytes);
  out.set(bytes.subarray(0, sos.start), 0);
  let pos = sos.start;
  for (const c of chunks) {
    out.set(c, pos);
    pos += c.length;
  }
  out.set(bytes.subarray(sos.start), pos);
  return out;
}

/** Reads width and height from the SOFn frame header. */
export function readJpegSize(bytes: Uint8Array): { width: number; height: number } | undefined {
  for (const s of parseSegments(bytes)) {
    const m = s.marker;
    const isSof = m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc;
    if (!isSof) continue;
    const height = (bytes[s.start + 5]! << 8) | bytes[s.start + 6]!;
    const width = (bytes[s.start + 7]! << 8) | bytes[s.start + 8]!;
    return { width, height };
  }
  return undefined;
}
