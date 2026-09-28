import { dbGetItem, dbGetClaimsByItemId, dbUpdateClaimStatus, dbUpdateItemStatus } from '../db/db-store.js';

/**
 * Layer 3: Gale-Shapley Dispute Resolution (Sederhana untuk PoC).
 * Memilih klaim berdasarkan: score intersection DESC, lalu waktu klaim paling awal ASC.
 *
 * @param itemId ID barang yang disengketakan
 * @returns ID klaim yang menang, atau null jika tidak ada pemenang
 */
export async function resolveDisputes(itemId: string): Promise<string | null> {
  const item = await dbGetItem(itemId);
  if (!item) return null;

  const claims = await dbGetClaimsByItemId(itemId);
  const pendingClaims = claims.filter((c) => c.status === 'pending');

  if (pendingClaims.length === 0) {
    await dbUpdateItemStatus(itemId, 'resolved');
    return null;
  }

  // Urutkan: score DESC, waktu klaim paling awal ASC
  pendingClaims.sort((a, b) => {
    const scoreA = a.score ?? 0;
    const scoreB = b.score ?? 0;
    if (scoreB !== scoreA) return scoreB - scoreA;
    return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  });

  const winner = pendingClaims[0];

  // Update status semua klaim di DB
  await Promise.all(
    pendingClaims.map((c) => {
      if (c.id === winner.id) {
        return dbUpdateClaimStatus(c.id, 'approved');
      } else {
        return dbUpdateClaimStatus(c.id, 'rejected', 'Dispute dimenangkan oleh pengklaim lain yang sah.');
      }
    })
  );

  // Update status item menjadi resolved
  await dbUpdateItemStatus(itemId, 'resolved');

  return winner.id;
}
