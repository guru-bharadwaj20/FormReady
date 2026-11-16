<script lang="ts">
  import { i18n } from '../i18n.svelte.js';

  interface Props {
    offlineReady?: boolean;
    needRefresh?: boolean;
    onreload?: () => void;
    ondismiss?: () => void;
  }
  let { offlineReady = false, needRefresh = false, onreload, ondismiss }: Props = $props();
</script>

{#if needRefresh || offlineReady}
  <div class="banner" role="status" aria-live="polite">
    <span>{needRefresh ? i18n.t('offline.update') : i18n.t('offline.ready')}</span>
    {#if needRefresh}
      <button class="btn btn-primary" onclick={onreload}>{i18n.t('offline.reload')}</button>
    {/if}
    <button class="btn btn-ghost" onclick={ondismiss} aria-label="Dismiss">×</button>
  </div>
{/if}

<style>
  .banner {
    position: fixed;
    inset-inline: 1rem;
    bottom: 1rem;
    z-index: 20;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    max-width: 30rem;
    margin-inline: auto;
    padding: 0.6rem 0.6rem 0.6rem 1rem;
    background: var(--paper-2);
    border: 1px solid var(--line);
    border-radius: var(--radius);
    box-shadow: var(--shadow);
  }
  .banner span {
    flex: 1;
  }
  .btn {
    min-height: 2.25rem;
  }
</style>
