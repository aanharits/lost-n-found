<script lang="ts">
  import { getSocket } from "$lib/socket.js";
  import { items } from "$lib/stores/items.js";
  import { activeHighlight } from "$lib/stores/ui.js";
  import Avatar from "./Avatar.svelte";
  import { fly, fade } from "svelte/transition";

  let chatOpen = $state(false);
  let chatInput = $state("");
  let chatHistory: Array<{
    role: "user" | "satpam";
    text: string;
    hasHighlight?: boolean;
    firstItemId?: string | null;
  }> = $state([]);
  let chatLoading = $state(false);
  let chatContainer = $state<HTMLElement>();
  let avatarEl = $state<HTMLElement>();

  // Konfigurasi 8-Bit Pak Satpam menggunakan DiceBear PixelArt
  const satpamOptions = {
    seed: "PakSatpamAI",
    hair: ["short01"],
    hairColor: ["28150a"],
    hat: ["variant02"],
    hatColor: ["2663a3"],
    hatProbability: 100,
    beard: ["variant01"],
    beardProbability: 100,
    clothing: ["variant01"],
    clothingColor: ["03396c"],
    skinColor: ["e0b687"],
    eyes: ["variant11"],
    mouth: ["happy01"],
  };

  // Membuka atau menutup jendela obrolan dengan Satpam AI
  function toggleChat() {
    chatOpen = !chatOpen;
    if (chatOpen) {
      setTimeout(scrollToBottom, 50);
    }
  }

  // Menggulir tampilan chat ke pesan paling bawah secara otomatis
  function scrollToBottom() {
    if (chatContainer) {
      chatContainer.scrollTop = chatContainer.scrollHeight;
    }
  }

  // Mengirim pesan pengguna ke Satpam AI melalui event socket chat_message
  async function sendChat() {
    const text = chatInput.trim();
    if (!text) return;

    chatHistory = [...chatHistory, { role: "user", text }];
    chatInput = "";
    chatLoading = true;
    scrollToBottom();

    const socket = getSocket();
    if (!socket?.connected) {
      chatHistory = [
        ...chatHistory,
        {
          role: "satpam",
          text: "Koneksi socket offline nih, coba sebentar lagi ya!",
        },
      ];
      chatLoading = false;
      scrollToBottom();
      return;
    }

    // Sertakan tag dan kategori dalam data papan untuk Satpam AI
    const boardData = $items
      .map((i) => `[${i.type.toUpperCase()} | ${i.category || 'Umum'} • ${i.tag || 'Lainnya'}] ${i.title} - Lokasi: ${i.desc}`)
      .join(" | ");
    const historyContext = chatHistory
      .slice(-6)
      .map((m) => `${m.role === "user" ? "Mahasiswa" : "Satpam AI"}: ${m.text}`)
      .join("\n");

    socket.emit("chat_message", {
      message: text,
      boardData: boardData || "Papan sedang kosong",
      historyContext,
    });

    interface ChatReplyData {
      reply: string;
      highlightTag?: string | null;
      highlightCategory?: string | null;
      highlightItemIds?: string[];
    }

    // Menunggu balasan respon dari AI dengan batas timeout 12 detik
    const replyData = await new Promise<ChatReplyData>((resolve) => {
      const timeout = setTimeout(() => {
        resolve({ reply: "Waduh, koneksi otakku lagi nge-lag nih. Coba lagi ya!" });
      }, 12000);

      socket.once("chat_reply", (data: ChatReplyData) => {
        clearTimeout(timeout);
        resolve(data);
      });
    });

    // Jika ada instruksi sorotan barang dari Satpam AI, aktifkan highlight di papan
    const hasHighlight = !!(
      (replyData.highlightItemIds && replyData.highlightItemIds.length > 0) ||
      replyData.highlightTag ||
      replyData.highlightCategory
    );

    if (hasHighlight) {
      activeHighlight.set({
        category: replyData.highlightCategory || null,
        tag: replyData.highlightTag || null,
        itemIds: replyData.highlightItemIds || [],
        source: 'satpam',
      });

      // Geser kamera papan otomatis ke kartu pertama yang disorot
      if (replyData.highlightItemIds && replyData.highlightItemIds.length > 0) {
        setTimeout(() => {
          const targetEl = document.getElementById(replyData.highlightItemIds![0]);
          if (targetEl) {
            targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 350);
      }
    }

    chatHistory = [
      ...chatHistory,
      {
        role: "satpam",
        text: replyData.reply,
        hasHighlight,
        firstItemId: replyData.highlightItemIds?.[0] || null,
      },
    ];
    chatLoading = false;
    scrollToBottom();
  }

  // Mengirim chat ketika tombol Enter ditekan
  function handleKeypress(e: KeyboardEvent) {
    if (e.key === "Enter") sendChat();
  }
</script>

<!-- Panel dialog riwayat chat Satpam AI -->
{#if chatOpen}
  <div
    role="dialog"
    aria-label="Chat Log Satpam AI"
    tabindex="-1"
    class="absolute bottom-[100%] left-1/2 transform -translate-x-1/2 mb-4 w-[320px] md:w-[390px] bg-white border-4 border-[#1c120c] shadow-[6px_6px_0px_#0c0812] rounded flex flex-col z-[300] overflow-hidden select-none"
    onclick={(e) => e.stopPropagation()}
    onkeydown={(e) => e.stopPropagation()}
    transition:fly={{ y: 15, duration: 200 }}
  >
    <!-- Header panel chat: Sesuai Screenshot Biru Nintendo -->
    <div
      class="bg-[#2563eb] text-white px-3 py-2 font-pixel text-[9px] md:text-[10px] flex justify-between items-center border-b-2 border-[#1c120c]"
    >
      <div class="flex items-center gap-2">
        <span
          class="w-2 h-2 rounded-full bg-green-400 border border-[#0c0812] animate-pulse"
        ></span>
        <span class="font-bold tracking-wider">Chat Log Satpam AI</span>
      </div>
      <button
        onclick={toggleChat}
        class="text-white hover:text-red-200 font-pixel text-xs px-1.5 py-0.5 cursor-pointer"
        type="button"
        aria-label="Tutup Chat"
      >
        ✕
      </button>
    </div>

    <!-- Area riwayat pesan: Bersih, Putih Sesuai Screenshot -->
    <div
      bind:this={chatContainer}
      class="p-3.5 max-h-[230px] overflow-y-auto font-sans text-xs flex flex-col gap-2.5 bg-white border-b-2 border-[#1c120c]"
    >
      {#if chatHistory.length === 0}
        <div
          class="text-[#1c120c] font-pixel text-[8px] text-center p-3.5 border-2 border-dashed border-[#b87d46] bg-[#fefce8] rounded leading-relaxed"
        >
          Halo! Ada barang hilang atau butuh bantuan di kampus? Ketik pertanyaan
          di bawah ya!
        </div>
      {:else}
        {#each chatHistory as msg, i}
          <div
            class="flex flex-col {msg.role === 'user'
              ? 'items-end'
              : 'items-start'}"
          >
            <span
              class="font-pixel text-[7px] mb-0.5 font-bold {msg.role === 'user'
                ? 'text-[#2563eb]'
                : 'text-[#1c120c]'}"
            >
              {msg.role === "user" ? "Kamu" : "Satpam AI"}
            </span>
            <div
              class="p-2.5 rounded-none border-2 border-[#1c120c] font-sans text-xs font-bold max-w-[88%] shadow-[2px_2px_0px_#1c120c] leading-relaxed bg-white text-[#1c120c]"
            >
              <div>{msg.text}</div>
              {#if msg.hasHighlight}
                <button
                  type="button"
                  onclick={() => {
                    if (msg.firstItemId) {
                      const el = document.getElementById(msg.firstItemId);
                      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                    chatOpen = false;
                  }}
                  class="mt-2 bg-[#ffd700] hover:bg-[#facc15] active:translate-y-0.5 text-[#1c120c] font-pixel text-[8px] py-1 px-2.5 rounded border border-[#1c120c] shadow-[1px_1px_0_#1c120c] cursor-pointer flex items-center gap-1.5 font-bold w-fit transition-all"
                >
                  <span>📍</span> LIHAT DI PAPAN
                </button>
              {/if}
            </div>
          </div>
        {/each}
        {#if chatLoading}
          <div
            class="flex flex-col items-start"
            transition:fade={{ duration: 150 }}
          >
            <span class="font-pixel text-[7px] mb-0.5 text-[#1c120c] font-bold"
              >Satpam AI</span
            >
            <div
              class="p-2 rounded-none border-2 border-[#1c120c] bg-white text-[#2563eb] font-pixel text-[8px] animate-pulse shadow-[2px_2px_0px_#1c120c] flex items-center gap-2"
            >
              <span class="w-1.5 h-1.5 rounded-full bg-[#2563eb] animate-ping"
              ></span>
              Sebentar, saya cek buku catatan posko dulu...
            </div>
          </div>
        {/if}
      {/if}
    </div>

    <!-- Input form chat: Putih Bersih dengan Tombol Biru Sesuai Screenshot -->
    <div class="p-2.5 flex gap-2 bg-white items-center">
      <input
        type="text"
        bind:value={chatInput}
        placeholder="Tanya satpam..."
        class="w-full bg-white border-2 border-[#1c120c] focus:border-[#2563eb] rounded-none py-1.5 px-2.5 text-[#1c120c] font-sans text-xs font-bold placeholder-stone-400 outline-none shadow-[inset_1px_1px_0px_rgba(0,0,0,0.1)]"
        autocomplete="off"
        onkeypress={handleKeypress}
      />
      <button
        onclick={sendChat}
        class="bg-[#2563eb] hover:bg-[#1d4ed8] active:translate-y-0.5 text-white font-pixel text-[9px] px-4 py-2 rounded-none border-2 border-[#1c120c] shadow-[2px_2px_0_#1c120c] active:shadow-none cursor-pointer shrink-0 font-bold transition-all select-none"
        type="button"
      >
        KIRIM
      </button>
    </div>
  </div>
{/if}

<!-- Pos Satpam AI: Karakter 8-Bit Interaktif di Bawah Board -->
<div class="relative flex flex-col items-center">
  <!-- Balon Dialog Petunjuk Mengambang (Pulsing Hint) -->
  {#if !chatOpen}
    <button
      type="button"
      onclick={toggleChat}
      class="absolute -top-8 left-1/2 -translate-x-1/2 bg-[#facc15] hover:bg-[#eab308] border border-[#854d0e] shadow-[0_2px_0_#713f12] px-3 py-1 rounded font-pixel text-[8px] text-[#140b05] font-bold whitespace-nowrap animate-bounce cursor-pointer select-none z-20"
    >
      TANYA SATPAM AI
    </button>
  {/if}

  <!-- Tombol Avatar Satpam 8-Bit & Meja Piket -->
  <button
    type="button"
    bind:this={avatarEl}
    onclick={toggleChat}
    aria-label="Buka Chat Satpam AI"
    class="relative group cursor-pointer focus:outline-none flex flex-col items-center transition-transform hover:-translate-y-1 select-none"
  >
    <!-- Avatar Pixel Art 8-Bit Pak Satpam (DiceBear PixelArt) -->
    <div
      class="relative w-[94px] h-[94px] rounded-t flex items-center justify-center overflow-hidden"
    >
      <Avatar seed="PakSatpamAI" size={94} options={satpamOptions} />

      <!-- Pin Lencana Emas 8-Bit di Topi Satpam -->
      <div
        class="absolute top-[12px] left-1/2 -translate-x-1/2 w-2.5 h-2 bg-[#ffd700] border border-[#78350f] shadow-[0_1px_0px_#78350f] pointer-events-none"
      ></div>
    </div>

    <!-- Meja / Pos Piket Satpam 8-Bit (Nintendo Pod Style) -->
    <div
      class="relative -mt-2.5 z-10 flex items-center gap-1.5 bg-[#120f20] border border-[#2d2244] shadow-[inset_0_1px_0_rgba(255,255,255,0.18),_2px_2px_0px_#06040a] px-3 py-1 rounded-md group-hover:bg-[#1f1730] transition-colors"
    >
      <span
        class="w-1.5 h-1.5 rounded-full bg-green-400 border border-[#0c0812] animate-pulse"
      ></span>
      <span
        class="font-pixel text-[8px] md:text-[9px] text-[#f8fafc] font-bold tracking-wide"
        style="text-shadow: 1px 1px 0 #000;"
      >
        SATPAM AI
      </span>
    </div>
  </button>
</div>
