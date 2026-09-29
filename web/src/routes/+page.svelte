<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { currentPlayer } from "$lib/stores/player.js";

  onMount(() => {
    // Arahkan ke endpoint yang sesuai status login pemain
    if (!$currentPlayer) {
      goto("/lobby", { replaceState: true });
    } else if ($currentPlayer.role === "satpam") {
      goto("/arsip", { replaceState: true });
    } else {
      goto("/board", { replaceState: true });
    }
  });
</script>

<div class="font-pixel text-xs text-white select-none animate-pulse">
  MEMUAT SISTEM LOST &amp; FOUND...
</div>
