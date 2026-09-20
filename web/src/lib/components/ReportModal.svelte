<script lang="ts">
  import { activeModal } from '$lib/stores/ui.js';
  import { items } from '$lib/stores/items.js';
  import { currentPlayer } from '$lib/stores/player.js';
  import { getSocket } from '$lib/socket.js';
  import { fade, fly } from 'svelte/transition';

  let type = $state<'lost' | 'found'>('lost');
  let name = $state('');
  let desc = $state('');
  let secretDetail = $state('');
  let date = $state('');
  let time = $state('');
  let errorMsg = $state('');
  let loading = $state(false);

  // Set nilai default tanggal dan jam ke waktu saat ini
  $effect(() => {
    const now = new Date();
    date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    time = now.toTimeString().slice(0, 5);
  });

  // Menentukan icon postingan berdasarkan kata kunci nama barang
  function getSmartEmoji(n: string): string {
    const lower = (n || '').toLowerCase();
    if (lower.includes('dompet') || lower.includes('wallet')) return '👛';
    if (lower.includes('kunci') || lower.includes('key')) return '🔑';
    if (lower.includes('hp') || lower.includes('phone') || lower.includes('handphone') || lower.includes('iphone') || lower.includes('samsung')) return '📱';
    if (lower.includes('laptop') || lower.includes('macbook') || lower.includes('notebook')) return '💻';
    if (lower.includes('tas') || lower.includes('ransel') || lower.includes('bag') || lower.includes('backpack')) return '🎒';
    if (lower.includes('botol') || lower.includes('tumbler') || lower.includes('minum') || lower.includes('flask')) return '🍶';
    if (lower.includes('ktm') || lower.includes('kartu') || lower.includes('id card') || lower.includes('card')) return '🪪';
    if (lower.includes('jaket') || lower.includes('hoodie') || lower.includes('sweater') || lower.includes('baju')) return '🧥';
    if (lower.includes('helm') || lower.includes('helmet')) return '🪖';
    if (lower.includes('payung') || lower.includes('umbrella')) return '☂️';
    if (lower.includes('jam') || lower.includes('watch')) return '⌚';
    if (lower.includes('kacamata') || lower.includes('glasses')) return '👓';
    if (lower.includes('sepatu') || lower.includes('shoes') || lower.includes('sneaker')) return '👟';
    if (lower.includes('earphone') || lower.includes('headset') || lower.includes('airpods') || lower.includes('tws')) return '🎧';
    if (lower.includes('flashdisk') || lower.includes('usb')) return '💾';
    if (lower.includes('buku') || lower.includes('catatan') || lower.includes('novel') || lower.includes('book') || lower.includes('binder')) return '📚';
    if (lower.includes('uang') || lower.includes('cash') || lower.includes('duit')) return '💵';
    return '📦';
  }

  // Menutup modal form lapor barang dan reset input
  function closeModal() {
    activeModal.set('none');
    name = '';
    desc = '';
    secretDetail = '';
    errorMsg = '';
    loading = false;
  }

  // Mengirim laporan barang baru ke server dengan icon hasil analisis AI atau lokal
  async function submitReport() {
    if (!name.trim() || !desc.trim()) {
      errorMsg = 'Nama dan Lokasi wajib diisi!';
      return;
    }
    errorMsg = '';
    loading = true;

    // Gunakan deteksi icon lokal terlebih dahulu
    let icon = getSmartEmoji(name);

    // Minta icon rekomendasi AI melalui event pick_emoji
    const socket = getSocket();
    if (socket?.connected) {
      try {
        const emojiResult = await new Promise<string>((resolve) => {
          const timeout = setTimeout(() => resolve(icon), 3000);
          socket.emit('pick_emoji', { itemName: name });
          socket.once('emoji_result', (data: { icon: string }) => {
            clearTimeout(timeout);
            resolve(data.icon || icon);
          });
        });
        icon = emojiResult;
      } catch {
        // Fallback ke icon lokal bila AI timeout
      }
    }

    loading = false;

    const boardEl = document.getElementById('board-container');
    const boardWidth = boardEl?.offsetWidth || 800;
    const boardHeight = boardEl?.offsetHeight || 500;

    const safeX = Math.max(30, Math.min(boardWidth - 170, boardWidth / 2 - 70 + (Math.random() * 80 - 40)));
    const safeY = Math.max(80, Math.min(boardHeight - 220, boardHeight / 2 - 80 + (Math.random() * 80 - 40)));

    const player = $currentPlayer;
    const newItem = {
      id: 'item' + Date.now(),
      type: type,
      title: name.trim(),
      icon,
      desc: desc.trim(),
      secretDetail: secretDetail.trim(),
      claims: [],
      resolved: false,
      date,
      time,
      reporterName: player?.name || '',
      reporterNpm: player?.npm || '',
      reporterContact: player?.contact || '',
      x: safeX,
      y: safeY,
    };

    // Broadcast item baru ke server untuk disimpan dan disebarkan ke user lain
    if (socket?.connected) {
      socket.emit('item_add', newItem);
    }

    closeModal();
  }
</script>

<div class="modal-overlay" transition:fade={{ duration: 200 }}>
  <div
    class="mc-modal-box p-5 max-w-md w-full relative flex flex-col gap-3 m-4 select-none"
    transition:fly={{ y: 30, duration: 300 }}
  >
    <!-- Pixel Corner Screws / Baut Sudut 8-Bit Solid -->
    <div class="absolute top-2.5 left-2.5 w-2.5 h-2.5 bg-[#3d2311] border border-[#d89f6b]"></div>
    <div class="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-[#3d2311] border border-[#d89f6b]"></div>
    <div class="absolute bottom-2.5 left-2.5 w-2.5 h-2.5 bg-[#3d2311] border border-[#d89f6b]"></div>
    <div class="absolute bottom-2.5 right-2.5 w-2.5 h-2.5 bg-[#3d2311] border border-[#d89f6b]"></div>

    <div class="text-center pb-2 border-b-3 border-[#2c1b0f]/30">
      <h2 class="font-pixel text-lg md:text-xl text-yellow-300 tracking-wide" style="text-shadow: 2px 2px 0 #2c1b0f, 3px 3px 0 rgba(0,0,0,0.5);">
        FORM LAPOR BARANG
      </h2>
    </div>

    <!-- Panel Form Terstruktur -->
    <div class="bg-[#9e6435] border-[3px] border-[#2c1b0f] shadow-[inset_2px_2px_0px_rgba(0,0,0,0.25)] rounded-lg p-3.5 flex flex-col gap-2.5">
      <div class="flex flex-col gap-1">
        <label for="report-status" class="mc-form-label">STATUS</label>
        <select
          id="report-status"
          bind:value={type}
          class="mc-input font-sans text-xs font-bold bg-white text-stone-900"
        >
          <option value="lost">Barang Hilang (Lost)</option>
          <option value="found">Nemu Barang (Found)</option>
        </select>
      </div>

      <div class="flex flex-col gap-1">
        <label for="report-name" class="mc-form-label">NAMA BARANG</label>
        <input
          id="report-name"
          type="text"
          bind:value={name}
          class="mc-input font-sans text-xs font-bold placeholder-stone-400"
          placeholder="Contoh: Dompet Kulit Cokelat"
        />
      </div>

      <div class="flex flex-col gap-1">
        <label for="report-location" class="mc-form-label">LOKASI HILANG / DITEMUKAN</label>
        <input
          id="report-location"
          type="text"
          bind:value={desc}
          class="mc-input font-sans text-xs font-bold placeholder-stone-400"
          placeholder="Contoh: Kantin FT, Perpustakaan Lt.2"
        />
      </div>

      <div class="flex flex-col gap-1">
        <label for="report-secret" class="mc-form-label">
          CIRI KHAS RAHASIA <span class="text-[#2c1b0f]/70 font-normal text-[8px]">(opsional)</span>
        </label>
        <textarea
          id="report-secret"
          bind:value={secretDetail}
          rows="2"
          class="mc-input font-sans text-xs font-bold resize-none placeholder-stone-400"
          placeholder="Detail yang hanya kamu ketahui (misal goresan, stiker)"
        ></textarea>
      </div>

      <div class="grid grid-cols-2 gap-2">
        <div class="flex flex-col gap-1">
          <label for="report-date" class="mc-form-label">TANGGAL</label>
          <input
            id="report-date"
            type="date"
            bind:value={date}
            class="mc-input font-sans text-xs font-bold"
          />
        </div>
        <div class="flex flex-col gap-1">
          <label for="report-time" class="mc-form-label">JAM</label>
          <input
            id="report-time"
            type="time"
            bind:value={time}
            class="mc-input font-sans text-xs font-bold"
          />
        </div>
      </div>

      {#if errorMsg}
        <div
          class="bg-red-600 border-2 border-[#2c1b0f] text-white font-pixel text-[8px] p-2 text-center rounded shadow-[2px_2px_0px_#2c1b0f]"
          transition:fly={{ y: -5, duration: 150 }}
        >
          {errorMsg}
        </div>
      {/if}

      {#if loading}
        <div
          class="text-yellow-300 font-pixel text-[9px] text-center animate-pulse py-1"
          style="text-shadow: 1px 1px 0 #000;"
          transition:fade={{ duration: 150 }}
        >
          AI Sedang Memilih Icon...
        </div>
      {/if}
    </div>

    <!-- Tombol Aksi Bawah -->
    <div class="flex gap-2.5 mt-1">
      <button
        onclick={closeModal}
        type="button"
        class="bg-[#24170e] hover:bg-[#382315] active:translate-y-0.5 text-yellow-300 font-pixel text-[10px] py-2.5 px-4 rounded w-1/2 border-2 border-[#140b05] shadow-[2px_2px_0px_#140b05] transition-all cursor-pointer text-center"
      >
        BATAL
      </button>
      <button
        onclick={submitReport}
        disabled={loading}
        type="button"
        class="bg-[#16a34a] hover:bg-[#15803d] active:translate-y-0.5 text-yellow-300 font-pixel text-[10px] py-2.5 px-4 rounded w-1/2 border-2 border-[#140b05] shadow-[2px_2px_0px_#140b05] transition-all cursor-pointer text-center"
        style="text-shadow: 1px 1px 0 #000;"
      >
        SIMPAN
      </button>
    </div>
  </div>
</div>
