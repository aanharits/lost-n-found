<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { currentPlayer } from "$lib/stores/player.js";
  import BoardHeader from "$lib/components/shared/BoardHeader.svelte";
  import MainBoard from "$lib/components/board/MainBoard.svelte";
  import { fade } from "svelte/transition";

  onMount(() => {
    // Jika belum login, arahkan ke lobby
    if (!$currentPlayer) {
      goto("/lobby", { replaceState: true });
    }
  });
</script>

<svelte:head>
  <title>Papan Pengumuman Mahasiswa — Lost &amp; Found Kampus AI</title>
</svelte:head>

<BoardHeader />

<div
  transition:fade={{ duration: 250 }}
  class="w-full h-full flex items-center justify-center"
>
  <MainBoard />
</div>
