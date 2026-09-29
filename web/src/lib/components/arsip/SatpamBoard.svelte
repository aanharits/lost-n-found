<script lang="ts">
  import { onMount } from "svelte";
  import { fade, fly } from "svelte/transition";
  import { items, type Item } from "$lib/stores/items.js";
  import { currentPlayer } from "$lib/stores/player.js";
  import { highlight } from "$lib/stores/highlight.js";
  import { getSocket } from "$lib/socket.js";
  import { formatShortCode } from "$lib/utils/shortCode.js";
  import SatpamFolderIcon from "./SatpamFolderCabinet.svelte";
  import SatpamFolderModal from "./SatpamFolderModal.svelte";
  import SatpamMutasiModal from "./SatpamMutasiModal.svelte";
  import SatpamChat from "../shared/SatpamChat.svelte";
  import { PUBLIC_SATPAM_KEY } from "$env/static/public";

  type FolderKey =
    | "found"
    | "lost"
    | "resolved"
    | "gadget"
    | "pakaian"
    | "personal"
    | "dokumen";

  const FOLDER_KEYS: FolderKey[] = [
    "found",
    "lost",
    "resolved",
    "gadget",
    "pakaian",
    "personal",
    "dokumen",
  ];

  const FOLDER_META: Record<FolderKey, { label: string; path: string }> = {
    found: { label: "BARANG KETEMU", path: "C:\\ARSIP_SATPAM\\BARANG_KETEMU" },
    lost: { label: "BARANG HILANG", path: "C:\\ARSIP_SATPAM\\BARANG_HILANG" },
    resolved: {
      label: "BARANG SELESAI",
      path: "C:\\ARSIP_SATPAM\\BARANG_SELESAI",
    },
    gadget: { label: "GADGET", path: "C:\\ARSIP_SATPAM\\KATEGORI_GADGET" },
    pakaian: { label: "PAKAIAN", path: "C:\\ARSIP_SATPAM\\KATEGORI_PAKAIAN" },
    personal: {
      label: "PERSONAL",
      path: "C:\\ARSIP_SATPAM\\KATEGORI_PERSONAL",
    },
    dokumen: { label: "DOKUMEN", path: "C:\\ARSIP_SATPAM\\KATEGORI_DOKUMEN" },
  } as const;

  // Kelompok folder per status & kategori
  const satpamFolders = $derived.by(() => {
    const active = $items.filter((i) => i.status !== "resolved");
    return {
      found: active.filter((i) => i.type === "found"),
      lost: active.filter((i) => i.type === "lost"),
      resolved: $items.filter((i) => i.status === "resolved"),
      gadget: $items.filter((i) =>
        (i.category || "").toLowerCase().includes("gadget"),
      ),
      pakaian: $items.filter((i) => {
        const cat = (i.category || "").toLowerCase();
        return cat.includes("pakaian") || cat.includes("aksesoris");
      }),
      personal: $items.filter((i) =>
        (i.category || "").toLowerCase().includes("personal"),
      ),
      dokumen: $items.filter((i) => {
        const cat = (i.category || "").toLowerCase();
        return cat.includes("dokumen") || cat.includes("kartu");
      }),
    };
  });

  // State modal explorer & buku mutasi
  let openFolder = $state<FolderKey | null>(null);
  let initialItemId = $state<string | null>(null);
  let isMutasiOpen = $state(false);
  let searchQuery = $state("");

  // Derived metrik dashboard admin (Ketemu, Hilang, Selesai)
  const statsFound = $derived(satpamFolders.found.length);
  const statsLost = $derived(satpamFolders.lost.length);
  const statsResolved = $derived(satpamFolders.resolved.length);

  // Derived hasil pencarian berkas global
  const searchResults = $derived.by(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return $items.filter((item) => {
      const title = (item.title || "").toLowerCase();
      const desc = (item.desc || "").toLowerCase();
      const code = (item.shortCode || item.id || "").toLowerCase();
      const reporter = (item.reporterName || "").toLowerCase();
      const npm = (item.reporterNpm || "").toLowerCase();
      const cat = (item.category || "").toLowerCase();
      return (
        title.includes(q) ||
        desc.includes(q) ||
        code.includes(q) ||
        reporter.includes(q) ||
        npm.includes(q) ||
        cat.includes(q)
      );
    });
  });

  function openFolderDetail(kind: FolderKey) {
    initialItemId = null;
    openFolder = kind;
  }

  function closeFolderDetail() {
    openFolder = null;
    initialItemId = null;
  }

  // Buka langsung item dari hasil pencarian atau buku mutasi
  function openItemDetail(item: Item) {
    let targetFolder: FolderKey = "found";
    if (item.status === "resolved") {
      targetFolder = "resolved";
    } else if (item.type === "lost") {
      targetFolder = "lost";
    } else {
      targetFolder = "found";
    }

    initialItemId = item.id;
    openFolder = targetFolder;
    searchQuery = "";
    isMutasiOpen = false;
  }

  onMount(() => {
    const socket = getSocket();
    const defaultKey = (PUBLIC_SATPAM_KEY || import.meta.env.PUBLIC_SATPAM_KEY || "").trim();
    if (socket?.connected && $currentPlayer?.role === "satpam") {
      socket.emit("satpam_join", {
        accessKey: $currentPlayer.accessKey || defaultKey,
      });
    }
  });

  function onWindowClick(e: MouseEvent) {
    const target = e.target as HTMLElement;
    if (
      $highlight &&
      !target.closest("button") &&
      !target.closest(".desktop-icon")
    ) {
      highlight.clear();
    }
    // Tutup popup pencarian jika klik di luar search container
    if (searchQuery && !target.closest(".search-container")) {
      searchQuery = "";
    }
  }
</script>

<svelte:window onclick={onWindowClick} />

<div
  class="board-scene w-full h-full max-w-5xl flex flex-col items-center justify-center pt-8 md:pt-4"
  transition:fade={{ duration: 300 }}
  style="animation: boardFadeIn 0.35s ease forwards;"
>
  <!-- Judul dan subjudul papan Arsip Satpam -->
  <div class="text-center mb-3 z-10 select-none flex flex-col items-center">
    <h1
      class="text-3xl md:text-5xl font-pixel text-white mb-1 tracking-wider"
      style="text-shadow: 3px 3px 0 #1c120c, 5px 5px 0 rgba(0,0,0,0.3);"
    >
      POS ARSIP SATPAM
    </h1>
    <p
      class="text-xs md:text-sm font-pixel text-[#ffd700] font-bold tracking-widest"
      style="text-shadow: 1px 1px 0 #1c120c, 2px 2px 0 #1c120c;"
    >
      Evidence &amp; Case Archives
    </p>
  </div>

  <!-- Kontainer utama board Win95 Desktop -->
  <div class="relative w-full max-w-5xl flex-grow flex flex-col items-center">
    <div
      id="board-container"
      class="board-container board-win95 w-full flex-grow overflow-hidden relative cursor-default shadow-[8px_8px_0px_rgba(0,0,0,0.5)]"
    >
      <!-- Tombol Kiri Atas: BUKU MUTASI (NES 8-Bit Minimalist) -->
      <div class="absolute top-3.5 left-3.5 z-20 flex items-center gap-2">
        <button
          type="button"
          onclick={() => (isMutasiOpen = true)}
          class="bg-[#ffd700] hover:bg-[#facc15] active:translate-y-0.5 text-[#1c120c] font-pixel text-[8px] md:text-[9px] py-1.5 px-3 rounded-none border-2 border-[#1c120c] shadow-[2px_2px_0_#1c120c] active:shadow-none cursor-pointer transition-all select-none font-bold tracking-wider flex items-center gap-1.5"
          title="Buka Jurnal Mutasi Kasus Posko"
        >
          <span
            class="bg-[#1c120c] text-white px-1 py-0.5 text-[7px] font-pixel"
            >LOG</span
          >
          <span>BUKU MUTASI</span>
        </button>
      </div>

      <!-- Panel Tengah Atas: Mini KPI Metrics Center (KETEMU | HILANG | SELESAI) -->
      <div
        class="absolute top-3.5 left-1/2 -translate-x-1/2 z-20 pointer-events-none hidden sm:flex items-center"
      >
        <div
          class="pointer-events-auto flex items-center gap-2 bg-[#fefce8] border-2 border-[#1c120c] shadow-[2px_2px_0_#1c120c] px-3 py-1.5 text-[7.5px] md:text-[8px] font-pixel font-bold select-none text-[#1c120c]"
        >
          <span>KETEMU: <span class="text-[#16a34a]">{statsFound}</span></span>
          <span class="text-stone-300">|</span>
          <span>HILANG: <span class="text-[#dc2626]">{statsLost}</span></span>
          <span class="text-stone-300">|</span>
          <span
            >SELESAI: <span class="text-[#2563eb]">{statsResolved}</span></span
          >
        </div>
      </div>

      <!-- Panel Kanan Atas: Global Search NES Minimalist (No Emojis) -->
      <div
        class="absolute top-3.5 right-3.5 z-20 flex items-center gap-2 search-container"
      >
        <!-- Global Search Box -->
        <div class="relative flex items-center">
          <div
            class="flex items-center bg-white border-2 border-[#1c120c] shadow-[2px_2px_0_#1c120c] rounded-none overflow-hidden"
          >
            <span
              class="bg-[#1c120c] text-white font-pixel text-[7.5px] md:text-[8px] px-2 py-1.5 tracking-wider select-none"
            >
              CARI
            </span>
            <input
              type="text"
              bind:value={searchQuery}
              placeholder="Nama / ID berkas..."
              class="w-32 md:w-44 bg-white py-1 px-2 font-sans text-xs font-bold text-[#1c120c] placeholder-stone-400 outline-none"
            />
            {#if searchQuery.trim()}
              <button
                type="button"
                onclick={() => (searchQuery = "")}
                class="px-2 text-stone-500 hover:text-black font-pixel text-[8px] cursor-pointer"
                aria-label="Bersihkan pencarian"
              >
                X
              </button>
            {/if}
          </div>

          <!-- Popover Dropdown Hasil Pencarian Global -->
          {#if searchQuery.trim()}
            <div
              class="absolute right-0 top-full mt-1.5 w-72 md:w-84 bg-white border-2 border-[#1c120c] shadow-[4px_4px_0_#0a060f] z-50 max-h-72 overflow-y-auto flex flex-col select-none"
              transition:fly={{ y: -4, duration: 120 }}
            >
              <div
                class="bg-[#2563eb] text-white px-2.5 py-1.5 font-pixel text-[7.5px] font-bold flex justify-between items-center border-b-2 border-[#1c120c]"
              >
                <span>HASIL PENCARIAN BERKAS ({searchResults.length})</span>
                <span class="font-mono text-[9px] text-[#fef08a]"
                  >{searchResults.length} ITEM</span
                >
              </div>

              {#if searchResults.length === 0}
                <div
                  class="p-4 text-center font-pixel text-[8px] text-stone-600 bg-stone-50"
                >
                  [TIDAK DITEMUKAN BERKAS TERKAIT]
                </div>
              {:else}
                <div class="divide-y divide-stone-200">
                  {#each searchResults as it (it.id)}
                    <button
                      type="button"
                      onclick={() => openItemDetail(it)}
                      class="w-full text-left p-2 hover:bg-[#fefce8] transition-colors cursor-pointer flex items-center justify-between gap-2"
                    >
                      <div class="min-w-0 flex-1">
                        <div class="flex items-center gap-1.5">
                          <span
                            class="font-pixel text-[6.5px] px-1 py-0.5 rounded font-bold {it.status ===
                            'resolved'
                              ? 'bg-[#9333ea] text-white'
                              : it.type === 'found'
                                ? 'bg-[#16a34a] text-white'
                                : 'bg-[#dc2626] text-white'}"
                          >
                            [{it.status === "resolved"
                              ? "SELESAI"
                              : it.type === "found"
                                ? "KETEMU"
                                : "HILANG"}]
                          </span>
                          <p
                            class="font-sans font-bold text-xs text-[#1c120c] truncate"
                          >
                            {it.title}
                          </p>
                        </div>
                        <p
                          class="font-sans text-[10px] text-stone-600 font-medium truncate mt-0.5"
                        >
                          {formatShortCode(it.shortCode, it.id)} &bull; {it.desc ||
                            "-"}
                        </p>
                      </div>

                      <div class="shrink-0 flex items-center gap-1.5">
                        {#if it.evidencePhoto && it.evidencePhoto.trim() !== ""}
                          <span
                            class="bg-[#1c120c] text-[#ffd700] font-pixel text-[6px] px-1 py-0.5"
                          >
                            FOTO
                          </span>
                        {/if}
                        <span
                          class="font-pixel text-[7.5px] text-[#2563eb] font-bold"
                        >
                          [BUKA]
                        </span>
                      </div>
                    </button>
                  {/each}
                </div>
              {/if}
            </div>
          {/if}
        </div>
      </div>

      <!-- Area render 7 folder Win95 Desktop -->
      <div id="cards-area" class="cards-area win95-scrollbar satpam-cards-area">
        <div class="satpam-folders-wrapper">
          <!-- Baris 1: 3 Folder Status -->
          <div class="satpam-row status-row">
            {#each ["found", "lost", "resolved"] as const as kind (kind)}
              <SatpamFolderIcon
                folderId={`folder_${kind}`}
                label={FOLDER_META[kind].label}
                {kind}
                count={satpamFolders[kind].length}
                onOpen={() => openFolderDetail(kind)}
              />
            {/each}
          </div>

          <!-- Baris 2: 4 Folder Kategori di Bawahnya -->
          <div class="satpam-row category-row">
            {#each ["gadget", "pakaian", "personal", "dokumen"] as const as kind (kind)}
              <SatpamFolderIcon
                folderId={`folder_${kind}`}
                label={FOLDER_META[kind].label}
                {kind}
                count={satpamFolders[kind].length}
                onOpen={() => openFolderDetail(kind)}
              />
            {/each}
          </div>
        </div>
      </div>

      <!-- Area avatar Satpam AI -->
      <div class="avatars-area">
        <SatpamChat />
      </div>
    </div>
  </div>
</div>

<!-- Modal Layer 2: Explorer isi folder satpam (list file + preview bukti asli) -->
{#if openFolder}
  {#key `${openFolder}_${initialItemId || ""}`}
    <SatpamFolderModal
      folderTitle={FOLDER_META[openFolder].label}
      folderPath={FOLDER_META[openFolder].path}
      folderItems={satpamFolders[openFolder]}
      initialSelectedId={initialItemId}
      onClose={closeFolderDetail}
    />
  {/key}
{/if}

<!-- Modal Layer 3: Buku Mutasi Jaga (Log Aktivitas Harian) -->
{#if isMutasiOpen}
  <SatpamMutasiModal
    onClose={() => (isMutasiOpen = false)}
    onSelectItem={openItemDetail}
  />
{/if}
