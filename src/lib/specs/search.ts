import type { PortalSpec } from './types.js';

export interface SearchHit {
  spec: PortalSpec;
  score: number;
}

const normalise = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

function haystacks(spec: PortalSpec): string[] {
  return [
    spec.portal,
    spec.form,
    spec.portalFullName,
    `${spec.portal} ${spec.form}`,
    ...spec.aliases,
  ]
    .map(normalise)
    .filter(Boolean);
}

/**
 * Ranks specs for a free-text query. Exact alias match beats prefix match
 * beats token containment. Empty query returns everything in registry order.
 */
export function searchSpecs(all: readonly PortalSpec[], query: string, limit = 20): SearchHit[] {
  const q = normalise(query);
  if (!q) return all.slice(0, limit).map((spec) => ({ spec, score: 0 }));
  const tokens = q.split(' ');
  const hits: SearchHit[] = [];
  for (const spec of all) {
    const fields = haystacks(spec);
    let score = 0;
    for (const f of fields) {
      if (f === q) score = Math.max(score, 100);
      else if (f.startsWith(q)) score = Math.max(score, 80);
      else if (f.includes(q)) score = Math.max(score, 60);
    }
    if (score === 0) {
      const joined = fields.join(' | ');
      const matched = tokens.filter((t) => joined.includes(t)).length;
      if (matched === tokens.length) score = 40;
      else if (matched > 0) score = 10 * matched;
    }
    if (score > 0) hits.push({ spec, score });
  }
  return hits.sort((a, b) => b.score - a.score).slice(0, limit);
}
