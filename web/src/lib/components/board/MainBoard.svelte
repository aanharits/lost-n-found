<script lang="ts">
  import { fade } from 'svelte/transition';
  import { onMount } from 'svelte';
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
  let boardWidth = $state(1024);
  let boardHeight = $state(520);
  let currentPage = $state(0);

  // Item yang tampil di board publik (expired masuk arsip, resolved sudah selesai)
  const publicItems = $derived(
    $items.filter((i) => i.status !== 'expired' && i.status !== 'resolved')
  );

  // Layout paginated: kartu mengisi grid lalu pindah halaman ke samping
  const layout = $derived(calculateGridLayout(boardWidth, boardHeight));

  const totalPages = $derived(
    Math.max(1, Math.ceil(publicItems.length / layout.perPage))
  );

  // Jaga agar halaman tetap valid bila jumlah item berubah
  $effect(() => {
    if (currentPage > totalPages - 1) currentPage = totalPages - 1;
    if (currentPage < 0) currentPage = 0;
  });

  // Ekstrak angka urutan dari id item (timestamp di akhir id) untuk sort.
  // Item terbaru diletakkan lebih dulu agar selalu tampil di halaman pertama.
  function orderKey(id: string): number {
    const m = id.match(/(\d+)(?!.*\d)/);
    return m ? Number(m[1]) : 0;
  }

  // Susun ulang posisi SELURUH item publik ke grid paginated.
  // Halaman disimpan pada koordinat x (offset = halaman * lebar papan).
  function layoutItems(list: typeof $items): typeof $items {
    const visible = list.filter(
      (i) => i.status !== 'expired' && i.status !== 'resolved'
    );
    // Urutkan: terbaru dulu -> hsl pertama terisi lebih dulu (halaman pertama)
    const ordered = [...visible].sort((a, b) => orderKey(b.id) - orderKey(a.id));

    const posMap = new Map<string, { x: number; y: number }>();
    ordered.forEach((item, idx) => {
      posMap.set(item.id, layout.getPos(idx));
    });

    return list.map((item) => {
      const pos = posMap.get(item.id);
      return pos ? { ...item, ...pos } : item;
    });
  }

  // Auto-susun saat daftar item atau ukuran papan berubah (bukan saat drag)
  let lastLayoutKey = '';
  $effect(() => {
    const key = `${publicItems.map((i) => i.id).join(',')}|${boardWidth}x${boardHeight}`;
    if (key === lastLayoutKey) return;
    lastLayoutKey = key;
    items.update((current) => layoutItems(current));
  });

  // Halaman dari item berdasarkan koordinat x-nya
  function pageOf(x: number): number {
    return Math.floor(x / layout.pageWidth);
  }

  // Saat login, langsung arahkan ke halaman yang memuat item milik player
  let jumpedToOwn = false;
  $effect(() => {
    const npm = $currentPlayer?.npm;
    if (jumpedToOwn || !npm) return;
    const own = publicItems.find((i) => i.reporterNpm === npm);
    if (own) {
      jumpedToOwn = true;
      currentPage = Math.max(0, Math.min(totalPages - 1, pageOf(own.x)));
    }
  });

  // Susun ulang manual (tombol RAPIHKAN) + broadcast ke client lain
  function organizeBoard() {
    currentPage = 0;
    items.update((current) => {
      const updated = layoutItems(current);
      const socket = getSocket();
      if (socket?.connected) {
        socket.emit(
          'items_organize',
          updated
            .filter((i) => i.status !== 'expired' && i.status !== 'resolved')
            .map((i) => ({ id: i.id, x: i.x, y: i.y }))
        );
      }
      return updated;
    });
  }

  // Navigasi halaman
  function prevPage() {
    if (currentPage > 0) currentPage--;
  }
  function nextPage() {
    if (currentPage < totalPages - 1) currentPage++;
  }

  // Swipe horizontal di area kosong papan untuk pindah halaman
  let swipeStartX: number | null = null;
  function onPagerPointerDown(e: PointerEvent) {
    // Abaikan jika mulai dari kartu (drag) atau tombol
    if ((e.target as HTMLElement).closest('.item-card')) return;
    if ((e.target as HTMLElement).closest('button')) return;
    swipeStartX = e.clientX;
  }
  function onPagerPointerUp(e: PointerEvent) {
    if (swipeStartX === null) return;
    const dx = e.clientX - swipeStartX;
    swipeStartX = null;
    if (Math.abs(dx) < 60) return; // terlalu kecil, bukan swipe
    if (dx < 0) nextPage();
    else prevPage();
  }

  // Ukur dimensi papan agar jumlah kolom & baris akurat
  onMount(() => {
    const measure = () => {
      if (!boardContainer) return;
      boardWidth = boardContainer.offsetWidth || boardWidth;
      boardHeight = boardContainer.offsetHeight || boardHeight;
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (boardContainer) ro.observe(boardContainer);
    window.addEventListener('resize', measure);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  });

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

      <!-- Area render kartu barang (paginated / swipe).
           Item 'expired' disembunyikan (masuk arsip Satpam), dan item 'resolved'
           (sudah selesai/dikembalikan) otomatis hilang dari board publik.
           Data tetap tersimpan di database & tetap terlihat di arsip Satpam.
           Jika melebihi kapasitas 1 halaman, papan bergeser ke samping. -->
      <div
        id="cards-area"
        class="cards-area board-pager"
        role="presentation"
        onpointerdown={onPagerPointerDown}
        onpointerup={onPagerPointerUp}
      >
        <div
          class="cards-track"
          style="transform: translateX(-{currentPage * layout.pageWidth}px);"
        >
          {#each publicItems as item (item.id)}
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
      </div>

      <!-- Navigasi halaman (hanya muncul jika lebih dari 1 halaman) -->
      {#if totalPages > 1}
        <button
          type="button"
          onclick={prevPage}
          disabled={currentPage === 0}
          aria-label="Halaman sebelumnya"
          class="absolute left-2 top-1/2 -translate-y-1/2 z-30 w-10 h-10 flex items-center justify-center bg-[#facc15] hover:bg-[#eab308] border-2 border-[#1c120c] rounded-full shadow-[2px_2px_0_#1c120c] active:translate-y-[calc(-50%+2px)] active:shadow-none cursor-pointer disabled:opacity-30 disabled:cursor-default font-pixel text-[14px] text-[#1c120c]"
        >
          ‹
        </button>
        <button
          type="button"
          onclick={nextPage}
          disabled={currentPage >= totalPages - 1}
          aria-label="Halaman berikutnya"
          class="absolute right-2 top-1/2 -translate-y-1/2 z-30 w-10 h-10 flex items-center justify-center bg-[#facc15] hover:bg-[#eab308] border-2 border-[#1c120c] rounded-full shadow-[2px_2px_0_#1c120c] active:translate-y-[calc(-50%+2px)] active:shadow-none cursor-pointer disabled:opacity-30 disabled:cursor-default font-pixel text-[14px] text-[#1c120c]"
        >
          ›
        </button>

        <!-- Indikator halaman + titik -->
        <div
          class="absolute bottom-4 right-4 z-30 flex items-center gap-2 bg-white/90 border-2 border-[#1c120c] rounded-full px-3 py-1 shadow-[2px_2px_0_#1c120c] select-none"
        >
          <button
            type="button"
            onclick={prevPage}
            disabled={currentPage === 0}
            class="font-pixel text-[9px] text-[#1c120c] cursor-pointer disabled:opacity-30"
          >‹</button>
          <span class="font-pixel text-[8px] text-[#1c120c] font-bold">
            {currentPage + 1}/{totalPages}
          </span>
          <button
            type="button"
            onclick={nextPage}
            disabled={currentPage >= totalPages - 1}
            class="font-pixel text-[9px] text-[#1c120c] cursor-pointer disabled:opacity-30"
          >›</button>
          <span class="flex items-center gap-1 ml-1">
            {#each Array(totalPages) as _, i}
              <button
                type="button"
                onclick={() => (currentPage = i)}
                aria-label="Ke halaman {i + 1}"
                class="w-2 h-2 rounded-full border border-[#1c120c] cursor-pointer {i === currentPage ? 'bg-[#2563eb]' : 'bg-stone-300'}"
              ></button>
            {/each}
          </span>
        </div>
      {/if}

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
