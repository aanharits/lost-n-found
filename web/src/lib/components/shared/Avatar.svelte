<script lang="ts">
  import { createAvatar } from '@dicebear/core';
  import { pixelArt } from '@dicebear/collection';

  let { 
    seed = '', 
    gender = 'male',
    size = 96,
    options = {},
    class: customClass = '' 
  } = $props<{
    seed?: string;
    gender?: 'male' | 'female';
    size?: number | string;
    options?: Record<string, any>;
    class?: string;
  }>();

  // Tentukan seed avatar yang digunakan: seed spesifik atau default gender
  let effectiveSeed = $derived(seed || (gender === 'female' ? 'Luna' : 'Felix'));

  // Generate SVG pixel art murni dari DiceBear secara lokal dan reaktif
  let avatarSvg = $derived(
    createAvatar(pixelArt, {
      seed: effectiveSeed,
      ...options,
    }).toString()
  );

  let dimensionStyle = $derived(
    typeof size === 'number' ? `${size}px` : size
  );
</script>

<div 
  class="inline-flex items-center justify-center select-none overflow-hidden {customClass}"
  style="width: {dimensionStyle}; height: {dimensionStyle}; image-rendering: pixelated; shape-rendering: crispEdges;"
>
  {@html avatarSvg}
</div>
