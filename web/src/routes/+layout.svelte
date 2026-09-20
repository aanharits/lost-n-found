<script lang="ts">
  import '../app.css';
  let { children } = $props();
</script>

<svelte:head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="description" content="Lost & Found Kampus AI — Sistem pencarian barang hilang berbasis AI dengan verifikasi real-time" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
  <link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&family=VT323&display=swap" rel="stylesheet" />
  <title>Lost & Found Kampus AI</title>
</svelte:head>

{@render children()}
