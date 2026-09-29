<script lang="ts">
  import { onMount, tick } from "svelte";
  import { fade, fly } from "svelte/transition";
  import { goto } from "$app/navigation";
  import { currentPlayer, type Player } from "$lib/stores/player.js";
  import { currentScene } from "$lib/stores/ui.js";
  import { getSocket } from "$lib/socket.js";

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
    type?: "system" | "user" | "success" | "warning" | "error" | "divider";
  }

  let lineCounter = 0;
  function createLine(text: string, type: LineItem["type"] = "system"): LineItem {
    lineCounter += 1;
    return { id: lineCounter, text, type };
  }

  const BOOT_LINES: LineItem[] = [
    createLine("==================================================", "divider"),
    createLine(" POSKO KEAMANAN - SATPAM AUTH TERMINAL [v1.0.4]", "system"),
    createLine(" (C) 1995-2026 Kampus AI Security & Systems Lab.", "system"),
    createLine("==================================================", "divider"),
    createLine(" Area terbatas. Masukkan ACCESS KEY petugas.", "system"),
    createLine(" Tekan [ENTER] untuk memverifikasi.", "system"),
    createLine("==================================================", "divider"),
  ];

  let history = $state<LineItem[]>([...BOOT_LINES]);
  let keyInput = $state("");
  let isAuthenticating = $state(false);
  let terminalBodyRef: HTMLDivElement | null = $state(null);
  let inputRef: HTMLInputElement | null = $state(null);

  async function scrollToBottom() {
    await tick();
    if (terminalBodyRef) terminalBodyRef.scrollTop = terminalBodyRef.scrollHeight;
  }

  function focusInput() {
    if (inputRef && !isAuthenticating) inputRef.focus();
  }

  // Reset terminal setiap kali modal dibuka
  $effect(() => {
    if (isOpen) {
      history = [...BOOT_LINES];
      keyInput = "";
      isAuthenticating = false;
      setTimeout(() => focusInput(), 120);
      scrollToBottom();
    }
  });

  onMount(() => {
    if (isOpen) setTimeout(() => focusInput(), 120);
  });

  async function authenticate() {
    const entered = keyInput.trim();
    if (!entered) return;

    isAuthenticating = true;
    history = [
      ...history,
      createLine("[>] MEMVERIFIKASI ACCESS KEY...", "system"),
    ];
    keyInput = "";
    scrollToBottom();

    // Verifikasi ke backend (anti-bypass: server yang menentukan valid/tidak)
    const socket = getSocket();
    if (!socket) {
      history = [
        ...history,
        createLine("[x] GAGAL: TIDAK TERHUBUNG KE SERVER POSKO.", "error"),
      ];
      isAuthenticating = false;
      scrollToBottom();
      return;
    }

    const sock = socket;

    const onSuccess = () => {
      cleanup();
      history = [
        ...history,
        createLine("[+] STATUS: OTENTIKASI BERHASIL!", "success"),
        createLine("[+] AKSES LEVEL 4 - POSKO PUSAT DIBERIKAN.", "success"),
        createLine("[>] MENGALIHKAN KE POS ARSIP...", "system"),
      ];
      scrollToBottom();
      setTimeout(() => {
        const satpamPlayer: Player = {
          name: "Pak Satpam",
          npm: "SATPAM-KOMANDAN",
          contact: "Pos Keamanan Kampus",
          gender: "male",
          avatarSeed: "OfficerBambang",
          role: "satpam",
          accessKey: entered,
        };
        currentPlayer.set(satpamPlayer);
        currentScene.set("board");
        onClose();
        goto("/arsip");
      }, 650);
    };

    const onFailed = () => {
      cleanup();
      history = [
        ...history,
        createLine("[x] ACCESS KEY SALAH / TIDAK SAH.", "error"),
        createLine("    Percobaan dicatat. Coba lagi.", "warning"),
      ];
      isAuthenticating = false;
      scrollToBottom();
      setTimeout(() => focusInput(), 100);
    };

    function cleanup() {
      sock.off("satpam_auth_success", onSuccess);
      sock.off("satpam_auth_failed", onFailed);
    }

    sock.on("satpam_auth_success", onSuccess);
    sock.on("satpam_auth_failed", onFailed);

    // Server memverifikasi key (anti-bypass)
    sock.emit("satpam_join", { accessKey: entered });

    setTimeout(() => {
      if (isAuthenticating) {
        cleanup();
        history = [
          ...history,
          createLine("[x] TIMEOUT: SERVER TIDAK MERESPONS.", "error"),
        ];
        isAuthenticating = false;
        scrollToBottom();
      }
    }, 5000);
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      authenticate();
    }
  }
</script>

{#if isOpen}
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
    aria-label="Terminal Login Satpam"
  >
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <div
      class="w-full max-w-lg bg-[#c0c0c0] border-2 border-white border-r-[#404040] border-b-[#404040] shadow-[8px_8px_0_rgba(0,0,0,0.6)] flex flex-col overflow-hidden select-none"
      transition:fly={{ y: -16, duration: 220 }}
      onclick={focusInput}
      role="region"
      aria-label="Satpam Auth Console"
    >
      <!-- Title Bar -->
      <div
        class="bg-gradient-to-r from-[#7f1d1d] via-[#b91c1c] to-[#7f1d1d] px-2.5 py-1.5 flex items-center justify-between text-white border-b-2 border-[#808080]"
      >
        <div class="flex items-center gap-2">
          <div
            class="w-3.5 h-3.5 bg-black border border-white text-[7px] font-pixel text-[#f87171] flex items-center justify-center leading-none"
          >
            !_
          </div>
          <span class="font-pixel text-[8px] md:text-[9px] tracking-wider font-bold">
            SATPAM AUTH - POSKO.EXE
          </span>
        </div>
        <div class="flex items-center gap-1">
          <button
            type="button"
            onclick={onClose}
            disabled={isAuthenticating}
            class="w-4 h-4 bg-[#c0c0c0] border border-white border-r-[#404040] border-b-[#404040] text-black hover:bg-[#dc2626] hover:text-white font-pixel text-[8px] font-bold flex items-center justify-center leading-none cursor-pointer active:border-l-[#404040] active:border-t-[#404040] transition-colors"
            aria-label="Tutup jendela login satpam"
          >
            X
          </button>
        </div>
      </div>

      <!-- Hint bar -->
      <div
        class="bg-[#dfdfdf] border-b border-[#808080] px-2 py-1 flex items-center justify-between text-[7px] md:text-[8px] font-pixel text-[#1c120c]"
      >
        <span>Masukkan <code class="font-bold text-[#b91c1c]">ACCESS KEY</code> petugas</span>
        <span class="hidden sm:inline text-stone-500 font-mono text-[9px]">[MODE: SECURE AUTH]</span>
      </div>

      <!-- Terminal body -->
      <div
        bind:this={terminalBodyRef}
        class="relative bg-[#08090a] p-3 h-[260px] md:h-[300px] overflow-y-auto font-mono text-xs md:text-sm leading-relaxed border-2 border-[#404040] border-r-white border-b-white m-1"
        style="box-shadow: inset 2px 2px 4px rgba(0,0,0,0.8);"
      >
        <div class="flex flex-col gap-0.5">
          {#each history as line (line.id)}
            <div
              class="break-words select-text {line.type === 'system'
                ? 'text-[#22c55e]'
                : line.type === 'success'
                  ? 'text-[#4ade80] font-bold'
                  : line.type === 'warning'
                    ? 'text-[#f59e0b] font-bold'
                    : line.type === 'error'
                      ? 'text-[#ef4444] font-bold'
                      : 'text-[#15803d]'}"
            >
              <pre class="whitespace-pre-wrap font-mono leading-snug">{line.text}</pre>
            </div>
          {/each}
        </div>

        <!-- Prompt input access key -->
        <div class="flex items-center gap-1.5 mt-1">
          <span class="text-[#f87171] font-bold shrink-0 font-mono text-xs md:text-sm">
            KEY&gt;
          </span>
          <input
            bind:this={inputRef}
            type="password"
            bind:value={keyInput}
            onkeydown={handleKeyDown}
            disabled={isAuthenticating}
            placeholder="••••••••"
            class="w-full bg-transparent text-[#ffffff] font-mono text-xs md:text-sm outline-none border-none p-0 tracking-widest font-medium placeholder:text-[#334155]"
            spellcheck="false"
            autocomplete="off"
          />
        </div>

        {#if isAuthenticating}
          <div class="mt-2 text-[#f59e0b] font-pixel text-[8px] animate-pulse">
            [*] MENGHUBUNGKAN KE SERVER POSKO... HARAP TUNGGU
          </div>
        {/if}
      </div>

      <!-- Action buttons -->
      <div class="flex gap-2 p-2 bg-[#dfdfdf] border-t border-[#808080]">
        <button
          type="button"
          onclick={onClose}
          disabled={isAuthenticating}
          class="flex-1 bg-[#c0c0c0] border-2 border-white border-r-[#404040] border-b-[#404040] text-[#1c120c] font-pixel text-[8px] py-2 cursor-pointer active:border-l-[#404040] active:border-t-[#404040] disabled:opacity-50"
        >
          BATAL
        </button>
        <button
          type="button"
          onclick={authenticate}
          disabled={isAuthenticating || !keyInput.trim()}
          class="flex-1 bg-[#b91c1c] hover:bg-[#991b1b] text-white border-2 border-[#7f1d1d] font-pixel text-[8px] py-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isAuthenticating ? "MEMVERIFIKASI..." : "MASUK POSKO"}
        </button>
      </div>

      <!-- Status bar -->
      <div
        class="bg-[#c0c0c0] px-2 py-1 text-[7.5px] md:text-[8px] font-pixel text-[#1c120c] flex items-center justify-between border-t border-[#808080]"
      >
        <span class="text-stone-700">STATUS: AWAITING CREDENTIALS</span>
        <span class="font-mono text-[9px] text-stone-600">SECURE V1.04</span>
      </div>
    </div>
  </div>
{/if}

<style>
  div::-webkit-scrollbar {
    width: 10px;
  }
  div::-webkit-scrollbar-track {
    background: #08090a;
  }
  div::-webkit-scrollbar-thumb {
    background: #b91c1c;
    border: 1px solid #f87171;
  }
</style>