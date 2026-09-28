import { dbGetItems, dbGetItem } from '../db/db-store.js';
import { resolveDisputes } from './resolveDisputes.js';
import type { Server as SocketIOServer } from 'socket.io';

// 1 Menit window dispute untuk PoC Hackathon (Gale-Shapley auto-resolve)
const DISPUTE_WINDOW_MS = 1 * 60 * 1000;

// In-memory map untuk melacak timer dispute per barang
const activeTimers = new Map<string, NodeJS.Timeout>();

/**
 * Memulai perhitungan mundur dispute window untuk suatu barang.
 * Selama 1 menit, klaim lain yang lolos verifikasi ZKP dapat masuk antrean.
 * Setelah 1 menit berakhir, Gale-Shapley otomatis mengeksekusi resolusi pemenang
 * berdasarkan ZKP intersection score tertinggi dan waktu pengajuan paling awal.
 *
 * Jika sudah ada timer aktif untuk item ini, biarkan berjalan
 * (waktu dihitung dari klaim PERTAMA).
 */
export function startDisputeWindow(io: SocketIOServer, itemId: string): void {
  if (activeTimers.has(itemId)) {
    return; // Timer sudah berjalan sejak klaim pertama
  }

  console.log(`[Dispute] Window opened for item ${itemId}. Auto-resolve in ${DISPUTE_WINDOW_MS / 1000}s via Gale-Shapley...`);

  const timer = setTimeout(async () => {
    activeTimers.delete(itemId);

    // 1. Eksekusi resolusi Gale-Shapley otomatis
    console.log(`[Dispute] Window closed for ${itemId}. Running Gale-Shapley resolution...`);
    const winnerClaimId = await resolveDisputes(itemId);

    // 2. Broadcast hasilnya ke semua client
    const updatedItem = await dbGetItem(itemId);
    if (updatedItem) {
      io.emit('dispute_resolved', {
        itemId: updatedItem.id,
        itemTitle: updatedItem.title,
        status: updatedItem.status,
        claims: updatedItem.claims,
        winnerId: winnerClaimId,
      });
      console.log(`[Dispute] Resolution broadcast for ${itemId}. Winner: ${winnerClaimId || 'NONE'}`);
    }
  }, DISPUTE_WINDOW_MS);

  activeTimers.set(itemId, timer);
}

/**
 * Memulihkan dispute window untuk item yang masih berstatus 'disputed'
 * saat server di-restart. Mencegah item nyangkut selamanya karena timer
 * bersifat in-memory.
 */
export async function rehydrateDisputes(io: SocketIOServer): Promise<void> {
  const items = await dbGetItems();
  const disputed = items.filter((i) => i.status === 'disputed');
  for (const item of disputed) {
    if (!activeTimers.has(item.id)) {
      startDisputeWindow(io, item.id);
    }
  }
  if (disputed.length > 0) {
    console.log(`[Dispute] Rehydrated ${disputed.length} fallback window(s) from DB.`);
  }
}
