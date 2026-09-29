<script lang="ts">
  import { fly } from "svelte/transition";
  import { goto } from "$app/navigation";
  import { currentPlayer } from "$lib/stores/player.js";
  import {
    socketConnected,
    onlineCount,
    inboxOpen,
    inboxTab,
  } from "$lib/stores/ui.js";
  import { items } from "$lib/stores/items.js";
  import Avatar from "./Avatar.svelte";
  import InboxPanel from "./InboxPanel.svelte";

  let {
    showInbox,
  }: {
    showInbox?: boolean;
  } = $props();

  let isProfileOpen = $state(false);

  const isSatpam = $derived($currentPlayer?.role === "satpam");
  const canShowInbox = $derived(showInbox !== undefined ? showInbox : !isSatpam);

  function toggleProfile() {
    isProfileOpen = !isProfileOpen;
    if (isProfileOpen) inboxOpen.set(false);
  }

  function closeProfile() {
    isProfileOpen = false;
  }

  // Hitung badge inbox: klaim pending masuk (reporter) + klaim saya yang pending
  let inboxBadge = $derived(
    (() => {
      if (!canShowInbox) return 0;
      const npm = $currentPlayer?.npm || "";
      if (!npm) return 0;
      const incoming = $items
        .filter((i) => i.reporterNpm === npm)
        .reduce(
          (acc, i) =>
            acc + (i.claims || []).filter((c) => c.status === "pending").length,
          0
        );
      const mine = $items
        .flatMap((i) => i.claims || [])
        .filter((c) => c.claimantNpm === npm && c.status === "pending").length;
      return incoming + mine;
    })()
  );

  function toggleInbox() {
    if (!$inboxOpen) {
      const npm = $currentPlayer?.npm || "";
      const hasIncoming = $items.some(
        (i) =>
          i.reporterNpm === npm &&
          (i.claims || []).some((c) => c.status === "pending")
      );
      inboxTab.set(hasIncoming ? "incoming" : "mine");
      inboxOpen.set(true);
    } else {
      inboxOpen.set(false);
    }
    isProfileOpen = false;
  }

  function switchUser() {
    currentPlayer.logout();
    goto("/lobby");
  }

  function onWindowClick(e: MouseEvent) {
    const target = e.target as HTMLElement;
    if (isProfileOpen && !target.closest(".profile-menu-container")) {
      isProfileOpen = false;
    }
  }
</script>

<svelte:window onclick={onWindowClick} />

<!-- Floating Header: Status online di kiri atas & Logo profile di kanan atas (Nintendo HUD Style) -->
<div class="fixed top-3 left-3 right-3 z-30 flex justify-between items-center pointer-events-none">
  <!-- Indikator status live online counter -->
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

  <!-- Header Kanan: Lonceng Notifikasi Inbox & Logo Profil -->
  <div class="pointer-events-auto flex items-center gap-2">
    {#if canShowInbox}
      <!-- Inbox Panel Modal Dialog -->
      <InboxPanel />

      <!-- Tombol Lonceng Notifikasi Inbox (di samping kiri profile) -->
      <button
        type="button"
        onclick={toggleInbox}
        class="relative w-[34px] h-[34px] rounded-full bg-[#2b3847] hover:bg-[#384a5e] {$inboxOpen ? 'ring-2 ring-[#facc15] bg-[#384a5e]' : ''} border border-black/30 shadow-[0_2px_4px_rgba(0,0,0,0.3)] flex items-center justify-center transition-all active:translate-y-0.5 cursor-pointer select-none group"
        title={inboxBadge > 0 ? `Inbox Notifikasi (${inboxBadge} klaim)` : 'Inbox Notifikasi Klaim'}
        aria-label="Buka Inbox Notifikasi Klaim"
      >
        <!-- 8-Bit Pixel Bell SVG Icon -->
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          class="transition-transform duration-200 group-hover:scale-110 drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]"
        >
          <rect x="11" y="2" width="2" height="2" fill="#facc15" />
          <rect x="10" y="4" width="4" height="2" fill="#eab308" />
          <rect x="8" y="6" width="8" height="3" fill="#facc15" />
          <rect x="7" y="7" width="2" height="2" fill="#fef08a" />
          <rect x="6" y="9" width="12" height="4" fill="#facc15" />
          <rect x="6" y="9" width="2" height="3" fill="#fef08a" />
          <rect x="15" y="9" width="3" height="4" fill="#ca8a04" />
          <rect x="4" y="13" width="16" height="3" fill="#eab308" />
          <rect x="4" y="13" width="2" height="2" fill="#fef08a" />
          <rect x="17" y="13" width="3" height="3" fill="#a16207" />
          <rect x="10" y="16" width="4" height="3" fill="#ffd700" />
        </svg>

        <!-- Badge Indikator Notifikasi -->
        {#if inboxBadge > 0}
          <span class="absolute -top-1 -right-1 flex h-4 min-w-[16px]">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span class="relative inline-flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full bg-[#dc2626] border border-white text-white font-pixel text-[7px] font-bold shadow-md leading-none">
              {inboxBadge}
            </span>
          </span>
        {/if}
      </button>
    {/if}

    <!-- Logo Profil: Sesuai Screenshot Slate Navy Capsule -->
    <div class="relative profile-menu-container">
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
</div>
