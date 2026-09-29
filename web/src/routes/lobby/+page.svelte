<script lang="ts">
  import Lobby from "$lib/components/lobby/Lobby.svelte";
  import { fade } from "svelte/transition";
</script>

<svelte:head>
  <title>Lobby Pemilihan Karakter — Lost &amp; Found Kampus AI</title>
</svelte:head>

<div
  transition:fade={{ duration: 250 }}
  class="w-full h-full flex items-center justify-center"
>
  <Lobby />
</div>
