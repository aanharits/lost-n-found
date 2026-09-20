<script lang="ts">
  import { onMount } from "svelte";
  import { currentScene } from "$lib/stores/ui.js";
  import { currentPlayer } from "$lib/stores/player.js";
  import { initSocket } from "$lib/socket.js";
  import Lobby from "$lib/components/Lobby.svelte";
  import Board from "$lib/components/Board.svelte";
  import ToastContainer from "$lib/components/ToastContainer.svelte";
  import { fade } from "svelte/transition";

  // Inisialisasi socket dan penanganan status login user
  onMount(() => {
    const socket = initSocket();

    // Deteksi akun demo melalui query parameter URL
    const urlParams = new URLSearchParams(window.location.search);
    const urlUser = urlParams.get("user");

    if (urlUser === "budi" || urlUser === "1") {
      currentPlayer.set({
        name: "Budi Santoso",
        npm: "21081010001",
        contact: "6281234567891",
        gender: "male",
      });
    } else if (urlUser === "siti" || urlUser === "2") {
      currentPlayer.set({
        name: "Siti Rahma",
        npm: "21081020045",
        contact: "6281234567892",
        gender: "female",
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
        socket.emit("user_join", p);
      }
    };

    socket?.on("connect", onConnect);

    // Beralih ke board jika user telah login atau ke lobby jika belum
    const unsub = currentPlayer.subscribe((player) => {
      if (player) {
        currentScene.set("board");
        if (socket?.connected) {
          socket.emit("user_join", player);
        }
      } else {
        currentScene.set("lobby");
      }
    });

    return () => {
      socket?.off("connect", onConnect);
      unsub();
    };
  });
</script>

<div class="h-screen w-screen flex flex-col items-center justify-center p-4">
  <ToastContainer />

  {#if $currentScene === "lobby"}
    <div transition:fade={{ duration: 300 }}>
      <Lobby />
    </div>
  {:else}
    <div
      transition:fade={{ duration: 300 }}
      class="w-full h-full flex items-center justify-center"
    >
      <Board />
    </div>
  {/if}
</div>
