<script lang="ts">
  import { items } from '$lib/stores/items.js';
  import { activeHighlight, currentFilter } from '$lib/stores/ui.js';

  // Daftar tab kategori barang
  export const CATEGORY_TABS = [
    { id: 'Gadget', label: 'GADGET' },
    { id: 'Pakaian & Aksesoris', label: 'PAKAIAN' },
    { id: 'Personal', label: 'PERSONAL' },
    { id: 'Dokumen & Kartu', label: 'DOKUMEN' },
  ];

  // Fungsi toggle penyorotan kategori (highlight & dimming)
  function toggleCategoryHighlight(catId: string) {
    if ($activeHighlight?.category === catId) {
      activeHighlight.set(null);
      currentFilter.set('all');
    } else {
      currentFilter.set('all');
      const matching = $items.filter(
        (i) => i.category?.toLowerCase() === catId.toLowerCase()
      );
      activeHighlight.set({
        category: catId,
        itemIds: matching.map((i) => i.id),
        source: 'filter',
      });
      // Cari item pertama dengan kategori ini dan scroll ke posisinya
      const firstItem = matching[0];
      if (firstItem) {
        setTimeout(() => {
          const el = document.getElementById(firstItem.id);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 150);
      }
    }
  }
</script>

<!-- Panel Kategori Sisi Kiri (Desain Gamepad Nintendo 8-Bit Lucu dengan Layar LCD) -->
<aside
  class="select-none mb-3 min-[1140px]:mb-0 min-[1140px]:absolute min-[1140px]:-left-40 min-[1140px]:top-0 z-25 w-[142px] bg-[#fefce8] border-4 border-[#1c120c] shadow-[inset_0_2px_0_rgba(255,255,255,0.9),inset_-2px_-2px_0_rgba(0,0,0,0.12),4px_4px_0px_#0c0812] rounded-2xl p-2 flex flex-col gap-2"
>
  <!-- Layar Mini LCD Game Boy -->
  <div class="bg-[#1e293b] border-2 border-[#1c120c] rounded-lg p-1.5 flex flex-col gap-1 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]">
    <!-- Status Bar Baterai LCD -->
    <div class="flex items-center justify-between px-0.5">
      <div class="flex items-center gap-1">
        <span class="w-1.5 h-1.5 rounded-full bg-red-500 border border-black animate-pulse"></span>
        <span class="font-pixel text-[5px] text-slate-400">BATTERY</span>
      </div>
      <span class="font-pixel text-[5px] text-slate-400 tracking-tighter">8-BIT</span>
    </div>

    <!-- Tampilan Layar Hijau Dot-Matrix Game Boy -->
    <div class="bg-[#8bac0f] border border-[#306230] rounded p-1 flex flex-col items-center justify-center shadow-[inset_0_1px_2px_rgba(0,0,0,0.3)]">
      <span class="font-pixel text-[8px] text-[#0f380f] font-bold tracking-wider leading-none">
        {$activeHighlight?.itemType ? 'Status :' : 'Kategori :'}
      </span>
      <span class="font-pixel text-[6.5px] text-[#306230] font-bold mt-0.5 tracking-tight truncate max-w-full">
        {$activeHighlight?.category
          ? $activeHighlight.category.toUpperCase()
          : ($activeHighlight?.itemType
            ? ($activeHighlight.itemType === 'lost' ? 'HILANG' : 'KETEMU')
            : 'SEMUA')}
      </span>
    </div>
  </div>

  <!-- Tombol Tombol Gamepad Kategori -->
  <div class="flex flex-col gap-1.5 w-full">
    {#each CATEGORY_TABS as cat}
      <button
        type="button"
        onclick={() => toggleCategoryHighlight(cat.id)}
        class="font-pixel text-[8px] py-1.5 px-2 w-full rounded border-2 border-[#1c120c] shadow-[2px_2px_0px_#1c120c] active:translate-y-0.5 active:shadow-none cursor-pointer font-bold tracking-wider transition-all select-none text-center
          {$activeHighlight?.category === cat.id
            ? 'bg-[#ffd700] text-[#1c120c] translate-x-1 shadow-none border-[#1c120c] ring-1 ring-[#facc15]'
            : 'bg-white text-[#1c120c] hover:bg-[#fff9db]'}"
      >
        {cat.label}
      </button>
    {/each}
  </div>

  <!-- Detail Retro: Tombol Karet Select / Start & Speaker Grille -->
  <div class="flex items-center justify-between px-1 pt-1 border-t border-[#e2dcbb] mt-0.5">
    <div class="flex gap-1.5 items-center">
      <div class="flex flex-col items-center">
        <div class="w-3.5 h-1.5 bg-[#64748b] border border-[#1c120c] rounded-full -rotate-25 shadow-[1px_1px_0_#1c120c]"></div>
        <span class="text-[5px] font-pixel text-[#78716c] mt-0.5">SELECT</span>
      </div>
      <div class="flex flex-col items-center">
        <div class="w-3.5 h-1.5 bg-[#64748b] border border-[#1c120c] rounded-full -rotate-25 shadow-[1px_1px_0_#1c120c]"></div>
        <span class="text-[5px] font-pixel text-[#78716c] mt-0.5">START</span>
      </div>
    </div>
    <!-- Lubang Speaker 8-bit -->
    <div class="flex gap-1 items-center pr-0.5">
      <div class="w-0.5 h-2.5 bg-[#cbd5e1] border border-[#1c120c] rounded-full -rotate-25"></div>
      <div class="w-0.5 h-2.5 bg-[#cbd5e1] border border-[#1c120c] rounded-full -rotate-25"></div>
      <div class="w-0.5 h-2.5 bg-[#cbd5e1] border border-[#1c120c] rounded-full -rotate-25"></div>
    </div>
  </div>
</aside>
