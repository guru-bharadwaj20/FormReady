import { UnsupportedFormatError } from '../lib/codec/types.js';
import { InvalidPdfError, SizeUnreachableError } from '../lib/pdf/index.js';
import { formatBytes } from '../lib/validate/format.js';
import type { WorkerError } from './protocol.js';

/** Maps any thrown value to a user-facing error key (docs/03 error handling). */
export function toWorkerError(e: unknown): WorkerError {
  const detail = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
  if (e instanceof UnsupportedFormatError) return { key: 'drop.unsupported', detail };
  if (e instanceof InvalidPdfError) return { key: 'error.invalidPdf', detail };
  if (e instanceof SizeUnreachableError) {
    return {
      key: 'pdf.unreachable',
      detail,
      params: { limit: formatBytes(e.target), best: formatBytes(e.bestBytes) },
    };
  }
  if (e instanceof RangeError) return { key: 'error.sizeUnreachable', detail };
  if (e instanceof TypeError) return { key: 'error.decode', detail };
  return { key: 'error.generic', detail };
}
