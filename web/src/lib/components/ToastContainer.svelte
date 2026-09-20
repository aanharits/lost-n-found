<script lang="ts">
  import { onMount } from 'svelte';
  import { setToastCallback } from '$lib/socket.js';
  import { fly } from 'svelte/transition';

  interface Toast {
    id: number;
    message: string;
    type: string;
  }

  let toasts: Toast[] = $state([]);
  let nextId = 0;

  // Menambahkan notifikasi toast baru dan menghapusnya otomatis setelah 4 detik
  function addToast(message: string, type: string = 'info') {
    const id = nextId++;
    toasts = [...toasts, { id, message, type }];

    setTimeout(() => {
      toasts = toasts.filter((t) => t.id !== id);
    }, 4000);
  }

  // Mendaftarkan fungsi callback toast saat komponen dimuat
  onMount(() => {
    setToastCallback(addToast);
  });
</script>

<!-- Wadah penampil daftar notifikasi toast di pojok kanan atas -->
<div class="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none">
  {#each toasts as toast (toast.id)}
    <div
      class="mc-toast toast-{toast.type}"
      transition:fly={{ x: 60, duration: 300 }}
    >
      {toast.message}
    </div>
  {/each}
</div>
