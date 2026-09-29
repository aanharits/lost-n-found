<script lang="ts">
  import type { Item } from "$lib/stores/items.js";
  import TagIcon from "./TagIcon.svelte";
  import { formatShortCode } from "$lib/utils/shortCode.js";
  import { fade, scale } from "svelte/transition";

  let {
    folderTitle,
    folderItems,
    onClose,
  }: {
    folderTitle: string;
    folderItems: Item[];
    onClose: () => void;
  } = $props();

  let selectedId = $state<string | null>(null);
  let isImageZoomed = $state(false);
  let copyFeedback = $state(false);
  let searchQuery = $state("");
  let sortMode = $state<"newest" | "oldest">("newest");

  // Pilih file pertama secara otomatis saat folder dibuka
  $effect(() => {
    if (folderItems.length > 0) {
      if (!selectedId || !folderItems.some((i) => i.id === selectedId)) {
        selectedId = folderItems[0].id;
      }
    } else {
      selectedId = null;
    }
  });

  const selected = $derived(
    folderItems.find((i) => i.id === selectedId) ?? null
  );

  const displayCode = $derived(selected ? formatShortCode(selected.shortCode, selected.id) : "#ITEM");
  const hasPhoto = $derived(Boolean(selected?.evidencePhoto && selected.evidencePhoto.trim() !== ""));
  const photoCount = $derived(folderItems.filter((i) => i.evidencePhoto && i.evidencePhoto.trim() !== "").length);

  // Filter pencarian (nama barang / short ID / lokasi) + sortir tanggal
  const visibleItems = $derived.by(() => {
    const q = searchQuery.trim().toLowerCase();
    let list = folderItems;

    if (q) {
      list = list.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          (i.shortCode || "").toLowerCase().includes(q) ||
          formatShortCode(i.shortCode, i.id).toLowerCase().includes(q) ||
          i.desc.toLowerCase().includes(q)
      );
    }

    const dated = [...list];
    dated.sort((a, b) => {
      const da = `${a.date} ${a.time}`;
      const db = `${b.date} ${b.time}`;
      return sortMode === "newest" ? db.localeCompare(da) : da.localeCompare(db);
    });
    return dated;
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
</script>

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
  <!-- Jendela Arsip 8-bit Nintendo: Kertas Krem + Border Tebal + Shadow Offset -->
  <div
    class="archive-window relative w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden select-none"
    transition:scale={{ start: 0.9, duration: 220 }}
  >
    <!-- Header NES Dialog Box: Coklat Tua + Judul Kuning -->
    <div class="archive-header flex items-center justify-between px-3 py-2.5 shrink-0">
      <div class="flex items-center gap-2.5 min-w-0">
        <!-- Folder pixel icon kecil -->
        <div class="mini-folder-icon shrink-0" aria-hidden="true">
          <div class="mini-folder-tab"></div>
          <div class="mini-folder-body"></div>
        </div>
        <div class="min-w-0">
          <h3 class="font-pixel text-[11px] md:text-[13px] text-yellow-300 font-bold tracking-wider truncate" style="text-shadow: 2px 2px 0 #140b05;">
            {folderTitle}
          </h3>
          <p class="font-pixel text-[8.5px] md:text-[9px] text-[#fde68a] font-bold tracking-wide">
            {folderItems.length} FILE ARSIP • {photoCount} FOTO BUKTI
          </p>
        </div>
      </div>

      <button
        type="button"
        onclick={onClose}
        class="header-close-btn font-pixel text-[10px] text-white px-2 py-1 cursor-pointer shrink-0 font-bold"
        aria-label="Tutup Folder Arsip"
      >
        ✕
      </button>
    </div>

    <!-- Toolbar Search & Sort -->
    <div class="archive-toolbar flex items-center gap-2 px-3 py-2 shrink-0 flex-wrap">
      <div class="relative flex-1 min-w-[160px]">
        <span class="absolute left-2 top-1/2 -translate-y-1/2 text-[11px] pointer-events-none">🔍</span>
        <input
          type="text"
          bind:value={searchQuery}
          placeholder="Cari nama / short ID / lokasi..."
          class="w-full bg-white border-2 border-[#1c120c] rounded py-1.5 pl-7 pr-2 font-sans text-xs md:text-sm font-bold text-[#1c120c] placeholder-stone-400 shadow-[inset_2px_2px_0_rgba(0,0,0,0.1)] outline-none focus:border-[#b45309] transition-colors"
        />
      </div>
      <button
        type="button"
        onclick={() => sortMode = sortMode === "newest" ? "oldest" : "newest"}
        class="sort-btn font-pixel text-[8.5px] md:text-[9px] py-1.5 px-2.5 cursor-pointer font-bold text-[#1c120c] shrink-0"
        title="Ubah urutan file"
      >
        {sortMode === "newest" ? "▼ TERBARU" : "▲ TERLAMA"}
      </button>
    </div>

    <!-- Body: List File Kiri + Preview Kanan -->
    <div class="flex-1 flex flex-col md:flex-row gap-3 p-3 min-h-0 overflow-hidden">

      <!-- Panel Kiri: List File Dokumen -->
      <div class="w-full md:w-[300px] shrink-0 flex flex-col min-h-[150px] md:min-h-0 overflow-hidden border-3 border-[#1c120c] rounded-lg bg-[#fefce8] shadow-[3px_3px_0px_#1c120c]">
        <div class="panel-header font-pixel text-[9px] text-white font-bold tracking-wider px-2.5 py-1.5 flex items-center justify-between shrink-0">
          <span>📁 DAFTAR FILE</span>
          <span class="font-mono text-[9px] opacity-90">{visibleItems.length}/{folderItems.length}</span>
        </div>

        <div class="flex-1 overflow-y-auto p-1.5 flex flex-col gap-1.5">
          {#each visibleItems as it (it.id)}
            {@const code = formatShortCode(it.shortCode, it.id)}
            <button
              type="button"
              onclick={() => selectItem(it.id)}
              class="file-row text-left cursor-pointer border-2 border-[#1c120c] rounded bg-white p-2 transition-all {selectedId === it.id
                ? 'file-row-active shadow-[2px_2px_0px_#1c120c] -translate-y-0.5'
                : 'shadow-[1px_1px_0px_#1c120c] hover:bg-[#fffbeb] hover:-translate-y-0.5'}"
            >
              <div class="flex items-start gap-2">
                <!-- Thumbnail foto bukti / ilustrasi tag -->
                <div class="w-11 h-11 shrink-0 bg-[#fef9c3] border-2 border-[#1c120c] rounded flex items-center justify-center overflow-hidden relative">
                  {#if it.evidencePhoto && it.evidencePhoto.trim() !== ""}
                    <img src={it.evidencePhoto} alt="Bukti {it.title}" class="w-full h-full object-cover" />
                    <span class="absolute bottom-0 right-0 bg-[#0d9488] text-white font-pixel text-[6.5px] px-0.5 font-bold">📷</span>
                  {:else}
                    <TagIcon tag={it.tag} fallback={it.icon} size={26} title={it.title} />
                  {/if}
                </div>

                <div class="flex-1 min-w-0">
                  <p class="font-sans text-xs md:text-[13px] font-bold text-[#1c120c] truncate leading-tight" title={it.title}>
                    {it.title}
                  </p>
                  <div class="flex items-center gap-1.5 mt-1 flex-wrap">
                    <span class="font-mono text-[10px] font-bold text-[#b45309] bg-[#fef3c7] border border-[#1c120c] rounded px-1 py-[1px]">
                      {code}
                    </span>
                    <span class="font-sans text-[10px] font-bold text-stone-500">
                      {it.date || "-"} • {it.time || "-"}
                    </span>
                  </div>
                </div>
              </div>

              <div class="flex items-center gap-1.5 mt-1.5">
                <span class="font-pixel text-[7.5px] px-1.5 py-0.5 rounded border border-[#1c120c] font-bold {it.type === 'found' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}">
                  {it.type === 'found' ? 'TEMUAN' : 'HILANG'}
                </span>
                <span class="font-pixel text-[7.5px] px-1.5 py-0.5 rounded border border-[#1c120c] font-bold {it.status === 'disputed' ? 'bg-orange-100 text-orange-700' : it.status === 'resolved' ? 'bg-slate-200 text-slate-700' : 'bg-blue-100 text-blue-800'}">
                  {it.status.toUpperCase()}
                </span>
                <span class="font-sans text-[10px] text-stone-500 font-medium truncate ml-auto">
                  👤 {it.reporterName || "Anonim"}
                </span>
              </div>
            </button>
          {:else}
            <div class="flex-1 flex flex-col items-center justify-center p-4 text-center gap-2">
              <span class="text-2xl">🗂️</span>
              <p class="font-pixel text-[9px] text-stone-500 font-bold">
                {searchQuery ? "FILE TIDAK DITEMUKAN" : "FOLDER KOSONG"}
              </p>
            </div>
          {/each}
        </div>
      </div>

      <!-- Panel Kanan: Preview Berkas Aktif -->
      <div class="flex-1 flex flex-col min-h-0 overflow-hidden border-3 border-[#1c120c] rounded-lg bg-[#fefce8] shadow-[3px_3px_0px_#1c120c]">
        <div class="panel-header panel-header-accent font-pixel text-[9px] text-white font-bold tracking-wider px-2.5 py-1.5 flex items-center justify-between gap-2 shrink-0">
          <span class="truncate">🔍 PREVIEW: {selected ? selected.title : "-"}</span>
          {#if selected}
            <button
              type="button"
              onclick={copyCode}
              class="font-mono text-[10px] font-bold bg-[#fef3c7] text-[#1c120c] border-2 border-[#1c120c] rounded px-1.5 py-0.5 cursor-pointer hover:bg-[#fde68a] active:translate-y-0.5 shrink-0"
              title="Klik untuk menyalin short code"
            >
              {displayCode} {copyFeedback ? "✓" : "📋"}
            </button>
          {/if}
        </div>

        {#if selected}
          <div class="flex-1 overflow-y-auto p-3 flex flex-col sm:flex-row gap-3 min-h-0">
            <!-- Kolom Foto Bukti Asli -->
            <div class="sm:w-[42%] shrink-0 flex flex-col items-center gap-2.5">
              <div class="evidence-frame w-full relative bg-white border-3 border-[#1c120c] rounded shadow-[4px_4px_0px_#1c120c] p-2 rotate-[-1deg]">
                <!-- Selotip pixel di atas frame -->
                <div class="evidence-tape" aria-hidden="true"></div>

                <div class="w-full aspect-square bg-[#1e293b] rounded border-2 border-[#1c120c] overflow-hidden flex items-center justify-center relative group">
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
                      <span class="font-pixel text-[8px] text-white font-bold">🔍 KLIK PERBESAR</span>
                    </div>
                  {:else}
                    <div class="flex flex-col items-center gap-2 p-4 text-center">
                      <TagIcon tag={selected.tag} fallback={selected.icon} size={64} title={selected.title} />
                      <span class="font-pixel text-[8.5px] text-slate-300 font-bold">TIDAK ADA FOTO BUKTI</span>
                    </div>
                  {/if}
                </div>

                <p class="font-pixel text-[8.5px] md:text-[9px] text-[#1c120c] font-bold text-center mt-2 tracking-wider">
                  BUKTI FISIK {hasPhoto ? "RESMI" : "—"}
                </p>
              </div>

              <!-- Stempel status -->
              <div class="status-stamp font-pixel text-[9px] md:text-[10px] font-bold {selected.status === 'resolved' ? 'stamp-resolved' : selected.status === 'disputed' ? 'stamp-disputed' : 'stamp-active'}">
                {selected.status === 'resolved' ? 'ARSIP SELESAI' : selected.status === 'disputed' ? 'SEDANG DISPUTE' : 'STATUS AKTIF'}
              </div>
            </div>

            <!-- Kolom Detail Berkas -->
            <div class="flex-1 min-w-0 flex flex-col gap-2">
              <!-- Grid data utama -->
              <div class="grid grid-cols-2 gap-2">
                <div class="detail-chip">
                  <span class="detail-chip-label">JENIS LAPORAN</span>
                  <span class="font-bold text-[11px] md:text-xs {selected.type === 'found' ? 'text-emerald-700' : 'text-rose-700'}">
                    BARANG {selected.type === 'found' ? 'TEMUAN' : 'HILANG'}
                  </span>
                </div>
                <div class="detail-chip">
                  <span class="detail-chip-label">WAKTU LAPOR</span>
                  <span class="font-sans font-bold text-[11px] md:text-xs text-[#1c120c]">
                    {selected.date || "-"} • {selected.time || "-"}
                  </span>
                </div>
                <div class="detail-chip">
                  <span class="detail-chip-label">KATEGORI & TAG</span>
                  <span class="font-sans font-bold text-[10px] md:text-[11px] text-[#1c120c] truncate block">
                    {selected.category || "Umum"} • {selected.tag || "Barang"}
                  </span>
                </div>
                <div class="detail-chip">
                  <span class="detail-chip-label">ZKP COMMITMENTS</span>
                  <span class="font-sans font-bold text-[10px] md:text-[11px] text-[#1c120c]">
                    {selected.commitments?.length ? `${selected.commitments.length} TERVERIFIKASI` : "TIDAK ADA"}
                  </span>
                </div>
              </div>

              <!-- Lokasi -->
              <div class="detail-chip">
                <span class="detail-chip-label">LOKASI HILANG / DITEMUKAN</span>
                <p class="font-sans font-bold text-xs md:text-[13px] text-[#1c120c] mt-0.5">
                  📍 {selected.desc || "Tidak disebutkan"}
                </p>
              </div>

              <!-- Identitas Pelapor -->
              <div class="reporter-box border-2 border-[#1c120c] rounded p-2 bg-[#f0f9ff] shadow-[2px_2px_0px_#1c120c]">
                <span class="font-pixel text-[8.5px] text-blue-900 font-bold block flex items-center gap-1">
                  <span>👤</span> IDENTITAS PELAPOR
                </span>
                <div class="mt-1 flex flex-col gap-0.5 font-sans">
                  <p class="font-bold text-xs md:text-sm text-[#1c120c]">{selected.reporterName || "Anonim"}</p>
                  <p class="text-[11px] text-stone-600 font-bold">
                    NPM: <span class="font-mono">{selected.reporterNpm || "-"}</span>
                  </p>
                  {#if selected.reporterContact}
                    <p class="text-[11px] text-stone-600 font-bold">
                      Kontak: <span class="font-mono text-blue-700">{selected.reporterContact}</span>
                    </p>
                  {/if}
                </div>
              </div>

              <!-- Riwayat klaim -->
              {#if selected.claims && selected.claims.length > 0}
                <div class="border-2 border-[#1c120c] rounded p-2 bg-[#fffbeb] shadow-[2px_2px_0px_#1c120c]">
                  <span class="font-pixel text-[8.5px] text-amber-900 font-bold block mb-1.5">
                    RIWAYAT PENGAJUAN KLAIM ({selected.claims.length})
                  </span>
                  <div class="max-h-[92px] overflow-y-auto flex flex-col gap-1.5 pr-0.5">
                    {#each selected.claims as claim}
                      <div class="bg-white border border-stone-300 rounded px-2 py-1.5 flex items-center justify-between gap-2">
                        <span class="font-sans text-[11px] text-[#1c120c] truncate min-w-0">
                          <strong>{claim.claimantName || "Anon"}</strong>
                          <span class="font-mono text-[10px] text-stone-500"> ({claim.claimantNpm})</span>
                        </span>
                        <span class="font-pixel text-[7.5px] px-1.5 py-0.5 rounded border border-[#1c120c] uppercase font-bold shrink-0 {claim.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : claim.status === 'rejected' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'}">
                          {claim.status}
                        </span>
                      </div>
                    {/each}
                  </div>
                </div>
              {/if}

              <!-- Tombol aksi -->
              <div class="mt-auto flex gap-2 pt-1.5">
                <button
                  type="button"
                  onclick={copyCode}
                  class="action-btn flex-1 font-pixel text-[9px] md:text-[10px] py-2.5 cursor-pointer font-bold tracking-wider text-[#1c120c]"
                >
                  📋 SALIN ID
                </button>
                <button
                  type="button"
                  onclick={onClose}
                  class="action-btn action-btn-primary flex-1 font-pixel text-[9px] md:text-[10px] py-2.5 cursor-pointer font-bold tracking-wider text-white"
                >
                  TUTUP BERKAS
                </button>
              </div>
            </div>
          </div>
        {:else}
          <div class="flex-1 flex flex-col items-center justify-center gap-2 p-6">
            <span class="text-3xl">📁</span>
            <p class="font-pixel text-[9.5px] text-stone-500 font-bold">PILIH FILE DI PANEL KIRI</p>
          </div>
        {/if}
      </div>
    </div>

    <!-- Status Bar Bawah -->
    <div class="archive-statusbar font-pixel text-[8.5px] md:text-[9px] text-[#fde68a] font-bold px-3 py-1.5 flex items-center justify-between shrink-0">
      <span>{folderItems.length} FILE • {photoCount} FOTO BUKTI</span>
      <span class="truncate ml-2">{selected ? `${displayCode} — ${selected.title}` : folderTitle.toUpperCase()}</span>
    </div>
  </div>
</div>

<!-- Modal Zoom Foto Bukti Asli -->
{#if isImageZoomed && selected && hasPhoto}
  <div
    class="fixed inset-0 z-60 bg-[#140b05]/90 flex items-center justify-center p-4 cursor-zoom-out"
    onclick={() => isImageZoomed = false}
    transition:fade={{ duration: 120 }}
    role="button"
    tabindex="-1"
    onkeydown={(e) => { if (e.key === "Escape") isImageZoomed = false; }}
  >
    <div class="relative max-w-2xl bg-[#fefce8] border-4 border-[#1c120c] rounded-lg shadow-[8px_8px_0px_#0a060f] p-3 flex flex-col items-center">
      <div class="w-full flex items-center justify-between mb-2">
        <span class="font-pixel text-[9px] text-[#1c120c] font-bold truncate">{displayCode}_BUKTI_FISIK</span>
        <span class="font-pixel text-[8px] text-stone-500 font-bold">{selected.date || "-"}</span>
      </div>
      <img
        src={selected.evidencePhoto}
        alt="Foto bukti fisik diperbesar"
        class="max-w-full max-h-[70vh] object-contain rounded border-2 border-[#1c120c]"
      />
      <div class="mt-2 font-pixel text-[8.5px] text-stone-600 font-bold">
        Klik di mana saja untuk menutup
      </div>
    </div>
  </div>
{/if}

<style>
  /* Jendela arsip utama: kertas krem game UI */
  .archive-window {
    background: #fefce8;
    border: 4px solid #1c120c;
    border-radius: 12px;
    box-shadow:
      inset 0 3px 0 rgba(255, 255, 255, 0.5),
      inset 0 -4px 0 rgba(0, 0, 0, 0.1),
      8px 8px 0px #0a060f;
  }

  /* Header ala NES dialog box */
  .archive-header {
    background: #b45309 linear-gradient(180deg, #d97706 0%, #b45309 100%);
    border-bottom: 3px solid #1c120c;
  }

  .header-close-btn {
    background: #dc2626;
    border: 3px solid #1c120c;
    border-radius: 6px;
    box-shadow: 2px 2px 0px #1c120c;
    transition: all 0.1s ease;
  }

  .header-close-btn:hover {
    background: #b91c1c;
  }

  .header-close-btn:active {
    transform: translate(1px, 1px);
    box-shadow: none;
  }

  /* Toolbar search: strip kertas kuning muda */
  .archive-toolbar {
    background: #fef9c3;
    border-bottom: 3px solid #1c120c;
  }

  .sort-btn {
    background: #ffd700;
    border: 2px solid #1c120c;
    border-radius: 6px;
    box-shadow: 2px 2px 0px #1c120c;
    transition: all 0.1s ease;
  }

  .sort-btn:active {
    transform: translate(1px, 1px);
    box-shadow: none;
  }

  /* Header panel list & preview */
  .panel-header {
    background: #0f766e linear-gradient(180deg, #14b8a6 0%, #0f766e 100%);
    border-bottom: 2px solid #1c120c;
  }

  .panel-header-accent {
    background: #b45309 linear-gradient(180deg, #d97706 0%, #b45309 100%);
  }

  /* Baris file aktif */
  .file-row-active {
    background: #fef3c7;
    border-color: #b45309;
  }

  /* Frame foto bukti dengan selotip */
  .evidence-tape {
    position: absolute;
    top: -9px;
    left: 50%;
    transform: translateX(-50%) rotate(-2deg);
    width: 72px;
    height: 16px;
    background: rgba(254, 240, 138, 0.9);
    border: 2px dashed rgba(180, 83, 9, 0.5);
    border-radius: 2px;
    z-index: 10;
  }

  /* Stempel status ala cap kantor */
  .status-stamp {
    padding: 3px 10px;
    border: 2px dashed;
    border-radius: 4px;
    transform: rotate(-2deg);
    letter-spacing: 1px;
  }

  .stamp-active {
    color: #b91c1c;
    border-color: #b91c1c;
    background: rgba(254, 226, 226, 0.85);
  }

  .stamp-resolved {
    color: #15803d;
    border-color: #15803d;
    background: rgba(220, 252, 231, 0.85);
  }

  .stamp-disputed {
    color: #c2410c;
    border-color: #c2410c;
    background: rgba(255, 237, 213, 0.85);
  }

  /* Chip detail ala kartu identity game */
  .detail-chip {
    background: #ffffff;
    border: 2px solid #1c120c;
    border-radius: 6px;
    padding: 6px 8px;
    box-shadow: 2px 2px 0px rgba(28, 18, 12, 0.75);
  }

  .detail-chip-label {
    display: block;
    font-family: inherit;
    font-weight: bold;
    font-size: 8.5px;
    color: #78716c;
    letter-spacing: 0.5px;
    margin-bottom: 2px;
  }

  /* Tombol aksi 8-bit */
  .action-btn {
    background: #fef3c7;
    border: 3px solid #1c120c;
    border-radius: 8px;
    box-shadow: 0 4px 0 #1c120c;
    transition: all 0.1s ease;
  }

  .action-btn:hover {
    background: #fde68a;
  }

  .action-btn:active {
    transform: translateY(3px);
    box-shadow: 0 1px 0 #1c120c;
  }

  .action-btn-primary {
    background: #b45309 linear-gradient(180deg, #d97706 0%, #b45309 100%);
  }

  .action-btn-primary:hover {
    background: #92400e;
  }

  /* Status bar bawah */
  .archive-statusbar {
    background: #1c120c;
    border-top: 3px solid #1c120c;
  }

  /* Mini folder icon di header */
  .mini-folder-icon {
    position: relative;
    width: 26px;
    height: 22px;
  }

  .mini-folder-tab {
    position: absolute;
    top: 0;
    left: 0;
    width: 14px;
    height: 7px;
    background: #fbbf24;
    border: 2px solid #140b05;
    border-bottom: none;
    border-radius: 3px 3px 0 0;
  }

  .mini-folder-body {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 16px;
    background: linear-gradient(180deg, #fbbf24 0%, #d97706 100%);
    border: 2px solid #140b05;
    border-radius: 2px 4px 4px 4px;
  }
</style>
