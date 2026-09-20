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
  <div class="modal-overlay backdrop-blur-xs" transition:fade={{ duration: 150 }}>
    <div
      class="relative max-w-lg w-full m-4 border-4 border-[#1c120c] shadow-[inset_0_2px_0_rgba(255,255,255,0.25),inset_0_-4px_0_rgba(0,0,0,0.25),6px_6px_0px_#0a060f] rounded-lg p-5 select-none flex flex-col gap-3.5"
      style="background: #ba804e linear-gradient(180deg, #c48956 0%, #b07746 100%);"
      transition:fly={{ y: 20, duration: 250 }}
    >
      <!-- Header Modal: Modern Minimalist Nintendo Title Bar -->
      <div class="flex items-center justify-between pb-3 border-b-2 border-[#1c120c]/40">
        <h2
          class="font-pixel text-xs md:text-sm text-white tracking-wider font-bold"
          style="text-shadow: 2px 2px 0 #1c120c;"
        >
          RIWAYAT KLAIM BARANG
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
            Total {targetItem.claims?.length || 0} Pengajuan Klaim
          </p>
        </div>
      </div>

      <!-- Inset Claims List Panel -->
      <div class="bg-[#fefce8] border-2 border-[#1c120c] shadow-[inset_0_2px_4px_rgba(0,0,0,0.06)] rounded p-3 flex flex-col gap-2.5 max-h-[340px] overflow-y-auto">
        {#if (targetItem.claims || []).length === 0}
          <div class="text-stone-600 font-pixel text-[8px] text-center p-6 border-2 border-dashed border-[#1c120c] rounded bg-white">
            Belum ada pengajuan klaim untuk barang ini.
          </div>
        {:else}
          {#each sortedClaims() as claim (claim.id)}
            <div class="bg-white border-2 border-[#1c120c] p-3 flex flex-col gap-2 shadow-[2px_2px_0px_#1c120c] rounded" transition:fly={{ x: 20, duration: 250 }}>
              <div class="flex justify-between items-center flex-wrap gap-1.5">
                <div class="flex items-center gap-1.5">
                  {#if claim.status === 'pending'}
                    <span class="bg-[#f59e0b] text-[#1c120c] px-2 py-0.5 text-[7px] font-pixel font-bold rounded border border-[#1c120c]">
                      PENDING
                    </span>
                  {:else if claim.status === 'approved'}
                    <span class="bg-[#16a34a] text-white px-2 py-0.5 text-[7px] font-pixel font-bold rounded border border-[#1c120c]">
                      DISETUJUI
                    </span>
                  {:else}
                    <span class="bg-[#dc2626] text-white px-2 py-0.5 text-[7px] font-pixel font-bold rounded border border-[#1c120c]">
                      DITOLAK
                    </span>
                  {/if}
                  <span class="px-2 py-0.5 text-[7px] font-pixel font-bold rounded bg-[#0284c7] text-white border border-[#1c120c]">
                    AI: {claim.confidence} ({claim.score}%)
                  </span>
                </div>
                <span class="text-[10px] text-stone-500 font-sans font-bold">{formatDate(claim.createdAt)}</span>
              </div>

              <!-- Isi Deskripsi Klaim -->
              <div class="bg-slate-50 border border-[#1c120c] p-2.5 rounded text-xs font-sans text-stone-800 font-medium">
                <span class="text-[#1c120c] text-[9px] font-pixel block mb-1 font-bold">KLAIM USER:</span>
                "{claim.text}"
              </div>

              <!-- AI Reasoning -->
              <div class="bg-blue-50 border border-[#2563eb] p-2 rounded text-[11px] font-sans text-[#1d4ed8] font-semibold">
                <span class="text-[#2563eb] text-[8px] font-pixel block mb-0.5 font-bold">ANALISIS SATPAM AI:</span>
                {claim.reasoning}
              </div>

              {#if claim.claimantName}
                <div class="flex items-center justify-between text-[10px] text-stone-600 font-sans border-t border-stone-200 pt-1.5 mt-0.5 font-bold">
                  <span>Oleh: <strong class="text-[#1c120c]">{claim.claimantName}</strong> ({claim.claimantNpm || '-'})</span>
                  {#if claim.claimantContact}
                    <span class="text-green-700 font-bold">WA: {claim.claimantContact}</span>
                  {/if}
                </div>
              {/if}
            </div>
          {/each}
        {/if}
      </div>

      <!-- Tombol Tutup -->
      <button
        onclick={closeModal}
        type="button"
        class="bg-[#ffd700] hover:bg-[#fbbf24] active:translate-y-0.5 text-[#1c120c] font-pixel text-[9px] md:text-[10px] py-2.5 px-4 rounded w-full border-2 border-[#1c120c] shadow-[2px_2px_0_#1c120c] active:shadow-none transition-all cursor-pointer text-center font-bold tracking-wider mt-1"
      >
        TUTUP
      </button>
    </div>
  </div>
{/if}
