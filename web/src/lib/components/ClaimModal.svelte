<script lang="ts">
  import { activeModal, claimTargetItemId, claimAttemptCount } from '$lib/stores/ui.js';
  import { items } from '$lib/stores/items.js';
  import { currentPlayer } from '$lib/stores/player.js';
  import { getSocket } from '$lib/socket.js';
  import { fade, fly } from 'svelte/transition';

  let claimText = $state('');
  let errorMsg = $state('');
  let errorClass = $state('bg-red-200 border-red-600 text-red-800');
  let loading = $state(false);
  let finished = $state(false);
  let placeholder = $state('Warna, ciri khas, kondisi, tanda khusus, dll...');
  let waLink = $state('');
  
  // Mencari data barang yang sedang menjadi target klaim
  let targetItem = $derived(
    $items.find((i) => i.id === $claimTargetItemId) || null
  );

  let submitLabel = $derived(targetItem?.type === 'found' ? 'Kirim Klaim' : 'Cocokkan Ciri');

  // Judul modal berdasarkan status jenis barang
  let modalTitle = $derived(
    targetItem
      ? `KLAIM: ${targetItem.title} (${targetItem.type === 'found' ? 'KETEMU' : 'HILANG'})`
      : 'KLAIM BARANG'
  );

  // Pantau perubahan status targetItem dari socket (saat masa sanggah berakhir)
  $effect(() => {
    if (finished && targetItem?.status === 'resolved') {
      // Cari apakah klaim milik player ini yang di-approve
      const myClaim = targetItem.claims?.find(
        (c) => c.claimantNpm === $currentPlayer?.npm && c.status === 'approved'
      );
      
      if (myClaim) {
        const contact = (targetItem.reporterContact || '').replace(/[^0-9]/g, '');
        waLink = contact ? `https://wa.me/${contact}` : '';
        errorMsg = targetItem.type === 'found'
            ? `Selamat! Kamu terbukti sebagai pemilik sah. Silakan hubungi Penemu.`
            : `Terima kasih! Kamu terbukti memegang barang yang benar. Silakan hubungi Pemilik.`;
        errorClass = 'bg-green-200 border-green-600 text-green-800';
      } else {
        // Jika status resolved tapi bukan dia pemenangnya
        waLink = '';
        errorMsg = `Sayang sekali, sistem memutuskan ada pengklaim lain yang lebih berhak.`;
        errorClass = 'bg-red-200 border-red-600 text-red-800';
      }
    }
  });

  // Menutup modal dan reset seluruh form klaim
  function closeModal() {
    activeModal.set('none');
    claimTargetItemId.set(null);
    claimAttemptCount.set(0);
    claimText = '';
    errorMsg = '';
    loading = false;
    finished = false;
    waLink = '';
  }

  import * as snarkjs from 'snarkjs';
  import { keccak_256 } from 'js-sha3';
  import { poseidon1 } from 'poseidon-lite';

  // Mengirim deskripsi klaim ke server menggunakan Zero-Knowledge Proof (ZKP)
  async function submitClaim() {
    if (!targetItem) return;
    if (!claimText.trim()) {
      errorMsg = 'Ceritain dulu ciri-ciri barangnya!';
      errorClass = 'bg-red-200 border-red-600 text-red-800';
      return;
    }

    errorMsg = '';
    loading = true;
    claimAttemptCount.update((n) => n + 1);

    const socket = getSocket();
    if (!socket?.connected) {
      errorMsg = 'Socket tidak terhubung!';
      errorClass = 'bg-red-200 border-red-600 text-red-800';
      loading = false;
      return;
    }

    const player = $currentPlayer;

    try {
      // 1. Ekstrak keyword lewat API Proxy di backend (ZKP v2)
      const base = import.meta.env.PUBLIC_SERVER_URL || 'http://localhost:3001';
      const response = await fetch(`${base}/api/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: claimText.trim() })
      });
      
      const data = await response.json();
      if (!data.keywords || data.keywords.length < 1) {
        throw new Error('Gagal mengekstrak ciri unik dari teks.');
      }

      // 2. Hash setiap keyword menjadi Field Element (BN254)
      const PRIME = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;
      const stringToFieldElement = (str: string): bigint => {
        const hashHex = keccak_256(str);
        const hashBigInt = BigInt('0x' + hashHex);
        return hashBigInt % PRIME;
      };

      const fieldElements = data.keywords.map(stringToFieldElement);
      const commitments = targetItem.commitments;

      // 3. ZKP v2: Pre-check dengan Poseidon JS dulu (poseidon-lite)
      // Ini JAUH lebih efisien dari try/catch fullProve:
      // - Poseidon JS cepat (microseconds)
      // - fullProve hanya dipanggil untuk pasangan yang PASTI cocok
      // - fullProve tidak throw saat constraint gagal, jadi try/catch tidak bisa diandalkan
      const proofs: Array<{ commitmentIndex: number; proof: any; publicSignal: string }> = [];
      const matchedCommitmentIndices = new Set<number>();

      errorMsg = `Memverifikasi ciri-ciri (0/${commitments.length})...`;

      for (let kwIdx = 0; kwIdx < fieldElements.length; kwIdx++) {
        const fe = fieldElements[kwIdx];
        // Hitung Poseidon(fe) di JS — sama persis dengan yang ada di sirkuit
        const poseidonHash = poseidon1([fe]).toString();

        for (let cmtIdx = 0; cmtIdx < commitments.length; cmtIdx++) {
          if (matchedCommitmentIndices.has(cmtIdx)) continue;

          // Pre-check: apakah hash JS cocok dengan commitment yang tersimpan?
          if (poseidonHash !== commitments[cmtIdx]) continue; // tidak cocok, skip

          // Cocok! Sekarang generate ZKP proof (pasti berhasil karena constraint terpenuhi)
          const { proof, publicSignals } = await snarkjs.groth16.fullProve(
            { secret: fe.toString(), target_hash: commitments[cmtIdx] },
            "/zk/single_keyword_proof.wasm",
            "/zk/single_keyword_proof.zkey"
          );
          proofs.push({ commitmentIndex: cmtIdx, proof, publicSignal: publicSignals[0] });
          matchedCommitmentIndices.add(cmtIdx);
          errorMsg = `Memverifikasi ciri-ciri (${proofs.length}/${commitments.length})...`;
          break; // keyword ini sudah match, lanjut keyword berikutnya
        }
      }

      // 4b. Jika tidak ada satupun keyword yang cocok dengan commitment manapun
      if (proofs.length === 0) {
        loading = false;
        errorMsg = 'Tidak ada ciri yang cocok. Coba ingat lebih detail — warna, merek, nama, atau ciri unik lain.';
        errorClass = 'bg-red-200 border-red-600 text-red-800';
        return;
      }

      // 4c. Kirim semua proof yang berhasil ke Socket Backend
      socket.emit('claim_submit', {
        itemId: targetItem.id,
        proofs: proofs,
        claimantName: player?.name || '',
        claimantNpm: player?.npm || '',
        claimantContact: player?.contact || ''
      });

      // 5. Menunggu hasil verifikasi dari ZKP backend
      const result = await new Promise<any>((resolve) => {
        const timeout = setTimeout(() => {
          resolve({ error: 'Timeout - gagal mendapat respons dari server ZKP.' });
        }, 15000);

        const successHandler = (socketData: any) => {
          if (socketData.itemId === targetItem!.id) {
            clearTimeout(timeout);
            socket.off('claim_updated', successHandler);
            socket.off('claim_error', errorHandler);
            resolve(socketData);
          }
        };

        const errorHandler = (errorData: any) => {
          clearTimeout(timeout);
          socket.off('claim_updated', successHandler);
          socket.off('claim_error', errorHandler);
          resolve({ error: errorData.message });
        };

        socket.on('claim_updated', successHandler);
        socket.on('claim_error', errorHandler);
      });

      loading = false;

      if (result.error) {
        errorMsg = result.error;
        errorClass = 'bg-red-200 border-red-600 text-red-800';
        return;
      }

      const claim = result.claim;

      if (claim.status === 'pending' || claim.status === 'approved') {
        // Karena sistem sekarang memakai Dispute Window, status awal klaim adalah 'pending'
        errorClass = 'bg-green-200 border-green-600 text-green-800';
        errorMsg = targetItem.type === 'found' 
            ? `Klaim Disetujui! Ciri-cirimu terbukti benar. Menunggu 1 menit (Masa Sanggah) untuk memastikan tidak ada pengklaim lain...`
            : `Ciri cocok! Menunggu 1 menit (Masa Sanggah) untuk memastikan tidak ada penemu palsu lain...`;
        finished = true;
        claimText = '';
        
        // Cek jika sudah resolved langsung dapat nomor kontak
        if (result.resolved && result.winner) {
            const contact = (result.reporterContact || '').replace(/[^0-9]/g, '');
            waLink = contact ? `https://wa.me/${contact}` : '';
            errorMsg = targetItem.type === 'found'
                ? `Selamat! Kamu terbukti sebagai pemilik sah. Silakan hubungi Penemu.`
                : `Terima kasih! Kamu terbukti memegang barang yang benar. Silakan hubungi Pemilik.`;
        }
      } else {
        errorClass = 'bg-red-200 border-red-600 text-red-800';
        errorMsg = targetItem.type === 'found'
            ? `Klaim Ditolak: Ciri barang salah atau tidak terbukti.`
            : `Gagal: Ciri barang tidak cocok dengan laporan kehilangan.`;
        finished = true;
      }

    } catch (err: any) {
      console.error(err);
      loading = false;
      errorMsg = targetItem.type === 'found'
          ? 'Klaim Ditolak Satpam AI: Ciri-ciri rahasia yang kamu sebutkan keliru dan tidak terbukti cocok!'
          : 'Pencocokan Gagal: Ciri-ciri rahasia barang di tanganmu berbeda dengan data pelapor!';
      errorClass = 'bg-red-200 border-red-600 text-red-800';
    }
  }
</script>

{#if targetItem}
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
          {targetItem.type === 'found' ? 'KLAIM KEPEMILIKAN' : 'KEMBALIKAN BARANG'}
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

      <!-- Info Singkat Barang Target -->
      <div class="bg-[#fef9c3] border-2 border-[#1c120c] rounded p-3 flex items-center gap-3 shadow-[1px_1px_0px_#1c120c]">
        <div class="w-10 h-10 rounded bg-white border-2 border-[#1c120c] flex items-center justify-center text-xl shrink-0">
          {targetItem.icon}
        </div>
        <div class="flex flex-col min-w-0">
          <div class="flex items-center gap-2">
            <span class="font-pixel text-[10px] text-[#1c120c] font-bold truncate">
              {targetItem.title}
            </span>
            <span class="font-pixel text-[7px] px-1.5 py-0.5 rounded border border-[#1c120c] font-bold {targetItem.type === 'found' ? 'bg-[#16a34a] text-white' : 'bg-[#dc2626] text-white'}">
              {targetItem.type === 'found' ? 'KETEMU' : 'HILANG'}
            </span>
          </div>
          <p class="font-sans text-[11px] text-stone-700 font-bold truncate mt-0.5">
            Lokasi: {targetItem.desc}
          </p>
        </div>
      </div>

      <!-- Panel Form Klaim -->
      <div class="bg-[#fefce8] border-2 border-[#1c120c] shadow-[inset_0_2px_4px_rgba(0,0,0,0.06)] rounded p-3.5 md:p-4 flex flex-col gap-3">
        <div class="flex flex-col gap-1.5">
          <label for="claim-desc" class="font-pixel text-[8px] md:text-[9px] text-[#1c120c] font-bold flex items-center justify-between">
            <span>BUKTI CIRI KHAS BARANG</span>
            <span class="text-red-600 font-sans text-xs font-black">*</span>
          </label>
          <textarea
            id="claim-desc"
            bind:value={claimText}
            rows="3"
            disabled={finished}
            class="bg-white border-2 border-[#1c120c] focus:border-[#2563eb] text-[#1c120c] rounded py-2 px-3 font-sans text-xs md:text-sm font-bold resize-none placeholder-stone-400 shadow-[inset_1px_1px_0_rgba(0,0,0,0.1)] outline-none transition-all disabled:opacity-60"
            {placeholder}
          ></textarea>
        </div>

        <!-- Notifikasi Respon AI Satpam -->
        {#if errorMsg}
          <div
            class="p-2.5 rounded text-xs font-sans font-bold text-center border-2 {errorClass}"
            transition:fly={{ y: -5, duration: 150 }}
          >
            {@html errorMsg}
            {#if waLink}
              <a
                href={waLink}
                target="_blank"
                rel="noopener noreferrer"
                class="bg-[#16a34a] hover:bg-[#15803d] active:translate-y-0.5 text-white font-pixel text-[8px] md:text-[9px] py-2 px-3 rounded block text-center mt-2.5 border-2 border-[#1c120c] shadow-[2px_2px_0_#1c120c] transition-all font-bold"
                style="text-decoration:none;"
              >
                LANJUT CHAT WHATSAPP
              </a>
            {/if}
          </div>
        {/if}

        <!-- Status Loading AI Verifikasi -->
        {#if loading}
          <div
            class="text-[#2563eb] font-pixel text-[8px] md:text-[9px] text-center animate-pulse py-1 flex items-center justify-center gap-1.5 font-bold"
            transition:fade={{ duration: 150 }}
          >
            <span class="w-2 h-2 rounded-full bg-[#2563eb] animate-ping"></span>
            AI SEDANG MEMVERIFIKASI CIRI KHAS...
          </div>
        {/if}
      </div>

      <!-- Tombol Aksi Bawah Minimalis Modern Nintendo -->
      <div class="flex gap-2.5 mt-1">
        {#if finished}
          <button
            onclick={closeModal}
            type="button"
            class="bg-[#ffd700] hover:bg-[#fbbf24] active:translate-y-0.5 text-[#1c120c] font-pixel text-[9px] md:text-[10px] py-2.5 px-4 rounded w-full border-2 border-[#1c120c] shadow-[2px_2px_0_#1c120c] active:shadow-none transition-all cursor-pointer text-center font-bold tracking-wider uppercase"
          >
            SELESAI
          </button>
        {:else}
          <button
            onclick={closeModal}
            type="button"
            class="bg-white hover:bg-slate-100 active:translate-y-0.5 text-[#1c120c] font-pixel text-[9px] md:text-[10px] py-2.5 px-4 rounded w-1/2 border-2 border-[#1c120c] shadow-[2px_2px_0_#1c120c] active:shadow-none transition-all cursor-pointer text-center font-bold"
          >
            BATAL
          </button>
          <button
            onclick={submitClaim}
            disabled={loading}
            type="button"
            class="bg-[#ffd700] hover:bg-[#fbbf24] active:translate-y-0.5 text-[#1c120c] font-pixel text-[9px] md:text-[10px] py-2.5 px-4 rounded w-1/2 border-2 border-[#1c120c] shadow-[2px_2px_0_#1c120c] active:shadow-none transition-all cursor-pointer text-center font-bold tracking-wider uppercase"
          >
            {submitLabel}
          </button>
        {/if}
      </div>
    </div>
  </div>
{/if}
