import { callGroq, callGroqJson, GROQ_MODEL } from './groqClient.js';

interface VerifyResult {
  score: number;
  confidence: string;
  reasoning: string;
}

// Memverifikasi kecocokan detail rahasia barang dengan klaim via Groq API di server
export async function verifyClaimWithAI(
  secretDetail: string,
  claimText: string,
  itemTitle: string,
  itemDesc: string
): Promise<VerifyResult> {
  const secretPart = secretDetail
    ? `Detail rahasia pelapor (JANGAN ungkapkan isi detail ini dalam reasoning, hanya pakai untuk scoring): "${secretDetail}"`
    : 'Pelapor tidak menyertakan detail rahasia.';

  const prompt = `Kamu adalah sistem verifikasi klaim Lost & Found kampus.
Barang yang diklaim: "${itemTitle}"
Lokasi hilang/ditemukan: "${itemDesc}"
${secretPart}

Teks klaim dari pengklaim: "${claimText}"

ATURAN ZERO-HINT SANGAT KETAT (KEAMANAN SISTEM):
1. DILARANG KERAS membocorkan, menyinggung, memberi kisi-kisi, atau menyebutkan ciri apa yang kurang atau apa isi detail rahasia dalam field "reasoning".
2. JANGAN PERNAH berkata misalnya: "belum menyebutkan warna gantungan", "tidak ada info stiker", "kurang detail bagian dalam", dsb!
3. Jika teks klaim ambigu, setengah benar, atau hanya cocok dengan deskripsi publik:
   - Beri skor sedang (45 - 65).
   - "reasoning" WAJIB berupa kalimat netral tanpa petunjuk sama sekali, contoh: "Ciri yang disampaikan masih bersifat umum dan belum memuat tanda pengenal unik yang spesifik."
4. Hanya beri skor tinggi (>= 80) jika pengklaim secara jelas dan meyakinkan menyebutkan detail rahasia pelapor.
5. Jika salah atau bertolak belakang: beri skor rendah (< 40) dengan reasoning netral: "Ciri-ciri yang disampaikan tidak sesuai dengan data barang."

Kembalikan HANYA JSON persis format ini:
{
  "score": 0-100,
  "confidence": "Tinggi" atau "Sedang" atau "Rendah",
  "reasoning": "alasan singkat dan netral TANPA membocorkan kisi-kisi detail rahasia"
}`;

  const parsed = await callGroqJson<VerifyResult>({
    messages: [
      {
        role: 'system',
        content: 'You are an AI assistant for a campus Lost & Found system. You must always return valid JSON only.',
      },
      { role: 'user', content: prompt },
    ],
    temperature: 0.6,
    timeoutMs: 10000,
  });

  if (parsed) {
    return {
      score: parsed.score ?? 0,
      confidence: parsed.confidence ?? 'Rendah',
      reasoning: parsed.reasoning ?? 'Gagal memproses verifikasi.',
    };
  }

  return {
    score: 0,
    confidence: 'Rendah',
    reasoning: 'Gagal menghubungi AI untuk verifikasi.',
  };
}

// Memproses percakapan interaktif dengan Satpam AI via Groq API
export async function chatWithAI(prompt: string): Promise<string | null> {
  const result = await callGroq({
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.6,
    timeoutMs: 10000,
  });
  if (!result.success) {
    console.error('[Groq] Chat error:', result.error);
    return null;
  }
  return result.content;
}

// Menentukan icon emoji terbaik untuk barang yang dilaporkan menggunakan AI
export async function pickEmojiWithAI(itemName: string): Promise<string | null> {
  const prompt = `Pilih SATU buah emoji yang paling cocok untuk merepresentasikan barang ini: "${itemName}".
Kembalikan HANYA DALAM FORMAT JSON persis seperti ini:
{ "icon": "🎒" }`;

  const parsed = await callGroqJson<{ icon?: string }>({
    messages: [
      {
        role: 'system',
        content: 'You are an AI assistant for a campus Lost & Found system. You must always return valid JSON only.',
      },
      { role: 'user', content: prompt },
    ],
    temperature: 0.6,
    timeoutMs: 3000,
  });

  if (!parsed) {
    console.warn('[Groq] Emoji picker fallback: gagal memproses respons');
    return null;
  }
  return parsed.icon || null;
}

export { GROQ_MODEL };
