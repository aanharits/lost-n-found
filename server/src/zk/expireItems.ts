import { dbExpireOldItems } from '../db/db-store.js';
import type { Server as SocketIOServer } from 'socket.io';

const EXPIRE_AFTER_DAYS = 7;
const CHECK_INTERVAL_MS = 60 * 60 * 1000; // Cek setiap 1 jam

/**
 * Jalankan sekali: expire item open yang sudah > EXPIRE_AFTER_DAYS hari.
 * Broadcast item_expired ke semua client agar board publik menyembunyikannya.
 */
export async function runExpireCheck(io: SocketIOServer): Promise<void> {
  try {
    const expiredIds = await dbExpireOldItems(EXPIRE_AFTER_DAYS);
    if (expiredIds.length > 0) {
      console.log(`[Expire] ${expiredIds.length} item(s) dipindahkan ke arsip (expired > ${EXPIRE_AFTER_DAYS} hari): ${expiredIds.join(', ')}`);
      // Broadcast ke semua client: item ini sudah expired, hilang dari board
      io.emit('items_expired', { itemIds: expiredIds });
    }
  } catch (err) {
    console.error('[Expire] Gagal menjalankan expire check:', err);
  }
}

/**
 * Mulai periodic job untuk auto-expire item lama.
 * Dipanggil sekali saat server startup.
 */
export function startExpireJob(io: SocketIOServer): void {
  // Jalankan sekali saat startup
  runExpireCheck(io);

  // Ulangi setiap jam
  setInterval(() => runExpireCheck(io), CHECK_INTERVAL_MS);
  console.log(`[Expire] Auto-expire job aktif (setiap jam, threshold ${EXPIRE_AFTER_DAYS} hari).`);
}
