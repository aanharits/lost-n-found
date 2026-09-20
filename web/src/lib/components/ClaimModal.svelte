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
  <div class="modal-overlay" transition:fade={{ duration: 200 }}>
    <div
      class="mc-modal-box p-6 max-w-md w-full relative flex flex-col gap-3 m-4"
      transition:fly={{ y: 30, duration: 300 }}
    >
      <h2 class="font-pixel text-lg text-yellow-300 text-center mb-1" style="text-shadow: 2px 2px 0 #000;">
        {modalTitle}
      </h2>

      <div class="flex flex-col gap-1">
        <label for="claim-desc" class="mc-form-label">
          Ceritain barang yang kamu pegang/lihat
        </label>
        <textarea
          id="claim-desc"
          bind:value={claimText}
          rows="4"
          disabled={finished}
          class="mc-input font-sans font-bold resize-none"
          {placeholder}
        ></textarea>
      </div>

      {#if errorMsg}
        <div
          class="border-4 p-3 text-xs font-sans font-bold text-center {errorClass}"
          transition:fly={{ y: -10, duration: 300 }}
        >
          {@html errorMsg}
          {#if waLink}
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              class="mc-btn bg-green-500 hover:bg-green-600 text-white font-pixel text-[10px] py-2 px-4 rounded block text-center mt-2"
              style="text-decoration:none; text-shadow: 1px 1px 0 #000;"
            >
              Chat via WhatsApp
            </a>
          {/if}
        </div>
      {/if}

      {#if loading}
        <div
          class="text-yellow-300 font-pixel text-[10px] text-center animate-pulse"
          style="text-shadow: 1px 1px 0 #000;"
          transition:fade={{ duration: 200 }}
        >
          AI Memverifikasi Klaim...
        </div>
      {/if}

      <div class="flex gap-2 mt-1">
        {#if finished}
          <button
            onclick={closeModal}
            class="mc-btn bg-gray-500 hover:bg-gray-600 text-white font-pixel text-xs py-2.5 px-4 rounded w-full"
            style="text-shadow: 1px 1px 0 #000;"
          >
            Tutup
          </button>
        {:else}
          <button
            onclick={closeModal}
            class="mc-btn bg-red-500 hover:bg-red-600 text-white font-pixel text-xs py-2.5 px-4 rounded w-1/2"
            style="text-shadow: 1px 1px 0 #000;"
          >
            Batal
          </button>
          <button
            onclick={submitClaim}
            disabled={loading}
            class="mc-btn bg-green-500 hover:bg-green-600 text-white font-pixel text-xs py-2.5 px-4 rounded w-1/2"
            style="text-shadow: 1px 1px 0 #000;"
          >
            {submitLabel}
          </button>
        {/if}
      </div>
    </div>
  </div>
{/if}
