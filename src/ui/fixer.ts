/**
 * Main-thread orchestration for the Fix flow (FR-2, FR-3, FR-5).
 * Reads the file, asks the right worker, runs the advisory face check on
 * the main thread (FaceDetector is not available in workers everywhere),
 * then feeds the facts to the pure validator.
 */
import { detectFace, faceDetectionSupported } from '$lib/face/index.js';
import { detectFormat } from '$lib/image/probe.js';
import { outputFilename } from '$lib/specs/registry.js';
import type { AssetSpec, PortalSpec } from '$lib/specs/types.js';
import { validate, type FileFacts, type Report } from '$lib/validate/index.js';
import { imageWorker, pdfWorker, WorkerRequestError } from '$workers/index.js';

export interface Inspection {
  facts: FileFacts;
  report: Report;
  /** Object URL of a small preview; undefined for PDFs. */
  previewUrl?: string;
  /** Crop focus from the face detector, if one was found. */
  focus?: { x: number; y: number };
  isPdf: boolean;
}

export interface Fixed extends Inspection {
  blob: Blob;
  filename: string;
  /** True when the input already complied and was passed through untouched. */
  unchanged: boolean;
}

export async function readBytes(file: Blob): Promise<Uint8Array> {
  return new Uint8Array(await file.arrayBuffer());
}

export function toObjectUrl(bytes: Uint8Array, type: string): string {
  return URL.createObjectURL(new Blob([bytes as unknown as ArrayBuffer], { type }));
}

/** True when the asset expects a PDF rather than an image. */
export function wantsPdf(asset: AssetSpec): boolean {
  return asset.formats.includes('pdf') && !asset.formats.some((f) => f !== 'pdf');
}

async function faceFacts(file: Blob, facts: FileFacts, asset: AssetSpec) {
  if (!asset.face) return undefined;
  facts.faceChecked = faceDetectionSupported();
  const face = await detectFace(file);
  if (face) facts.faceHeightFraction = face.heightFraction;
  return face?.focus;
}

export async function inspectFile(file: File, asset: AssetSpec): Promise<Inspection> {
  const bytes = await readBytes(file);
  if (detectFormat(bytes) === 'pdf') {
    const res = await pdfWorker().request({ kind: 'inspect', bytes });
    if (res.kind !== 'inspect') throw new Error('unexpected reply');
    return { facts: res.info, report: validate(res.info, asset), isPdf: true };
  }
  const res = await imageWorker().request({ kind: 'inspect', bytes, asset });
  if (res.kind !== 'inspect') throw new Error('unexpected reply');
  const facts = res.facts;
  const focus = await faceFacts(file, facts, asset);
  return {
    facts,
    report: validate(facts, asset),
    previewUrl: toObjectUrl(res.preview, 'image/jpeg'),
    focus,
    isPdf: false,
  };
}

export async function fixFile(
  file: File,
  spec: PortalSpec,
  asset: AssetSpec,
  before: Inspection,
): Promise<Fixed> {
  if (wantsPdf(asset)) return fixToPdf(file, spec, asset, before);

  const res = await imageWorker().request({
    kind: 'fix',
    bytes: await readBytes(file),
    asset,
    focus: before.focus,
  });
  if (res.kind !== 'fix') throw new Error('unexpected reply');
  const type = res.format === 'png' ? 'image/png' : 'image/jpeg';
  const blob = new Blob([res.bytes as unknown as ArrayBuffer], { type });
  const facts = res.facts;
  const focus = await faceFacts(blob, facts, asset);
  return {
    facts,
    report: validate(facts, asset),
    previewUrl: URL.createObjectURL(blob),
    focus,
    isPdf: false,
    blob,
    filename: outputFilename(spec, asset, res.format === 'png' ? 'png' : 'jpg'),
    unchanged: false,
  };
}

async function fixToPdf(
  file: File,
  spec: PortalSpec,
  asset: AssetSpec,
  before: Inspection,
): Promise<Fixed> {
  const pdf = pdfWorker();
  let bytes = await readBytes(file);
  let unchanged = false;

  if (!before.isPdf) {
    const merged = await pdf.request({ kind: 'merge', files: [{ bytes, name: file.name }] });
    if (merged.kind !== 'merge') throw new Error('unexpected reply');
    bytes = merged.bytes;
  } else if (before.report.compliant) {
    unchanged = true;
  }

  if (!unchanged && bytes.byteLength > asset.size.maxBytes) {
    const res = await pdf.request({
      kind: 'compress',
      bytes: bytes.slice(),
      maxBytes: asset.size.maxBytes,
      greyscale: asset.colour === 'greyscale',
    });
    if (res.kind !== 'compress') throw new Error('unexpected reply');
    bytes = res.bytes;
  }

  const info = await pdf.request({ kind: 'inspect', bytes: bytes.slice() });
  if (info.kind !== 'inspect') throw new Error('unexpected reply');
  return {
    facts: info.info,
    report: validate(info.info, asset),
    isPdf: true,
    blob: new Blob([bytes as unknown as ArrayBuffer], { type: 'application/pdf' }),
    filename: outputFilename(spec, asset, 'pdf'),
    unchanged,
  };
}

/** Triggers a download without leaving the page. */
export function download(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Resolves any thrown value to an i18n key plus params for the UI. */
export function errorKey(e: unknown): { key: string; params?: Record<string, string | number> } {
  if (e instanceof WorkerRequestError) return { key: e.info.key, params: e.info.params };
  return { key: 'error.generic' };
}
