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
      class="mc-modal-box p-5 max-w-lg w-full relative flex flex-col gap-3 m-4"
      transition:fly={{ y: 30, duration: 300 }}
    >
      <h2 class="font-pixel text-lg text-yellow-300 text-center mb-1" style="text-shadow: 2px 2px 0 #000;">
        {modalTitle}
      </h2>

      <div class="claims-list flex flex-col gap-3">
        {#each sortedClaims() as claim (claim.id)}
          <div class="bg-[#fffdf7] border-4 border-[#3e2612] p-3 flex flex-col gap-2 shadow-[2px_2px_0px_rgba(0,0,0,0.2)]" transition:fly={{ x: 20, duration: 250 }}>
            <div class="flex justify-between items-center flex-wrap gap-1">
              {#if claim.status === 'pending'}
                <span class="bg-yellow-400 border-2 border-black px-2 py-0.5 text-[10px] font-bold">PENDING</span>
              {:else if claim.status === 'approved'}
                <span class="bg-green-400 border-2 border-black px-2 py-0.5 text-[10px] font-bold">APPROVED</span>
              {:else}
                <span class="bg-red-400 text-white border-2 border-black px-2 py-0.5 text-[10px] font-bold">REJECTED</span>
              {/if}
              <span
                class="border-2 border-black px-2 py-0.5 text-[10px] font-bold
                  {claim.confidence === 'Tinggi' ? 'conf-tinggi' : claim.confidence === 'Sedang' ? 'conf-sedang' : 'conf-rendah'}"
              >
                AI: {claim.confidence} ({claim.score}%)
              </span>
            </div>
            <p class="text-xs text-gray-500 font-bold">{formatDate(claim.createdAt)}</p>
            <div class="bg-gray-100 border-2 border-gray-300 p-2">
              <p class="text-sm font-bold text-gray-800">"{claim.text}"</p>
            </div>
            <div class="bg-blue-50 border-2 border-blue-300 p-2">
              <p class="text-[10px] text-blue-700 font-bold">AI Reasoning: {claim.reasoning}</p>
            </div>
            {#if claim.claimantName}
              <p class="text-[10px] text-gray-500 font-bold">{claim.claimantName} ({claim.claimantNpm || '-'})</p>
            {/if}
          </div>
        {/each}
      </div>

      <button
        onclick={closeModal}
        class="mc-btn bg-gray-500 hover:bg-gray-600 text-white font-pixel text-xs py-2.5 px-4 rounded w-full mt-1"
        style="text-shadow: 1px 1px 0 #000;"
      >
        Tutup
      </button>
    </div>
  </div>
{/if}
