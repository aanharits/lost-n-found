<script lang="ts">
  import { activeModal, claimTargetItemId, claimAttemptCount } from '$lib/stores/ui.js';
  import { items } from '$lib/stores/items.js';
  import { currentPlayer } from '$lib/stores/player.js';
  import { getSocket } from '$lib/socket.js';
  import { fade, fly } from 'svelte/transition';

  let claimText = $state('');
  let errorMsg = $state('');
  let errorClass = $state('bg-red-200 border-red-600 text-red-800');
  let loading = $state(false);
  let finished = $state(false);
  let placeholder = $state('Warna, ciri khas, kondisi, tanda khusus, dll...');
  let submitLabel = $state('Kirim Klaim');
  let waLink = $state('');

  // Mencari data barang yang sedang menjadi target klaim
  let targetItem = $derived(
    $items.find((i) => i.id === $claimTargetItemId) || null
  );

  // Judul modal berdasarkan status jenis barang
  let modalTitle = $derived(
    targetItem
      ? `KLAIM: ${targetItem.title} (${targetItem.type === 'found' ? 'KETEMU' : 'HILANG'})`
      : 'KLAIM BARANG'
  );

  // Menutup modal dan reset seluruh form klaim
  function closeModal() {
    activeModal.set('none');
    claimTargetItemId.set(null);
    claimAttemptCount.set(0);
    claimText = '';
    errorMsg = '';
    loading = false;
    finished = false;
    submitLabel = 'Kirim Klaim';
    waLink = '';
  }

  // Mengirim deskripsi klaim ke server untuk diverifikasi secara otomatis oleh AI
  async function submitClaim() {
    if (!targetItem) return;
    if (!claimText.trim()) {
      errorMsg = 'Ceritain dulu ciri-ciri barangnya!';
      errorClass = 'bg-red-200 border-red-600 text-red-800';
      return;
    }

    errorMsg = '';
    loading = true;
    claimAttemptCount.update((n) => n + 1);
    const attemptNum = $claimAttemptCount;

    const socket = getSocket();
    if (!socket?.connected) {
      errorMsg = 'Socket tidak terhubung!';
      errorClass = 'bg-red-200 border-red-600 text-red-800';
      loading = false;
      return;
    }

    const player = $currentPlayer;

    // Kirim data klaim ke server untuk diverifikasi dengan detail rahasia
    socket.emit('claim_submit', {
      itemId: targetItem.id,
      claimText: claimText.trim(),
      claimantName: player?.name || '',
      claimantNpm: player?.npm || '',
      claimantContact: player?.contact || '',
      attemptNumber: attemptNum,
    });

    // Menunggu hasil verifikasi claim_updated dari backend
    const result = await new Promise<any>((resolve) => {
      const timeout = setTimeout(() => {
        resolve(null);
      }, 15000);

      const handler = (data: any) => {
        if (data.itemId === targetItem!.id) {
          clearTimeout(timeout);
          socket.off('claim_updated', handler);
          resolve(data);
        }
      };
      socket.on('claim_updated', handler);
    });

    loading = false;

    if (!result) {
      errorMsg = 'Timeout - gagal mendapat respons dari server.';
      errorClass = 'bg-red-200 border-red-600 text-red-800';
      return;
    }

    const claim = result.claim;

    // Tampilkan hasil evaluasi verifikasi klaim tanpa emotikon
    if (claim.status === 'approved') {
      errorClass = 'bg-green-200 border-green-600 text-green-800';
      const contact = (result.reporterContact || '').replace(/[^0-9]/g, '');
      waLink = contact ? `https://wa.me/${contact}` : '';
      errorMsg = `Disetujui Satpam AI - ${claim.reasoning}`;
      finished = true;
      claimText = '';
    } else if (claim.status === 'pending') {
      errorClass = 'bg-yellow-200 border-yellow-600 text-yellow-800';
      errorMsg = `Satpam AI: ${claim.reasoning} - Sebutkan ciri khas khusus lain yang hanya kamu ketahui (kesempatan terakhir).`;
      claimText = '';
      placeholder = 'Sebutkan tanda pengenal khusus yang hanya kamu ketahui...';
      submitLabel = 'Kirim Ciri Tambahan (Terakhir)';
    } else {
      errorClass = 'bg-red-200 border-red-600 text-red-800';
      errorMsg = `Ditolak Satpam AI - ${claim.reasoning}`;
      finished = true;
    }
  }
</script>

{#if targetItem}
  <div class="modal-overlay backdrop-blur-xs" transition:fade={{ duration: 150 }}>
    <div
      class="relative max-w-md w-full m-4 border-4 border-[#1c120c] shadow-[inset_0_2px_0_rgba(255,255,255,0.25),inset_0_-4px_0_rgba(0,0,0,0.25),6px_6px_0px_#0a060f] rounded-lg p-5 select-none flex flex-col gap-3.5"
      style="background: #ba804e linear-gradient(180deg, #c48956 0%, #b07746 100%);"
      transition:fly={{ y: 20, duration: 250 }}
    >
      <!-- Header Modal: Modern Minimalist Nintendo Title Bar -->
      <div class="flex items-center justify-between pb-3 border-b-2 border-[#1c120c]/40">
        <h2
          class="font-pixel text-xs md:text-sm text-white tracking-wider font-bold"
          style="text-shadow: 2px 2px 0 #1c120c;"
        >
          KLAIM KEPEMILIKAN
        </h2>
        <button
          onclick={closeModal}
          class="text-[#1c120c] hover:text-red-600 font-pixel text-xs px-2 py-0.5 rounded bg-white hover:bg-red-100 border-2 border-[#1c120c] transition-colors cursor-pointer font-bold shadow-[2px_2px_0_#1c120c] active:translate-y-0.5"
          type="button"
          aria-label="Tutup"
        >
          ✕
        </button>
      </div>

      <!-- Info Singkat Barang Target -->
      <div class="bg-[#fef9c3] border-2 border-[#1c120c] rounded p-3 flex items-center gap-3 shadow-[1px_1px_0px_#1c120c]">
        <div class="w-10 h-10 rounded bg-white border-2 border-[#1c120c] flex items-center justify-center text-xl shrink-0">
          {targetItem.icon}
        </div>
        <div class="flex flex-col min-w-0">
          <div class="flex items-center gap-2">
            <span class="font-pixel text-[10px] text-[#1c120c] font-bold truncate">
              {targetItem.title}
            </span>
            <span class="font-pixel text-[7px] px-1.5 py-0.5 rounded border border-[#1c120c] font-bold {targetItem.type === 'found' ? 'bg-[#16a34a] text-white' : 'bg-[#dc2626] text-white'}">
              {targetItem.type === 'found' ? 'KETEMU' : 'HILANG'}
            </span>
          </div>
          <p class="font-sans text-[11px] text-stone-700 font-bold truncate mt-0.5">
            Lokasi: {targetItem.desc}
          </p>
        </div>
      </div>

      <!-- Panel Form Klaim -->
      <div class="bg-[#fefce8] border-2 border-[#1c120c] shadow-[inset_0_2px_4px_rgba(0,0,0,0.06)] rounded p-3.5 md:p-4 flex flex-col gap-3">
        <div class="flex flex-col gap-1.5">
          <label for="claim-desc" class="font-pixel text-[8px] md:text-[9px] text-[#1c120c] font-bold flex items-center justify-between">
            <span>BUKTI CIRI KHAS BARANG</span>
            <span class="text-red-600 font-sans text-xs font-black">*</span>
          </label>
          <textarea
            id="claim-desc"
            bind:value={claimText}
            rows="3"
            disabled={finished}
            class="bg-white border-2 border-[#1c120c] focus:border-[#2563eb] text-[#1c120c] rounded py-2 px-3 font-sans text-xs md:text-sm font-bold resize-none placeholder-stone-400 shadow-[inset_1px_1px_0_rgba(0,0,0,0.1)] outline-none transition-all disabled:opacity-60"
            {placeholder}
          ></textarea>
        </div>

        <!-- Notifikasi Respon AI Satpam -->
        {#if errorMsg}
          <div
            class="p-2.5 rounded text-xs font-sans font-bold text-center border-2 {errorClass}"
            transition:fly={{ y: -5, duration: 150 }}
          >
            {@html errorMsg}
            {#if waLink}
              <a
                href={waLink}
                target="_blank"
                rel="noopener noreferrer"
                class="bg-[#16a34a] hover:bg-[#15803d] active:translate-y-0.5 text-white font-pixel text-[8px] md:text-[9px] py-2 px-3 rounded block text-center mt-2.5 border-2 border-[#1c120c] shadow-[2px_2px_0_#1c120c] transition-all font-bold"
                style="text-decoration:none;"
              >
                LANJUT CHAT WHATSAPP
              </a>
            {/if}
          </div>
        {/if}

        <!-- Status Loading AI Verifikasi -->
        {#if loading}
          <div
            class="text-[#2563eb] font-pixel text-[8px] md:text-[9px] text-center animate-pulse py-1 flex items-center justify-center gap-1.5 font-bold"
            transition:fade={{ duration: 150 }}
          >
            <span class="w-2 h-2 rounded-full bg-[#2563eb] animate-ping"></span>
            AI SEDANG MEMVERIFIKASI CIRI KHAS...
          </div>
        {/if}
      </div>

      <!-- Tombol Aksi Bawah Minimalis Modern Nintendo -->
      <div class="flex gap-2.5 mt-1">
        {#if finished}
          <button
            onclick={closeModal}
            type="button"
            class="bg-[#ffd700] hover:bg-[#fbbf24] active:translate-y-0.5 text-[#1c120c] font-pixel text-[9px] md:text-[10px] py-2.5 px-4 rounded w-full border-2 border-[#1c120c] shadow-[2px_2px_0_#1c120c] active:shadow-none transition-all cursor-pointer text-center font-bold tracking-wider uppercase"
          >
            SELESAI
          </button>
        {:else}
          <button
            onclick={closeModal}
            type="button"
            class="bg-white hover:bg-slate-100 active:translate-y-0.5 text-[#1c120c] font-pixel text-[9px] md:text-[10px] py-2.5 px-4 rounded w-1/2 border-2 border-[#1c120c] shadow-[2px_2px_0_#1c120c] active:shadow-none transition-all cursor-pointer text-center font-bold"
          >
            BATAL
          </button>
          <button
            onclick={submitClaim}
            disabled={loading}
            type="button"
            class="bg-[#ffd700] hover:bg-[#fbbf24] active:translate-y-0.5 text-[#1c120c] font-pixel text-[9px] md:text-[10px] py-2.5 px-4 rounded w-1/2 border-2 border-[#1c120c] shadow-[2px_2px_0_#1c120c] active:shadow-none transition-all cursor-pointer text-center font-bold tracking-wider uppercase"
          >
            {submitLabel}
          </button>
        {/if}
      </div>
    </div>
  </div>
{/if}
