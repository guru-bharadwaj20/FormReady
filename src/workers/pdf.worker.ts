import { jsquashCodec } from '../lib/codec/jsquash.js';
import {
  compressPdf,
  extractPages,
  inspectPdf,
  mergeToPdf,
  parsePageRanges,
  splitEveryPage,
} from '../lib/pdf/index.js';
import { pdfjsRasteriser } from '../lib/pdf/render.js';
import { serve } from './client.js';
import { toWorkerError } from './errors.js';
import type { PdfRequest, PdfResponse } from './protocol.js';

/** PDF worker: pdf.js rendering and pdf-lib assembly off the main thread. */
serve<PdfRequest, PdfResponse>(
  self,
  async (req) => {
    switch (req.kind) {
      case 'inspect':
        return { kind: 'inspect', info: await inspectPdf(req.bytes) };
      case 'compress': {
        const r = await compressPdf(
          req.bytes,
          { maxBytes: req.maxBytes, greyscale: req.greyscale },
          pdfjsRasteriser,
          jsquashCodec,
        );
        return {
          kind: 'compress',
          bytes: r.bytes,
          pages: r.pages,
          dpi: r.dpi,
          quality: r.quality,
          steps: r.steps,
        };
      }
      case 'merge': {
        const bytes = await mergeToPdf(req.files);
        return { kind: 'merge', bytes, pages: (await inspectPdf(bytes)).pages };
      }
      case 'extract': {
        const total = (await inspectPdf(req.bytes)).pages;
        const indices = parsePageRanges(req.ranges, total);
        const bytes = await extractPages(req.bytes, indices);
        return { kind: 'extract', bytes, pages: indices.length };
      }
      case 'split':
        return { kind: 'split', parts: await splitEveryPage(req.bytes) };
    }
  },
  toWorkerError,
);
