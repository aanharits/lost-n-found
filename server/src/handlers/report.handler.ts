import type { Server as SocketIOServer, Socket } from 'socket.io';
import { itemAddSchema, emojiPickSchema } from '../schemas/item.schema.js';
import { getItems, saveItemsToFile, type Item } from '../data/store.js';
import { sanitizeItem } from '../data/sanitize.js';
import { pickEmojiWithAI } from '../ai/verifyClaim.js';

// Menangani pembuatan postingan barang baru dengan validasi dan sanitasi data
export function handleItemAdd(io: SocketIOServer, socket: Socket, data: unknown): void {
  const parsed = itemAddSchema.safeParse(data);
  if (!parsed.success) {
    console.warn('[Item] Add validation failed:', parsed.error.flatten());
    return;
  }

  const newItem = parsed.data as Item;
  console.log(`[Item] New report from ${newItem.reporterName || 'Anon'}: ${newItem.title}`);

  // Simpan item baru ke penyimpanan internal
  const items = getItems();
  items.push(newItem);
  saveItemsToFile(items);

  // Broadcast item baru tanpa menyertakan field rahasia secretDetail
  io.emit('item_added', sanitizeItem(newItem));
}

// Menangani permintaan pemilihan emoji otomatis menggunakan AI untuk barang
export async function handlePickEmoji(socket: Socket, data: unknown): Promise<void> {
  const parsed = emojiPickSchema.safeParse(data);
  if (!parsed.success) {
    socket.emit('emoji_result', { icon: '📦' });
    return;
  }

  // Cari emoji yang cocok via AI atau fallback ke box icon
  const icon = await pickEmojiWithAI(parsed.data.itemName);
  socket.emit('emoji_result', { icon: icon || '📦' });
}
