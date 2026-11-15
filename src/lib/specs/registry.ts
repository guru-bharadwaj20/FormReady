import type { AssetSpec, PortalSpec } from './types.js';

/**
 * All specs are bundled at build time (FR-1.5). Vite resolves the glob
 * statically, and Vitest understands the same syntax, so tests exercise the
 * real registry rather than a copy.
 */
const modules = import.meta.glob<{ default: PortalSpec }>('../../../specs/**/*.json', {
  eager: true,
});

export const specs: readonly PortalSpec[] = Object.entries(modules)
  .filter(([path]) => !path.endsWith('schema.json'))
  .map(([, m]) => m.default)
  .sort((a, b) => a.portal.localeCompare(b.portal) || a.form.localeCompare(b.form));

const byId = new Map(specs.map((s) => [s.id, s]));

export function getSpec(id: string): PortalSpec | undefined {
  return byId.get(id);
}

export function getAsset(spec: PortalSpec, assetId: string): AssetSpec | undefined {
  return spec.assets.find((a) => a.id === assetId);
}

/** Pixel target for an asset, derived from pixels or physical + dpi. */
export function targetPixels(asset: AssetSpec): { width: number; height: number } | undefined {
  if (asset.pixels) return { width: asset.pixels.width, height: asset.pixels.height };
  if (asset.physical) {
    const { widthMm, heightMm, dpi } = asset.physical;
    return {
      width: Math.round((widthMm / 25.4) * dpi),
      height: Math.round((heightMm / 25.4) * dpi),
    };
  }
  return undefined;
}

/** Suggested download name, e.g. ssc-cgl-2026-photo.jpg (FR-9.1). */
export function outputFilename(spec: PortalSpec, asset: AssetSpec, ext: string): string {
  const slug = `${spec.id}-${asset.id}`.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '');
  return `${slug.toLowerCase()}.${ext}`;
}

/** Pre-filled GitHub issue URL for FR-1.6. */
export function reportChangeUrl(spec: PortalSpec, asset?: AssetSpec): string {
  const params = new URLSearchParams({
    template: 'spec_change.yml',
    title: `[spec] ${spec.portal} ${spec.form}: rules changed`,
    spec: spec.id,
  });
  if (asset) params.set('asset', asset.id);
  return `https://github.com/guru-bharadwaj20/FormReady/issues/new?${params.toString()}`;
}
