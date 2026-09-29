<script lang="ts">
  import { getItemAsset } from '$lib/constants/itemAssets.js';

  let {
    tag = 'lainnya',
    size = 48,
    className = '',
    fallback = '📦',
    title = ''
  }: {
    tag?: string;
    size?: number;
    className?: string;
    fallback?: string;
    title?: string;
  } = $props();

  let imgFailed = $state(false);

  // Reset status error ketika tag atau judul berubah
  $effect(() => {
    tag;
    title;
    imgFailed = false;
  });

  const assetSrc = $derived(getItemAsset(tag, title));
</script>

<div
  class="tag-icon-container inline-flex items-center justify-center select-none shrink-0 {className}"
  style="width: {size}px; height: {size}px;"
>
  {#if assetSrc && !imgFailed}
    <img
      src={assetSrc}
      alt={tag || 'Item icon'}
      class="tag-icon-img"
      style="width: {size}px; height: {size}px; max-width: 100%; max-height: 100%; object-fit: contain;"
      loading="lazy"
      onerror={() => (imgFailed = true)}
    />
  {:else if fallback && fallback !== '📦'}
    <span class="text-2xl leading-none flex items-center justify-center" style="font-size: {Math.max(14, size * 0.55)}px;">
      {fallback}
    </span>
  {:else}
    <!-- Mystery Box Fallback bila aset belum terdaftar -->
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="pixel-art">
      <rect x="4" y="4" width="16" height="16" rx="2" fill="#eab308" stroke="#0f172a" stroke-width="2" />
      <path d="M10 8a2 2 0 114 0c0 1.5-2 1.5-2 3v1" stroke="#0f172a" stroke-width="2" stroke-linecap="round" />
      <circle cx="12" cy="15.5" r="1" fill="#0f172a" />
    </svg>
  {/if}
</div>

<style>
  .tag-icon-container {
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }
  .tag-icon-img {
    image-rendering: -webkit-optimize-contrast;
    image-rendering: crisp-edges;
    display: block;
    user-select: none;
    -webkit-user-drag: none;
    pointer-events: none;
  }
  .pixel-art {
    shape-rendering: crispEdges;
  }
</style>
