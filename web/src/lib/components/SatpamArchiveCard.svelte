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

  // Evaluasi status highlight kartu
  const isHighlighted = $derived(isItemHighlighted(item, $highlight));
  const isDimmed = $derived(!!$highlight && !isHighlighted);
  const displayCode = $derived(formatShortCode(item.shortCode, item.id));

  const hasPhoto = $derived(Boolean(item.evidencePhoto && item.evidencePhoto.trim() !== ''));
  const pendingClaimsCount = $derived(
    (item.claims || []).filter((c) => c.status === "pending").length
  );
</script>

<div
  class="satpam-folder-card {item.status === 'resolved'
    ? 'resolved-folder'
    : ''} {isHighlighted ? 'highlighted-folder' : ''} {isDimmed
    ? 'dimmed-card'
    : ''}"
  id={item.id}
  style="left: {item.x}px; top: {item.y}px;"
  use:draggable={{ itemId: item.id, containerId: "board-container", onDragEnd }}
  transition:fly={{ y: -30, duration: 400 }}
  onclick={onOpenArchive}
  role="button"
  tabindex="0"
  onkeydown={(e) => { if (e.key === 'Enter') onOpenArchive(); }}
  title="Klik untuk membuka arsip berkas #{displayCode}"
>
  <!-- Manila Folder Tab (Layer 1 Atas) -->
  <div class="folder-tab">
    <div class="flex items-center gap-1.5 min-w-0">
      <span class="w-1.5 h-1.5 rounded-full bg-amber-400 border border-[#140b05]"></span>
      <span class="font-mono font-bold text-[8.5px] text-[#140b05] truncate">
        {item.date || "NO-DATE"}
      </span>
    </div>
    <!-- Short ID Badge pada Tab -->
    <span class="bg-[#140b05] text-[#fde047] font-mono font-bold text-[7.5px] px-1.5 py-0.2 rounded border border-amber-300/40 shrink-0">
      {displayCode}
    </span>
  </div>

  <!-- Klip Kertas Retro di Pojok Kanan Atas -->
  <div class="paper-clip-retro pointer-events-none"></div>

  <!-- Folder Body (Map Arsip Berkas) -->
  <div class="folder-body flex flex-col justify-between p-2.5">
    <!-- Header Berkas: Type & Status Stempel -->
    <div class="flex items-start justify-between gap-1 border-b border-[#140b05]/20 pb-1.5">
      <div class="flex flex-col">
        <span class="text-[7px] font-pixel text-[#854d0e] tracking-widest leading-none">
          BERKAS SATPAM
        </span>
        <span class="text-[9px] font-pixel font-bold {item.type === 'found' ? 'text-emerald-800' : 'text-rose-800'} mt-0.5">
          {item.type === 'found' ? 'TEMUAN' : 'KEHILANGAN'}
        </span>
      </div>

      <!-- Stempel Confidential / Status -->
      {#if item.status === "resolved"}
        <span class="stamp-badge stamp-resolved font-pixel">
          ARSIP SELESAI
        </span>
      {:else if item.status === "disputed"}
        <span class="stamp-badge stamp-disputed font-pixel">
          DISPUTE
        </span>
      {:else}
        <span class="stamp-badge stamp-active font-pixel">
          AKTIF
        </span>
      {/if}
    </div>

    <!-- Center Content: Mini Foto Bukti / Icon & Info Barang -->
    <div class="flex items-center gap-2 my-1.5 bg-[#fefce8]/70 p-1.5 rounded border border-[#140b05]/20 shadow-[inset_1px_1px_0_rgba(0,0,0,0.06)]">
      <!-- Thumbnail Bukti Fisik jika ada, atau Pixel TagIcon jika tidak -->
      <div class="w-12 h-12 bg-white rounded border border-[#140b05] shadow-[1px_1px_0_#140b05] flex items-center justify-center overflow-hidden shrink-0 relative">
        {#if hasPhoto}
          <img
            src={item.evidencePhoto}
            alt="Bukti foto fisik"
            class="w-full h-full object-cover"
          />
          <span class="absolute bottom-0 right-0 bg-[#0d9488] text-white text-[6px] font-mono px-0.5 py-0 font-bold">
            FOTO
          </span>
        {:else}
          <TagIcon
            tag={item.tag}
            fallback={item.icon}
            size={28}
            title={item.title}
          />
        {/if}
      </div>

      <div class="min-w-0 flex-1 flex flex-col justify-center">
        <p class="font-bold text-[12px] leading-tight text-[#1c120c] font-sans truncate" title={item.title}>
          {item.title}
        </p>
        <p class="text-[9.5px] text-[#713f12] font-medium font-sans truncate mt-0.5" title={item.desc}>
          📍 {item.desc || "-"}
        </p>
        <p class="text-[9px] text-stone-500 font-sans truncate">
          👤 {item.reporterName || item.reporterNpm || "Anonim"}
        </p>
      </div>
    </div>

    <!-- Footer Map Berkas: Indikator Bukti Foto & Tombol Buka Map -->
    <div class="pt-1.5 border-t border-[#140b05]/20 flex items-center justify-between gap-1">
      <div class="flex items-center gap-1 text-[8px] font-pixel {hasPhoto ? 'text-emerald-700' : 'text-stone-500'}">
        <span>{hasPhoto ? '📸 ADA FOTO' : '📄 TEKS'}</span>
        {#if pendingClaimsCount > 0}
          <span class="bg-amber-500 text-white px-1 py-0.2 rounded text-[7px] font-bold">
            {pendingClaimsCount} KLAIM
          </span>
        {/if}
      </div>

      <button
        type="button"
        onclick={(e) => {
          e.stopPropagation();
          onOpenArchive();
        }}
        class="bg-[#b45309] hover:bg-[#92400e] active:translate-y-0.5 text-white font-pixel text-[8px] px-2 py-1 rounded border border-[#140b05] shadow-[1px_1px_0_#140b05] cursor-pointer flex items-center gap-1 font-bold"
      >
        <span>📂</span> BUKA BERKAS
      </button>
    </div>
  </div>
</div>

<style>
  .satpam-folder-card {
    position: absolute;
    width: 220px;
    height: 175px;
    user-select: none;
    cursor: grab;
    z-index: 10;
    transition: transform 0.15s ease, box-shadow 0.15s ease;
  }

  .satpam-folder-card:active {
    cursor: grabbing;
    z-index: 100;
  }

  .satpam-folder-card:hover {
    transform: translateY(-2px);
  }

  .folder-tab {
    position: relative;
    width: 150px;
    height: 24px;
    background: #d97706 linear-gradient(180deg, #f59e0b 0%, #d97706 100%);
    border: 3px solid #140b05;
    border-bottom: none;
    border-top-left-radius: 6px;
    border-top-right-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 8px;
    z-index: 1;
    box-shadow: 2px -1px 0px rgba(0, 0, 0, 0.15);
  }

  .folder-body {
    position: relative;
    width: 100%;
    height: calc(100% - 22px);
    background: #eab308 linear-gradient(180deg, #fef08a 0%, #fde047 30%, #eab308 100%);
    border: 3px solid #140b05;
    border-radius: 4px;
    border-top-left-radius: 0;
    box-shadow: 4px 4px 0px #140b05;
    z-index: 2;
  }

  .resolved-folder .folder-body {
    background: #cbd5e1 linear-gradient(180deg, #f1f5f9 0%, #e2e8f0 40%, #cbd5e1 100%);
    opacity: 0.9;
  }

  .resolved-folder .folder-tab {
    background: #94a3b8;
  }

  .paper-clip-retro {
    position: absolute;
    top: 2px;
    right: 14px;
    width: 8px;
    height: 22px;
    border: 2px solid #64748b;
    border-radius: 4px;
    background: transparent;
    z-index: 15;
    box-shadow: 1px 1px 0px rgba(0, 0, 0, 0.4);
  }

  .stamp-badge {
    font-size: 7px;
    padding: 1px 4px;
    border-radius: 2px;
    border: 1.5px dashed;
    letter-spacing: 0.5px;
    transform: rotate(-3deg);
  }

  .stamp-active {
    color: #b91c1c;
    border-color: #b91c1c;
    background-color: rgba(254, 226, 226, 0.7);
  }

  .stamp-resolved {
    color: #15803d;
    border-color: #15803d;
    background-color: rgba(220, 252, 231, 0.7);
  }

  .stamp-disputed {
    color: #c2410c;
    border-color: #c2410c;
    background-color: rgba(255, 237, 213, 0.7);
  }

  .highlighted-folder {
    outline: 4px solid #38bdf8;
    box-shadow: 0 0 16px rgba(56, 189, 248, 0.8), 4px 4px 0px #140b05;
    z-index: 50;
  }

  .dimmed-card {
    opacity: 0.35;
    filter: grayscale(60%);
  }
</style>
