<script lang="ts">
  import { activeModal } from '$lib/stores/ui.js';
  import { items } from '$lib/stores/items.js';
  import { currentPlayer } from '$lib/stores/player.js';
  import { getSocket } from '$lib/socket.js';
  import { matchItemByText, type CategoryId } from '$lib/constants/itemAssets.js';
  import TagIcon from './TagIcon.svelte';
  import { getNextAvailablePosition } from '$lib/utils/gridLayout.js';
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

  // Deteksi tag dan kategori secara presisi berdasarkan batas kata (word-boundary)
  function detectTagAndCategory(inputName: string): { tag: string; category: CategoryId } {
    const matched = matchItemByText(inputName);
    if (matched) {
      return { tag: matched.tag, category: matched.category };
    }
    return { tag: 'barang_pribadi_lainnya', category: 'Personal' };
  }

  const detectedInfo = $derived(detectTagAndCategory(name));

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

    const currentItems = $items || [];
    const boardEl = document.getElementById('board-container');
    const boardWidth = boardEl?.offsetWidth || (typeof window !== 'undefined' ? Math.min(1024, window.innerWidth - 32) : 1024);

    const { x: safeX, y: safeY } = getNextAvailablePosition(currentItems, boardWidth);



    const player = $currentPlayer;
    let reporterToken = localStorage.getItem('lf_device_token');
    if (!reporterToken) {
      reporterToken = 'tok_' + crypto.randomUUID();
      localStorage.setItem('lf_device_token', reporterToken);
    }
    const newItem = {
      id: 'item' + Date.now(),
      type: type,
      title: name.trim(),
      icon,
      category: detectedInfo.category,
      tag: detectedInfo.tag,
      desc: desc.trim(),
      secretDetail: secretDetail.trim(),
      claims: [],
      status: 'open',
      date,
      time,
      reporterName: player?.name || '',
      reporterNpm: player?.npm || '',
      reporterContact: player?.contact || '',
      reporterToken,
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
    class="relative max-w-md w-full m-4 bg-white border-4 border-[#1c120c] shadow-[6px_6px_0px_#0a060f] rounded flex flex-col overflow-hidden select-none"
    transition:fly={{ y: 20, duration: 250 }}
  >
    <!-- Header Modal: Modern Minimalist Nintendo Blue Title Bar -->
    <div class="bg-[#2563eb] text-white px-3.5 py-2.5 font-pixel text-[9px] md:text-[10px] flex justify-between items-center border-b-2 border-[#1c120c]">
      <div class="flex items-center gap-2">
        <span class="w-2 h-2 rounded-full bg-green-400 border border-[#0c0812] animate-pulse"></span>
        <span class="font-bold tracking-wider">FORM LAPOR BARANG</span>
      </div>
      <button
        onclick={closeModal}
        class="text-white hover:text-red-200 font-pixel text-xs px-1.5 py-0.5 cursor-pointer leading-none"
        type="button"
        aria-label="Tutup"
      >
        ✕
      </button>
    </div>

    <!-- Body Form Minimalis Modern 8-Bit Canvas -->
    <div class="p-4 md:p-5 flex flex-col gap-3.5 bg-[#f8fafc]">
      
      <!-- Segmented Status Switcher (Lost vs Found) -->
      <div class="flex flex-col gap-1.5">
        <span class="font-pixel text-[8.5px] md:text-[9.5px] text-[#1c120c] font-bold">STATUS BARANG</span>
        <div class="grid grid-cols-2 gap-2 bg-white p-1 rounded border-2 border-[#1c120c] shadow-[2px_2px_0px_#1c120c]">
          <button
            type="button"
            onclick={() => type = 'lost'}
            class="py-2 px-3 rounded font-pixel text-[8px] md:text-[9px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 {type === 'lost'
              ? 'bg-[#dc2626] text-white shadow-[1px_1px_0_#1c120c]'
              : 'text-stone-600 hover:text-black hover:bg-stone-100'}"
          >
            <span>[!]</span> BARANG HILANG
          </button>
          <button
            type="button"
            onclick={() => type = 'found'}
            class="py-2 px-3 rounded font-pixel text-[8px] md:text-[9px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 {type === 'found'
              ? 'bg-[#16a34a] text-white shadow-[1px_1px_0_#1c120c]'
              : 'text-stone-600 hover:text-black hover:bg-stone-100'}"
          >
            <span>[✓]</span> NEMU BARANG
          </button>
        </div>
      </div>

      <!-- Input Nama Barang -->
      <div class="flex flex-col gap-1">
        <label for="report-name" class="font-pixel text-[8.5px] md:text-[9.5px] text-[#1c120c] font-bold flex items-center justify-between">
          <span>NAMA BARANG</span>
          {#if name.trim()}
            <span class="text-[7px] md:text-[7.5px] text-[#2563eb] font-pixel tracking-wide truncate max-w-[200px]">
              {detectedInfo.category} • {detectedInfo.tag.toUpperCase().replace(/_/g, ' ')}
            </span>
          {/if}
        </label>
        <div class="flex items-center gap-2">
          <input
            id="report-name"
            type="text"
            bind:value={name}
            class="flex-1 bg-white border-2 border-[#1c120c] focus:border-[#2563eb] text-[#1c120c] rounded py-2 px-3 font-sans text-xs md:text-sm font-bold placeholder-stone-400 shadow-[inset_1px_1px_0_rgba(0,0,0,0.08)] outline-none transition-all"
            placeholder="Contoh: Dompet Kulit Cokelat / Kunci Motor"
          />
          <div
            class="w-10 h-10 rounded border-2 border-[#1c120c] bg-white flex items-center justify-center shrink-0 shadow-[1px_1px_0px_#1c120c]"
            title="Preview icon pixel art barang"
          >
            <TagIcon tag={detectedInfo.tag} title={name} size={28} />
          </div>
        </div>
      </div>

      <!-- Input Lokasi -->
      <div class="flex flex-col gap-1">
        <label for="report-location" class="font-pixel text-[8.5px] md:text-[9.5px] text-[#1c120c] font-bold flex items-center justify-between">
          <span>LOKASI HILANG / DITEMUKAN</span>
          <span class="text-red-600 font-sans text-xs font-black">*</span>
        </label>
        <input
          id="report-location"
          type="text"
          bind:value={desc}
          class="bg-white border-2 border-[#1c120c] focus:border-[#2563eb] text-[#1c120c] rounded py-2 px-3 font-sans text-xs md:text-sm font-bold placeholder-stone-400 shadow-[inset_1px_1px_0_rgba(0,0,0,0.08)] outline-none transition-all"
          placeholder="Contoh: Kantin FT, Perpustakaan Lt.2"
        />
      </div>

      <!-- Input Ciri Khas Rahasia -->
      <div class="flex flex-col gap-1">
        <label for="report-secret" class="font-pixel text-[8.5px] md:text-[9.5px] text-[#1c120c] font-bold flex items-center justify-between">
          <span>CIRI KHAS RAHASIA</span>
          <span class="text-stone-500 font-sans text-[10px] font-bold">(opsional verifikasi AI)</span>
        </label>
        <textarea
          id="report-secret"
          bind:value={secretDetail}
          rows="2"
          class="bg-white border-2 border-[#1c120c] focus:border-[#2563eb] text-[#1c120c] rounded py-2 px-3 font-sans text-xs md:text-sm font-bold resize-none placeholder-stone-400 shadow-[inset_1px_1px_0_rgba(0,0,0,0.08)] outline-none transition-all"
          placeholder="Detail khusus untuk verifikasi klaim (misal: stiker, warna gantungan)"
        ></textarea>
      </div>

      <!-- Tanggal & Jam Input -->
      <div class="grid grid-cols-2 gap-2.5">
        <div class="flex flex-col gap-1">
          <label for="report-date" class="font-pixel text-[8.5px] md:text-[9.5px] text-[#1c120c] font-bold">TANGGAL</label>
          <input
            id="report-date"
            type="date"
            bind:value={date}
            class="bg-white border-2 border-[#1c120c] focus:border-[#2563eb] text-[#1c120c] rounded py-1.5 px-2.5 font-sans text-xs font-bold shadow-[inset_1px_1px_0_rgba(0,0,0,0.08)] outline-none transition-all"
          />
        </div>
        <div class="flex flex-col gap-1">
          <label for="report-time" class="font-pixel text-[8.5px] md:text-[9.5px] text-[#1c120c] font-bold">JAM</label>
          <input
            id="report-time"
            type="time"
            bind:value={time}
            class="bg-white border-2 border-[#1c120c] focus:border-[#2563eb] text-[#1c120c] rounded py-1.5 px-2.5 font-sans text-xs font-bold shadow-[inset_1px_1px_0_rgba(0,0,0,0.08)] outline-none transition-all"
          />
        </div>
      </div>

      <!-- Pesan Error Validasi -->
      {#if errorMsg}
        <div
          class="bg-red-100 border-2 border-red-600 text-red-800 font-pixel text-[8px] py-2 px-3 text-center rounded shadow-[2px_2px_0px_#1c120c] font-bold"
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
    <div class="p-3.5 md:p-4 bg-white border-t-2 border-[#1c120c] flex gap-2.5">
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
