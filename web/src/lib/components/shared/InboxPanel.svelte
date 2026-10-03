<script lang="ts">
  import { fly, fade } from "svelte/transition";
  import { items, type Item, type Claim } from "$lib/stores/items.js";
  import { currentPlayer } from "$lib/stores/player.js";
  import { inboxOpen, inboxTab, type InboxTab } from "$lib/stores/ui.js";

  interface ClaimEntry {
    item: Item;
    claim: Claim;
  }

  type StatusFilter = "all" | "pending" | "approved" | "rejected";

  let expandedClaimId = $state<string | null>(null);
  let statusFilter = $state<StatusFilter>("all");

  // 1. Klaim Masuk (klaim yang diajukan orang lain atas barang yang dilaporkan user ini)
  const incomingClaims = $derived.by<ClaimEntry[]>(() => {
    const npm = $currentPlayer?.npm || "";
    if (!npm) return [];
    const entries: ClaimEntry[] = [];
    for (const it of $items) {
      if (it.reporterNpm === npm && it.claims && it.claims.length > 0) {
        for (const c of it.claims) {
          entries.push({ item: it, claim: c });
        }
      }
    }
    // Urutkan terbaru di atas
    entries.sort((a, b) => (b.claim.createdAt || "").localeCompare(a.claim.createdAt || ""));
    return entries;
  });

  // 2. Klaim Saya (klaim yang pernah diajukan oleh user ini ke barang lain)
  const myClaims = $derived.by<ClaimEntry[]>(() => {
    const npm = $currentPlayer?.npm || "";
    if (!npm) return [];
    const entries: ClaimEntry[] = [];
    for (const it of $items) {
      if (it.claims && it.claims.length > 0) {
        for (const c of it.claims) {
          if (c.claimantNpm === npm) {
            entries.push({ item: it, claim: c });
          }
        }
      }
    }
    entries.sort((a, b) => (b.claim.createdAt || "").localeCompare(a.claim.createdAt || ""));
    return entries;
  });

  const incomingPendingCount = $derived(
    incomingClaims.filter((e) => e.claim.status === "pending").length,
  );

  const myPendingCount = $derived(
    myClaims.filter((e) => e.claim.status === "pending").length,
  );

  const overallPendingCount = $derived(
    incomingPendingCount + myPendingCount,
  );

  // Jika klaim masuk baru tiba saat panel sedang terbuka, otomatis arahkan ke
  // tab "KLAIM MASUK". Tanpa ini, klaim baru bisa "tidak terlihat" hanya karena
  // tab yang sedang aktif adalah "KLAIM SAYA".
  let lastIncomingPendingCount = 0;
  $effect(() => {
    const count = incomingPendingCount;
    const isOpen = $inboxOpen;
    if (isOpen && count > lastIncomingPendingCount) {
      inboxTab.set("incoming");
    }
    lastIncomingPendingCount = count;
  });

  const currentCategoryList = $derived(
    $inboxTab === "incoming" ? incomingClaims : myClaims,
  );

  const filteredClaims = $derived.by(() => {
    if (statusFilter === "all") return currentCategoryList;
    return currentCategoryList.filter((e) => e.claim.status === statusFilter);
  });

  function switchTab(tab: InboxTab) {
    inboxTab.set(tab);
    expandedClaimId = null;
    statusFilter = "all";
  }

  function toggleExpand(id: string) {
    expandedClaimId = expandedClaimId === id ? null : id;
  }

  function close() {
    inboxOpen.set(false);
  }

  function formatDate(iso: string): string {
    if (!iso) return "-";
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return iso;
      const year = d.getFullYear();
      const month = d.toLocaleString("id-ID", { month: "short" });
      const day = String(d.getDate()).padStart(2, "0");
      const hours = String(d.getHours()).padStart(2, "0");
      const mins = String(d.getMinutes()).padStart(2, "0");
      return `${day} ${month} ${year}, ${hours}.${mins}`;
    } catch {
      return iso;
    }
  }

  const statusLabel: Record<string, string> = {
    pending: "MENUNGGU",
    approved: "DISETUJUI",
    rejected: "DITOLAK",
    superseded: "DIGANTI REVISI",
  };

  const statusColor: Record<string, string> = {
    pending: "bg-[#ea580c] text-white",
    approved: "bg-[#16a34a] text-white",
    rejected: "bg-[#dc2626] text-white",
    superseded: "bg-stone-400 text-white",
  };
</script>

<svelte:window onkeydown={(e) => e.key === "Escape" && close()} />

{#if $inboxOpen}
  <!-- Backdrop -->
  <button
    type="button"
    class="fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px] pointer-events-auto border-0 cursor-default"
    onclick={close}
    aria-label="Tutup inbox"
    transition:fade={{ duration: 150 }}
  ></button>

  <!-- Slide-in Drawer from Right (Konsisten seperti Inbox Satpam) -->
  <div
    class="fixed inset-y-0 right-0 w-[380px] max-w-[90vw] z-50 flex flex-col overflow-hidden shadow-[-4px_0_16px_rgba(0,0,0,0.4)] border-l-4 border-[#1c120c] bg-[#f8fafc] select-none pointer-events-auto"
    transition:fly={{ x: 380, duration: 250 }}
    role="dialog"
    aria-label="Inbox Klaim"
  >
    <!-- NES Title Bar (Matching SatpamArchiveInbox) -->
    <div
      class="bg-[#2563eb] text-white px-3.5 py-2.5 font-pixel text-[9px] md:text-[10px] flex justify-between items-center border-b-2 border-[#1c120c] select-none shrink-0"
    >
      <div class="flex items-center gap-2">
        <span class="w-2.5 h-2.5 bg-[#ffd700] border border-[#1c120c]"></span>
        <span class="font-bold tracking-wider">INBOX KLAIM</span>
        {#if overallPendingCount > 0}
          <span
            class="bg-[#dc2626] text-white font-pixel text-[7.5px] px-1.5 py-0.5 border border-[#1c120c] font-bold shadow-[1px_1px_0_#1c120c]"
          >
            {overallPendingCount}
          </span>
        {/if}
      </div>
      <button
        type="button"
        onclick={close}
        class="bg-[#dc2626] hover:bg-[#b91c1c] active:translate-y-0.5 text-white font-pixel text-[9px] px-2 py-0.5 border border-[#1c120c] cursor-pointer shadow-[1px_1px_0_#1c120c] leading-none"
        aria-label="Tutup"
      >
        X
      </button>
    </div>

    <!-- Segmented Tab Bar Kategori: KLAIM MASUK vs KLAIM SAYA -->
    <div
      class="bg-[#f1f5f9] px-3.5 py-2 border-b border-[#1c120c] flex items-center gap-2 select-none shrink-0"
    >
      <button
        type="button"
        onclick={() => switchTab("incoming")}
        class="flex-1 py-1.5 px-2 font-pixel text-[7.5px] md:text-[8px] font-bold border border-[#1c120c] cursor-pointer transition-all flex items-center justify-center gap-1.5 {$inboxTab ===
        'incoming'
          ? 'bg-[#2563eb] text-white shadow-[1px_1px_0_#1c120c]'
          : 'bg-white text-[#1c120c] hover:bg-stone-200'}"
      >
        <span>KLAIM MASUK</span>
        <span class="font-mono text-[9px]">({incomingClaims.length})</span>
        {#if incomingPendingCount > 0}
          <span
            class="bg-[#dc2626] text-white font-pixel text-[6.5px] px-1 py-0.2 rounded-none border border-white/60"
          >
            {incomingPendingCount}
          </span>
        {/if}
      </button>
      <button
        type="button"
        onclick={() => switchTab("mine")}
        class="flex-1 py-1.5 px-2 font-pixel text-[7.5px] md:text-[8px] font-bold border border-[#1c120c] cursor-pointer transition-all flex items-center justify-center gap-1.5 {$inboxTab ===
        'mine'
          ? 'bg-[#2563eb] text-white shadow-[1px_1px_0_#1c120c]'
          : 'bg-white text-[#1c120c] hover:bg-stone-200'}"
      >
        <span>KLAIM SAYA</span>
        <span class="font-mono text-[9px]">({myClaims.length})</span>
        {#if myPendingCount > 0}
          <span
            class="bg-[#ea580c] text-white font-pixel text-[6.5px] px-1 py-0.2 rounded-none border border-white/60"
          >
            {myPendingCount}
          </span>
        {/if}
      </button>
    </div>

    <!-- Segmented Status Filter (Matching SatpamArchiveInbox: SEMUA, MENUNGGU, DISETUJUI, DITOLAK) -->
    <div
      class="bg-[#f8fafc] px-3.5 py-2 border-b-2 border-[#1c120c] flex items-center justify-between gap-1 select-none shrink-0"
    >
      <div class="flex items-center gap-1 overflow-x-auto">
        <button
          type="button"
          onclick={() => (statusFilter = "all")}
          class="px-2 py-1 text-[7px] font-pixel font-bold border border-[#1c120c] cursor-pointer transition-all {statusFilter ===
          'all'
            ? 'bg-[#1c120c] text-white shadow-[1px_1px_0_#1c120c]'
            : 'bg-white text-[#1c120c] hover:bg-stone-200'}"
        >
          SEMUA ({currentCategoryList.length})
        </button>
        <button
          type="button"
          onclick={() => (statusFilter = "pending")}
          class="px-2 py-1 text-[7px] font-pixel font-bold border border-[#1c120c] cursor-pointer transition-all {statusFilter ===
          'pending'
            ? 'bg-[#ea580c] text-white shadow-[1px_1px_0_#1c120c]'
            : 'bg-white text-[#1c120c] hover:bg-stone-200'}"
        >
          MENUNGGU ({currentCategoryList.filter(
            (e) => e.claim.status === "pending",
          ).length})
        </button>
        <button
          type="button"
          onclick={() => (statusFilter = "approved")}
          class="px-2 py-1 text-[7px] font-pixel font-bold border border-[#1c120c] cursor-pointer transition-all {statusFilter ===
          'approved'
            ? 'bg-[#16a34a] text-white shadow-[1px_1px_0_#1c120c]'
            : 'bg-white text-[#1c120c] hover:bg-stone-200'}"
        >
          DISETUJUI ({currentCategoryList.filter(
            (e) => e.claim.status === "approved",
          ).length})
        </button>
        <button
          type="button"
          onclick={() => (statusFilter = "rejected")}
          class="px-2 py-1 text-[7px] font-pixel font-bold border border-[#1c120c] cursor-pointer transition-all {statusFilter ===
          'rejected'
            ? 'bg-[#dc2626] text-white shadow-[1px_1px_0_#1c120c]'
            : 'bg-white text-[#1c120c] hover:bg-stone-200'}"
        >
          DITOLAK ({currentCategoryList.filter(
            (e) => e.claim.status === "rejected",
          ).length})
        </button>
      </div>

      <span class="font-pixel text-[7px] text-stone-500 hidden sm:inline shrink-0">
        {filteredClaims.length} ENTRI
      </span>
    </div>

    <!-- List Items / Cards Container -->
    <div
      class="flex-1 min-h-0 overflow-y-auto px-3 py-3 flex flex-col gap-3 inbox-scroll"
    >
      {#if filteredClaims.length === 0}
        <div class="h-full flex items-center justify-center p-6">
          <div
            class="bg-stone-50 border-2 border-dashed border-[#1c120c] p-6 text-center text-[#1c120c] font-pixel text-[8px] leading-relaxed"
          >
            {#if currentCategoryList.length === 0}
              {$inboxTab === "incoming"
                ? "[BELUM ADA KLAIM MASUK]"
                : "[BELUM ADA KLAIM YANG DIAJUKAN]"}
            {:else}
              [TIDAK ADA KLAIM PADA FILTER INI]
            {/if}
          </div>
        </div>
      {:else}
        {#each filteredClaims as entry (entry.claim.id)}
          {@const isIncoming = $inboxTab === "incoming"}
          {@const targetContact = isIncoming
            ? entry.claim.claimantContact
            : entry.item.reporterContact}
          {@const cleanWa = (targetContact || "").replace(/[^0-9]/g, "")}

          <div
            class="shrink-0 border-2 border-[#1c120c] bg-white shadow-[2px_2px_0_#1c120c] overflow-hidden"
            transition:fade={{ duration: 150 }}
          >
            <!-- Card Header: Status Tag + Tanggal -->
            <div class="px-3 pt-3 pb-2.5">
              <div class="flex items-center justify-between gap-2 mb-2">
                <span
                  class="font-pixel text-[6.5px] px-1.5 py-0.5 rounded-none font-bold inline-block border border-[#1c120c] {statusColor[
                    entry.claim.status
                  ] || 'bg-stone-200 text-[#1c120c]'}"
                >
                  [{statusLabel[entry.claim.status] ?? entry.claim.status}]
                </span>
                <span
                  class="font-mono text-[9px] font-bold text-stone-600 shrink-0"
                >
                  {formatDate(entry.claim.createdAt)}
                </span>
              </div>

              <!-- Baris Judul & Aktor -->
              <button
                type="button"
                onclick={() => toggleExpand(entry.claim.id)}
                class="w-full text-left cursor-pointer group hover:bg-[#fefce8] -mx-1.5 px-1.5 py-1 transition-colors"
              >
                <div class="flex items-start justify-between gap-2">
                  <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-1.5 flex-wrap">
                      <span
                        class="font-sans font-bold text-xs text-[#1c120c] truncate"
                      >
                        {entry.item.title}
                      </span>
                      <span
                        class="font-mono text-[8.5px] font-bold text-[#1c120c] bg-stone-100 px-1 py-0.5 border border-stone-300 shrink-0"
                      >
                        {entry.item.type === "found" ? "KETEMU" : "HILANG"} · {entry
                          .item.category || "Umum"}
                      </span>
                    </div>

                    <p
                      class="font-sans text-[10.5px] text-stone-600 mt-1 truncate"
                    >
                      {#if isIncoming}
                        👤 <span class="font-bold text-[#1c120c]"
                          >{entry.claim.claimantName || "Anonim"}</span
                        >
                        {#if entry.claim.claimantNpm}
                          <span class="text-stone-500 font-mono text-[9px]"
                            >({entry.claim.claimantNpm})</span
                          >
                        {/if}
                        {#if entry.claim.claimantContact}
                          <span class="text-stone-400"> &bull; </span>
                          <span
                            class="text-[#16a34a] font-mono text-[10px] font-bold"
                            >WA {entry.claim.claimantContact}</span
                          >
                        {/if}
                      {:else}
                        👤 <span class="font-bold text-[#1c120c]"
                          >Pelapor: {entry.item.reporterName || "Anonim"}</span
                        >
                        {#if entry.item.desc}
                          <span class="text-stone-400"> &bull; </span>
                          <span class="text-stone-500 font-medium"
                            >{entry.item.desc}</span
                          >
                        {/if}
                      {/if}
                    </p>
                  </div>
                  <span
                    class="font-pixel text-[9px] text-[#2563eb] font-bold shrink-0 mt-0.5 group-hover:translate-x-0.5 transition-transform"
                  >
                    {expandedClaimId === entry.claim.id ? "▲" : "▼"}
                  </span>
                </div>
              </button>
            </div>

            <!-- Detail Accordion -->
            {#if expandedClaimId === entry.claim.id}
              <div
                class="border-t-2 border-[#1c120c] bg-[#f8fafc] px-3 py-3 space-y-2.5"
                transition:fly={{ y: -6, duration: 150 }}
              >
                <!-- Meta: Info Laporan Barang -->
                <div
                  class="grid grid-cols-[70px_1fr] gap-x-2 gap-y-1.5 bg-white p-2 border border-stone-300 shadow-[1px_1px_0_#1c120c]"
                >
                  <span
                    class="font-pixel text-[6.5px] text-stone-500 font-bold pt-0.5"
                    >BARANG</span
                  >
                  <span
                    class="font-sans text-[11px] text-[#1c120c] font-bold leading-snug"
                    >{entry.item.title}</span
                  >

                  {#if entry.item.desc}
                    <span
                      class="font-pixel text-[6.5px] text-stone-500 font-bold pt-0.5"
                      >LOKASI</span
                    >
                    <span
                      class="font-sans text-[11px] text-[#1c120c] leading-snug"
                      >{entry.item.desc}</span
                    >
                  {/if}

                  {#if entry.item.date}
                    <span
                      class="font-pixel text-[6.5px] text-stone-500 font-bold pt-0.5"
                      >WAKTU</span
                    >
                    <span
                      class="font-mono text-[10px] text-[#1c120c] leading-snug"
                      >{entry.item.date} {entry.item.time || ""}</span
                    >
                  {/if}
                </div>

                <!-- Text Bubble Bukti Klaim User -->
                <div
                  class="border border-stone-300 bg-white p-2.5 shadow-[1px_1px_0_#1c120c]"
                >
                  <p
                    class="font-pixel text-[6.5px] text-stone-500 font-bold mb-1"
                  >
                    KLAIM USER / BUKTI KEPEMILIKAN
                  </p>
                  <p
                    class="font-sans text-[11px] text-[#1c120c] font-semibold leading-relaxed"
                  >
                    "{entry.claim.text || "Klaim diajukan"}"
                  </p>
                </div>

                <!-- Status Resolution Box -->
                {#if entry.claim.status === "pending"}
                  <div
                    class="bg-[#fefce8] border border-[#1c120c] p-2.5 text-center shadow-[1px_1px_0_#1c120c]"
                  >
                    <p
                      class="font-pixel text-[7px] text-[#92400e] font-bold mb-1"
                    >
                      [PROSES APPROVAL OTOMATIS (24 JAM)]
                    </p>
                    <p class="font-sans text-[10.5px] text-stone-700 leading-snug">
                      Klaim ini sedang ditampung dalam masa tenggang 24 jam sebelum dicocokkan otomatis oleh sistem Gale-Shapley.
                    </p>
                  </div>
                {:else if entry.claim.status === "approved"}
                  <div
                    class="bg-emerald-50 border border-[#1c120c] p-2.5 shadow-[1px_1px_0_#1c120c] space-y-2"
                  >
                    <p
                      class="font-sans text-[10.5px] text-emerald-900 font-bold leading-snug"
                    >
                      Klaim disetujui! Hubungi {isIncoming
                        ? "pengklaim"
                        : "pelapor"} untuk proses serah terima barang.
                    </p>
                    {#if cleanWa}
                      <a
                        href="https://wa.me/{cleanWa}"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="block w-full text-center bg-[#16a34a] hover:bg-[#15803d] active:translate-y-0.5 text-white font-pixel text-[7.5px] font-bold py-2 border border-[#1c120c] shadow-[1px_1px_0_#1c120c] cursor-pointer"
                        style="text-decoration: none;"
                      >
                        HUBUNGI VIA WHATSAPP ({targetContact})
                      </a>
                    {/if}
                  </div>
                {:else if entry.claim.status === "superseded"}
                  <div
                    class="bg-stone-100 border border-[#1c120c] p-2.5 shadow-[1px_1px_0_#1c120c]"
                  >
                    <p
                      class="font-sans text-[10.5px] text-stone-600 font-bold leading-snug"
                    >
                      Klaim ini digantikan oleh versi revisi yang lebih baru dari
                      pengklaim yang sama.
                    </p>
                  </div>
                {:else}
                  <div
                    class="bg-red-50 border border-[#1c120c] p-2.5 shadow-[1px_1px_0_#1c120c]"
                  >
                    <p
                      class="font-sans text-[10.5px] text-red-900 font-bold leading-snug"
                    >
                      Klaim tidak disetujui. Pelapor memilih pengklaim lain yang
                      lebih sesuai.
                    </p>
                  </div>
                {/if}
              </div>
            {/if}
          </div>
        {/each}
      {/if}
    </div>

    <!-- Notice Bar -->
    <div
      class="px-3.5 py-2 bg-[#f8fafc] border-t-2 border-[#1c120c] text-center shrink-0"
    >
      <p class="font-pixel text-[6.5px] text-stone-500 font-bold">
        {$inboxTab === "incoming"
          ? "SEMUA KLAIM DITAMPUNG SELAMA 24 JAM SEBELUM DICOCOKKAN OTOMATIS OLEH SISTEM"
          : "KLAIM KAMU DITAMPUNG SELAMA 24 JAM LALU AKAN DIPROSES OTOMATIS OLEH SISTEM"}
      </p>
    </div>

    <!-- Bottom Full Width Close Button -->
    <button
      type="button"
      onclick={close}
      class="shrink-0 w-full font-pixel text-[8.5px] py-2.5 bg-[#1c120c] hover:bg-stone-800 text-white cursor-pointer border-t-2 border-[#1c120c] font-bold active:translate-y-0.5"
    >
      ✕ TUTUP INBOX
    </button>
  </div>
{/if}

<style>
  .inbox-scroll::-webkit-scrollbar {
    width: 6px;
  }
  .inbox-scroll::-webkit-scrollbar-track {
    background: #f1f5f9;
  }
  .inbox-scroll::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 3px;
  }
  .inbox-scroll::-webkit-scrollbar-thumb:hover {
    background: #94a3b8;
  }
</style>
