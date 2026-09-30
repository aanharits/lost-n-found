import type { Server as SocketIOServer, Socket } from 'socket.io';
import { claimSubmitSchema } from '../schemas/claim.schema.js';
import { dbGetItem, dbInsertClaim, dbUpdateItemStatus, type Claim } from '../db/db-store.js';
import { startDisputeWindow } from '../zk/disputeTimer.js';
import fs from 'fs';
import path from 'path';

// @ts-ignore
import * as snarkjs from 'snarkjs';

// Load Verification Key v2
const vKeyPath = path.join(process.cwd(), 'zk', 'zk_v2_verification_key.json');
let vKey: any = null;
try {
  vKey = JSON.parse(fs.readFileSync(vKeyPath, 'utf-8'));
} catch (e) {
  console.error('[ZKP] Gagal memuat zk_v2_verification_key.json. Pastikan Trusted Setup sudah selesai.');
}

const SCORE_THRESHOLD = 0.5;

// Menangani proses verifikasi pengajuan klaim barang via Zero-Knowledge Proof v2
export async function handleClaimSubmit(io: SocketIOServer, socket: Socket, data: unknown): Promise<void> {
  const parsed = claimSubmitSchema.safeParse(data);
  if (!parsed.success) {
    socket.emit('claim_error', { message: 'Data klaim (ZKP Proof) tidak valid.' });
    return;
  }

  const { itemId, proofs, text, claimantName, claimantNpm, claimantContact } = parsed.data;

  // Cari barang dari DB
  const item = await dbGetItem(itemId);
  if (!item) {
    socket.emit('claim_error', { message: 'Item tidak ditemukan.' });
    return;
  }

  // Jika item sudah resolved, tolak klaim baru
  if (item.status === 'resolved') {
    socket.emit('claim_error', { message: 'Barang ini sudah dikembalikan ke pemiliknya.' });
    return;
  }

  // Cegah self-claim: pemilik tidak bisa mengklaim barang sendiri
  if (item.reporterNpm && claimantNpm && item.reporterNpm === claimantNpm) {
    socket.emit('claim_error', { message: 'Anda tidak dapat mengklaim barang yang Anda laporkan sendiri.' });
    return;
  }

  // Validasi ZKP: pastikan vKey tersedia
  if (!vKey) {
    socket.emit('claim_error', { message: 'Sistem ZKP backend belum siap.' });
    return;
  }

  // Pastikan item memiliki commitments
  if (!item.commitments || item.commitments.length === 0) {
    socket.emit('claim_error', { message: 'Data ZKP barang corrupt di database.' });
    return;
  }

  // Verifikasi setiap proof yang dikirimkan
  let matchedCount = 0;
  const N = item.commitments.length;

  for (const singleProof of proofs) {
    const { commitmentIndex, proof, publicSignal } = singleProof;

    if (commitmentIndex < 0 || commitmentIndex >= N) continue;
    if (publicSignal !== item.commitments[commitmentIndex]) continue;

    try {
      const isValid = await snarkjs.groth16.verify(vKey, [publicSignal], proof);
      if (isValid) matchedCount++;
    } catch {
      continue;
    }
  }

  // Hitung intersection score
  const score = N > 0 ? matchedCount / N : 0;

  if (score < SCORE_THRESHOLD) {
    console.warn(`[Claim] Low ZKP score (${score.toFixed(2)}) from ${claimantName || 'Anon'} for ${item.title}`);
    socket.emit('claim_error', {
      message: `Verifikasi ZKP gagal. Skor kesesuaian terlalu rendah (${Math.round(score * 100)}%). Minimal 50% ciri rahasia harus cocok.`,
    });
    return;
  }

  // ZKP Lolos — klaim masuk antrian pending untuk di-review reporter
  console.log(`[Claim] Valid ZKP (score: ${score.toFixed(2)}) from ${claimantName || 'Anon'} for ${item.title}`);

  const confidence = score >= 0.8 ? 'Tinggi' : score >= 0.5 ? 'Sedang' : 'Rendah';

  const claimEntry: Claim = {
    id: 'claim' + Date.now(),
    text: text?.trim() || 'Klaim terverifikasi ZKP',
    score,
    confidence,
    reasoning: `Zero-Knowledge Proof Valid (Intersection Score: ${Math.round(score * 100)}%)`,
    status: 'pending',
    claimantName: claimantName || '',
    claimantNpm: claimantNpm || '',
    claimantContact: claimantContact || '',
    createdAt: new Date().toISOString(),
  };

  const savedClaim = await dbInsertClaim(itemId, claimEntry);

  if (item.status === 'open') {
    await dbUpdateItemStatus(itemId, 'disputed');
  }

  // Mulai Dispute Window 24 jam (Gale-Shapley auto-resolve)
  startDisputeWindow(io, itemId);

  io.emit('claim_updated', {
    itemId: item.id,
    itemTitle: item.title,
    claim: savedClaim,
    status: item.status === 'open' ? 'disputed' : item.status,
    claims: [...item.claims, savedClaim],
    reporterContact: item.reporterContact,
  });
}

