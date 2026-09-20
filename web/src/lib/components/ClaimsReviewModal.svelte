<script lang="ts">
  import { activeModal, reviewTargetItemId } from '$lib/stores/ui.js';
  import { items } from '$lib/stores/items.js';
  import { fade, fly } from 'svelte/transition';

  // Mencari data barang yang sedang ditinjau riwayat klaimnya
  let targetItem = $derived(
    $items.find((i) => i.id === $reviewTargetItemId) || null
  );

  // Judul modal berdasarkan status jenis barang
  let modalTitle = $derived(
    targetItem
      ? `RIWAYAT KLAIM: ${targetItem.title} (${targetItem.type === 'found' ? 'KETEMU' : 'HILANG'})`
      : 'RIWAYAT KLAIM'
  );

  // Mengurutkan klaim dengan memprioritaskan status pending lalu tanggal terbaru
  let sortedClaims = $derived(() => {
    if (!targetItem?.claims) return [];
    return [...targetItem.claims].sort((a, b) => {
      if (a.status === 'pending' && b.status !== 'pending') return -1;
      if (a.status !== 'pending' && b.status === 'pending') return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  });

  // Menutup modal peninjauan klaim
  function closeModal() {
    activeModal.set('none');
    reviewTargetItemId.set(null);
  }

  // Format tanggal ISO ke format waktu lokal Indonesia
  function formatDate(iso: string): string {
    const d = new Date(iso);
    return `${d.toLocaleDateString('id-ID')} ${d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`;
  }
</script>

{#if targetItem}
  <div class="modal-overlay" transition:fade={{ duration: 200 }}>
    <div
      class="mc-modal-box p-5 max-w-lg w-full relative flex flex-col gap-3 m-4 select-none"
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

      <!-- Inset Claims List Panel -->
      <div class="bg-[#9e6435] border-[3px] border-[#2c1b0f] shadow-[inset_2px_2px_0px_rgba(0,0,0,0.25)] rounded-lg p-3 flex flex-col gap-2.5 max-h-[360px] overflow-y-auto">
        {#each sortedClaims() as claim (claim.id)}
          <div class="bg-[#fefce8] border-2 border-[#2c1b0f] p-3 flex flex-col gap-2 shadow-[2px_2px_0px_#140b05] rounded" transition:fly={{ x: 20, duration: 250 }}>
            <div class="flex justify-between items-center flex-wrap gap-1">
              {#if claim.status === 'pending'}
                <span class="bg-[#f59e0b] text-[#2c1b0f] border-2 border-[#140b05] px-2 py-0.5 text-[8px] font-pixel font-bold rounded">
                  PENDING
                </span>
              {:else if claim.status === 'approved'}
                <span class="bg-[#16a34a] text-yellow-300 border-2 border-[#140b05] px-2 py-0.5 text-[8px] font-pixel font-bold rounded">
                  APPROVED
                </span>
              {:else}
                <span class="bg-[#dc2626] text-white border-2 border-[#140b05] px-2 py-0.5 text-[8px] font-pixel font-bold rounded">
                  REJECTED
                </span>
              {/if}
              <span
                class="border-2 border-[#140b05] px-2 py-0.5 text-[8px] font-pixel font-bold rounded bg-[#0284c7] text-white"
              >
                AI: {claim.confidence} ({claim.score}%)
              </span>
            </div>
            <p class="text-[10px] text-[#78350f] font-bold">{formatDate(claim.createdAt)}</p>
            <div class="bg-white border-2 border-[#2c1b0f] p-2 rounded">
              <p class="text-xs font-bold text-stone-900">"{claim.text}"</p>
            </div>
            <div class="bg-[#fef9c3] border-2 border-[#b87d46] p-2 rounded">
              <p class="text-[10px] text-[#78350f] font-bold">AI Reasoning: {claim.reasoning}</p>
            </div>
            {#if claim.claimantName}
              <p class="text-[10px] text-[#2c1b0f] font-bold">{claim.claimantName} ({claim.claimantNpm || '-'})</p>
            {/if}
          </div>
        {/each}
      </div>

      <button
        onclick={closeModal}
        type="button"
        class="bg-[#24170e] hover:bg-[#382315] active:translate-y-0.5 text-yellow-300 font-pixel text-[10px] py-2.5 px-4 rounded w-full border-2 border-[#140b05] shadow-[2px_2px_0px_#140b05] transition-all cursor-pointer text-center mt-1"
      >
        TUTUP
      </button>
    </div>
  </div>
{/if}
