import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { preprocessText } from './nlpPreprocess.js';
import { normalizeKeywords, MAX_KEYWORDS } from './normalizeKeywords.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = 'qwen/qwen3.8-27b'; // Model dari environment lokal/custom
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

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

  try {
    const response = await axios.post(
      GROQ_API_URL,
      {
        model: GROQ_MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are a deterministic NLP extractor. Output valid JSON strictly containing a "keywords" array of strings.',
          },
          { role: 'user', content: prompt },
        ],
        temperature: 0, // Deterministic: Harus 0
        response_format: { type: 'json_object' },
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${GROQ_API_KEY}`,
        },
        timeout: 8000,
      }
    );

    const result = response.data;
    if (result.choices && result.choices.length > 0) {
      const content = result.choices[0].message.content;
      const parsed = JSON.parse(content);
      
      const extracted: string[] = Array.isArray(parsed.keywords) ? parsed.keywords : [];
      
      // Stage 3: Normalize
      return normalizeKeywords(extracted);
    }
  } catch (error: any) {
    console.error('[Groq Extractor] Error:', error.message);
    if (error.response) {
      console.error('[Groq Extractor] Detail:', error.response.data);
    }
  }

  // Jika error, kembalikan array normalisasi kosong (penuh dengan dummy)
  return normalizeKeywords([]);
}
