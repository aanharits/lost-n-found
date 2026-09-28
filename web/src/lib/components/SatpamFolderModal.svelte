<script lang="ts">
  import type { Item } from "$lib/stores/items.js";
  import TagIcon from "./TagIcon.svelte";
  import { formatShortCode } from "$lib/utils/shortCode.js";
  import { fade, fly, scale } from "svelte/transition";

  let {
    item,
    onClose,
  }: {
    item: Item | null;
    onClose: () => void;
  } = $props();

  let isImageZoomed = $state(false);
  let copyFeedback = $state(false);

  const displayCode = $derived(item ? formatShortCode(item.shortCode, item.id) : "#ITEM");
  const hasPhoto = $derived(Boolean(item?.evidencePhoto && item.evidencePhoto.trim() !== ""));

  function copyCode() {
    if (!item) return;
    navigator.clipboard?.writeText(displayCode);
    copyFeedback = true;
    setTimeout(() => {
      copyFeedback = false;
    }, 2000);
  }
</script>

{#if item}
  <div
    class="modal-overlay backdrop-blur-sm z-50 flex items-center justify-center p-3"
    transition:fade={{ duration: 180 }}
    onclick={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}
    role="dialog"
    tabindex="-1"
    onkeydown={(e) => {
      if (e.key === "Escape") onClose();
    }}
  >
    <!-- Map Berkas Terbuka: Vintage Detective / Police Manila Dossier Container -->
    <div
      class="manila-dossier-window relative w-full max-w-3xl max-h-[92vh] flex flex-col rounded-lg border-4 border-[#140b05] shadow-[10px_10px_0px_#0a060f] overflow-hidden select-none"
      transition:scale={{ start: 0.92, duration: 250 }}
    >
      <!-- Header Map Berkas: Manila Folder Top Tab Bar -->
      <div
        class="bg-[#b45309] text-white px-4 py-2.5 font-pixel text-[10px] md:text-[11px] flex justify-between items-center border-b-3 border-[#140b05]"
      >
        <div class="flex items-center gap-2">
          <span class="w-2.5 h-2.5 rounded-full bg-amber-300 border border-[#140b05] animate-pulse"></span>
          <span class="font-bold tracking-widest text-[#fef08a]">
            ARSIP BERKAS KEAMANAN KAMPUS
          </span>
          <span class="bg-[#140b05] text-amber-300 text-[8px] px-2 py-0.5 rounded font-mono font-bold border border-amber-300/30">
            DOKUMEN RAHASIA SATPAM
          </span>
        </div>

        <button
          onclick={onClose}
          class="text-white hover:text-red-200 font-pixel text-xs px-2 py-0.5 cursor-pointer leading-none"
          type="button"
          aria-label="Tutup Berkas"
        >
          ✕
        </button>
      </div>

      <!-- Dossier Body: 2 Kolom (Sisi Kiri: Bukti Foto Fisik & Sisi Kanan: Lembar Berkas Investigasi) -->
      <div
        class="p-4 md:p-6 bg-[#fef9c3] flex-1 overflow-y-auto flex flex-col md:flex-row gap-5 items-stretch"
        style="background: #fefce8 linear-gradient(180deg, #fef9c3 0%, #fef3c7 100%);"
      >
        <!-- Kolom Kiri: Foto Bukti Fisik Polaroid Retro -->
        <div class="w-full md:w-5/12 flex flex-col items-center">
          <div
            class="polaroid-frame relative bg-white p-3 pt-3.5 pb-5 rounded border-2 border-[#140b05] shadow-[4px_4px_0px_#140b05] w-full max-w-[280px] flex flex-col items-center rotate-[-1.5deg]"
          >
            <!-- Vintage Adhesive Tape / Solasi Perekat di Sudut Atas -->
            <div class="adhesive-tape-top pointer-events-none"></div>

            <!-- Foto Asli atau Fallback Ilustrasi -->
            <div
              class="w-full aspect-square bg-stone-900 rounded border border-[#140b05] overflow-hidden flex items-center justify-center relative group cursor-pointer"
              onclick={() => { if (hasPhoto) isImageZoomed = true; }}
              role="button"
              tabindex="0"
              onkeydown={(e) => { if (e.key === "Enter" && hasPhoto) isImageZoomed = true; }}
            >
              {#if hasPhoto}
                <img
                  src={item.evidencePhoto}
                  alt="Foto bukti fisik asli pelapor"
                  class="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                />
                <div
                  class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-pixel text-[8px] font-bold"
                >
                  🔍 KLIK PERBESAR
                </div>
              {:else}
                <div class="flex flex-col items-center justify-center p-3 text-center">
                  <TagIcon
                    tag={item.tag}
                    fallback={item.icon}
                    size={64}
                    title={item.title}
                  />
                  <span class="text-[7.5px] font-pixel text-stone-300 mt-2">
                    TIDAK ADA FOTO FISIK
                  </span>
                </div>
              {/if}
            </div>

            <!-- Keterangan Label Polaroid Bawah -->
            <div class="w-full mt-3 text-center">
              <span class="font-pixel text-[9px] text-[#140b05] font-bold tracking-wider block">
                BUKTI FISIK RESMI
              </span>
              <span class="font-mono text-[8px] text-stone-600 block mt-0.5">
                REG: {displayCode} &bull; {item.date || "NO-DATE"}
              </span>
            </div>
          </div>

          <!-- Cap Stempel Kredensial Satpam -->
          <div class="mt-4 flex flex-col items-center gap-1">
            <div class="stamp-verified font-pixel">
              TERVERIFIKASI PETUGAS
            </div>
            <p class="text-[8px] font-sans text-stone-600 text-center font-medium max-w-[240px]">
              Foto bukti fisik ini disimpan secara terenkripsi dan khusus diakses regu keamanan kampus.
            </p>
          </div>
        </div>

        <!-- Kolom Kanan: Lembaran Formulir Berkas Investigasi Satpam -->
        <div
          class="w-full md:w-7/12 bg-white rounded border-2 border-[#140b05] shadow-[3px_3px_0px_#140b05] p-4 flex flex-col justify-between"
        >
          <div class="flex flex-col gap-3">
            <!-- Header Lembar Berkas -->
            <div class="flex items-center justify-between border-b-2 border-[#140b05] pb-2">
              <div>
                <p class="font-pixel text-[7px] text-stone-500 uppercase tracking-widest">
                  FORMULIR LAPORAN KEAMANAN
                </p>
                <h3 class="font-pixel text-[13px] md:text-[14px] text-[#140b05] font-bold">
                  {item.title}
                </h3>
              </div>

              <!-- Short Code Badge Button -->
              <button
                type="button"
                onclick={copyCode}
                class="bg-amber-100 hover:bg-amber-200 active:translate-y-0.5 border-2 border-[#140b05] px-2 py-1 rounded shadow-[1px_1px_0_#140b05] font-mono font-bold text-xs text-[#140b05] flex items-center gap-1 cursor-pointer"
                title="Klik untuk menyalin short code"
              >
                <span>{displayCode}</span>
                <span class="text-[8px] text-stone-600">📋</span>
              </button>
            </div>

            {#if copyFeedback}
              <div
                class="bg-emerald-100 text-emerald-800 text-[8px] font-pixel py-1 px-2 rounded border border-emerald-300 text-center"
                transition:fade={{ duration: 100 }}
              >
                Kode #{displayCode} berhasil disalin ke clipboard!
              </div>
            {/if}

            <!-- Data Grid Spesifikasi Berkas -->
            <div class="grid grid-cols-2 gap-2.5 text-xs font-sans">
              <div class="bg-stone-50 p-2 rounded border border-stone-200">
                <span class="text-[9px] font-pixel text-stone-500 block">JENIS LAPORAN</span>
                <span class="font-bold text-[11px] {item.type === 'found' ? 'text-emerald-700' : 'text-rose-700'}">
                  {item.type === 'found' ? 'BARANG TEMUAN' : 'BARANG HILANG'}
                </span>
              </div>

              <div class="bg-stone-50 p-2 rounded border border-stone-200">
                <span class="text-[9px] font-pixel text-stone-500 block">STATUS BERKAS</span>
                <span class="font-bold text-[11px] capitalize {item.status === 'resolved' ? 'text-emerald-700' : item.status === 'disputed' ? 'text-orange-700' : 'text-blue-700'}">
                  {item.status}
                </span>
              </div>

              <div class="bg-stone-50 p-2 rounded border border-stone-200">
                <span class="text-[9px] font-pixel text-stone-500 block">WAKTU LAPORAN</span>
                <span class="font-bold text-[11px] text-[#140b05]">
                  {item.date || "-"} &bull; {item.time || "-"}
                </span>
              </div>

              <div class="bg-stone-50 p-2 rounded border border-stone-200">
                <span class="text-[9px] font-pixel text-stone-500 block">KATEGORI &amp; TAG</span>
                <span class="font-bold text-[10px] text-[#140b05] truncate block">
                  {item.category || "Umum"} &bull; {item.tag || "Barang"}
                </span>
              </div>
            </div>

            <!-- Detail Lokasi -->
            <div class="bg-stone-50 p-2 rounded border border-stone-200">
              <span class="text-[9px] font-pixel text-stone-500 block">LOKASI HILANG / DITEMUKAN</span>
              <p class="font-sans font-bold text-xs text-[#140b05] mt-0.5">
                📍 {item.desc || "Tidak disebutkan"}
              </p>
            </div>

            <!-- Ciri Khas Rahasia / ZKP Status -->
            <div class="bg-amber-50/70 p-2 rounded border border-amber-200">
              <span class="text-[9px] font-pixel text-amber-900 block flex items-center gap-1">
                <span>🔐</span> VERIFIKASI CIRI KHAS (ZKP COMMITMENTS)
              </span>
              <p class="font-sans text-[11px] text-amber-950 font-medium mt-0.5">
                {item.commitments?.length
                  ? `Tersedia ${item.commitments.length} Zero-Knowledge Commitments terverifikasi di blockchain/poseidon.`
                  : "Tidak ada verifikasi rahasia ZKP."}
              </p>
            </div>

            <!-- Identitas Pelapor -->
            <div class="bg-blue-50/60 p-2.5 rounded border border-blue-200">
              <span class="text-[9px] font-pixel text-blue-900 block flex items-center gap-1">
                <span>👤</span> IDENTITAS PELAPOR
              </span>
              <div class="mt-1 flex flex-col gap-0.5 text-xs font-sans">
                <p class="font-bold text-[#140b05]">
                  {item.reporterName || "Anonim"}
                </p>
                <p class="text-stone-600 text-[11px]">
                  NPM: <span class="font-mono font-bold">{item.reporterNpm || "-"}</span>
                </p>
                {#if item.reporterContact}
                  <p class="text-stone-600 text-[11px]">
                    Kontak WA: <span class="font-mono font-bold text-blue-800">{item.reporterContact}</span>
                  </p>
                {/if}
              </div>
            </div>

            <!-- Riwayat Klaim Jika Ada -->
            {#if item.claims && item.claims.length > 0}
              <div class="bg-stone-50 p-2.5 rounded border border-stone-200">
                <span class="text-[9px] font-pixel text-stone-700 block mb-1">
                  RIWAYAT PENGAJUAN KLAIM ({item.claims.length})
                </span>
                <div class="max-h-24 overflow-y-auto flex flex-col gap-1.5">
                  {#each item.claims as claim}
                    <div class="bg-white p-1.5 rounded border border-stone-200 text-[10px] flex items-center justify-between">
                      <div class="min-w-0">
                        <span class="font-bold truncate">{claim.claimantName}</span>
                        <span class="text-stone-500 font-mono">({claim.claimantNpm})</span>
                      </div>
                      <span class="font-pixel text-[7.5px] px-1.5 py-0.5 rounded uppercase font-bold {claim.status === 'approved' ? 'bg-green-100 text-green-800' : claim.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}">
                        {claim.status}
                      </span>
                    </div>
                  {/each}
                </div>
              </div>
            {/if}
          </div>

          <!-- Tombol Aksi Bawah -->
          <div class="pt-3 border-t-2 border-[#140b05] flex gap-2 mt-3">
            <button
              type="button"
              onclick={copyCode}
              class="bg-white hover:bg-stone-100 text-[#140b05] font-pixel text-[8.5px] py-2 px-3 rounded border-2 border-[#140b05] shadow-[2px_2px_0_#140b05] active:shadow-none transition-all cursor-pointer flex-1 font-bold"
            >
              SALIN ID BERKAS
            </button>
            <button
              type="button"
              onclick={onClose}
              class="bg-[#b45309] hover:bg-[#92400e] text-white font-pixel text-[8.5px] py-2 px-4 rounded border-2 border-[#140b05] shadow-[2px_2px_0_#140b05] active:shadow-none transition-all cursor-pointer flex-1 font-bold tracking-wider"
            >
              TUTUP MAP BERKAS
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Modal Zoom Foto Bukti Asli -->
  {#if isImageZoomed && hasPhoto}
    <div
      class="fixed inset-0 z-60 bg-black/85 flex items-center justify-center p-4 cursor-pointer"
      onclick={() => isImageZoomed = false}
      transition:fade={{ duration: 150 }}
      role="button"
      tabindex="-1"
      onkeydown={(e) => { if (e.key === "Escape") isImageZoomed = false; }}
    >
      <div class="relative max-w-2xl max-h-[85vh] bg-white p-3 rounded-lg border-4 border-[#140b05] shadow-2xl flex flex-col items-center">
        <img
          src={item.evidencePhoto}
          alt="Foto bukti fisik diperbesar"
          class="max-w-full max-h-[75vh] object-contain rounded"
        />
        <div class="mt-2 text-center font-pixel text-[9px] text-[#140b05] font-bold">
          Foto Bukti Asli #{displayCode} &bull; Klik di mana saja untuk menutup
        </div>
      </div>
    </div>
  {/if}
{/if}

<style>
  .polaroid-frame {
    box-shadow: 4px 4px 0px #140b05;
  }

  .adhesive-tape-top {
    position: absolute;
    top: -8px;
    left: 50%;
    transform: translateX(-50%);
    width: 60px;
    height: 18px;
    background: rgba(254, 240, 138, 0.7);
    border: 1px dashed rgba(180, 83, 9, 0.4);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
  }

  .stamp-verified {
    font-size: 8.5px;
    padding: 3px 8px;
    border-radius: 3px;
    border: 2px dashed #047857;
    color: #047857;
    background-color: rgba(209, 250, 229, 0.85);
    letter-spacing: 1px;
    transform: rotate(2deg);
    font-weight: bold;
    box-shadow: 1px 1px 0 rgba(0, 0, 0, 0.1);
  }
</style>
