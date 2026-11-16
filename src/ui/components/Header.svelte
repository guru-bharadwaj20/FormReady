<script lang="ts">
  import { i18n } from '../i18n.svelte.js';
  import { router, type Route } from '../route.svelte.js';
  import LanguageSwitcher from './LanguageSwitcher.svelte';

  const items: { route: Route; key: string }[] = [
    { route: 'fix', key: 'nav.fix' },
    { route: 'pdf', key: 'nav.pdf' },
    { route: 'specs', key: 'nav.specs' },
    { route: 'about', key: 'nav.about' },
  ];
</script>

<header class="header">
  <div class="container bar">
    <a class="brand" href={router.href('fix')} aria-label={i18n.t('app.title')}>
      <span class="mark" aria-hidden="true">FR</span>
      <span class="name">{i18n.t('app.title')}</span>
    </a>
    <nav aria-label="Primary">
      <ul>
        {#each items as item (item.route)}
          <li>
            <a
              href={router.href(item.route)}
              aria-current={router.current === item.route ? 'page' : undefined}
            >
              {i18n.t(item.key)}
            </a>
          </li>
        {/each}
      </ul>
    </nav>
    <LanguageSwitcher />
  </div>
</header>

<style>
  .header {
    border-bottom: 1px solid var(--line);
    background: var(--paper);
    position: sticky;
    top: 0;
    z-index: 10;
  }
  .bar {
    display: flex;
    align-items: center;
    gap: 1rem;
    min-height: 3.5rem;
    flex-wrap: wrap;
  }
  .brand {
    display: inline-flex;
    align-items: center;
    gap: 0.6rem;
    text-decoration: none;
    font-weight: 700;
    font-size: 1.1rem;
  }
  .mark {
    display: inline-grid;
    place-items: center;
    width: 2rem;
    height: 2rem;
    border-radius: 7px;
    background: var(--accent);
    color: var(--accent-ink);
    font-size: 0.8rem;
    font-weight: 800;
    letter-spacing: 0.02em;
  }
  nav {
    flex: 1;
  }
  ul {
    display: flex;
    gap: 0.25rem;
    list-style: none;
    margin: 0;
    padding: 0;
    flex-wrap: wrap;
  }
  nav a {
    display: inline-block;
    padding: 0.45rem 0.7rem;
    border-radius: var(--radius-sm);
    text-decoration: none;
    color: var(--ink-2);
  }
  nav a:hover {
    background: var(--paper-2);
    color: var(--ink);
  }
  nav a[aria-current='page'] {
    color: var(--ink);
    background: var(--accent-soft);
    font-weight: 600;
  }
  @media (max-width: 640px) {
    nav {
      order: 3;
      flex-basis: 100%;
      overflow-x: auto;
    }
  }
</style>
