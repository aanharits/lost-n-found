import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Muat konfigurasi .env dengan path terverifikasi
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = 'qwen/qwen3.8-27b';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

if (!GROQ_API_KEY) {
  console.warn('[Groq] GROQ_API_KEY belum disetel di .env');
}

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

  try {
    const response = await axios.post(
      GROQ_API_URL,
      {
        model: GROQ_MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are an AI assistant for a campus Lost & Found system. You must always return valid JSON only.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.6,
        response_format: { type: 'json_object' },
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${GROQ_API_KEY}`,
        },
        timeout: 10000,
      }
    );

    const result = response.data;
    if (result.choices && result.choices.length > 0) {
      const text = result.choices[0].message.content;
      const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      return {
        score: parsed.score ?? 0,
        confidence: parsed.confidence ?? 'Rendah',
        reasoning: parsed.reasoning ?? 'Gagal memproses verifikasi.',
      };
    }
  } catch (error: any) {
    console.error('[Groq] Verification error:', error.message);
  }

  return {
    score: 0,
    confidence: 'Rendah',
    reasoning: 'Gagal menghubungi AI untuk verifikasi.',
  };
}

// Memproses percakapan interaktif dengan Satpam AI via Groq API
export async function chatWithAI(prompt: string): Promise<string | null> {
  try {
    const response = await axios.post(
      GROQ_API_URL,
      {
        model: GROQ_MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.6,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${GROQ_API_KEY}`,
        },
        timeout: 10000,
      }
    );

    const result = response.data;
    if (result.choices && result.choices.length > 0) {
      return result.choices[0].message.content;
    }
  } catch (error: any) {
    console.error('[Groq] Chat error:', error.message);
  }

  return null;
}

// Menentukan icon emoji terbaik untuk barang yang dilaporkan menggunakan AI
export async function pickEmojiWithAI(itemName: string): Promise<string | null> {
  const prompt = `Pilih SATU buah emoji yang paling cocok untuk merepresentasikan barang ini: "${itemName}".
Kembalikan HANYA DALAM FORMAT JSON persis seperti ini:
{ "icon": "🎒" }`;

  try {
    const response = await axios.post(
      GROQ_API_URL,
      {
        model: GROQ_MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are an AI assistant for a campus Lost & Found system. You must always return valid JSON only.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0.6,
        response_format: { type: 'json_object' },
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${GROQ_API_KEY}`,
        },
        timeout: 3000,
      }
    );

    const result = response.data;
    if (result.choices && result.choices.length > 0) {
      const text = result.choices[0].message.content;
      const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      return parsed.icon || null;
    }
  } catch (error: any) {
    console.warn('[Groq] Emoji picker fallback:', error.message);
  }

  return null;
}
