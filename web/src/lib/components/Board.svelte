<script lang="ts">
  import { onMount } from 'svelte';
  import { fly, fade } from 'svelte/transition';
  import { items, type Item } from '$lib/stores/items.js';
  import { currentPlayer } from '$lib/stores/player.js';
  import { currentScene, currentFilter, socketConnected, onlineCount, activeModal, claimTargetItemId, reviewTargetItemId } from '$lib/stores/ui.js';
  import { getSocket } from '$lib/socket.js';
  import ItemCard from './ItemCard.svelte';
  import Avatar from './Avatar.svelte';
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

<!-- Floating Header: Status online di kiri atas & Logo profile di kanan atas (Nintendo HUD Style) -->
<div class="fixed top-3 left-3 right-3 z-30 flex justify-between items-center pointer-events-none">
  <!-- Indikator status live: Sesuai Screenshot Slate Navy Capsule -->
  <div
    class="pointer-events-auto bg-[#2b3847] border border-black/30 shadow-[0_2px_4px_rgba(0,0,0,0.3)] px-3 py-1.5 rounded-full flex items-center gap-2 select-none"
  >
    <span class="relative flex h-2 w-2">
      <span class="{$socketConnected ? 'animate-ping' : ''} absolute inline-flex h-full w-full rounded-full {$socketConnected ? 'bg-[#22c55e]' : 'bg-red-400'} opacity-75"></span>
      <span class="relative inline-flex rounded-full h-2 w-2 {$socketConnected ? 'bg-[#22c55e]' : 'bg-red-500'}"></span>
    </span>
    <span class="font-pixel text-[8px] md:text-[9px] text-[#facc15] font-bold tracking-wide">
      {$onlineCount} Online
    </span>
  </div>

  <!-- Logo Profil: Sesuai Screenshot Slate Navy Capsule -->
  <div class="pointer-events-auto relative profile-menu-container">
    <button
      type="button"
      onclick={toggleProfile}
      class="bg-[#2b3847] hover:bg-[#334354] border border-black/30 shadow-[0_2px_4px_rgba(0,0,0,0.3)] px-2.5 py-1 rounded-full flex items-center gap-2 transition-all active:translate-y-0.5 cursor-pointer select-none"
      aria-label="Profil Akun"
    >
      <!-- Avatar Badge -->
      <div class="w-6 h-6 rounded-full bg-[#ffd700] border border-[#1c120c] flex items-center justify-center overflow-hidden shrink-0">
        {#if $currentPlayer?.avatarSeed}
          <Avatar seed={$currentPlayer.avatarSeed} size={24} />
        {:else}
          <span class="font-pixel text-[8px] text-[#1c120c] font-bold">
            {($currentPlayer?.name || 'U').charAt(0).toUpperCase()}
          </span>
        {/if}
      </div>

      <span class="font-pixel text-[9px] text-white max-w-[90px] md:max-w-[130px] truncate font-bold">
        {$currentPlayer?.name || 'Profil'}
      </span>

      <span class="font-pixel text-[7px] text-slate-300 font-bold transition-transform duration-200 {isProfileOpen ? 'rotate-180' : ''}">
        v
      </span>
    </button>

    <!-- Dropdown Menu Profil: Selaras dengan Kapsul Slate Navy -->
    {#if isProfileOpen}
      <div
        class="absolute right-0 mt-2 w-64 border-2 border-[#1c120c] shadow-[4px_4px_0px_#0a060f] p-3.5 flex flex-col gap-2.5 z-50 rounded-xl select-none"
        style="background: #2b3847 linear-gradient(180deg, #324355 0%, #24303d 100%);"
        transition:fly={{ y: -8, duration: 150 }}
      >
        <!-- Informasi Identitas Akun -->
        <div class="flex items-center gap-2.5 pb-2.5 border-b border-slate-600/60">
          <div class="w-10 h-10 rounded-lg bg-[#ffd700] border-2 border-[#1c120c] flex items-center justify-center overflow-hidden shrink-0 shadow-[1px_1px_0px_#1c120c]">
            {#if $currentPlayer?.avatarSeed}
              <Avatar seed={$currentPlayer.avatarSeed} size={40} />
            {:else}
              <span class="font-pixel text-xs text-[#1c120c] font-bold">
                {($currentPlayer?.name || 'U').charAt(0).toUpperCase()}
              </span>
            {/if}
          </div>
          <div class="flex flex-col min-w-0">
            <p
              class="font-pixel text-[10px] text-white font-bold truncate"
              style="text-shadow: 1px 1px 0 #1c120c;"
            >
              {$currentPlayer?.name || 'Mahasiswa'}
            </p>
            <p class="font-sans text-[11px] text-slate-200 font-bold truncate">
              NPM: {$currentPlayer?.npm || '-'}
            </p>
            {#if $currentPlayer?.contact}
              <p class="font-sans text-[10px] text-[#facc15] font-bold truncate">
                WA: {$currentPlayer.contact}
              </p>
            {/if}
          </div>
        </div>

        <!-- Status Koneksi Socket -->
        <div class="bg-[#fefce8] px-2.5 py-1.5 rounded border-2 border-[#1c120c] flex justify-between items-center text-[8px] md:text-[9px] font-pixel text-[#1c120c] font-bold shadow-[2px_2px_0_#1c120c]">
          <span>STATUS:</span>
          <span class="flex items-center gap-1.5 {$socketConnected ? 'text-green-700' : 'text-red-600'}">
            <span class="w-2 h-2 rounded-full {$socketConnected ? 'bg-green-500 border border-[#0c0812]' : 'bg-red-500'}"></span>
            {$socketConnected ? 'TERHUBUNG' : 'OFFLINE'}
          </span>
        </div>

        <!-- Tombol Aksi Ganti Akun -->
        <button
          onclick={() => { closeProfile(); switchUser(); }}
          class="bg-[#ffd700] hover:bg-[#fbbf24] active:translate-y-0.5 text-[#1c120c] font-pixel text-[9px] py-2 px-3 rounded w-full text-center border-2 border-[#1c120c] shadow-[2px_2px_0_#1c120c] active:shadow-none transition-all cursor-pointer font-bold select-none tracking-wider mt-1"
        >
          GANTI AKUN
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

  <!-- Judul dan subjudul papan: Sesuai Screenshot Terang & Colorful -->
  <div class="text-center mb-3 z-10 select-none">
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

  <!-- Area papan kartu barang -->
  <div
    id="board-container"
    bind:this={boardContainer}
    class="board-container w-full max-w-5xl flex-grow rounded-xl overflow-hidden relative shadow-[8px_8px_0px_rgba(0,0,0,0.5)]"
  >
    <!-- Tombol aksi lapor dan rapihkan posisi: Colorful Retro Action Buttons -->
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

    <!-- Tombol tab filter kategori barang: Controller Pod Sesuai Screenshot -->
    <div class="absolute top-4 right-4 z-20 flex bg-white border-2 border-[#1c120c] shadow-[2px_2px_0_#1c120c] rounded overflow-hidden select-none">
      <button
        onclick={() => setFilter('all')}
        class="px-3 py-1 font-pixel text-[8px] md:text-[9px] transition-all cursor-pointer font-bold
          {$currentFilter === 'all' ? 'bg-[#2563eb] text-white' : 'bg-white text-[#1c120c] hover:bg-slate-100'}"
      >
        SEMUA
      </button>
      <button
        onclick={() => setFilter('lost')}
        class="px-3 py-1 font-pixel text-[8px] md:text-[9px] transition-all cursor-pointer font-bold border-l-2 border-r-2 border-[#1c120c]
          {$currentFilter === 'lost' ? 'bg-[#dc2626] text-white' : 'bg-white text-[#1c120c] hover:bg-slate-100'}"
      >
        HILANG
      </button>
      <button
        onclick={() => setFilter('found')}
        class="px-3 py-1 font-pixel text-[8px] md:text-[9px] transition-all cursor-pointer font-bold
          {$currentFilter === 'found' ? 'bg-[#16a34a] text-white' : 'bg-white text-[#1c120c] hover:bg-slate-100'}"
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
