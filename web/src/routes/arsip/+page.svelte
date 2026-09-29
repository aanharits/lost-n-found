<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { currentPlayer } from "$lib/stores/player.js";
  import BoardHeader from "$lib/components/shared/BoardHeader.svelte";
  import SatpamBoard from "$lib/components/arsip/SatpamBoard.svelte";
  import { fade } from "svelte/transition";

  onMount(() => {
    // Hanya petugas satpam yang memiliki akses ke pos arsip bukti
    if (!$currentPlayer) {
      goto("/lobby", { replaceState: true });
    } else if ($currentPlayer.role !== "satpam") {
      goto("/lobby", { replaceState: true });
    }
  });
</script>

<svelte:head>
  <title>Pos Arsip Satpam — Lost &amp; Found Kampus AI</title>
</svelte:head>

<BoardHeader showInbox={false} />

<div
  transition:fade={{ duration: 250 }}
  class="w-full h-full flex items-center justify-center"
>
  <SatpamBoard />
</div>
