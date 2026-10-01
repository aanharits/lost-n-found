<script lang="ts">
  import { fade } from 'svelte/transition';

  let {
    x = 0,
    y = 0,
    delay = 0,
  }: {
    x: number;
    y: number;
    delay?: number;
  } = $props();
</script>

<div
  class="item-card skeleton-card pointer-events-none select-none"
  style="left: {x}px; top: {y}px; animation-delay: {delay}ms;"
  out:fade={{ duration: 200 }}
>
  <!-- Pushpin 8-bit placeholder -->
  <div
    class="absolute -top-2 left-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-stone-400 border-2 border-[#140b05] shadow-[0_2px_0px_#140b05] z-30"
  >
    <div class="w-1 h-1 rounded-full bg-stone-200 ml-0.5 mt-0.5"></div>
  </div>

  <div class="card-inner-frame w-full h-full flex flex-col overflow-hidden rounded-[1px]">
    <!-- Header bar skeleton -->
    <div class="card-header bg-[#cbd5e1] border-b-2 border-[#140b05] flex items-center justify-center h-6">
      <div class="h-2.5 w-16 bg-stone-400/70 rounded animate-pulse"></div>
    </div>

    <!-- Area foto/icon placeholder -->
    <div class="card-image bg-white/70 flex items-center justify-center p-3">
      <div class="w-12 h-12 rounded bg-stone-200/80 border-2 border-dashed border-stone-400/50 flex items-center justify-center animate-pulse">
        <span class="font-pixel text-[12px] text-stone-400 opacity-60">⏳</span>
      </div>
    </div>

    <!-- Area deskripsi skeleton -->
    <div class="p-2 bg-[#fefce8] flex-grow flex flex-col justify-between min-h-0">
      <div class="min-h-0 flex flex-col gap-1.5 mt-0.5">
        <!-- Title & Code placeholder -->
        <div class="flex items-center justify-between gap-2">
          <div class="h-3.5 w-20 bg-stone-300 rounded animate-pulse"></div>
          <div class="h-2.5 w-7 bg-stone-200 rounded animate-pulse"></div>
        </div>
        <!-- Tanggal & Lokasi placeholder -->
        <div class="h-2 w-14 bg-amber-300/60 rounded animate-pulse"></div>
        <div class="h-2.5 w-full bg-stone-200/90 rounded animate-pulse mt-0.5"></div>
      </div>

      <!-- Tombol placeholder -->
      <div class="bg-stone-300/80 border-2 border-[#140b05] h-6 rounded flex items-center justify-center animate-pulse mt-1 shadow-[1px_1px_0px_#140b05]">
        <div class="h-2 w-16 bg-stone-400/80 rounded"></div>
      </div>
    </div>
  </div>
</div>

<style>
  .skeleton-card {
    opacity: 0.9;
    animation: skeletonShimmer 1.8s ease-in-out infinite alternate;
  }

  @keyframes skeletonShimmer {
    0% {
      transform: translateY(0);
      opacity: 0.85;
    }
    100% {
      transform: translateY(-3px);
      opacity: 1;
    }
  }
</style>
