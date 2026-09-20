<script lang="ts">
  import { getSocket } from '$lib/socket.js';
  import { items } from '$lib/stores/items.js';
  import Avatar from './Avatar.svelte';
  import { fly, fade } from 'svelte/transition';

  let chatOpen = $state(false);
  let chatInput = $state('');
  let chatHistory: Array<{ role: 'user' | 'satpam'; text: string }> = $state([]);
  let chatLoading = $state(false);
  let chatContainer = $state<HTMLElement>();
  let avatarEl = $state<HTMLElement>();

  // Konfigurasi 8-Bit Pak Satpam menggunakan DiceBear PixelArt
  const satpamOptions = {
    seed: 'PakSatpamAI',
    hair: ['short01'],
    hairColor: ['28150a'],
    hat: ['variant02'],
    hatColor: ['2663a3'],
    hatProbability: 100,
    beard: ['variant01'],
    beardProbability: 100,
    clothing: ['variant01'],
    clothingColor: ['03396c'],
    skinColor: ['e0b687'],
    eyes: ['variant11'],
    mouth: ['happy01']
  };

  // Membuka atau menutup jendela obrolan dengan Satpam AI
  function toggleChat() {
    chatOpen = !chatOpen;
  }

  // Menggulir tampilan chat ke pesan paling bawah secara otomatis
  function scrollToBottom() {
    setTimeout(() => {
      if (chatContainer) {
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }
    }, 50);
  }

  // Mengirim pesan pengguna ke Satpam AI melalui event socket chat_message
  async function sendChat() {
    const text = chatInput.trim();
    if (!text) return;

    chatHistory = [...chatHistory, { role: 'user', text }];
    chatInput = '';
    chatLoading = true;
    scrollToBottom();

    const socket = getSocket();
    if (!socket?.connected) {
      chatHistory = [...chatHistory, { role: 'satpam', text: 'Koneksi socket offline nih, coba sebentar lagi ya!' }];
      chatLoading = false;
      scrollToBottom();
      return;
    }

    const boardData = $items.map((i) => `[${i.type.toUpperCase()}] ${i.title} - Lokasi: ${i.desc}`).join(' | ');
    const historyContext = chatHistory
      .slice(-6)
      .map((m) => `${m.role === 'user' ? 'Mahasiswa' : 'Satpam AI'}: ${m.text}`)
      .join('\n');

    socket.emit('chat_message', {
      message: text,
      boardData: boardData || 'Papan sedang kosong',
      historyContext,
    });

    // Menunggu balasan respon dari AI dengan batas timeout 12 detik
    const reply = await new Promise<string>((resolve) => {
      const timeout = setTimeout(() => {
        resolve('Waduh, koneksi otakku lagi nge-lag nih. Coba lagi ya!');
      }, 12000);

      socket.once('chat_reply', (data: { reply: string }) => {
        clearTimeout(timeout);
        resolve(data.reply);
      });
    });

    chatHistory = [...chatHistory, { role: 'satpam', text: reply }];
    chatLoading = false;
    scrollToBottom();
  }

  // Mengirim chat ketika tombol Enter ditekan
  function handleKeypress(e: KeyboardEvent) {
    if (e.key === 'Enter') sendChat();
  }
</script>

<!-- Panel dialog riwayat chat Satpam AI -->
{#if chatOpen}
  <div
    role="dialog"
    aria-label="Chat Log Satpam AI"
    tabindex="-1"
    class="absolute bottom-[100%] left-1/2 transform -translate-x-1/2 mb-4 w-[320px] md:w-[380px] bg-[#b87d46] border-[4px] border-[#2c1b0f] shadow-[6px_6px_0px_rgba(0,0,0,0.5)] rounded-lg flex flex-col z-[300] overflow-hidden"
    onclick={(e) => e.stopPropagation()}
    onkeydown={(e) => e.stopPropagation()}
    transition:fly={{ y: 15, duration: 200 }}
  >
    <!-- Header panel chat: 8-Bit Solid Wood Theme -->
    <div class="bg-[#24170e] text-yellow-300 px-3 py-2 font-pixel text-[9px] md:text-[10px] flex justify-between items-center border-b-3 border-[#140b05]">
      <div class="flex items-center gap-2">
        <span class="w-2 h-2 rounded-full bg-green-400 border border-[#140b05] animate-pulse"></span>
        <span>POSKO BANTUAN SATPAM AI</span>
      </div>
      <button
        onclick={toggleChat}
        class="text-yellow-300 hover:text-red-400 font-pixel text-xs px-1.5 py-0.5 border border-transparent hover:border-yellow-300 transition-colors cursor-pointer"
        type="button"
        aria-label="Tutup Chat"
      >
        [X]
      </button>
    </div>

    <!-- Area riwayat pesan -->
    <div
      bind:this={chatContainer}
      class="p-3 max-h-[220px] overflow-y-auto font-sans text-xs flex flex-col gap-2.5 bg-[#fefce8] border-b-3 border-[#2c1b0f]"
    >
      {#if chatHistory.length === 0}
        <div class="text-[#78350f] font-pixel text-[8px] text-center p-3 border-2 border-dashed border-[#b87d46] rounded leading-relaxed">
          Halo! Ada barang hilang atau butuh bantuan di kampus? Ketik pertanyaan di bawah ya!
        </div>
      {:else}
        {#each chatHistory as msg, i}
          <div class="flex flex-col {msg.role === 'user' ? 'items-end' : 'items-start'}">
            <span class="font-pixel text-[7px] mb-0.5 {msg.role === 'user' ? 'text-[#1e3a8a]' : 'text-[#78350f]'}">
              {msg.role === 'user' ? 'Kamu' : 'Satpam AI'}
            </span>
            <div
              class="p-2 rounded border-2 font-sans text-xs font-bold max-w-[88%] shadow-[2px_2px_0px_rgba(0,0,0,0.15)] {msg.role === 'user'
                ? 'bg-[#24170e] text-yellow-300 border-[#140b05]'
                : 'bg-white text-[#2c1b0f] border-[#2c1b0f]'}"
            >
              {msg.text}
            </div>
          </div>
        {/each}
        {#if chatLoading}
          <div class="flex flex-col items-start" transition:fade={{ duration: 150 }}>
            <span class="font-pixel text-[7px] mb-0.5 text-[#78350f]">Satpam AI</span>
            <div class="p-2 rounded border-2 border-[#2c1b0f] bg-white text-[#b87d46] font-pixel text-[8px] animate-pulse">
              Sebentar, saya cek buku catatan posko dulu...
            </div>
          </div>
        {/if}
      {/if}
    </div>

    <!-- Input form chat -->
    <div class="p-2.5 flex gap-2 bg-[#9e6435]">
      <input
        type="text"
        bind:value={chatInput}
        placeholder="Tanya info barang / bantuan..."
        class="w-full bg-white border-[3px] border-[#2c1b0f] focus:border-[#f59e0b] rounded py-1.5 px-2.5 text-stone-900 font-sans text-xs font-bold placeholder-stone-400 outline-none shadow-[inset_2px_2px_0px_rgba(0,0,0,0.15)]"
        autocomplete="off"
        onkeypress={handleKeypress}
      />
      <button
        onclick={sendChat}
        class="bg-[#24170e] hover:bg-[#382315] active:translate-y-0.5 text-yellow-300 font-pixel text-[9px] px-3.5 py-1.5 rounded border-2 border-[#140b05] shadow-[2px_2px_0px_#140b05] cursor-pointer shrink-0"
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
      class="absolute -top-7 left-1/2 -translate-x-1/2 bg-[#fef08a] border-2 border-[#2c1b0f] shadow-[2px_2px_0px_#2c1b0f] px-2 py-0.5 rounded font-pixel text-[7px] text-[#2c1b0f] font-bold whitespace-nowrap animate-bounce hover:bg-yellow-200 cursor-pointer select-none"
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
    <div class="relative w-[76px] h-[76px] rounded-t flex items-center justify-center overflow-hidden">
      <Avatar seed="PakSatpamAI" size={76} options={satpamOptions} />
      
      <!-- Pin Lencana Emas 8-Bit di Topi Satpam -->
      <div class="absolute top-[10px] left-1/2 -translate-x-1/2 w-2 h-1.5 bg-[#facc15] border border-[#78350f] shadow-[0_1px_0px_#78350f] pointer-events-none"></div>
    </div>

    <!-- Meja / Pos Piket Satpam 8-Bit -->
    <div class="relative -mt-2 z-10 flex items-center gap-1.5 bg-[#24170e] border-2 border-[#140b05] px-2.5 py-0.5 rounded shadow-[2px_2px_0px_#140b05] group-hover:border-[#facc15] transition-colors">
      <span class="w-1.5 h-1.5 rounded-full bg-green-400 border border-[#140b05] animate-pulse"></span>
      <span
        class="font-pixel text-[7px] md:text-[8px] text-yellow-300 font-bold tracking-wide"
        style="text-shadow: 1px 1px 0 #000;"
      >
        SATPAM AI
      </span>
    </div>
  </button>
</div>
