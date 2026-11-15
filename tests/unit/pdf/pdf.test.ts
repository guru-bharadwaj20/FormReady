import { PDFDocument, StandardFonts } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import { jsquashCodec } from '$lib/codec/jsquash';
import { createRaw } from '$lib/image/raw';
import {
  InvalidPdfError,
  SizeUnreachableError,
  compressPdf,
  extractPages,
  inspectPdf,
  mergeToPdf,
  pageSizeName,
  parsePageRanges,
  splitEveryPage,
  type Rasteriser,
} from '$lib/pdf';
import { noisy, portrait } from '../image/helpers';

async function textPdf(pages: number, size: [number, number] = [595.28, 841.89]) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  doc.setTitle('secret title');
  doc.setAuthor('someone');
  for (let i = 0; i < pages; i++) {
    const page = doc.addPage(size);
    page.drawText(`Page ${i + 1}`, { x: 50, y: 700, size: 24, font });
  }
  return doc.save();
}

describe('inspect', () => {
  it('reports page count, size and scrubbed metadata', async () => {
    const info = await inspectPdf(await textPdf(3));
    expect(info).toMatchObject({ format: 'pdf', pages: 3, encrypted: false });
    expect(pageSizeName(info.pageSize!)).toBe('A4');
    expect(pageSizeName({ width: 612, height: 792 })).toBe('Letter');
    expect(pageSizeName({ width: 100, height: 100 })).toBe('other');
  });
  it('rejects garbage', async () => {
    await expect(inspectPdf(new TextEncoder().encode('%PDF-1.4 nope'))).rejects.toBeInstanceOf(
      InvalidPdfError,
    );
  });
});

describe('pages', () => {
  it('parses ranges in order without duplicates', () => {
    expect(parsePageRanges('1-3, 5', 10)).toEqual([0, 1, 2, 4]);
    expect(parsePageRanges('3,1,3', 3)).toEqual([2, 0]);
    expect(parsePageRanges('8-', 10)).toEqual([7, 8, 9]);
    expect(parsePageRanges('-2', 10)).toEqual([0, 1]);
    for (const bad of ['', 'x', '0', '11', '5-2', '1-3-5']) {
      expect(() => parsePageRanges(bad, 10), bad).toThrow(RangeError);
    }
  });
  it('extracts and splits pages with metadata scrubbed', async () => {
    const src = await textPdf(4);
    const sub = await extractPages(src, [3, 0]);
    const info = await inspectPdf(sub);
    expect(info.pages).toBe(2);
    const doc = await PDFDocument.load(sub, { updateMetadata: false });
    expect(doc.getTitle() ?? '').toBe('');
    expect(doc.getAuthor() ?? '').toBe('');
    expect(doc.getProducer()).toBe('FormReady');
    const parts = await splitEveryPage(src);
    expect(parts).toHaveLength(4);
    expect((await inspectPdf(parts[2]!)).pages).toBe(1);
  });
});

describe('merge', () => {
  it('merges pdfs and images into one document', async () => {
    const jpg = await jsquashCodec.encodeJpeg(portrait(400, 300), 80);
    const png = await jsquashCodec.encodePng(portrait(50, 80));
    const merged = await mergeToPdf([
      { bytes: await textPdf(2) },
      { bytes: jpg, name: 'photo.jpg' },
      { bytes: png },
      { bytes: await textPdf(1) },
    ]);
    const info = await inspectPdf(merged);
    expect(info.pages).toBe(5);
    expect(pageSizeName(info.pageSize!)).toBe('A4');
  });
  it('names the offending file', async () => {
    await expect(mergeToPdf([{ bytes: new Uint8Array([1, 2, 3]), name: 'x.bin' }])).rejects.toThrow(
      /x\.bin/,
    );
    await expect(mergeToPdf([])).rejects.toThrow(RangeError);
  });
});

/** Synthetic rasteriser: noisy pages so JPEG size tracks quality and density. */
const fakeRaster =
  (pages: number, busy = true): Rasteriser =>
  async (_bytes, dpi) => {
    const w = Math.round((595.28 / 72) * dpi);
    const h = Math.round((841.89 / 72) * dpi);
    return Array.from({ length: pages }, (_, i) => ({
      image: busy ? noisy(w, h, i + 1) : createRaw(w, h, [255, 255, 255]),
      widthPt: 595.28,
      heightPt: 841.89,
    }));
  };

describe('compress', () => {
  it('fits a busy scan under the limit by lowering quality then density', async () => {
    const r = await compressPdf(
      new Uint8Array(),
      { maxBytes: 150 * 1024 },
      fakeRaster(2),
      jsquashCodec,
    );
    expect(r.bytes.length).toBeLessThanOrEqual(150 * 1024);
    expect(r.pages).toBe(2);
    expect((await inspectPdf(r.bytes)).pages).toBe(2);
    expect(r.dpi).toBeLessThan(110);
  }, 60000);
  it('keeps the first density when quality alone suffices', async () => {
    const r = await compressPdf(
      new Uint8Array(),
      { maxBytes: 500 * 1024, greyscale: true },
      fakeRaster(1, false),
      jsquashCodec,
    );
    expect(r.dpi).toBe(110);
    expect(r.quality).toBe(85);
  }, 60000);
  it('reports the best size when the target is unreachable', async () => {
    const p = compressPdf(
      new Uint8Array(),
      { maxBytes: 2000, minDpi: 100 },
      fakeRaster(1),
      jsquashCodec,
    );
    await expect(p).rejects.toBeInstanceOf(SizeUnreachableError);
    await p.catch((e: SizeUnreachableError) => expect(e.bestBytes).toBeGreaterThan(2000));
  }, 60000);
});
