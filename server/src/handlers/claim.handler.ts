import type { Server as SocketIOServer, Socket } from 'socket.io';
import { claimSubmitSchema } from '../schemas/claim.schema.js';
import { getItems, persistItems, type Claim } from '../data/store.js';
import { startDisputeWindow } from '../zk/disputeTimer.js';
import fs from 'fs';
import path from 'path';

// @ts-ignore
import * as snarkjs from 'snarkjs';

// Load Verification Key
const vKeyPath = path.join(process.cwd(), 'zk', 'verification_key.json');
let vKey: any = null;
try {
  vKey = JSON.parse(fs.readFileSync(vKeyPath, 'utf-8'));
} catch (e) {
  console.error('[ZKP] Gagal memuat verification_key.json. Pastikan Trusted Setup sudah selesai.');
}

// Membuat struktur objek klaim baru
function buildClaimEntry(
  claimantName: string,
  claimantNpm: string,
  claimantContact: string
): Claim {
  return {
    id: 'claim' + Date.now(),
    text: 'ZKP Proof Verified (Hidden)', // Tidak menyimpan teks klaim
    score: 100, // ZKP = Pasti 100
    confidence: 'Tinggi',
    reasoning: 'Zero-Knowledge Proof Valid',
    status: 'pending', // Menunggu dispute window berakhir
    claimantName,
    claimantNpm,
    claimantContact,
    createdAt: new Date().toISOString(),
  };
}

// Menangani proses verifikasi pengajuan klaim barang via Zero-Knowledge Proof
export async function handleClaimSubmit(io: SocketIOServer, socket: Socket, data: unknown): Promise<void> {
  const parsed = claimSubmitSchema.safeParse(data);
  if (!parsed.success) {
    socket.emit('claim_error', { message: 'Data klaim (ZKP Proof) tidak valid.' });
    return;
  }

  const { itemId, proof, publicSignals, claimantName, claimantNpm, claimantContact } = parsed.data;

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

  // Verifikasi 1: Pastikan publicSignals cocok dengan commitments di database
  if (!item.commitments || item.commitments.length < 3) {
    socket.emit('claim_error', { message: 'Data ZKP barang corrupt di database.' });
    return;
  }
  
  for (let i = 0; i < 3; i++) {
    if (publicSignals[i] !== item.commitments[i]) {
      console.warn(`[Claim] ZKP Public Signal Mismatch for item ${item.title}`);
      socket.emit('claim_error', { message: 'Proof tidak valid untuk barang ini (Commitment mismatch).' });
      return;
    }
  }

  // Verifikasi 2: Jalankan snarkjs.verify
  if (!vKey) {
    socket.emit('claim_error', { message: 'Sistem ZKP backend belum siap.' });
    return;
  }

  const isValid = await snarkjs.groth16.verify(vKey, publicSignals, proof);
  if (!isValid) {
    console.warn(`[Claim] ZKP Invalid Proof from ${claimantName || 'Anon'}`);
    socket.emit('claim_error', { message: 'Verifikasi ZKP Gagal. Anda tidak mengetahui ciri rahasia barang.' });
    return;
  }

  // ZKP Lolos!
  console.log(`[Claim] Valid ZKP received for ${item.title} from ${claimantName || 'Anon'}`);
  
  // Ubah status item menjadi disputed jika ini klaim pertama
  if (item.status === 'open') {
    item.status = 'disputed';
  }

  // Tambahkan riwayat klaim
  if (!item.claims) item.claims = [];
  const claimEntry = buildClaimEntry(claimantName, claimantNpm, claimantContact);
  item.claims.push(claimEntry);

  persistItems(items);

  // Mulai Dispute Window (Gale-Shapley Timer)
  startDisputeWindow(io, item.id);

  // Broadcast update
  io.emit('claim_updated', {
    itemId: item.id,
    itemTitle: item.title,
    claim: claimEntry,
    status: item.status,
    claims: item.claims,
    reporterContact: item.reporterContact,
  });
}
