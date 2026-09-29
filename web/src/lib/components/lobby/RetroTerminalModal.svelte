<script lang="ts">
  import { onMount, tick } from "svelte";
  import { fade, fly } from "svelte/transition";
  import { items } from "$lib/stores/items.js";

  let {
    isOpen = false,
    onClose,
  }: {
    isOpen: boolean;
    onClose: () => void;
  } = $props();

  interface LineItem {
    id: number;
    text: string;
    type?: "system" | "user" | "success" | "warning" | "error" | "matrix" | "divider";
  }

  let lineCounter = 0;
  function createLine(
    text: string,
    type: LineItem["type"] = "system"
  ): LineItem {
    lineCounter += 1;
    return { id: lineCounter, text, type };
  }

  const WELCOME_LINES: LineItem[] = [
    createLine("==================================================================", "divider"),
    createLine(" KAMPUS LOST & FOUND - RETRO PLAYGROUND CLI [v1.0.4]", "system"),
    createLine(" (C) 1995-2026 Kampus AI Security & Systems Laboratory.", "system"),
    createLine("==================================================================", "divider"),
    createLine(" Selamat datang di terminal interaktif Playground!", "system"),
    createLine(" Ketik 'help'  untuk melihat daftar perintah resmi.", "system"),
    createLine(" Ketik 'arch'  untuk melihat arsitektur AI, ZKP & Gale-Shapley.", "system"),
    createLine(" Ketik 'rules' untuk membaca SOP posko Lost & Found kampus.", "system"),
    createLine("==================================================================", "divider"),
  ];

  let history = $state<LineItem[]>([...WELCOME_LINES]);
  let currentInput = $state("");
  let commandHistory = $state<string[]>([]);
  let historyIndex = $state<number>(-1);
  let isAuthenticating = $state(false);

  let terminalBodyRef: HTMLDivElement | null = $state(null);
  let inputRef: HTMLInputElement | null = $state(null);

  // Auto-scroll ke baris paling bawah saat output bertambah
  async function scrollToBottom() {
    await tick();
    if (terminalBodyRef) {
      terminalBodyRef.scrollTop = terminalBodyRef.scrollHeight;
    }
  }

  // Fokuskan kembali input jika klik di area mana saja dalam terminal
  function focusInput() {
    if (inputRef && !isAuthenticating) {
      inputRef.focus();
    }
  }

  onMount(() => {
    if (isOpen) {
      setTimeout(() => focusInput(), 100);
    }
  });

  $effect(() => {
    if (isOpen) {
      setTimeout(() => focusInput(), 100);
      scrollToBottom();
    }
  });

  // Eksekusi baris perintah
  function executeCommand(rawCmd: string) {
    const trimmed = rawCmd.trim();
    if (!trimmed) {
      history = [...history, createLine("C:\\KAMPUS> ", "user")];
      scrollToBottom();
      return;
    }

    // Rekam riwayat perintah untuk navigasi panah Atas/Bawah
    commandHistory = [...commandHistory, trimmed];
    historyIndex = commandHistory.length;

    // Cetak input pengguna
    history = [...history, createLine(`C:\\KAMPUS> ${trimmed}`, "user")];

    const lower = trimmed.toLowerCase();
    const args = lower.split(" ");
    const command = args[0];

    // Perintah umum
    switch (command) {
      case "help":
      case "?":
        history = [
          ...history,
          createLine("DAFTAR PERINTAH RESMI (COMMAND LIST):", "system"),
          createLine("----------------------------------------------------------", "divider"),
          createLine("  help        - Tampilkan daftar perintah terminal ini", "system"),
          createLine("  rules       - Tata tertib & SOP posko Lost & Found kampus", "system"),
          createLine("  arch        - Arsitektur teknologi (ZKP, Full AI, Gale-Shapley)", "system"),
          createLine("  stats       - Ringkasan data barang & laporan posko real-time", "system"),
          createLine("  roll        - Lempar dadu acak d100 (mini-game keberuntungan)", "system"),
          createLine("  matrix      - Tampilkan animasi kode retro digital rain", "system"),
          createLine("  date        - Tampilkan waktu & sinkronisasi jam posko", "system"),
          createLine("  ping        - Tes koneksi jaringan & latensi posko", "system"),
          createLine("  echo [teks] - Mencetak kembali teks yang Anda masukkan", "system"),
          createLine("  cls / clear - Bersihkan tampilan layar konsol", "system"),
          createLine("  exit        - Menutup jendela Playground", "system"),
          createLine("----------------------------------------------------------", "divider"),
        ];
        break;

      case "rules":
        history = [
          ...history,
          createLine("TATA TERTIB & SOP POSKO LOST & FOUND KAMPUS:", "system"),
          createLine("----------------------------------------------------------", "divider"),
          createLine("1. PRINSIP KEJUJURAN & INTEGRITAS", "system"),
          createLine("   Seluruh laporan barang temuan atau kehilangan wajib", "system"),
          createLine("   mencantumkan data faktual tanpa rekayasa.", "system"),
          createLine("", "system"),
          createLine("2. VERIFIKASI BUKTI & PRIVASI CIRI KHUSUS", "system"),
          createLine("   Penemu wajib menyembunyikan ciri rahasia barang.", "system"),
          createLine("   Pengklaim harus membuktikan kepemilikan melalui uji", "system"),
          createLine("   ZKP atau pertanyaan verifikasi yang telah dienkripsi.", "system"),
          createLine("", "system"),
          createLine("3. PENYELESAIAN SENGKETA ADIL (DISPUTE WINDOW)", "system"),
          createLine("   Jika terdapat lebih dari satu pihak yang mengklaim,", "system"),
          createLine("   sistem menjalankan resolusi matematis Gale-Shapley", "system"),
          createLine("   secara transparan demi mencegah saling serobot.", "system"),
          createLine("", "system"),
          createLine("4. PENGAMBILAN FISIK BARANG", "system"),
          createLine("   Barang yang telah disetujui dapat diambil langsung di", "system"),
          createLine("   Pos Satpam Utama dengan menunjukkan KTM asli & kode ID.", "system"),
          createLine("----------------------------------------------------------", "divider"),
        ];
        break;

      case "arch":
      case "tech":
        history = [
          ...history,
          createLine("ARSITEKTUR TEKNOLOGI: LOST & FOUND KAMPUS AI (TRI-LAYER LOCK)", "system"),
          createLine("==========================================================", "divider"),
          createLine("[LAYER 1] ZERO-KNOWLEDGE PROOF (ZKP) - GROTH16 & SNARKJS", "success"),
          createLine("- Pengklaim membuktikan bahwa ia MENGETAHUI ciri rahasia", "system"),
          createLine("  barang (nomor seri, stiker tersembunyi, goresan mikro)", "system"),
          createLine("- Bukti zk-SNARK diverifikasi secara kriptografis tanpa", "system"),
          createLine("  pernah membocorkan teks rahasia ke publik maupun server.", "system"),
          createLine("", "system"),
          createLine("[LAYER 2] FULL AI & SEMANTIC NLP VERIFICATION", "success"),
          createLine("- Menggunakan Natural Language Processing untuk pencocokan", "system"),
          createLine("  semantik antara deskripsi laporan penemu & pengklaim.", "system"),
          createLine("- Mendeteksi anomali teks klaim guna menyaring upaya", "system"),
          createLine("  manipulasi / social engineering dari pihak tak berhak.", "system"),
          createLine("", "system"),
          createLine("[LAYER 3] GALE-SHAPLEY STABLE MATCHING (DISPUTE RESOLUTION)", "success"),
          createLine("- Menuntaskan masalah klaim ganda (multi-claimant dispute)", "system"),
          createLine("  menggunakan algoritma Deferred Acceptance (Gale-Shapley).", "system"),
          createLine("- Memberikan Dispute Window untuk mengevaluasi skor validitas", "system"),
          createLine("  ZKP + timestamp klaim, menjamin keadilan matematis", "system"),
          createLine("  (provable fairness) dan mengeliminasi deadlock.", "system"),
          createLine("", "system"),
          createLine("[REAL-TIME] PROTOKOL WEBSOCKET (SOCKET.IO)", "success"),
          createLine("- Sinkronisasi data live seketika ke seluruh klien", "system"),
          createLine("  mahasiswa dan dashboard pos arsip satpam tanpa polling.", "system"),
          createLine("==========================================================", "divider"),
        ];
        break;

      case "stats": {
        const allItems = $items;
        const total = allItems.length;
        const found = allItems.filter((i) => i.status !== "resolved" && i.type === "found").length;
        const lost = allItems.filter((i) => i.status !== "resolved" && i.type === "lost").length;
        const resolved = allItems.filter((i) => i.status === "resolved").length;
        const pendingClaims = allItems.reduce(
          (acc, i) => acc + (i.claims || []).filter((c) => c.status === "pending").length,
          0
        );

        history = [
          ...history,
          createLine("RINGKASAN METRIK SISTEM POSKO (REAL-TIME DATA):", "system"),
          createLine("----------------------------------------------------------", "divider"),
          createLine(`  TOTAL BERKAS LAPORAN : ${total} Berkas`, "system"),
          createLine(`  BARANG TEMUAN AKTIF  : ${found} Item (Siap Diklaim)`, "success"),
          createLine(`  LAPORAN HILANG AKTIF : ${lost} Laporan (Dalam Pencarian)`, "warning"),
          createLine(`  KASUS SELESAI / TEMU : ${resolved} Kasus (Arsip Selesai)`, "system"),
          createLine(`  ANTREAN KLAIM MASUK  : ${pendingClaims} Pengajuan Pending`, "system"),
          createLine("  STATUS KONEKSI PUSAT : [ONLINE - WEBSOCKET AKTIF]", "success"),
          createLine("----------------------------------------------------------", "divider"),
        ];
        break;
      }

      case "roll": {
        const rollResult = Math.floor(Math.random() * 100) + 1;
        let flavor = "Hasil lemparan standar.";
        if (rollResult === 100) flavor = "KRITIKAL MAKSIMAL! Keberuntungan tak terhingga!";
        else if (rollResult >= 80) flavor = "Luar biasa! Skor tinggi, kemungkinan barang ketemu besar!";
        else if (rollResult >= 50) flavor = "Cukup baik, pertahankan kewaspadaan barang pribadi.";
        else if (rollResult >= 20) flavor = "Waspada, selalu periksa barang bawaan sebelum pulang!";
        else flavor = "Awas, jangan sampai ketinggalan dompet atau kunci motor!";

        history = [
          ...history,
          createLine(`[DICE] Anda melempar dadu d100...`, "system"),
          createLine(`[DICE] HASIL: ${rollResult} / 100`, "success"),
          createLine(`[DICE] Catatan: ${flavor}`, "system"),
        ];
        break;
      }

      case "matrix":
        history = [
          ...history,
          createLine("01001001 01001110 01001001 01010100 01011111 01011010 01001011 01010000", "matrix"),
          createLine("[ZKP_GROTH16] > VERIFIKASI PROOF_A (0x4a9f) PROOF_B (0x1e3b)... OK", "matrix"),
          createLine("[GALE_SHAPLEY]> PREFERENCE VECTOR STABILIZED (CLAIMANT_MATCH = TRUE)", "matrix"),
          createLine("[NLP_CORE]    > SEMANTIC SIMILARITY EMBEDDING DISTANCE: 0.042 (MATCH)", "matrix"),
          createLine("[POSKO_AUDIT] > MERKLE ROOT CONFIRMED (BLOCK_ID: #4092)", "matrix"),
          createLine("01010011 01010101 01000011 01000011 01000101 01010011 01010011 00100001", "matrix"),
        ];
        break;

      case "date": {
        const now = new Date();
        const dateStr = now.toLocaleDateString("id-ID", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        });
        const timeStr = now.toLocaleTimeString("id-ID", { hour12: false });
        history = [
          ...history,
          createLine(`WAKTU POSKO : ${dateStr} - ${timeStr} WIB`, "system"),
          createLine(`SINKRONISASI: NTP SERVER KAMPUS (STRATUM 1) - AKURAT`, "success"),
        ];
        break;
      }

      case "ping":
        history = [
          ...history,
          createLine("PING server-posko.kampus.ac.id (127.0.0.1): 56 data bytes", "system"),
          createLine("64 bytes from 127.0.0.1: icmp_seq=1 ttl=64 time=0.48 ms", "system"),
          createLine("64 bytes from 127.0.0.1: icmp_seq=2 ttl=64 time=0.39 ms", "system"),
          createLine("--- statistik ping server-posko ---", "system"),
          createLine("2 paket terkirim, 2 paket diterima, 0.0% packet loss", "success"),
        ];
        break;

      case "echo": {
        const echoText = trimmed.slice(5).trim();
        history = [...history, createLine(echoText || "[echo kosong]", "system")];
        break;
      }

      case "cls":
      case "clear":
        history = [];
        break;

      case "exit":
      case "quit":
        onClose();
        break;

      default:
        history = [
          ...history,
          createLine(`Perintah tidak dikenal: '${trimmed}'`, "error"),
          createLine("Ketik 'help' untuk melihat daftar perintah yang tersedia.", "system"),
        ];
        break;
    }

    currentInput = "";
    scrollToBottom();
  }

  // Handle tombol Enter, ArrowUp, ArrowDown
  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (!isAuthenticating) {
        executeCommand(currentInput);
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (commandHistory.length > 0 && historyIndex > 0) {
        historyIndex -= 1;
        currentInput = commandHistory[historyIndex] || "";
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex < commandHistory.length - 1) {
        historyIndex += 1;
        currentInput = commandHistory[historyIndex] || "";
      } else {
        historyIndex = commandHistory.length;
        currentInput = "";
      }
    }
  }
</script>

{#if isOpen}
  <!-- Overlay Backdrop dengan efek CRT Scanline retro -->
  <div
    class="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/75 backdrop-blur-[2px]"
    transition:fade={{ duration: 180 }}
    onclick={(e) => {
      if (e.target === e.currentTarget && !isAuthenticating) onClose();
    }}
    onkeydown={(e) => {
      if (e.key === "Escape" && !isAuthenticating) onClose();
    }}
    tabindex="-1"
    role="dialog"
    aria-modal="true"
    aria-label="Jendela MS-DOS Prompt Retro Terminal"
  >
    <!-- Window Frame Klasik Windows 95 / Retro DOS Box -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <div
      class="w-full max-w-2xl bg-[#c0c0c0] border-2 border-white border-r-[#404040] border-b-[#404040] shadow-[8px_8px_0_rgba(0,0,0,0.6)] flex flex-col overflow-hidden select-none"
      transition:fly={{ y: -16, duration: 220 }}
      onclick={focusInput}
      role="region"
      aria-label="MS-DOS Console"
    >
      <!-- Title Bar Klasik Win95 (Navy Blue dengan gradient) -->
      <div
        class="bg-gradient-to-r from-[#000080] via-[#1040a0] to-[#000080] px-2.5 py-1.5 flex items-center justify-between text-white border-b-2 border-[#808080]"
      >
        <div class="flex items-center gap-2">
          <!-- Icon 8-Bit Retro Prompt -->
          <div
            class="w-3.5 h-3.5 bg-black border border-white text-[7px] font-pixel text-[#4ade80] flex items-center justify-center leading-none"
          >
            &gt;_
          </div>
          <span class="font-pixel text-[8px] md:text-[9px] tracking-wider font-bold">
            PLAYGROUND TERMINAL - LOST_N_FOUND_V1.EXE
          </span>
        </div>

        <!-- Tombol Window Controls Klasik Win95 -->
        <div class="flex items-center gap-1">
          <button
            type="button"
            class="w-4 h-4 bg-[#c0c0c0] border border-white border-r-[#404040] border-b-[#404040] text-black font-pixel text-[8px] font-bold flex items-center justify-center leading-none cursor-default active:border-l-[#404040] active:border-t-[#404040]"
            aria-label="Minimize"
          >
            _
          </button>
          <button
            type="button"
            class="w-4 h-4 bg-[#c0c0c0] border border-white border-r-[#404040] border-b-[#404040] text-black font-pixel text-[8px] font-bold flex items-center justify-center leading-none cursor-default active:border-l-[#404040] active:border-t-[#404040]"
            aria-label="Maximize"
          >
            []
          </button>
          <button
            type="button"
            onclick={onClose}
            disabled={isAuthenticating}
            class="w-4 h-4 bg-[#c0c0c0] border border-white border-r-[#404040] border-b-[#404040] text-black hover:bg-[#dc2626] hover:text-white font-pixel text-[8px] font-bold flex items-center justify-center leading-none cursor-pointer active:border-l-[#404040] active:border-t-[#404040] transition-colors"
            aria-label="Tutup jendela terminal"
          >
            X
          </button>
        </div>
      </div>

      <!-- Quick Action Toolbar / Hint Bar -->
      <div
        class="bg-[#dfdfdf] border-b border-[#808080] px-2 py-1 flex items-center justify-between text-[7px] md:text-[8px] font-pixel text-[#1c120c]"
      >
        <div class="flex items-center gap-3">
          <span>Ketik: <code class="font-bold text-[#000080]">help</code></span>
          <span class="text-stone-400">|</span>
          <span>Arsitektur: <code class="font-bold text-[#000080]">arch</code></span>
          <span class="text-stone-400">|</span>
          <span>SOP: <code class="font-bold text-[#000080]">rules</code></span>
          <span class="text-stone-400">|</span>
          <span>Data: <code class="font-bold text-[#000080]">stats</code></span>
        </div>
        <span class="hidden sm:inline text-stone-500 font-mono text-[9px]">
          [MODE: INTERACTIVE CLI]
        </span>
      </div>

      <!-- Area Layar Hitam Terminal CRT MS-DOS -->
      <div
        bind:this={terminalBodyRef}
        class="relative bg-[#08090a] p-3 h-[380px] md:h-[420px] overflow-y-auto font-mono text-xs md:text-sm leading-relaxed border-2 border-[#404040] border-r-white border-b-white m-1"
        style="box-shadow: inset 2px 2px 4px rgba(0,0,0,0.8);"
      >
        <!-- Output Riwayat Perintah -->
        <div class="flex flex-col gap-0.5">
          {#each history as line (line.id)}
            <div
              class="break-words select-text {line.type === 'system'
                ? 'text-[#22c55e]'
                : line.type === 'user'
                  ? 'text-[#ffd700] font-bold'
                  : line.type === 'success'
                    ? 'text-[#4ade80] font-bold'
                    : line.type === 'warning'
                      ? 'text-[#f59e0b] font-bold'
                      : line.type === 'error'
                        ? 'text-[#ef4444] font-bold'
                        : line.type === 'matrix'
                          ? 'text-[#10b981] font-mono text-[11px]'
                          : 'text-[#15803d]'}"
            >
              <pre class="whitespace-pre-wrap font-mono leading-snug">{line.text}</pre>
            </div>
          {/each}
        </div>

        <!-- Baris Input Prompt Interaktif -->
        <div class="flex items-center gap-1.5 mt-1">
          <span class="text-[#ffd700] font-bold shrink-0 font-mono text-xs md:text-sm">
            C:\KAMPUS&gt;
          </span>
          <div class="relative flex-1 flex items-center">
            <input
              bind:this={inputRef}
              type="text"
              bind:value={currentInput}
              onkeydown={handleKeyDown}
              disabled={isAuthenticating}
              class="w-full bg-transparent text-[#ffffff] font-mono text-xs md:text-sm outline-none border-none p-0 tracking-wide font-medium"
              spellcheck="false"
              autocomplete="off"
            />
          </div>
        </div>

        {#if isAuthenticating}
          <div class="mt-2 text-[#f59e0b] font-pixel text-[8px] animate-pulse">
            [*] MENGHUBUNGKAN KE SERVER POSKO... HARAP TUNGGU
          </div>
        {/if}
      </div>

      <!-- Status Bar Bawah Windows 95 -->
      <div
        class="bg-[#c0c0c0] px-2 py-1 text-[7.5px] md:text-[8px] font-pixel text-[#1c120c] flex items-center justify-between border-t border-[#808080]"
      >
        <span class="text-stone-700">STATUS: PLAYGROUND READY</span>
        <span class="font-mono text-[9px] text-stone-600">CLI VERSION 1.04</span>
      </div>
    </div>
  </div>
{/if}

<style>
  /* Custom scrollbar retro ala MS-DOS */
  div::-webkit-scrollbar {
    width: 10px;
  }
  div::-webkit-scrollbar-track {
    background: #08090a;
  }
  div::-webkit-scrollbar-thumb {
    background: #15803d;
    border: 1px solid #22c55e;
  }
</style>
