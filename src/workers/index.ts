import { WorkerClient } from './client.js';
import type { ImageRequest, ImageResponse, PdfRequest, PdfResponse } from './protocol.js';

export { WorkerClient, WorkerRequestError } from './client.js';
export * from './protocol.js';

let image: WorkerClient<ImageRequest, ImageResponse> | undefined;
let pdf: WorkerClient<PdfRequest, PdfResponse> | undefined;

/** Lazily started singleton image worker (Vite bundles it as a module worker). */
export function imageWorker(): WorkerClient<ImageRequest, ImageResponse> {
  image ??= new WorkerClient(
    new Worker(new URL('./image.worker.ts', import.meta.url), { type: 'module' }),
  );
  return image;
}

/** Lazily started singleton PDF worker; pdf.js is only fetched when first used. */
export function pdfWorker(): WorkerClient<PdfRequest, PdfResponse> {
  pdf ??= new WorkerClient(
    new Worker(new URL('./pdf.worker.ts', import.meta.url), { type: 'module' }),
  );
  return pdf;
}
