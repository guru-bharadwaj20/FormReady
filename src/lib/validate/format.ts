/** Human-readable formatting shared by the validator and the UI. */

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1000) return `${kb < 10 ? kb.toFixed(1) : Math.round(kb)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
}

export function formatRange(
  min: number | undefined,
  max: number,
  unit: (n: number) => string,
): string {
  return min === undefined || min === 0 ? `up to ${unit(max)}` : `${unit(min)} to ${unit(max)}`;
}

export function formatPercent(fraction: number): string {
  return `${Math.round(fraction * 100)}%`;
}

export function formatMm(widthMm: number, heightMm: number): string {
  const f = (n: number) => (Number.isInteger(n / 10) ? `${n / 10}` : `${(n / 10).toFixed(1)}`);
  return `${f(widthMm)} x ${f(heightMm)} cm`;
}
