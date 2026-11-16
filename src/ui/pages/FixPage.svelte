<script lang="ts">
  import { reportChangeUrl } from '$lib/specs/registry.js';
  import type { AssetSpec, PortalSpec } from '$lib/specs/types.js';
  import { formatBytes } from '$lib/validate/format.js';
  import AssetChooser from '../components/AssetChooser.svelte';
  import DropZone from '../components/DropZone.svelte';
  import PortalPicker from '../components/PortalPicker.svelte';
  import Report from '../components/Report.svelte';
  import {
    download,
    errorKey,
    fixFile,
    inspectFile,
    type Fixed,
    type Inspection,
  } from '../fixer.js';
  import { i18n } from '../i18n.svelte.js';

  const LARGE_FILE = 12 * 1024 * 1024;

  let spec = $state.raw<PortalSpec | undefined>();
  let asset = $state.raw<AssetSpec | undefined>();
  let file = $state<File | undefined>();
  let before = $state.raw<Inspection | undefined>();
  let after = $state.raw<Fixed | undefined>();
  let busy = $state(false);
  let error = $state<string | undefined>();
  let notice = $state<string | undefined>();
  let copied = $state(false);

  function revoke(x: Inspection | undefined) {
    if (x?.previewUrl) URL.revokeObjectURL(x.previewUrl);
  }

  function reset() {
    revoke(before);
    revoke(after);
    file = before = after = error = notice = undefined;
    busy = false;
  }

  function selectSpec(s: PortalSpec) {
    spec = s;
    asset = s.assets.length === 1 ? s.assets[0] : undefined;
    reset();
  }

  function selectAsset(a: AssetSpec) {
    asset = a;
    reset();
  }

  async function onFiles(files: File[]) {
    const f = files[0];
    if (!f || !asset) return;
    reset();
    file = f;
    if (f.size > LARGE_FILE) notice = i18n.t('drop.tooLarge', { size: formatBytes(f.size) });
    busy = true;
    try {
      before = await inspectFile(f, asset);
    } catch (e) {
      const k = errorKey(e);
      error = i18n.t(k.key, k.params);
      console.error(e);
    } finally {
      busy = false;
    }
  }

  async function onFix() {
    if (!file || !spec || !asset || !before) return;
    busy = true;
    error = undefined;
    try {
      revoke(after);
      after = await fixFile(file, spec, asset, before);
    } catch (e) {
      const k = errorKey(e);
      error = i18n.t(k.key, k.params);
      console.error(e);
    } finally {
      busy = false;
    }
  }

  function onDownload() {
    if (after) download(after.blob, after.filename);
  }

  async function copyName() {
    if (!after) return;
    try {
      await navigator.clipboard.writeText(after.filename);
      copied = true;
      setTimeout(() => (copied = false), 1500);
    } catch {
      // Clipboard may be blocked; the name is visible on screen anyway.
    }
  }
</script>

<div class="fix">
  <section class="hero">
    <h1>{i18n.t('app.tagline')}</h1>
    <p class="muted">{i18n.t('app.privacy')}</p>
  </section>

  <div class="step">
    <PortalPicker selected={spec} onselect={selectSpec} />
  </div>

  {#if spec}
    <div class="step">
      <AssetChooser {spec} selected={asset} onselect={selectAsset} />
    </div>
  {/if}

  {#if spec && asset}
    <div class="step">
      <DropZone onfiles={onFiles} disabled={busy} camera={asset.kind === 'photo'} />
      {#if notice}<p class="muted small">{notice}</p>{/if}
    </div>
  {/if}

  {#if busy}
    <p class="working" role="status" aria-live="polite">
      <span class="spinner" aria-hidden="true"></span>
      {i18n.t('action.working')}
    </p>
  {/if}

  {#if error}
    <div class="error card" role="alert" data-testid="error">
      <p>{error}</p>
      <button class="btn" onclick={reset}>{i18n.t('action.retry')}</button>
    </div>
  {/if}

  {#if before && spec && asset}
    <div class="compare">
      <Report
        report={before.report}
        title={i18n.t('report.before')}
        previewUrl={before.previewUrl}
        testid="before"
      />
      {#if after}
        <Report
          report={after.report}
          title={i18n.t('report.after')}
          previewUrl={after.previewUrl}
          testid="after"
        />
      {/if}
    </div>

    <div class="actions">
      {#if !after}
        <button class="btn btn-primary" onclick={onFix} disabled={busy} data-testid="fix">
          {i18n.t('action.fix')}
        </button>
      {:else}
        <button class="btn btn-primary" onclick={onDownload} data-testid="download">
          {i18n.t('action.download')}
        </button>
        <button class="btn" onclick={copyName}>
          {copied ? '✓' : ''}
          {i18n.t('action.copyName')}
        </button>
        <span class="mono muted filename" data-testid="filename">{after.filename}</span>
      {/if}
      <button class="btn btn-ghost" onclick={reset}>{i18n.t('action.startOver')}</button>
    </div>

    {#if asset.notes?.length}
      <ul class="notes muted">
        {#each asset.notes as n, i (i)}<li>{n}</li>{/each}
      </ul>
    {/if}
    <p class="small muted">
      <a href={reportChangeUrl(spec, asset)} rel="noopener">{i18n.t('portal.reportChange')}</a>
    </p>
  {/if}
</div>

<style>
  .fix {
    display: grid;
    gap: 1.75rem;
    padding: 1.5rem 0 3rem;
  }
  .hero h1 {
    max-width: 40ch;
  }
  .hero p {
    max-width: 60ch;
    margin: 0;
  }
  .compare {
    display: grid;
    gap: 1rem;
    grid-template-columns: repeat(auto-fit, minmax(18rem, 1fr));
    align-items: start;
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.6rem;
  }
  .filename {
    font-size: 0.85rem;
  }
  .working {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    margin: 0;
  }
  .spinner {
    width: 1rem;
    height: 1rem;
    border: 2px solid var(--line);
    border-top-color: var(--accent);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
  .error {
    border-color: var(--fail);
    background: var(--fail-soft);
  }
  .error p {
    margin-bottom: 0.75rem;
  }
  .notes {
    margin: 0;
    padding-inline-start: 1.25rem;
    font-size: 0.9rem;
  }
  .small {
    font-size: 0.85rem;
    margin: 0;
  }
</style>
