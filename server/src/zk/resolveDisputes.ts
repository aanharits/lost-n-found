import { getItems, persistItems } from '../data/store.js';

/**
 * Layer 3: Gale-Shapley Dispute Resolution (Sederhana untuk PoC).
 * Karena ini barang hilang (1 barang), algoritma Gale-Shapley di sini
 * akan dipersingkat:
 * "Pilih klaim yang valid berdasarkan siapa yang mengajukan lebih dulu (First-Come First-Served)".
 * 
 * @param itemId ID barang yang disengketakan
 * @returns ID klaim yang menang, atau null jika tidak ada pemenang
 */
export function resolveDisputes(itemId: string): string | null {
  const items = getItems();
  const item = items.find(i => i.id === itemId);
  
  if (!item || !item.claims || item.claims.length === 0) {
    return null;
  }

  // Ambil semua klaim yang masuk dan masih pending
  const pendingClaims = item.claims.filter(c => c.status === 'pending');
  
  if (pendingClaims.length === 0) {
    item.status = 'resolved'; // Tetap resolved meski tidak ada pemenang dari sisa pending
    persistItems(items);
    return null;
  }

  // Urutkan berdasarkan waktu klaim paling awal
  pendingClaims.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const winner = pendingClaims[0];

  // Update status klaim: 1 pemenang, sisanya ditolak
  item.claims.forEach(c => {
    if (c.id === winner.id) {
      c.status = 'approved';
    } else if (c.status === 'pending') {
      c.status = 'rejected';
      c.reasoning = 'Dispute dimenangkan oleh pengklaim lain yang sah.';
    }
  });

  // Update status barang
  item.status = 'resolved';
  persistItems(items);

  return winner.id;
}
