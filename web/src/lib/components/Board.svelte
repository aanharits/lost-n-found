<script lang="ts">
  import { onMount } from 'svelte';
  import { fly, fade } from 'svelte/transition';
  import { items, type Item } from '$lib/stores/items.js';
  import { currentPlayer } from '$lib/stores/player.js';
  import { currentScene, currentFilter, socketConnected, onlineCount, activeModal, claimTargetItemId, reviewTargetItemId } from '$lib/stores/ui.js';
  import { getSocket } from '$lib/socket.js';
  import ItemCard from './ItemCard.svelte';
  import ReportModal from './ReportModal.svelte';
  import ClaimModal from './ClaimModal.svelte';
  import ClaimsReviewModal from './ClaimsReviewModal.svelte';
  import SatpamChat from './SatpamChat.svelte';

  let boardContainer: HTMLElement;

  // Filter daftar barang sesuai tab yang dipilih (all, lost, found)
  let filteredItems = $derived(
    $items.filter((item) => $currentFilter === 'all' || item.type === $currentFilter)
  );

  // Mengubah filter kategori tampilan barang
  function setFilter(type: 'all' | 'lost' | 'found') {
    currentFilter.set(type);
  }

  // Merapikan posisi seluruh kartu dalam susunan grid rapi dan broadcast ke user lain
  function organizeBoard() {
    const cardWidth = 140;
    const cardHeight = 175;
    const gapX = 20;
    const gapY = 25;

    const availableWidth = boardContainer ? boardContainer.offsetWidth - 40 : 800;
    const columns = Math.max(1, Math.floor(availableWidth / (cardWidth + gapX)));

    items.update((current) => {
      const filtered = current.filter(
        (item) => $currentFilter === 'all' || item.type === $currentFilter
      );

      const posMap = new Map<string, { x: number; y: number }>();
      filtered.forEach((item, index) => {
        const col = index % columns;
        const row = Math.floor(index / columns);
        const x = 20 + col * (cardWidth + gapX);
        const y = 70 + row * (cardHeight + gapY);
        posMap.set(item.id, { x, y });

        // Update DOM inline style langsung agar kartu beranimasi seketika
        const el = document.getElementById(item.id);
        if (el) {
          el.style.left = `${x}px`;
          el.style.top = `${y}px`;
        }
      });

      // Kembalikan objek item baru secara immutable agar Svelte 5 memperbarui state
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

  // Membuka modal form pelaporan barang
  function openReportModal() {
    activeModal.set('report');
  }

  // Membuka modal form pengajuan klaim untuk barang tertentu
  function openClaimModal(itemId: string) {
    claimTargetItemId.set(itemId);
    activeModal.set('claim');
  }

  // Membuka modal riwayat klaim pada barang tertentu
  function openClaimsReview(itemId: string) {
    reviewTargetItemId.set(itemId);
    activeModal.set('claimsReview');
  }

  // Keluar dari akun saat ini dan kembali ke lobby pemilihan karakter
  function switchUser() {
    currentPlayer.logout();
    currentScene.set('lobby');
  }

  // State dan aksi menu profil melayang di pojok kanan atas
  let isProfileOpen = $state(false);

  function toggleProfile() {
    isProfileOpen = !isProfileOpen;
  }

  function closeProfile() {
    isProfileOpen = false;
  }

  function onWindowClick(e: MouseEvent) {
    if (isProfileOpen && !(e.target as HTMLElement).closest('.profile-menu-container')) {
      isProfileOpen = false;
    }
  }

  // Menyimpan pembaruan koordinat posisi kartu setelah di-drag
  function handleItemDragEnd(itemId: string, x: number, y: number) {
    items.update((current) =>
      current.map((item) => (item.id === itemId ? { ...item, x, y } : item))
    );
  }
</script>

<svelte:window onclick={onWindowClick} />

<!-- Floating Minimalist Header: Status online di kiri atas & Logo profile di kanan atas -->
<div class="fixed top-3 left-3 right-3 z-30 flex justify-between items-center pointer-events-none">
  <!-- Indikator status live minimalis -->
  <div class="pointer-events-auto bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/20 px-3 py-1.5 rounded-full shadow-lg flex items-center gap-2 transition-all">
    <span class="relative flex h-2 w-2">
      <span class="{$socketConnected ? 'animate-ping' : ''} absolute inline-flex h-full w-full rounded-full {$socketConnected ? 'bg-emerald-400' : 'bg-red-400'} opacity-75"></span>
      <span class="relative inline-flex rounded-full h-2 w-2 {$socketConnected ? 'bg-emerald-500' : 'bg-red-500'}"></span>
    </span>
    <span class="font-pixel text-[8px] md:text-[9px] text-yellow-300">
      {$onlineCount} Online
    </span>
  </div>

  <!-- Logo Profil Minimalis Modern di Pojok Kanan Atas -->
  <div class="pointer-events-auto relative profile-menu-container">
    <button
      type="button"
      onclick={toggleProfile}
      class="bg-black/60 hover:bg-black/85 backdrop-blur-md border border-white/20 hover:border-white/40 px-2.5 py-1 rounded-full shadow-lg flex items-center gap-2 transition-all cursor-pointer select-none"
      aria-label="Profil Akun"
    >
      <!-- Avatar Circle Badge -->
      <div class="w-6 h-6 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 border border-black flex items-center justify-center text-black font-pixel text-[9px] font-bold shadow-inner">
        {($currentPlayer?.name || 'U').charAt(0).toUpperCase()}
      </div>

      <span class="font-pixel text-[9px] text-white max-w-[90px] md:max-w-[130px] truncate">
        {$currentPlayer?.name || 'Profil'}
      </span>

      <svg
        class="w-3 h-3 text-gray-300 transition-transform duration-200 {isProfileOpen ? 'rotate-180' : ''}"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7" />
      </svg>
    </button>

    <!-- Dropdown Menu Profil -->
    {#if isProfileOpen}
      <div
        class="absolute right-0 mt-2 w-64 bg-[#23170e]/95 backdrop-blur-md border-4 border-[#3e2612] shadow-[4px_4px_0px_rgba(0,0,0,0.6)] p-3.5 flex flex-col gap-2.5 text-white z-50 rounded"
        transition:fly={{ y: -8, duration: 150 }}
      >
        <!-- Informasi Identitas Akun -->
        <div class="flex items-center gap-2.5 pb-2.5 border-b-2 border-[#3e2612]">
          <div class="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 border-2 border-black flex items-center justify-center text-black font-pixel text-xs font-bold shrink-0 shadow">
            {($currentPlayer?.name || 'U').charAt(0).toUpperCase()}
          </div>
          <div class="flex flex-col min-w-0">
            <p class="font-pixel text-[10px] text-yellow-300 truncate">
              {$currentPlayer?.name || 'Mahasiswa'}
            </p>
            <p class="font-sans text-[11px] text-gray-300 font-bold truncate">
              NPM: {$currentPlayer?.npm || '-'}
            </p>
            {#if $currentPlayer?.contact}
              <p class="font-sans text-[10px] text-emerald-400 font-bold truncate">
                WA: {$currentPlayer.contact}
              </p>
            {/if}
          </div>
        </div>

        <!-- Status Koneksi Socket -->
        <div class="flex justify-between items-center text-[9px] font-pixel text-gray-300 py-0.5">
          <span>Koneksi:</span>
          <span class="flex items-center gap-1.5 {$socketConnected ? 'text-emerald-400' : 'text-red-400'}">
            <span class="w-1.5 h-1.5 rounded-full {$socketConnected ? 'bg-emerald-400' : 'bg-red-400'}"></span>
            {$socketConnected ? 'Aktif' : 'Terputus'}
          </span>
        </div>

        <!-- Tombol Aksi Ganti Akun -->
        <button
          onclick={() => { closeProfile(); switchUser(); }}
          class="mc-btn bg-amber-500 hover:bg-amber-400 text-black font-pixel text-[9px] py-2 px-3 rounded w-full text-center transition-all mt-1"
        >
          Ganti Akun
        </button>
      </div>
    {/if}
  </div>
</div>

<div
  class="board-scene w-full h-full max-w-5xl flex flex-col items-center justify-center pt-8 md:pt-4"
  transition:fade={{ duration: 300 }}
  style="animation: boardFadeIn 0.35s ease forwards;"
>

  <!-- Judul dan subjudul papan -->
  <div class="text-center mb-4 z-10">
    <h1 class="text-3xl md:text-5xl font-pixel text-white mb-2" style="text-shadow: 4px 4px 0 #000;">
      L &amp; F KAMPUS
    </h1>
    <p class="text-xl md:text-2xl text-yellow-300 font-bold" style="text-shadow: 2px 2px 0 #000;">
      AI Image Match System
    </p>
  </div>

  <!-- Area papan kartu barang -->
  <div
    id="board-container"
    bind:this={boardContainer}
    class="board-container w-full max-w-5xl flex-grow rounded-lg overflow-hidden relative"
  >
    <!-- Tombol aksi lapor dan rapihkan posisi -->
    <div class="absolute top-4 left-4 z-20 flex gap-2">
      <button
        onclick={openReportModal}
        class="mc-btn bg-green-400 font-pixel text-[10px] md:text-xs py-2 px-4 rounded"
      >
        + Lapor (AI)
      </button>
      <button
        onclick={organizeBoard}
        class="mc-btn bg-yellow-400 font-pixel text-[10px] md:text-xs py-2 px-3 rounded flex items-center gap-1"
      >
        Rapihkan
      </button>
    </div>

    <!-- Tombol tab filter kategori barang -->
    <div class="absolute top-4 right-4 z-20 flex bg-white border-4 border-black shadow-[4px_4px_0_rgba(0,0,0,0.5)]">
      <button
        onclick={() => setFilter('all')}
        class="px-2 py-1 font-pixel text-[8px] md:text-[10px] border-r-4 border-black transition-colors
          {$currentFilter === 'all' ? 'bg-blue-500 text-white' : 'bg-white hover:bg-gray-200 text-black'}"
      >
        SEMUA
      </button>
      <button
        onclick={() => setFilter('lost')}
        class="px-2 py-1 font-pixel text-[8px] md:text-[10px] border-r-4 border-black transition-colors
          {$currentFilter === 'lost' ? 'bg-red-500 text-white' : 'bg-white hover:bg-gray-200 text-black'}"
      >
        HILANG
      </button>
      <button
        onclick={() => setFilter('found')}
        class="px-2 py-1 font-pixel text-[8px] md:text-[10px] transition-colors
          {$currentFilter === 'found' ? 'bg-green-500 text-white' : 'bg-white hover:bg-gray-200 text-black'}"
      >
        KETEMU
      </button>
    </div>

    <!-- Area render kartu barang -->
    <div id="cards-area" class="cards-area">
      {#each filteredItems as item (item.id)}
        <ItemCard
          {item}
          onClaim={() => openClaimModal(item.id)}
          onReviewClaims={() => openClaimsReview(item.id)}
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

<!-- Modal dialogs -->
{#if $activeModal === 'report'}
  <ReportModal />
{/if}

{#if $activeModal === 'claim'}
  <ClaimModal />
{/if}

{#if $activeModal === 'claimsReview'}
  <ClaimsReviewModal />
{/if}
