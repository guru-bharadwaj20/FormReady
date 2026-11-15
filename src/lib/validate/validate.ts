/**
 * Pure validator (FR-2.1): (FileFacts, AssetSpec) -> Report.
 * No I/O, no globals, no locale strings; the UI resolves messageKey.
 */
import type { AssetSpec, ImageFormat } from '../specs/types.js';
import type { FileFacts, DetectedFormat } from './facts.js';
import type { CheckId, CheckResult, CheckStatus, Report } from './types.js';
import { formatBytes, formatMm, formatPercent, formatRange } from './format.js';

const DEFAULT_PIXEL_TOLERANCE = 0;
const DEFAULT_ASPECT_TOLERANCE = 0.03;
const DPI_TOLERANCE = 1;

function result(
  id: CheckId,
  status: CheckStatus,
  observed: string,
  expected: string,
  advisory = false,
): CheckResult {
  return {
    id,
    status,
    advisory,
    observed,
    expected,
    messageKey: `check.${id}.${status}`,
    params: { observed, expected },
  };
}

const within = (value: number, target: number, tolerance: number) =>
  Math.abs(value - target) <= target * tolerance + 0.5;

function formatMatches(detected: DetectedFormat, accepted: ImageFormat[]): boolean {
  return accepted.some((f) => f === detected);
}

export function checkFormat(facts: FileFacts, asset: AssetSpec): CheckResult {
  const expected = asset.formats.map((f) => f.toUpperCase()).join(' or ');
  const observed = facts.format === 'unknown' ? 'unknown' : facts.format.toUpperCase();
  const ok = formatMatches(facts.format, asset.formats);
  return result('format', ok ? 'pass' : 'fail', observed, expected);
}

export function checkSize(facts: FileFacts, asset: AssetSpec): CheckResult {
  const { minBytes, maxBytes } = asset.size;
  const ok = facts.bytes <= maxBytes && (minBytes === undefined || facts.bytes >= minBytes);
  const expected = formatRange(minBytes, maxBytes, formatBytes);
  return result('size', ok ? 'pass' : 'fail', formatBytes(facts.bytes), expected);
}

export function checkPixels(facts: FileFacts, asset: AssetSpec): CheckResult | undefined {
  if (!asset.pixels) return undefined;
  const { width, height, tolerance = DEFAULT_PIXEL_TOLERANCE } = asset.pixels;
  const expected = tolerance ? `about ${width} x ${height} px` : `${width} x ${height} px`;
  if (facts.width === undefined || facts.height === undefined) {
    return result('pixels', 'fail', 'unreadable', expected);
  }
  const ok = within(facts.width, width, tolerance) && within(facts.height, height, tolerance);
  return result('pixels', ok ? 'pass' : 'fail', `${facts.width} x ${facts.height} px`, expected);
}

export function checkPhysical(facts: FileFacts, asset: AssetSpec): CheckResult | undefined {
  // When a pixel rule exists it already encodes the physical size.
  if (!asset.physical || asset.pixels) return undefined;
  const { widthMm, heightMm, dpi } = asset.physical;
  const expected = `${formatMm(widthMm, heightMm)} at ${dpi} DPI`;
  if (facts.width === undefined || facts.height === undefined) {
    return result('physical', 'skip', 'unreadable', expected);
  }
  const targetW = (widthMm / 25.4) * dpi;
  const targetH = (heightMm / 25.4) * dpi;
  const ok = within(facts.width, targetW, 0.02) && within(facts.height, targetH, 0.02);
  return result('physical', ok ? 'pass' : 'fail', `${facts.width} x ${facts.height} px`, expected);
}

export function checkAspect(facts: FileFacts, asset: AssetSpec): CheckResult | undefined {
  if (!asset.aspect) return undefined;
  const { ratio, tolerance = DEFAULT_ASPECT_TOLERANCE } = asset.aspect;
  const expected = `${ratio.toFixed(2)}:1`;
  if (!facts.width || !facts.height) return result('aspect', 'skip', 'unreadable', expected);
  const actual = facts.width / facts.height;
  const ok = Math.abs(actual - ratio) <= ratio * tolerance;
  return result('aspect', ok ? 'pass' : 'fail', `${actual.toFixed(2)}:1`, expected);
}

export function checkDpi(facts: FileFacts, asset: AssetSpec): CheckResult | undefined {
  const want = asset.dpi ?? asset.physical?.dpi;
  if (!want) return undefined;
  const expected = `${want} DPI`;
  if (facts.dpi === undefined) return result('dpi', 'skip', 'none', expected);
  const ok = Math.abs(facts.dpi - want) <= DPI_TOLERANCE;
  return result('dpi', ok ? 'pass' : 'fail', `${Math.round(facts.dpi)} DPI`, expected);
}

export function checkColour(facts: FileFacts, asset: AssetSpec): CheckResult | undefined {
  if (!asset.colour || asset.colour === 'any') return undefined;
  const expected = asset.colour;
  if (facts.greyscale === undefined) return result('colour', 'skip', 'unknown', expected);
  const observed = facts.greyscale ? 'greyscale' : 'colour';
  return result('colour', observed === expected ? 'pass' : 'fail', observed, expected);
}

export function checkFace(facts: FileFacts, asset: AssetSpec): CheckResult | undefined {
  if (!asset.face) return undefined;
  const { minHeightFraction, maxHeightFraction } = asset.face;
  const expected = `${formatPercent(minHeightFraction)} to ${formatPercent(maxHeightFraction)}`;
  if (!facts.faceChecked || facts.faceHeightFraction === undefined) {
    return result('face', 'skip', 'not checked', expected, true);
  }
  const f = facts.faceHeightFraction;
  const ok = f >= minHeightFraction && f <= maxHeightFraction;
  return result('face', ok ? 'pass' : 'warn', formatPercent(f), expected, true);
}

export function checkBackground(facts: FileFacts, asset: AssetSpec): CheckResult | undefined {
  if (!asset.background || asset.background.kind === 'any') return undefined;
  const expected = asset.background.kind === 'white' ? 'plain white' : 'plain and light';
  if (facts.backgroundPlainness === undefined || facts.backgroundLightness === undefined) {
    return result('background', 'skip', 'not checked', expected, true);
  }
  const minLight = asset.background.kind === 'white' ? 0.8 : 0.6;
  const ok = facts.backgroundPlainness >= 0.7 && facts.backgroundLightness >= minLight;
  const light = formatPercent(facts.backgroundLightness);
  const plain = formatPercent(facts.backgroundPlainness);
  return result(
    'background',
    ok ? 'pass' : 'warn',
    `${light} light, ${plain} plain`,
    expected,
    true,
  );
}

export function checkPages(facts: FileFacts, asset: AssetSpec): CheckResult | undefined {
  const rule = asset.pdf;
  if (!rule || (rule.minPages === undefined && rule.maxPages === undefined)) return undefined;
  const { minPages = 1, maxPages } = rule;
  let expected: string;
  if (maxPages === undefined) expected = `at least ${minPages}`;
  else if (minPages === maxPages) expected = `${maxPages}`;
  else expected = `${minPages} to ${maxPages}`;
  if (facts.pages === undefined) return result('pages', 'skip', 'unknown', expected);
  const ok = facts.pages >= minPages && (maxPages === undefined || facts.pages <= maxPages);
  return result('pages', ok ? 'pass' : 'fail', `${facts.pages}`, expected);
}

export function validate(facts: FileFacts, asset: AssetSpec): Report {
  const checks = [
    checkFormat(facts, asset),
    checkSize(facts, asset),
    checkPixels(facts, asset),
    checkPhysical(facts, asset),
    checkAspect(facts, asset),
    checkDpi(facts, asset),
    checkColour(facts, asset),
    checkFace(facts, asset),
    checkBackground(facts, asset),
    checkPages(facts, asset),
  ].filter((c): c is CheckResult => c !== undefined);
  const compliant = checks.every((c) => c.advisory || c.status === 'pass' || c.status === 'skip');
  const warnings = checks.filter((c) => c.advisory && c.status === 'warn').length;
  return { checks, compliant, warnings };
}
