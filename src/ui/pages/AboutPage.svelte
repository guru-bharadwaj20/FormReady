<script lang="ts">
  import { i18n } from '../i18n.svelte.js';

  const repo = 'https://github.com/guru-bharadwaj20/FormReady';
  const version = __APP_VERSION__;
</script>

<div class="about">
  <h1>{i18n.t('app.title')} <span class="mono muted v">v{version}</span></h1>
  <p>{i18n.t('app.tagline')}</p>
  <p>{i18n.t('app.privacy')}</p>

  <h2>How it works</h2>
  <ol>
    <li>
      Pick the portal and the thing you are uploading. Each portal has a spec file with the exact
      rules, read from the official notification.
    </li>
    <li>
      Drop your file. It is decoded and measured inside your browser: format, bytes, pixels, DPI
      tag, colour and, where supported, face framing and background.
    </li>
    <li>
      Press Fix. The image is cropped to the right shape, resized to the exact pixels, tagged with
      the required DPI and encoded until it lands inside the size window. PDFs are re-rendered page
      by page until they fit.
    </li>
    <li>Download. The file name is already in the shape most portals like.</li>
  </ol>

  <h2>Privacy</h2>
  <p>
    There is no server. The app is a static page that works offline after the first visit. It has no
    analytics, no cookies and no third-party scripts. The only outbound links are to official portal
    pages and the source code.
  </p>

  <h2>Open source</h2>
  <p>
    MIT licensed. Rules wrong or changed? Open an issue or send a pull request at
    <a href={repo} rel="noopener">{repo.replace('https://', '')}</a>.
  </p>
</div>

<style>
  .about {
    padding: 1.5rem 0 3rem;
    max-width: 70ch;
  }
  .v {
    font-size: 0.9rem;
    font-weight: 400;
  }
  ol {
    padding-inline-start: 1.25rem;
  }
  li {
    margin-bottom: 0.5rem;
  }
</style>
