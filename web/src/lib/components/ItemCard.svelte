<script lang="ts">
  import type { Item } from '$lib/stores/items.js';
  import { activeHighlight } from '$lib/stores/ui.js';
  import { draggable } from '$lib/actions/draggable.js';
  import { fly } from 'svelte/transition';
  import TagIcon from './TagIcon.svelte';

  let { item, onClaim, onReviewClaims, onDragEnd }: {
    item: Item;
    onClaim: () => void;
    onReviewClaims: () => void;
    onDragEnd: (x: number, y: number) => void;
  } = $props();

  let isMobile = $state(false);

  // Deteksi viewport mobile
  $effect(() => {
    isMobile = window.innerWidth < 768;
  });

  // Styling header dan klaim
  const headerClass = $derived(item.type === 'found' ? 'found' : '');
  const headerText = $derived(item.type === 'found' ? 'KETEMU' : 'HILANG');
  const pendingClaims = $derived((item.claims || []).filter((c) => c.status === 'pending'));

  // Evaluasi status highlight kartu
  const isHighlighted = $derived(
    !!$activeHighlight &&
    (
      ($activeHighlight.itemIds && $activeHighlight.itemIds.includes(item.id)) ||
      ($activeHighlight.tag && item.tag === $activeHighlight.tag) ||
      ($activeHighlight.category && item.category?.toLowerCase() === $activeHighlight.category?.toLowerCase()) ||
      ($activeHighlight.itemType && item.type === $activeHighlight.itemType)
    )
  );

  const isDimmed = $derived(
    !!$activeHighlight && !isHighlighted
  );
</script>

<div
  class="item-card {item.resolved ? 'resolved-card' : ''} {isHighlighted ? 'highlighted-card' : ''} {isDimmed ? 'dimmed-card' : ''}"
  id={item.id}
  style="left: {item.x}px; top: {item.y}px;"
  use:draggable={{ itemId: item.id, containerId: 'board-container', onDragEnd }}
  transition:fly={{ y: -30, duration: 400 }}
>
  <!-- Pushpin 8-bit -->
  <div class="absolute -top-2 left-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-red-600 border-2 border-[#140b05] shadow-[0_2px_0px_#140b05] z-30 pointer-events-none">
    <div class="w-1 h-1 rounded-full bg-red-300 ml-0.5 mt-0.5"></div>
  </div>

  <!-- Badge pending claim -->
  {#if pendingClaims.length > 0}
    <button
      class="claim-badge font-pixel"
      onclick={(e) => { e.stopPropagation(); onReviewClaims(); }}
      type="button"
    >
      {pendingClaims.length} KLAIM
    </button>
  {/if}

  <!-- Pita status selesai -->
  {#if item.resolved}
    <div class="resolved-ribbon font-pixel">SELESAI</div>
  {/if}

  <div class="card-header font-pixel {headerClass}">{headerText}</div>
  <div class="card-image flex items-center justify-center">
    <TagIcon tag={item.tag} fallback={item.icon} size={48} />
  </div>
  <div class="p-2.5 bg-[#fefce8] flex-grow flex flex-col justify-between">
    <div>
      <p class="font-bold text-[14px] leading-tight text-[#2c1b0f] truncate">{item.title}</p>
      <p class="text-[9px] text-[#78350f] font-bold my-0.5">{item.date || '-'} | {item.time || '-'}</p>
      <p class="text-[11px] text-[#451a03] truncate leading-tight font-medium">{item.desc}</p>
    </div>
    {#if item.resolved}
      <button
        disabled
        class="bg-[#78716c] text-[#e7e5e4] font-pixel text-[8px] py-1.5 mt-1.5 w-full rounded border-2 border-[#44403c] cursor-not-allowed text-center select-none"
      >
        SUDAH DIKLAIM
      </button>
    {:else}
      <button
        onclick={onClaim}
        class="bg-[#0284c7] hover:bg-[#0369a1] active:translate-y-0.5 text-white font-pixel text-[8px] py-1.5 mt-1.5 w-full rounded border-2 border-[#140b05] shadow-[2px_2px_0px_#140b05] cursor-pointer text-center select-none transition-all"
      >
        KLAIM BARANG
      </button>
    {/if}
  </div>
</div>
