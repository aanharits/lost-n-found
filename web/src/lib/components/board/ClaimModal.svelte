<script lang="ts">
  import { activeModal, claimTargetItemId, claimAttemptCount } from '$lib/stores/ui.js';
  import { items } from '$lib/stores/items.js';
  import { currentPlayer } from '$lib/stores/player.js';
  import { getSocket } from '$lib/socket.js';
  import TagIcon from '../shared/TagIcon.svelte';
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

      // 4c. Kirim semua proof dan teks klaim asli ke Socket Backend
      socket.emit('claim_submit', {
        itemId: targetItem.id,
        proofs: proofs,
        text: claimText.trim(),
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
        const remaining = 2 - $claimAttemptCount;
        const revisionNote = remaining > 0
          ? ` Kamu masih punya <strong>1 kesempatan revisi</strong> jika ingin memperbaiki ciri.`
          : '';
        errorClass = 'bg-green-200 border-green-600 text-green-800';
        errorMsg = (targetItem.type === 'found'
            ? `Klaim ZKP diverifikasi! Klaim masuk ke antrian review pelapor. Pantau status di INBOX > KLAIM SAYA.`
            : `Ciri cocok dan terverifikasi! Pantau keputusan pelapor di INBOX > KLAIM SAYA.`) + revisionNote;
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
          ? 'Klaim Ditolak: Ciri-ciri rahasia yang kamu sebutkan keliru dan tidak terbukti cocok!'
          : 'Pencocokan Gagal: Ciri-ciri rahasia barang di tanganmu berbeda dengan data pelapor!';
      errorClass = 'bg-red-200 border-red-600 text-red-800';
    }
  }
</script>

{#if targetItem}
  <div class="modal-overlay backdrop-blur-xs" transition:fade={{ duration: 150 }}>
    <div
      class="relative max-w-md w-full m-4 bg-white border-4 border-[#1c120c] shadow-[6px_6px_0px_#0a060f] rounded flex flex-col overflow-hidden select-none"
      transition:fly={{ y: 20, duration: 250 }}
    >
      <!-- Header Modal: Modern Minimalist Nintendo Blue Title Bar -->
      <div class="bg-[#2563eb] text-white px-3.5 py-2.5 font-pixel text-[9px] md:text-[10px] flex justify-between items-center border-b-2 border-[#1c120c]">
        <div class="flex items-center gap-2">
          <span class="w-2 h-2 rounded-full bg-green-400 border border-[#0c0812] animate-pulse"></span>
          <span class="font-bold tracking-wider">
            {targetItem.type === 'found' ? 'KLAIM KEPEMILIKAN' : 'KEMBALIKAN BARANG'}
          </span>
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
        
        <!-- Info Singkat Barang Target (Warna Warm Amber Bubble User) -->
        <div class="bg-[#fef3c7] border-2 border-[#1c120c] rounded p-3 flex items-center gap-3 shadow-[2px_2px_0px_#1c120c]">
          <div class="w-10 h-10 rounded bg-white border-2 border-[#1c120c] flex items-center justify-center shrink-0 shadow-[1px_1px_0px_#1c120c]">
            <TagIcon tag={targetItem.tag} fallback={targetItem.icon} size={28} title={targetItem.title} />
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

        <!-- Section Bukti Ciri Khas Barang (Warna Pastel Mint Green Bubble Satpam AI) -->
        <div class="bg-[#dcfce7] border-2 border-[#1c120c] rounded p-3.5 flex flex-col gap-2.5 shadow-[2px_2px_0px_#1c120c]">
          <div class="flex flex-col gap-1.5">
            <label for="claim-desc" class="font-pixel text-[8.5px] md:text-[9.5px] text-[#1c120c] font-bold flex items-center justify-between">
              <span>BUKTI CIRI KHAS BARANG</span>
              <span class="text-red-600 font-sans text-xs font-black">*</span>
            </label>
            <textarea
              id="claim-desc"
              bind:value={claimText}
              rows="3"
              disabled={finished}
              class="bg-white border-2 border-[#1c120c] focus:border-[#2563eb] text-[#1c120c] rounded py-2 px-3 font-sans text-xs md:text-sm font-bold resize-none placeholder-stone-400 shadow-[inset_1px_1px_0_rgba(0,0,0,0.08)] outline-none transition-all disabled:opacity-60"
              {placeholder}
            ></textarea>
          </div>

          <!-- Notifikasi Respon AI Satpam -->
          {#if errorMsg}
            <div
              class="p-2.5 rounded text-xs font-sans font-bold text-center border-2 shadow-[2px_2px_0px_#1c120c] {errorClass}"
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
      </div>

      <!-- Tombol Aksi Bawah Minimalis Modern Nintendo -->
      <div class="p-3.5 md:p-4 bg-white border-t-2 border-[#1c120c] flex gap-2.5">
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
