<script lang="ts">
  import { formatBytes } from '$lib/validate/format.js';
  import { pdfWorker } from '$workers/index.js';
  import DropZone from '../components/DropZone.svelte';
  import { download, errorKey, readBytes } from '../fixer.js';
  import { i18n } from '../i18n.svelte.js';

  type Tool = 'compress' | 'merge' | 'split';
  const tools: Tool[] = ['compress', 'merge', 'split'];
  const limits = [100, 200, 300, 500, 1024, 2048] as const;

  let tool = $state<Tool>('compress');
  let files = $state<File[]>([]);
  let limitKb = $state<number>(500);
  let greyscale = $state(false);
  let ranges = $state('');
  let busy = $state(false);
  let error = $state<string | undefined>();
  let result = $state<{ blob: Blob; name: string; note: string } | undefined>();
  let parts = $state<{ blob: Blob; name: string }[]>([]);

  function pick(t: Tool) {
    tool = t;
    files = [];
    result = undefined;
    parts = [];
    error = undefined;
  }

  function onFiles(list: File[]) {
    files = tool === 'merge' ? [...files, ...list] : list.slice(0, 1);
    result = undefined;
    parts = [];
    error = undefined;
  }

  function stem(name: string): string {
    return name.replace(/\.[^.]+$/, '') || 'document';
  }

  async function run() {
    const first = files[0];
    if (!first) return;
    busy = true;
    error = undefined;
    result = undefined;
    parts = [];
    const pdf = pdfWorker();
    try {
      if (tool === 'compress') {
        const res = await pdf.request({
          kind: 'compress',
          bytes: await readBytes(first),
          maxBytes: limitKb * 1024,
          greyscale,
        });
        if (res.kind !== 'compress') return;
        result = {
          blob: new Blob([res.bytes as unknown as ArrayBuffer], { type: 'application/pdf' }),
          name: `${stem(first.name)}-${limitKb}kb.pdf`,
          note: `${formatBytes(res.bytes.byteLength)} · ${i18n.t('pdf.pages', { count: res.pages })} · ${res.dpi} dpi`,
        };
      } else if (tool === 'merge') {
        const inputs = await Promise.all(
          files.map(async (f) => ({ bytes: await readBytes(f), name: f.name })),
        );
        const res = await pdf.request({ kind: 'merge', files: inputs });
        if (res.kind !== 'merge') return;
        result = {
          blob: new Blob([res.bytes as unknown as ArrayBuffer], { type: 'application/pdf' }),
          name: `${stem(first.name)}-merged.pdf`,
          note: `${formatBytes(res.bytes.byteLength)} · ${i18n.t('pdf.pages', { count: res.pages })}`,
        };
      } else if (ranges.trim()) {
        const res = await pdf.request({
          kind: 'extract',
          bytes: await readBytes(first),
          ranges,
        });
        if (res.kind !== 'extract') return;
        result = {
          blob: new Blob([res.bytes as unknown as ArrayBuffer], { type: 'application/pdf' }),
          name: `${stem(first.name)}-pages.pdf`,
          note: `${formatBytes(res.bytes.byteLength)} · ${i18n.t('pdf.pages', { count: res.pages })}`,
        };
      } else {
        const res = await pdf.request({ kind: 'split', bytes: await readBytes(first) });
        if (res.kind !== 'split') return;
        parts = res.parts.map((p, i) => ({
          blob: new Blob([p as unknown as ArrayBuffer], { type: 'application/pdf' }),
          name: `${stem(first.name)}-p${i + 1}.pdf`,
        }));
      }
    } catch (e) {
      const k = errorKey(e);
      error =
        k.key === 'error.sizeUnreachable' && tool === 'split'
          ? i18n.t('pdf.rangesInvalid')
          : i18n.t(k.key, k.params);
      console.error(e);
    } finally {
      busy = false;
    }
  }
</script>

<div class="pdf">
  <h1>{i18n.t('pdf.title')}</h1>
  <p class="muted">{i18n.t('app.privacy')}</p>

  <div class="tabs" role="tablist" aria-label={i18n.t('pdf.title')}>
    {#each tools as t (t)}
      <button
        role="tab"
        class="tab"
        aria-selected={tool === t}
        class:active={tool === t}
        onclick={() => pick(t)}
        data-testid="pdf-tab-{t}"
      >
        {i18n.t(`pdf.${t}`)}
      </button>
    {/each}
  </div>

  <div class="panel" role="tabpanel">
    <DropZone
      onfiles={onFiles}
      multiple={tool === 'merge'}
      camera={false}
      accept={tool === 'merge' ? 'application/pdf,image/jpeg,image/png' : 'application/pdf'}
      disabled={busy}
    />

    {#if files.length}
      <ul class="files">
        {#each files as f, i (f.name + i)}
          <li class="mono">{f.name} <span class="muted">{formatBytes(f.size)}</span></li>
        {/each}
      </ul>
    {/if}

    {#if tool === 'compress'}
      <div class="opts">
        <label>
          {i18n.t('pdf.limit')}
          <select class="field" bind:value={limitKb}>
            {#each limits as kb (kb)}
              <option value={kb}>{kb >= 1024 ? `${kb / 1024} MB` : `${kb} KB`}</option>
            {/each}
          </select>
        </label>
        <label class="check">
          <input type="checkbox" bind:checked={greyscale} />
          {i18n.t('check.label.colour')}: {i18n.t('asset.document')} B/W
        </label>
      </div>
    {:else if tool === 'split'}
      <label class="opts">
        {i18n.t('pdf.ranges')}
        <input class="field" type="text" bind:value={ranges} placeholder="1-3, 5" />
      </label>
    {/if}

    <div class="actions">
      <button
        class="btn btn-primary"
        disabled={busy || files.length === 0}
        onclick={run}
        data-testid="pdf-run"
      >
        {i18n.t(`pdf.${tool}`)}
      </button>
      {#if busy}<span role="status">{i18n.t('action.working')}</span>{/if}
    </div>

    {#if error}
      <p class="error" role="alert">{error}</p>
    {/if}

    {#if result}
      <div class="result card" data-testid="pdf-result">
        <span class="mono">{result.name}</span>
        <span class="muted">{result.note}</span>
        <button
          class="btn btn-primary"
          onclick={() => result && download(result.blob, result.name)}
        >
          {i18n.t('action.download')}
        </button>
      </div>
    {/if}
    {#if parts.length}
      <ul class="parts">
        {#each parts as p (p.name)}
          <li>
            <span class="mono">{p.name}</span>
            <button class="btn" onclick={() => download(p.blob, p.name)}>
              {i18n.t('action.download')}
            </button>
          </li>
        {/each}
      </ul>
    {/if}
  </div>
</div>

<style>
  .pdf {
    padding: 1.5rem 0 3rem;
    display: grid;
    gap: 1rem;
  }
  .tabs {
    display: flex;
    gap: 0.25rem;
    border-bottom: 1px solid var(--line);
  }
  .tab {
    padding: 0.6rem 0.9rem;
    border: 0;
    border-bottom: 2px solid transparent;
    background: none;
    cursor: pointer;
    color: var(--ink-2);
  }
  .tab.active {
    color: var(--ink);
    border-bottom-color: var(--accent);
    font-weight: 600;
  }
  .panel {
    display: grid;
    gap: 1rem;
  }
  .files,
  .parts {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 0.4rem;
    font-size: 0.9rem;
  }
  .parts li {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
  }
  .opts {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    align-items: end;
  }
  .opts label,
  label.opts {
    display: grid;
    gap: 0.25rem;
  }
  .opts .field {
    width: auto;
  }
  .check {
    display: flex !important;
    align-items: center;
    gap: 0.5rem;
    min-height: 2.75rem;
  }
  .actions {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  .error {
    color: var(--fail);
  }
  .result {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.75rem;
  }
  .result .btn {
    margin-inline-start: auto;
  }
</style>
