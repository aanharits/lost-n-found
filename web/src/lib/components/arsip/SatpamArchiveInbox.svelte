<script lang="ts">
  import { fly, fade } from 'svelte/transition';
  import { archiveRequests, items, type ArchiveRequest, type Item } from '$lib/stores/items.js';
  import { currentPlayer } from '$lib/stores/player.js';
  import { getSocket } from '$lib/socket.js';
  import { PUBLIC_SATPAM_KEY } from '$env/static/public';
  import { onMount } from 'svelte';

  let { onActivateItem }: { onActivateItem: (item: Item) => void } = $props();

  let expandedReqId = $state<string | null>(null);
  let processingId = $state<string | null>(null);

  // Mode picker: request mana yang sedang memilih item arsip untuk di-publish
  let pickerReqId = $state<string | null>(null);
  // Mode reject: request mana yang sedang menulis pesan penolakan
  let rejectReqId = $state<string | null>(null);
  let rejectMessage = $state('');
  let itemSearch = $state('');

  const pendingCount = $derived($archiveRequests.filter(r => r.status === 'pending').length);

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
      return new Date(iso).toLocaleString('id-ID', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    } catch { return iso; }
  }

  const statusLabel: Record<string, string> = {
    pending: 'MENUNGGU',
    approved: 'DIPUBLISH',
    rejected: 'DITOLAK',
  };

  const statusColor: Record<string, string> = {
    pending: 'bg-amber-400 text-[#1c120c]',
    approved: 'bg-emerald-600 text-white',
    rejected: 'bg-red-600 text-white',
  };
</script>

<div class="flex flex-col flex-1 min-h-0 bg-[#fdfaf0]">
  <!-- Header -->
  <div class="bg-[#1c120c] px-4 py-3 flex items-center justify-between shrink-0 border-b-4 border-[#ffd700]">
    <div class="flex items-center gap-2 min-w-0">
      <span class="text-lg leading-none shrink-0">📬</span>
      <span class="font-pixel text-[#ffd700] text-[9px] tracking-widest truncate">INBOX ARSIP</span>
      {#if pendingCount > 0}
        <span class="shrink-0 bg-[#dc2626] text-white font-pixel text-[8px] px-2 py-0.5 rounded-full border border-white/70 animate-pulse leading-none">
          {pendingCount}
        </span>
      {/if}
    </div>
    <span class="font-pixel text-stone-400 text-[7px] shrink-0">
      {$archiveRequests.length} REQUEST
    </span>
  </div>

  <!-- List -->
  <div class="flex-1 min-h-0 overflow-y-auto px-3 py-3 flex flex-col gap-3">
    {#if $archiveRequests.length === 0}
      <div class="flex-1 flex flex-col items-center justify-center gap-3 py-10 text-center">
        <span class="text-4xl opacity-40">📭</span>
        <p class="font-pixel text-[8px] text-stone-400 leading-relaxed">
          TIDAK ADA REQUEST MASUK
        </p>
        <p class="font-sans text-[10px] text-stone-400 max-w-[200px]">
          Permintaan aktivasi barang dari board publik akan tampil di sini.
        </p>
      </div>
    {:else}
      {#each $archiveRequests as req (req.id)}
        <div
          class="shrink-0 border-2 border-[#1c120c] bg-white shadow-[3px_3px_0_#1c120c] overflow-hidden"
          transition:fade={{ duration: 150 }}
        >
          <!-- Card header: status + judul -->
          <div class="px-3 pt-3 pb-2.5">
            <div class="flex items-center justify-between gap-2 mb-2">
              <span class="font-pixel text-[6.5px] px-1.5 py-0.5 border border-[#1c120c] {statusColor[req.status]}">
                {statusLabel[req.status] ?? req.status}
              </span>
              <span class="font-pixel text-[6.5px] text-stone-400 shrink-0">
                {formatDate(req.createdAt)}
              </span>
            </div>

            <button
              type="button"
              onclick={() => toggleExpand(req.id)}
              class="w-full text-left cursor-pointer group"
            >
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0 flex-1">
                  <div class="flex items-center gap-1.5 flex-wrap">
                    <span class="font-sans font-bold text-sm text-[#1c120c] truncate">
                      {req.itemTitle}
                    </span>
                    {#if req.itemCategory}
                      <span class="font-pixel text-[6px] text-[#2563eb] border border-[#2563eb]/40 bg-blue-50 px-1 py-0.5 shrink-0">
                        {req.itemCategory}
                      </span>
                    {/if}
                  </div>
                  <p class="font-sans text-[10.5px] text-stone-600 mt-1 truncate">
                    👤 <span class="font-bold text-[#1c120c]">{req.senderName}</span>
                    <span class="text-stone-300"> · </span>
                    <span class="text-emerald-700 font-semibold">WA {req.senderContact}</span>
                  </p>
                </div>
                <span class="font-pixel text-[9px] text-[#2563eb] shrink-0 mt-0.5 group-hover:translate-x-0.5 transition-transform">
                  {expandedReqId === req.id ? '▲' : '▼'}
                </span>
              </div>
            </button>
          </div>

          <!-- Detail -->
          {#if expandedReqId === req.id}
            <div
              class="border-t-2 border-dashed border-stone-300 bg-[#fffdf3] px-3 py-3 space-y-3"
              transition:fly={{ y: -6, duration: 150 }}
            >
              <!-- Meta: lokasi & perkiraan -->
              {#if req.locationHint || req.dateFrom || req.dateTo || req.senderNpm}
                <div class="grid grid-cols-[80px_1fr] gap-x-2 gap-y-2">
                  {#if req.senderNpm}
                    <span class="font-pixel text-[6.5px] text-stone-400 pt-0.5">NPM</span>
                    <span class="font-sans text-[11px] text-[#1c120c] leading-snug">{req.senderNpm}</span>
                  {/if}
                  {#if req.locationHint}
                    <span class="font-pixel text-[6.5px] text-stone-400 pt-0.5">LOKASI</span>
                    <span class="font-sans text-[11px] text-[#1c120c] leading-snug">{req.locationHint}</span>
                  {/if}
                  {#if req.dateFrom || req.dateTo}
                    <span class="font-pixel text-[6.5px] text-stone-400 pt-0.5">WAKTU</span>
                    <span class="font-sans text-[11px] text-[#1c120c] leading-snug">
                      {req.dateFrom || '?'} <span class="text-stone-400">s/d</span> {req.dateTo || '?'}
                    </span>
                  {/if}
                </div>
              {/if}

              <!-- Deskripsi -->
              <div class="rounded border-2 border-stone-200 bg-white p-2.5">
                <p class="font-pixel text-[6.5px] text-stone-400 mb-1.5">DESKRIPSI BARANG</p>
                <p class="font-sans text-[11.5px] text-[#1c120c] leading-relaxed">{req.description}</p>
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
                      class="flex-1 font-pixel text-[8px] py-2.5 bg-[#16a34a] hover:bg-[#15803d] text-white border-2 border-[#14532d] shadow-[2px_2px_0_#14532d] active:shadow-none active:translate-y-0.5 transition-all cursor-pointer disabled:opacity-50"
                    >
                      ✅ ACCEPT &amp; PUBLISH
                    </button>
                    <button
                      type="button"
                      disabled={!!processingId}
                      onclick={() => openReject(req)}
                      class="flex-1 font-pixel text-[8px] py-2.5 bg-white hover:bg-red-50 text-red-600 border-2 border-red-500 active:translate-y-0.5 transition-all cursor-pointer disabled:opacity-50"
                    >
                      ✕ TOLAK
                    </button>
                  </div>
                {/if}

                <!-- Picker: pilih barang arsip untuk di-publish -->
                {#if pickerReqId === req.id}
                  <div class="border-2 border-[#16a34a] bg-emerald-50/50 p-2.5">
                    <div class="flex items-center justify-between gap-2 mb-2">
                      <p class="font-pixel text-[7px] text-emerald-800">
                        PILIH BARANG ARSIP UNTUK DIPUBLISH
                      </p>
                      <button
                        type="button"
                        onclick={() => (pickerReqId = null)}
                        class="font-pixel text-[7px] text-stone-500 hover:text-stone-800 cursor-pointer"
                      >BATAL</button>
                    </div>

                    <input
                      type="text"
                      bind:value={itemSearch}
                      placeholder="Cari nama barang di arsip..."
                      class="w-full bg-white border-2 border-[#1c120c] px-2 py-1.5 font-sans text-[11px] outline-none focus:border-[#16a34a] mb-2"
                    />

                    {#if filteredExpired.length === 0}
                      <p class="font-sans text-[10px] text-stone-500 text-center py-3">
                        {expiredItems.length === 0
                          ? 'Tidak ada barang di arsip EXPIRED.'
                          : 'Barang tidak ditemukan di arsip.'}
                      </p>
                    {:else}
                      <div class="flex flex-col gap-2 max-h-[240px] overflow-y-auto pr-1 pb-1 inbox-scroll">
                        {#each filteredExpired as candidate (candidate.id)}
                          <div class="shrink-0 border-2 border-[#1c120c] bg-white shadow-[2px_2px_0_#1c120c] p-2 flex items-center gap-2">
                            <!-- Thumbnail foto bukti (Satpam boleh lihat) -->
                            <div class="w-12 h-12 shrink-0 border-2 border-[#1c120c] bg-[#1e293b] overflow-hidden flex items-center justify-center">
                              {#if candidate.evidencePhoto}
                                <img src={candidate.evidencePhoto} alt="Foto bukti" class="w-full h-full object-cover" />
                              {:else}
                                <span class="text-xl">{candidate.icon}</span>
                              {/if}
                            </div>
                            <div class="min-w-0 flex-1">
                              <div class="flex items-center gap-1.5 flex-wrap">
                                <span class="font-sans font-bold text-xs text-[#1c120c] truncate">{candidate.title}</span>
                                <span class="font-pixel text-[6px] text-stone-500 border border-stone-300 px-1 py-0.5">
                                  {candidate.category || 'Umum'}
                                </span>
                              </div>
                              <p class="font-sans text-[10px] text-stone-600 line-clamp-1 leading-snug">{candidate.desc}</p>
                              <p class="font-pixel text-[6.5px] text-stone-400 mt-0.5">
                                📍 {candidate.reporterName || 'Anonim'} · {candidate.date || '-'}
                              </p>
                            </div>
                            <div class="shrink-0 flex flex-col gap-1">
                              <button
                                type="button"
                                disabled={!!processingId}
                                onclick={() => handleApprove(req, candidate.id)}
                                class="font-pixel text-[7px] py-1.5 px-2 bg-[#16a34a] hover:bg-[#15803d] text-white border-2 border-[#14532d] shadow-[2px_2px_0_#14532d] active:shadow-none transition-all cursor-pointer disabled:opacity-50"
                              >
                                PUBLISH
                              </button>
                              <button
                                type="button"
                                onclick={() => { onActivateItem(candidate); }}
                                class="font-pixel text-[7px] py-1.5 px-2 bg-white hover:bg-stone-100 text-[#1c120c] border-2 border-[#1c120c] cursor-pointer"
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
                  <div class="border-2 border-red-400 bg-red-50/60 p-2.5">
                    <p class="font-pixel text-[7px] text-red-700 mb-2">PESAN UNTUK PENGIRIM (OPSIONAL)</p>
                    <textarea
                      bind:value={rejectMessage}
                      rows="3"
                      placeholder="Mis: Maaf, barang yang Anda cari belum ada di arsip kami / belum pernah dilaporkan."
                      class="w-full bg-white border-2 border-[#1c120c] px-2 py-1.5 font-sans text-[11px] outline-none focus:border-red-400 resize-none"
                    ></textarea>
                    <div class="flex gap-2 mt-2">
                      <button
                        type="button"
                        onclick={() => (rejectReqId = null)}
                        class="flex-1 font-pixel text-[7px] py-2 bg-white border-2 border-stone-300 text-stone-600 hover:bg-stone-100 cursor-pointer"
                      >BATAL</button>
                      <button
                        type="button"
                        disabled={!!processingId}
                        onclick={() => handleReject(req)}
                        class="flex-1 font-pixel text-[7px] py-2 bg-red-600 hover:bg-red-700 text-white border-2 border-red-800 cursor-pointer disabled:opacity-50"
                      >KIRIM PENOLAKAN</button>
                    </div>
                  </div>
                {/if}
              {:else if req.status === 'approved'}
                <div class="flex items-center gap-2 bg-emerald-50 border-2 border-emerald-300 p-2.5">
                  <span class="text-base leading-none shrink-0">✅</span>
                  <p class="font-sans text-[10px] text-emerald-800 font-semibold leading-relaxed">
                    Sudah dipublish ke board publik. Menunggu pengirim melakukan klaim (ZKP).
                  </p>
                </div>
              {:else if req.status === 'rejected'}
                <div class="bg-red-50 border-2 border-red-300 p-2.5">
                  <p class="font-sans text-[10px] text-red-700 font-semibold leading-relaxed">Request ditolak.</p>
                  {#if req.rejectMessage}
                    <p class="font-sans text-[10px] text-red-700 mt-1 leading-relaxed">
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