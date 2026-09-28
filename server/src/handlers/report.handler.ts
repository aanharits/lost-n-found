import type { Server as SocketIOServer, Socket } from 'socket.io';
import { itemAddSchema, emojiPickSchema } from '../schemas/item.schema.js';
import { dbInsertItem, type Item } from '../db/db-store.js';
import { pickEmojiWithAI } from '../ai/verifyClaim.js';
import { extractKeywordsWithAI } from '../zk/keywordExtractor.js';
import { stringToFieldElement } from '../zk/fieldElement.js';
import { poseidonCommitment } from '../zk/poseidon.js';
import { autoClassifyItem } from '../utils/tagClassifier.js';

// Menangani pembuatan postingan barang baru dengan validasi, ZKP, dan penyimpanan DB
export async function handleItemAdd(io: SocketIOServer, socket: Socket, data: unknown): Promise<void> {
  const parsed = itemAddSchema.safeParse(data);
  if (!parsed.success) {
    console.warn('[Item] Add validation failed:', parsed.error.flatten());
    socket.emit('item_add_error', { message: 'Data laporan tidak valid.' });
    return;
  }

  const inputData = parsed.data;

  // Validasi: reporter_token wajib ada
  if (!inputData.reporterToken) {
    socket.emit('item_add_error', { message: 'Reporter token wajib ada.' });
    return;
  }

  // Auto-klasifikasi category & tag jika belum ada
  let category = inputData.category;
  let tag = inputData.tag;
  if (!tag || !category) {
    const classified = await autoClassifyItem(inputData.title, inputData.desc);
    category = classified.category;
    tag = classified.tag;
  }

  console.log(`[Item] New report from ${inputData.reporterName || 'Anon'}: ${inputData.title} [${category} • ${tag}]`);

  try {
    // 1. Ekstrak keyword dari input rahasia pelapor
    const keywords = await extractKeywordsWithAI(inputData.secretDetail || '');
    
    // 2. Hash menggunakan Poseidon untuk membuat Commitment
    const commitments = await Promise.all(
      keywords.map((kw) => poseidonCommitment(stringToFieldElement(kw)))
    );

    // 3. Bangun objek Item (tanpa secretDetail mentah)
    const newItem: Omit<Item, 'claims'> = {
      id: inputData.id,
      type: inputData.type,
      title: inputData.title,
      icon: inputData.icon,
      category,
      tag,
      desc: inputData.desc,
      commitments,
      status: 'open',
      date: inputData.date,
      time: inputData.time,
      reporterName: inputData.reporterName,
      reporterNpm: inputData.reporterNpm,
      reporterContact: inputData.reporterContact,
      reporterToken: inputData.reporterToken,
      x: inputData.x,
      y: inputData.y,
    };

    // 4. Simpan ke Neon DB
    const savedItem = await dbInsertItem(newItem);

    // 5. Broadcast item baru ke semua client (tanpa reporterToken)
    const { reporterToken: _, ...publicItem } = savedItem;
    io.emit('item_added', { ...publicItem, claims: [] });

  } catch (error) {
    console.error('[Item] Failed to add item:', error);
    socket.emit('item_add_error', { message: 'Gagal menyimpan laporan. Coba lagi.' });
  }
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
