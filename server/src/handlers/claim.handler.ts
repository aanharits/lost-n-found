import type { Server as SocketIOServer, Socket } from 'socket.io';
import { claimSubmitSchema } from '../schemas/claim.schema.js';
import { getItems, saveItemsToFile, type Claim } from '../data/store.js';
import { verifyClaimWithAI } from '../ai/verifyClaim.js';

const APPROVE_THRESHOLD = 80;
const GREY_ZONE_MIN = 40;

// Menentukan status klaim berdasarkan skor AI dan nomor percobaan
function determineClaimStatus(
  score: number,
  attemptNumber: number
): { status: 'approved' | 'pending' | 'rejected'; resolved: boolean } {
  if (score >= APPROVE_THRESHOLD) {
    return { status: 'approved', resolved: true };
  }
  if (attemptNumber === 1 && score >= GREY_ZONE_MIN && score < APPROVE_THRESHOLD) {
    return { status: 'pending', resolved: false };
  }
  return { status: 'rejected', resolved: false };
}

// Membuat struktur objek klaim baru
function buildClaimEntry(
  claimText: string,
  score: number,
  confidence: string,
  reasoning: string,
  status: 'approved' | 'pending' | 'rejected',
  claimantName: string,
  claimantNpm: string,
  claimantContact: string
): Claim {
  return {
    id: 'claim' + Date.now(),
    text: claimText,
    score,
    confidence,
    reasoning,
    status,
    claimantName,
    claimantNpm,
    claimantContact,
    createdAt: new Date().toISOString(),
  };
}

// Menolak seluruh klaim pending lainnya jika ada klaim yang telah disetujui
function rejectOtherPendingClaims(claims: Claim[], approvedClaimId: string): void {
  claims.forEach((c) => {
    if (c.id !== approvedClaimId && c.status === 'pending') {
      c.status = 'rejected';
    }
  });
}

// Menangani proses verifikasi pengajuan klaim barang secara realtime
export async function handleClaimSubmit(io: SocketIOServer, socket: Socket, data: unknown): Promise<void> {
  // Validasi payload data klaim dari client
  const parsed = claimSubmitSchema.safeParse(data);
  if (!parsed.success) {
    socket.emit('claim_error', { message: 'Data klaim tidak valid.' });
    return;
  }

  const { itemId, claimText, claimantName, claimantNpm, claimantContact, attemptNumber } = parsed.data;

  // Cari barang yang diklaim di database
  const items = getItems();
  const item = items.find((i) => i.id === itemId);
  if (!item) {
    socket.emit('claim_error', { message: 'Item tidak ditemukan.' });
    return;
  }

  // Verifikasi kecocokan klaim dengan rahasia barang via AI di sisi backend
  const aiResult = await verifyClaimWithAI(
    item.secretDetail,
    claimText,
    item.title,
    item.desc
  );

  // Evaluasi status persetujuan klaim
  const { status, resolved } = determineClaimStatus(aiResult.score, attemptNumber);

  // Tambahkan riwayat klaim ke data item
  if (!item.claims) item.claims = [];

  const claimEntry = buildClaimEntry(
    claimText,
    aiResult.score,
    aiResult.confidence,
    aiResult.reasoning,
    status,
    claimantName,
    claimantNpm,
    claimantContact
  );

  item.claims.push(claimEntry);

  // Tandai item selesai dan tolak klaim pending lainnya jika klaim disetujui
  if (resolved) {
    item.resolved = true;
    rejectOtherPendingClaims(item.claims, claimEntry.id);
  }

  // Simpan perubahan ke file dan broadcast update klaim ke semua client
  saveItemsToFile(items);
  console.log(`[Claim] Status for [${item.title}]: ${claimEntry.status} (${claimantName || 'Anon'})`);

  io.emit('claim_updated', {
    itemId: item.id,
    itemTitle: item.title,
    claim: claimEntry,
    resolved: item.resolved,
    claims: item.claims,
    reporterContact: item.reporterContact,
  });
}
