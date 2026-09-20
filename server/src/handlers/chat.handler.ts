import type { Socket } from 'socket.io';
import { chatMessageSchema } from '../schemas/chat.schema.js';
import { chatWithAI } from '../ai/verifyClaim.js';

// Menyusun prompt instruksi kepribadian dan konteks percakapan untuk Satpam AI
function buildSatpamPrompt(message: string, boardData: string, historyContext: string): string {
  return `Kamu adalah "Satpam AI", wujudmu karakter satpam kotak-kotak ala minecraft di aplikasi Lost & Found kampus. 
Kamu ramah, asik, dan suka membantu mahasiswa.
Daftar barang di papan saat ini: ${boardData || 'Papan sedang kosong'}.

Histori Percakapan Terakhir:
${historyContext}

Tugas: Balas pesan terakhir Mahasiswa ("${message}") dengan bahasa Indonesia santai ala mahasiswa. 
Jika ditanya soal barang, cek daftar barang di papan. Jika tidak ada, suruh lapor. Maksimal 2 kalimat singkat, to the point.`;
}

// Menangani pesan obrolan masuk dan membalas melalui respon AI Satpam
export async function handleChatMessage(socket: Socket, data: unknown): Promise<void> {
  const parsed = chatMessageSchema.safeParse(data);
  if (!parsed.success) {
    socket.emit('chat_reply', { reply: 'Data chat tidak valid.' });
    return;
  }

  const { message, boardData, historyContext } = parsed.data;
  const prompt = buildSatpamPrompt(message, boardData, historyContext);
  const reply = await chatWithAI(prompt);

  socket.emit('chat_reply', {
    reply: reply || 'Waduh, koneksi otakku lagi nge-lag nih. Coba lagi ya!',
  });
}
