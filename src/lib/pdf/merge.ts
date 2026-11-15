import { PDFDocument, PageSizes } from 'pdf-lib';
import { detectFormat } from '../image/probe.js';
import { loadPdf } from './inspect.js';
import { savePdf } from './metadata.js';

export interface MergeInput {
  bytes: Uint8Array;
  name?: string;
}

/**
 * Merges PDFs and images into one PDF (FR-6.2). Images become A4 portrait
 * pages with the picture fitted inside a margin, which is how scanned
 * certificates are expected to look. Unsupported inputs throw with the
 * file name so the UI can point at the culprit.
 */
export async function mergeToPdf(inputs: MergeInput[]): Promise<Uint8Array> {
  if (inputs.length === 0) throw new RangeError('nothing to merge');
  const out = await PDFDocument.create();
  for (const input of inputs) {
    const format = detectFormat(input.bytes);
    if (format === 'pdf') {
      const src = await loadPdf(input.bytes);
      const pages = await out.copyPages(src, src.getPageIndices());
      for (const p of pages) out.addPage(p);
    } else if (format === 'jpeg' || format === 'png') {
      const image =
        format === 'jpeg' ? await out.embedJpg(input.bytes) : await out.embedPng(input.bytes);
      const [pw, ph] = PageSizes.A4;
      const margin = 36;
      const k = Math.min((pw - margin * 2) / image.width, (ph - margin * 2) / image.height);
      const w = image.width * k;
      const h = image.height * k;
      const page = out.addPage([pw, ph]);
      page.drawImage(image, { x: (pw - w) / 2, y: (ph - h) / 2, width: w, height: h });
    } else {
      throw new TypeError(`${input.name ?? 'file'}: ${format} cannot be merged into a PDF`);
    }
  }
  return savePdf(out);
}
