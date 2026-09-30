<script lang="ts">
  import { fly, fade } from 'svelte/transition';
  import { archiveRequests, items, type ArchiveRequest, type Item } from '$lib/stores/items.js';
  import { currentPlayer } from '$lib/stores/player.js';
  import { getSocket } from '$lib/socket.js';
  import { PUBLIC_SATPAM_KEY } from '$env/static/public';
  import { onMount } from 'svelte';

  let {
    onActivateItem,
    onClose,
  }: {
    onActivateItem: (item: Item) => void;
    onClose?: () => void;
  } = $props();

  type ReqFilter = 'all' | 'pending' | 'approved' | 'rejected';
  let filter = $state<ReqFilter>('all');

  let expandedReqId = $state<string | null>(null);
  let processingId = $state<string | null>(null);

  // Mode picker: request mana yang sedang memilih item arsip untuk di-publish
  let pickerReqId = $state<string | null>(null);
  // Mode reject: request mana yang sedang menulis pesan penolakan
  let rejectReqId = $state<string | null>(null);
  let rejectMessage = $state('');
  let itemSearch = $state('');

  const pendingCount = $derived($archiveRequests.filter(r => r.status === 'pending').length);
  const approvedCount = $derived($archiveRequests.filter(r => r.status === 'approved').length);
  const rejectedCount = $derived($archiveRequests.filter(r => r.status === 'rejected').length);

  const filteredRequests = $derived.by(() => {
    if (filter === 'all') return $archiveRequests;
    return $archiveRequests.filter((r) => r.status === filter);
  });

  // Daftar barang arsip (expired) yang bisa di-publish manual oleh Satpam
  const expiredItems = $derived($items.filter((i) => i.status === 'expired'));

  const filteredExpired = $derived.by(() => {
    const q = itemSearch.trim().toLowerCase();
    if (!q) return expiredItems;
    return expiredItems.filter((i) =>
      (i.title || '').toLowerCase().includes(q) ||
      (i.category || '').toLowerCase().includes(q) ||
      (i.desc || '').toLowerCase().includes(q) ||
      (i.shortCode || '').toLowerCase().includes(q)
    );
  });

  const accessKey = $derived(
    ($currentPlayer as any)?.accessKey || PUBLIC_SATPAM_KEY || ''
  );

  onMount(() => {
    const socket = getSocket();
    if (socket) {
      socket.emit('archive_requests_get', { accessKey });
    }
  });

  function toggleExpand(id: string) {
    expandedReqId = expandedReqId === id ? null : id;
    pickerReqId = null;
    rejectReqId = null;
    rejectMessage = '';
    itemSearch = '';
  }

  function openPicker(req: ArchiveRequest) {
    pickerReqId = req.id;
    rejectReqId = null;
    itemSearch = '';
  }

  function openReject(req: ArchiveRequest) {
    rejectReqId = req.id;
    pickerReqId = null;
    rejectMessage = '';
  }

  async function handleApprove(req: ArchiveRequest, itemId: string) {
    processingId = req.id;
    const socket = getSocket();
    if (!socket) { processingId = null; return; }

    socket.emit('archive_request_approve', {
      accessKey,
      requestId: req.id,
      itemId,
    });

    // Update local store optimistically
    archiveRequests.update(current =>
      current.map(r => r.id === req.id ? { ...r, status: 'approved', matchedItemId: itemId } : r)
    );
    processingId = null;
    pickerReqId = null;
    expandedReqId = null;
  }

  async function handleReject(req: ArchiveRequest) {
    processingId = req.id;
    const socket = getSocket();
    if (!socket) { processingId = null; return; }

    socket.emit('archive_request_reject', {
      accessKey,
      requestId: req.id,
      rejectMessage: rejectMessage.trim(),
    });

    archiveRequests.update(current =>
      current.map(r => r.id === req.id ? { ...r, status: 'rejected', rejectMessage: rejectMessage.trim() } : r)
    );
    processingId = null;
    rejectReqId = null;
    expandedReqId = null;
    rejectMessage = '';
  }

  function formatDate(iso: string) {
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return iso;
      const year = d.getFullYear();
      const month = d.toLocaleString('id-ID', { month: 'short' });
      const day = String(d.getDate()).padStart(2, '0');
      const hours = String(d.getHours()).padStart(2, '0');
      const mins = String(d.getMinutes()).padStart(2, '0');
      return `${day} ${month} ${year}, ${hours}.${mins}`;
    } catch { return iso; }
  }

  const statusLabel: Record<string, string> = {
    pending: 'MENUNGGU',
    approved: 'DIPUBLISH',
    rejected: 'DITOLAK',
  };

  const statusColor: Record<string, string> = {
    pending: 'bg-[#ea580c] text-white',
    approved: 'bg-[#16a34a] text-white',
    rejected: 'bg-[#dc2626] text-white',
  };
</script>

<div class="flex flex-col flex-1 min-h-0 bg-[#f8fafc]">
  <!-- NES Title Bar (matching SatpamMutasiModal) -->
  <div
    class="bg-[#2563eb] text-white px-3.5 py-2.5 font-pixel text-[9px] md:text-[10px] flex justify-between items-center border-b-2 border-[#1c120c] select-none shrink-0"
  >
    <div class="flex items-center gap-2">
      <span class="w-2.5 h-2.5 bg-[#ffd700] border border-[#1c120c]"></span>
      <span class="font-bold tracking-wider">INBOX ARSIP</span>
      {#if pendingCount > 0}
        <span
          class="bg-[#dc2626] text-white font-pixel text-[7.5px] px-1.5 py-0.5 border border-[#1c120c] font-bold shadow-[1px_1px_0_#1c120c]"
        >
          {pendingCount}
        </span>
      {/if}
    </div>
    {#if onClose}
      <button
        type="button"
        onclick={onClose}
        class="bg-[#dc2626] hover:bg-[#b91c1c] active:translate-y-0.5 text-white font-pixel text-[9px] px-2 py-0.5 border border-[#1c120c] cursor-pointer shadow-[1px_1px_0_#1c120c] leading-none"
        aria-label="Tutup"
      >
        X
      </button>
    {/if}
  </div>

  <!-- Segmented Filter Tab NES Minimalist (matching SatpamMutasiModal) -->
  <div
    class="bg-[#f8fafc] px-3.5 py-2 border-b-2 border-[#1c120c] flex items-center justify-between gap-1.5 select-none shrink-0"
  >
    <div class="flex items-center gap-1.5 overflow-x-auto">
      <button
        type="button"
        onclick={() => (filter = 'all')}
        class="px-2 py-1 text-[7.5px] font-pixel font-bold border border-[#1c120c] cursor-pointer transition-all {filter ===
        'all'
          ? 'bg-[#1c120c] text-white shadow-[1px_1px_0_#1c120c]'
          : 'bg-white text-[#1c120c] hover:bg-stone-200'}"
      >
        SEMUA ({$archiveRequests.length})
      </button>
      <button
        type="button"
        onclick={() => (filter = 'pending')}
        class="px-2 py-1 text-[7.5px] font-pixel font-bold border border-[#1c120c] cursor-pointer transition-all {filter ===
        'pending'
          ? 'bg-[#ea580c] text-white shadow-[1px_1px_0_#1c120c]'
          : 'bg-white text-[#1c120c] hover:bg-stone-200'}"
      >
        MENUNGGU ({pendingCount})
      </button>
      <button
        type="button"
        onclick={() => (filter = 'approved')}
        class="px-2 py-1 text-[7.5px] font-pixel font-bold border border-[#1c120c] cursor-pointer transition-all {filter ===
        'approved'
          ? 'bg-[#16a34a] text-white shadow-[1px_1px_0_#1c120c]'
          : 'bg-white text-[#1c120c] hover:bg-stone-200'}"
      >
        DIPUBLISH ({approvedCount})
      </button>
      <button
        type="button"
        onclick={() => (filter = 'rejected')}
        class="px-2 py-1 text-[7.5px] font-pixel font-bold border border-[#1c120c] cursor-pointer transition-all {filter ===
        'rejected'
          ? 'bg-[#dc2626] text-white shadow-[1px_1px_0_#1c120c]'
          : 'bg-white text-[#1c120c] hover:bg-stone-200'}"
      >
        DITOLAK ({rejectedCount})
      </button>
    </div>

    <span class="font-pixel text-[7px] text-stone-500 hidden sm:inline shrink-0">
      {filteredRequests.length} REQ
    </span>
  </div>

  <!-- List -->
  <div class="flex-1 min-h-0 overflow-y-auto px-3 py-3 flex flex-col gap-3">
    {#if filteredRequests.length === 0}
      <div class="h-full flex items-center justify-center p-6">
        <div
          class="bg-stone-50 border-2 border-dashed border-[#1c120c] p-6 text-center text-[#1c120c] font-pixel text-[8px] leading-relaxed"
        >
          {$archiveRequests.length === 0
            ? '[TIDAK ADA REQUEST MASUK]'
            : '[TIDAK ADA REQUEST PADA FILTER INI]'}
        </div>
      </div>
    {:else}
      {#each filteredRequests as req (req.id)}
        <div
          class="shrink-0 border-2 border-[#1c120c] bg-white shadow-[2px_2px_0_#1c120c] overflow-hidden"
          transition:fade={{ duration: 150 }}
        >
          <!-- Card header: status + judul -->
          <div class="px-3 pt-3 pb-2.5">
            <div class="flex items-center justify-between gap-2 mb-2">
              <span
                class="font-pixel text-[6.5px] px-1.5 py-0.5 rounded-none font-bold inline-block border border-[#1c120c] {statusColor[req.status]}"
              >
                [{statusLabel[req.status] ?? req.status}]
              </span>
              <span class="font-mono text-[9px] font-bold text-stone-600 shrink-0">
                {formatDate(req.createdAt)}
              </span>
            </div>

            <button
              type="button"
              onclick={() => toggleExpand(req.id)}
              class="w-full text-left cursor-pointer group hover:bg-[#fefce8] -mx-1.5 px-1.5 py-1 transition-colors"
            >
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-1.5 flex-wrap">
                    <span class="font-sans font-bold text-xs text-[#1c120c] truncate">
                      {req.itemTitle}
                    </span>
                    {#if req.itemCategory}
                      <span
                        class="font-mono text-[9px] font-bold text-[#1c120c] bg-stone-100 px-1.5 py-0.5 border border-stone-300 shrink-0"
                      >
                        {req.itemCategory}
                      </span>
                    {/if}
                  </div>
                  <p class="font-sans text-[10.5px] text-stone-600 mt-1 truncate">
                    👤 <span class="font-bold text-[#1c120c]">{req.senderName}</span>
                    <span class="text-stone-400"> &bull; </span>
                    <span class="text-[#16a34a] font-mono text-[10px] font-bold">WA {req.senderContact}</span>
                  </p>
                </div>
                <span
                  class="font-pixel text-[9px] text-[#2563eb] font-bold shrink-0 mt-0.5 group-hover:translate-x-0.5 transition-transform"
                >
                  {expandedReqId === req.id ? '▲' : '▼'}
                </span>
              </div>
            </button>
          </div>

          <!-- Detail -->
          {#if expandedReqId === req.id}
            <div
              class="border-t-2 border-[#1c120c] bg-[#f8fafc] px-3 py-3 space-y-2.5"
              transition:fly={{ y: -6, duration: 150 }}
            >
              <!-- Meta: lokasi & perkiraan -->
              {#if req.locationHint || req.dateFrom || req.dateTo || req.senderNpm}
                <div class="grid grid-cols-[70px_1fr] gap-x-2 gap-y-1.5 bg-white p-2 border border-stone-300 shadow-[1px_1px_0_#1c120c]">
                  {#if req.senderNpm}
                    <span class="font-pixel text-[6.5px] text-stone-500 font-bold pt-0.5">NPM</span>
                    <span class="font-mono text-[10px] text-[#1c120c] font-bold leading-snug">{req.senderNpm}</span>
                  {/if}
                  {#if req.locationHint}
                    <span class="font-pixel text-[6.5px] text-stone-500 font-bold pt-0.5">LOKASI</span>
                    <span class="font-sans text-[11px] text-[#1c120c] leading-snug">{req.locationHint}</span>
                  {/if}
                  {#if req.dateFrom || req.dateTo}
                    <span class="font-pixel text-[6.5px] text-stone-500 font-bold pt-0.5">WAKTU</span>
                    <span class="font-mono text-[10px] text-[#1c120c] leading-snug">
                      {req.dateFrom || '?'} <span class="text-stone-400">s/d</span> {req.dateTo || '?'}
                    </span>
                  {/if}
                </div>
              {/if}

              <!-- Deskripsi -->
              <div class="border border-stone-300 bg-white p-2.5 shadow-[1px_1px_0_#1c120c]">
                <p class="font-pixel text-[6.5px] text-stone-500 font-bold mb-1">DESKRIPSI BARANG</p>
                <p class="font-sans text-[11px] text-[#1c120c] leading-relaxed">{req.description}</p>
              </div>

              <!-- ===== Aksi Pending ===== -->
              {#if req.status === 'pending'}
                <!-- Tombol utama -->
                {#if pickerReqId !== req.id && rejectReqId !== req.id}
                  <div class="flex gap-2">
                    <button
                      type="button"
                      disabled={!!processingId}
                      onclick={() => openPicker(req)}
                      class="flex-1 font-pixel text-[7.5px] font-bold py-2 bg-[#16a34a] hover:bg-[#15803d] active:translate-y-0.5 text-white border border-[#1c120c] shadow-[1px_1px_0_#1c120c] transition-all cursor-pointer disabled:opacity-50"
                    >
                      [✅ ACCEPT &amp; PUBLISH]
                    </button>
                    <button
                      type="button"
                      disabled={!!processingId}
                      onclick={() => openReject(req)}
                      class="flex-1 font-pixel text-[7.5px] font-bold py-2 bg-white hover:bg-stone-100 active:translate-y-0.5 text-[#dc2626] border border-[#1c120c] shadow-[1px_1px_0_#1c120c] transition-all cursor-pointer disabled:opacity-50"
                    >
                      [✕ TOLAK]
                    </button>
                  </div>
                {/if}

                <!-- Picker: pilih barang arsip untuk di-publish -->
                {#if pickerReqId === req.id}
                  <div class="border-2 border-[#1c120c] bg-white p-2.5 shadow-[2px_2px_0_#1c120c]">
                    <div class="flex items-center justify-between gap-2 mb-2">
                      <p class="font-pixel text-[7.5px] text-[#1c120c] font-bold">
                        PILIH BARANG ARSIP UNTUK DIPUBLISH
                      </p>
                      <button
                        type="button"
                        onclick={() => (pickerReqId = null)}
                        class="bg-stone-100 hover:bg-stone-200 active:translate-y-0.5 font-pixel text-[7px] font-bold text-[#1c120c] px-2 py-0.5 border border-[#1c120c] shadow-[1px_1px_0_#1c120c] cursor-pointer"
                      >BATAL</button>
                    </div>

                    <input
                      type="text"
                      bind:value={itemSearch}
                      placeholder="Cari nama barang di arsip..."
                      class="w-full bg-white border-2 border-[#1c120c] px-2 py-1.5 font-sans text-[11px] outline-none focus:border-[#2563eb] mb-2 font-medium text-[#1c120c]"
                    />

                    {#if filteredExpired.length === 0}
                      <p class="font-sans text-[10px] text-stone-500 text-center py-3">
                        {expiredItems.length === 0
                          ? 'Tidak ada barang di arsip EXPIRED.'
                          : 'Barang tidak ditemukan di arsip.'}
                      </p>
                    {:else}
                      <div class="flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-1 pb-1 inbox-scroll">
                        {#each filteredExpired as candidate (candidate.id)}
                          <div class="shrink-0 border border-[#1c120c] bg-white shadow-[1px_1px_0_#1c120c] p-2 flex items-center gap-2 hover:bg-[#fefce8] transition-colors">
                            <!-- Thumbnail foto bukti (Satpam boleh lihat) -->
                            <div class="w-11 h-11 shrink-0 border border-[#1c120c] bg-stone-100 overflow-hidden flex items-center justify-center">
                              {#if candidate.evidencePhoto}
                                <img src={candidate.evidencePhoto} alt="Foto bukti" class="w-full h-full object-cover" />
                              {:else}
                                <span class="text-xl">{candidate.icon}</span>
                              {/if}
                            </div>
                            <div class="min-w-0 flex-1">
                              <div class="flex items-center gap-1.5 flex-wrap">
                                <span class="font-sans font-bold text-xs text-[#1c120c] truncate">{candidate.title}</span>
                                <span class="font-mono text-[8px] font-bold text-[#1c120c] bg-stone-100 px-1 py-0.5 border border-stone-300">
                                  {candidate.category || 'Umum'}
                                </span>
                              </div>
                              <p class="font-sans text-[10px] text-stone-600 line-clamp-1 leading-snug">{candidate.desc}</p>
                              <p class="font-mono text-[8px] text-stone-500 mt-0.5">
                                📍 {candidate.reporterName || 'Anonim'} · {candidate.date || '-'}
                              </p>
                            </div>
                            <div class="shrink-0 flex flex-col gap-1">
                              <button
                                type="button"
                                disabled={!!processingId}
                                onclick={() => handleApprove(req, candidate.id)}
                                class="font-pixel text-[7px] font-bold py-1 px-2 bg-[#16a34a] hover:bg-[#15803d] active:translate-y-0.5 text-white border border-[#1c120c] shadow-[1px_1px_0_#1c120c] transition-all cursor-pointer disabled:opacity-50"
                              >
                                PUBLISH
                              </button>
                              <button
                                type="button"
                                onclick={() => { onActivateItem(candidate); }}
                                class="font-pixel text-[7px] font-bold py-1 px-2 bg-[#facc15] hover:bg-[#eab308] active:translate-y-0.5 text-[#1c120c] border border-[#1c120c] shadow-[1px_1px_0_#1c120c] cursor-pointer"
                              >
                                LIHAT
                              </button>
                            </div>
                          </div>
                        {/each}
                      </div>
                    {/if}
                  </div>
                {/if}

                <!-- Form reject -->
                {#if rejectReqId === req.id}
                  <div class="border-2 border-[#1c120c] bg-red-50/60 p-2.5 shadow-[2px_2px_0_#1c120c]">
                    <p class="font-pixel text-[7px] text-[#dc2626] font-bold mb-2">PESAN UNTUK PENGIRIM (OPSIONAL)</p>
                    <textarea
                      bind:value={rejectMessage}
                      rows="3"
                      placeholder="Mis: Maaf, barang yang Anda cari belum ada di arsip kami / belum pernah dilaporkan."
                      class="w-full bg-white border-2 border-[#1c120c] px-2 py-1.5 font-sans text-[11px] outline-none focus:border-[#dc2626] resize-none"
                    ></textarea>
                    <div class="flex gap-2 mt-2">
                      <button
                        type="button"
                        onclick={() => (rejectReqId = null)}
                        class="flex-1 font-pixel text-[7.5px] font-bold py-1.5 bg-stone-100 hover:bg-stone-200 text-[#1c120c] border border-[#1c120c] shadow-[1px_1px_0_#1c120c] active:translate-y-0.5 cursor-pointer"
                      >BATAL</button>
                      <button
                        type="button"
                        disabled={!!processingId}
                        onclick={() => handleReject(req)}
                        class="flex-1 font-pixel text-[7.5px] font-bold py-1.5 bg-[#dc2626] hover:bg-[#b91c1c] text-white border border-[#1c120c] shadow-[1px_1px_0_#1c120c] active:translate-y-0.5 cursor-pointer disabled:opacity-50"
                      >KIRIM PENOLAKAN</button>
                    </div>
                  </div>
                {/if}
              {:else if req.status === 'approved'}
                <div class="flex items-center gap-2 bg-emerald-50 border border-[#1c120c] p-2.5 shadow-[1px_1px_0_#1c120c]">
                  <span class="text-base leading-none shrink-0">✅</span>
                  <p class="font-sans text-[10.5px] text-emerald-900 font-semibold leading-relaxed">
                    Sudah dipublish ke board publik. Menunggu pengirim melakukan klaim (ZKP).
                  </p>
                </div>
              {:else if req.status === 'rejected'}
                <div class="bg-red-50 border border-[#1c120c] p-2.5 shadow-[1px_1px_0_#1c120c]">
                  <p class="font-sans text-[10.5px] text-red-900 font-bold leading-relaxed">Request ditolak.</p>
                  {#if req.rejectMessage}
                    <p class="font-sans text-[10.5px] text-red-800 mt-1 leading-relaxed">
                      “{req.rejectMessage}”
                    </p>
                  {/if}
                </div>
              {/if}
            </div>
          {/if}
        </div>
      {/each}
    {/if}
  </div>
</div>

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