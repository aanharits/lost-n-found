import { dbCleanupProcessedArchiveRequests } from '../db/db-store.js';

// Request arsip yang sudah diproses (approved/rejected) dihapus setelah 24 jam.
// Request 'pending' tidak pernah dihapus.
const RETENTION_HOURS = 24;
const CHECK_INTERVAL_MS = 60 * 60 * 1000; // Cek setiap 1 jam

/**
 * Jalankan sekali: hapus archive request yang sudah diproses > RETENTION_HOURS jam.
 */
export async function runArchiveCleanup(): Promise<void> {
  try {
    const deleted = await dbCleanupProcessedArchiveRequests(RETENTION_HOURS);
    if (deleted > 0) {
      console.log(`[ArchiveCleanup] ${deleted} request arsip lama dihapus (> ${RETENTION_HOURS} jam setelah diproses).`);
    }
  } catch (err) {
    console.error('[ArchiveCleanup] Gagal menjalankan cleanup request arsip:', err);
  }
}

/**
 * Mulai periodic job untuk membersihkan archive request yang sudah diproses.
 * Dipanggil sekali saat server startup.
 */
export function startArchiveCleanupJob(): void {
  // Jalankan sekali saat startup
  runArchiveCleanup();

  // Ulangi setiap jam
  setInterval(runArchiveCleanup, CHECK_INTERVAL_MS);
  console.log(`[ArchiveCleanup] Auto-cleanup request diproses aktif (setiap jam, retensi ${RETENTION_HOURS} jam).`);
}
