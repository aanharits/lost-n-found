import {
  classifyWithRegex,
  ALL_REGEX_RULES,
  type TagRule,
  type TagResult,
} from './tagRegexRules.js';
import { callGroqJson, isGroqConfigured } from '../ai/groqClient.js';

// Re-export untuk kompatibilitas modul
export { classifyWithRegex, ALL_REGEX_RULES as REGEX_RULES, type TagRule, type TagResult };

export interface TagInfo {
  category: string;
  tag: string;
  label: string;
}

// Taksonomi kategori dan sub-tag resmi
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

// Klasifikasi dengan LLM Groq jika tidak terdeteksi via regex
export async function classifyWithAI(itemName: string, itemDesc: string = ''): Promise<TagInfo | null> {
  if (!isGroqConfigured()) return null;

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

  const parsed = await callGroqJson<{ category?: string; tag?: string; label?: string }>({
    messages: [
      { role: 'system', content: 'You are a classification assistant. Return valid JSON only.' },
      { role: 'user', content: prompt },
    ],
    temperature: 0.2,
    timeoutMs: 4000,
  });

  if (parsed && parsed.tag && parsed.category) {
    return {
      category: parsed.category,
      tag: parsed.tag.toLowerCase().replace(/\s+/g, '_'),
      label: parsed.label || parsed.tag.toUpperCase(),
    };
  }

  return null;
}

// Pipeline klasifikasi utama: Regex -> AI Fallback -> Default
export async function autoClassifyItem(itemName: string, itemDesc: string = ''): Promise<TagInfo> {
  const combined = `${itemName} ${itemDesc}`;
  
  // 1. Pencocokan pola regex lokal (0ms)
  const regexResult = classifyWithRegex(combined);
  if (regexResult) {
    return regexResult;
  }

  // 2. Fallback AI jika tidak ada kecocokan regex
  const aiResult = await classifyWithAI(itemName, itemDesc);
  if (aiResult) {
    return aiResult;
  }

  // 3. Fallback default jika tidak terklasifikasi
  return {
    category: 'Lainnya',
    tag: 'lainnya',
    label: 'Lainnya',
  };
}
