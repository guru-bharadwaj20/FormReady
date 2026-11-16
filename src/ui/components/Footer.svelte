<script lang="ts">
  import { specs } from '$lib/specs/registry.js';
  import { i18n } from '../i18n.svelte.js';

  const repo = 'https://github.com/guru-bharadwaj20/FormReady';
</script>

<footer class="footer">
  <div class="container row">
    <span>{i18n.t('footer.noUpload')}</span>
    <span aria-hidden="true">·</span>
    <span>{i18n.t('footer.specCount', { count: specs.length })}</span>
    <span aria-hidden="true">·</span>
    <a href={repo} rel="noopener">{i18n.t('footer.openSource')}</a>
  </div>
</footer>

<style>
  .footer {
    margin-top: auto;
    border-top: 1px solid var(--line);
    color: var(--ink-2);
    font-size: 0.9rem;
  }
  .row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem 0.75rem;
    padding-top: 1rem;
    padding-bottom: 1.25rem;
  }
</style>
