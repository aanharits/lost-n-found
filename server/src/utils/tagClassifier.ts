import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  classifyWithRegex,
  ALL_REGEX_RULES,
  type TagRule,
  type TagResult,
} from './tagRegexRules.js';

// Re-export untuk kompatibilitas penuh & kemudahan pemanggilan
export { classifyWithRegex, ALL_REGEX_RULES as REGEX_RULES, type TagRule, type TagResult };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = 'qwen/qwen3.8-27b';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

export interface TagInfo {
  category: string;
  tag: string;
  label: string;
}

// Definisi taxonomi kategori dan sub-tag sesuai spesifikasi desain tim
export const TAG_CATALOG = {
  gadget: {
    name: 'Gadget',
    tags: ['hp', 'laptop', 'tws', 'casan', 'kalkulator', 'smartwatch'],
  },
  pakaian_aksesoris: {
    name: 'Pakaian & Aksesoris',
    tags: ['kacamata', 'jaket', 'sepatu', 'tas', 'perhiasan', 'kaos_kaki', 'topi'],
  },
  personal: {
    name: 'Personal',
    tags: ['kunci', 'helm', 'dompet', 'tempat_makan', 'buku', 'alat_tulis', 'make_up'],
  },
  dokumen_kartu: {
    name: 'Dokumen & Kartu',
    tags: ['ktm', 'ktp', 'sim', 'atm', 'kartu_praktikum'],
  },
  lainnya: {
    name: 'Lainnya',
    tags: ['lainnya'],
  },
} as const;

// Deteksi tag via AI Groq jika teks tidak terdeteksi via Regex
export async function classifyWithAI(itemName: string, itemDesc: string = ''): Promise<TagInfo | null> {
  if (!GROQ_API_KEY) return null;

  const prompt = `Kamu adalah AI pengkategorian barang Lost & Found kampus.
Tugasmu: Tentukan Kategori dan Tag barang berikut ini.

Nama Barang: "${itemName}"
Deskripsi/Lokasi: "${itemDesc}"

Daftar Pilihan Kategori dan Tag yang VALID:
1. Gadget -> hp, laptop, tws, casan, kalkulator, smartwatch
2. Pakaian & Aksesoris -> kacamata, jaket, sepatu, tas, perhiasan, kaos_kaki, topi
3. Personal -> kunci, helm, dompet, tempat_makan, buku, alat_tulis, make_up
4. Dokumen & Kartu -> ktm, ktp, sim, atm, kartu_praktikum
5. Lainnya -> lainnya

Kembalikan HANYA format JSON persis seperti ini:
{
  "category": "Gadget",
  "tag": "hp",
  "label": "HP"
}`;

  try {
    const response = await axios.post(
      GROQ_API_URL,
      {
        model: GROQ_MODEL,
        messages: [
          { role: 'system', content: 'You are a classification assistant. Return valid JSON only.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.2,
        response_format: { type: 'json_object' },
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${GROQ_API_KEY}`,
        },
        timeout: 4000,
      }
    );

    const result = response.data;
    if (result.choices && result.choices.length > 0) {
      const text = result.choices[0].message.content;
      const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      if (parsed.tag && parsed.category) {
        return {
          category: parsed.category,
          tag: parsed.tag.toLowerCase().replace(/\s+/g, '_'),
          label: parsed.label || parsed.tag.toUpperCase(),
        };
      }
    }
  } catch (error: any) {
    console.warn('[TagClassifier] AI fallback error:', error.message);
  }

  return null;
}

// Fungsi utama klasifikasi gabungan: Regex Cepat -> AI Fallback -> Default Lainnya
export async function autoClassifyItem(itemName: string, itemDesc: string = ''): Promise<TagInfo> {
  const combined = `${itemName} ${itemDesc}`;
  
  // 1. Cek via Regex Lokal (Instan 0ms)
  const regexResult = classifyWithRegex(combined);
  if (regexResult) {
    return regexResult;
  }

  // 2. Cek via AI Groq jika kata kunci tidak umum
  const aiResult = await classifyWithAI(itemName, itemDesc);
  if (aiResult) {
    return aiResult;
  }

  // 3. Fallback Default
  return {
    category: 'Lainnya',
    tag: 'lainnya',
    label: 'Lainnya',
  };
}
