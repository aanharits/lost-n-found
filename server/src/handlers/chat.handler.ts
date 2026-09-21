import type { Socket } from 'socket.io';
import { chatMessageSchema } from '../schemas/chat.schema.js';
import { chatWithAI } from '../ai/verifyClaim.js';
import { getItems, type Item } from '../data/store.js';
import { classifyWithRegex } from '../utils/tagClassifier.js';

// Mendeteksi apakah user sedang menanyakan kategori, tag, status hilang/ketemu, atau barang spesifik
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

  // Filter barang yang cocok berdasarkan tag atau kategori
  let matchingItems = currentItems.filter((i) => {
    if (tag && i.tag === tag) return true;
    if (cat && i.category?.toLowerCase() === cat.toLowerCase()) return true;
    return false;
  });

  // Jika ada filter tipe (hilang / ketemu)
  if (matchingItems.length > 0 && itemType) {
    matchingItems = matchingItems.filter((i) => i.type === itemType);
  } else if (matchingItems.length === 0 && itemType && !tag && !cat) {
    matchingItems = currentItems.filter((i) => i.type === itemType);
  }

  // Jika tidak cocok via tag/kategori/tipe tapi menyebutkan nama barang tertentu di papan
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

// Menyusun prompt instruksi kepribadian dan konteks percakapan untuk Satpam AI
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

// Menangani pesan obrolan masuk dan membalas melalui respon AI Satpam beserta metadata sorotan
export async function handleChatMessage(socket: Socket, data: unknown): Promise<void> {
  const parsed = chatMessageSchema.safeParse(data);
  if (!parsed.success) {
    socket.emit('chat_reply', { reply: 'Data chat tidak valid.' });
    return;
  }

  const { message, boardData, historyContext } = parsed.data;
  const currentItems = getItems();

  // Deteksi sorotan tag/kategori dari pesan mahasiswa
  const highlightInfo = detectHighlightIntent(message, currentItems);

  // Buat boardData yang menyertakan informasi Tag & Kategori jika belum ada
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
