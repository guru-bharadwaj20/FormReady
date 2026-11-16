<script lang="ts">
  import { i18n } from '../i18n.svelte.js';

  interface Props {
    accept?: string;
    multiple?: boolean;
    camera?: boolean;
    disabled?: boolean;
    onfiles: (files: File[]) => void;
  }
  let {
    accept = 'image/*,.pdf,.heic,.heif',
    multiple = false,
    camera = true,
    disabled = false,
    onfiles,
  }: Props = $props();

  let over = $state(false);
  let input: HTMLInputElement | undefined = $state();
  let cameraInput: HTMLInputElement | undefined = $state();

  function emit(list: FileList | null) {
    if (!list || list.length === 0) return;
    onfiles(multiple ? [...list] : [list[0] as File]);
  }
  function onDrop(e: DragEvent) {
    e.preventDefault();
    over = false;
    if (!disabled) emit(e.dataTransfer?.files ?? null);
  }
  function onChange(e: Event) {
    const el = e.currentTarget as HTMLInputElement;
    emit(el.files);
    el.value = '';
  }
</script>

<div
  class="zone"
  class:over
  class:disabled
  role="group"
  aria-label={i18n.t('drop.title')}
  ondragover={(e) => {
    e.preventDefault();
    over = true;
  }}
  ondragleave={() => (over = false)}
  ondrop={onDrop}
>
  <p class="title">{i18n.t('drop.title')}</p>
  <p class="hint muted">{i18n.t('drop.hint')}</p>
  <div class="actions">
    <button
      type="button"
      class="btn btn-primary"
      {disabled}
      onclick={() => input?.click()}
      data-testid="browse"
    >
      {i18n.t('drop.browse')}
    </button>
    {#if camera}
      <button type="button" class="btn" {disabled} onclick={() => cameraInput?.click()}>
        {i18n.t('drop.camera')}
      </button>
    {/if}
  </div>
  <input
    bind:this={input}
    class="visually-hidden"
    type="file"
    {accept}
    {multiple}
    onchange={onChange}
    data-testid="file-input"
    tabindex="-1"
  />
  {#if camera}
    <input
      bind:this={cameraInput}
      class="visually-hidden"
      type="file"
      accept="image/*"
      capture="environment"
      onchange={onChange}
      tabindex="-1"
    />
  {/if}
</div>

<style>
  .zone {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 0.25rem;
    padding: 2rem 1rem;
    border: 2px dashed var(--line);
    border-radius: var(--radius);
    background: var(--paper-2);
    transition: border-color 120ms ease;
  }
  .zone.over {
    border-color: var(--accent);
    background: var(--accent-soft);
  }
  .zone.disabled {
    opacity: 0.6;
  }
  .title {
    font-weight: 600;
    font-size: 1.1rem;
    margin: 0;
  }
  .hint {
    font-size: 0.9rem;
  }
  .actions {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    justify-content: center;
    margin-top: 0.5rem;
  }
</style>
