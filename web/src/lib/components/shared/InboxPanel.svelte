<script lang="ts">
  import { fly, fade } from 'svelte/transition';
  import { items } from '$lib/stores/items.js';
  import { currentPlayer } from '$lib/stores/player.js';
  import { inboxOpen, inboxTab, type InboxTab } from '$lib/stores/ui.js';
  import { getSocket } from '$lib/socket.js';
  import TagIcon from './TagIcon.svelte';

  // ── Derived: item milik reporter yang punya klaim pending ────────────────
  let reporterItems = $derived(
    $items.filter(
      (i) =>
        !!$currentPlayer?.npm &&
        i.reporterNpm === $currentPlayer.npm &&
        (i.claims || []).length > 0
    )
  );

  let incomingPendingCount = $derived(
    reporterItems.reduce(
      (acc, i) => acc + (i.claims || []).filter((c) => c.status === 'pending').length,
      0
    )
  );

  // ── Derived: klaim yang pernah diajukan oleh user ini ────────────────────
  let myClaims = $derived(
    $items
      .filter((i) => (i.claims || []).some((c) => c.claimantNpm === $currentPlayer?.npm))
      .map((i) => {
        const myClaim = i.claims.find((c) => c.claimantNpm === $currentPlayer?.npm)!;
        return { item: i, claim: myClaim };
      })
  );

  let myPendingCount = $derived(myClaims.filter((m) => m.claim.status === 'pending').length);

  function switchTab(tab: InboxTab) {
    inboxTab.set(tab);
  }

  function close() {
    inboxOpen.set(false);
  }


  // Format tanggal ISO ke format: 26/9/2026 21.59
  function formatDate(iso: string): string {
    if (!iso) return '-';
    const d = new Date(iso);
    const day = d.getDate();
    const month = d.getMonth() + 1;
    const year = d.getFullYear();
    const hours = d.getHours().toString().padStart(2, '0');
    const mins = d.getMinutes().toString().padStart(2, '0');
    return `${day}/${month}/${year} ${hours}.${mins}`;
  }

  // Label status klaim
  function statusLabel(status: string): string {
    if (status === 'pending') return 'PENDING';
    if (status === 'approved') return 'DISETUJUI';
    return 'DITOLAK';
  }

  function statusClass(status: string): string {
    if (status === 'pending') return 'bg-[#f59e0b] text-[#1c120c]';
    if (status === 'approved') return 'bg-[#15803d] text-white';
    return 'bg-[#dc2626] text-white';
  }
</script>

{#if $inboxOpen}
  <!-- Backdrop -->
  <div
    class="fixed inset-0 z-40"
    onclick={close}
    onkeydown={(e) => e.key === 'Escape' && close()}
    role="button"
    tabindex="-1"
    aria-label="Tutup inbox"
    transition:fade={{ duration: 100 }}
  ></div>

  <!-- Panel -->
  <div
    class="fixed top-12 right-3 z-50 w-[300px] md:w-[350px] bg-white border-4 border-[#1c120c] shadow-[5px_5px_0px_#0a060f] rounded flex flex-col overflow-hidden select-none"
    transition:fly={{ y: -10, duration: 200 }}
    role="dialog"
    aria-label="Inbox Klaim"
  >
    <!-- Header -->
    <div class="bg-[#2563eb] text-white px-3 py-2 font-pixel text-[8.5px] flex justify-between items-center border-b-2 border-[#1c120c]">
      <div class="flex items-center gap-1.5">
        <span class="w-1.5 h-1.5 rounded-full bg-green-400 border border-[#0c0812] animate-pulse"></span>
        <span class="font-bold tracking-wider">INBOX KLAIM</span>
      </div>
      <button
        onclick={close}
        class="text-white hover:text-red-200 font-pixel text-[10px] px-1 py-0.5 cursor-pointer leading-none"
        type="button"
        aria-label="Tutup"
      >
        X
      </button>
    </div>

    <!-- Tabs -->
    <div class="flex border-b-2 border-[#1c120c] bg-[#f8fafc]">
      <button
        type="button"
        onclick={() => switchTab('incoming')}
        class="flex-1 py-1.5 font-pixel text-[7.5px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1 border-r-2 border-[#1c120c]
          {$inboxTab === 'incoming' ? 'bg-[#2563eb] text-white' : 'text-[#1c120c] hover:bg-slate-100'}"
      >
        KLAIM MASUK
        {#if incomingPendingCount > 0}
          <span class="bg-[#dc2626] text-white font-pixel text-[6.5px] px-1 py-0.5 rounded border border-[#1c120c] leading-none">
            {incomingPendingCount}
          </span>
        {/if}
      </button>
      <button
        type="button"
        onclick={() => switchTab('mine')}
        class="flex-1 py-1.5 font-pixel text-[7.5px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1
          {$inboxTab === 'mine' ? 'bg-[#2563eb] text-white' : 'text-[#1c120c] hover:bg-slate-100'}"
      >
        KLAIM SAYA
        {#if myPendingCount > 0}
          <span class="bg-[#f59e0b] text-[#1c120c] font-pixel text-[6.5px] px-1 py-0.5 rounded border border-[#1c120c] leading-none">
            {myPendingCount}
          </span>
        {/if}
      </button>
    </div>

    <!-- Content area -->
    <div class="flex flex-col gap-2.5 p-2.5 max-h-[380px] overflow-y-auto inbox-scroll bg-[#f8fafc]">

      <!-- ── Tab: KLAIM MASUK ──────────────────────────────────────────── -->
      {#if $inboxTab === 'incoming'}
        {#if reporterItems.length === 0}
          <div class="p-6 text-center font-pixel text-[7.5px] text-stone-500 font-bold bg-white border-2 border-[#1c120c] rounded shadow-[2px_2px_0_#1c120c]">
            BELUM ADA KLAIM MASUK
          </div>
        {:else}
          {#each reporterItems as item (item.id)}
            {@const pendingClaims = (item.claims || []).filter((c) => c.status === 'pending')}
            {@const otherClaims = (item.claims || []).filter((c) => c.status !== 'pending')}
            <div class="flex flex-col gap-2 mb-0.5" transition:fly={{ x: 10, duration: 150 }}>
              <!-- Item Header Card (Pastel Yellow / Cream) -->
              <div class="bg-[#fef9c3] border-2 border-[#1c120c] rounded-lg p-2.5 shadow-[2px_2px_0px_#1c120c] flex items-center gap-2.5">
                <div class="w-9 h-9 rounded-md bg-white border-2 border-[#1c120c] flex items-center justify-center shrink-0 shadow-[1px_1px_0px_#1c120c]">
                  <TagIcon tag={item.tag} fallback={item.icon} size={24} title={item.title} />
                </div>
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-1.5">
                    <span class="font-pixel text-[11px] text-[#1c120c] font-bold truncate">{item.title}</span>
                    <span class="font-pixel text-[6.5px] px-1.5 py-0.5 rounded border border-[#1c120c] font-bold text-white tracking-wider {item.type === 'found' ? 'bg-[#15803d]' : 'bg-[#dc2626]'}">
                      {item.type === 'found' ? 'KETEMU' : 'HILANG'}
                    </span>
                  </div>
                  <p class="font-sans text-[10px] font-bold text-[#1c120c]/80 mt-0.5 truncate">
                    {item.desc || `Total ${(item.claims || []).length} Pengajuan Klaim`}
                  </p>
                </div>
              </div>

              <!-- Klaim Pending List (Pastel Mint Green) -->
              {#if pendingClaims.length > 0}
                <div class="flex flex-col gap-2">
                  {#each pendingClaims as claim (claim.id)}
                    <div class="bg-[#dcfce7] border-2 border-[#1c120c] rounded-lg p-2.5 shadow-[2px_2px_0px_#1c120c] flex flex-col gap-2">
                      <!-- Top Row: Badge PENDING & Timestamp -->
                      <div class="flex justify-between items-center">
                        <span class="bg-[#f59e0b] text-[#1c120c] px-1.5 py-0.5 text-[7px] font-pixel font-bold rounded border border-[#1c120c] tracking-wider">
                          PENDING
                        </span>
                        <span class="text-[9.5px] text-[#1c120c]/80 font-sans font-bold">{formatDate(claim.createdAt)}</span>
                      </div>

                      <!-- Middle Box: Text Bubble KLAIM USER -->
                      <div class="bg-white border-2 border-[#1c120c] rounded-md p-2 shadow-[1px_1px_0px_#1c120c]">
                        <span class="text-[#1c120c] text-[8px] font-pixel block mb-0.5 font-bold tracking-wider">KLAIM USER:</span>
                        <p class="font-sans text-[11px] text-[#1c120c] font-semibold leading-relaxed">
                          "{claim.text || 'Klaim terverifikasi ZKP'}"
                        </p>
                      </div>

                      <!-- Bottom Row: Oleh & WA -->
                      <div class="flex items-center justify-between text-[10px] text-[#1c120c] font-sans border-t border-[#1c120c]/20 pt-1 font-bold">
                        <span>Oleh: <strong class="text-[#1c120c]">{claim.claimantName || 'Anonim'}</strong> ({claim.claimantNpm || '-'})</span>
                        {#if claim.claimantContact}
                          <span class="text-[#15803d] font-bold">WA: {claim.claimantContact}</span>
                        {/if}
                      </div>

                      <!-- Status Resolusi Gale-Shapley Otomatis -->
                      {#if item.status !== 'resolved'}
                        <div class="mt-0.5 bg-[#fef3c7] border border-[#f59e0b] text-[#92400e] font-pixel text-[7px] py-1.5 px-2 rounded-md text-center font-bold flex items-center justify-center gap-1.5 shadow-[1px_1px_0px_#1c120c]">
                          <span class="w-1.5 h-1.5 rounded-full bg-[#f59e0b] animate-ping"></span>
                          <span>PROSES GALE-SHAPLEY (1 MENIT)</span>
                        </div>
                      {:else}
                        <div class="mt-0.5 bg-[#bbf7d0] border border-[#16a34a] text-[#166534] font-pixel text-[7px] py-1.5 px-2 rounded-md text-center font-bold shadow-[1px_1px_0px_#1c120c]">
                          SUDAH DISELESAIKAN (GALE-SHAPLEY)
                        </div>
                      {/if}
                    </div>
                  {/each}
                </div>
              {/if}

              <!-- Klaim Sudah Diproses -->
              {#if otherClaims.length > 0}
                <div class="flex flex-col gap-1 mt-0.5">
                  <p class="font-pixel text-[6.5px] text-stone-500 font-bold">SUDAH DIPROSES ({otherClaims.length})</p>
                  {#each otherClaims as claim (claim.id)}
                    <div class="flex justify-between items-center px-2 py-1 bg-white border border-[#1c120c]/30 rounded-md shadow-sm">
                      <div class="flex items-center gap-1">
                        <span class="font-sans text-[10px] text-stone-700 font-bold">{claim.claimantName || 'Anonim'}</span>
                        {#if claim.claimantNpm}
                          <span class="font-sans text-[9px] text-stone-500 font-medium">({claim.claimantNpm})</span>
                        {/if}
                      </div>
                      <span class="font-pixel text-[6.5px] px-1 py-0.5 rounded border border-[#1c120c] font-bold {statusClass(claim.status)}">
                        {statusLabel(claim.status)}
                      </span>
                    </div>
                  {/each}
                </div>
              {/if}
            </div>
          {/each}
        {/if}
      {/if}

      <!-- ── Tab: KLAIM SAYA (Konsisten Sesuai Gambar 2) ────────────────── -->
      {#if $inboxTab === 'mine'}
        {#if myClaims.length === 0}
          <div class="p-6 text-center font-pixel text-[7.5px] text-stone-500 font-bold bg-white border-2 border-[#1c120c] rounded shadow-[2px_2px_0_#1c120c]">
            BELUM ADA KLAIM YANG DIAJUKAN
          </div>
        {:else}
          {#each myClaims as { item, claim } (claim.id)}
            <div class="flex flex-col gap-2 mb-0.5" transition:fly={{ x: -10, duration: 150 }}>
              <!-- Item Header Card (Pastel Yellow / Cream Sesuai Gambar 2) -->
              <div class="bg-[#fef9c3] border-2 border-[#1c120c] rounded-lg p-2.5 shadow-[2px_2px_0px_#1c120c] flex items-center gap-2.5">
                <div class="w-9 h-9 rounded-md bg-white border-2 border-[#1c120c] flex items-center justify-center shrink-0 shadow-[1px_1px_0px_#1c120c]">
                  <TagIcon tag={item.tag} fallback={item.icon} size={24} title={item.title} />
                </div>
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-1.5">
                    <span class="font-pixel text-[11px] text-[#1c120c] font-bold truncate">{item.title}</span>
                    <span class="font-pixel text-[6.5px] px-1.5 py-0.5 rounded border border-[#1c120c] font-bold text-white tracking-wider {item.type === 'found' ? 'bg-[#15803d]' : 'bg-[#dc2626]'}">
                      {item.type === 'found' ? 'KETEMU' : 'HILANG'}
                    </span>
                  </div>
                  <p class="font-sans text-[10px] font-bold text-[#1c120c]/80 mt-0.5 truncate">
                    {item.desc || 'Laporan barang'}
                  </p>
                </div>
              </div>

              <!-- Status Klaim Card (Pastel Mint Green Sesuai Gambar 2) -->
              <div class="bg-[#dcfce7] border-2 border-[#1c120c] rounded-lg p-2.5 shadow-[2px_2px_0px_#1c120c] flex flex-col gap-2">
                <!-- Top Row: Badge Status & Timestamp -->
                <div class="flex justify-between items-center">
                  <span class="font-pixel text-[7px] px-1.5 py-0.5 rounded border border-[#1c120c] font-bold tracking-wider {statusClass(claim.status)}">
                    {statusLabel(claim.status)}
                  </span>
                  <span class="text-[9.5px] text-[#1c120c]/80 font-sans font-bold">{formatDate(claim.createdAt)}</span>
                </div>

                <!-- Middle Box: Text Bubble KLAIM USER -->
                <div class="bg-white border-2 border-[#1c120c] rounded-md p-2 shadow-[1px_1px_0px_#1c120c]">
                  <span class="text-[#1c120c] text-[8px] font-pixel block mb-0.5 font-bold tracking-wider">KLAIM USER:</span>
                  <p class="font-sans text-[11px] text-[#1c120c] font-semibold leading-relaxed">
                    "{claim.text || 'Klaim terverifikasi ZKP'}"
                  </p>
                </div>

                <!-- Pesan Keterangan Status (Persis Sesuai Gambar 2) -->
                {#if claim.status === 'rejected'}
                  <p class="font-sans text-[10.5px] text-[#991b1b] font-semibold leading-snug">
                    Klaim kamu tidak disetujui. Pelapor memilih pengklaim lain yang lebih sesuai.
                  </p>
                {:else if claim.status === 'approved'}
                  <p class="font-sans text-[10.5px] text-[#15803d] font-bold leading-snug">
                    Klaim kamu disetujui! Hubungi pelapor untuk proses serah terima barang.
                  </p>
                  {#if item.reporterContact}
                    {@const waNumber = item.reporterContact.replace(/[^0-9]/g, '')}
                    {#if waNumber}
                      <a
                        href="https://wa.me/{waNumber}"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="mt-0.5 bg-[#16a34a] hover:bg-[#15803d] active:translate-y-0.5 text-white font-pixel text-[7.5px] py-1.5 px-2.5 rounded-md block text-center border-2 border-[#1c120c] shadow-[2px_2px_0_#1c120c] transition-all font-bold tracking-wider"
                        style="text-decoration:none;"
                      >
                        HUBUNGI VIA WHATSAPP
                      </a>
                    {/if}
                  {/if}
                {:else}
                  <div class="flex items-center gap-1.5">
                    <span class="w-1.5 h-1.5 rounded-full bg-[#f59e0b] animate-pulse"></span>
                    <p class="font-sans text-[10.5px] text-stone-700 font-semibold leading-snug">
                      Klaim ZKP kamu sedang ditinjau oleh pelapor.
                    </p>
                  </div>
                {/if}
              </div>
            </div>
          {/each}
        {/if}
      {/if}
    </div>

    <!-- Footer info -->
    <div class="px-3 py-1.5 bg-white border-t-2 border-[#1c120c]">
      <p class="font-pixel text-[6.5px] text-stone-400 font-bold text-center">
        {#if $inboxTab === 'incoming'}
          KLAIM TIDAK DISETUJUI DALAM 48 JAM AKAN DISELESAIKAN OTOMATIS
        {:else}
          KLAIM ZKP TERVERIFIKASI MASUK KE ANTRIAN REVIEW PELAPOR
        {/if}
      </p>
    </div>
  </div>
{/if}

<style>
  .inbox-scroll::-webkit-scrollbar { width: 5px; }
  .inbox-scroll::-webkit-scrollbar-track { background: #f1f5f9; }
  .inbox-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 2px; }
  .inbox-scroll::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
</style>
