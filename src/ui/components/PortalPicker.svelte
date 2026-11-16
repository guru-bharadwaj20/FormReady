<script lang="ts">
  import { specs } from '$lib/specs/registry.js';
  import { searchSpecs } from '$lib/specs/search.js';
  import type { PortalSpec } from '$lib/specs/types.js';
  import { i18n } from '../i18n.svelte.js';

  interface Props {
    selected?: PortalSpec;
    onselect: (spec: PortalSpec) => void;
  }
  let { selected, onselect }: Props = $props();

  let query = $state('');
  const hits = $derived(searchSpecs(specs, query, 40));
  const grouped = $derived.by(() => {
    const groups: { category: PortalSpec['category']; list: PortalSpec[] }[] = [];
    for (const { spec } of hits) {
      const g = groups.find((x) => x.category === spec.category);
      if (g) g.list.push(spec);
      else groups.push({ category: spec.category, list: [spec] });
    }
    return groups;
  });

  const requestUrl =
    'https://github.com/guru-bharadwaj20/FormReady/issues/new?template=portal_request.yml';
</script>

<section class="picker" aria-labelledby="portal-heading">
  <h2 id="portal-heading">{i18n.t('portal.search')}</h2>
  <input
    class="field"
    type="search"
    bind:value={query}
    placeholder={i18n.t('portal.searchPlaceholder')}
    aria-label={i18n.t('portal.search')}
    autocomplete="off"
    data-testid="portal-search"
  />

  {#if hits.length === 0}
    <p class="muted empty">
      {i18n.t('portal.noResults')}
      <a href={requestUrl} rel="noopener">{i18n.t('portal.requestNew')}</a>
    </p>
  {:else}
    {#each grouped as { category, list } (category)}
      <h3 class="cat">{i18n.t(`portal.category.${category}`)}</h3>
      <ul class="grid" role="list">
        {#each list as spec (spec.id)}
          <li>
            <button
              type="button"
              class="tile"
              class:active={selected?.id === spec.id}
              aria-pressed={selected?.id === spec.id}
              onclick={() => onselect(spec)}
              data-testid="portal-{spec.id}"
            >
              <span class="portal">{spec.portal}</span>
              <span class="form">{spec.form}</span>
              <span class="meta muted">{spec.season ?? spec.portalFullName}</span>
            </button>
          </li>
        {/each}
      </ul>
    {/each}
  {/if}
</section>

<style>
  .picker .field {
    margin-bottom: 1rem;
    font-size: 1.05rem;
  }
  .cat {
    margin: 1rem 0 0.5rem;
    color: var(--ink-2);
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
  .grid {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(12rem, 1fr));
    gap: 0.6rem;
  }
  .tile {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.1rem;
    padding: 0.7rem 0.85rem;
    text-align: start;
    background: var(--paper-2);
    border: 1px solid var(--line);
    border-radius: var(--radius);
    cursor: pointer;
  }
  .tile:hover {
    border-color: var(--ink-3);
  }
  .tile.active {
    border-color: var(--accent);
    box-shadow: inset 0 0 0 1px var(--accent);
    background: var(--accent-soft);
  }
  .portal {
    font-weight: 700;
  }
  .form {
    font-size: 0.95rem;
  }
  .meta {
    font-size: 0.8rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 100%;
  }
  .empty {
    padding: 1rem 0;
  }
</style>
