import { preprocessText } from './nlpPreprocess.js';
import { normalizeKeywords, MAX_KEYWORDS } from './normalizeKeywords.js';
import { callGroqJson } from '../ai/groqClient.js';

/**
 * Stage 2 dari NLP Pipeline (Layer 2).
 * Berfungsi mengekstrak keyword fisik (ciri rahasia) dari teks bersih.
 *
 * Prompt sengaja dibuat KETAT + few-shot agar LLM cenderung menghasilkan
 * bentuk baku yang sama untuk makna yang sama (meminimalkan asimetri
 * antara keyword pelapor dan pengklaim). Lihat
 * docs/keyword_extraction_strategy.md §6.
 *
 * @param rawText Teks mentah dari pengguna (pelapor/pengklaim)
 * @returns Array string (0..MAX_KEYWORDS elemen, canonical, tanpa dummy)
 */
export async function extractKeywordsWithAI(rawText: string): Promise<string[]> {
  if (!rawText.trim()) {
    return normalizeKeywords([]);
  }

  // Stage 1: Preprocess (mekanis + stopword)
  const cleanText = preprocessText(rawText);

  // Jika teks sudah kosong setelah dibersihkan
  if (!cleanText.trim()) {
    return normalizeKeywords([]);
  }

  const systemPrompt =
    'You are a deterministic NLP keyword extractor for a campus Lost & Found system. ' +
    'Output MUST be identical for semantically identical text, regardless of writing style. ' +
    'Return valid JSON only, strictly containing a "keywords" array of lowercase strings.';

  const prompt = `Kamu adalah deterministic keyword extractor untuk sistem Lost & Found.
Output HARUS persis sama untuk makna yang sama, apa pun gaya bahasanya.

TUGAS: ekstrak maksimal ${MAX_KEYWORDS} CIRI FISIK PEMBEDA dari teks.

ATURAN WAJIB:
1. Bentuk kata DASAR/tunggal, huruf kecil, tanpa imbuhan.
   Contoh: "stickernya" -> "stiker"; "dompetku hitam" -> ["dompet","hitam"].
2. Gunakan BENTUK BAKU berikut bila muncul variasi:
   sticker/stiker -> stiker | hape/handphone -> hp | tas/ransel/backpack -> tas
   ujan/hujan -> hujan | casan/charger -> charger | dompet/wallet -> dompet
3. DILARANG kata umum yang tidak membedakan:
   besar, kecil, bagus, unik, cantik, lucu, mahal, murah, baru, lama, biasa, umum, barang, mainan.
4. HANYA masukkan ciri yang benar-benar membedakan dari barang sejenis.
5. Jangan mengarang ciri yang tidak ada di teks.
6. Urutkan menaik (A-Z), buang duplikat.

Kembalikan HANYA JSON:
{"keywords": ["ciri1", "ciri2"]}

CONTOH:
Input: "helmnya ada sticker anak geologi sama jas ujan warna biru"
Output: {"keywords": ["biru","geologi","hujan","jas","stiker"]}

Input: "dompet hitam kulit ada logo kuda"
Output: {"keywords": ["hitam","kuda","kulit","logo"]}

Teks input: "${cleanText}"`;

  const parsed = await callGroqJson<{ keywords?: unknown }>({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt },
    ],
    temperature: 0,
    timeoutMs: 8000,
  });

  if (parsed) {
    const extracted: string[] = Array.isArray(parsed.keywords) ? (parsed.keywords as string[]) : [];
    // Stage 3: Normalize (lowercase, dedup, sort, cap)
    return normalizeKeywords(extracted);
  }

  console.error('[Groq Extractor] Gagal memproses respons keyword.');

  // Jika error, kembalikan array kosong (bukan dummy)
  return normalizeKeywords([]);
}
