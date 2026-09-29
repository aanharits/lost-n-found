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
    <!-- Explorer Window: Struktur Win95, Skin 8-Bit Nintendo -->
    <div
      class="explorer-window relative w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden select-none"
      transition:scale={{ start: 0.93, duration: 200 }}
    >
      <!-- Title Bar NES: Coklat Tua + Judul Kuning + Tombol Kotak -->
      <div class="explorer-titlebar flex items-center justify-between px-2.5 py-2">
        <div class="flex items-center gap-2 min-w-0">
          <span class="w-4 h-4 bg-[#fbbf24] border-2 border-[#140b05] rounded-sm flex items-center justify-center text-[9px] shrink-0">📁</span>
          <span class="font-pixel text-[10px] md:text-[11px] text-[#fde68a] font-bold tracking-wide truncate" style="text-shadow: 1px 1px 0 #140b05;">
            C:\ARSIP_SATPAM\{selected ? `LAP_${displayCode.replace('#', '')}` : "BERKAS"}
          </span>
        </div>
        <div class="flex items-center gap-1.5 shrink-0">
          <span class="ex-btn flex items-center justify-center text-[8px] leading-none pb-[2px]">_</span>
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
      <div class="win95-menubar font-pixel text-[9px] md:text-[10px] text-[#713f12] flex items-center gap-4 px-2.5 py-1.5 border-b-3 border-[#1c120c] shrink-0">
        <span class="hover:bg-[#2563eb] hover:text-white px-1.5 py-0.5 rounded-sm cursor-default">File</span>
        <span class="hover:bg-[#2563eb] hover:text-white px-1.5 py-0.5 rounded-sm cursor-default">Edit</span>
        <span class="hover:bg-[#2563eb] hover:text-white px-1.5 py-0.5 rounded-sm cursor-default">View</span>
        <span class="hover:bg-[#2563eb] hover:text-white px-1.5 py-0.5 rounded-sm cursor-default">Tools</span>
        <span class="hover:bg-[#2563eb] hover:text-white px-1.5 py-0.5 rounded-sm cursor-default">Help</span>
        <span class="ml-auto font-mono text-[9px] text-[#b45309] font-bold">[DOKUMEN RAHASIA SATPAM]</span>
      </div>

      <!-- Address Bar + Sort Control -->
      <div class="flex items-center gap-2 px-2.5 py-2 bg-[#fef9c3] border-b-3 border-[#1c120c] shrink-0 flex-wrap">
        <span class="font-pixel text-[9px] text-[#854d0e]">Alamat:</span>
        <div class="flex-1 min-w-[180px] bg-white border-2 border-[#1c120c] shadow-[inset_2px_2px_0_rgba(28,18,12,0.12)] px-2 py-1 flex items-center gap-1.5 rounded-sm">
          <span class="text-[10px]">📁</span>
          <span class="font-mono text-[10.5px] font-bold text-[#1c120c] truncate">{folderPath}</span>
        </div>
        <button
          type="button"
          onclick={() => sortMode = sortMode === "newest" ? "oldest" : "newest"}
          class="ex-btn-lg font-pixel text-[9px] py-1.5 px-3 cursor-pointer font-bold text-[#1c120c] shrink-0 rounded"
          title="Ubah urutan arsip"
        >
          {sortMode === "newest" ? "▼ TERBARU" : "▲ TERLAMA"}
        </button>
      </div>

      <!-- Search Bar -->
      <div class="flex items-center gap-2 px-2.5 py-2 bg-[#fef9c3] border-b-3 border-[#1c120c] shrink-0">
        <span class="text-[11px]">🔍</span>
        <input
          type="text"
          bind:value={searchQuery}
          placeholder="Cari nama barang / short ID / lokasi..."
          class="flex-1 bg-white border-2 border-[#1c120c] shadow-[inset_2px_2px_0_rgba(28,18,12,0.12)] rounded-none py-1.5 px-2.5 font-sans text-xs md:text-sm font-bold text-[#1c120c] placeholder-stone-400 outline-none focus:border-[#2563eb] transition-colors"
        />
        {#if searchQuery}
          <button
            type="button"
            onclick={() => searchQuery = ""}
            class="ex-btn-lg font-pixel text-[8.5px] py-1.5 px-2.5 cursor-pointer font-bold text-[#1c120c] shrink-0 rounded"
          >
            RESET
          </button>
        {/if}
      </div>

      <!-- Body Explorer: Panel Kiri List + Panel Kanan Preview -->
      <div class="flex-1 flex flex-col md:flex-row gap-[8px] min-h-0 bg-[#fefce8] p-[8px] overflow-hidden">

        <!-- Panel Kiri: Tree List Arsip per Tanggal -->
        <div class="w-full md:w-[320px] shrink-0 bg-[#fffbeb] border-3 border-[#1c120c] rounded-lg shadow-[3px_3px_0px_#1c120c] flex flex-col min-h-[150px] md:min-h-0 overflow-hidden">
          <div class="ex-panel-header font-pixel text-[9.5px] text-white px-2.5 py-2 border-b-2 border-[#1c120c] flex items-center justify-between shrink-0">
            <span>📁 ARSIP_TANGGAL</span>
            <span class="font-mono text-[9px] text-[#fde68a] font-bold">{totalObjects} OBJ</span>
          </div>

          <div class="nes-scrollbar flex-1 overflow-y-auto p-1.5">
            {#each filteredGroups as [date, groupItems] (date)}
              <div class="mb-2">
                <div class="flex items-center gap-1.5 px-1.5 py-1 bg-[#fde68a] border-2 border-[#1c120c] rounded-sm sticky top-0 z-10">
                  <span class="text-[10px]">📅</span>
                  <span class="font-mono text-[10px] font-bold text-[#1c120c]">{date}</span>
                  <span class="font-mono text-[8.5px] text-[#854d0e] font-bold ml-auto">({groupItems.length})</span>
                </div>
                {#each groupItems as it (it.id)}
                  {@const isSelected = selectedId === it.id}
                  <button
                    type="button"
                    onclick={() => selectItem(it.id)}
                    class="w-full flex items-center gap-2 px-2 py-1.5 text-left cursor-pointer border-2 mt-1 rounded-sm transition-all {isSelected
                      ? 'bg-[#2563eb] text-white border-[#1c120c] shadow-[2px_2px_0px_#1c120c] -translate-y-0.5'
                      : 'border-transparent hover:border-[#e7d8b9] hover:bg-[#fffbeb] text-[#1c120c]'}"
                  >
                    <span class="text-[11px] shrink-0">
                      {it.evidencePhoto && it.evidencePhoto.trim() !== '' ? '📷' : '📄'}
                    </span>
                    <span class="flex-1 min-w-0">
                      <span class="block font-sans text-xs md:text-[13px] font-bold truncate leading-tight">
                        {it.title}
                      </span>
                      <span class="block font-mono text-[9.5px] font-bold {isSelected ? 'text-[#dbeafe]' : 'text-[#a16207]'} truncate mt-0.5">
                        {formatShortCode(it.shortCode, it.id)} • {it.type === 'found' ? 'TEMUAN' : 'HILANG'} • {it.status.toUpperCase()}
                      </span>
                    </span>
                  </button>
                {/each}
              </div>
            {:else}
              <div class="p-4 text-center font-pixel text-[9px] text-[#a16207] font-bold">
                {searchQuery ? "FILE TIDAK DITEMUKAN" : "ARSIP KOSONG"}
              </div>
            {/each}
          </div>
        </div>

        <!-- Panel Kanan: Preview Berkas Aktif -->
        <div class="flex-1 bg-[#fffbeb] border-3 border-[#1c120c] rounded-lg shadow-[3px_3px_0px_#1c120c] flex flex-col min-h-0 overflow-hidden">
          {#if selected}
            <!-- Preview Header -->
            <div class="ex-panel-header-accent font-pixel text-[9.5px] text-white px-2.5 py-2 border-b-2 border-[#1c120c] flex items-center justify-between gap-2 shrink-0">
              <span class="truncate font-bold tracking-wide">🔍 {selected.title}</span>
              <button
                type="button"
                onclick={copyCode}
                class="px-2 py-1 bg-[#fef3c7] text-[#1c120c] border-2 border-[#1c120c] rounded-sm font-mono text-[10px] font-bold cursor-pointer hover:bg-[#fde68a] active:translate-y-0.5 shrink-0"
                title="Klik untuk menyalin short code"
              >
                {displayCode} {copyFeedback ? '✓' : '📋'}
              </button>
            </div>

            <!-- Preview Body: Foto Bukti Kiri + Properties Kanan -->
            <div class="nes-scrollbar flex-1 overflow-y-auto p-3 flex flex-col sm:flex-row gap-3 min-h-0">
              <!-- Preview Pane Foto Bukti (Frame Chunky NES) -->
              <div class="sm:w-[44%] shrink-0 flex flex-col items-center gap-2.5">
                <div class="w-full aspect-square bg-[#1e293b] border-4 border-[#1c120c] rounded shadow-[4px_4px_0px_#1c120c] overflow-hidden flex items-center justify-center relative group">
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
                  <div class="flex-1 bg-[#fef9c3] border-2 border-[#1c120c] px-2 py-1 text-center rounded-sm shadow-[2px_2px_0px_rgba(28,18,12,0.75)]">
                    <span class="font-pixel text-[8px] text-[#854d0e] block">STATUS</span>
                    <span class="font-mono text-[10px] font-bold {selected.status === 'resolved' ? 'text-emerald-700' : selected.status === 'disputed' ? 'text-orange-600' : 'text-[#2563eb]'}">
                      {selected.status.toUpperCase()}
                    </span>
                  </div>
                  <div class="flex-1 bg-[#fef9c3] border-2 border-[#1c120c] px-2 py-1 text-center rounded-sm shadow-[2px_2px_0px_rgba(28,18,12,0.75)]">
                    <span class="font-pixel text-[8px] text-[#854d0e] block">JENIS</span>
                    <span class="font-mono text-[10px] font-bold {selected.type === 'found' ? 'text-emerald-700' : 'text-rose-700'}">
                      {selected.type === 'found' ? 'TEMUAN' : 'HILANG'}
                    </span>
                  </div>
                </div>
              </div>

              <!-- Properties Dialog Kanan -->
              <div class="flex-1 min-w-0 flex flex-col gap-2">
                <!-- Field Grid Properties -->
                <div class="bg-white border-3 border-[#1c120c] rounded-lg shadow-[3px_3px_0px_rgba(28,18,12,0.75)] p-2.5 flex flex-col gap-1.5">
                  <div class="flex items-start border-b border-[#e7d8b9] pb-1.5">
                    <span class="font-pixel text-[8.5px] text-[#a16207] w-[104px] shrink-0 pt-0.5">NAMA_FILE:</span>
                    <span class="font-sans text-xs md:text-[13px] font-bold text-[#1c120c] truncate">{selected.title}</span>
                  </div>
                  <div class="flex items-start border-b border-[#e7d8b9] pb-1.5">
                    <span class="font-pixel text-[8.5px] text-[#a16207] w-[104px] shrink-0 pt-0.5">WAKTU:</span>
                    <span class="font-mono text-[11px] font-bold text-[#1c120c]">{selected.date || "-"} • {selected.time || "-"}</span>
                  </div>
                  <div class="flex items-start border-b border-[#e7d8b9] pb-1.5">
                    <span class="font-pixel text-[8.5px] text-[#a16207] w-[104px] shrink-0 pt-0.5">LOKASI:</span>
                    <span class="font-sans text-[11.5px] font-bold text-[#1c120c] truncate">📍 {selected.desc || "-"}</span>
                  </div>
                  <div class="flex items-start border-b border-[#e7d8b9] pb-1.5">
                    <span class="font-pixel text-[8.5px] text-[#a16207] w-[104px] shrink-0 pt-0.5">KATEGORI:</span>
                    <span class="font-mono text-[10.5px] font-bold text-[#1c120c] truncate">{selected.category || "Umum"} • {selected.tag || "Barang"}</span>
                  </div>
                  <div class="flex items-start border-b border-[#e7d8b9] pb-1.5">
                    <span class="font-pixel text-[8.5px] text-[#a16207] w-[104px] shrink-0 pt-0.5">PELAPOR:</span>
                    <span class="font-sans text-[11.5px] font-bold text-[#1c120c] truncate">{selected.reporterName || "Anonim"}</span>
                  </div>
                  <div class="flex items-start border-b border-[#e7d8b9] pb-1.5">
                    <span class="font-pixel text-[8.5px] text-[#a16207] w-[104px] shrink-0 pt-0.5">NPM:</span>
                    <span class="font-mono text-[11px] font-bold text-[#1c120c]">{selected.reporterNpm || "-"}</span>
                  </div>
                  {#if selected.reporterContact}
                    <div class="flex items-start border-b border-[#e7d8b9] pb-1.5">
                      <span class="font-pixel text-[8.5px] text-[#a16207] w-[104px] shrink-0 pt-0.5">KONTAK:</span>
                      <span class="font-mono text-[11px] font-bold text-[#2563eb] truncate">{selected.reporterContact}</span>
                    </div>
                  {/if}
                  <div class="flex items-start">
                    <span class="font-pixel text-[8.5px] text-[#a16207] w-[104px] shrink-0 pt-0.5">ZKP:</span>
                    <span class="font-mono text-[10.5px] font-bold text-[#1c120c]">
                      {selected.commitments?.length
                        ? `${selected.commitments.length} COMMITMENT(S) POSEIDON`
                        : "TIDAK ADA"}
                    </span>
                  </div>
                </div>

                <!-- Riwayat Klaim List -->
                {#if selected.claims && selected.claims.length > 0}
                  <div class="bg-[#fffbeb] border-3 border-[#1c120c] rounded-lg shadow-[3px_3px_0px_rgba(28,18,12,0.75)] p-2">
                    <span class="font-pixel text-[8.5px] text-[#a16207] block mb-1.5">
                      RIWAYAT_KLAIM.TXT ({selected.claims.length})
                    </span>
                    <div class="max-h-[92px] overflow-y-auto flex flex-col gap-1 bg-white border-2 border-[#1c120c] rounded-sm p-1.5">
                      {#each selected.claims as claim}
                        <div class="flex items-center justify-between gap-2 px-1.5 py-1 border-b border-[#e7d8b9] last:border-0">
                          <span class="font-sans text-[11px] truncate min-w-0 text-[#1c120c]">
                            <strong>{claim.claimantName || "Anon"}</strong>
                            <span class="font-mono text-[9.5px] text-[#78716c]">({claim.claimantNpm})</span>
                          </span>
                          <span class="font-mono text-[8.5px] px-1.5 py-0.5 shrink-0 font-bold rounded-sm border-2 border-[#1c120c] {claim.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : claim.status === 'rejected' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'}">
                            {claim.status.toUpperCase()}
                          </span>
                        </div>
                      {/each}
                    </div>
                  </div>
                {/if}

                <!-- Tombol Aksi ala Toolbar -->
                <div class="mt-auto flex gap-2 pt-1">
                  <button
                    type="button"
                    onclick={copyCode}
                    class="ex-btn-lg action-btn flex-1 font-pixel text-[9.5px] py-2 cursor-pointer font-bold text-[#1c120c]"
                  >
                    SALIN ID
                  </button>
                  <button
                    type="button"
                    onclick={onClose}
                    class="ex-btn-lg action-btn action-btn-primary flex-1 font-pixel text-[9.5px] py-2 cursor-pointer font-bold text-white"
                  >
                    TUTUP
                  </button>
                </div>
              </div>
            </div>
          {:else}
            <div class="flex-1 flex items-center justify-center font-pixel text-[10px] text-[#a16207] font-bold">
              PILIH BERKAS DARI PANEL KIRI
            </div>
          {/if}
        </div>
      </div>

      <!-- Status Bar Bawah ala Explorer -->
      <div class="win95-statusbar flex items-center gap-2 px-2.5 py-2 shrink-0">
        <span class="font-pixel text-[8.5px] md:text-[9px] text-[#fde68a] font-bold flex-1">
          {totalObjects} FILE • {photoObjects} FOTO BUKTI
        </span>
        <span class="font-mono text-[9.5px] text-[#fde68a] font-bold truncate ml-2">
          {selected ? displayCode : "-"} • {folderPath}
        </span>
      </div>
    </div>
  </div>

  <!-- Modal Zoom Foto Bukti -->
  {#if isImageZoomed && selected && hasPhoto}
    <div
      class="fixed inset-0 z-60 bg-[#140b05]/92 flex items-center justify-center p-4 cursor-zoom-out"
      onclick={() => isImageZoomed = false}
      transition:fade={{ duration: 120 }}
      role="button"
      tabindex="-1"
      onkeydown={(e) => { if (e.key === "Escape") isImageZoomed = false; }}
    >
      <div class="relative max-w-3xl bg-[#fefce8] p-2.5 border-4 border-[#1c120c] rounded-lg shadow-[8px_8px_0px_#0a060f] flex flex-col items-center">
        <div class="explorer-titlebar w-full flex items-center justify-between px-2.5 py-1.5 mb-2 rounded-t shrink-0">
          <span class="font-pixel text-[9px] text-[#fde68a] font-bold truncate" style="text-shadow: 1px 1px 0 #140b05;">{displayCode}_FOTO_BUKTI.BMP</span>
          <span class="ex-btn flex items-center justify-center text-[8px] leading-none">✕</span>
        </div>
        <img
          src={selected.evidencePhoto}
          alt="Foto bukti fisik diperbesar"
          class="max-w-full max-h-[70vh] object-contain border-3 border-[#1c120c] rounded"
        />
        <div class="mt-2 font-pixel text-[8.5px] text-[#78716c] font-bold pb-1">
          Klik di mana saja untuk menutup
        </div>
      </div>
    </div>
  {/if}
{/if}

<style>
  /* Jendela explorer: kertas cream game UI dengan chunky border */
  .explorer-window {
    background: #fefce8;
    border: 4px solid #1c120c;
    border-radius: 12px;
    box-shadow:
      inset 0 2px 0 rgba(255, 255, 255, 0.5),
      inset 0 -3px 0 rgba(0, 0, 0, 0.08),
      8px 8px 0px #0a060f;
  }

  /* Title bar NES: coklat walkway dengan teks kuning */
  .explorer-titlebar {
    background: #b45309 linear-gradient(180deg, #d97706 0%, #b45309 100%);
    border-bottom: 3px solid #1c120c;
    cursor: default;
    flex-shrink: 0;
  }

  .ex-btn {
    width: 18px;
    height: 15px;
    background: #fefce8;
    border: 2px solid #1c120c;
    border-radius: 3px;
    box-shadow: 1px 1px 0 rgba(28, 18, 12, 0.5);
    color: #1c120c;
  }

  .ex-btn-close {
    background: #dc2626;
    color: #ffffff;
    text-shadow: 1px 1px 0 rgba(0, 0, 0, 0.4);
  }

  .win95-menubar {
    background: #fef9c3;
    flex-shrink: 0;
  }

  /* Header panel list: teal NES ala panel-header */
  .ex-panel-header {
    background: #0f766e linear-gradient(180deg, #14b8a6 0%, #0f766e 100%);
  }

  /* Header preview: biru solid ala card header */
  .ex-panel-header-accent {
    background: #2563eb linear-gradient(180deg, #3b82f6 0%, #2563eb 100%);
  }

  /* Tombol NES chunky: kuning dengan shadow offset bawah */
  .ex-btn-lg {
    background: #ffd700;
    border: 2px solid #1c120c;
    box-shadow: 2px 2px 0px #1c120c;
    transition: all 0.1s ease;
  }

  .ex-btn-lg:hover {
    background: #facc15;
  }

  .ex-btn-lg:active {
    transform: translate(2px, 2px);
    box-shadow: none;
  }

  /* Tombol aksi dengan shadow 0 4px ala action-btn */
  .action-btn {
    background: #fef3c7;
    border: 3px solid #1c120c;
    border-radius: 8px;
    box-shadow: 0 4px 0 #1c120c;
    transition: all 0.1s ease;
  }

  .action-btn:hover {
    background: #fde68a;
    border-color: #1c120c;
  }

  .action-btn:active {
    transform: translateY(3px);
    box-shadow: 0 1px 0 #1c120c;
  }

  .action-btn-primary {
    background: #b45309 linear-gradient(180deg, #d97706 0%, #b45309 100%);
    text-shadow: 1px 1px 0 rgba(0, 0, 0, 0.35);
  }

  .action-btn-primary:hover {
    background: #92400e;
  }

  /* Status bar: strip coklat tua dengan teks kuning */
  .win95-statusbar {
    background: #1c120c;
    border-top: 3px solid #1c120c;
  }

  /* Scrollbar chunky amber untuk panel scrollable */
  .nes-scrollbar::-webkit-scrollbar {
    width: 10px;
  }
  .nes-scrollbar::-webkit-scrollbar-track {
    background: #fef9c3;
    border-left: 1px solid #e7d8b9;
  }
  .nes-scrollbar::-webkit-scrollbar-thumb {
    background: #facc15;
    border: 2px solid #1c120c;
    border-radius: 3px;
  }
  .nes-scrollbar::-webkit-scrollbar-thumb:hover {
    background: #f59e0b;
  }
</style>
