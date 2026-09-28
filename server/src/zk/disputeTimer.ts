import { dbGetItems, dbGetItem } from '../db/db-store.js';
import { resolveDisputes } from './resolveDisputes.js';
import type { Server as SocketIOServer } from 'socket.io';

// 48 jam sebagai fallback window (bukan penentu utama — reporter yang approve duluan)
const DISPUTE_WINDOW_MS = 48 * 60 * 60 * 1000;

// In-memory map untuk melacak timer dispute per barang
const activeTimers = new Map<string, NodeJS.Timeout>();

/**
 * Memulai fallback Dispute Window untuk suatu barang.
 *
 * Timer ini hanya sebagai FALLBACK — jika reporter tidak melakukan
 * manual approval dalam 48 jam, Gale-Shapley akan memilih pemenang
 * berdasarkan ZKP score tertinggi + waktu klaim paling awal.
 *
 * Jika reporter sudah approve sebelum timer habis, item sudah
 * berstatus 'resolved' dan timer ini akan skip saat jalan.
 *
 * Jika sudah ada timer aktif untuk item ini, biarkan berjalan
 * (waktu dihitung dari klaim PERTAMA, bukan klaim terbaru).
 */
export function startDisputeWindow(io: SocketIOServer, itemId: string): void {
  if (activeTimers.has(itemId)) {
    return; // Timer sudah berjalan sejak klaim pertama
  }

  console.log(`[Dispute] Fallback window opened for item ${itemId}. Auto-resolve in ${DISPUTE_WINDOW_MS / 3600000}h if reporter doesn't act.`);

  const timer = setTimeout(async () => {
    activeTimers.delete(itemId);

    // Cek apakah reporter sudah manual approve sebelum timer habis
    const item = await dbGetItem(itemId);
    if (!item || item.status === 'resolved') {
      console.log(`[Dispute] Fallback skipped for ${itemId} — already resolved by reporter.`);
      return;
    }

    // Fallback: jalankan Gale-Shapley auto-resolve
    console.log(`[Dispute] Reporter inactive for 48h. Running Gale-Shapley fallback for ${itemId}...`);
    const winnerClaimId = await resolveDisputes(itemId);

    const updatedItem = await dbGetItem(itemId);
    if (updatedItem) {
      io.emit('dispute_resolved', {
        itemId: updatedItem.id,
        itemTitle: updatedItem.title,
        status: updatedItem.status,
        claims: updatedItem.claims,
        winnerId: winnerClaimId,
        resolvedBy: 'auto',
      });
      console.log(`[Dispute] Fallback resolved for ${itemId}. Winner: ${winnerClaimId || 'NONE'}`);
    }
  }, DISPUTE_WINDOW_MS);

  activeTimers.set(itemId, timer);
}

/**
 * Membatalkan dispute window secara eksplisit (dipanggil saat reporter manual approve).
 * Mencegah Gale-Shapley auto-resolve berjalan setelah item sudah resolved.
 */
export function cancelDisputeWindow(itemId: string): void {
  const timer = activeTimers.get(itemId);
  if (timer) {
    clearTimeout(timer);
    activeTimers.delete(itemId);
    console.log(`[Dispute] Window cancelled for ${itemId} (manual resolve by reporter).`);
  }
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
