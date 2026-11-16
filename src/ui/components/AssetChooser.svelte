<script lang="ts">
  import { targetPixels } from '$lib/specs/registry.js';
  import type { AssetSpec, PortalSpec } from '$lib/specs/types.js';
  import { formatBytes, formatRange } from '$lib/validate/format.js';
  import { i18n } from '../i18n.svelte.js';

  interface Props {
    spec: PortalSpec;
    selected?: AssetSpec;
    onselect: (asset: AssetSpec) => void;
  }
  let { spec, selected, onselect }: Props = $props();

  function summary(a: AssetSpec): string {
    const bits = [a.formats.map((f) => f.toUpperCase()).join('/')];
    bits.push(formatRange(a.size.minBytes, a.size.maxBytes, formatBytes));
    const px = targetPixels(a);
    if (px) bits.push(`${px.width}×${px.height}px`);
    if (a.pdf?.maxPages) bits.push(i18n.t('pdf.pages', { count: a.pdf.maxPages }));
    return bits.join(' · ');
  }
</script>

<section aria-labelledby="asset-heading">
  <h2 id="asset-heading">{i18n.t('asset.choose')}</h2>
  <div class="list" role="group" aria-labelledby="asset-heading">
    {#each spec.assets as a (a.id)}
      <button
        type="button"
        class="row"
        class:active={selected?.id === a.id}
        aria-pressed={selected?.id === a.id}
        onclick={() => onselect(a)}
        data-testid="asset-{a.id}"
      >
        <span class="kind">{i18n.t(`asset.${a.kind}`)}</span>
        <span class="label">{a.label}</span>
        <span class="rules mono muted">{summary(a)}</span>
      </button>
    {/each}
  </div>
  <p class="verify muted">
    {i18n.t('portal.lastVerified', { date: spec.lastVerified })} ·
    <a href={spec.sourceUrl} rel="noopener">{i18n.t('portal.source')}</a>
  </p>
</section>

<style>
  .list {
    display: grid;
    gap: 0.5rem;
  }
  .row {
    display: grid;
    grid-template-columns: 7rem 1fr;
    grid-template-areas:
      'kind label'
      'kind rules';
    gap: 0.1rem 0.75rem;
    align-items: center;
    padding: 0.65rem 0.85rem;
    text-align: start;
    background: var(--paper-2);
    border: 1px solid var(--line);
    border-radius: var(--radius);
    cursor: pointer;
  }
  .row:hover {
    border-color: var(--ink-3);
  }
  .row.active {
    border-color: var(--accent);
    box-shadow: inset 0 0 0 1px var(--accent);
    background: var(--accent-soft);
  }
  .kind {
    grid-area: kind;
    font-weight: 700;
  }
  .label {
    grid-area: label;
  }
  .rules {
    grid-area: rules;
    font-size: 0.8rem;
  }
  .verify {
    margin-top: 0.75rem;
    font-size: 0.85rem;
  }
  @media (max-width: 480px) {
    .row {
      grid-template-columns: 1fr;
      grid-template-areas: 'kind' 'label' 'rules';
    }
  }
</style>
