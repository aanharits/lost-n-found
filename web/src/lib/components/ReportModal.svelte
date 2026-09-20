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

<div class="modal-overlay backdrop-blur-xs" transition:fade={{ duration: 150 }}>
  <div
    class="relative max-w-md w-full m-4 border-4 border-[#1c120c] shadow-[inset_0_2px_0_rgba(255,255,255,0.25),inset_0_-4px_0_rgba(0,0,0,0.25),6px_6px_0px_#0a060f] rounded-lg p-5 select-none flex flex-col gap-3.5"
    style="background: #ba804e linear-gradient(180deg, #c48956 0%, #b07746 100%);"
    transition:fly={{ y: 20, duration: 250 }}
  >
    <!-- Header Modal: Modern Minimalist Nintendo Title Bar -->
    <div class="flex items-center justify-between pb-3 border-b-2 border-[#1c120c]/40">
      <h2
        class="font-pixel text-xs md:text-sm text-white tracking-wider font-bold"
        style="text-shadow: 2px 2px 0 #1c120c;"
      >
        FORM LAPOR BARANG
      </h2>
      <button
        onclick={closeModal}
        class="text-[#1c120c] hover:text-red-600 font-pixel text-xs px-2 py-0.5 rounded bg-white hover:bg-red-100 border-2 border-[#1c120c] transition-colors cursor-pointer font-bold shadow-[2px_2px_0_#1c120c] active:translate-y-0.5"
        type="button"
        aria-label="Tutup"
      >
        ✕
      </button>
    </div>

    <!-- Panel Form Minimalis Modern 8-Bit Terang -->
    <div class="bg-[#fefce8] border-2 border-[#1c120c] shadow-[inset_0_2px_4px_rgba(0,0,0,0.06)] rounded p-3.5 md:p-4 flex flex-col gap-3">
      
      <!-- Segmented Status Switcher (Lost vs Found) -->
      <div class="flex flex-col gap-1.5">
        <span class="font-pixel text-[8px] md:text-[9px] text-[#1c120c] font-bold">STATUS BARANG</span>
        <div class="grid grid-cols-2 gap-2 bg-white p-1 rounded border-2 border-[#1c120c]">
          <button
            type="button"
            onclick={() => type = 'lost'}
            class="py-2 px-3 rounded font-pixel text-[8px] md:text-[9px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 {type === 'lost'
              ? 'bg-[#dc2626] text-white shadow-[0_2px_0_#991b1b]'
              : 'text-stone-600 hover:text-black hover:bg-stone-100'}"
          >
            <span>[!]</span> BARANG HILANG
          </button>
          <button
            type="button"
            onclick={() => type = 'found'}
            class="py-2 px-3 rounded font-pixel text-[8px] md:text-[9px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 {type === 'found'
              ? 'bg-[#16a34a] text-white shadow-[0_2px_0_#14532d]'
              : 'text-stone-600 hover:text-black hover:bg-stone-100'}"
          >
            <span>[✓]</span> NEMU BARANG
          </button>
        </div>
      </div>

      <!-- Input Nama Barang -->
      <div class="flex flex-col gap-1">
        <label for="report-name" class="font-pixel text-[8px] md:text-[9px] text-[#1c120c] font-bold flex items-center justify-between">
          <span>NAMA BARANG</span>
          <span class="text-red-600 font-sans text-xs font-black">*</span>
        </label>
        <input
          id="report-name"
          type="text"
          bind:value={name}
          class="bg-white border-2 border-[#1c120c] focus:border-[#2563eb] text-[#1c120c] rounded py-2 px-3 font-sans text-xs md:text-sm font-bold placeholder-stone-400 shadow-[inset_1px_1px_0_rgba(0,0,0,0.1)] outline-none transition-all"
          placeholder="Contoh: Dompet Kulit Cokelat"
        />
      </div>

      <!-- Input Lokasi -->
      <div class="flex flex-col gap-1">
        <label for="report-location" class="font-pixel text-[8px] md:text-[9px] text-[#1c120c] font-bold flex items-center justify-between">
          <span>LOKASI HILANG / DITEMUKAN</span>
          <span class="text-red-600 font-sans text-xs font-black">*</span>
        </label>
        <input
          id="report-location"
          type="text"
          bind:value={desc}
          class="bg-white border-2 border-[#1c120c] focus:border-[#2563eb] text-[#1c120c] rounded py-2 px-3 font-sans text-xs md:text-sm font-bold placeholder-stone-400 shadow-[inset_1px_1px_0_rgba(0,0,0,0.1)] outline-none transition-all"
          placeholder="Contoh: Kantin FT, Perpustakaan Lt.2"
        />
      </div>

      <!-- Input Ciri Khas Rahasia -->
      <div class="flex flex-col gap-1">
        <label for="report-secret" class="font-pixel text-[8px] md:text-[9px] text-[#1c120c] font-bold flex items-center justify-between">
          <span>CIRI KHAS RAHASIA</span>
          <span class="text-stone-500 font-sans text-[10px] font-bold">(opsional verifikasi AI)</span>
        </label>
        <textarea
          id="report-secret"
          bind:value={secretDetail}
          rows="2"
          class="bg-white border-2 border-[#1c120c] focus:border-[#2563eb] text-[#1c120c] rounded py-2 px-3 font-sans text-xs md:text-sm font-bold resize-none placeholder-stone-400 shadow-[inset_1px_1px_0_rgba(0,0,0,0.1)] outline-none transition-all"
          placeholder="Detail khusus untuk verifikasi klaim (misal: stiker, warna gantungan)"
        ></textarea>
      </div>

      <!-- Tanggal & Jam Input -->
      <div class="grid grid-cols-2 gap-2.5">
        <div class="flex flex-col gap-1">
          <label for="report-date" class="font-pixel text-[8px] md:text-[9px] text-[#1c120c] font-bold">TANGGAL</label>
          <input
            id="report-date"
            type="date"
            bind:value={date}
            class="bg-white border-2 border-[#1c120c] focus:border-[#2563eb] text-[#1c120c] rounded py-1.5 px-2.5 font-sans text-xs font-bold shadow-[inset_1px_1px_0_rgba(0,0,0,0.1)] outline-none transition-all"
          />
        </div>
        <div class="flex flex-col gap-1">
          <label for="report-time" class="font-pixel text-[8px] md:text-[9px] text-[#1c120c] font-bold">JAM</label>
          <input
            id="report-time"
            type="time"
            bind:value={time}
            class="bg-white border-2 border-[#1c120c] focus:border-[#2563eb] text-[#1c120c] rounded py-1.5 px-2.5 font-sans text-xs font-bold shadow-[inset_1px_1px_0_rgba(0,0,0,0.1)] outline-none transition-all"
          />
        </div>
      </div>

      <!-- Pesan Error Validasi -->
      {#if errorMsg}
        <div
          class="bg-red-100 border-2 border-red-600 text-red-800 font-pixel text-[8px] py-2 px-3 text-center rounded shadow-sm font-bold"
          transition:fly={{ y: -5, duration: 150 }}
        >
          {errorMsg}
        </div>
      {/if}

      <!-- Status Loading AI -->
      {#if loading}
        <div
          class="text-[#2563eb] font-pixel text-[8px] md:text-[9px] text-center animate-pulse py-1 flex items-center justify-center gap-1.5 font-bold"
          transition:fade={{ duration: 150 }}
        >
          <span class="w-2 h-2 rounded-full bg-[#2563eb] animate-ping"></span>
          AI SEDANG MEMILIH ICON PIXEL...
        </div>
      {/if}
    </div>

    <!-- Tombol Aksi Bawah Minimalis Modern Nintendo -->
    <div class="flex gap-2.5 mt-1">
      <button
        onclick={closeModal}
        type="button"
        class="bg-white hover:bg-slate-100 active:translate-y-0.5 text-[#1c120c] font-pixel text-[9px] md:text-[10px] py-2.5 px-4 rounded w-1/2 border-2 border-[#1c120c] shadow-[2px_2px_0_#1c120c] active:shadow-none transition-all cursor-pointer text-center font-bold"
      >
        BATAL
      </button>
      <button
        onclick={submitReport}
        disabled={loading}
        type="button"
        class="bg-[#ffd700] hover:bg-[#fbbf24] active:translate-y-0.5 text-[#1c120c] font-pixel text-[9px] md:text-[10px] py-2.5 px-4 rounded w-1/2 border-2 border-[#1c120c] shadow-[2px_2px_0_#1c120c] active:shadow-none transition-all cursor-pointer text-center font-bold tracking-wider"
      >
        SIMPAN
      </button>
    </div>
  </div>
</div>
