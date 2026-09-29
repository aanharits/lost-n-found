import type { Server as SocketIOServer, Socket } from 'socket.io';
import { itemMoveSchema } from '../schemas/item.schema.js';
import { dbGetItems, dbUpdateItemPosition, dbUpdateItemPositionsBatch } from '../db/db-store.js';

// Menangani pergeseran posisi kartu barang saat di-drag secara realtime
export async function handleItemMove(io: SocketIOServer, socket: Socket, data: unknown): Promise<void> {
  const parsed = itemMoveSchema.safeParse(data);
  if (!parsed.success) return;

  const { id, x, y } = parsed.data;

  // Update posisi di DB (fire-and-forget, tidak perlu await untuk realtime yang cepat)
  dbUpdateItemPosition(id, x, y).catch((err) => {
    console.error('[Board] Failed to update item position:', err);
  });

  socket.broadcast.emit('item_moved', { id, x, y });
}

// Menangani penyusunan ulang posisi batch seluruh kartu di board
export async function handleItemsOrganize(io: SocketIOServer, socket: Socket, data: unknown): Promise<void> {
  if (!Array.isArray(data)) return;

  const positions = data as Array<{ id: string; x: number; y: number }>;

  // Update semua posisi di DB secara parallel
  dbUpdateItemPositionsBatch(positions).catch((err) => {
    console.error('[Board] Failed to batch update positions:', err);
  });

  socket.broadcast.emit('items_organized', positions);
}

// Menangani reset demo items menjadi kosong dan broadcast data bersih
export async function handleResetDemo(io: SocketIOServer): Promise<void> {
  // Reset mode untuk demo: ambil ulang items dari DB (tidak menghapus DB, hanya clear tampilan)
  // Jika ingin benar-benar menghapus semua data untuk demo, uncomment baris di bawah ini:
  // await db.delete(itemsTable);
  const items = await dbGetItems();
  // Sanitasi reporter_token & evidencePhoto sebelum broadcast publik
  const sanitized = items.map(({ reporterToken: _, evidencePhoto: __, ...rest }) => rest);
  io.emit('items_init', sanitized);
}
