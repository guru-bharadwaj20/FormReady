<script lang="ts">
  import { i18n } from '../i18n.svelte.js';

  const id = 'lang-select';

  function onChange(e: Event) {
    void i18n.setLocale((e.currentTarget as HTMLSelectElement).value);
  }
</script>

<label class="switcher">
  <span class="visually-hidden">{i18n.t('lang.label')}</span>
  <select
    {id}
    class="field"
    value={i18n.locale}
    onchange={onChange}
    aria-label={i18n.t('lang.label')}
  >
    {#each i18n.locales as l (l.code)}
      <option value={l.code} lang={l.code}>{l.native}</option>
    {/each}
  </select>
</label>

<style>
  .switcher .field {
    width: auto;
    min-height: 2.25rem;
    padding: 0.25rem 0.5rem;
    background: var(--paper);
  }
</style>
