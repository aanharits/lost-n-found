import type { Server as SocketIOServer, Socket } from 'socket.io';
import { itemMoveSchema } from '../schemas/item.schema.js';
import { getItems, setItems, saveItemsToFile } from '../data/store.js';
import { sanitizeItems } from '../data/sanitize.js';

// Menangani pergeseran posisi kartu barang saat di-drag secara realtime
export function handleItemMove(io: SocketIOServer, socket: Socket, data: unknown): void {
  const parsed = itemMoveSchema.safeParse(data);
  if (!parsed.success) return;

  const posData = parsed.data;
  const items = getItems();
  const item = items.find((i) => i.id === posData.id);

  if (item) {
    item.x = posData.x;
    item.y = posData.y;
    socket.broadcast.emit('item_moved', posData);
    saveItemsToFile(items);
  }
}

// Menangani penyusunan ulang posisi batch seluruh kartu di board
export function handleItemsOrganize(io: SocketIOServer, socket: Socket, data: unknown): void {
  if (!Array.isArray(data)) return;

  const positions = data as Array<{ id: string; x: number; y: number }>;
  const items = getItems();

  positions.forEach((pos) => {
    const item = items.find((i) => i.id === pos.id);
    if (item) {
      item.x = pos.x;
      item.y = pos.y;
    }
  });

  socket.broadcast.emit('items_organized', positions);
  saveItemsToFile(items);
}

// Menangani reset demo items menjadi kosong dan broadcast data bersih
export function handleResetDemo(io: SocketIOServer): void {
  setItems([]);
  saveItemsToFile([]);
  io.emit('items_init', sanitizeItems(getItems()));
}
