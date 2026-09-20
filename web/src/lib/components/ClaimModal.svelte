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
      class="mc-modal-box p-5 max-w-md w-full relative flex flex-col gap-3 m-4 select-none"
      transition:fly={{ y: 30, duration: 300 }}
    >
      <!-- Pixel Corner Screws / Baut Sudut 8-Bit Solid -->
      <div class="absolute top-2.5 left-2.5 w-2.5 h-2.5 bg-[#3d2311] border border-[#d89f6b]"></div>
      <div class="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-[#3d2311] border border-[#d89f6b]"></div>
      <div class="absolute bottom-2.5 left-2.5 w-2.5 h-2.5 bg-[#3d2311] border border-[#d89f6b]"></div>
      <div class="absolute bottom-2.5 right-2.5 w-2.5 h-2.5 bg-[#3d2311] border border-[#d89f6b]"></div>

      <div class="text-center pb-2 border-b-3 border-[#2c1b0f]/30">
        <h2 class="font-pixel text-base md:text-lg text-yellow-300 tracking-wide" style="text-shadow: 2px 2px 0 #2c1b0f, 3px 3px 0 rgba(0,0,0,0.5);">
          {modalTitle}
        </h2>
      </div>

      <!-- Panel Form Inset -->
      <div class="bg-[#9e6435] border-[3px] border-[#2c1b0f] shadow-[inset_2px_2px_0px_rgba(0,0,0,0.25)] rounded-lg p-3.5 flex flex-col gap-2.5">
        <div class="flex flex-col gap-1">
          <label for="claim-desc" class="mc-form-label">
            CERITAIN CIRI KHAS BARANG YANG KAMU KETAHUI
          </label>
          <textarea
            id="claim-desc"
            bind:value={claimText}
            rows="4"
            disabled={finished}
            class="mc-input font-sans text-xs font-bold resize-none placeholder-stone-400"
            {placeholder}
          ></textarea>
        </div>

        {#if errorMsg}
          <div
            class="border-2 border-[#2c1b0f] p-2.5 text-xs font-sans font-bold text-center rounded shadow-[2px_2px_0px_#2c1b0f] {errorClass}"
            transition:fly={{ y: -5, duration: 150 }}
          >
            {@html errorMsg}
            {#if waLink}
              <a
                href={waLink}
                target="_blank"
                rel="noopener noreferrer"
                class="bg-[#16a34a] hover:bg-[#15803d] active:translate-y-0.5 text-yellow-300 font-pixel text-[9px] py-2 px-3 rounded block text-center mt-2 border-2 border-[#140b05] shadow-[2px_2px_0px_#140b05] transition-all"
                style="text-decoration:none; text-shadow: 1px 1px 0 #000;"
              >
                CHAT VIA WHATSAPP
              </a>
            {/if}
          </div>
        {/if}

        {#if loading}
          <div
            class="text-yellow-300 font-pixel text-[9px] text-center animate-pulse py-1"
            style="text-shadow: 1px 1px 0 #000;"
            transition:fade={{ duration: 150 }}
          >
            AI Sedang Memverifikasi Klaim...
          </div>
        {/if}
      </div>

      <div class="flex gap-2.5 mt-1">
        {#if finished}
          <button
            onclick={closeModal}
            type="button"
            class="bg-[#24170e] hover:bg-[#382315] active:translate-y-0.5 text-yellow-300 font-pixel text-[10px] py-2.5 px-4 rounded w-full border-2 border-[#140b05] shadow-[2px_2px_0px_#140b05] transition-all cursor-pointer text-center"
          >
            TUTUP
          </button>
        {:else}
          <button
            onclick={closeModal}
            type="button"
            class="bg-[#24170e] hover:bg-[#382315] active:translate-y-0.5 text-yellow-300 font-pixel text-[10px] py-2.5 px-4 rounded w-1/2 border-2 border-[#140b05] shadow-[2px_2px_0px_#140b05] transition-all cursor-pointer text-center"
          >
            BATAL
          </button>
          <button
            onclick={submitClaim}
            disabled={loading}
            type="button"
            class="bg-[#16a34a] hover:bg-[#15803d] active:translate-y-0.5 text-yellow-300 font-pixel text-[10px] py-2.5 px-4 rounded w-1/2 border-2 border-[#140b05] shadow-[2px_2px_0px_#140b05] transition-all cursor-pointer text-center"
            style="text-shadow: 1px 1px 0 #000;"
          >
            {submitLabel}
          </button>
        {/if}
      </div>
    </div>
  </div>
{/if}
