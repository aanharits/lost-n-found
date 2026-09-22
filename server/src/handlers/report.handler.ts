import type { Server as SocketIOServer, Socket } from 'socket.io';
import { itemAddSchema, emojiPickSchema } from '../schemas/item.schema.js';
import { getItems, persistItems, type Item } from '../data/store.js';
import { sanitizeItem } from '../data/sanitize.js';
import { pickEmojiWithAI } from '../ai/verifyClaim.js';
import { extractKeywordsWithAI } from '../zk/keywordExtractor.js';
import { MIN_KEYWORDS } from '../zk/normalizeKeywords.js';
import { stringToFieldElement } from '../zk/fieldElement.js';
import { poseidonCommitment } from '../zk/poseidon.js';

import { autoClassifyItem } from '../utils/tagClassifier.js';

// Menangani pembuatan postingan barang baru dengan validasi dan sanitasi data
export async function handleItemAdd(io: SocketIOServer, socket: Socket, data: unknown): Promise<void> {
  const parsed = itemAddSchema.safeParse(data);
  if (!parsed.success) {
    console.warn('[Item] Add validation failed:', parsed.error.flatten());
    return;
  }

  const inputData = parsed.data;

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

    // 1b. Tolak laporan dengan ciri rahasia terlalu sedikit.
    // Dengan intersection scoring, N kecil membuat penebak cukup tahu 1
    // keyword untuk lolos. Minimal MIN_KEYWORDS mencegah lubang ini.
    if (keywords.length < MIN_KEYWORDS) {
      console.warn(`[Item] Report rejected: hanya ${keywords.length} keyword nyata (min ${MIN_KEYWORDS}) untuk "${inputData.title}"`);
      socket.emit('item_add_error', {
        message: `Ciri rahasia terlalu sedikit. Tambahkan minimal ${MIN_KEYWORDS} ciri pembeda yang spesifik (warna, merek, motif, bahan, dsb).`
      });
      return;
    }

    // 2. Hash menggunakan Poseidon untuk membuat Commitment
    const commitments = await Promise.all(
      keywords.map((kw) => poseidonCommitment(stringToFieldElement(kw)))
    );

    // 3. Bangun objek Item baru HANYA dengan hash (tanpa secretDetail mentah)
    const newItem: Item = {
      id: inputData.id,
      type: inputData.type,
      title: inputData.title,
      icon: inputData.icon,
      category: category,
      tag: tag,
      desc: inputData.desc,
      commitments: commitments,
      claims: [],
      status: 'open',
      date: inputData.date,
      time: inputData.time,
      reporterName: inputData.reporterName,
      reporterNpm: inputData.reporterNpm,
      reporterContact: inputData.reporterContact,
      x: inputData.x,
      y: inputData.y,
    };

    // Simpan item baru ke penyimpanan internal
    const items = getItems();
    items.push(newItem);
    persistItems(items);

    // Broadcast item baru
    io.emit('item_added', sanitizeItem(newItem as any));
  } catch (error) {
    console.error('[Item] Failed to add item due to ZKP error:', error);
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
