<script lang="ts">
  import { draggable } from "$lib/actions/draggable.js";
  import { fly } from "svelte/transition";
  import { highlight } from "$lib/stores/highlight.js";

  let {
    folderId,
    label,
    kind,
    count,
    photoCount,
    position,
    onOpen,
    onDragEnd,
  }: {
    folderId: string;
    label: string;
    kind: "found" | "lost" | "resolved";
    count: number;
    photoCount: number;
    position: { x: number; y: number };
    onOpen: () => void;
    onDragEnd: (x: number, y: number) => void;
  } = $props();

  // Tema warna folder per jenis arsip (8-bit Nintendo palette)
  const theme = $derived(
    kind === "found"
      ? { tab: "#059669", tabLight: "#34d399", body: "#eab308", bodyDark: "#ca8a04" }
      : kind === "lost"
        ? { tab: "#dc2626", tabLight: "#f87171", body: "#f59e0b", bodyDark: "#b45309" }
        : { tab: "#0369a1", tabLight: "#38bdf8", body: "#f59e0b", bodyDark: "#b45309" }
  );

  // Folder bersinar bila memuat item yang di-highlight Satpam AI
  const hasHighlight = $derived(
    !!$highlight &&
      $highlight.itemIds.length > 0 &&
      count > 0 &&
      $highlight.source !== undefined
  );
</script>

<div
  id={folderId}
  class="folder-cabinet {hasHighlight ? 'folder-glow' : ''}"
  style="left: {position.x}px; top: {position.y}px;"
  use:draggable={{ itemId: folderId, containerId: "board-container", onDragEnd }}
  transition:fly={{ y: -30, duration: 400 }}
  onclick={onOpen}
  role="button"
  tabindex="0"
  onkeydown={(e) => { if (e.key === "Enter") onOpen(); }}
  title="Buka {label}"
>
  <!-- Kertas Dokumen Menyembul di Belakang Folder (ala pixel art icon) -->
  <div class="paper-stack paper-stack-1" style="background: #ffffff;"></div>
  <div class="paper-stack paper-stack-2" style="background: #fefce8;"></div>

  <!-- Tab Folder dengan Label Tema -->
  <div
    class="folder-tab"
    style="background: linear-gradient(180deg, {theme.tabLight} 0%, {theme.tab} 100%);"
  >
    <span class="font-pixel text-[9px] md:text-[10px] text-white font-bold tracking-wider drop-shadow-[1px_1px_0_rgba(0,0,0,0.6)]">
      {label}
    </span>
  </div>

  <!-- Badan Folder Manila Pixel Art -->
  <div
    class="folder-body"
    style="background: linear-gradient(180deg, {theme.body} 0%, {theme.bodyDark} 100%);"
  >
    <!-- Pola garis samping ala pixel art folder icon -->
    <div class="folder-side-strip" style="background: {theme.tab};"></div>

    <!-- Icon Dokumen Pixel Besar di Tengah -->
    <div class="doc-icon-wrap">
      <div class="doc-icon">
        <!-- Kertas dokumen pixel dengan fold sudut -->
        <div class="doc-paper"></div>
        <div class="doc-fold"></div>
        <!-- Garis teks di dokumen -->
        <div class="doc-line doc-line-1"></div>
        <div class="doc-line doc-line-2"></div>
        <div class="doc-line doc-line-3"></div>
      </div>

      <!-- Badge jumlah file ala notifikasi game -->
      {#if count > 0}
        <div class="count-badge font-pixel">
          {count}
        </div>
      {/if}
    </div>

    <!-- Info bar bawah folder -->
    <div class="folder-info">
      <span class="font-pixel text-[9px] md:text-[10px] text-[#1c120c] font-bold">
        {count} FILE
      </span>
      <span class="font-pixel text-[8.5px] md:text-[9px] text-[#78350f] font-bold flex items-center gap-1">
        {#if photoCount > 0}
          <span>📷 {photoCount} FOTO</span>
        {:else}
          <span>📄 TEKS</span>
        {/if}
      </span>
    </div>
  </div>

  <!-- Pushpin pojok -->
  <div class="folder-pin"></div>
</div>

<style>
  .folder-cabinet {
    position: absolute;
    width: 210px;
    height: 190px;
    user-select: none;
    cursor: grab;
    z-index: 10;
    transition: transform 0.15s ease, box-shadow 0.15s ease;
  }

  .folder-cabinet:hover {
    transform: translateY(-4px) scale(1.02);
  }

  .folder-cabinet:active {
    cursor: grabbing;
    z-index: 100;
  }

  /* Kertas dokumen yang menyembul dari atas folder */
  .paper-stack {
    position: absolute;
    top: 8px;
    left: 50%;
    border: 3px solid #1c120c;
    border-radius: 2px;
    z-index: 1;
  }

  .paper-stack-1 {
    width: 130px;
    height: 44px;
    transform: translateX(-50%) rotate(-4deg);
    background: #ffffff;
  }

  .paper-stack-2 {
    width: 126px;
    height: 46px;
    transform: translateX(-48%) rotate(3deg);
    background: #fefce8;
    z-index: 2;
  }

  /* Tab folder menonjol di kiri atas */
  .folder-tab {
    position: absolute;
    top: 26px;
    left: 0;
    width: 140px;
    height: 30px;
    border: 3px solid #1c120c;
    border-bottom: none;
    border-radius: 6px 8px 0 0;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 8px;
    z-index: 5;
    box-shadow: 2px -2px 0px rgba(0, 0, 0, 0.2);
    white-space: nowrap;
    overflow: hidden;
  }

  /* Badan folder utama */
  .folder-body {
    position: absolute;
    top: 54px;
    left: 0;
    width: 100%;
    height: 132px;
    border: 3px solid #1c120c;
    border-radius: 4px 8px 8px 8px;
    box-shadow: 5px 5px 0px #1c120c;
    z-index: 6;
    display: flex;
    flex-direction: column;
  }

  /* Strip warna tema di sisi kiri badan folder */
  .folder-side-strip {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 8px;
    border-right: 2px solid rgba(28, 18, 12, 0.35);
    border-top-left-radius: 2px;
  }

  /* Area icon dokumen pixel di tengah folder */
  .doc-icon-wrap {
    position: relative;
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding-left: 10px;
  }

  /* Dokumen pixel art: kertas putih dengan fold sudut kanan atas */
  .doc-icon {
    position: relative;
    width: 56px;
    height: 64px;
    filter: drop-shadow(3px 3px 0px rgba(28, 18, 12, 0.55));
  }

  .doc-paper {
    position: absolute;
    inset: 0;
    background: #ffffff;
    border: 3px solid #1c120c;
    border-radius: 2px;
  }

  /* Fold sudut kanan atas kertas */
  .doc-fold {
    position: absolute;
    top: -3px;
    right: -3px;
    width: 16px;
    height: 16px;
    background: #1c120c;
    clip-path: polygon(100% 0, 0 0, 100% 100%);
  }

  .doc-fold::after {
    content: "";
    position: absolute;
    top: 3px;
    left: 5px;
    width: 8px;
    height: 8px;
    background: #fefce8;
    clip-path: polygon(100% 0, 0 0, 100% 100%);
  }

  /* Garis teks di dokumen */
  .doc-line {
    position: absolute;
    left: 8px;
    height: 4px;
    background: #1c120c;
    border-radius: 1px;
    opacity: 0.75;
  }

  .doc-line-1 {
    top: 14px;
    width: 28px;
  }

  .doc-line-2 {
    top: 26px;
    width: 34px;
  }

  .doc-line-3 {
    top: 38px;
    width: 20px;
  }

  /* Badge hitung file merah ala notif game */
  .count-badge {
    position: absolute;
    top: -6px;
    right: -12px;
    min-width: 26px;
    height: 26px;
    padding: 0 5px;
    background: #dc2626;
    border: 3px solid #1c120c;
    box-shadow: 2px 2px 0px #1c120c;
    color: #ffffff;
    font-size: 11px;
    font-weight: bold;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    animation: badge-bounce 2s ease-in-out infinite;
  }

  @keyframes badge-bounce {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-2px); }
  }

  /* Info bar bawah folder */
  .folder-info {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 5px 10px 5px 16px;
    background: rgba(255, 255, 255, 0.35);
    border-top: 3px solid rgba(28, 18, 12, 0.55);
  }

  /* Pushpin 8-bit di pojok kanan atas folder body */
  .folder-pin {
    position: absolute;
    top: 44px;
    right: 14px;
    width: 14px;
    height: 14px;
    background: radial-gradient(circle at 35% 35%, #fca5a5, #dc2626 60%);
    border: 3px solid #1c120c;
    border-radius: 50%;
    z-index: 8;
    box-shadow: 1px 2px 0px rgba(0, 0, 0, 0.4);
  }

  /* Glow saat memuat item yang di-highlight AI */
  .folder-glow {
    outline: 4px solid #38bdf8;
    box-shadow: 0 0 18px rgba(56, 189, 248, 0.85), 5px 5px 0px #1c120c;
    z-index: 50;
  }
</style>
