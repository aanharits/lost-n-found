<script lang="ts">
  import type { Item } from '$lib/stores/items.js';
  import { draggable } from '$lib/actions/draggable.js';
  import { fly } from 'svelte/transition';

  let { item, onClaim, onReviewClaims, onDragEnd }: {
    item: Item;
    onClaim: () => void;
    onReviewClaims: () => void;
    onDragEnd: (x: number, y: number) => void;
  } = $props();

  let isMobile = $state(false);

  // Deteksi tampilan mobile layar kecil
  $effect(() => {
    isMobile = window.innerWidth < 768;
  });

  // State turunan untuk styling header dan status klaim
  const headerClass = $derived(item.type === 'found' ? 'found' : '');
  const headerText = $derived(item.type === 'found' ? 'KETEMU' : 'HILANG');
  const pendingClaims = $derived((item.claims || []).filter((c) => c.status === 'pending'));
</script>

<div
  class="item-card mc-block {item.resolved ? 'resolved-card' : ''}"
  id={item.id}
  style="left: {item.x}px; top: {item.y}px;"
  use:draggable={{ itemId: item.id, containerId: 'board-container', onDragEnd }}
  transition:fly={{ y: -30, duration: 400 }}
>
  <!-- Badge jumlah klaim yang menunggu persetujuan -->
  {#if pendingClaims.length > 0}
    <button
      class="claim-badge"
      onclick={(e) => { e.stopPropagation(); onReviewClaims(); }}
      type="button"
    >
      {pendingClaims.length} Klaim
    </button>
  {/if}

  <!-- Pita penanda barang sudah berhasil diselesaikan -->
  {#if item.resolved}
    <div class="resolved-ribbon font-pixel">SELESAI</div>
  {/if}

  <div class="card-header font-pixel text-[10px] {headerClass}">{headerText}</div>
  <div class="card-image">{item.icon}</div>
  <div class="p-2 bg-gray-100 flex-grow flex flex-col justify-between">
    <div>
      <p class="font-bold text-[15px] leading-tight truncate">{item.title}</p>
      <p class="text-[9px] text-gray-500 font-bold mb-1">{item.date || '-'} | {item.time || '-'}</p>
      <p class="text-xs text-gray-700 truncate leading-tight">{item.desc}</p>
    </div>
    {#if item.resolved}
      <button
        disabled
        class="mc-btn bg-gray-400 text-gray-600 text-xs py-1 mt-1 w-full rounded font-bold cursor-not-allowed"
        style="box-shadow:none;"
      >
        Sudah Diklaim
      </button>
    {:else}
      <button
        onclick={onClaim}
        class="mc-btn bg-blue-300 text-black text-xs py-1 mt-1 w-full rounded font-bold"
      >
        Klaim Barang Ini
      </button>
    {/if}
  </div>
</div>
