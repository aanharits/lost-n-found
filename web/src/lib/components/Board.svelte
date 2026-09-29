<script lang="ts">
  import { currentPlayer } from '$lib/stores/player.js';
  import BoardHeader from './shared/BoardHeader.svelte';
  import MainBoard from './board/MainBoard.svelte';
  import SatpamBoard from './arsip/SatpamBoard.svelte';

  const isSatpam = $derived($currentPlayer?.role === 'satpam');
</script>

<BoardHeader showInbox={!isSatpam} />
<div class="w-full h-full flex items-center justify-center">
  {#if isSatpam}
    <SatpamBoard />
  {:else}
    <MainBoard />
  {/if}
</div>
