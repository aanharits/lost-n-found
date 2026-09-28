<script lang="ts">
  import { currentPlayer, type Player, type UserRole } from "$lib/stores/player.js";
  import { currentScene } from "$lib/stores/ui.js";
  import Avatar from "./Avatar.svelte";
  import { fade, fly } from "svelte/transition";

  // Presets 8 Tipe Gaya Karakter Mahasiswa Game & Kampus
  const STUDENT_CHARACTERS = [
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

  // Presets Karakter Khusus Petugas Satpam Retro 8-Bit
  const SATPAM_CHARACTERS = [
    {
      seed: "OfficerBambang",
      typeName: "Komandan",
      role: "Kepala Pos Keamanan",
      gender: "male" as const,
    },
    {
      seed: "GuardPatrol",
      typeName: "Patroli",
      role: "Satpam Regu Siaga",
      gender: "male" as const,
    },
    {
      seed: "DetectiveIndra",
      typeName: "Penyidik",
      role: "Petugas Arsip Bukti",
      gender: "male" as const,
    },
    {
      seed: "CaptainSecure",
      typeName: "Posko Utama",
      role: "Operator Jaga Induk",
      gender: "male" as const,
    },
  ];

  let userRole = $state<UserRole>("student");
  let selectedIndex = $state(0);

  const activeCharacters = $derived(
    userRole === "satpam" ? SATPAM_CHARACTERS : STUDENT_CHARACTERS
  );
  let selectedChar = $derived(
    activeCharacters[selectedIndex % activeCharacters.length]
  );

  let name = $state("");
  let npm = $state("");
  let contact = $state("");
  let satpamKey = $state("satpamganteng");
  let showKey = $state(false);
  let errorMsg = $state("");

  // Beralih role
  function switchRole(role: UserRole) {
    userRole = role;
    selectedIndex = 0;
    errorMsg = "";
    if (role === "satpam" && !name) {
      name = "Pak Satpam";
    }
  }

  // Pindah ke karakter sebelumnya
  function prevChar() {
    selectedIndex =
      (selectedIndex - 1 + activeCharacters.length) % activeCharacters.length;
  }

  // Pindah ke karakter berikutnya
  function nextChar() {
    selectedIndex = (selectedIndex + 1) % activeCharacters.length;
  }

  // Memilih karakter langsung dari slot grid
  function selectChar(index: number) {
    selectedIndex = index;
  }

  // Validasi form dan navigasi ke papan board
  function submitLobby() {
    errorMsg = "";

    if (userRole === "satpam") {
      const cleanKey = satpamKey.trim();
      if (!cleanKey) {
        errorMsg = "ACCESS KEY SATPAM WAJIB DIISI!";
        return;
      }
      if (cleanKey !== "satpamganteng") {
        errorMsg = "ACCESS KEY SALAH! HANYA PETUGAS SATPAM BERWENANG YANG DAPAT MENGAKSES.";
        return;
      }

      const player: Player = {
        name: name.trim() || `Petugas ${selectedChar.typeName}`,
        npm: `SATPAM-${selectedChar.typeName.toUpperCase()}`,
        contact: "Pos Keamanan Kampus",
        gender: selectedChar.gender,
        avatarSeed: selectedChar.seed,
        role: "satpam",
        accessKey: cleanKey,
      };

      currentPlayer.set(player);
      currentScene.set("board");
      return;
    }

    // Role Mahasiswa / Umum
    if (!name.trim() || !npm.trim() || !contact.trim()) {
      errorMsg = "NAMA, NPM, DAN KONTAK WAJIB DIISI!";
      return;
    }

    let reporterToken = localStorage.getItem("lf_device_token");
    if (!reporterToken) {
      reporterToken = "tok_" + crypto.randomUUID();
      localStorage.setItem("lf_device_token", reporterToken);
    }

    const player: Player = {
      name: name.trim(),
      npm: npm.trim(),
      contact: contact.trim(),
      gender: selectedChar.gender,
      avatarSeed: selectedChar.seed,
      role: "student",
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
    class="flex items-center justify-between mb-2 px-1 select-none pointer-events-none"
  >
    <div class="flex items-center gap-2">
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

    <!-- Badge Mode Aktif -->
    <span
      class="font-pixel text-[8px] px-2 py-0.5 rounded border-2 border-[#140b05] shadow-[1px_1px_0px_#140b05] {userRole === 'satpam' ? 'bg-[#0f766e] text-white' : 'bg-[#eab308] text-[#140b05]'}"
    >
      {userRole === "satpam" ? "MODE SATPAM" : "MODE MAHASISWA"}
    </span>
  </div>

  <!-- Main Dialog Window: Papan Buletin Terang & Colorful -->
  <div
    class="relative rounded-xl border-4 border-[#1c120c] shadow-[inset_0_2px_0_rgba(255,255,255,0.25),inset_0_-4px_0_rgba(0,0,0,0.25),6px_6px_0px_#0a060f] p-4 md:p-6 select-none overflow-hidden"
    style="background: #ba804e linear-gradient(180deg, #c48956 0%, #b07746 100%);"
  >
    <!-- Background Dot Pattern Halus Cork Board -->
    <div
      class="absolute inset-0 pointer-events-none opacity-25 z-0"
      style="background-image: radial-gradient(rgba(28, 18, 12, 0.18) 15%, transparent 16%); background-size: 16px 16px;"
    ></div>

    <!-- Header Section Street Fighter Arcade Style & Role Switcher -->
    <div
      class="relative z-10 flex flex-col items-center gap-3 mb-4 pb-3 border-b-2 border-[#1c120c]/40"
    >
      <h2
        class="font-pixel text-xl sm:text-2xl md:text-3xl text-yellow-300 tracking-wider"
        style="text-shadow: 2px 2px 0 #b91c1c, 4px 4px 0 #180d05, -1px -1px 0 #f59e0b;"
      >
        {userRole === "satpam" ? "POS AKSES SATPAM" : "PILIH KARAKTER"}
      </h2>

      <!-- Switcher Role Retro 8-bit: Mahasiswa vs Petugas Satpam -->
      <div class="grid grid-cols-2 gap-2 bg-[#1c120c]/20 p-1.5 rounded-lg border-2 border-[#1c120c] shadow-[inset_1px_1px_2px_rgba(0,0,0,0.4)] max-w-sm w-full">
        <button
          type="button"
          onclick={() => switchRole("student")}
          class="py-2 px-3 rounded font-pixel text-[8px] md:text-[9px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 {userRole === 'student'
            ? 'bg-[#ffd700] text-[#1c120c] border-2 border-[#1c120c] shadow-[2px_2px_0px_#1c120c] -translate-y-0.5'
            : 'text-amber-100 hover:text-white hover:bg-white/10'}"
        >
          <span>🎓</span> MAHASISWA
        </button>
        <button
          type="button"
          onclick={() => switchRole("satpam")}
          class="py-2 px-3 rounded font-pixel text-[8px] md:text-[9px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 {userRole === 'satpam'
            ? 'bg-[#0d9488] text-white border-2 border-[#1c120c] shadow-[2px_2px_0px_#1c120c] -translate-y-0.5'
            : 'text-amber-100 hover:text-white hover:bg-white/10'}"
        >
          <span>👮</span> PETUGAS SATPAM
        </button>
      </div>
    </div>

    <!-- Main Content 2 Kolom: Card Kiri & Card Kanan -->
    <div
      class="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5 items-stretch"
    >
      <!-- Sisi Kiri: Model Karakter DiceBear Pixel Art -->
      <div
        class="bg-[#fefce8] border-3 border-[#1c120c] shadow-[4px_4px_0px_#0a060f] rounded-lg p-4 md:p-5 flex flex-col justify-between"
      >
        <!-- Header Panel Kiri -->
        <div
          class="flex items-center justify-between pb-2.5 mb-2 border-b-2 border-[#1c120c] font-pixel text-[9px] md:text-[10px] font-bold text-[#1c120c]"
        >
          <span>
            {userRole === "satpam" ? "SERAGAM SATPAM" : "MODEL AVATAR"}
            <span class="text-[#0284c7]">[{selectedIndex + 1}/{activeCharacters.length}]</span>
          </span>
          <span
            class="px-2 py-0.5 border-2 border-[#1c120c] shadow-[1px_1px_0px_#1c120c] text-white font-bold {userRole === 'satpam' ? 'bg-[#0f766e]' : selectedChar.gender === 'female' ? 'bg-[#f43f5e]' : 'bg-[#0284c7]'}"
          >
            {userRole === "satpam" ? "KEAMANAN" : selectedChar.gender === "female" ? "PEREMPUAN" : "LAKI-LAKI"}
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

            <!-- Glowing 8-Bit Pedestal Platform -->
            <div
              class="w-16 h-2 rounded-full {userRole === 'satpam' ? 'bg-[#14b8a6]' : 'bg-[#f59e0b]'} border-2 border-[#1c120c] shadow-[0_2px_0px_#1c120c]"
            ></div>

            <div class="text-center mt-2 w-full">
              <p
                class="font-pixel text-[10px] md:text-[11px] text-[#1c120c] font-bold tracking-wide truncate"
              >
                {name.trim() ? name.trim().toUpperCase() : (userRole === "satpam" ? "PAK SATPAM" : "NAMA ANDA")}
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

        <!-- Grid Mini Slot Karakter -->
        <div class="pt-2.5 border-t-2 border-[#1c120c]">
          <div class="grid {userRole === 'satpam' ? 'grid-cols-4' : 'grid-cols-4'} gap-1.5">
            {#each activeCharacters as char, i}
              <button
                type="button"
                onclick={() => selectChar(i)}
                class="relative p-1 rounded border-2 border-[#1c120c] transition-all cursor-pointer select-none flex flex-col items-center {selectedIndex === i
                  ? (userRole === 'satpam' ? 'bg-[#2dd4bf] shadow-[2px_2px_0px_#1c120c] -translate-y-0.5' : 'bg-[#ffd700] shadow-[2px_2px_0px_#1c120c] -translate-y-0.5')
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

      <!-- Sisi Kanan: Form Data Sesuai Role -->
      <div
        class="bg-[#fefce8] border-3 border-[#1c120c] shadow-[4px_4px_0px_#0a060f] rounded-lg p-4 md:p-5 flex flex-col justify-between gap-3"
      >
        <!-- Header Panel Kanan -->
        <div
          class="pb-2.5 border-b-2 border-[#1c120c] font-pixel text-[9px] md:text-[10px] font-bold text-[#1c120c] flex items-center justify-between"
        >
          <span>{userRole === "satpam" ? "IDENTITAS PETUGAS SATPAM" : "DATA IDENTITAS MAHASISWA"}</span>
          {#if userRole === "satpam"}
            <span class="text-[7.5px] bg-[#0d9488] text-white px-1.5 py-0.5 rounded font-mono font-bold">
              ROLE: SATPAM
            </span>
          {/if}
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
                {name.trim() ? name.trim().toUpperCase() : (userRole === "satpam" ? "PAK SATPAM" : "NAMA MAHASISWA")}
              </span>
              <span
                class="font-pixel text-[7px] text-white px-1.5 py-0.5 rounded border border-[#1c120c] font-bold {userRole === 'satpam' ? 'bg-[#0f766e]' : selectedChar.gender === 'female' ? 'bg-[#f43f5e]' : 'bg-[#0284c7]'}"
              >
                {userRole === "satpam" ? "SATPAM" : selectedChar.gender === "female" ? "P" : "L"}
              </span>
            </div>
            <span
              class="font-sans text-[11px] text-stone-700 font-bold truncate"
            >
              {selectedChar.typeName} &bull; {selectedChar.role}
            </span>
          </div>
        </div>

        <!-- Form Input Sesuai Role -->
        {#if userRole === "satpam"}
          <!-- FORM PETUGAS SATPAM -->
          <div class="flex flex-col gap-3">
            <!-- Nama Petugas -->
            <div class="flex flex-col gap-1">
              <label
                for="lobby-satpam-name"
                class="font-pixel text-[8px] md:text-[9px] text-[#1c120c] font-bold flex items-center justify-between"
              >
                <span>NAMA PETUGAS</span>
                <span class="text-stone-500 font-sans text-[10px] font-bold">(opsional)</span>
              </label>
              <input
                id="lobby-satpam-name"
                type="text"
                bind:value={name}
                class="w-full bg-white border-3 border-[#1c120c] focus:border-[#0d9488] rounded py-2 px-3 text-[#1c120c] font-sans text-xs md:text-sm font-bold placeholder-stone-400 shadow-[inset_2px_2px_0px_rgba(0,0,0,0.12)] outline-none transition-all"
                placeholder="Contoh: Pak Bambang / Regu Siaga"
              />
            </div>

            <!-- Access Key Satpam (default: satpamganteng) -->
            <div class="flex flex-col gap-1">
              <label
                for="lobby-satpam-key"
                class="font-pixel text-[8px] md:text-[9px] text-[#1c120c] font-bold flex items-center justify-between"
              >
                <span>ACCESS KEY SATPAM</span>
                <span class="text-red-600 font-sans text-xs font-black">*</span>
              </label>
              <div class="relative">
                <input
                  id="lobby-satpam-key"
                  type={showKey ? "text" : "password"}
                  bind:value={satpamKey}
                  class="w-full bg-white border-3 border-[#1c120c] focus:border-[#0d9488] rounded py-2 pl-3 pr-10 text-[#1c120c] font-sans text-xs md:text-sm font-bold placeholder-stone-400 shadow-[inset_2px_2px_0px_rgba(0,0,0,0.12)] outline-none transition-all"
                  placeholder="Masukkan access key (default: satpamganteng)"
                />
                <button
                  type="button"
                  onclick={() => showKey = !showKey}
                  class="absolute right-2 top-1/2 -translate-y-1/2 text-stone-500 hover:text-black font-pixel text-[8px] px-1 py-0.5 rounded cursor-pointer"
                  title={showKey ? "Sembunyikan" : "Tampilkan"}
                >
                  {showKey ? "HIDE" : "SHOW"}
                </button>
              </div>
              <p class="text-[9.5px] font-sans text-stone-600 font-medium mt-0.5">
                💡 Key default: <code class="bg-stone-200 px-1 py-0.5 rounded font-mono text-[9px] font-bold text-stone-800">satpamganteng</code>
              </p>
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

          <!-- Tombol Aksi: MASUK ARSIP SATPAM -->
          <button
            onclick={submitLobby}
            type="button"
            class="relative bg-[#0d9488] hover:bg-[#0f766e] active:translate-y-0.5 text-white font-pixel text-xs md:text-sm tracking-widest py-3 px-4 rounded w-full text-center border-3 border-[#1c120c] shadow-[0_4px_0_#1c120c] active:shadow-none transition-all cursor-pointer select-none font-bold"
          >
            MASUK ARSIP SATPAM 📁
          </button>
        {:else}
          <!-- FORM MAHASISWA -->
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

          <!-- Tombol Aksi Arcade: "MASUK KE BOARD" -->
          <button
            onclick={submitLobby}
            type="button"
            class="relative bg-[#ffd700] hover:bg-[#fbbf24] active:translate-y-0.5 text-[#1c120c] font-pixel text-xs md:text-sm tracking-widest py-3 px-4 rounded w-full text-center border-3 border-[#1c120c] shadow-[0_4px_0_#1c120c] active:shadow-none transition-all cursor-pointer select-none font-bold"
          >
            MASUK KE BOARD
          </button>
        {/if}
      </div>
    </div>
  </div>
</div>
