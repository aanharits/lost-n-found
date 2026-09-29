<script lang="ts">
  import { onDestroy } from 'svelte';
  import { activeModal } from '$lib/stores/ui.js';
  import { items } from '$lib/stores/items.js';
  import { currentPlayer } from '$lib/stores/player.js';
  import { getSocket } from '$lib/socket.js';
  import { matchItemByText, type CategoryId } from '$lib/constants/itemAssets.js';
  import TagIcon from './TagIcon.svelte';
  import { getNextAvailablePosition } from '$lib/utils/gridLayout.js';
  import { generateShortCode } from '$lib/utils/shortCode.js';
  import { fade, fly } from 'svelte/transition';

  let type = $state<'lost' | 'found'>('lost');
  let name = $state('');
  let desc = $state('');
  let secretDetail = $state('');
  let date = $state('');
  let time = $state('');
  let errorMsg = $state('');
  let loading = $state(false);

  // Short ID generator untuk laporan
  let shortCode = $state(generateShortCode());

  // Bukti foto fisik (upload / live webcam capture)
  let evidencePhoto = $state('');
  let isCameraOpen = $state(false);
  let videoElement = $state<HTMLVideoElement | null>(null);
  let mediaStream = $state<MediaStream | null>(null);
  let cameraError = $state('');
  let fileInput = $state<HTMLInputElement | null>(null);

  // Set nilai default tanggal dan jam ke waktu saat ini
  $effect(() => {
    const now = new Date();
    date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    time = now.toTimeString().slice(0, 5);
  });

  // Hentikan stream kamera saat komponen ditutup/unmount
  onDestroy(() => {
    stopCamera();
  });

  // Buka kamera WebCam HTML5
  async function startCamera() {
    cameraError = '';
    isCameraOpen = true;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      mediaStream = stream;
      if (videoElement) {
        videoElement.srcObject = stream;
        await videoElement.play();
      }
    } catch (err: any) {
      console.error('Camera error:', err);
      cameraError = 'Kamera tidak dapat diakses atau izin ditolak.';
      isCameraOpen = false;
      stopCamera();
    }
  }

  // Matikan stream video kamera
  function stopCamera() {
    if (mediaStream) {
      mediaStream.getTracks().forEach((track) => track.stop());
      mediaStream = null;
    }
    if (videoElement) {
      videoElement.srcObject = null;
    }
  }

  // Ambil snapshot dari video kamera
  function takeSnapshot() {
    if (!videoElement) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoElement.videoWidth || 640;
    canvas.height = videoElement.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
      const rawData = canvas.toDataURL('image/jpeg', 0.85);
      compressImage(rawData, 800, 0.8).then((compressed) => {
        evidencePhoto = compressed;
      });
    }
    stopCamera();
    isCameraOpen = false;
  }

  // Tangani upload gambar dari perangkat
  function handleFileUpload(e: Event) {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      errorMsg = 'File harus berupa gambar (JPG, PNG, WEBP)!';
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const rawDataUrl = reader.result as string;
      evidencePhoto = await compressImage(rawDataUrl, 800, 0.8);
    };
    reader.readAsDataURL(file);
  }

  // Helper kompresi gambar berbasis canvas
  function compressImage(dataUrl: string, maxWidth = 800, quality = 0.8): Promise<string> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        } else {
          resolve(dataUrl);
        }
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  }

  // Hapus foto yang sudah dipilih
  function removePhoto() {
    evidencePhoto = '';
    if (fileInput) fileInput.value = '';
  }

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
    stopCamera();
    isCameraOpen = false;
    activeModal.set('none');
    name = '';
    desc = '';
    secretDetail = '';
    evidencePhoto = '';
    errorMsg = '';
    cameraError = '';
    loading = false;
    shortCode = generateShortCode();
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
      shortCode,
      type: type,
      title: name.trim(),
      icon,
      category: detectedInfo.category,
      tag: detectedInfo.tag,
      desc: desc.trim(),
      secretDetail: secretDetail.trim(),
      evidencePhoto,
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

    // Pastikan koneksi socket aktif sebelum mengirim laporan
    if (!socket || !socket.connected) {
      errorMsg = 'Gagal menyimpan: Tidak terhubung ke server backend!';
      loading = false;
      return;
    }

    // Broadcast item baru ke server untuk disimpan dan disebarkan ke user lain
    socket.emit('item_add', newItem);
    closeModal();
  }
</script>

<div class="modal-overlay backdrop-blur-xs" transition:fade={{ duration: 150 }}>
  <div
    class="relative max-w-lg w-full m-3 max-h-[90vh] bg-white border-4 border-[#1c120c] shadow-[6px_6px_0px_#0a060f] rounded flex flex-col overflow-hidden select-none"
    transition:fly={{ y: 20, duration: 250 }}
  >
    <!-- Header Modal: Modern Minimalist Nintendo Blue Title Bar -->
    <div class="bg-[#2563eb] text-white px-3.5 py-2.5 font-pixel text-[9px] md:text-[10px] flex justify-between items-center border-b-2 border-[#1c120c] shrink-0">
      <div class="flex items-center gap-2">
        <span class="w-2 h-2 rounded-full bg-green-400 border border-[#0c0812] animate-pulse"></span>
        <span class="font-bold tracking-wider">FORM LAPOR BARANG</span>
      </div>
      <div class="flex items-center gap-2">
        <!-- Badge Short ID -->
        <span class="bg-[#1e3a8a] text-[#fef08a] px-2 py-0.5 rounded text-[8px] font-mono font-bold border border-[#93c5fd]/40 shadow-xs">
          #{shortCode}
        </span>
        <button
          onclick={closeModal}
          class="text-white hover:text-red-200 font-pixel text-xs px-1.5 py-0.5 cursor-pointer leading-none"
          type="button"
          aria-label="Tutup"
        >
          ✕
        </button>
      </div>
    </div>

    <!-- Body Form Scrollable -->
    <div class="p-4 md:p-5 flex flex-col gap-3.5 bg-[#f8fafc] overflow-y-auto">
      
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
          <span class="text-stone-500 font-sans text-[10px] font-bold">(opsional verifikasi AI ZKP)</span>
        </label>
        <textarea
          id="report-secret"
          bind:value={secretDetail}
          rows="2"
          class="bg-white border-2 border-[#1c120c] focus:border-[#2563eb] text-[#1c120c] rounded py-2 px-3 font-sans text-xs md:text-sm font-bold resize-none placeholder-stone-400 shadow-[inset_1px_1px_0_rgba(0,0,0,0.08)] outline-none transition-all"
          placeholder="Detail khusus untuk verifikasi klaim (misal: stiker, warna gantungan)"
        ></textarea>
      </div>

      <!-- Section: Bukti Foto Fisik (Dual Mode: Upload & WebCam) -->
      <div class="flex flex-col gap-2 p-3 bg-[#f1f5f9] rounded border-2 border-[#1c120c] shadow-[2px_2px_0px_#1c120c]">
        <div class="flex items-center justify-between">
          <span class="font-pixel text-[8.5px] md:text-[9.5px] text-[#0f172a] font-bold flex items-center gap-1.5">
            <span>📷</span> BUKTI FOTO FISIK ASLI
          </span>
          <span class="text-[7.5px] font-pixel text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-300">
            ARSIP SATPAM
          </span>
        </div>

        <div class="text-[8px] md:text-[8.5px] text-[#475569] font-sans font-medium flex items-center gap-1.5 bg-white p-2 rounded border border-[#cbd5e1]">
          <span>🔒</span>
          <span><strong>Privasi Aman:</strong> Foto asli hanya tersimpan di berkas Satpam. Di papan publik hanya tampil ilustrasi pixel 8-bit.</span>
        </div>

        <!-- Mode Kamera WebCam Sedang Aktif -->
        {#if isCameraOpen}
          <div class="relative w-full aspect-video bg-black rounded border-2 border-[#1c120c] overflow-hidden flex flex-col items-center justify-center">
            <!-- Video feed -->
            <!-- svelte-ignore a11y_media_has_caption -->
            <video
              bind:this={videoElement}
              autoplay
              playsinline
              muted
              class="w-full h-full object-cover"
            ></video>

            <!-- Retro Scanlines & Target Overlay -->
            <div class="absolute inset-0 pointer-events-none border-2 border-emerald-400/40 flex items-center justify-center">
              <div class="w-24 h-24 border-2 border-dashed border-emerald-400 rounded flex items-center justify-center">
                <span class="text-emerald-400 text-xs font-mono font-bold">+</span>
              </div>
              <span class="absolute top-2 left-2 text-[8px] font-pixel text-emerald-300 bg-black/60 px-1.5 py-0.5 rounded">
                [LIVE WEBCAM]
              </span>
            </div>

            <!-- Kamera action buttons -->
            <div class="absolute bottom-2 left-0 right-0 flex justify-center gap-2 z-10 px-2">
              <button
                type="button"
                onclick={takeSnapshot}
                class="bg-emerald-500 hover:bg-emerald-600 text-white font-pixel text-[8.5px] px-3 py-1.5 rounded border-2 border-[#1c120c] shadow-[2px_2px_0px_#1c120c] cursor-pointer flex items-center gap-1 font-bold"
              >
                <span>●</span> AMBIL FOTO
              </button>
              <button
                type="button"
                onclick={() => { stopCamera(); isCameraOpen = false; }}
                class="bg-stone-700 hover:bg-stone-800 text-white font-pixel text-[8.5px] px-3 py-1.5 rounded border-2 border-[#1c120c] shadow-[2px_2px_0px_#1c120c] cursor-pointer"
              >
                BATAL
              </button>
            </div>
          </div>
        {:else if evidencePhoto}
          <!-- Preview Foto yang Sudah Terpilih -->
          <div class="flex items-center gap-3 bg-white p-2.5 rounded border-2 border-[#1c120c] shadow-[1px_1px_0px_#1c120c]">
            <img
              src={evidencePhoto}
              alt="Bukti fisik barang"
              class="w-16 h-16 object-cover rounded border-2 border-[#1c120c] shadow-xs"
            />
            <div class="flex-1 flex flex-col justify-between h-16">
              <div>
                <p class="font-pixel text-[8px] text-emerald-700 font-bold flex items-center gap-1">
                  <span>✓</span> FOTO SIAP DIARSIPKAN
                </p>
                <p class="text-[10px] text-stone-500 font-sans mt-0.5 font-medium">
                  Tersimpan di berkas #{shortCode}
                </p>
              </div>
              <div class="flex gap-2">
                <button
                  type="button"
                  onclick={() => fileInput?.click()}
                  class="text-[7.5px] font-pixel text-blue-700 hover:underline cursor-pointer"
                >
                  Ganti File
                </button>
                <span class="text-stone-300">|</span>
                <button
                  type="button"
                  onclick={removePhoto}
                  class="text-[7.5px] font-pixel text-red-600 hover:underline cursor-pointer"
                >
                  Hapus
                </button>
              </div>
            </div>
          </div>
        {:else}
          <!-- Opsi Pemilihan Foto: Upload File atau WebCam -->
          <div class="grid grid-cols-2 gap-2">
            <button
              type="button"
              onclick={() => fileInput?.click()}
              class="py-2.5 px-3 bg-white hover:bg-stone-50 text-[#1c120c] rounded border-2 border-[#1c120c] shadow-[2px_2px_0px_#1c120c] active:shadow-none active:translate-y-0.5 font-pixel text-[8px] md:text-[8.5px] font-bold transition-all cursor-pointer flex flex-col items-center justify-center gap-1"
            >
              <span class="text-base">📁</span>
              <span>UPLOAD GAMBAR</span>
            </button>
            <button
              type="button"
              onclick={startCamera}
              class="py-2.5 px-3 bg-white hover:bg-stone-50 text-[#1c120c] rounded border-2 border-[#1c120c] shadow-[2px_2px_0px_#1c120c] active:shadow-none active:translate-y-0.5 font-pixel text-[8px] md:text-[8.5px] font-bold transition-all cursor-pointer flex flex-col items-center justify-center gap-1"
            >
              <span class="text-base">📸</span>
              <span>BUKA KAMERA</span>
            </button>
          </div>
        {/if}

        <!-- Error Kamera Jika Ada -->
        {#if cameraError}
          <div class="text-[7.5px] font-pixel text-red-700 bg-red-100 p-1.5 rounded border border-red-300">
            {cameraError}
          </div>
        {/if}

        <!-- Hidden input file -->
        <input
          bind:this={fileInput}
          type="file"
          accept="image/*"
          onchange={handleFileUpload}
          class="hidden"
        />
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
    <div class="p-3.5 md:p-4 bg-white border-t-2 border-[#1c120c] flex gap-2.5 shrink-0">
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
