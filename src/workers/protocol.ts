import type { PipelineStep } from '../lib/image/pipeline.js';
import type { FitStep } from '../lib/image/kbsearch.js';
import type { PdfInfo } from '../lib/pdf/inspect.js';
import type { AssetSpec } from '../lib/specs/types.js';
import type { FileFacts } from '../lib/validate/facts.js';

/**
 * Typed request/response protocol shared by the main thread and both
 * workers. Every request carries an id; every response echoes it. Errors
 * travel as data with an i18n key so the UI never sees a stack trace.
 */

export interface WorkerError {
  /** i18n key under error.* */
  key: string;
  /** Developer detail, logged to the console only. */
  detail?: string;
  /** Extra values for the message template. */
  params?: Record<string, string | number>;
}

export type ImageRequest =
  | { kind: 'inspect'; bytes: Uint8Array; asset?: AssetSpec }
  | {
      kind: 'fix';
      bytes: Uint8Array;
      asset: AssetSpec;
      format?: 'jpeg' | 'png';
      focus?: { x: number; y: number };
    };

export type ImageResponse =
  | { kind: 'inspect'; facts: FileFacts; preview: Uint8Array }
  | {
      kind: 'fix';
      bytes: Uint8Array;
      facts: FileFacts;
      steps: PipelineStep[];
      format: 'jpeg' | 'png';
    };

export type PdfRequest =
  | { kind: 'inspect'; bytes: Uint8Array }
  | { kind: 'compress'; bytes: Uint8Array; maxBytes: number; greyscale?: boolean }
  | { kind: 'merge'; files: { bytes: Uint8Array; name?: string }[] }
  | { kind: 'extract'; bytes: Uint8Array; ranges: string }
  | { kind: 'split'; bytes: Uint8Array };

export type PdfResponse =
  | { kind: 'inspect'; info: PdfInfo }
  | {
      kind: 'compress';
      bytes: Uint8Array;
      pages: number;
      dpi: number;
      quality: number;
      steps: FitStep[];
    }
  | { kind: 'merge'; bytes: Uint8Array; pages: number }
  | { kind: 'extract'; bytes: Uint8Array; pages: number }
  | { kind: 'split'; parts: Uint8Array[] };

export interface Envelope<T> {
  id: number;
  payload: T;
}

export type Reply<T> =
  { id: number; ok: true; payload: T } | { id: number; ok: false; error: WorkerError };

/** Collects ArrayBuffers that can be transferred instead of copied. */
export function transferables(value: unknown, out: ArrayBuffer[] = []): ArrayBuffer[] {
  if (value instanceof Uint8Array || value instanceof Uint8ClampedArray) {
    if (value.buffer instanceof ArrayBuffer && !out.includes(value.buffer)) out.push(value.buffer);
  } else if (Array.isArray(value)) {
    for (const v of value) transferables(v, out);
  } else if (value && typeof value === 'object') {
    for (const v of Object.values(value)) transferables(v, out);
  }
  return out;
}
