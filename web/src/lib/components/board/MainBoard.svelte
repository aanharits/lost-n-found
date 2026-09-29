<script lang="ts">
  import { fade } from 'svelte/transition';
  import { items } from '$lib/stores/items.js';
  import { currentPlayer } from '$lib/stores/player.js';
  import {
    activeModal,
    claimTargetItemId,
    reviewTargetItemId,
    deleteTargetItemId,
  } from '$lib/stores/ui.js';
  import { highlight } from '$lib/stores/highlight.js';
  import { getSocket } from '$lib/socket.js';
  import ItemCard from './ItemCard.svelte';
  import ReportModal from './ReportModal.svelte';
  import ClaimModal from './ClaimModal.svelte';
  import ClaimsReviewModal from './ClaimsReviewModal.svelte';
  import DeleteItemModal from './DeleteItemModal.svelte';
  import SatpamChat from '../shared/SatpamChat.svelte';
  import CategoryGamepad from './CategoryGamepad.svelte';
  import { calculateGridLayout } from '$lib/utils/gridLayout.js';

  let boardContainer: HTMLElement;

  // Susun ulang posisi kartu ke dalam grid rapi
  function organizeBoard() {
    const boardWidth = boardContainer ? boardContainer.offsetWidth : 1024;
    const layout = calculateGridLayout(boardWidth);

    items.update((current) => {
      const filtered = current;

      const posMap = new Map<string, { x: number; y: number }>();
      filtered.forEach((item, index) => {
        const { x, y } = layout.getPos(index);
        posMap.set(item.id, { x, y });

        const el = document.getElementById(item.id);
        if (el) {
          el.style.left = `${x}px`;
          el.style.top = `${y}px`;
        }
      });

      const updated = current.map((item) => {
        const pos = posMap.get(item.id);
        return pos ? { ...item, x: pos.x, y: pos.y } : { ...item };
      });

      const socket = getSocket();
      if (socket?.connected) {
        socket.emit(
          'items_organize',
          updated.map((i) => ({ id: i.id, x: i.x, y: i.y }))
        );
      }

      return updated;
    });
  }

  function openReportModal() {
    activeModal.set('report');
  }

  function openClaimModal(itemId: string) {
    claimTargetItemId.set(itemId);
    activeModal.set('claim');
  }

  function openClaimsReview(itemId: string) {
    reviewTargetItemId.set(itemId);
    activeModal.set('claimsReview');
  }

  function openDeleteModal(itemId: string) {
    deleteTargetItemId.set(itemId);
    activeModal.set('deleteItem');
  }

  function onWindowClick(e: MouseEvent) {
    const target = e.target as HTMLElement;
    // Jika sedang aktif highlight dan user klik di luar tombol dan kartu, batalkan sorotan
    if ($highlight && !target.closest('button') && !target.closest('.item-card')) {
      highlight.clear();
    }
  }

  function handleItemDragEnd(itemId: string, x: number, y: number) {
    items.update((current) =>
      current.map((item) => (item.id === itemId ? { ...item, x, y } : item))
    );
  }
</script>

<svelte:window onclick={onWindowClick} />

<div
  class="board-scene w-full h-full max-w-5xl flex flex-col items-center justify-center pt-8 md:pt-4"
  transition:fade={{ duration: 300 }}
  style="animation: boardFadeIn 0.35s ease forwards;"
>
  <!-- Judul dan subjudul papan utama Mahasiswa -->
  <div class="text-center mb-3 z-10 select-none flex flex-col items-center">
    <h1
      class="text-3xl md:text-5xl font-pixel text-white mb-1 tracking-wider"
      style="text-shadow: 3px 3px 0 #1c120c, 5px 5px 0 rgba(0,0,0,0.3);"
    >
      L &amp; F KAMPUS
    </h1>
    <p
      class="text-xs md:text-sm font-pixel text-[#ffd700] font-bold tracking-widest"
      style="text-shadow: 1px 1px 0 #1c120c, 2px 2px 0 #1c120c;"
    >
      AI Image Match System
    </p>
  </div>

  <!-- Kontainer utama board -->
  <div class="relative w-full max-w-5xl flex-grow flex flex-col items-center">
    <!-- Gamepad kontrol kategori -->
    <CategoryGamepad />

    <!-- Area papan gabus (cork board) -->
    <div
      id="board-container"
      bind:this={boardContainer}
      class="board-container w-full flex-grow overflow-hidden relative cursor-default rounded-xl shadow-[8px_8px_0px_rgba(0,0,0,0.5)]"
    >
      <!-- Tombol aksi: Lapor & Rapihkan -->
      <div class="absolute top-4 left-4 z-20 flex gap-2">
        <button
          onclick={openReportModal}
          class="bg-[#22c55e] hover:bg-[#16a34a] active:translate-y-0.5 text-[#1c120c] font-pixel text-[9px] md:text-[10px] py-2 px-3.5 rounded border-2 border-[#1c120c] shadow-[2px_2px_0_#1c120c] active:shadow-none cursor-pointer transition-all select-none font-bold tracking-wider"
        >
          + LAPOR (AI)
        </button>
        <button
          onclick={organizeBoard}
          class="bg-[#facc15] hover:bg-[#eab308] active:translate-y-0.5 text-[#1c120c] font-pixel text-[9px] md:text-[10px] py-2 px-3.5 rounded border-2 border-[#1c120c] shadow-[2px_2px_0_#1c120c] active:shadow-none cursor-pointer transition-all select-none font-bold tracking-wider"
        >
          RAPIHKAN
        </button>
      </div>

      <!-- Filter status hilang / ketemu -->
      <div class="absolute top-4 right-4 z-20 flex bg-white border-2 border-[#1c120c] shadow-[2px_2px_0_#1c120c] rounded overflow-hidden select-none">
        <button
          type="button"
          onclick={() => highlight.toggleStatus('all')}
          class="px-3 py-1 font-pixel text-[8px] md:text-[9px] transition-all cursor-pointer font-bold
            {!$highlight?.itemType ? 'bg-[#2563eb] text-white' : 'bg-white text-[#1c120c] hover:bg-slate-100'}"
        >
          SEMUA
        </button>
        <button
          type="button"
          onclick={() => highlight.toggleStatus('lost')}
          class="px-3 py-1 font-pixel text-[8px] md:text-[9px] transition-all cursor-pointer font-bold border-l-2 border-r-2 border-[#1c120c]
            {$highlight?.itemType === 'lost' ? 'bg-[#dc2626] text-white ring-1 ring-inset ring-red-400' : 'bg-white text-[#1c120c] hover:bg-slate-100'}"
        >
          HILANG
        </button>
        <button
          type="button"
          onclick={() => highlight.toggleStatus('found')}
          class="px-3 py-1 font-pixel text-[8px] md:text-[9px] transition-all cursor-pointer font-bold
            {$highlight?.itemType === 'found' ? 'bg-[#16a34a] text-white ring-1 ring-inset ring-green-400' : 'bg-white text-[#1c120c] hover:bg-slate-100'}"
        >
          KETEMU
        </button>
      </div>

      <!-- Area render kartu barang -->
      <div id="cards-area" class="cards-area">
        {#each $items as item (item.id)}
          <ItemCard
            {item}
            currentPlayerNpm={$currentPlayer?.npm || ''}
            onClaim={() => openClaimModal(item.id)}
            onReviewClaims={() => openClaimsReview(item.id)}
            onDelete={() => openDeleteModal(item.id)}
            onDragEnd={(x, y) => handleItemDragEnd(item.id, x, y)}
          />
        {/each}
      </div>

      <!-- Area avatar Satpam AI -->
      <div class="avatars-area">
        <SatpamChat />
      </div>
    </div>
  </div>
</div>

<!-- Modal dialogs pelaporan, klaim, review, & hapus item -->
{#if $activeModal === 'report'}
  <ReportModal />
{/if}

{#if $activeModal === 'claim'}
  <ClaimModal />
{/if}

{#if $activeModal === 'claimsReview'}
  <ClaimsReviewModal />
{/if}

{#if $activeModal === 'deleteItem'}
  <DeleteItemModal />
{/if}
