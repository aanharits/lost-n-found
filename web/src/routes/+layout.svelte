<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  import { initSocket } from '$lib/socket.js';
  import { currentPlayer } from '$lib/stores/player.js';
  import ToastContainer from '$lib/components/shared/ToastContainer.svelte';

  let { children } = $props();

  onMount(() => {
    const socket = initSocket();

    // Deteksi akun demo melalui query parameter URL
    const urlParams = new URLSearchParams(window.location.search);
    const urlUser = urlParams.get('user');

    if (urlUser === 'budi' || urlUser === '1') {
      currentPlayer.set({
        name: 'Budi Santoso',
        npm: '21081010001',
        contact: '6281234567891',
        gender: 'male',
        role: 'student',
      });
    } else if (urlUser === 'siti' || urlUser === '2') {
      currentPlayer.set({
        name: 'Siti Rahma',
        npm: '21081020045',
        contact: '6281234567892',
        gender: 'female',
        role: 'student',
      });
    } else if (urlUser === 'satpam' || urlUser === 'security') {
      currentPlayer.set({
        name: 'Komandan Satpam',
        npm: 'SATPAM-KOMANDAN',
        contact: 'Pos Keamanan Induk',
        gender: 'male',
        avatarSeed: 'OfficerBambang',
        role: 'satpam',
        accessKey: 'satpamganteng',
      });
    }

    // Sinkronisasi data user saat socket berhasil terhubung kembali
    const onConnect = () => {
      let p: any = null;
      const unsubTemp = currentPlayer.subscribe((val) => {
        p = val;
      });
      unsubTemp();
      if (p && socket?.connected) {
        socket.emit('user_join', p);
        if (p.role === 'satpam') {
          socket.emit('satpam_join', { accessKey: p.accessKey || 'satpamganteng' });
        }
      }
    };

    socket?.on('connect', onConnect);

    const unsub = currentPlayer.subscribe((player) => {
      if (player && socket?.connected) {
        socket.emit('user_join', player);
        if (player.role === 'satpam') {
          socket.emit('satpam_join', { accessKey: player.accessKey || 'satpamganteng' });
        }
      }
    });

    return () => {
      socket?.off('connect', onConnect);
      unsub();
    };
  });
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

<div class="h-screen w-screen flex flex-col items-center justify-center p-4">
  <ToastContainer />
  {@render children()}
</div>
