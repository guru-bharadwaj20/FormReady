import type { AssetSpec, PortalSpec } from './types.js';

/**
 * Cross-field sanity rules that JSON Schema cannot express. Pure, so the
 * same rules run in CI (scripts/validate-specs.ts) and in unit tests.
 */
export function lintSpec(spec: PortalSpec): string[] {
  const problems: string[] = [];
  const ids = new Set<string>();
  const verified = Date.parse(spec.lastVerified);
  if (Number.isNaN(verified)) problems.push('lastVerified is not a date');
  else if (verified > Date.now() + 86_400_000) problems.push('lastVerified is in the future');

  for (const asset of spec.assets) {
    const at = `assets/${asset.id}`;
    if (ids.has(asset.id)) problems.push(`${at}: duplicate asset id`);
    ids.add(asset.id);
    problems.push(...lintAsset(asset).map((p) => `${at}: ${p}`));
  }
  return problems;
}

export function lintAsset(asset: AssetSpec): string[] {
  const problems: string[] = [];
  const { size, pixels, physical, aspect, face, pdf, formats } = asset;
  const isPdf = formats.includes('pdf');
  const isImage = formats.some((f) => f !== 'pdf');

  if (size.minBytes !== undefined && size.minBytes >= size.maxBytes) {
    problems.push('size.minBytes must be below size.maxBytes');
  }
  if (pixels && physical) {
    const w = Math.round((physical.widthMm / 25.4) * physical.dpi);
    const h = Math.round((physical.heightMm / 25.4) * physical.dpi);
    const tol = pixels.tolerance ?? 0.02;
    if (Math.abs(w - pixels.width) > pixels.width * tol + 2) {
      problems.push(`pixels.width ${pixels.width} disagrees with physical (${w})`);
    }
    if (Math.abs(h - pixels.height) > pixels.height * tol + 2) {
      problems.push(`pixels.height ${pixels.height} disagrees with physical (${h})`);
    }
  }
  if (aspect && pixels) {
    const r = pixels.width / pixels.height;
    if (Math.abs(r - aspect.ratio) / aspect.ratio > (aspect.tolerance ?? 0.03) + 0.01) {
      problems.push(`aspect.ratio ${aspect.ratio} disagrees with pixels (${r.toFixed(3)})`);
    }
  }
  if (asset.dpi && physical && asset.dpi !== physical.dpi) {
    problems.push('dpi must match physical.dpi');
  }
  if (face && face.minHeightFraction >= face.maxHeightFraction) {
    problems.push('face.minHeightFraction must be below maxHeightFraction');
  }
  if (face && asset.kind !== 'photo') problems.push('face rules only apply to photos');
  if (pdf && !isPdf) problems.push('pdf rules given but pdf is not an accepted format');
  if (pdf?.minPages && pdf.maxPages && pdf.minPages > pdf.maxPages) {
    problems.push('pdf.minPages must not exceed maxPages');
  }
  if (!isImage && (pixels || physical || aspect || asset.dpi || face || asset.colour)) {
    problems.push('image rules given but no image format is accepted');
  }
  return problems;
}
