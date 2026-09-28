import type { Server as SocketIOServer, Socket } from 'socket.io';
import { itemDeleteSchema } from '../schemas/item.schema.js';
import { dbDeleteItem, dbGetItem } from '../db/db-store.js';

// Menangani penghapusan laporan barang (hanya bisa dilakukan oleh pemilik)
export async function handleItemDelete(io: SocketIOServer, socket: Socket, data: unknown): Promise<void> {
  const parsed = itemDeleteSchema.safeParse(data);
  if (!parsed.success) {
    socket.emit('item_delete_error', { message: 'Data hapus tidak valid.' });
    return;
  }

  const { id, reporterToken, reporterNpm } = parsed.data;

  // Cek eksistensi item
  const item = await dbGetItem(id);
  if (!item) {
    socket.emit('item_delete_error', { message: 'Item tidak ditemukan.' });
    return;
  }

  // Validasi kepemilikan via reporter_token atau reporterNpm
  const isOwner = (Boolean(reporterToken) && item.reporterToken === reporterToken) ||
                  (Boolean(reporterNpm) && item.reporterNpm === reporterNpm);
  if (!isOwner) {
    socket.emit('item_delete_error', { message: 'Anda tidak memiliki hak untuk menghapus laporan ini.' });
    return;
  }

  // Tidak bisa hapus item yang sedang dalam proses dispute atau sudah resolved
  if (item.status !== 'open') {
    socket.emit('item_delete_error', { message: 'Barang yang sedang dalam proses klaim tidak bisa dihapus.' });
    return;
  }

  const success = await dbDeleteItem(id);
  if (!success) {
    socket.emit('item_delete_error', { message: 'Gagal menghapus laporan.' });
    return;
  }

  // Broadcast penghapusan ke semua client
  io.emit('item_deleted', { id });
  console.log(`[Item] Deleted: ${id} by ${item.reporterName || item.reporterNpm || 'Anon'}`);
}
