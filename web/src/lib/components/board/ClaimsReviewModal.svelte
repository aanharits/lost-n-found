<script lang="ts">
  import { activeModal, reviewTargetItemId } from '$lib/stores/ui.js';
  import { items } from '$lib/stores/items.js';
  import { currentPlayer } from '$lib/stores/player.js';
  import { fade, fly } from 'svelte/transition';
  import TagIcon from '../shared/TagIcon.svelte';

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
  let sortedClaims = $derived(
    !targetItem?.claims
      ? []
      : [...targetItem.claims].sort((a, b) => {
          if (a.status === 'pending' && b.status !== 'pending') return -1;
          if (a.status !== 'pending' && b.status === 'pending') return 1;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        })
  );

  // Proteksi: hanya pelapor yang berhak melihat riwayat klaim barang
  $effect(() => {
    if (targetItem && $currentPlayer?.npm && targetItem.reporterNpm !== $currentPlayer.npm) {
      closeModal();
    }
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
      class="relative max-w-lg w-full m-4 bg-white border-4 border-[#1c120c] shadow-[6px_6px_0px_#0a060f] rounded flex flex-col overflow-hidden select-none"
      transition:fly={{ y: 20, duration: 250 }}
    >
      <!-- Header Modal: Modern Minimalist Nintendo Blue Title Bar -->
      <div class="bg-[#2563eb] text-white px-3.5 py-2.5 font-pixel text-[9px] md:text-[10px] flex justify-between items-center border-b-2 border-[#1c120c]">
        <div class="flex items-center gap-2">
          <span class="w-2 h-2 rounded-full bg-green-400 border border-[#0c0812] animate-pulse"></span>
          <span class="font-bold tracking-wider">RIWAYAT KLAIM BARANG</span>
        </div>
        <button
          onclick={closeModal}
          class="text-white hover:text-red-200 font-pixel text-xs px-1.5 py-0.5 cursor-pointer leading-none"
          type="button"
          aria-label="Tutup"
        >
          ✕
        </button>
      </div>

      <!-- Body Form Minimalis Modern 8-Bit Canvas -->
      <div class="p-4 md:p-5 flex flex-col gap-3.5 bg-[#f8fafc]">
        
        <!-- Info Singkat Barang Target (Warna Warm Amber Bubble User) -->
        <div class="bg-[#fef3c7] border-2 border-[#1c120c] rounded p-3 flex items-center gap-3 shadow-[2px_2px_0px_#1c120c]">
          <div class="w-10 h-10 rounded bg-white border-2 border-[#1c120c] flex items-center justify-center shrink-0 shadow-[1px_1px_0px_#1c120c]">
            <TagIcon tag={targetItem.tag} fallback={targetItem.icon} size={28} title={targetItem.title} />
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

        <!-- Claims List Area (Warna Pastel Mint Green Bubble Satpam AI) -->
        <div class="chat-log-scroll flex flex-col gap-2.5 max-h-[320px] overflow-y-auto pr-0.5">
          {#if (targetItem.claims || []).length === 0}
            <div class="text-stone-700 font-pixel text-[8px] text-center p-6 border-2 border-dashed border-[#1c120c] rounded bg-[#dcfce7] shadow-[2px_2px_0px_#1c120c]">
              Belum ada pengajuan klaim untuk barang ini.
            </div>
          {:else}
            {#each sortedClaims as claim (claim.id)}
              <div class="bg-[#dcfce7] border-2 border-[#1c120c] p-3 flex flex-col gap-2 shadow-[2px_2px_0px_#1c120c] rounded" transition:fly={{ x: 20, duration: 250 }}>
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
                  </div>
                  <span class="text-[10px] text-stone-600 font-sans font-bold">{formatDate(claim.createdAt)}</span>
                </div>

                <!-- Isi Deskripsi Klaim User -->
                <div class="bg-white border border-[#1c120c] p-2.5 rounded text-xs font-sans text-[#1c120c] font-medium shadow-[1px_1px_0px_rgba(0,0,0,0.06)]">
                  <span class="text-[#1c120c] text-[8.5px] font-pixel block mb-1 font-bold">KLAIM USER:</span>
                  "{claim.text || 'Tidak ada deskripsi tambahan'}"
                </div>

                {#if claim.claimantName}
                  <div class="flex items-center justify-between text-[10px] text-stone-700 font-sans border-t border-[#1c120c]/20 pt-1.5 mt-0.5 font-bold">
                    <span>Oleh: <strong class="text-[#1c120c]">{claim.claimantName}</strong> ({claim.claimantNpm || '-'})</span>
                    {#if claim.claimantContact}
                      <span class="text-green-800 font-bold">WA: {claim.claimantContact}</span>
                    {/if}
                  </div>
                {/if}
              </div>
            {/each}
          {/if}
        </div>
      </div>

      <!-- Tombol Aksi Bawah Minimalis Modern Nintendo -->
      <div class="p-3.5 md:p-4 bg-white border-t-2 border-[#1c120c] flex justify-end">
        <button
          onclick={closeModal}
          type="button"
          class="bg-[#2563eb] hover:bg-[#1d4ed8] active:translate-y-0.5 text-white font-pixel text-[9px] md:text-[10px] py-2.5 px-6 rounded border-2 border-[#1c120c] shadow-[2px_2px_0_#1c120c] active:shadow-none transition-all cursor-pointer text-center font-bold tracking-wider"
        >
          TUTUP
        </button>
      </div>
    </div>
  </div>
{/if}
