import type { Server as SocketIOServer, Socket } from 'socket.io';
import { claimSubmitSchema } from '../schemas/claim.schema.js';
import {
  dbGetItem,
  dbInsertClaim,
  dbUpdateItemStatus,
  dbUpdateClaimStatus,
  type Claim,
} from '../db/db-store.js';
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

// PENTING (produksi): paksa snarkjs memakai kurva BN128 SINGLE-THREAD.
// Secara default `getCurveFromName` membangun worker pool sebanyak os.cpus().length
// (sampai 64 worker). Di container Railway yang thread/memori-nya dibatasi, ini
// membuat seluruh proses Node crash (Railway membalas 502 selama restart) tepat
// saat klaim diverifikasi. Mode single-thread hanya memakai ~15MB tanpa worker.
let curveReady: Promise<void> | undefined;
function ensureSingleThreadCurve(): Promise<void> {
  return (curveReady ??= (snarkjs as any).curves
    .getCurveFromName('bn128', { singleThread: true })
    .then((curve: any) => {
      // Simpan sebagai kurva global agar groth16.verify (yang dipanggil tanpa
      // opsi) memakai instance single-thread ini, bukan membangun worker pool lagi.
      (globalThis as any).curve_bn128 = curve;
    })
    .catch((err: unknown) => {
      console.error('[ZKP] Gagal membangun kurva BN128 single-thread:', err);
    }));
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

  // Batasi klaim per pengklaim: 1 klaim awal + 1 revisi (total maksimal 2 submit)
  // untuk barang yang sama. Setiap submit membuat 1 baris klaim, jadi jumlah baris
  // milik NPM ini = jumlah percobaan.
  const MAX_CLAIM_ATTEMPTS = 2;
  const myClaims = item.claims.filter(
    (c) => c.claimantNpm && claimantNpm && c.claimantNpm === claimantNpm
  );

  // Sudah ada klaim yang disetujui → tidak boleh klaim/revisi lagi
  if (myClaims.some((c) => c.status === 'approved')) {
    socket.emit('claim_error', {
      message: 'Klaim Anda untuk barang ini sudah disetujui. Tidak perlu mengajukan klaim lagi.',
    });
    return;
  }

  // Jatah percobaan habis (sudah pakai klaim awal + 1 revisi)
  if (myClaims.length >= MAX_CLAIM_ATTEMPTS) {
    socket.emit('claim_error', {
      message: 'Kesempatan revisi klaim Anda untuk barang ini sudah habis (maksimal 1 kali revisi).',
    });
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

  // Pastikan kurva BN128 single-thread siap (lihat catatan di atas)
  await ensureSingleThreadCurve();

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

  // Jika ini revisi, tandai klaim pending lama milik NPM yang sama sebagai
  // 'superseded' agar tidak ikut berkompetisi di Gale-Shapley.
  const superseded = myClaims.filter((c) => c.status === 'pending');
  await Promise.all(
    superseded.map((c) =>
      dbUpdateClaimStatus(c.id, 'superseded', 'Digantikan oleh revisi klaim pengklaim yang sama.')
    )
  );

  if (item.status === 'open') {
    await dbUpdateItemStatus(itemId, 'disputed');
  }

  // Dispute Window 24 jam tetap dihitung dari klaim PERTAMA (startDisputeWindow
  // mengabaikan item yang timernya sudah berjalan), sehingga revisi tidak
  // memperpanjang masa tunggu.
  startDisputeWindow(io, itemId);

  const updatedClaims = [
    ...item.claims.map((c) =>
      superseded.some((s) => s.id === c.id) ? { ...c, status: 'superseded' as const } : c
    ),
    savedClaim,
  ];

  io.emit('claim_updated', {
    itemId: item.id,
    itemTitle: item.title,
    claim: savedClaim,
    status: item.status === 'open' ? 'disputed' : item.status,
    claims: updatedClaims,
    reporterContact: item.reporterContact,
  });
}

