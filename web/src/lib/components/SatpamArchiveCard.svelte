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
  <!-- Title Bar Gaya Retro OS: Navy + Tombol Kotak -->
  <div class="win95-titlebar">
    <span class="font-pixel text-[7px] text-white font-bold tracking-wide truncate ml-0.5">
      LAP-{fileNo}_{item.date || "NO-DATE"}
    </span>
    <div class="flex items-center gap-[3px] shrink-0">
      <span class="win95-btn flex items-center justify-center text-[6px] leading-none pb-[2px]">_</span>
      <span class="win95-btn flex items-center justify-center text-[6px] leading-none">□</span>
      <span class="win95-btn win95-close flex items-center justify-center text-[6px] leading-none pb-[1px]">✕</span>
    </div>
  </div>

  <!-- Menu Bar Mini File Window -->
  <div class="win95-menubar font-pixel text-[6.5px] text-[#5a5a5a] flex items-center gap-2 px-1.5 py-[2px] select-none">
    <span>File</span><span>Edit</span><span>View</span><span>Help</span>
  </div>

  <!-- Badan Jendela: Icon File Besar + Label -->
  <div class="flex flex-col items-center justify-center gap-1 flex-1 bg-[#c0c0c0] px-2 pb-1">
    <div class="relative">
      <div class="w-12 h-12 bg-white border-2 border-[#808080] border-t-white border-l-white flex items-center justify-center overflow-hidden relative">
        {#if hasPhoto}
          <img
            src={item.evidencePhoto}
            alt="Bukti fisik"
            class="w-full h-full object-cover"
          />
          <span class="absolute bottom-0 right-0 bg-[#000080] text-white text-[5.5px] font-mono px-0.5 font-bold">FOTO</span>
        {:else}
          <TagIcon tag={item.tag} fallback={item.icon} size={30} title={item.title} />
        {/if}
      </div>
      {#if pendingClaimsCount > 0}
        <span class="absolute -top-1.5 -right-1.5 bg-[#dc2626] text-white font-pixel text-[6px] px-1 py-[1px] border border-[#808080] font-bold z-20">
          {pendingClaimsCount}
        </span>
      {/if}
    </div>

    <p class="font-sans text-[10px] font-bold text-[#1c120c] text-center truncate w-full leading-tight" title={item.title}>
      {item.title}
    </p>
    <p class="font-mono text-[7.5px] text-[#404040] truncate w-full text-center">
      {displayCode} • {statusLabel} • {item.type === 'found' ? 'TEMUAN' : 'HILANG'}
    </p>
  </div>

  <!-- Status Bar Mini ala Explorer -->
  <div class="win95-statusbar flex items-center justify-between px-1.5 py-[2px]">
    <span class="font-mono text-[6.5px] text-[#404040] truncate">{item.desc || "-"}</span>
    <span class="font-mono text-[6.5px] text-[#404040] shrink-0 ml-1">{item.time || "--:--"}</span>
  </div>
</div>

<style>
  .satpam-file-window {
    position: absolute;
    width: 220px;
    height: 190px;
    display: flex;
    flex-direction: column;
    user-select: none;
    cursor: grab;
    z-index: 10;
    background: #c0c0c0;
    border: 2px solid;
    border-color: #ffffff #808080 #808080 #ffffff;
    box-shadow: 1px 1px 0 #0a0a0a, 2px 2px 0 2px #0a0a0a55;
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
    height: 20px;
    background: linear-gradient(90deg, #000080 0%, #1084d0 100%);
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 3px 0 5px;
    cursor: grab;
    flex-shrink: 0;
  }

  .win95-btn {
    width: 13px;
    height: 12px;
    background: #c0c0c0;
    border: 1px solid;
    border-color: #ffffff #808080 #808080 #ffffff;
    color: #1c120c;
  }

  .win95-close {
    color: #1c120c;
  }

  .win95-menubar {
    background: #c0c0c0;
    border-bottom: 1px solid #808080;
    box-shadow: 0 1px 0 #ffffff;
    flex-shrink: 0;
  }

  .win95-statusbar {
    background: #c0c0c0;
    border-top: 1px solid #ffffff;
    box-shadow: inset 0 1px 0 #808080;
    flex-shrink: 0;
  }

  .file-resolved {
    filter: grayscale(70%);
    opacity: 0.92;
  }

  .file-highlighted {
    outline: 4px solid #38bdf8;
    box-shadow: 0 0 16px rgba(56, 189, 248, 0.8), 2px 2px 0 2px #0a0a0a55;
    z-index: 50;
  }

  .file-dimmed {
    opacity: 0.35;
    filter: grayscale(60%);
  }
</style>
