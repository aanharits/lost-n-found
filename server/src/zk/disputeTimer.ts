import { getItems, saveItemsToFile } from '../data/store.js';
import { resolveDisputes } from './resolveDisputes.js';
import type { Server as SocketIOServer } from 'socket.io';

const DISPUTE_WINDOW_MS = 1 * 60 * 1000; // 1 Menit untuk PoC Hackathon

// In-memory map untuk melacak timer dispute per barang
const activeTimers = new Map<string, NodeJS.Timeout>();

/**
 * Memulai perhitungan mundur dispute window untuk suatu barang.
 * Jika sudah ada timer, biarkan saja (waktu dihitung dari klaim PERTAMA).
 */
export function startDisputeWindow(io: SocketIOServer, itemId: string) {
  if (activeTimers.has(itemId)) {
    return; // Timer sudah jalan
  }

  console.log(`[Dispute] Window opened for item ${itemId}. Waiting ${DISPUTE_WINDOW_MS/1000}s...`);
  
  const timer = setTimeout(() => {
    // 1. Eksekusi resolusi Gale-Shapley
    const winnerClaimId = resolveDisputes(itemId);
    
    // 2. Broadcast hasilnya ke semua client
    const items = getItems();
    const item = items.find(i => i.id === itemId);
    if (item) {
      io.emit('dispute_resolved', {
        itemId: item.id,
        itemTitle: item.title,
        status: item.status,
        claims: item.claims,
        winnerId: winnerClaimId
      });
      console.log(`[Dispute] Window closed for ${itemId}. Winner: ${winnerClaimId || 'NONE'}`);
    }
    
    activeTimers.delete(itemId);
  }, DISPUTE_WINDOW_MS);

  activeTimers.set(itemId, timer);
}
