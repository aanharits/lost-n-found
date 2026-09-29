<script lang="ts">
  import type { Item } from "$lib/stores/items.js";
  import { highlight, isItemHighlighted } from "$lib/stores/highlight.js";
  import { draggable } from "$lib/actions/draggable.js";
  import { fly } from "svelte/transition";
  import TagIcon from "./TagIcon.svelte";
  import { formatShortCode } from "$lib/utils/shortCode.js";

  let {
    item,
    onOpenArchive,
    onDragEnd,
  }: {
    item: Item;
    onOpenArchive: () => void;
    onDragEnd: (x: number, y: number) => void;
  } = $props();

  const isHighlighted = $derived(isItemHighlighted(item, $highlight));
  const isDimmed = $derived(!!$highlight && !isHighlighted);
  const displayCode = $derived(formatShortCode(item.shortCode, item.id));
  const hasPhoto = $derived(Boolean(item.evidencePhoto && item.evidencePhoto.trim() !== ""));
  const pendingClaimsCount = $derived(
    (item.claims || []).filter((c) => c.status === "pending").length
  );

  // Nomor jendela file retro agar tiap kartu terasa seperti file unik di desktop
  const fileNo = $derived(Math.abs([...item.id].reduce((a, c) => a + c.charCodeAt(0), 0)) % 8999 + 1000);

  const statusLabel = $derived(
    item.status === "resolved" ? "SELESAI" : item.status === "disputed" ? "DISPUTE" : "AKTIF"
  );
</script>

<div
  class="satpam-file-window {item.status === 'resolved'
    ? 'file-resolved'
    : ''} {isHighlighted ? 'file-highlighted' : ''} {isDimmed
    ? 'file-dimmed'
    : ''}"
  id={item.id}
  style="left: {item.x}px; top: {item.y}px;"
  use:draggable={{ itemId: item.id, containerId: "board-container", onDragEnd }}
  transition:fly={{ y: -30, duration: 400 }}
  ondblclick={onOpenArchive}
  onclick={onOpenArchive}
  role="button"
  tabindex="0"
  onkeydown={(e) => { if (e.key === 'Enter') onOpenArchive(); }}
  title="Klik dua kali membuka berkas #{displayCode}"
>
  <!-- Title Bar Gaya Win95: Biru Nintendo + Tombol Kotak -->
  <div class="win95-titlebar">
    <span class="font-pixel text-[9px] text-white font-bold tracking-wide truncate ml-1">
      LAP-{fileNo}_{item.date || "NO-DATE"}
    </span>
    <div class="flex items-center gap-[4px] shrink-0">
      <span class="win95-btn flex items-center justify-center text-[7px] leading-none pb-[3px]">_</span>
      <span class="win95-btn flex items-center justify-center text-[7px] leading-none">□</span>
      <span class="win95-btn win95-close flex items-center justify-center text-[7px] leading-none pb-[1px]">✕</span>
    </div>
  </div>

  <!-- Menu Bar Mini File Window -->
  <div class="win95-menubar font-pixel text-[8px] text-[#78716c] flex items-center gap-2.5 px-2 py-[3px] select-none">
    <span>File</span><span>Edit</span><span>View</span><span>Help</span>
  </div>

  <!-- Badan Jendela: Icon File Besar + Label -->
  <div class="flex flex-col items-center justify-center gap-1.5 flex-1 bg-[#f8fafc] px-2 pb-1.5">
    <div class="relative">
      <div class="w-[60px] h-[60px] bg-white border-2 border-[#1c120c] shadow-[inset_2px_2px_0_#e2e8f0] flex items-center justify-center overflow-hidden relative">
        {#if hasPhoto}
          <img
            src={item.evidencePhoto}
            alt="Bukti fisik"
            class="w-full h-full object-cover"
          />
          <span class="absolute bottom-0 right-0 bg-[#2563eb] text-white text-[7.5px] font-mono px-1 font-bold">FOTO</span>
        {:else}
          <TagIcon tag={item.tag} fallback={item.icon} size={38} title={item.title} />
        {/if}
      </div>
      {#if pendingClaimsCount > 0}
        <span class="absolute -top-2 -right-2 bg-[#dc2626] text-white font-pixel text-[7.5px] px-1 py-[1px] border-2 border-[#1c120c] font-bold z-20">
          {pendingClaimsCount}
        </span>
      {/if}
    </div>

    <p class="font-sans text-[13px] font-bold text-[#1c120c] text-center truncate w-full leading-tight" title={item.title}>
      {item.title}
    </p>
    <p class="font-mono text-[10px] text-[#78716c] font-bold truncate w-full text-center">
      {displayCode} • {statusLabel} • {item.type === 'found' ? 'TEMUAN' : 'HILANG'}
    </p>
  </div>

  <!-- Status Bar Mini ala Explorer -->
  <div class="win95-statusbar flex items-center justify-between px-2 py-[3px]">
    <span class="font-mono text-[9px] text-[#44403c] font-bold truncate">{item.desc || "-"}</span>
    <span class="font-mono text-[9px] text-[#44403c] font-bold shrink-0 ml-1">{item.time || "--:--"}</span>
  </div>
</div>

<style>
  .satpam-file-window {
    position: absolute;
    width: 260px;
    height: 232px;
    display: flex;
    flex-direction: column;
    user-select: none;
    cursor: grab;
    z-index: 10;
    background: #f8fafc;
    border: 3px solid #1c120c;
    box-shadow:
      inset 2px 2px 0 #ffffff,
      inset -2px -2px 0 #dbe3ec,
      3px 3px 0 #0c0812;
    transition: transform 0.15s ease, box-shadow 0.15s ease;
  }

  .satpam-file-window:hover {
    transform: translateY(-2px);
  }

  .satpam-file-window:active {
    cursor: grabbing;
    z-index: 100;
  }

  .win95-titlebar {
    height: 24px;
    background: linear-gradient(90deg, #1d4ed8 0%, #2563eb 55%, #3b82f6 100%);
    border-bottom: 2px solid #1c120c;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 4px 0 6px;
    cursor: grab;
    flex-shrink: 0;
  }

  .win95-btn {
    width: 16px;
    height: 14px;
    background: #f8fafc;
    border: 2px solid #1c120c;
    box-shadow: 1px 1px 0 rgba(255, 255, 255, 0.7) inset;
    color: #1c120c;
  }

  .win95-close {
    background: #fef2f2;
  }

  .win95-menubar {
    background: #f8fafc;
    border-bottom: 1px solid #dbe3ec;
    box-shadow: 0 1px 0 #ffffff;
    flex-shrink: 0;
  }

  .win95-statusbar {
    background: #f8fafc;
    border-top: 1px solid #dbe3ec;
    box-shadow: inset 0 1px 0 #ffffff;
    flex-shrink: 0;
  }

  .file-resolved {
    filter: grayscale(70%);
    opacity: 0.92;
  }

  .file-highlighted {
    outline: 4px solid #38bdf8;
    box-shadow: 0 0 16px rgba(56, 189, 248, 0.8), 3px 3px 0 #0c0812;
    z-index: 50;
  }

  .file-dimmed {
    opacity: 0.35;
    filter: grayscale(60%);
  }
</style>
