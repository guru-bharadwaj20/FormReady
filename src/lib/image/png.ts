/**
 * PNG chunk tooling for the pHYs (physical pixel dimensions) chunk, which is
 * how a DPI tag is expressed in PNG output (FR-3.4).
 */

const SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

export function isPng(bytes: Uint8Array): boolean {
  return bytes.length >= 8 && SIGNATURE.every((b, i) => bytes[i] === b);
}

export interface PngChunk {
  type: string;
  start: number;
  end: number;
  dataStart: number;
  length: number;
}

export function parseChunks(bytes: Uint8Array): PngChunk[] {
  if (!isPng(bytes)) throw new TypeError('not a PNG file');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const chunks: PngChunk[] = [];
  let pos = 8;
  while (pos + 8 <= bytes.length) {
    const length = view.getUint32(pos);
    const type = String.fromCharCode(
      bytes[pos + 4]!,
      bytes[pos + 5]!,
      bytes[pos + 6]!,
      bytes[pos + 7]!,
    );
    const end = pos + 12 + length;
    if (end > bytes.length) break;
    chunks.push({ type, start: pos, end, dataStart: pos + 8, length });
    pos = end;
    if (type === 'IEND') break;
  }
  return chunks;
}

export function readPngSize(bytes: Uint8Array): { width: number; height: number } | undefined {
  const ihdr = parseChunks(bytes).find((c) => c.type === 'IHDR');
  if (!ihdr) return undefined;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { width: view.getUint32(ihdr.dataStart), height: view.getUint32(ihdr.dataStart + 4) };
}

/** DPI from the pHYs chunk, when the unit is metres. */
export function readPngDpi(bytes: Uint8Array): number | undefined {
  const phys = parseChunks(bytes).find((c) => c.type === 'pHYs');
  if (!phys || phys.length !== 9) return undefined;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const unit = bytes[phys.dataStart + 8];
  if (unit !== 1) return undefined;
  return Math.round(view.getUint32(phys.dataStart) * 0.0254);
}

/** Returns a copy with a pHYs chunk expressing the given DPI (inserted after IHDR). */
export function setPngDpi(bytes: Uint8Array, dpi: number): Uint8Array {
  const chunks = parseChunks(bytes);
  const ppm = Math.round(dpi / 0.0254);
  const chunk = new Uint8Array(21);
  const v = new DataView(chunk.buffer);
  v.setUint32(0, 9);
  chunk.set([0x70, 0x48, 0x59, 0x73], 4);
  v.setUint32(8, ppm);
  v.setUint32(12, ppm);
  chunk[16] = 1;
  v.setUint32(17, crc32(chunk.subarray(4, 17)));

  const kept = chunks.filter((c) => c.type !== 'pHYs');
  const ihdr = kept.findIndex((c) => c.type === 'IHDR');
  const parts: Uint8Array[] = [bytes.subarray(0, 8)];
  kept.forEach((c, i) => {
    parts.push(bytes.subarray(c.start, c.end));
    if (i === ihdr) parts.push(chunk);
  });
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let pos = 0;
  for (const p of parts) {
    out.set(p, pos);
    pos += p.length;
  }
  return out;
}

/** Drops ancillary text and colour-profile chunks that may carry metadata. */
export function stripPngMetadata(bytes: Uint8Array): Uint8Array {
  const drop = new Set(['tEXt', 'zTXt', 'iTXt', 'eXIf', 'tIME', 'iCCP']);
  const kept = parseChunks(bytes).filter((c) => !drop.has(c.type));
  const total = 8 + kept.reduce((n, c) => n + (c.end - c.start), 0);
  const out = new Uint8Array(total);
  out.set(bytes.subarray(0, 8), 0);
  let pos = 8;
  for (const c of kept) {
    out.set(bytes.subarray(c.start, c.end), pos);
    pos += c.end - c.start;
  }
  return out;
}

let table: Uint32Array | undefined;
export function crc32(data: Uint8Array): number {
  if (!table) {
    table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) crc = table[(crc ^ data[i]!) & 0xff]! ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
