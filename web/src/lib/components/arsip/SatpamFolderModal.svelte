<script lang="ts">
  import type { Item } from "$lib/stores/items.js";
  import TagIcon from "../shared/TagIcon.svelte";
  import { formatShortCode } from "$lib/utils/shortCode.js";
  import { cubicOut, cubicIn } from "svelte/easing";
  import { fade, scale } from "svelte/transition";

  let {
    folderTitle,
    folderPath,
    folderItems,
    initialSelectedId = null,
    onClose,
  }: {
    folderTitle: string;
    folderPath: string;
    folderItems: Item[];
    initialSelectedId?: string | null;
    onClose: () => void;
  } = $props();

  let selectedId = $state<string | null>(null);
  let isImageZoomed = $state(false);

  $effect(() => {
    selectedId = initialSelectedId || null;
  });
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
      sortMode === "newest"
        ? b[0].localeCompare(a[0])
        : a[0].localeCompare(b[0]),
    );
    return entries;
  });

  // Item terpilih dari list file di dalam folder
  const selected = $derived(
    selectedId ? (folderItems.find((i) => i.id === selectedId) ?? null) : null,
  );

  const displayCode = $derived(
    selected ? formatShortCode(selected.shortCode, selected.id) : "#ITEM",
  );
  const hasPhoto = $derived(
    Boolean(selected?.evidencePhoto && selected.evidencePhoto.trim() !== ""),
  );
  const totalObjects = $derived(folderItems.length);
  const photoObjects = $derived(
    folderItems.filter((i) => i.evidencePhoto && i.evidencePhoto.trim() !== "")
      .length,
  );

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
          i.desc.toLowerCase().includes(q),
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
    if (
      folderItems.length > 0 &&
      (!selectedId || !folderItems.some((i) => i.id === selectedId))
    ) {
      const first = [...folderItems].sort((a, b) =>
        sortMode === "newest"
          ? `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`)
          : `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`),
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

<div
  class="modal-overlay backdrop-blur-sm flex items-center justify-center p-3"
  style="z-index: 1000;"
  transition:fade|global={{ duration: 250, easing: cubicOut }}
  onclick={(e) => {
    if (e.target === e.currentTarget && !isImageZoomed) onClose();
  }}
  role="dialog"
  tabindex="-1"
  onkeydown={(e) => {
    if (e.key === "Escape") {
      if (isImageZoomed) {
        isImageZoomed = false;
      } else {
        onClose();
      }
    }
  }}
>
  <!-- Explorer Window ala NES.css: Flat, Square, Border Tebal, Hard Shadow -->
  <div
    class="nes-window relative w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden select-none"
    transition:scale|global={{ start: 0.92, duration: 250, easing: cubicOut }}
  >
    <!-- Title Bar: Biru Flat + Judul Putih + Tombol Kotak -->
    <div class="nes-titlebar flex items-center justify-between px-2.5 py-2">
      <div class="flex items-center gap-2 min-w-0">
        <span
          class="w-4 h-4 bg-white border-2 border-[#1c120c] flex items-center justify-center text-[9px] shrink-0"
          >📁</span
        >
        <span
          class="font-pixel text-[10px] md:text-[11px] text-white font-bold tracking-wide truncate"
        >
          {folderPath}{selected
            ? `\\LAP_${displayCode.replace("#", "")}`
            : ""}
        </span>
      </div>
      <div class="flex items-center gap-2 shrink-0">
        <span
          class="nes-btn-sm flex items-center justify-center text-[8px] leading-none pb-[2px]"
          >_</span
        >
        <span
          class="nes-btn-sm flex items-center justify-center text-[8px] leading-none"
          >□</span
        >
        <button
          type="button"
          onclick={onClose}
          aria-label="Tutup Explorer"
          class="nes-btn-sm nes-btn-close flex items-center justify-center text-[8px] leading-none cursor-pointer font-bold"
        >
          ✕
        </button>
      </div>
    </div>

    <!-- Search Bar + Sort Control -->
    <div
      class="flex items-center gap-2 px-2.5 py-2 bg-[#f8fafc] border-b-2 border-[#1c120c] shrink-0"
    >
      <span class="text-[12px]">🔍</span>
      <input
        type="text"
        bind:value={searchQuery}
        placeholder="Cari nama barang / short ID / lokasi..."
        class="flex-1 bg-white border-2 border-[#1c120c] rounded-none py-1.5 px-2.5 font-sans text-xs md:text-sm font-bold text-[#1c120c] placeholder-stone-400 outline-none focus:border-[#2563eb] transition-colors"
      />
      {#if searchQuery}
        <button
          type="button"
          onclick={() => (searchQuery = "")}
          class="nes-btn font-pixel text-[8.5px] md:text-[9px] py-1.5 px-2.5 cursor-pointer font-bold text-[#1c120c] shrink-0"
        >
          RESET
        </button>
      {/if}
      <button
        type="button"
        onclick={() => (sortMode = sortMode === "newest" ? "oldest" : "newest")}
        class="nes-btn font-pixel text-[9px] md:text-[9.5px] py-1.5 px-3 cursor-pointer font-bold text-[#1c120c] shrink-0"
        title="Ubah urutan arsip"
      >
        {sortMode === "newest" ? "▼ TERBARU" : "▲ TERLAMA"}
      </button>
    </div>

    <!-- Body Explorer: Panel Kiri List + Panel Kanan Preview -->
    <div
      class="flex-1 flex flex-col md:flex-row gap-[8px] min-h-0 bg-[#f1f5f9] p-[8px] overflow-hidden"
    >
      <!-- Panel Kiri: Tree List Arsip per Tanggal -->
      <div
        class="w-full md:w-[320px] shrink-0 bg-white border-3 border-[#1c120c] flex flex-col min-h-[150px] md:min-h-0 overflow-hidden"
      >
        <div
          class="nes-panel-header font-pixel text-[9.5px] text-[#1c120c] px-2.5 py-2 border-b-2 border-[#1c120c] flex items-center justify-between shrink-0"
        >
          <span>📁 ARSIP_TANGGAL</span>
          <span class="font-mono text-[9px] text-[#78716c] font-bold"
            >{totalObjects} OBJ</span
          >
        </div>

        <div class="flex-1 overflow-y-auto p-1.5">
          {#each filteredGroups as [date, groupItems] (date)}
            <div class="mb-2">
              <div
                class="flex items-center gap-1.5 px-1.5 py-1 bg-[#e2e8f0] border-2 border-[#1c120c] sticky top-0 z-10"
              >
                <span class="text-[10px]">📅</span>
                <span class="font-mono text-[10px] font-bold text-[#1d4ed8]"
                  >{date}</span
                >
                <span
                  class="font-mono text-[8.5px] text-[#78716c] font-bold ml-auto"
                  >({groupItems.length})</span
                >
              </div>
              {#each groupItems as it (it.id)}
                {@const isSelected = selectedId === it.id}
                <button
                  type="button"
                  onclick={() => selectItem(it.id)}
                  class="w-full flex items-center gap-2 px-2 py-1.5 text-left cursor-pointer border-2 mt-1 transition-all duration-150 {isSelected
                    ? 'bg-[#2563eb] text-white border-[#1c120c] translate-x-1 shadow-[2px_2px_0px_#1c120c]'
                    : 'border-transparent hover:border-[#e2e8f0] hover:bg-[#f8fafc] text-[#1c120c]'}"
                >
                  <span class="text-[11px] shrink-0">
                    {it.evidencePhoto && it.evidencePhoto.trim() !== ""
                      ? "📷"
                      : "📄"}
                  </span>
                  <span class="flex-1 min-w-0">
                    <span
                      class="block font-sans text-xs md:text-[13px] font-bold truncate leading-tight"
                    >
                      {it.title}
                    </span>
                    <span
                      class="block font-mono text-[9.5px] font-bold {isSelected
                        ? 'text-[#dbeafe]'
                        : 'text-[#78716c]'} truncate mt-0.5"
                    >
                      {formatShortCode(it.shortCode, it.id)} • {it.type ===
                      "found"
                        ? "TEMUAN"
                        : "HILANG"} • {it.status.toUpperCase()}
                    </span>
                  </span>
                </button>
              {/each}
            </div>
          {:else}
            <div
              class="p-4 text-center font-pixel text-[9px] text-[#78716c] font-bold"
            >
              {searchQuery ? "FILE TIDAK DITEMUKAN" : "ARSIP KOSONG"}
            </div>
          {/each}
        </div>
      </div>

      <!-- Panel Kanan: Preview Berkas Aktif -->
      <div
        class="flex-1 bg-white border-3 border-[#1c120c] flex flex-col min-h-0 overflow-hidden"
      >
        {#if selected}
          <!-- Preview Header -->
          <div
            class="nes-panel-header-accent font-pixel text-[10.5px] md:text-[11.5px] text-white px-3 py-2 border-b-2 border-[#1c120c] flex items-center justify-between gap-2 shrink-0"
          >
            <span class="truncate font-bold tracking-wide"
              >🔍 {selected.title}</span
            >
            <button
              type="button"
              onclick={copyCode}
              class="px-2.5 py-1 bg-white text-[#1c120c] border-2 border-[#1c120c] font-mono text-xs font-bold cursor-pointer hover:bg-[#f1f5f9] active:translate-y-0.5 shrink-0"
              title="Klik untuk menyalin short code"
            >
              {displayCode}
              {copyFeedback ? "✓" : "📋"}
            </button>
          </div>

          <!-- Preview Body: Foto Bukti Kiri + Properties Kanan -->
          <div
            class="flex-1 overflow-y-auto p-3 flex flex-col sm:flex-row gap-3 min-h-0"
          >
            <!-- Preview Pane Foto Bukti (Frame Kotak ala NES.css) -->
            <div class="sm:w-[40%] shrink-0 flex flex-col items-center gap-2.5">
              <div
                class="w-full aspect-square bg-[#1e293b] border-4 border-[#1c120c] shadow-[4px_4px_0px_#1c120c] overflow-hidden flex items-center justify-center relative group"
              >
                {#if hasPhoto}
                  <button
                    type="button"
                    onclick={() => (isImageZoomed = true)}
                    class="w-full h-full block cursor-zoom-in"
                    title="Klik untuk memperbesar foto bukti"
                  >
                    <img
                      src={selected.evidencePhoto}
                      alt="Foto bukti fisik asli pelapor"
                      class="w-full h-full object-cover"
                    />
                  </button>
                  <div
                    class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-2 pointer-events-none"
                  >
                    <span class="font-pixel text-[8.5px] text-white font-bold"
                      >🔍 KLIK PERBESAR</span
                    >
                  </div>
                {:else}
                  <div class="flex flex-col items-center gap-2 p-4 text-center">
                    <TagIcon
                      tag={selected.tag}
                      fallback={selected.icon}
                      size={64}
                      title={selected.title}
                    />
                    <span
                      class="font-pixel text-[8.5px] text-slate-300 font-bold"
                      >NO_PREVIEW.BMP</span
                    >
                  </div>
                {/if}
              </div>

              <!-- Stempel status -->
              <div class="w-full flex gap-2">
                <div
                  class="flex-1 bg-[#f8fafc] border-2 border-[#1c120c] px-2 py-1 text-center shadow-[2px_2px_0px_#1c120c]"
                >
                  <span
                    class="font-pixel text-[8.5px] md:text-[9px] text-[#78716c] block"
                    >STATUS</span
                  >
                  <span
                    class="font-mono text-[11px] md:text-xs font-bold {selected.status ===
                    'resolved'
                      ? 'text-emerald-700'
                      : selected.status === 'disputed'
                        ? 'text-orange-600'
                        : 'text-[#2563eb]'}"
                  >
                    {selected.status.toUpperCase()}
                  </span>
                </div>
                <div
                  class="flex-1 bg-[#f8fafc] border-2 border-[#1c120c] px-2 py-1 text-center shadow-[2px_2px_0px_#1c120c]"
                >
                  <span
                    class="font-pixel text-[8.5px] md:text-[9px] text-[#78716c] block"
                    >JENIS</span
                  >
                  <span
                    class="font-mono text-[11px] md:text-xs font-bold {selected.type ===
                    'found'
                      ? 'text-emerald-700'
                      : 'text-rose-700'}"
                  >
                    {selected.type === "found" ? "TEMUAN" : "HILANG"}
                  </span>
                </div>
              </div>
            </div>

            <!-- Properties Dialog Kanan (Keterangan Barang) -->
            <div class="flex-1 min-w-0 flex flex-col gap-2">
              <!-- Field Grid Properties -->
              <div
                class="bg-[#f8fafc] border-2 border-[#1c120c] shadow-[3px_3px_0px_#1c120c] p-3 md:p-3.5 flex flex-col gap-2 md:gap-2.5"
              >
                <div class="flex items-start border-b border-[#e2e8f0] pb-2">
                  <span
                    class="font-pixel text-[10px] md:text-[10.5px] text-[#78716c] w-[112px] shrink-0 pt-0.5"
                    >NAMA_FILE:</span
                  >
                  <span
                    class="font-sans text-sm md:text-[15px] font-extrabold text-[#1c120c] truncate"
                    >{selected.title}</span
                  >
                </div>
                <div class="flex items-start border-b border-[#e2e8f0] pb-2">
                  <span
                    class="font-pixel text-[10px] md:text-[10.5px] text-[#78716c] w-[112px] shrink-0 pt-0.5"
                    >WAKTU:</span
                  >
                  <span
                    class="font-mono text-xs md:text-[13px] font-bold text-[#1c120c]"
                    >{selected.date || "-"} • {selected.time || "-"}</span
                  >
                </div>
                <div class="flex items-start border-b border-[#e2e8f0] pb-2">
                  <span
                    class="font-pixel text-[10px] md:text-[10.5px] text-[#78716c] w-[112px] shrink-0 pt-0.5"
                    >LOKASI:</span
                  >
                  <span
                    class="font-sans text-xs md:text-[13.5px] font-bold text-[#1c120c] truncate"
                    >📍 {selected.desc || "-"}</span
                  >
                </div>
                <div class="flex items-start border-b border-[#e2e8f0] pb-2">
                  <span
                    class="font-pixel text-[10px] md:text-[10.5px] text-[#78716c] w-[112px] shrink-0 pt-0.5"
                    >KATEGORI:</span
                  >
                  <span
                    class="font-mono text-xs md:text-[13px] font-bold text-[#1c120c] truncate"
                    >{selected.category || "Umum"} • {selected.tag ||
                      "Barang"}</span
                  >
                </div>
                <div class="flex items-start border-b border-[#e2e8f0] pb-2">
                  <span
                    class="font-pixel text-[10px] md:text-[10.5px] text-[#78716c] w-[112px] shrink-0 pt-0.5"
                    >PELAPOR:</span
                  >
                  <span
                    class="font-sans text-xs md:text-[13.5px] font-bold text-[#1c120c] truncate"
                    >{selected.reporterName || "Anonim"}</span
                  >
                </div>
                <div class="flex items-start border-b border-[#e2e8f0] pb-2">
                  <span
                    class="font-pixel text-[10px] md:text-[10.5px] text-[#78716c] w-[112px] shrink-0 pt-0.5"
                    >NPM:</span
                  >
                  <span
                    class="font-mono text-xs md:text-[13px] font-bold text-[#1c120c]"
                    >{selected.reporterNpm || "-"}</span
                  >
                </div>
                {#if selected.reporterContact}
                  <div class="flex items-start border-b border-[#e2e8f0] pb-2">
                    <span
                      class="font-pixel text-[10px] md:text-[10.5px] text-[#78716c] w-[112px] shrink-0 pt-0.5"
                      >KONTAK:</span
                    >
                    <span
                      class="font-mono text-xs md:text-[13px] font-bold text-[#2563eb] truncate"
                      >{selected.reporterContact}</span
                    >
                  </div>
                {/if}
                <div class="flex items-start">
                  <span
                    class="font-pixel text-[10px] md:text-[10.5px] text-[#78716c] w-[112px] shrink-0 pt-0.5"
                    >ZKP:</span
                  >
                  <span
                    class="font-mono text-xs md:text-[13px] font-bold text-[#1c120c]"
                  >
                    {selected.commitments?.length
                      ? `${selected.commitments.length} COMMITMENT(S) POSEIDON`
                      : "TIDAK ADA"}
                  </span>
                </div>
              </div>

              <!-- Riwayat Klaim List -->
              {#if selected.claims && selected.claims.length > 0}
                <div
                  class="bg-[#f8fafc] border-2 border-[#1c120c] shadow-[3px_3px_0px_#1c120c] p-2.5"
                >
                  <span
                    class="font-pixel text-[9px] md:text-[9.5px] text-[#78716c] block mb-1.5"
                  >
                    RIWAYAT_KLAIM.TXT ({selected.claims.length})
                  </span>
                  <div
                    class="max-h-[96px] overflow-y-auto flex flex-col gap-1 bg-white border-2 border-[#1c120c] p-1.5"
                  >
                    {#each selected.claims as claim}
                      <div
                        class="flex items-center justify-between gap-2 px-1.5 py-1 border-b border-[#e2e8f0] last:border-0"
                      >
                        <span
                          class="font-sans text-xs truncate min-w-0 text-[#1c120c]"
                        >
                          <strong>{claim.claimantName || "Anon"}</strong>
                          <span class="font-mono text-[10px] text-[#78716c]"
                            >({claim.claimantNpm})</span
                          >
                        </span>
                        <span
                          class="font-mono text-[9px] px-1.5 py-0.5 shrink-0 font-bold border-2 border-[#1c120c] {claim.status ===
                          'approved'
                            ? 'bg-emerald-100 text-emerald-800'
                            : claim.status === 'rejected'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'}"
                        >
                          {claim.status.toUpperCase()}
                        </span>
                      </div>
                    {/each}
                  </div>
                </div>
              {/if}

              <!-- Tombol Aksi ala NES.css -->
              <div class="mt-auto flex gap-2 pt-1.5">
                <button
                  type="button"
                  onclick={copyCode}
                  class="nes-btn flex-1 font-pixel text-[10px] md:text-[11px] py-2.5 cursor-pointer font-bold text-[#1c120c]"
                >
                  SALIN ID
                </button>
                <button
                  type="button"
                  onclick={onClose}
                  class="nes-btn flex-1 font-pixel text-[10px] md:text-[11px] py-2.5 cursor-pointer font-bold text-white"
                >
                  TUTUP
                </button>
              </div>
            </div>
          </div>
        {:else}
          <div
            class="flex-1 flex items-center justify-center font-pixel text-[10px] text-[#78716c] font-bold"
          >
            PILIH BERKAS DARI PANEL KIRI
          </div>
        {/if}
      </div>
    </div>

    <!-- Status Bar Bawah ala Explorer -->
    <div
      class="win95-statusbar font-pixel text-[8.5px] md:text-[9px] flex items-center gap-2 px-2.5 py-2 shrink-0"
    >
      <span class="text-[#1c120c] font-bold flex-1">
        {totalObjects} FILE • {photoObjects} FOTO BUKTI
      </span>
      <span class="text-[#1c120c] font-bold truncate ml-2">
        {selected ? displayCode : "-"} • {folderPath}
      </span>
    </div>
  </div>
</div>

<!-- Modal Zoom Foto Bukti: z-index 2500 di atas modal explorer (z-1000) -->
{#if isImageZoomed && selected && hasPhoto}
  <div
    class="fixed inset-0 flex items-center justify-center p-4 cursor-zoom-out"
    style="z-index: 2500; background-color: rgba(10, 6, 15, 0.88); backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);"
    onclick={(e) => {
      if (e.target === e.currentTarget) isImageZoomed = false;
    }}
    transition:fade|global={{ duration: 200, easing: cubicOut }}
    role="dialog"
    tabindex="-1"
    aria-modal="true"
    aria-label="Foto Bukti Diperbesar"
    onkeydown={(e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        isImageZoomed = false;
      }
    }}
  >
    <div
      class="relative max-w-md w-full bg-[#f8fafc] p-2 border-4 border-[#1c120c] shadow-[8px_8px_0px_#0c0812] flex flex-col items-center select-none cursor-default"
      transition:scale|global={{ start: 0.92, duration: 200, easing: cubicOut }}
    >
      <!-- Titlebar Zoom Modal -->
      <div
        class="nes-titlebar w-full flex items-center justify-between px-2.5 py-1.5 mb-1.5 shrink-0"
      >
        <div class="flex items-center gap-1.5 min-w-0">
          <span class="text-xs">🔍</span>
          <span
            class="font-pixel text-[9px] text-white font-bold tracking-wide truncate"
          >
            {displayCode}_FOTO_BUKTI.BMP
          </span>
        </div>
        <button
          type="button"
          onclick={() => (isImageZoomed = false)}
          class="nes-btn-sm nes-btn-close flex items-center justify-center text-[8.5px] leading-none cursor-pointer font-bold"
          aria-label="Tutup zoom foto"
        >
          ✕
        </button>
      </div>

      <!-- Foto Bukti Asli -->
      <div
        class="w-full flex items-center justify-center bg-[#0f172a] border-3 border-[#1c120c] p-1 overflow-hidden"
      >
        <img
          src={selected.evidencePhoto}
          alt="Foto bukti fisik asli pelapor diperbesar"
          class="max-w-full max-h-[45vh] object-contain shadow-[2px_2px_0px_#000000]"
        />
      </div>

      <!-- Petunjuk Singkat Bawah -->
      <div class="mt-1.5 font-pixel text-[8px] text-[#78716c] font-bold text-center">
        Klik di luar frame untuk menutup
      </div>
    </div>
  </div>
{/if}

<style>
  /* Jendela utama ala NES.css: flat, square, border tebal, hard shadow */
  .nes-window {
    background: #f8fafc;
    border: 4px solid #1c120c;
    border-radius: 0;
    box-shadow: 6px 6px 0px #0c0812;
  }

  /* Title bar flat biru tanpa gradasi */
  .nes-titlebar {
    background: #2563eb;
    border-bottom: 4px solid #1c120c;
    cursor: default;
    flex-shrink: 0;
  }

  /* Tombol kotak kecil ala NES.css */
  .nes-btn-sm {
    width: 18px;
    height: 15px;
    background: #ffffff;
    border: 2px solid #1c120c;
    border-radius: 0;
    color: #1c120c;
    box-shadow: 2px 2px 0px #1c120c;
    transition:
      transform 0.12s cubic-bezier(0.16, 1, 0.3, 1),
      box-shadow 0.12s cubic-bezier(0.16, 1, 0.3, 1),
      background-color 0.15s ease;
  }

  .nes-btn-sm:hover {
    background: #e2e8f0;
  }

  .nes-btn-sm:active {
    box-shadow: none;
    transform: translate(1px, 1px);
  }

  .nes-btn-close {
    background: #dc2626;
    color: #ffffff;
    box-shadow: 2px 2px 0px #1c120c;
  }

  .nes-btn-close:hover {
    background: #b91c1c;
  }

  /* Header panel list: abu flat */
  .nes-panel-header {
    background: #e2e8f0;
  }

  /* Header panel preview: biru flat */
  .nes-panel-header-accent {
    background: #2563eb;
  }

  /* Tombol ala NES.css: putih, border tebal, hard shadow, tekan = turun */
  .nes-btn {
    background: #ffffff;
    border: 3px solid #1c120c;
    border-radius: 0;
    box-shadow: 4px 4px 0px #1c120c;
    transition:
      transform 0.12s cubic-bezier(0.16, 1, 0.3, 1),
      box-shadow 0.12s cubic-bezier(0.16, 1, 0.3, 1),
      background-color 0.15s ease;
  }

  .nes-btn:hover {
    background: #f1f5f9;
  }

  .nes-btn:active {
    box-shadow: none;
    transform: translate(3px, 3px);
  }

  /* TUTUP primary: biru */
  button.nes-btn:where(.text-white) {
    background: #2563eb;
  }

  button.nes-btn:where(.text-white):hover {
    background: #1d4ed8;
  }

  /* Status bar flat */
  .win95-statusbar {
    background: #f8fafc;
    border-top: 4px solid #1c120c;
  }
</style>
