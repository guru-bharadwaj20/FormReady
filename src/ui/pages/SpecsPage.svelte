<script lang="ts">
  import { reportChangeUrl, specs, targetPixels } from '$lib/specs/registry.js';
  import type { AssetSpec } from '$lib/specs/types.js';
  import { formatBytes, formatRange } from '$lib/validate/format.js';
  import { i18n } from '../i18n.svelte.js';

  function rules(a: AssetSpec): string[] {
    const out = [a.formats.map((f) => f.toUpperCase()).join(' / ')];
    out.push(formatRange(a.size.minBytes, a.size.maxBytes, formatBytes));
    const px = targetPixels(a);
    if (px) out.push(`${px.width} × ${px.height} px`);
    if (a.physical)
      out.push(`${a.physical.widthMm} × ${a.physical.heightMm} mm @ ${a.physical.dpi} dpi`);
    if (a.dpi && !a.physical) out.push(`${a.dpi} dpi`);
    if (a.colour && a.colour !== 'any') out.push(a.colour);
    if (a.pdf?.maxPages) out.push(i18n.t('pdf.pages', { count: a.pdf.maxPages }));
    return out;
  }
</script>

<div class="specs">
  <h1>{i18n.t('nav.specs')}</h1>
  <p class="muted">{i18n.t('footer.specCount', { count: specs.length })}</p>

  {#each specs as s (s.id)}
    <details class="card">
      <summary>
        <span class="portal">{s.portal}</span>
        <span>{s.form}</span>
        <span class="muted small">{i18n.t(`portal.category.${s.category}`)}</span>
      </summary>
      <p class="small muted">
        {s.portalFullName} · {i18n.t('portal.lastVerified', { date: s.lastVerified })} ·
        <a href={s.sourceUrl} rel="noopener">{i18n.t('portal.source')}</a> ·
        <a href={reportChangeUrl(s)} rel="noopener">{i18n.t('portal.reportChange')}</a>
      </p>
      <table>
        <thead>
          <tr><th>{i18n.t('asset.choose')}</th><th>{i18n.t('report.expected')}</th></tr>
        </thead>
        <tbody>
          {#each s.assets as a (a.id)}
            <tr>
              <td
                ><strong>{a.label}</strong><br /><span class="muted small"
                  >{i18n.t(`asset.${a.kind}`)}</span
                ></td
              >
              <td class="mono small">{rules(a).join(' · ')}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </details>
  {/each}
</div>

<style>
  .specs {
    padding: 1.5rem 0 3rem;
    display: grid;
    gap: 0.6rem;
  }
  summary {
    display: flex;
    gap: 0.75rem;
    align-items: baseline;
    cursor: pointer;
    font-weight: 500;
  }
  .portal {
    font-weight: 700;
  }
  .small {
    font-size: 0.85rem;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 0.5rem;
  }
  th,
  td {
    text-align: start;
    vertical-align: top;
    padding: 0.4rem 0.5rem;
    border-top: 1px solid var(--line);
  }
  th {
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--ink-2);
  }
</style>
