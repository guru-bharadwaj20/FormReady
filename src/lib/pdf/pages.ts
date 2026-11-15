import { PDFDocument } from 'pdf-lib';
import { loadPdf } from './inspect.js';
import { savePdf } from './metadata.js';

/**
 * Parses "1-3, 5, 8-" style ranges into zero-based page indices, in the
 * order written, deduplicated. Throws RangeError on anything unparseable
 * or out of range.
 */
export function parsePageRanges(text: string, pageCount: number): number[] {
  const out: number[] = [];
  const seen = new Set<number>();
  const push = (n: number) => {
    if (n < 1 || n > pageCount) throw new RangeError(`page ${n} is out of range`);
    if (!seen.has(n)) {
      seen.add(n);
      out.push(n - 1);
    }
  };
  for (const raw of text.split(/[,\s]+/)) {
    const part = raw.trim();
    if (!part) continue;
    const m = /^(\d+)?(?:-(\d+)?)?$/.exec(part);
    if (!m || (m[1] === undefined && m[2] === undefined)) {
      throw new RangeError(`cannot read page range "${part}"`);
    }
    if (part.includes('-')) {
      const a = m[1] ? Number(m[1]) : 1;
      const b = m[2] ? Number(m[2]) : pageCount;
      if (a > b) throw new RangeError(`range "${part}" is reversed`);
      for (let n = a; n <= b; n++) push(n);
    } else push(Number(m[1]));
  }
  if (out.length === 0) throw new RangeError('no pages selected');
  return out;
}

/** New PDF holding only the given zero-based pages, in that order (FR-6.3). */
export async function extractPages(bytes: Uint8Array, indices: number[]): Promise<Uint8Array> {
  const src = await loadPdf(bytes);
  const out = await PDFDocument.create();
  const copied = await out.copyPages(src, indices);
  for (const p of copied) out.addPage(p);
  return savePdf(out);
}

/** Splits into one PDF per page. */
export async function splitEveryPage(bytes: Uint8Array): Promise<Uint8Array[]> {
  const src = await loadPdf(bytes);
  const n = src.getPageCount();
  const results: Uint8Array[] = [];
  for (let i = 0; i < n; i++) {
    const out = await PDFDocument.create();
    const [p] = await out.copyPages(src, [i]);
    out.addPage(p!);
    results.push(await savePdf(out));
  }
  return results;
}
