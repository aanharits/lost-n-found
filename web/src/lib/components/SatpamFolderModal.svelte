<script lang="ts">
  import { items, type Item } from "$lib/stores/items.js";
  import TagIcon from "./TagIcon.svelte";
  import { formatShortCode } from "$lib/utils/shortCode.js";
  import { fade, scale } from "svelte/transition";

  let {
    item,
    onClose,
  }: {
    item: Item | null;
    onClose: () => void;
  } = $props();

  let selectedId = $state<string | null>(null);
  let isImageZoomed = $state(false);
  let copyFeedback = $state(false);

  // List arsip digroup per tanggal untuk panel kiri explorer
  const archiveGroups = $derived.by(() => {
    const groups = new Map<string, Item[]>();
    for (const it of $items) {
      const key = it.date || "NO-DATE";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(it);
    }
    return Array.from(groups.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  });

  // Item terpilih: mengikuti item yang diklik dari board, atau selection user di list
  const selected = $derived(
    selectedId
      ? ($items.find((i) => i.id === selectedId) ?? null)
      : item
  );

  const displayCode = $derived(selected ? formatShortCode(selected.shortCode, selected.id) : "#ITEM");
  const hasPhoto = $derived(Boolean(selected?.evidencePhoto && selected.evidencePhoto.trim() !== ""));
  const totalObjects = $derived($items.length);
  const photoObjects = $derived($items.filter((i) => i.evidencePhoto && i.evidencePhoto.trim() !== "").length);

  function selectItem(id: string) {
    selectedId = id;
    isImageZoomed = false;
    copyFeedback = false;
  }

  function copyCode() {
    if (!selected) return;
    navigator.clipboard?.writeText(displayCode);
    copyFeedback = true;
    setTimeout(() => {
      copyFeedback = false;
    }, 2000);
  }

  // Reset selection saat modal ditutup/dibuka dengan item berbeda
  $effect(() => {
    if (item) {
      selectedId = item.id;
      isImageZoomed = false;
      copyFeedback = false;
    }
  });
</script>

{#if item}
  <div
    class="modal-overlay backdrop-blur-xs z-50 flex items-center justify-center p-3"
    transition:fade={{ duration: 150 }}
    onclick={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}
    role="dialog"
    tabindex="-1"
    onkeydown={(e) => {
      if (e.key === "Escape") onClose();
    }}
  >
    <!-- Explorer Window Klasik: Silver Frame, Title Bar Navy, Shutdown Style -->
    <div
      class="explorer-window relative w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden select-none"
      transition:scale={{ start: 0.93, duration: 200 }}
    >
      <!-- Title Bar: Navy Gradient + Tombol Kotak -->
      <div class="explorer-titlebar flex items-center justify-between px-2 py-1">
        <div class="flex items-center gap-2 min-w-0">
          <span class="w-3.5 h-3.5 bg-[#c0c0c0] border border-[#808080] flex items-center justify-center text-[8px] shrink-0">📁</span>
          <span class="font-pixel text-[8px] md:text-[9px] text-white font-bold tracking-wide truncate">
            C:\ARSIP_SATPAM\{selected ? `LAP_${displayCode.replace('#', '')}` : "BERKAS"} - Windows Internet Explorer
          </span>
        </div>
        <div class="flex items-center gap-[3px] shrink-0">
          <span class="ex-btn flex items-center justify-center text-[7px] leading-none pb-[2px]">_</span>
          <span class="ex-btn flex items-center justify-center text-[7px] leading-none">□</span>
          <button
            type="button"
            onclick={onClose}
            aria-label="Tutup Explorer"
            class="ex-btn flex items-center justify-center text-[7px] leading-none pb-[1px] cursor-pointer font-bold"
          >
            ✕
          </button>
        </div>
      </div>

      <!-- Menu Bar + Toolbar -->
      <div class="win95-menubar font-pixel text-[7px] md:text-[8px] text-[#1c120c] flex items-center gap-3 px-2 py-1 border-b border-[#808080] shrink-0">
        <span class="hover:bg-[#000080] hover:text-white px-1 cursor-default">File</span>
        <span class="hover:bg-[#000080] hover:text-white px-1 cursor-default">Edit</span>
        <span class="hover:bg-[#000080] hover:text-white px-1 cursor-default">View</span>
        <span class="hover:bg-[#000080] hover:text-white px-1 cursor-default">Tools</span>
        <span class="hover:bg-[#000080] hover:text-white px-1 cursor-default">Help</span>
        <span class="ml-auto font-mono text-[7px] text-[#404040]">[DOKUMEN RAHASIA SATPAM]</span>
      </div>

      <!-- Address Bar -->
      <div class="flex items-center gap-1.5 px-2 py-1 bg-[#c0c0c0] border-b-2 border-[#808080] shrink-0">
        <span class="font-pixel text-[7px] text-[#404040]">Alamat:</span>
        <div class="flex-1 bg-white border-2 border-[#808080] border-t-[#404040] border-l-[#404040] px-1.5 py-0.5 flex items-center gap-1 min-w-0">
          <span class="text-[8px]">📁</span>
          <span class="font-mono text-[8px] text-[#1c120c] truncate">C:\ARSIP_SATPAM\KEAMANAN_KAMPUS</span>
        </div>
      </div>

      <!-- Body Explorer: Panel Kiri List + Panel Kanan Preview -->
      <div class="flex-1 flex flex-col md:flex-row min-h-0 bg-[#c0c0c0] gap-[3px] p-[3px] overflow-hidden">

        <!-- Panel Kiri: Tree List Arsip per Tanggal -->
        <div class="w-full md:w-[280px] shrink-0 bg-white border-2 border-[#808080] border-t-[#dfdfdf] border-l-[#dfdfdf] flex flex-col min-h-[140px] md:min-h-0 overflow-hidden">
          <div class="ex-panel-header font-pixel text-[7px] md:text-[8px] text-[#1c120c] px-2 py-1 border-b border-[#c0c0c0] flex items-center justify-between shrink-0">
            <span>📁 ARSIP_TANGGAL</span>
            <span class="font-mono text-[6.5px] text-[#808080]">{totalObjects} OBJ</span>
          </div>

          <div class="flex-1 overflow-y-auto p-1">
            {#each archiveGroups as [date, groupItems] (date)}
              <div class="mb-1">
                <div class="flex items-center gap-1 px-1 py-0.5 bg-[#dfdfdf] border border-[#c0c0c0] sticky top-0 z-10">
                  <span class="text-[8px]">📅</span>
                  <span class="font-mono text-[8px] font-bold text-[#000080]">{date}</span>
                  <span class="font-mono text-[6.5px] text-[#808080] ml-auto">({groupItems.length})</span>
                </div>
                {#each groupItems as it (it.id)}
                  <button
                    type="button"
                    onclick={() => selectItem(it.id)}
                    class="w-full flex items-center gap-1.5 px-1.5 py-1 text-left cursor-pointer border border-transparent transition-colors {selectedId === it.id || (!selectedId && item.id === it.id)
                      ? 'bg-[#000080] text-white'
                      : 'hover:bg-[#dfdfdf] text-[#1c120c]'}"
                  >
                    <span class="text-[9px] shrink-0">
                      {it.evidencePhoto && it.evidencePhoto.trim() !== '' ? '📷' : '📄'}
                    </span>
                    <span class="flex-1 min-w-0">
                      <span class="block font-sans text-[10px] font-bold truncate leading-tight">
                        {it.title}
                      </span>
                      <span class="block font-mono text-[7px] {selectedId === it.id || (!selectedId && item.id === it.id) ? 'text-[#c0c0c0]' : 'text-[#808080]'} truncate">
                        {formatShortCode(it.shortCode, it.id)} • {it.type === 'found' ? 'TEMUAN' : 'HILANG'} • {it.status}
                      </span>
                    </span>
                  </button>
                {/each}
              </div>
            {:else}
              <div class="p-3 text-center font-pixel text-[7px] text-[#808080]">
                ARSIP KOSONG
              </div>
            {/each}
          </div>
        </div>

        <!-- Panel Kanan: Preview Berkas Aktif -->
        <div class="flex-1 bg-white border-2 border-[#808080] border-t-[#dfdfdf] border-l-[#dfdfdf] flex flex-col min-h-0 overflow-hidden">
          {#if selected}
            <!-- Preview Header -->
            <div class="ex-panel-header font-pixel text-[7px] md:text-[8px] px-2 py-1 border-b border-[#c0c0c0] flex items-center justify-between gap-2 shrink-0">
              <span class="truncate">🔍 {selected.title}</span>
              <button
                type="button"
                onclick={copyCode}
                class="px-1.5 py-[1px] bg-[#c0c0c0] border border-[#808080] border-t-white border-l-white font-mono text-[7px] font-bold text-[#1c120c] cursor-pointer active:border-[#808080] active:border-t-[#404040] active:border-l-[#404040] shrink-0"
                title="Klik untuk menyalin short code"
              >
                {displayCode} {copyFeedback ? '✓' : '📋'}
              </button>
            </div>

            <!-- Preview Body: Foto Kiri (Square) + FormData Kanan -->
            <div class="flex-1 overflow-y-auto p-2 flex flex-col sm:flex-row gap-2 min-h-0">
              <!-- Preview Pane Foto Bukti -->
              <div class="sm:w-[45%] shrink-0 flex flex-col items-center gap-1.5">
                <div class="w-full aspect-square bg-[#dfdfdf] border-2 border-[#808080] border-t-[#404040] border-l-[#404040] overflow-hidden flex items-center justify-center relative group">
                  {#if hasPhoto}
                    <button
                      type="button"
                      onclick={() => isImageZoomed = true}
                      class="w-full h-full block cursor-zoom-in"
                      title="Klik untuk memperbesar foto bukti"
                    >
                      <img
                        src={selected.evidencePhoto}
                        alt="Foto bukti fisik asli pelapor"
                        class="w-full h-full object-cover"
                      />
                    </button>
                    <div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-2 pointer-events-none">
                      <span class="font-pixel text-[7px] text-white">🔍 KLIK PERBESAR</span>
                    </div>
                  {:else}
                    <div class="flex flex-col items-center gap-1.5 p-3 text-center">
                      <TagIcon tag={selected.tag} fallback={selected.icon} size={56} title={selected.title} />
                      <span class="font-pixel text-[7px] text-[#808080]">NO_PREVIEW.BMP</span>
                    </div>
                  {/if}
                </div>

                <!-- Status Stempel Format Dialog -->
                <div class="w-full flex gap-1.5">
                  <div class="flex-1 bg-[#dfdfdf] border border-[#808080] px-1.5 py-0.5 text-center">
                    <span class="font-pixel text-[6px] text-[#404040] block">STATUS</span>
                    <span class="font-mono text-[8px] font-bold {selected.status === 'resolved' ? 'text-emerald-700' : selected.status === 'disputed' ? 'text-orange-600' : 'text-[#000080]'}">
                      {selected.status.toUpperCase()}
                    </span>
                  </div>
                  <div class="flex-1 bg-[#dfdfdf] border border-[#808080] px-1.5 py-0.5 text-center">
                    <span class="font-pixel text-[6px] text-[#404040] block">JENIS</span>
                    <span class="font-mono text-[8px] font-bold {selected.type === 'found' ? 'text-emerald-700' : 'text-rose-700'}">
                      {selected.type === 'found' ? 'TEMUAN' : 'HILANG'}
                    </span>
                  </div>
                </div>
              </div>

              <!-- Properties Dialog Kanan -->
              <div class="flex-1 min-w-0 flex flex-col gap-1.5">
                <!-- Field Grid ala Properties -->
                <div class="bg-[#dfdfdf] border-2 border-[#808080] border-t-white border-l-white p-2 flex flex-col gap-1">
                  <div class="flex border-b border-[#c0c0c0] pb-1">
                    <span class="font-pixel text-[6.5px] text-[#404040] w-[88px] shrink-0 pt-0.5">NAMA_FILE:</span>
                    <span class="font-sans text-[10.5px] font-bold text-[#1c120c] truncate">{selected.title}</span>
                  </div>
                  <div class="flex border-b border-[#c0c0c0] pb-1">
                    <span class="font-pixel text-[6.5px] text-[#404040] w-[88px] shrink-0 pt-0.5">WAKTU:</span>
                    <span class="font-mono text-[9px] text-[#1c120c]">{selected.date || "-"} • {selected.time || "-"}</span>
                  </div>
                  <div class="flex border-b border-[#c0c0c0] pb-1">
                    <span class="font-pixel text-[6.5px] text-[#404040] w-[88px] shrink-0 pt-0.5">LOKASI:</span>
                    <span class="font-sans text-[10px] font-bold text-[#1c120c] truncate">📍 {selected.desc || "-"}</span>
                  </div>
                  <div class="flex border-b border-[#c0c0c0] pb-1">
                    <span class="font-pixel text-[6.5px] text-[#404040] w-[88px] shrink-0 pt-0.5">KATEGORI:</span>
                    <span class="font-mono text-[8.5px] text-[#1c120c] truncate">{selected.category || "Umum"} • {selected.tag || "Barang"}</span>
                  </div>
                  <div class="flex border-b border-[#c0c0c0] pb-1">
                    <span class="font-pixel text-[6.5px] text-[#404040] w-[88px] shrink-0 pt-0.5">PELAPOR:</span>
                    <span class="font-sans text-[10px] font-bold text-[#1c120c] truncate">{selected.reporterName || "Anonim"}</span>
                  </div>
                  <div class="flex border-b border-[#c0c0c0] pb-1">
                    <span class="font-pixel text-[6.5px] text-[#404040] w-[88px] shrink-0 pt-0.5">NPM:</span>
                    <span class="font-mono text-[9px] text-[#1c120c]">{selected.reporterNpm || "-"}</span>
                  </div>
                  {#if selected.reporterContact}
                    <div class="flex border-b border-[#c0c0c0] pb-1">
                      <span class="font-pixel text-[6.5px] text-[#404040] w-[88px] shrink-0 pt-0.5">KONTAK:</span>
                      <span class="font-mono text-[9px] text-[#000080] truncate">{selected.reporterContact}</span>
                    </div>
                  {/if}
                  <div class="flex">
                    <span class="font-pixel text-[6.5px] text-[#404040] w-[88px] shrink-0 pt-0.5">ZKP:</span>
                    <span class="font-mono text-[8.5px] text-[#1c120c]">
                      {selected.commitments?.length
                        ? `${selected.commitments.length} COMMITMENT(S) POSEIDON`
                        : "TIDAK ADA"}
                    </span>
                  </div>
                </div>

                <!-- Riwayat Klaim List -->
                {#if selected.claims && selected.claims.length > 0}
                  <div class="bg-[#dfdfdf] border-2 border-[#808080] border-t-white border-l-white p-1.5">
                    <span class="font-pixel text-[6.5px] text-[#404040] block mb-1">
                      RIWAYAT_KLAIM.TXT ({selected.claims.length})
                    </span>
                    <div class="max-h-[76px] overflow-y-auto flex flex-col gap-1 bg-white border border-[#808080] p-1">
                      {#each selected.claims as claim}
                        <div class="flex items-center justify-between gap-1 px-1 py-0.5 border-b border-[#dfdfdf] last:border-0">
                          <span class="font-sans text-[9px] truncate min-w-0">
                            <strong>{claim.claimantName || "Anon"}</strong>
                            <span class="font-mono text-[7.5px] text-[#808080]">({claim.claimantNpm})</span>
                          </span>
                          <span class="font-mono text-[7px] px-1 shrink-0 font-bold {claim.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : claim.status === 'rejected' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'}">
                            {claim.status}
                          </span>
                        </div>
                      {/each}
                    </div>
                  </div>
                {/if}

                <!-- Tombol Aksi ala Toolbar -->
                <div class="mt-auto flex gap-1.5 pt-1">
                  <button
                    type="button"
                    onclick={copyCode}
                    class="ex-btn-lg flex-1 font-pixel text-[7px] md:text-[8px] py-1.5 cursor-pointer font-bold text-[#1c120c]"
                  >
                    SALIN ID
                  </button>
                  <button
                    type="button"
                    onclick={onClose}
                    class="ex-btn-lg flex-1 font-pixel text-[7px] md:text-[8px] py-1.5 cursor-pointer font-bold text-[#1c120c]"
                  >
                    TUTUP
                  </button>
                </div>
              </div>
            </div>
          {:else}
            <div class="flex-1 flex items-center justify-center font-pixel text-[8px] text-[#808080]">
              PILIH BERKAS DARI PANEL KIRI
            </div>
          {/if}
        </div>
      </div>

      <!-- Status Bar Bawah ala Explorer -->
      <div class="win95-statusbar flex items-center gap-2 px-2 py-[3px] shrink-0">
        <span class="font-mono text-[7.5px] text-[#404040] flex-1">
          {totalObjects} object(s) • {photoObjects} dengan foto bukti
        </span>
        <span class="font-mono text-[7.5px] text-[#404040]">
          {selected ? displayCode : "-"} • C:\ARSIP_SATPAM
        </span>
      </div>
    </div>
  </div>

  <!-- Modal Zoom Foto Bukti -->
  {#if isImageZoomed && selected && hasPhoto}
    <div
      class="fixed inset-0 z-60 bg-black/85 flex items-center justify-center p-4 cursor-zoom-out"
      onclick={() => isImageZoomed = false}
      transition:fade={{ duration: 120 }}
      role="button"
      tabindex="-1"
      onkeydown={(e) => { if (e.key === "Escape") isImageZoomed = false; }}
    >
      <div class="relative max-w-2xl bg-[#c0c0c0] p-2 border-2 border-[#dfdfdf] border-b-[#404040] border-r-[#404040] shadow-2xl flex flex-col items-center">
        <div class="explorer-titlebar w-full flex items-center justify-between px-2 py-1 mb-2">
          <span class="font-pixel text-[7px] text-white font-bold truncate">{displayCode}_FOTO_BUKTI.BMP</span>
          <span class="ex-btn flex items-center justify-center text-[7px] leading-none">✕</span>
        </div>
        <img
          src={selected.evidencePhoto}
          alt="Foto bukti fisik diperbesar"
          class="max-w-full max-h-[70vh] object-contain border-2 border-[#808080]"
        />
        <div class="mt-1.5 font-mono text-[8px] text-[#404040]">
          Klik di mana saja untuk menutup
        </div>
      </div>
    </div>
  {/if}
{/if}

<style>
  .explorer-window {
    background: #c0c0c0;
    border: 2px solid;
    border-color: #dfdfdf #404040 #404040 #dfdfdf;
    box-shadow: 2px 2px 0 #0a0a0a, 4px 4px 0 4px #0a0a0a55;
  }

  .explorer-titlebar {
    background: linear-gradient(90deg, #000080 0%, #1084d0 100%);
    border-bottom: 1px solid #404040;
    cursor: default;
    flex-shrink: 0;
  }

  .ex-btn {
    width: 15px;
    height: 13px;
    background: #c0c0c0;
    border: 1px solid;
    border-color: #ffffff #808080 #808080 #ffffff;
    color: #1c120c;
  }

  .win95-menubar {
    background: #c0c0c0;
    flex-shrink: 0;
  }

  .ex-panel-header {
    background: #dfdfdf;
  }

  .ex-btn-lg {
    background: #c0c0c0;
    border: 2px solid;
    border-color: #ffffff #808080 #808080 #ffffff;
    box-shadow: 1px 1px 0 #808080;
    transition: none;
  }

  .ex-btn-lg:active {
    border-color: #808080 #ffffff #ffffff #808080;
    box-shadow: none;
    transform: translate(1px, 1px);
  }

  .win95-statusbar {
    background: #c0c0c0;
    border-top: 1px solid #ffffff;
    box-shadow: inset 0 1px 0 #808080;
  }
</style>
