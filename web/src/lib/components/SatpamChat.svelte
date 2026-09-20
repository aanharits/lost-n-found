<script lang="ts">
  import { onMount } from 'svelte';
  import { getSocket } from '$lib/socket.js';
  import { items } from '$lib/stores/items.js';
  import Avatar from './Avatar.svelte';
  import { fly, fade } from 'svelte/transition';

  let chatOpen = $state(false);
  let chatInput = $state('');
  let chatHistory: Array<{ role: 'user' | 'satpam'; text: string }> = $state([]);
  let chatLoading = $state(false);
  let chatContainer = $state<HTMLElement>();

  // Offset koordinat pupil mata avatar
  let eyeOffsetX = $state(0);
  let eyeOffsetY = $state(0);
  let avatarEl = $state<HTMLElement>();

  // Melacak pergerakan kursor mouse agar mata avatar mengikuti arah kursor
  onMount(() => {
    function handleMouseMove(e: MouseEvent) {
      if (!avatarEl) return;
      const rect = avatarEl.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const dx = e.clientX - centerX;
      const dy = e.clientY - centerY;

      // Batasi jarak pergerakan mata maksimal 3px
      eyeOffsetX = Math.max(-3, Math.min(3, dx / 80));
      eyeOffsetY = Math.max(-3, Math.min(3, dy / 80));
    }

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  });

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
      chatHistory = [...chatHistory, { role: 'satpam', text: 'Socket offline nih, coba lagi ya!' }];
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
    class="absolute bottom-[100%] left-1/2 transform -translate-x-1/2 mb-8 mc-block w-[300px] md:w-[380px] bg-white flex flex-col z-[300]"
    onclick={(e) => e.stopPropagation()}
    onkeydown={(e) => e.stopPropagation()}
    transition:fly={{ y: 20, duration: 250 }}
  >
    <!-- Header panel chat -->
    <div class="bg-blue-600 text-white p-2 font-pixel text-[10px] flex justify-between items-center border-b-4 border-black">
      <span>Chat Log Satpam AI</span>
      <button onclick={toggleChat} class="text-white hover:text-red-300" type="button">X</button>
    </div>
    <!-- Area riwayat pesan -->
    <div
      bind:this={chatContainer}
      class="p-3 max-h-[180px] overflow-y-auto font-sans text-xs flex flex-col gap-3 bg-gray-100"
    >
      {#if chatHistory.length === 0}
        <div class="text-gray-500 italic text-center font-bold">Klik input di bawah untuk menyapa Satpam AI!</div>
      {:else}
        {#each chatHistory as msg, i}
          <div class="flex flex-col {msg.role === 'user' ? 'items-end' : 'items-start'}">
            <span class="font-bold text-[10px] mb-1 {msg.role === 'user' ? 'text-blue-600' : 'text-gray-700'}">
              {msg.role === 'user' ? 'Kamu' : 'Satpam AI'}
            </span>
            <div class="p-2 mc-block max-w-[85%] font-bold {msg.role === 'user' ? 'bg-blue-200' : 'bg-white'}">
              {msg.text}
            </div>
          </div>
        {/each}
        {#if chatLoading}
          <div class="flex flex-col items-start" transition:fade={{ duration: 150 }}>
            <span class="font-bold text-[10px] mb-1 text-gray-700">Satpam AI</span>
            <div class="p-2 mc-block max-w-[85%] font-bold bg-white text-blue-500 animate-pulse">
              Hmm... bentar ya...
            </div>
          </div>
        {/if}
      {/if}
    </div>
    <!-- Input form chat -->
    <div class="p-2 flex gap-2 border-t-4 border-black bg-white">
      <input
        type="text"
        bind:value={chatInput}
        placeholder="Tanya satpam..."
        class="w-full border-2 border-black p-2 text-xs font-sans font-bold focus:outline-none bg-gray-50"
        autocomplete="off"
        onkeypress={handleKeypress}
      />
      <button onclick={sendChat} class="mc-btn bg-blue-500 text-white px-4 text-xs font-bold" type="button">Kirim</button>
    </div>
  </div>
{/if}

<!-- Avatar visual Satpam AI dengan kemampuan melacak arah kursor -->
<div
  bind:this={avatarEl}
  class="mc-avatar"
  onclick={toggleChat}
  onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') toggleChat(); }}
  role="button"
  tabindex="0"
>
  <div class="satpam-hair">
    <div class="hair-spike-1"></div>
    <div class="hair-spike-2"></div>
  </div>
  <div class="avatar-head">
    <div
      class="avatar-eye eye-left"
      style="transform: translate({eyeOffsetX}px, {eyeOffsetY}px);"
    ></div>
    <div
      class="avatar-eye eye-right"
      style="transform: translate({eyeOffsetX}px, {eyeOffsetY}px);"
    ></div>
    <div class="avatar-mouth"></div>
  </div>
  <div class="avatar-body body-blue"></div>
</div>
