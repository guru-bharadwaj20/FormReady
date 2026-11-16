<script lang="ts">
  import Footer from './ui/components/Footer.svelte';
  import Header from './ui/components/Header.svelte';
  import UpdateBanner from './ui/components/UpdateBanner.svelte';
  import { i18n } from './ui/i18n.svelte.js';
  import AboutPage from './ui/pages/AboutPage.svelte';
  import FixPage from './ui/pages/FixPage.svelte';
  import PdfPage from './ui/pages/PdfPage.svelte';
  import SpecsPage from './ui/pages/SpecsPage.svelte';
  import { router } from './ui/route.svelte.js';
  import { pwa } from './ui/pwa.svelte.js';

  $effect(() => {
    document.documentElement.lang = i18n.locale;
    document.documentElement.dir = i18n.dir;
  });
</script>

<a class="skip" href="#main">{i18n.t('a11y.skipToContent')}</a>
<Header />
<main id="main" class="container" tabindex="-1">
  {#if router.current === 'pdf'}
    <PdfPage />
  {:else if router.current === 'specs'}
    <SpecsPage />
  {:else if router.current === 'about'}
    <AboutPage />
  {:else}
    <FixPage />
  {/if}
</main>
<Footer />
<UpdateBanner
  offlineReady={pwa.offlineReady}
  needRefresh={pwa.needRefresh}
  onreload={() => pwa.update()}
  ondismiss={() => pwa.dismiss()}
/>

<style>
  .skip {
    position: absolute;
    top: -100px;
    left: 0.5rem;
    z-index: 100;
    padding: 0.5rem 0.75rem;
    background: var(--accent);
    color: var(--accent-ink);
    border-radius: var(--radius-sm);
  }
  .skip:focus {
    top: 0.5rem;
  }
  main {
    flex: 1;
    outline: none;
  }
</style>
