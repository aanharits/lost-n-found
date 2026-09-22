import type { Server as SocketIOServer, Socket } from 'socket.io';
import { claimSubmitSchema } from '../schemas/claim.schema.js';
import { getItems, persistItems, type Claim } from '../data/store.js';
import { startDisputeWindow } from '../zk/disputeTimer.js';
import fs from 'fs';
import path from 'path';

// @ts-ignore
import * as snarkjs from 'snarkjs';

// Score minimum untuk klaim diterima ke Dispute Window.
// 0.5 = pengklaim harus membuktikan minimal ceil(N/2) commitment pelapor.
const SCORE_THRESHOLD = 0.5;

// Load Verification Key (ZKP v2: single_keyword_proof)
const vKeyPath = path.join(process.cwd(), 'zk', 'zk_v2_verification_key.json');
let vKey: any = null;
try {
  vKey = JSON.parse(fs.readFileSync(vKeyPath, 'utf-8'));
  console.log('[ZKP v2] Verification key loaded.');
} catch (e) {
  console.error('[ZKP v2] Gagal memuat zk_v2_verification_key.json. Pastikan Trusted Setup sudah selesai.');
}

// Membuat struktur objek klaim baru dengan score (ZKP v2)
function buildClaimEntry(
  claimantName: string,
  claimantNpm: string,
  claimantContact: string,
  score: number
): Claim {
  return {
    id: 'claim' + Date.now(),
    text: 'ZKP Proof Verified (Hidden)',
    score: score,         // v2: score float 0.0–1.0 (bukan selalu 100)
    confidence: score >= 0.8 ? 'Tinggi' : score >= 0.5 ? 'Sedang' : 'Rendah',
    reasoning: `Zero-Knowledge Proof Valid (Intersection Score: ${(score * 100).toFixed(0)}%)`,
    status: 'pending',
    claimantName,
    claimantNpm,
    claimantContact,
    createdAt: new Date().toISOString(),
  };
}

// Menangani proses verifikasi pengajuan klaim barang via Zero-Knowledge Proof (ZKP v2)
// Perubahan dari v1: iteratif per keyword, hitung intersection score
export async function handleClaimSubmit(io: SocketIOServer, socket: Socket, data: unknown): Promise<void> {
  const parsed = claimSubmitSchema.safeParse(data);
  if (!parsed.success) {
    socket.emit('claim_error', { message: 'Data klaim (ZKP Proof) tidak valid.' });
    return;
  }

  const { itemId, proofs, claimantName, claimantNpm, claimantContact } = parsed.data;

  // Cari barang
  const items = getItems();
  const item = items.find((i) => i.id === itemId);
  if (!item) {
    socket.emit('claim_error', { message: 'Item tidak ditemukan.' });
    return;
  }

  // Jika item sudah resolved, tolak klaim baru
  if (item.status === 'resolved') {
    socket.emit('claim_error', { message: 'Barang ini sudah dikembalikan ke pemiliknya.' });
    return;
  }

  if (!item.commitments || item.commitments.length === 0) {
    socket.emit('claim_error', { message: 'Data ZKP barang corrupt di database.' });
    return;
  }

  if (!vKey) {
    socket.emit('claim_error', { message: 'Sistem ZKP backend belum siap.' });
    return;
  }

  // -----------------------------------------------------------------------
  // ZKP v2: Verifikasi iteratif per proof — hitung intersection score
  // -----------------------------------------------------------------------
  let matchedCount = 0;
  const verifiedIndices = new Set<number>();

  for (const p of proofs) {
    const { commitmentIndex, proof, publicSignal } = p;

    // Validasi 1: index dalam range
    if (commitmentIndex >= item.commitments.length) {
      console.warn(`[Claim v2] commitmentIndex ${commitmentIndex} out of range (max: ${item.commitments.length - 1})`);
      continue;
    }

    // Validasi 2: publicSignal harus cocok dengan commitment di database
    if (publicSignal !== item.commitments[commitmentIndex]) {
      console.warn(`[Claim v2] publicSignal mismatch di index ${commitmentIndex} untuk item ${item.title}`);
      continue;
    }

    // Validasi 3: jangan terima duplicate index (anti-cheat)
    if (verifiedIndices.has(commitmentIndex)) {
      console.warn(`[Claim v2] Duplicate commitmentIndex ${commitmentIndex} terdeteksi`);
      continue;
    }

    // Validasi 4: jalankan snarkjs.groth16.verify
    const isValid = await snarkjs.groth16.verify(vKey, [publicSignal], proof);
    if (isValid) {
      matchedCount++;
      verifiedIndices.add(commitmentIndex);
      console.log(`[Claim v2] Proof valid di index ${commitmentIndex} untuk "${item.title}"`);
    } else {
      console.warn(`[Claim v2] Proof INVALID di index ${commitmentIndex} dari ${claimantName || 'Anon'}`);
    }
  }

  // Hitung intersection score
  const score = matchedCount / item.commitments.length;
  console.log(`[Claim v2] Score ${claimantName || 'Anon'} untuk "${item.title}": ${matchedCount}/${item.commitments.length} = ${score.toFixed(2)}`);

  // Threshold check
  if (score < SCORE_THRESHOLD) {
    console.warn(`[Claim v2] Score ${score.toFixed(2)} di bawah threshold ${SCORE_THRESHOLD}, klaim ditolak`);
    socket.emit('claim_error', {
      message: `Ciri-ciri yang kamu sebutkan kurang cocok. Coba ingat lebih detail!`
    });
    return;
  }

  // ZKP Lolos threshold!
  console.log(`[Claim v2] Klaim diterima untuk "${item.title}" dari ${claimantName || 'Anon'} (score: ${score.toFixed(2)})`);

  // Ubah status item menjadi disputed jika ini klaim pertama
  if (item.status === 'open') {
    item.status = 'disputed';
  }

  // Tambahkan riwayat klaim dengan score
  if (!item.claims) item.claims = [];
  const claimEntry = buildClaimEntry(claimantName, claimantNpm, claimantContact, score);
  item.claims.push(claimEntry);

  persistItems(items);

  // Mulai Dispute Window (timer 1 menit)
  startDisputeWindow(io, item.id);

  // Broadcast update ke semua client
  io.emit('claim_updated', {
    itemId: item.id,
    itemTitle: item.title,
    claim: claimEntry,
    status: item.status,
    claims: item.claims,
    reporterContact: item.reporterContact,
  });
}
