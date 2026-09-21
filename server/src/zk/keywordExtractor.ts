import { preprocessText } from './nlpPreprocess.js';
import { normalizeKeywords, MAX_KEYWORDS } from './normalizeKeywords.js';
import { callGroqJson } from '../ai/groqClient.js';

/**
 * Stage 2 dari NLP Pipeline (Layer 2).
 * Berfungsi mengekstrak keyword fisik (ciri rahasia) dari teks bersih.
 * 
 * @param rawText Teks mentah dari pengguna (pelapor/pengklaim)
 * @returns Array string (tepat berisi MAX_KEYWORDS elemen, dinormalisasi)
 */
export async function extractKeywordsWithAI(rawText: string): Promise<string[]> {
  if (!rawText.trim()) {
    return normalizeKeywords([]);
  }

  // Stage 1: Preprocess (hapus stopword)
  const cleanText = preprocessText(rawText);

  // Jika teks sudah kosong setelah dibersihkan
  if (!cleanText.trim()) {
    return normalizeKeywords([]);
  }

  const prompt = `Kamu adalah AI NLP Extractor.
Tugasmu adalah mengekstrak maksimal ${MAX_KEYWORDS} kata kunci berupa "ciri fisik spesifik benda" dari teks yang diberikan.

ATURAN KETAT:
1. HANYA ambil objek, warna, motif, brand, atau bahan yang spesifik.
2. JANGAN ubah kata yang ada, cukup ekstrak kata dasarnya.
3. JANGAN tulis apapun selain format JSON yang diminta.

Teks input: "${cleanText}"

Format Output WAJIB:
{
  "keywords": ["ciri1", "ciri2"]
}`;

  const parsed = await callGroqJson<{ keywords?: unknown }>({
    messages: [
      {
        role: 'system',
        content: 'You are a deterministic NLP extractor. Output valid JSON strictly containing a "keywords" array of strings.',
      },
      { role: 'user', content: prompt },
    ],
    temperature: 0,
    timeoutMs: 8000,
  });

  if (parsed) {
    const extracted: string[] = Array.isArray(parsed.keywords) ? (parsed.keywords as string[]) : [];
    // Stage 3: Normalize
    return normalizeKeywords(extracted);
  }

  console.error('[Groq Extractor] Gagal memproses respons keyword.');

  // Jika error, kembalikan array normalisasi kosong (penuh dengan dummy)
  return normalizeKeywords([]);
}
