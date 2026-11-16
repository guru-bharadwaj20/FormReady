<script lang="ts">
  import type { Report } from '$lib/validate/index.js';
  import { i18n } from '../i18n.svelte.js';

  interface Props {
    report: Report;
    title: string;
    previewUrl?: string;
    testid?: string;
  }
  let { report, title, previewUrl, testid = 'report' }: Props = $props();

  const statusLabel: Record<string, string> = {
    pass: 'a11y.statusPass',
    fail: 'a11y.statusFail',
    warn: 'a11y.statusWarn',
    skip: 'a11y.statusSkip',
  };
  const glyph: Record<string, string> = { pass: '✓', fail: '✕', warn: '!', skip: '–' };
</script>

<section class="report card" aria-label={title} data-testid={testid}>
  <header class="head">
    <h3>{title}</h3>
    <span
      class="verdict"
      class:ok={report.compliant}
      data-testid="{testid}-verdict"
      data-compliant={report.compliant}
    >
      {report.compliant ? i18n.t('report.compliant') : i18n.t('report.notCompliant')}
    </span>
  </header>

  {#if previewUrl}
    <img class="preview" src={previewUrl} alt="" />
  {/if}

  <ul class="checks" role="list">
    {#each report.checks as c (c.id)}
      <li class="check {c.status}">
        <span class="glyph" aria-hidden="true">{glyph[c.status]}</span>
        <span class="visually-hidden">{i18n.t(statusLabel[c.status] ?? '')}:</span>
        <span class="body">
          <span class="label">
            {i18n.t(`check.label.${c.id}`)}
            {#if c.advisory}<span class="adv">{i18n.t('report.advisory')}</span>{/if}
          </span>
          <span class="msg">{i18n.t(c.messageKey, c.params)}</span>
        </span>
      </li>
    {/each}
  </ul>

  {#if report.warnings > 0}
    <p class="warnings muted">{i18n.t('report.warnings', { count: report.warnings })}</p>
  {/if}
</section>

<style>
  .head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }
  .head h3 {
    margin: 0;
  }
  .verdict {
    padding: 0.2rem 0.6rem;
    border-radius: 999px;
    font-size: 0.85rem;
    font-weight: 600;
    background: var(--fail-soft);
    color: var(--fail);
  }
  .verdict.ok {
    background: var(--pass-soft);
    color: var(--pass);
  }
  .preview {
    display: block;
    max-width: 100%;
    max-height: 14rem;
    margin: 0.25rem auto 0.75rem;
    border: 1px solid var(--line);
    background: #fff;
  }
  .checks {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 0.35rem;
  }
  .check {
    display: grid;
    grid-template-columns: 1.5rem 1fr;
    gap: 0.5rem;
    align-items: start;
    padding: 0.4rem 0.5rem;
    border-radius: var(--radius-sm);
    background: var(--paper);
  }
  .glyph {
    display: inline-grid;
    place-items: center;
    width: 1.5rem;
    height: 1.5rem;
    border-radius: 50%;
    font-weight: 800;
    font-size: 0.8rem;
  }
  .pass .glyph {
    background: var(--pass-soft);
    color: var(--pass);
  }
  .fail .glyph {
    background: var(--fail-soft);
    color: var(--fail);
  }
  .warn .glyph {
    background: var(--warn-soft);
    color: var(--warn);
  }
  .skip .glyph {
    background: var(--skip-soft);
    color: var(--skip);
  }
  .body {
    display: flex;
    flex-direction: column;
  }
  .label {
    font-weight: 600;
    font-size: 0.9rem;
  }
  .adv {
    margin-inline-start: 0.4rem;
    font-weight: 500;
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--ink-3);
  }
  .msg {
    font-size: 0.9rem;
    color: var(--ink-2);
  }
  .warnings {
    margin: 0.75rem 0 0;
    font-size: 0.85rem;
  }
</style>
