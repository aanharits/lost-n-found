<script lang="ts">
  import { fade, fly } from "svelte/transition";
  import { items, type Item } from "$lib/stores/items.js";
  import { formatShortCode } from "$lib/utils/shortCode.js";

  let {
    onClose,
    onSelectItem,
  }: {
    onClose: () => void;
    onSelectItem: (item: Item) => void;
  } = $props();

  type LogFilter = "all" | "report" | "claim" | "resolved";
  let filter = $state<LogFilter>("all");
  let copyFeedback = $state(false);

  interface MutasiEntry {
    id: string;
    dateStr: string;
    timeStr: string;
    sortKey: string;
    type: "report" | "claim" | "resolved";
    tag: string;
    tagClass: string;
    title: string;
    actor: string;
    location: string;
    detail: string;
    shortCode: string;
    rawItem: Item;
  }

  // Helper parsing tanggal & waktu agar format ISO dari backend terkonversi rapi ke format lokal
  function parseTimestamp(
    raw?: string,
    fallbackDate: string = "2026-09-29",
    fallbackTime: string = "00:00",
  ) {
    if (!raw) {
      return {
        dateStr: fallbackDate,
        timeStr: fallbackTime,
        sortKey: `${fallbackDate} ${fallbackTime}`,
      };
    }

    // Jika format ISO (misal: "2026-09-29T09:21:03.521Z")
    if (raw.includes("T")) {
      try {
        const d = new Date(raw);
        if (!isNaN(d.getTime())) {
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, "0");
          const day = String(d.getDate()).padStart(2, "0");
          const hours = String(d.getHours()).padStart(2, "0");
          const mins = String(d.getMinutes()).padStart(2, "0");
          const dateStr = `${year}-${month}-${day}`;
          const timeStr = `${hours}:${mins}`;
          return { dateStr, timeStr, sortKey: `${dateStr} ${timeStr}` };
        }
      } catch {
        // fallback
      }
    }

    // Jika format standar "YYYY-MM-DD HH:mm"
    if (raw.includes(" ")) {
      const parts = raw.split(" ");
      const dateStr = parts[0] || fallbackDate;
      const timeStr = (parts[1] || fallbackTime).slice(0, 5);
      return { dateStr, timeStr, sortKey: `${dateStr} ${timeStr}` };
    }

    return {
      dateStr: raw,
      timeStr: fallbackTime,
      sortKey: `${raw} ${fallbackTime}`,
    };
  }

  // Rekonstruksi mutasi/log kronologis dari data laporan barang & klaim
  const logs = $derived.by(() => {
    const list: MutasiEntry[] = [];

    for (const item of $items) {
      const reportTime = parseTimestamp(
        `${item.date || "2026-09-29"} ${item.time || "00:00"}`,
      );

      // 1. Log Registrasi Laporan
      list.push({
        id: `reg_${item.id}`,
        dateStr: reportTime.dateStr,
        timeStr: reportTime.timeStr,
        sortKey: reportTime.sortKey,
        type: "report",
        tag: item.type === "found" ? "KETEMU" : "HILANG",
        tagClass:
          item.type === "found"
            ? "bg-[#16a34a] text-white"
            : "bg-[#dc2626] text-white",
        title: item.title,
        actor: item.reporterName
          ? `${item.reporterName} (${item.reporterNpm || "-"})`
          : "Anonim",
        location: item.desc || "Area Kampus",
        detail: `Registrasi laporan barang (${item.category || "Umum"})`,
        shortCode: formatShortCode(item.shortCode, item.id),
        rawItem: item,
      });

      // 2. Log Pengajuan & Update Klaim
      if (item.claims && item.claims.length > 0) {
        for (const [idx, claim] of item.claims.entries()) {
          const isApproved = claim.status === "approved";
          const isRejected = claim.status === "rejected";
          const claimTime = parseTimestamp(
            claim.createdAt || item.date,
            item.date || "2026-09-29",
            item.time || "00:00",
          );

          list.push({
            id: `claim_${item.id}_${idx}`,
            dateStr: claimTime.dateStr,
            timeStr: claimTime.timeStr,
            sortKey: claimTime.sortKey,
            type: "claim",
            tag: isApproved ? "DISETUJUI" : isRejected ? "DITOLAK" : "KLAIM",
            tagClass: isApproved
              ? "bg-[#16a34a] text-white"
              : isRejected
                ? "bg-[#dc2626] text-white"
                : "bg-[#ea580c] text-white",
            title: `Klaim: ${item.title}`,
            actor: claim.claimantName
              ? `${claim.claimantName} (${claim.claimantNpm || "-"})`
              : "Pemohon Klaim",
            location: item.desc || "-",
            detail: claim.text
              ? `"${claim.text}"`
              : claim.reasoning || "Bukti kepemilikan",
            shortCode: formatShortCode(item.shortCode, item.id),
            rawItem: item,
          });
        }
      }

      // 3. Log Kasus Selesai
      if (item.status === "resolved") {
        list.push({
          id: `res_${item.id}`,
          dateStr: reportTime.dateStr,
          timeStr: reportTime.timeStr,
          sortKey: reportTime.sortKey,
          type: "resolved",
          tag: "SELESAI",
          tagClass: "bg-[#9333ea] text-white",
          title: `Pengembalian: ${item.title}`,
          actor: "Pos Jaga Satpam",
          location: item.desc || "-",
          detail: "Status barang selesai dan telah diambil pemilik sah.",
          shortCode: formatShortCode(item.shortCode, item.id),
          rawItem: item,
        });
      }
    }

    // Urutkan mutasi terbaru di atas
    list.sort((a, b) => b.sortKey.localeCompare(a.sortKey));
    return list;
  });

  const filteredLogs = $derived.by(() => {
    if (filter === "all") return logs;
    return logs.filter((l) => l.type === filter);
  });

  function handleSalinLaporan() {
    const textData = logs
      .map(
        (l, i) =>
          `[${i + 1}] ${l.dateStr} ${l.timeStr} WIB | [${l.tag}] | ${l.title} | ${l.actor} | ID: ${l.shortCode}`,
      )
      .join("\n");

    navigator.clipboard.writeText(
      `=== BUKU MUTASI POSKO SATPAM KAMPUS ===\nTanggal Cetak: ${new Date().toLocaleString("id-ID")}\nTotal Entri: ${logs.length}\n\n${textData}`,
    );
    copyFeedback = true;
    setTimeout(() => {
      copyFeedback = false;
    }, 2000);
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape") onClose();
  }
</script>

<svelte:window onkeydown={onKeyDown} />

<!-- Modal Overlay -->
<div
  class="modal-overlay flex items-center justify-center p-3"
  style="z-index: 1100;"
  transition:fade={{ duration: 150 }}
  onclick={(e) => {
    if (e.target === e.currentTarget) onClose();
  }}
  role="presentation"
>
  <!-- Modal Window dengan ukuran konsisten dan fixed (tidak berubah-ubah) -->
  <div
    class="relative w-full max-w-3xl h-[560px] max-h-[90vh] bg-white border-4 border-[#1c120c] shadow-[6px_6px_0px_#0a060f] rounded-none flex flex-col overflow-hidden select-none"
    transition:fly={{ y: 20, duration: 200 }}
  >
    <!-- NES Title Bar -->
    <div
      class="bg-[#2563eb] text-white px-3.5 py-2.5 font-pixel text-[9px] md:text-[10px] flex justify-between items-center border-b-2 border-[#1c120c] select-none shrink-0"
    >
      <div class="flex items-center gap-2">
        <span class="w-2.5 h-2.5 bg-[#ffd700] border border-[#1c120c]"></span>
        <span class="font-bold tracking-wider">BUKU MUTASI</span>
      </div>
      <button
        type="button"
        onclick={onClose}
        class="bg-[#dc2626] hover:bg-[#b91c1c] active:translate-y-0.5 text-white font-pixel text-[9px] px-2 py-0.5 border border-[#1c120c] cursor-pointer shadow-[1px_1px_0_#1c120c] leading-none"
        aria-label="Tutup"
      >
        X
      </button>
    </div>

    <!-- Segmented Filter Tab NES Minimalist -->
    <div
      class="bg-[#f8fafc] px-3.5 py-2 border-b-2 border-[#1c120c] flex items-center justify-between gap-2 select-none shrink-0"
    >
      <div class="flex items-center gap-1.5 overflow-x-auto">
        <button
          type="button"
          onclick={() => (filter = "all")}
          class="px-2.5 py-1 text-[7.5px] md:text-[8px] font-pixel font-bold border border-[#1c120c] cursor-pointer transition-all {filter ===
          'all'
            ? 'bg-[#1c120c] text-white shadow-[1px_1px_0_#1c120c]'
            : 'bg-white text-[#1c120c] hover:bg-stone-200'}"
        >
          SEMUA ({logs.length})
        </button>
        <button
          type="button"
          onclick={() => (filter = "report")}
          class="px-2.5 py-1 text-[7.5px] md:text-[8px] font-pixel font-bold border border-[#1c120c] cursor-pointer transition-all {filter ===
          'report'
            ? 'bg-[#2563eb] text-white shadow-[1px_1px_0_#1c120c]'
            : 'bg-white text-[#1c120c] hover:bg-stone-200'}"
        >
          LAPORAN ({logs.filter((l) => l.type === "report").length})
        </button>
        <button
          type="button"
          onclick={() => (filter = "claim")}
          class="px-2.5 py-1 text-[7.5px] md:text-[8px] font-pixel font-bold border border-[#1c120c] cursor-pointer transition-all {filter ===
          'claim'
            ? 'bg-[#ea580c] text-white shadow-[1px_1px_0_#1c120c]'
            : 'bg-white text-[#1c120c] hover:bg-stone-200'}"
        >
          KLAIM ({logs.filter((l) => l.type === "claim").length})
        </button>
        <button
          type="button"
          onclick={() => (filter = "resolved")}
          class="px-2.5 py-1 text-[7.5px] md:text-[8px] font-pixel font-bold border border-[#1c120c] cursor-pointer transition-all {filter ===
          'resolved'
            ? 'bg-[#9333ea] text-white shadow-[1px_1px_0_#1c120c]'
            : 'bg-white text-[#1c120c] hover:bg-stone-200'}"
        >
          SELESAI ({logs.filter((l) => l.type === "resolved").length})
        </button>
      </div>

      <span class="font-pixel text-[7px] text-stone-500 hidden sm:inline">
        {filteredLogs.length} ENTRI
      </span>
    </div>

    <!-- Table Header Kolom Audit (Sleek Minimalist Ledger) -->
    <div
      class="bg-[#e2e8f0] px-3.5 py-1.5 border-b border-[#1c120c] flex items-center gap-3 font-pixel text-[7.5px] font-bold text-stone-700 select-none shrink-0"
    >
      <span class="w-28 shrink-0">WAKTU</span>
      <span class="w-20 shrink-0">TIPE</span>
      <span class="flex-1 min-w-0">KETERANGAN AKTIVITAS</span>
      <span class="w-16 shrink-0 text-right">KODE</span>
      <span class="w-12 shrink-0 text-center">AKSI</span>
    </div>

    <!-- Log Entries List Container (Minimalist Ledger Rows) -->
    <div
      class="flex-1 min-h-0 overflow-y-auto bg-white divide-y divide-stone-200"
    >
      {#if filteredLogs.length === 0}
        <div class="h-full flex items-center justify-center p-8">
          <div
            class="bg-stone-50 border-2 border-dashed border-[#1c120c] p-6 text-center text-[#1c120c] font-pixel text-[8.5px]"
          >
            [TIDAK ADA AKTIVITAS TERCATAT PADA FILTER INI]
          </div>
        </div>
      {:else}
        {#each filteredLogs as entry (entry.id)}
          <div
            class="px-3.5 py-2.5 flex items-center gap-3 transition-colors hover:bg-[#fefce8]"
          >
            <!-- Kolom 1: Timestamp Monospace -->
            <div class="w-28 shrink-0">
              <p
                class="font-mono text-[10px] font-bold text-stone-700 leading-none"
              >
                {entry.dateStr}
              </p>
              <p
                class="font-mono text-[9px] text-stone-500 mt-1 leading-none"
              >
                {entry.timeStr} WIB
              </p>
            </div>

            <!-- Kolom 2: Badge Tipe Minimalis -->
            <div class="w-20 shrink-0">
              <span
                class="font-pixel text-[6.5px] px-1.5 py-0.5 rounded-none font-bold inline-block {entry.tagClass}"
              >
                [{entry.tag}]
              </span>
            </div>

            <!-- Kolom 3: Keterangan Utama & Detail (Audit Friendly) -->
            <div class="flex-1 min-w-0">
              <p
                class="font-sans font-bold text-xs text-[#1c120c] truncate leading-tight"
              >
                {entry.title}
                <span class="font-normal text-stone-500 text-[11px]">
                  &bull; {entry.actor}</span
                >
              </p>
              <p class="font-sans text-[10.5px] text-stone-600 truncate mt-0.5">
                <span class="font-semibold text-stone-700">Lokasi:</span>
                {entry.location} &bull; {entry.detail}
              </p>
            </div>

            <!-- Kolom 4: Kode Berkas -->
            <div class="w-16 shrink-0 text-right">
              <span
                class="font-mono text-[9.5px] font-bold text-[#1c120c] bg-stone-100 px-1 py-0.5 border border-stone-300"
              >
                {entry.shortCode}
              </span>
            </div>

            <!-- Kolom 5: Tombol Aksi -->
            <div class="w-12 shrink-0 flex justify-center">
              <button
                type="button"
                onclick={() => onSelectItem(entry.rawItem)}
                class="bg-[#facc15] hover:bg-[#eab308] active:translate-y-0.5 text-[#1c120c] font-pixel text-[7.5px] font-bold px-2 py-1 border border-[#1c120c] shadow-[1px_1px_0_#1c120c] cursor-pointer"
                title="Buka berkas di explorer"
              >
                BUKA
              </button>
            </div>
          </div>
        {/each}
      {/if}
    </div>

    <!-- NES Footer Minimalist -->
    <div
      class="bg-white border-t-2 border-[#1c120c] px-3.5 py-2.5 flex items-center justify-between select-none shrink-0"
    >
      <button
        type="button"
        onclick={handleSalinLaporan}
        class="bg-stone-100 hover:bg-stone-200 active:translate-y-0.5 text-[#1c120c] font-pixel text-[8px] py-1.5 px-3 border border-[#1c120c] shadow-[1px_1px_0_#1c120c] cursor-pointer font-bold"
      >
        {copyFeedback ? "[TERSALIN!]" : "[SALIN REKAP LOG]"}
      </button>

      <button
        type="button"
        onclick={onClose}
        class="bg-[#1c120c] hover:bg-stone-800 text-white font-pixel text-[8.5px] py-1.5 px-4 border-2 border-[#1c120c] shadow-[2px_2px_0_#1c120c] active:translate-y-0.5 cursor-pointer font-bold"
      >
        TUTUP
      </button>
    </div>
  </div>
</div>
