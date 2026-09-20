<script lang="ts">
  import { currentPlayer, type Player } from "$lib/stores/player.js";
  import { currentScene } from "$lib/stores/ui.js";
  import Avatar from "./Avatar.svelte";
  import { fade, fly } from "svelte/transition";

  // Presets 8 Tipe Gaya Karakter Game & Kampus yang Unik dan Lucu
  const CHARACTERS = [
    { seed: "Rian", typeName: "Gamer", role: "Pro Player / Rental", gender: "male" as const },
    { seed: "Cyber", typeName: "Cyber", role: "Hacker / Skripsi IT", gender: "male" as const },
    { seed: "Dewi", typeName: "Ambis", role: "Kutu Buku / IPK 4.0", gender: "female" as const },
    { seed: "Budi", typeName: "Indie", role: "Anak Senja / Ngopi", gender: "male" as const },
    { seed: "Agus", typeName: "Sporty", role: "Anak Futsal / Gym", gender: "male" as const },
    { seed: "Ayu", typeName: "Wibu", role: "Pecinta Anime & Game", gender: "female" as const },
    { seed: "Joko", typeName: "Aktivis", role: "Anak BEM / Politisi", gender: "male" as const },
    { seed: "Siti", typeName: "Santai", role: "Kaum Titip Absen", gender: "female" as const },
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
  <!-- Main Dialog Window: Solid 8-Bit Retro Wood Plaque -->
  <div
    class="relative rounded-xl border-[5px] border-[#2c1b0f] shadow-[8px_8px_0px_rgba(0,0,0,0.5)] p-5 md:p-7 select-none bg-[#b87d46]"
  >
    <!-- Pixel Corner Screws / Baut Sudut 8-Bit Solid -->
    <div class="absolute top-3 left-3 w-3 h-3 bg-[#3d2311] border border-[#d89f6b]"></div>
    <div class="absolute top-3 right-3 w-3 h-3 bg-[#3d2311] border border-[#d89f6b]"></div>
    <div class="absolute bottom-3 left-3 w-3 h-3 bg-[#3d2311] border border-[#d89f6b]"></div>
    <div class="absolute bottom-3 right-3 w-3 h-3 bg-[#3d2311] border border-[#d89f6b]"></div>

    <!-- Header Section Minimalis & Bersih -->
    <div class="text-center mb-5 pb-3 border-b-4 border-[#2c1b0f]/30">
      <h2
        class="font-pixel text-2xl sm:text-3xl md:text-4xl text-yellow-300 tracking-wider"
        style="text-shadow: 2px 2px 0 #2c1b0f, -1px -1px 0 #2c1b0f, 1px -1px 0 #2c1b0f, -1px 1px 0 #2c1b0f, 3px 3px 0 rgba(0,0,0,0.5);"
      >
        PILIH KARAKTER
      </h2>
    </div>

    <!-- Main Content 2 Kolom Seimbang & Proporsional -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6 items-stretch">
      
      <!-- Sisi Kiri: Model Karakter DiceBear Pixel Art -->
      <div
        class="bg-[#9e6435] border-[3px] border-[#2c1b0f] shadow-[inset_3px_3px_0px_rgba(0,0,0,0.25)] rounded-lg p-4 md:p-5 flex flex-col justify-between"
      >
        <!-- Header Panel Kiri -->
        <div
          class="flex items-center justify-between pb-2.5 mb-2 border-b-2 border-[#2c1b0f]/40 font-pixel text-[9px] md:text-[10px] font-bold text-[#2c1b0f]"
        >
          <span>MODEL AVATAR [{selectedIndex + 1}/8]</span>
          <span class="bg-[#facc15] text-[#2c1b0f] px-2 py-0.5 border-2 border-[#2c1b0f] shadow-[1px_1px_0px_#2c1b0f]">
            {selectedChar.gender === 'female' ? 'PEREMPUAN' : 'LAKI-LAKI'}
          </span>
        </div>

        <!-- Stage Karakter Aktif dengan Tombol Navigasi Panah -->
        <div class="relative flex items-center justify-between my-1 px-1">
          <!-- Tombol Panah Kiri -->
          <button
            type="button"
            onclick={prevChar}
            aria-label="Karakter Sebelumnya"
            class="w-8 h-8 rounded bg-[#24170e] hover:bg-[#382315] active:translate-y-0.5 text-yellow-300 font-pixel text-xs flex items-center justify-center border-2 border-[#140b05] shadow-[2px_2px_0px_#140b05] cursor-pointer"
          >
            &#9664;
          </button>

          <!-- Showcase Avatar Aktif di Atas Pedestal -->
          <div class="flex flex-col items-center justify-center max-w-[180px]">
            <div class="h-[95px] w-[95px] flex items-center justify-center overflow-hidden my-0.5">
              <div class="scale-95 lobby-avatar-float">
                <Avatar seed={selectedChar.seed} size={90} />
              </div>
            </div>

            <!-- Solid 8-Bit Pedestal Platform -->
            <div class="w-16 h-2 rounded-full bg-[#facc15] border border-[#2c1b0f] shadow-[0_2px_0px_#2c1b0f]"></div>

            <div class="text-center mt-2 w-full">
              <p
                class="font-pixel text-[10px] md:text-[11px] text-yellow-300 font-bold tracking-wide truncate"
                style="text-shadow: 1px 1px 0 #000;"
              >
                {name.trim() ? name.trim().toUpperCase() : 'NAMA ANDA'}
              </p>
              <p class="font-sans text-[11px] text-[#fef08a] font-bold tracking-wide">
                {selectedChar.typeName} &bull; {selectedChar.role}
              </p>
            </div>
          </div>

          <!-- Tombol Panah Kanan -->
          <button
            type="button"
            onclick={nextChar}
            aria-label="Karakter Berikutnya"
            class="w-8 h-8 rounded bg-[#24170e] hover:bg-[#382315] active:translate-y-0.5 text-yellow-300 font-pixel text-xs flex items-center justify-center border-2 border-[#140b05] shadow-[2px_2px_0px_#140b05] cursor-pointer"
          >
            &#9654;
          </button>
        </div>

        <!-- Grid 8 Mini Slot Karakter -->
        <div class="pt-2.5 border-t-2 border-[#2c1b0f]/30">
          <div class="grid grid-cols-4 gap-1.5">
            {#each CHARACTERS as char, i}
              <button
                type="button"
                onclick={() => selectChar(i)}
                class="relative p-1 rounded border-2 transition-transform cursor-pointer select-none flex flex-col items-center {selectedIndex === i
                  ? 'bg-[#24170e] border-[#facc15] shadow-[2px_2px_0px_#140b05] -translate-y-0.5'
                  : 'bg-[#7d4d24] border-[#2c1b0f] shadow-[1px_1px_0px_#1f1208] hover:bg-[#8d582b]'}"
                title="{char.typeName} ({char.role})"
              >
                <div class="w-7 h-7 overflow-hidden flex items-center justify-center">
                  <div class="scale-30">
                    <Avatar seed={char.seed} size={90} />
                  </div>
                </div>
                <span class="font-pixel text-[6px] truncate w-full text-center {selectedIndex === i ? 'text-yellow-300 font-bold' : 'text-[#fef08a]'}">
                  {char.typeName}
                </span>
              </button>
            {/each}
          </div>
        </div>

      </div>

      <!-- Sisi Kanan: Form Data Mahasiswa (Rapi, Terstruktur & Tidak Melar) -->
      <div
        class="bg-[#9e6435] border-[3px] border-[#2c1b0f] shadow-[inset_3px_3px_0px_rgba(0,0,0,0.25)] rounded-lg p-4 md:p-5 flex flex-col justify-between gap-3"
      >
        <!-- Header Panel Kanan -->
        <div
          class="pb-2.5 border-b-2 border-[#2c1b0f]/40 font-pixel text-[9px] md:text-[10px] font-bold text-[#2c1b0f]"
        >
          DATA IDENTITAS MAHASISWA
        </div>

        <!-- Preview Kartu Identitas Singkat (Live Preview Nama & Tipe Karakter) -->
        <div class="bg-[#24170e] border-2 border-[#140b05] rounded-md p-2 flex items-center gap-3 shadow-[2px_2px_0px_#140b05]">
          <div class="w-8 h-8 rounded bg-[#7d4d24] border border-[#2c1b0f] flex items-center justify-center overflow-hidden shrink-0">
            <div class="scale-35">
              <Avatar seed={selectedChar.seed} size={90} />
            </div>
          </div>
          <div class="flex flex-col min-w-0">
            <div class="flex items-center gap-1.5">
              <span class="font-pixel text-[9px] text-yellow-300 font-bold truncate">
                {name.trim() ? name.trim().toUpperCase() : 'NAMA MAHASISWA'}
              </span>
              <span class="font-pixel text-[7px] bg-[#facc15] text-[#2c1b0f] px-1 rounded font-bold">
                {selectedChar.gender === 'female' ? 'P' : 'L'}
              </span>
            </div>
            <span class="font-sans text-[11px] text-[#fef08a] font-bold truncate">
              Tipe: {selectedChar.typeName} ({selectedChar.role})
            </span>
          </div>
        </div>

        <!-- Form Input Terstruktur Nyaman -->
        <div class="flex flex-col gap-3">
          <!-- Input Nama Lengkap -->
          <div class="flex flex-col gap-1">
            <label
              for="lobby-name"
              class="font-pixel text-[8px] md:text-[9px] text-[#2c1b0f] font-bold flex items-center gap-1.5"
            >
              <span>NAMA LENGKAP</span>
              <span class="text-red-800 font-sans text-xs font-black">*</span>
            </label>
            <input
              id="lobby-name"
              type="text"
              bind:value={name}
              class="w-full bg-white border-[3px] border-[#2c1b0f] focus:border-[#f59e0b] rounded py-2 px-3 text-stone-900 font-sans text-xs md:text-sm font-bold placeholder-stone-400 outline-none shadow-[inset_2px_2px_0px_rgba(0,0,0,0.15)] transition-colors"
              placeholder="Contoh: Farhan Harits"
            />
          </div>

          <!-- Input NPM & Kontak WhatsApp -->
          <div class="grid grid-cols-2 gap-3">
            <div class="flex flex-col gap-1">
              <label
                for="lobby-npm"
                class="font-pixel text-[8px] md:text-[9px] text-[#2c1b0f] font-bold flex items-center gap-1.5"
              >
                <span>NPM</span>
                <span class="text-red-800 font-sans text-xs font-black">*</span>
              </label>
              <input
                id="lobby-npm"
                type="text"
                bind:value={npm}
                class="w-full bg-white border-[3px] border-[#2c1b0f] focus:border-[#f59e0b] rounded py-2 px-3 text-stone-900 font-sans text-xs md:text-sm font-bold placeholder-stone-400 outline-none shadow-[inset_2px_2px_0px_rgba(0,0,0,0.15)] transition-colors"
                placeholder="21081010001"
              />
            </div>
            <div class="flex flex-col gap-1">
              <label
                for="lobby-contact"
                class="font-pixel text-[8px] md:text-[9px] text-[#2c1b0f] font-bold flex items-center gap-1.5"
              >
                <span>KONTAK WA</span>
                <span class="text-red-800 font-sans text-xs font-black">*</span>
              </label>
              <input
                id="lobby-contact"
                type="text"
                bind:value={contact}
                class="w-full bg-white border-[3px] border-[#2c1b0f] focus:border-[#f59e0b] rounded py-2 px-3 text-stone-900 font-sans text-xs md:text-sm font-bold placeholder-stone-400 outline-none shadow-[inset_2px_2px_0px_rgba(0,0,0,0.15)] transition-colors"
                placeholder="08123456789"
              />
            </div>
          </div>

          <!-- Pesan Error Validasi -->
          {#if errorMsg}
            <div
              class="bg-red-600 border-2 border-[#2c1b0f] text-white font-pixel text-[8px] py-1.5 px-3 text-center rounded shadow-[2px_2px_0px_#2c1b0f]"
              transition:fly={{ y: -3, duration: 120 }}
            >
              {errorMsg}
            </div>
          {/if}
        </div>

        <!-- Tombol Aksi Arcade: "MASUK KE BOARD" (Menempel Wajar Tanpa Celah Kosong) -->
        <button
          onclick={submitLobby}
          type="button"
          class="relative bg-[#24170e] hover:bg-[#342214] active:bg-[#1a0f07] text-yellow-300 font-pixel text-xs md:text-sm tracking-wider py-3.5 px-4 rounded w-full text-center border-[3px] border-[#140b05] shadow-[0_4px_0px_#140b05] active:shadow-none active:translate-y-1 transition-all cursor-pointer select-none"
          style="text-shadow: 1px 1px 0 #000;"
        >
          MASUK KE BOARD
        </button>
      </div>

    </div>
  </div>
</div>
