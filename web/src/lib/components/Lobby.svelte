<script lang="ts">
  import { currentPlayer, type Player } from "$lib/stores/player.js";
  import { currentScene } from "$lib/stores/ui.js";
  import Avatar from "./Avatar.svelte";
  import { fade, fly } from "svelte/transition";

  // Presets 8 Tipe Gaya Karakter Game & Kampus yang Unik dan Lucu
  const CHARACTERS = [
    {
      seed: "Rian",
      typeName: "Gamer",
      role: "Pro Player",
      gender: "male" as const,
    },
    {
      seed: "Cyber",
      typeName: "Cyber",
      role: "Hengker",
      gender: "male" as const,
    },
    {
      seed: "Dewi",
      typeName: "Ambis",
      role: "Kutu Buku / IPK 4.0",
      gender: "female" as const,
    },
    {
      seed: "Budi",
      typeName: "Indie",
      role: "Anak Senja / Ngopi",
      gender: "male" as const,
    },
    {
      seed: "Agus",
      typeName: "Sporty",
      role: "Anak Futsal / Gym",
      gender: "male" as const,
    },
    {
      seed: "Ayu",
      typeName: "Wibu",
      role: "Pecinta Anime",
      gender: "female" as const,
    },
    {
      seed: "Joko",
      typeName: "Aktivis",
      role: "Anak BEM / Politisi",
      gender: "male" as const,
    },
    {
      seed: "Siti",
      typeName: "Santai",
      role: "Kaum Titip Absen",
      gender: "female" as const,
    },
  ];

  let selectedIndex = $state(0);
  let selectedChar = $derived(CHARACTERS[selectedIndex]);

  let name = $state("");
  let npm = $state("");
  let contact = $state("");
  let errorMsg = $state("");

  // Pindah ke karakter sebelumnya
  function prevChar() {
    selectedIndex = (selectedIndex - 1 + CHARACTERS.length) % CHARACTERS.length;
  }

  // Pindah ke karakter berikutnya
  function nextChar() {
    selectedIndex = (selectedIndex + 1) % CHARACTERS.length;
  }

  // Memilih karakter langsung dari slot grid
  function selectChar(index: number) {
    selectedIndex = index;
  }

  // Validasi form dan navigasi ke papan board
  function submitLobby() {
    if (!name.trim() || !npm.trim() || !contact.trim()) {
      errorMsg = "NAMA, NPM, DAN KONTAK WAJIB DIISI!";
      return;
    }
    errorMsg = "";

    const player: Player = {
      name: name.trim(),
      npm: npm.trim(),
      contact: contact.trim(),
      gender: selectedChar.gender,
      avatarSeed: selectedChar.seed,
    };

    currentPlayer.set(player);
    currentScene.set("board");
  }
</script>

<div
  class="w-full max-w-3xl lg:max-w-4xl mx-auto my-auto p-4 md:p-6"
  transition:fade={{ duration: 200 }}
>
  <!-- Retro Header Bar: 3 Pixel Dots & Title Tepat di Atas Card Lobby -->
  <div
    class="flex items-center gap-2 mb-2 px-1 select-none pointer-events-none"
  >
    <div class="flex items-center gap-1.5">
      <div
        class="w-3 h-3 bg-[#e53935] border-2 border-[#140b05] shadow-[1px_1px_0px_#140b05]"
      ></div>
      <div
        class="w-3 h-3 bg-[#fbc02d] border-2 border-[#140b05] shadow-[1px_1px_0px_#140b05]"
      ></div>
      <div
        class="w-3 h-3 bg-[#00bfa5] border-2 border-[#140b05] shadow-[1px_1px_0px_#140b05]"
      ></div>
    </div>
    <span
      class="font-pixel text-[9px] md:text-[10px] text-[#fef08a] font-bold tracking-wider ml-1"
      style="text-shadow: 1px 1px 0 #140b05;"
    >
      LOST &amp; FOUND KAMPUS AI
    </span>
  </div>

  <!-- Main Dialog Window: Papan Buletin Terang & Colorful Sesuai Screenshot -->
  <div
    class="relative rounded-xl border-4 border-[#1c120c] shadow-[inset_0_2px_0_rgba(255,255,255,0.25),inset_0_-4px_0_rgba(0,0,0,0.25),6px_6px_0px_#0a060f] p-5 md:p-7 select-none overflow-hidden"
    style="background: #ba804e linear-gradient(180deg, #c48956 0%, #b07746 100%);"
  >
    <!-- Background Dot Pattern Halus Cork Board -->
    <div
      class="absolute inset-0 pointer-events-none opacity-25 z-0"
      style="background-image: radial-gradient(rgba(28, 18, 12, 0.18) 15%, transparent 16%); background-size: 16px 16px;"
    ></div>

    <!-- Header Section Street Fighter Arcade Style (Tetap Kuning Retro Sesuai Preferensi) -->
    <div
      class="relative z-10 text-center mb-5 pb-3 border-b-2 border-[#1c120c]/40"
    >
      <h2
        class="font-pixel text-2xl sm:text-3xl md:text-4xl text-yellow-300 tracking-wider"
        style="text-shadow: 2px 2px 0 #b91c1c, 4px 4px 0 #180d05, -1px -1px 0 #f59e0b;"
      >
        PILIH KARAKTER
      </h2>
    </div>

    <!-- Main Content 2 Kolom: Card Kiri & Card Kanan Terang & Colorful -->
    <div
      class="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6 items-stretch"
    >
      <!-- Sisi Kiri: Model Karakter DiceBear Pixel Art -->
      <div
        class="bg-[#fefce8] border-3 border-[#1c120c] shadow-[4px_4px_0px_#0a060f] rounded-lg p-4 md:p-5 flex flex-col justify-between"
      >
        <!-- Header Panel Kiri: Bersih, Teks Gelap Kontras dengan Tag Gender Dinamis -->
        <div
          class="flex items-center justify-between pb-2.5 mb-2 border-b-2 border-[#1c120c] font-pixel text-[9px] md:text-[10px] font-bold text-[#1c120c]"
        >
          <span
            >MODEL AVATAR <span class="text-[#0284c7]"
              >[{selectedIndex + 1}/8]</span
            ></span
          >
          <span
            class="px-2 py-0.5 border-2 border-[#1c120c] shadow-[1px_1px_0px_#1c120c] text-white font-bold {selectedChar.gender ===
            'female'
              ? 'bg-[#f43f5e]'
              : 'bg-[#0284c7]'}"
          >
            {selectedChar.gender === "female" ? "PEREMPUAN" : "LAKI-LAKI"}
          </span>
        </div>

        <!-- Stage Karakter Aktif dengan Tombol Navigasi Panah -->
        <div class="relative flex items-center justify-between my-1 px-1">
          <!-- Tombol Panah Kiri -->
          <button
            type="button"
            onclick={prevChar}
            aria-label="Karakter Sebelumnya"
            class="w-8 h-8 rounded bg-white hover:bg-slate-100 active:translate-y-0.5 text-[#1c120c] hover:text-[#0284c7] font-pixel text-xs flex items-center justify-center border-2 border-[#1c120c] shadow-[2px_2px_0px_#1c120c] cursor-pointer transition-colors"
          >
            &#9664;
          </button>

          <!-- Showcase Avatar Aktif di Atas Pedestal -->
          <div class="flex flex-col items-center justify-center max-w-[180px]">
            <div
              class="h-[95px] w-[95px] flex items-center justify-center overflow-hidden my-0.5"
            >
              <div class="scale-95 lobby-avatar-float">
                <Avatar seed={selectedChar.seed} size={90} />
              </div>
            </div>

            <!-- Glowing 8-Bit Gold Pedestal Platform -->
            <div
              class="w-16 h-2 rounded-full bg-[#f59e0b] border-2 border-[#1c120c] shadow-[0_2px_0px_#1c120c]"
            ></div>

            <div class="text-center mt-2 w-full">
              <p
                class="font-pixel text-[10px] md:text-[11px] text-[#1c120c] font-bold tracking-wide truncate"
              >
                {name.trim() ? name.trim().toUpperCase() : "NAMA ANDA"}
              </p>
              <p
                class="font-sans text-[11px] text-stone-700 font-bold tracking-wide"
              >
                {selectedChar.typeName} &bull;
                <span class="text-stone-500">{selectedChar.role}</span>
              </p>
            </div>
          </div>

          <!-- Tombol Panah Kanan -->
          <button
            type="button"
            onclick={nextChar}
            aria-label="Karakter Berikutnya"
            class="w-8 h-8 rounded bg-white hover:bg-slate-100 active:translate-y-0.5 text-[#1c120c] hover:text-[#0284c7] font-pixel text-xs flex items-center justify-center border-2 border-[#1c120c] shadow-[2px_2px_0px_#1c120c] cursor-pointer transition-colors"
          >
            &#9654;
          </button>
        </div>

        <!-- Grid 8 Mini Slot Karakter -->
        <div class="pt-2.5 border-t-2 border-[#1c120c]">
          <div class="grid grid-cols-4 gap-1.5">
            {#each CHARACTERS as char, i}
              <button
                type="button"
                onclick={() => selectChar(i)}
                class="relative p-1 rounded border-2 border-[#1c120c] transition-all cursor-pointer select-none flex flex-col items-center {selectedIndex ===
                i
                  ? 'bg-[#ffd700] shadow-[2px_2px_0px_#1c120c] -translate-y-0.5'
                  : 'bg-white shadow-[1px_1px_0px_#1c120c] hover:bg-slate-50'}"
                title="{char.typeName} ({char.role})"
              >
                <div
                  class="w-7 h-7 overflow-hidden flex items-center justify-center"
                >
                  <div class="scale-30">
                    <Avatar seed={char.seed} size={90} />
                  </div>
                </div>
                <span
                  class="font-pixel text-[6px] truncate w-full text-center font-bold text-[#1c120c]"
                >
                  {char.typeName}
                </span>
              </button>
            {/each}
          </div>
        </div>
      </div>

      <!-- Sisi Kanan: Form Data Mahasiswa -->
      <div
        class="bg-[#fefce8] border-3 border-[#1c120c] shadow-[4px_4px_0px_#0a060f] rounded-lg p-4 md:p-5 flex flex-col justify-between gap-3"
      >
        <!-- Header Panel Kanan: Putih Bersih Selaras dengan Panel Kiri -->
        <div
          class="pb-2.5 border-b-2 border-[#1c120c] font-pixel text-[9px] md:text-[10px] font-bold text-[#1c120c]"
        >
          DATA IDENTITAS MAHASISWA
        </div>

        <!-- Preview Kartu Identitas Singkat -->
        <div
          class="bg-[#fef9c3] border-2 border-[#1c120c] rounded p-2.5 flex items-center gap-3 shadow-[2px_2px_0px_#1c120c]"
        >
          <div
            class="w-8 h-8 rounded bg-white border-2 border-[#1c120c] flex items-center justify-center overflow-hidden shrink-0"
          >
            <div class="scale-35">
              <Avatar seed={selectedChar.seed} size={90} />
            </div>
          </div>
          <div class="flex flex-col min-w-0">
            <div class="flex items-center gap-1.5">
              <span
                class="font-pixel text-[9px] text-[#1c120c] font-bold truncate"
              >
                {name.trim() ? name.trim().toUpperCase() : "NAMA MAHASISWA"}
              </span>
              <span
                class="font-pixel text-[7px] text-white px-1.5 py-0.5 rounded border border-[#1c120c] font-bold {selectedChar.gender ===
                'female'
                  ? 'bg-[#f43f5e]'
                  : 'bg-[#0284c7]'}"
              >
                {selectedChar.gender === "female" ? "P" : "L"}
              </span>
            </div>
            <span
              class="font-sans text-[11px] text-stone-700 font-bold truncate"
            >
              Tipe: {selectedChar.typeName} ({selectedChar.role})
            </span>
          </div>
        </div>

        <!-- Form Input Minimalis Modern Terang -->
        <div class="flex flex-col gap-3">
          <!-- Input Nama Lengkap -->
          <div class="flex flex-col gap-1">
            <label
              for="lobby-name"
              class="font-pixel text-[8px] md:text-[9px] text-[#1c120c] font-bold flex items-center justify-between"
            >
              <span>NAMA LENGKAP</span>
              <span class="text-red-600 font-sans text-xs font-black">*</span>
            </label>
            <input
              id="lobby-name"
              type="text"
              bind:value={name}
              class="w-full bg-white border-3 border-[#1c120c] focus:border-[#2563eb] rounded py-2 px-3 text-[#1c120c] font-sans text-xs md:text-sm font-bold placeholder-stone-400 shadow-[inset_2px_2px_0px_rgba(0,0,0,0.12)] outline-none transition-all"
              placeholder="Contoh: Farhan Harits"
            />
          </div>

          <!-- Input NPM & Kontak WhatsApp -->
          <div class="grid grid-cols-2 gap-3">
            <div class="flex flex-col gap-1">
              <label
                for="lobby-npm"
                class="font-pixel text-[8px] md:text-[9px] text-[#1c120c] font-bold flex items-center justify-between"
              >
                <span>NPM</span>
                <span class="text-red-600 font-sans text-xs font-black">*</span>
              </label>
              <input
                id="lobby-npm"
                type="text"
                bind:value={npm}
                class="w-full bg-white border-3 border-[#1c120c] focus:border-[#2563eb] rounded py-2 px-3 text-[#1c120c] font-sans text-xs md:text-sm font-bold placeholder-stone-400 shadow-[inset_2px_2px_0px_rgba(0,0,0,0.12)] outline-none transition-all"
                placeholder="21081010001"
              />
            </div>
            <div class="flex flex-col gap-1">
              <label
                for="lobby-contact"
                class="font-pixel text-[8px] md:text-[9px] text-[#1c120c] font-bold flex items-center justify-between"
              >
                <span>KONTAK WA</span>
                <span class="text-red-600 font-sans text-xs font-black">*</span>
              </label>
              <input
                id="lobby-contact"
                type="text"
                bind:value={contact}
                class="w-full bg-white border-3 border-[#1c120c] focus:border-[#2563eb] rounded py-2 px-3 text-[#1c120c] font-sans text-xs md:text-sm font-bold placeholder-stone-400 shadow-[inset_2px_2px_0px_rgba(0,0,0,0.12)] outline-none transition-all"
                placeholder="08123456789"
              />
            </div>
          </div>

          <!-- Pesan Error Validasi -->
          {#if errorMsg}
            <div
              class="bg-red-100 border-2 border-red-600 text-red-800 font-pixel text-[8px] py-1.5 px-3 text-center rounded shadow-sm font-bold"
              transition:fly={{ y: -3, duration: 120 }}
            >
              {errorMsg}
            </div>
          {/if}
        </div>

        <!-- Tombol Aksi Arcade: "MASUK KE BOARD" (Sesuai Tombol Kuning Terang) -->
        <button
          onclick={submitLobby}
          type="button"
          class="relative bg-[#ffd700] hover:bg-[#fbbf24] active:translate-y-0.5 text-[#1c120c] font-pixel text-xs md:text-sm tracking-widest py-3 px-4 rounded w-full text-center border-3 border-[#1c120c] shadow-[0_4px_0_#1c120c] active:shadow-none transition-all cursor-pointer select-none font-bold"
        >
          MASUK KE BOARD
        </button>
      </div>
    </div>
  </div>
</div>
