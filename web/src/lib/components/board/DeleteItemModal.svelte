<script lang="ts">
  import { activeModal, deleteTargetItemId } from "$lib/stores/ui.js";
  import { items } from "$lib/stores/items.js";
  import { currentPlayer } from "$lib/stores/player.js";
  import { getSocket } from "$lib/socket.js";
  import { fade, fly } from "svelte/transition";
  import TagIcon from "../shared/TagIcon.svelte";

  // Ambil item yang sedang ditargetkan untuk dihapus
  let targetItem = $derived(
    $items.find((i) => i.id === $deleteTargetItemId) || null,
  );

  let errorMsg = $state("");
  let loading = $state(false);

  function closeModal() {
    activeModal.set("none");
    deleteTargetItemId.set(null);
    errorMsg = "";
    loading = false;
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape") closeModal();
  }

  function confirmDelete() {
    if (!targetItem) return;

    if (targetItem.status !== "open") {
      errorMsg = "Laporan yang sedang dalam proses klaim tidak bisa dihapus.";
      return;
    }

    loading = true;
    errorMsg = "";

    const socket = getSocket();
    if (!socket?.connected) {
      errorMsg = "Koneksi ke server terputus.";
      loading = false;
      return;
    }

    const reporterToken = localStorage.getItem("lf_device_token") || "";
    const reporterNpm = $currentPlayer?.npm || "";

    socket.emit("item_delete", {
      id: targetItem.id,
      reporterToken,
      reporterNpm,
    });

    closeModal();
  }
</script>

<svelte:window onkeydown={onKeyDown} />

<div class="modal-overlay backdrop-blur-xs" transition:fade={{ duration: 150 }}>
  <div
    class="relative max-w-sm w-full m-4 bg-white border-4 border-[#1c120c] shadow-[6px_6px_0px_#0a060f] rounded flex flex-col overflow-hidden select-none"
    transition:fly={{ y: 20, duration: 250 }}
  >
    <!-- Header Modal: Modern Minimalist Nintendo Blue Title Bar -->
    <div
      class="bg-[#2563eb] text-white px-3.5 py-2.5 font-pixel text-[9px] md:text-[10px] flex justify-between items-center border-b-2 border-[#1c120c]"
    >
      <div class="flex items-center gap-2">
        <span
          class="w-2 h-2 rounded-full bg-red-400 border border-[#0c0812] animate-pulse"
        ></span>
        <span class="font-bold tracking-wider">HAPUS LAPORAN</span>
      </div>
      <button
        onclick={closeModal}
        class="text-white hover:text-red-200 font-pixel text-xs px-1.5 py-0.5 cursor-pointer leading-none"
        type="button"
        aria-label="Tutup"
      >
        ✕
      </button>
    </div>

    <!-- Body Form Minimalis Modern 8-Bit Canvas -->
    <div class="p-4 md:p-5 flex flex-col gap-3.5 bg-[#f8fafc]">
      <!-- Alert error jika ada -->
      {#if errorMsg}
        <div
          class="bg-red-100 border-2 border-red-600 text-red-800 text-xs px-3 py-2 rounded font-pixel leading-relaxed shadow-[2px_2px_0px_#1c120c]"
        >
          {errorMsg}
        </div>
      {/if}

      <!-- Preview Item yang akan dihapus (Warna Warm Amber Bubble User) -->
      {#if targetItem}
        <div
          class="bg-[#fefce8] p-3 rounded border-2 border-[#1c120c] flex items-center gap-3 shadow-[2px_2px_0px_#1c120c]"
        >
          <div
            class="w-12 h-12 bg-white rounded border-2 border-[#1c120c] flex items-center justify-center flex-shrink-0 shadow-[1px_1px_0px_#1c120c]"
          >
            <TagIcon
              tag={targetItem.tag}
              fallback={targetItem.icon}
              size={32}
              title={targetItem.title}
            />
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-1.5">
              <span
                class="font-pixel text-[7.5px] px-1.5 py-0.5 rounded font-bold {targetItem.type ===
                'found'
                  ? 'bg-[#16a34a] text-white'
                  : 'bg-[#dc2626] text-white'}"
              >
                {targetItem.type === "found" ? "KETEMU" : "HILANG"}
              </span>
              <p
                class="font-bold text-[15px] leading-tight text-[#2c1b0f] truncate font-sans"
              >
                {targetItem.title}
              </p>
            </div>
            <p
              class="text-[10px] text-[#78350f] font-bold font-sans leading-none mt-0.5"
            >
              {targetItem.date || "-"} | {targetItem.time || "-"}
            </p>
            <p
              class="text-[11px] text-[#451a03] font-medium font-sans truncate mt-0.5"
            >
              {targetItem.desc}
            </p>
          </div>
        </div>
      {/if}

      <!-- Konfirmasi Warning Box -->
      <div
        class="text-[#1c120c] font-sans space-y-1 bg-red-50 border-2 border-red-300 p-3 rounded shadow-[1px_1px_0px_rgba(0,0,0,0.05)]"
      >
        <p class="font-bold text-xs leading-snug text-red-900 font-sans">
          Apakah Anda yakin ingin menghapus permanen laporan ini?
        </p>
      </div>
    </div>

    <!-- Tombol Aksi Bawah Minimalis Modern Nintendo -->
    <div class="p-3.5 md:p-4 bg-white border-t-2 border-[#1c120c] flex gap-2.5">
      <button
        type="button"
        onclick={closeModal}
        class="bg-white hover:bg-slate-100 active:translate-y-0.5 text-[#1c120c] font-pixel text-[9px] md:text-[10px] py-2.5 px-4 rounded w-1/2 border-2 border-[#1c120c] shadow-[2px_2px_0_#1c120c] active:shadow-none transition-all cursor-pointer text-center font-bold"
      >
        BATAL
      </button>
      <button
        type="button"
        onclick={confirmDelete}
        disabled={loading}
        class="bg-[#dc2626] hover:bg-[#b91c1c] active:translate-y-0.5 text-white font-pixel text-[9px] md:text-[10px] py-2.5 px-4 rounded w-1/2 border-2 border-[#1c120c] shadow-[2px_2px_0_#1c120c] active:shadow-none transition-all cursor-pointer text-center font-bold tracking-wider disabled:opacity-50"
      >
        {loading ? "MENGHAPUS..." : "YA, HAPUS"}
      </button>
    </div>
  </div>
</div>
