import { PDFDocument } from 'pdf-lib';
import type { FileFacts } from '../validate/facts.js';

export interface PdfInfo extends FileFacts {
  format: 'pdf';
  pages: number;
  encrypted: boolean;
  /** Width and height of the first page in PDF points (1/72 inch). */
  pageSize?: { width: number; height: number };
}

export class InvalidPdfError extends Error {
  constructor(cause?: unknown) {
    super('not a readable PDF');
    this.name = 'InvalidPdfError';
    this.cause = cause;
  }
}

/** Loads a PDF leniently; throws InvalidPdfError when pdf-lib cannot parse it. */
export async function loadPdf(bytes: Uint8Array): Promise<PDFDocument> {
  try {
    return await PDFDocument.load(bytes, { ignoreEncryption: true, updateMetadata: false });
  } catch (e) {
    throw new InvalidPdfError(e);
  }
}

/** Page count and page size without rendering anything (FR-2 for PDFs). */
export async function inspectPdf(bytes: Uint8Array): Promise<PdfInfo> {
  const doc = await loadPdf(bytes);
  let pages: number;
  let first: { width: number; height: number } | undefined;
  try {
    pages = doc.getPageCount();
    first = pages > 0 ? doc.getPage(0).getSize() : undefined;
  } catch (e) {
    // pdf-lib parses the page tree lazily, so a corrupt tree surfaces here.
    throw new InvalidPdfError(e);
  }
  return {
    format: 'pdf',
    bytes: bytes.length,
    pages,
    encrypted: doc.isEncrypted,
    pageSize: first,
  };
}

/** Rough ISO size name for a page in points, with a 3 percent tolerance. */
export function pageSizeName(size: { width: number; height: number }): 'A4' | 'Letter' | 'other' {
  const w = Math.min(size.width, size.height);
  const h = Math.max(size.width, size.height);
  const near = (a: number, b: number) => Math.abs(a - b) / b < 0.03;
  if (near(w, 595.28) && near(h, 841.89)) return 'A4';
  if (near(w, 612) && near(h, 792)) return 'Letter';
  return 'other';
}
