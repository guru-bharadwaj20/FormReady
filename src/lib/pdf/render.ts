import type { RawImage } from '../image/raw.js';
import type { Rasteriser } from './compress.js';

/**
 * Browser rasteriser built on pdf.js and OffscreenCanvas. Loaded lazily so
 * the 1 MB pdf.js bundle only downloads when someone opens the PDF tools.
 * Not unit-tested: it needs a real canvas, which the e2e suite provides.
 */
export const pdfjsRasteriser: Rasteriser = async (bytes, dpi) => {
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).toString();
  const doc = await pdfjs.getDocument({ data: bytes.slice(), isEvalSupported: false } as Parameters<
    typeof pdfjs.getDocument
  >[0]).promise;
  const out: { image: RawImage; widthPt: number; heightPt: number }[] = [];
  try {
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const viewport = page.getViewport({ scale: dpi / 72 });
      const width = Math.max(1, Math.round(viewport.width));
      const height = Math.max(1, Math.round(viewport.height));
      const canvas = new OffscreenCanvas(width, height);
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('2d canvas unavailable');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, width, height);
      await page.render({
        canvas: canvas as unknown as HTMLCanvasElement,
        canvasContext: ctx as unknown as CanvasRenderingContext2D,
        viewport,
      }).promise;
      const data = ctx.getImageData(0, 0, width, height);
      const base = page.getViewport({ scale: 1 });
      out.push({
        image: { width, height, data: data.data },
        widthPt: base.width,
        heightPt: base.height,
      });
      page.cleanup();
    }
  } finally {
    await doc.destroy();
  }
  return out;
};
