import type { Socket } from 'socket.io';
import { chatMessageSchema } from '../schemas/chat.schema.js';
import { chatWithAI } from '../ai/verifyClaim.js';
import { getItems, type Item } from '../data/store.js';
import { classifyWithRegex } from '../utils/tagClassifier.js';

// Deteksi target highlight (kategori, tag, status, atau judul barang) dari pesan chat
export function detectHighlightIntent(message: string, currentItems: Item[]): {
  highlightCategory: string | null;
  highlightTag: string | null;
  highlightType: 'lost' | 'found' | null;
  highlightItemIds: string[];
} {
  const lower = message.toLowerCase();

  let cat: string | null = null;
  if (lower.includes('gadget') || lower.includes('elektronik')) cat = 'Gadget';
  else if (lower.includes('pakaian') || lower.includes('baju') || lower.includes('aksesoris')) cat = 'Pakaian & Aksesoris';
  else if (lower.includes('personal') || lower.includes('pribadi')) cat = 'Personal';
  else if (lower.includes('dokumen') || lower.includes('kartu')) cat = 'Dokumen & Kartu';

  let itemType: 'lost' | 'found' | null = null;
  if (/\b(hilang|kehilangan|lost)\b/i.test(lower) && !/\b(ketemu|ditemukan|menemukan|found)\b/i.test(lower)) {
    itemType = 'lost';
  } else if (/\b(ketemu|ditemukan|menemukan|found)\b/i.test(lower) && !/\b(hilang|kehilangan|lost)\b/i.test(lower)) {
    itemType = 'found';
  }

  const tagInfo = classifyWithRegex(lower);
  const tag = tagInfo ? tagInfo.tag : null;
  if (!cat && tagInfo) cat = tagInfo.category;

  // Filter berdasarkan tag atau kategori
  let matchingItems = currentItems.filter((i) => {
    if (tag && i.tag === tag) return true;
    if (cat && i.category?.toLowerCase() === cat.toLowerCase()) return true;
    return false;
  });

  // Filter tambahan berdasarkan status (hilang / ketemu)
  if (matchingItems.length > 0 && itemType) {
    matchingItems = matchingItems.filter((i) => i.type === itemType);
  } else if (matchingItems.length === 0 && itemType && !tag && !cat) {
    matchingItems = currentItems.filter((i) => i.type === itemType);
  }

  // Fallback pencocokan berdasarkan judul barang di papan
  if (matchingItems.length === 0 && lower.length > 2 && !itemType) {
    matchingItems = currentItems.filter((i) =>
      i.title.toLowerCase().includes(lower.trim()) || lower.includes(i.title.toLowerCase())
    );
  }

  return {
    highlightCategory: cat,
    highlightTag: tag,
    highlightType: itemType,
    highlightItemIds: matchingItems.map((i) => i.id),
  };
}

// Builder prompt konteks papan untuk LLM Satpam AI
function buildSatpamPrompt(message: string, boardData: string, historyContext: string): string {
  return `Kamu adalah "Satpam AI", wujudmu karakter satpam kotak-kotak 8-bit retro di aplikasi Lost & Found kampus. 
Kamu ramah, asik, suka membantu mahasiswa dengan bahasa santai ala mahasiswa kampus.
Daftar barang di papan saat ini (lengkap dengan Tag & Kategori):
${boardData || 'Papan sedang kosong'}

Histori Percakapan Terakhir:
${historyContext}

Tugas: Balas pesan terakhir Mahasiswa ("${message}").
- Jika ditanya soal barang atau tag tertentu (misal: Gadget, Pakaian, Personal, Dokumen, HP, Kunci, dll), beri tahu ada atau tidaknya.
- Jika ada barang yang cocok di papan, sebutkan singkat dan katakan bahwa kamu sudah bantu menyorot/meng-highlight barangnya di papan!
- Jika tidak ada, sarankan untuk klik tombol LAPOR di pojok kiri atas.
- Maksimal 2-3 kalimat singkat, to the point.`;
}

// Handler event pesan obrolan Satpam AI
export async function handleChatMessage(socket: Socket, data: unknown): Promise<void> {
  const parsed = chatMessageSchema.safeParse(data);
  if (!parsed.success) {
    socket.emit('chat_reply', { reply: 'Data chat tidak valid.' });
    return;
  }

  const { message, boardData, historyContext } = parsed.data;
  const currentItems = getItems();

  const highlightInfo = detectHighlightIntent(message, currentItems);

  // Serialisasi data papan dengan metadata tag & kategori jika belum tersedia
  let enrichedBoardData = boardData;
  if (!enrichedBoardData || enrichedBoardData === 'Papan sedang kosong') {
    enrichedBoardData = currentItems
      .map((i) => `[${i.type.toUpperCase()} | ${i.category || 'Umum'} • ${i.tag || 'Lainnya'}] ${i.title} - Lokasi: ${i.desc}`)
      .join(' | ');
  }

  const prompt = buildSatpamPrompt(message, enrichedBoardData, historyContext);
  const reply = await chatWithAI(prompt);

  socket.emit('chat_reply', {
    reply: reply || 'Waduh, koneksi otakku lagi nge-lag nih. Coba lagi ya!',
    highlightTag: highlightInfo.highlightTag,
    highlightCategory: highlightInfo.highlightCategory,
    highlightType: highlightInfo.highlightType,
    highlightItemIds: highlightInfo.highlightItemIds,
  });
}
