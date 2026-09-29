<script lang="ts">
  import type { Item } from "$lib/stores/items.js";
  import TagIcon from "./TagIcon.svelte";
  import { formatShortCode } from "$lib/utils/shortCode.js";
  import { fade, scale } from "svelte/transition";

  let {
    folderTitle,
    folderPath,
    folderItems,
    onClose,
  }: {
    folderTitle: string;
    folderPath: string;
    folderItems: Item[];
    onClose: () => void;
  } = $props();

  let selectedId = $state<string | null>(null);
  let isImageZoomed = $state(false);
  let copyFeedback = $state(false);
  let searchQuery = $state("");
  let sortMode = $state<"newest" | "oldest">("newest");

  // List arsip digroup per tanggal untuk panel kiri explorer (full evidence board)
  const archiveGroups = $derived.by(() => {
    const groups = new Map<string, Item[]>();
    for (const it of folderItems) {
      const key = it.date || "NO-DATE";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(it);
    }
    const entries = Array.from(groups.entries());

    // Urutkan tanggal sesuai sortMode terpilih
    entries.sort((a, b) =>
      sortMode === "newest" ? b[0].localeCompare(a[0]) : a[0].localeCompare(b[0])
    );
    return entries;
  });

  // Item terpilih dari list file di dalam folder
  const selected = $derived(
    selectedId
      ? (folderItems.find((i) => i.id === selectedId) ?? null)
      : null
  );

  const displayCode = $derived(selected ? formatShortCode(selected.shortCode, selected.id) : "#ITEM");
  const hasPhoto = $derived(Boolean(selected?.evidencePhoto && selected.evidencePhoto.trim() !== ""));
  const totalObjects = $derived(folderItems.length);
  const photoObjects = $derived(folderItems.filter((i) => i.evidencePhoto && i.evidencePhoto.trim() !== "").length);

  // Filter pencarian (nama barang / short ID / lokasi) untuk list kiri
  const filteredGroups = $derived.by(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return archiveGroups;

    const result: Array<[string, Item[]]> = [];
    for (const [date, groupItems] of archiveGroups) {
      const matched = groupItems.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          (i.shortCode || "").toLowerCase().includes(q) ||
          formatShortCode(i.shortCode, i.id).toLowerCase().includes(q) ||
          i.desc.toLowerCase().includes(q)
      );
      if (matched.length > 0) result.push([date, matched]);
    }
    return result;
  });

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

  // Auto-pilih file pertama saat folder dibuka agar preview tidak kosong
  $effect(() => {
    if (folderItems.length > 0 && (!selectedId || !folderItems.some((i) => i.id === selectedId))) {
      const first = [...folderItems].sort((a, b) =>
        sortMode === "newest"
          ? `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`)
          : `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`)
      )[0];
      selectedId = first.id;
    }
    if (folderItems.length === 0) {
      selectedId = null;
    }
    isImageZoomed = false;
    copyFeedback = false;
    searchQuery = "";
  });
</script>

{#if folderItems}
  <div
    class="modal-overlay backdrop-blur-xs z-50 flex items-center justify-center p-4"
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
    <!-- Explorer Window: Struktur Win95, Border Pixel NES.css Autentik -->
    <div
      class="nes-box explorer-window relative w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden bg-[#f8fafc]"
      transition:scale={{ start: 0.93, duration: 200 }}
    >
      <!-- Title Bar: Biru Flat NES + Tombol Kotak -->
      <div class="explorer-titlebar flex items-center justify-between px-3 py-2">
        <div class="flex items-center gap-2 min-w-0">
          <span class="w-4 h-4 bg-white border-2 border-[#1c120c] flex items-center justify-center text-[9px] shrink-0">📁</span>
          <span class="font-pixel text-[10px] md:text-[11px] text-white font-bold tracking-wide truncate">
            C:\ARSIP_SATPAM\{selected ? `LAP_${displayCode.replace('#', '')}` : "BERKAS"}
          </span>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <span class="ex-btn flex items-center justify-center text-[8px] leading-none pb-1">_</span>
          <span class="ex-btn flex items-center justify-center text-[8px] leading-none">□</span>
          <button
            type="button"
            onclick={onClose}
            aria-label="Tutup Explorer"
            class="ex-btn ex-btn-close flex items-center justify-center text-[8px] leading-none cursor-pointer font-bold"
          >
            ✕
          </button>
        </div>
      </div>

      <!-- Menu Bar -->
      <div class="win95-menubar font-pixel text-[9px] md:text-[10px] text-[#78716c] flex items-center gap-4 px-3 py-2 border-b-2 border-[#1c120c] shrink-0">
        <span class="hover:bg-[#2563eb] hover:text-white px-1.5 py-0.5 cursor-default">File</span>
        <span class="hover:bg-[#2563eb] hover:text-white px-1.5 py-0.5 cursor-default">Edit</span>
        <span class="hover:bg-[#2563eb] hover:text-white px-1.5 py-0.5 cursor-default">View</span>
        <span class="hover:bg-[#2563eb] hover:text-white px-1.5 py-0.5 cursor-default">Tools</span>
        <span class="hover:bg-[#2563eb] hover:text-white px-1.5 py-0.5 cursor-default">Help</span>
        <span class="ml-auto font-mono text-[9px] text-[#b45309] font-bold">[DOKUMEN RAHASIA SATPAM]</span>
      </div>

      <!-- Address Bar + Sort Control -->
      <div class="flex items-center gap-2 px-3 py-2 bg-[#f8fafc] border-b-2 border-[#1c120c] shrink-0 flex-wrap">
        <span class="font-pixel text-[9px] text-[#78716c]">Alamat:</span>
        <div class="flex-1 min-w-[180px] bg-white border-2 border-[#1c120c] px-2 py-1 flex items-center gap-1.5">
          <span class="text-[10px]">📁</span>
          <span class="font-mono text-[10.5px] font-bold text-[#1c120c] truncate">{folderPath}</span>
        </div>
        <button
          type="button"
          onclick={() => sortMode = sortMode === "newest" ? "oldest" : "newest"}
          class="nes-btn-8bit font-pixel text-[9px] py-1.5 px-3 cursor-pointer font-bold text-[#1c120c] bg-white shrink-0"
          title="Ubah urutan arsip"
        >
          {sortMode === "newest" ? "▼ TERBARU" : "▲ TERLAMA"}
        </button>
      </div>

      <!-- Search Bar -->
      <div class="flex items-center gap-2 px-3 py-2 bg-[#f8fafc] border-b-2 border-[#1c120c] shrink-0">
        <span class="text-[11px]">🔍</span>
        <input
          type="text"
          bind:value={searchQuery}
          placeholder="Cari nama barang / short ID / lokasi..."
          class="nes-input-8bit flex-1 bg-white py-1.5 px-2.5 font-sans text-xs md:text-sm font-bold text-[#1c120c] placeholder-stone-400 outline-none"
        />
        {#if searchQuery}
          <button
            type="button"
            onclick={() => searchQuery = ""}
            class="nes-btn-8bit font-pixel text-[8.5px] py-1.5 px-2.5 cursor-pointer font-bold text-[#1c120c] bg-white shrink-0"
          >
            RESET
          </button>
        {/if}
      </div>

      <!-- Body Explorer: Panel Kiri List + Panel Kanan Preview -->
      <div class="flex-1 flex flex-col md:flex-row gap-[10px] min-h-0 bg-[#f8fafc] p-[10px] overflow-hidden">

        <!-- Panel Kiri: Tree List Arsip per Tanggal -->
        <div class="nes-box w-full md:w-[320px] shrink-0 bg-white flex flex-col min-h-[150px] md:min-h-0 overflow-hidden">
          <div class="ex-panel-header font-pixel text-[9.5px] text-[#1c120c] px-2.5 py-2 border-b-2 border-[#1c120c] flex items-center justify-between shrink-0">
            <span>📁 ARSIP_TANGGAL</span>
            <span class="font-mono text-[9px] text-[#78716c] font-bold">{totalObjects} OBJ</span>
          </div>

          <div class="flex-1 overflow-y-auto p-1.5">
            {#each filteredGroups as [date, groupItems] (date)}
              <div class="mb-2">
                <div class="flex items-center gap-1.5 px-1.5 py-1 bg-[#e2e8f0] border-2 border-[#1c120c] sticky top-0 z-10">
                  <span class="text-[10px]">📅</span>
                  <span class="font-mono text-[10px] font-bold text-[#1d4ed8]">{date}</span>
                  <span class="font-mono text-[8.5px] text-[#78716c] font-bold ml-auto">({groupItems.length})</span>
                </div>
                {#each groupItems as it (it.id)}
                  {@const isSelected = selectedId === it.id}
                  <button
                    type="button"
                    onclick={() => selectItem(it.id)}
                    class="w-full flex items-center gap-2 px-2 py-1.5 text-left cursor-pointer border-2 mt-1 transition-colors {isSelected
                      ? 'bg-[#2563eb] text-white border-[#1c120c]'
                      : 'border-transparent hover:border-[#dbe3ec] hover:bg-[#f1f5f9] text-[#1c120c]'}"
                  >
                    <span class="text-[11px] shrink-0">
                      {it.evidencePhoto && it.evidencePhoto.trim() !== '' ? '📷' : '📄'}
                    </span>
                    <span class="flex-1 min-w-0">
                      <span class="block font-sans text-xs md:text-[13px] font-bold truncate leading-tight">
                        {it.title}
                      </span>
                      <span class="block font-mono text-[9.5px] font-bold {isSelected ? 'text-[#dbeafe]' : 'text-[#78716c]'} truncate mt-0.5">
                        {formatShortCode(it.shortCode, it.id)} • {it.type === 'found' ? 'TEMUAN' : 'HILANG'} • {it.status.toUpperCase()}
                      </span>
                    </span>
                  </button>
                {/each}
              </div>
            {:else}
              <div class="p-4 text-center font-pixel text-[9px] text-[#78716c] font-bold">
                {searchQuery ? "FILE TIDAK DITEMUKAN" : "ARSIP KOSONG"}
              </div>
            {/each}
          </div>
        </div>

        <!-- Panel Kanan: Preview Berkas Aktif -->
        <div class="nes-box flex-1 bg-white flex flex-col min-h-0 overflow-hidden">
          {#if selected}
            <!-- Preview Header -->
            <div class="ex-panel-header-accent font-pixel text-[9.5px] text-white px-2.5 py-2 border-b-2 border-[#1c120c] flex items-center justify-between gap-2 shrink-0">
              <span class="truncate font-bold tracking-wide">🔍 {selected.title}</span>
              <button
                type="button"
                onclick={copyCode}
                class="px-2 py-1 bg-white text-[#1c120c] border-2 border-[#1c120c] font-mono text-[10px] font-bold cursor-pointer hover:bg-[#f1f5f9] active:translate-y-0.5 shrink-0"
                title="Klik untuk menyalin short code"
              >
                {displayCode} {copyFeedback ? '✓' : '📋'}
              </button>
            </div>

            <!-- Preview Body: Foto Bukti Kiri + Properties Kanan -->
            <div class="flex-1 overflow-y-auto p-3 flex flex-col sm:flex-row gap-3 min-h-0">
              <!-- Preview Pane Foto Bukti -->
              <div class="sm:w-[44%] shrink-0 flex flex-col items-center gap-2.5">
                <div class="w-full aspect-square bg-[#1e293b] border-4 border-[#1c120c] border-image-none overflow-hidden flex items-center justify-center relative group">
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
                      <span class="font-pixel text-[8.5px] text-white font-bold">🔍 KLIK PERBESAR</span>
                    </div>
                  {:else}
                    <div class="flex flex-col items-center gap-2 p-4 text-center">
                      <TagIcon tag={selected.tag} fallback={selected.icon} size={64} title={selected.title} />
                      <span class="font-pixel text-[8.5px] text-slate-300 font-bold">NO_PREVIEW.BMP</span>
                    </div>
                  {/if}
                </div>

                <!-- Stempel status -->
                <div class="w-full flex gap-2">
                  <div class="flex-1 bg-[#f8fafc] border-2 border-[#1c120c] px-2 py-1 text-center">
                    <span class="font-pixel text-[8px] text-[#78716c] block">STATUS</span>
                    <span class="font-mono text-[10px] font-bold {selected.status === 'resolved' ? 'text-emerald-700' : selected.status === 'disputed' ? 'text-orange-600' : 'text-[#2563eb]'}">
                      {selected.status.toUpperCase()}
                    </span>
                  </div>
                  <div class="flex-1 bg-[#f8fafc] border-2 border-[#1c120c] px-2 py-1 text-center">
                    <span class="font-pixel text-[8px] text-[#78716c] block">JENIS</span>
                    <span class="font-mono text-[10px] font-bold {selected.type === 'found' ? 'text-emerald-700' : 'text-rose-700'}">
                      {selected.type === 'found' ? 'TEMUAN' : 'HILANG'}
                    </span>
                  </div>
                </div>
              </div>

              <!-- Properties Dialog Kanan -->
              <div class="flex-1 min-w-0 flex flex-col gap-2">
                <!-- Field Grid Properties -->
                <div class="bg-[#f8fafc] border-2 border-[#1c120c] p-2.5 flex flex-col gap-1.5">
                  <div class="flex items-start border-b border-[#dbe3ec] pb-1.5">
                    <span class="font-pixel text-[8.5px] text-[#78716c] w-[104px] shrink-0 pt-0.5">NAMA_FILE:</span>
                    <span class="font-sans text-xs md:text-[13px] font-bold text-[#1c120c] truncate">{selected.title}</span>
                  </div>
                  <div class="flex items-start border-b border-[#dbe3ec] pb-1.5">
                    <span class="font-pixel text-[8.5px] text-[#78716c] w-[104px] shrink-0 pt-0.5">WAKTU:</span>
                    <span class="font-mono text-[11px] font-bold text-[#1c120c]">{selected.date || "-"} • {selected.time || "-"}</span>
                  </div>
                  <div class="flex items-start border-b border-[#dbe3ec] pb-1.5">
                    <span class="font-pixel text-[8.5px] text-[#78716c] w-[104px] shrink-0 pt-0.5">LOKASI:</span>
                    <span class="font-sans text-[11.5px] font-bold text-[#1c120c] truncate">📍 {selected.desc || "-"}</span>
                  </div>
                  <div class="flex items-start border-b border-[#dbe3ec] pb-1.5">
                    <span class="font-pixel text-[8.5px] text-[#78716c] w-[104px] shrink-0 pt-0.5">KATEGORI:</span>
                    <span class="font-mono text-[10.5px] font-bold text-[#1c120c] truncate">{selected.category || "Umum"} • {selected.tag || "Barang"}</span>
                  </div>
                  <div class="flex items-start border-b border-[#dbe3ec] pb-1.5">
                    <span class="font-pixel text-[8.5px] text-[#78716c] w-[104px] shrink-0 pt-0.5">PELAPOR:</span>
                    <span class="font-sans text-[11.5px] font-bold text-[#1c120c] truncate">{selected.reporterName || "Anonim"}</span>
                  </div>
                  <div class="flex items-start border-b border-[#dbe3ec] pb-1.5">
                    <span class="font-pixel text-[8.5px] text-[#78716c] w-[104px] shrink-0 pt-0.5">NPM:</span>
                    <span class="font-mono text-[11px] font-bold text-[#1c120c]">{selected.reporterNpm || "-"}</span>
                  </div>
                  {#if selected.reporterContact}
                    <div class="flex items-start border-b border-[#dbe3ec] pb-1.5">
                      <span class="font-pixel text-[8.5px] text-[#78716c] w-[104px] shrink-0 pt-0.5">KONTAK:</span>
                      <span class="font-mono text-[11px] font-bold text-[#2563eb] truncate">{selected.reporterContact}</span>
                    </div>
                  {/if}
                  <div class="flex items-start">
                    <span class="font-pixel text-[8.5px] text-[#78716c] w-[104px] shrink-0 pt-0.5">ZKP:</span>
                    <span class="font-mono text-[10.5px] font-bold text-[#1c120c]">
                      {selected.commitments?.length
                        ? `${selected.commitments.length} COMMITMENT(S) POSEIDON`
                        : "TIDAK ADA"}
                    </span>
                  </div>
                </div>

                <!-- Riwayat Klaim List -->
                {#if selected.claims && selected.claims.length > 0}
                  <div class="bg-[#f8fafc] border-2 border-[#1c120c] p-2">
                    <span class="font-pixel text-[8.5px] text-[#78716c] block mb-1.5">
                      RIWAYAT_KLAIM.TXT ({selected.claims.length})
                    </span>
                    <div class="max-h-[92px] overflow-y-auto flex flex-col gap-1 bg-white border-2 border-[#1c120c] p-1.5">
                      {#each selected.claims as claim}
                        <div class="flex items-center justify-between gap-2 px-1.5 py-1 border-b border-[#e2e8f0] last:border-0">
                          <span class="font-sans text-[11px] truncate min-w-0 text-[#1c120c]">
                            <strong>{claim.claimantName || "Anon"}</strong>
                            <span class="font-mono text-[9.5px] text-[#78716c]">({claim.claimantNpm})</span>
                          </span>
                          <span class="font-mono text-[8.5px] px-1.5 py-0.5 shrink-0 font-bold border-2 border-[#1c120c] {claim.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : claim.status === 'rejected' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'}">
                            {claim.status.toUpperCase()}
                          </span>
                        </div>
                      {/each}
                    </div>
                  </div>
                {/if}

                <!-- Tombol Aksi ala nes-btn -->
                <div class="mt-auto flex gap-3 pt-1">
                  <button
                    type="button"
                    onclick={copyCode}
                    class="nes-btn-8bit flex-1 font-pixel text-[9.5px] py-2 cursor-pointer font-bold text-[#1c120c] bg-white"
                  >
                    SALIN ID
                  </button>
                  <button
                    type="button"
                    onclick={onClose}
                    class="nes-btn-8bit flex-1 font-pixel text-[9.5px] py-2 cursor-pointer font-bold text-white bg-[#2563eb]"
                  >
                    TUTUP
                  </button>
                </div>
              </div>
            </div>
          {:else}
            <div class="flex-1 flex items-center justify-center font-pixel text-[10px] text-[#78716c] font-bold">
              PILIH BERKAS DARI PANEL KIRI
            </div>
          {/if}
        </div>
      </div>

      <!-- Status Bar Bawah ala Explorer -->
      <div class="win95-statusbar flex items-center gap-2 px-3 py-2 shrink-0 border-t-2 border-[#1c120c] bg-[#f8fafc]">
        <span class="font-mono text-[9.5px] text-[#44403c] font-bold flex-1">
          {totalObjects} object(s) • {photoObjects} dengan foto bukti
        </span>
        <span class="font-mono text-[9.5px] text-[#44403c] font-bold">
          {selected ? displayCode : "-"} • {folderPath}
        </span>
      </div>
    </div>
  </div>

  <!-- Modal Zoom Foto Bukti -->
  {#if isImageZoomed && selected && hasPhoto}
    <div
      class="fixed inset-0 z-60 bg-[#0c0812]/90 flex items-center justify-center p-4 cursor-zoom-out"
      onclick={() => isImageZoomed = false}
      transition:fade={{ duration: 120 }}
      role="button"
      tabindex="-1"
      onkeydown={(e) => { if (e.key === "Escape") isImageZoomed = false; }}
    >
      <div class="nes-box relative max-w-3xl bg-[#f8fafc] p-2.5 flex flex-col items-center">
        <div class="explorer-titlebar w-full flex items-center justify-between px-2.5 py-1.5 mb-2 shrink-0">
          <span class="font-pixel text-[9px] text-white font-bold truncate">{displayCode}_FOTO_BUKTI.BMP</span>
          <span class="ex-btn flex items-center justify-center text-[8px] leading-none">✕</span>
        </div>
        <img
          src={selected.evidencePhoto}
          alt="Foto bukti fisik diperbesar"
          class="max-w-full max-h-[70vh] object-contain border-3 border-[#1c120c]"
        />
        <div class="mt-2 font-mono text-[9.5px] text-[#78716c] font-bold pb-1">
          Klik di mana saja untuk menutup
        </div>
      </div>
    </div>
  {/if}
{/if}

<style>
  /* Title bar: biru NES flat, tanpa gradient */
  .explorer-titlebar {
    background: #2563eb;
    border-bottom: 2px solid #1c120c;
    cursor: default;
    flex-shrink: 0;
  }

  /* Tombol kotak mini ala nes-btn (title bar) */
  .ex-btn {
    width: 18px;
    height: 15px;
    background: #ffffff;
    border: 2px solid #1c120c;
    color: #1c120c;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .ex-btn-close {
    background: #dc2626;
    color: #ffffff;
  }

  .win95-menubar {
    background: #f8fafc;
    flex-shrink: 0;
  }

  /* Header panel list: abu NES klasik */
  .ex-panel-header {
    background: #e2e8f0;
  }

  /* Header preview: biru NES flat */
  .ex-panel-header-accent {
    background: #2563eb;
  }

  /* Search input ala nes-input: border pixel tanpa radius */
  .nes-input-8bit {
    border: 4px solid #1c120c;
    border-image-slice: 2;
    border-image-width: 2;
    border-image-repeat: stretch;
    border-image-source: url("data:image/svg+xml;utf8,<?xml version='1.0' encoding='UTF-8' ?><svg version='1.1' width='5' height='5' xmlns='http://www.w3.org/2000/svg'><path d='M2 1 h1 v1 h-1 z M1 2 h1 v1 h-1 z M3 2 h1 v1 h-1 z M2 3 h1 v1 h-1 z' fill='rgb(28,18,12)' /></svg>");
  }

  .nes-input-8bit:focus {
    border-image-source: url("data:image/svg+xml;utf8,<?xml version='1.0' encoding='UTF-8' ?><svg version='1.1' width='5' height='5' xmlns='http://www.w3.org/2000/svg'><path d='M2 1 h1 v1 h-1 z M1 2 h1 v1 h-1 z M3 2 h1 v1 h-1 z M2 3 h1 v1 h-1 z' fill='rgb(37,99,235)' /></svg>");
  }

  /* Foto frame: pixel border polos tanpa border-image */
  .border-image-none {
    border-image: none;
  }
</style>
