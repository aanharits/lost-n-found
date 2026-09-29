<script lang="ts">
  import { fade, fly } from 'svelte/transition';
  import { onMount } from 'svelte';
  import { getSocket } from '$lib/socket.js';
  import { currentPlayer } from '$lib/stores/player.js';
  import { myArchiveRequests, type ArchiveRequest } from '$lib/stores/items.js';

  let { onClose }: { onClose: () => void } = $props();

  let activeTab = $state<'submit' | 'status'>('submit');

  // Cek status
  let lookupNpm = $state($currentPlayer?.npm || '');
  let lookupContact = $state($currentPlayer?.contact || '');
  let lookups = $state<ArchiveRequest[]>([]);
  let hasLooked = $state(false);
  let lookingUp = $state(false);

  // Form state
  let senderName = $state($currentPlayer?.name || '');
  let senderNpm = $state($currentPlayer?.npm || '');
  let senderContact = $state('');
  let itemTitle = $state('');
  let itemCategory = $state('');
  let dateFrom = $state('');
  let dateTo = $state('');
  let locationHint = $state('');
  let description = $state('');

  let submitting = $state(false);
  let submitted = $state(false);
  let errorMsg = $state('');

  const CATEGORIES = [
    '', 'Personal', 'Gadget', 'Pakaian & Aksesoris', 'Dokumen & Kartu', 'Lainnya'
  ];

  // Dengarkan kegagalan dari server; hanya tutup modal jika sukses terkonfirmasi
  onMount(() => {
    const socket = getSocket();
    if (!socket) return;

    const onSent = () => {
      submitting = false;
      submitted = true;
      setTimeout(() => onClose(), 3000);
    };
    const onError = (data: { message?: string }) => {
      submitting = false;
      submitted = false;
      errorMsg = data?.message || 'Permintaan gagal dikirim. Coba lagi.';
    };

    const unsub = myArchiveRequests.subscribe((v) => {
      lookups = v;
      if (lookingUp) {
        lookingUp = false;
        hasLooked = true;
      }
    });

    socket.on('archive_request_sent', onSent);
    socket.on('archive_request_error', onError);

    return () => {
      socket.off('archive_request_sent', onSent);
      socket.off('archive_request_error', onError);
      unsub();
    };
  });

  function handleLookup() {
    if (!lookupNpm.trim() && !lookupContact.trim()) {
      errorMsg = 'Isi NPM atau nomor WA untuk mengecek status.';
      return;
    }
    errorMsg = '';
    lookingUp = true;
    hasLooked = false;
    const socket = getSocket();
    if (!socket) {
      lookingUp = false;
      errorMsg = 'Tidak terhubung ke server.';
      return;
    }
    socket.emit('archive_requests_mine', {
      npm: lookupNpm.trim(),
      contact: lookupContact.trim(),
    });
  }

  const statusLabel: Record<string, string> = {
    pending: 'MENUNGGU DIPERIKSA',
    approved: 'DIPUBLISH KE BOARD',
    rejected: 'DITOLAK',
  };

  const statusClass: Record<string, string> = {
    pending: 'bg-amber-400 text-[#1c120c]',
    approved: 'bg-emerald-600 text-white',
    rejected: 'bg-red-600 text-white',
  };

  function formatDate(iso: string) {
    try {
      return new Date(iso).toLocaleString('id-ID', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    } catch { return iso; }
  }

  function handleSubmit() {
    if (!senderName.trim() || !senderContact.trim() || !itemTitle.trim() || !description.trim()) {
      errorMsg = 'Nama, kontak WA, nama barang, dan deskripsi wajib diisi.';
      return;
    }
    errorMsg = '';
    submitting = true;

    const socket = getSocket();
    if (!socket) {
      errorMsg = 'Tidak terhubung ke server.';
      submitting = false;
      return;
    }

    socket.emit('archive_request_submit', {
      senderName: senderName.trim(),
      senderNpm: senderNpm.trim(),
      senderContact: senderContact.trim(),
      itemTitle: itemTitle.trim(),
      itemCategory: itemCategory.trim(),
      dateFrom: dateFrom.trim(),
      dateTo: dateTo.trim(),
      locationHint: locationHint.trim(),
      description: description.trim(),
    });

    // Sukses/gagal ditentukan oleh ack server (archive_request_sent / archive_request_error)
  }
</script>

<!-- Backdrop -->
<div
  class="fixed inset-0 z-50 flex items-center justify-center p-3"
  transition:fade={{ duration: 150 }}
  role="dialog"
  aria-modal="true"
  aria-label="Form permintaan arsip satpam"
>
  <button
    type="button"
    class="absolute inset-0 bg-black/60"
    onclick={onClose}
    aria-label="Tutup modal"
  ></button>

  <!-- Modal -->
  <div
    class="relative w-full max-w-md bg-white border-4 border-[#1c120c] shadow-[8px_8px_0_#1c120c] flex flex-col z-10 max-h-[90vh] overflow-y-auto"
    transition:fly={{ y: 20, duration: 200 }}
  >
    <!-- Header -->
    <div class="bg-[#1c120c] px-4 py-2.5 flex items-center justify-between shrink-0">
      <div class="flex items-center gap-2">
        <span class="font-pixel text-[#ffd700] text-[10px] tracking-widest">📬 MINTA AKTIFKAN DARI ARSIP</span>
      </div>
      <button
        type="button"
        onclick={onClose}
        class="text-white hover:text-[#ffd700] font-pixel text-[10px] transition-colors"
        aria-label="Tutup"
      >✕</button>
    </div>

    <!-- Tab bar -->
    <div class="flex border-b-2 border-[#1c120c] shrink-0">
      <button
        type="button"
        onclick={() => (activeTab = 'submit')}
        class="flex-1 font-pixel text-[8px] py-2.5 cursor-pointer transition-colors
          {activeTab === 'submit' ? 'bg-[#ffd700] text-[#1c120c]' : 'bg-white text-stone-500 hover:bg-stone-100'}"
      >
        📬 AJUKAN PERMINTAAN
      </button>
      <button
        type="button"
        onclick={() => (activeTab = 'status')}
        class="flex-1 font-pixel text-[8px] py-2.5 cursor-pointer transition-colors border-l-2 border-[#1c120c]
          {activeTab === 'status' ? 'bg-[#ffd700] text-[#1c120c]' : 'bg-white text-stone-500 hover:bg-stone-100'}"
      >
        🔎 CEK STATUS
      </button>
    </div>

    {#if activeTab === 'status'}
      <!-- ===== CEK STATUS ===== -->
      <div class="p-4 flex flex-col gap-3">
        <div class="bg-[#fefce8] border-2 border-[#1c120c] px-3 py-2.5">
          <p class="font-pixel text-[7px] text-[#92400e] leading-relaxed">
            Masukkan NPM atau nomor WA yang kamu pakai saat mengirim permintaan untuk melihat statusnya.
          </p>
        </div>

        <div class="flex flex-col gap-1">
          <label for="lookup-npm" class="font-pixel text-[7px] text-[#1c120c] font-bold">NPM</label>
          <input id="lookup-npm" type="text" bind:value={lookupNpm} placeholder="NPM kamu"
            class="border-2 border-[#1c120c] px-2 py-1.5 font-sans text-xs text-[#1c120c] outline-none focus:border-[#2563eb]" />
        </div>
        <div class="flex flex-col gap-1">
          <label for="lookup-contact" class="font-pixel text-[7px] text-[#1c120c] font-bold">ATAU NOMOR WHATSAPP</label>
          <input id="lookup-contact" type="text" bind:value={lookupContact} placeholder="08xxxxxxxxxx"
            class="border-2 border-[#1c120c] px-2 py-1.5 font-sans text-xs text-[#1c120c] outline-none focus:border-[#2563eb]" />
        </div>

        <button type="button" onclick={handleLookup} disabled={lookingUp}
          class="font-pixel text-[8px] py-2.5 px-3 border-2 border-[#1c120c] bg-[#2563eb] hover:bg-[#1d4ed8] text-white shadow-[2px_2px_0_#1c120c] active:shadow-none active:translate-y-0.5 transition-all cursor-pointer disabled:opacity-50 font-bold"
        >
          {lookingUp ? 'MENCARI...' : '🔎 CEK STATUS PERMINTAAN'}
        </button>

        {#if hasLooked}
          {#if lookups.length === 0}
            <div class="bg-stone-50 border-2 border-stone-300 px-3 py-4 text-center">
              <p class="font-pixel text-[7.5px] text-stone-500 leading-relaxed">
                Tidak ada permintaan yang cocok dengan NPM / nomor WA tersebut.
              </p>
            </div>
          {:else}
            <div class="flex flex-col gap-2">
              {#each lookups as req (req.id)}
                <div class="border-2 border-[#1c120c] bg-white shadow-[2px_2px_0_#1c120c] p-2.5">
                  <div class="flex items-center justify-between gap-2 mb-1.5">
                    <span class="font-pixel text-[6.5px] px-1.5 py-0.5 border border-[#1c120c] {statusClass[req.status]}">
                      {statusLabel[req.status] ?? req.status}
                    </span>
                    <span class="font-pixel text-[6.5px] text-stone-400 shrink-0">{formatDate(req.createdAt)}</span>
                  </div>
                  <p class="font-sans font-bold text-sm text-[#1c120c] truncate">"{req.itemTitle}"</p>
                  {#if req.status === 'rejected' && req.rejectMessage}
                    <div class="mt-2 bg-red-50 border border-red-300 p-2">
                      <p class="font-pixel text-[6.5px] text-red-600 mb-0.5">PESAN SATPAM:</p>
                      <p class="font-sans text-[10.5px] text-red-700 leading-relaxed">{req.rejectMessage}</p>
                    </div>
                  {:else if req.status === 'approved'}
                    <p class="font-sans text-[10.5px] text-emerald-700 leading-relaxed mt-1.5">
                      ✅ Barang sudah dipublish ke board publik. Silakan buka board dan ajukan klaim (ZKP) jika itu milikmu.
                    </p>
                  {:else}
                    <p class="font-sans text-[10.5px] text-stone-600 leading-relaxed mt-1.5">
                      ⏳ Permintaanmu sedang diperiksa Satpam. Satpam akan menghubungi WA kamu.
                    </p>
                  {/if}
                </div>
              {/each}
            </div>
          {/if}
        {/if}
      </div>
    {:else if submitted}
      <!-- Success state -->
      <div class="flex flex-col items-center justify-center p-8 gap-4" transition:fade>
        <span class="text-5xl">✅</span>
        <p class="font-pixel text-[9px] text-[#16a34a] text-center leading-relaxed">
          PERMINTAAN TERKIRIM KE SATPAM!<br/>
          Satpam akan menghubungi WA kamu segera.
        </p>
      </div>
    {:else}
      <!-- Form -->
      <div class="p-4 flex flex-col gap-3">
        <!-- Identitas -->
        <div class="grid grid-cols-2 gap-2">
          <div class="flex flex-col gap-1">
            <label for="arch-sender-name" class="font-pixel text-[7px] text-[#1c120c] font-bold">NAMA *</label>
            <input
              id="arch-sender-name"
              type="text"
              bind:value={senderName}
              placeholder="Nama kamu"
              class="border-2 border-[#1c120c] px-2 py-1.5 font-sans text-xs text-[#1c120c] outline-none focus:border-[#2563eb]"
            />
          </div>
          <div class="flex flex-col gap-1">
            <label for="arch-sender-npm" class="font-pixel text-[7px] text-[#1c120c] font-bold">NPM</label>
            <input
              id="arch-sender-npm"
              type="text"
              bind:value={senderNpm}
              placeholder="NPM (opsional)"
              class="border-2 border-[#1c120c] px-2 py-1.5 font-sans text-xs text-[#1c120c] outline-none focus:border-[#2563eb]"
            />
          </div>
        </div>

        <div class="flex flex-col gap-1">
          <label for="arch-contact" class="font-pixel text-[7px] text-[#1c120c] font-bold">KONTAK WHATSAPP *</label>
          <input
            id="arch-contact"
            type="text"
            bind:value={senderContact}
            placeholder="08xxxxxxxxxx"
            class="border-2 border-[#1c120c] px-2 py-1.5 font-sans text-xs text-[#1c120c] outline-none focus:border-[#2563eb]"
          />
        </div>

        <hr class="border-dashed border-[#1c120c]" />

        <!-- Info barang -->
        <div class="grid grid-cols-2 gap-2">
          <div class="flex flex-col gap-1">
            <label for="arch-item-title" class="font-pixel text-[7px] text-[#1c120c] font-bold">NAMA BARANG *</label>
            <input
              id="arch-item-title"
              type="text"
              bind:value={itemTitle}
              placeholder="Mis: dompet, hp, kunci"
              class="border-2 border-[#1c120c] px-2 py-1.5 font-sans text-xs text-[#1c120c] outline-none focus:border-[#2563eb]"
            />
          </div>
          <div class="flex flex-col gap-1">
            <label for="arch-category" class="font-pixel text-[7px] text-[#1c120c] font-bold">KATEGORI</label>
            <select
              id="arch-category"
              bind:value={itemCategory}
              class="border-2 border-[#1c120c] px-2 py-1.5 font-sans text-xs text-[#1c120c] outline-none focus:border-[#2563eb] bg-white"
            >
              {#each CATEGORIES as cat}
                <option value={cat}>{cat || '— Pilih —'}</option>
              {/each}
            </select>
          </div>
        </div>

        <div class="flex flex-col gap-1">
          <label for="arch-date-from" class="font-pixel text-[7px] text-[#1c120c] font-bold">KIRA-KIRA KAPAN HILANG</label>
          <div class="flex items-center gap-2">
            <input
              id="arch-date-from"
              type="date"
              bind:value={dateFrom}
              class="flex-1 border-2 border-[#1c120c] px-2 py-1.5 font-sans text-xs text-[#1c120c] outline-none focus:border-[#2563eb]"
            />
            <span class="font-pixel text-[7px]">s/d</span>
            <input
              type="date"
              bind:value={dateTo}
              class="flex-1 border-2 border-[#1c120c] px-2 py-1.5 font-sans text-xs text-[#1c120c] outline-none focus:border-[#2563eb]"
            />
          </div>
        </div>

        <div class="flex flex-col gap-1">
          <label for="arch-location" class="font-pixel text-[7px] text-[#1c120c] font-bold">LOKASI HILANG</label>
          <input
            id="arch-location"
            type="text"
            bind:value={locationHint}
            placeholder="Mis: kantin FT, lab komputer"
            class="border-2 border-[#1c120c] px-2 py-1.5 font-sans text-xs text-[#1c120c] outline-none focus:border-[#2563eb]"
          />
        </div>

        <div class="flex flex-col gap-1">
          <label for="arch-description" class="font-pixel text-[7px] text-[#1c120c] font-bold">DESKRIPSI SINGKAT *</label>
          <textarea
            id="arch-description"
            bind:value={description}
            placeholder="Ceritakan ciri umum barang (warna, bentuk, merk). JANGAN tulis ciri rahasia — itu nanti dipakai saat klaim ZKP."
            rows="3"
            class="border-2 border-[#1c120c] px-2 py-1.5 font-sans text-xs text-[#1c120c] outline-none focus:border-[#2563eb] resize-none"
          ></textarea>
          <p class="font-pixel text-[6px] text-stone-400">⚠️ Ciri rahasia khusus dipakai saat klaim ZKP di board, bukan di sini.</p>
        </div>

        {#if errorMsg}
          <div class="bg-red-50 border-2 border-red-400 px-3 py-2">
            <p class="font-pixel text-[7px] text-red-600">{errorMsg}</p>
          </div>
        {/if}

        <!-- Actions -->
        <div class="flex gap-2 mt-1">
          <button
            type="button"
            onclick={onClose}
            class="flex-1 font-pixel text-[8px] py-2 px-3 border-2 border-[#1c120c] bg-white hover:bg-stone-100 text-[#1c120c] shadow-[2px_2px_0_#1c120c] active:shadow-none active:translate-y-0.5 transition-all cursor-pointer"
          >BATAL</button>
          <button
            type="button"
            onclick={handleSubmit}
            disabled={submitting}
            class="flex-1 font-pixel text-[8px] py-2 px-3 border-2 border-[#1c120c] bg-[#ffd700] hover:bg-[#facc15] text-[#1c120c] shadow-[2px_2px_0_#1c120c] active:shadow-none active:translate-y-0.5 transition-all cursor-pointer disabled:opacity-50 font-bold"
          >
            {submitting ? 'MENGIRIM...' : '📬 KIRIM KE SATPAM'}
          </button>
        </div>
      </div>
    {/if}
  </div>
</div>
