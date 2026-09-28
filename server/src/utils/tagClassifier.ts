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

// Taksonomi kategori dan sub-tag resmi (42 Aset Desain)
export const TAG_CATALOG = {
  gadget: {
    name: 'Gadget',
    tags: [
      'handphone',
      'laptop',
      'tablet',
      'earphone',
      'hedset',
      'adapter',
      'powerbank',
      'smartwatch',
      'flashdisk',
      'mouse',
      'kalulator',
    ],
  },
  pakaian_aksesoris: {
    name: 'Pakaian & Aksesoris',
    tags: [
      'baju',
      'celana',
      'jaket',
      'sepatu',
      'sendal',
      'topi',
      'kaos_kaki',
      'sabuk',
      'kacamata',
      'jam_tangan',
      'cincin',
      'kalung',
      'gelang',
      'anting',
    ],
  },
  personal: {
    name: 'Personal',
    tags: [
      'dompet',
      'helm',
      'kunci_kendaraan',
      'kunci_rumah',
      'botol_minum',
      'tumbler',
      'tempat_makan',
      'ransel',
      'totebag',
      'slipbag',
      'tas_laptop',
      'pouch',
      'make_up',
      'barang_pribadi_lainnya',
    ],
  },
  dokumen_kartu: {
    name: 'Dokumen & Kartu',
    tags: ['tanda_pengenal', 'kartu_atm', 'stnk'],
  },
} as const;

// Klasifikasi dengan LLM Groq jika tidak terdeteksi via regex
export async function classifyWithAI(itemName: string, itemDesc: string = ''): Promise<TagInfo | null> {
  if (!isGroqConfigured()) return null;

  const prompt = `Kamu adalah AI pengkategorian barang Lost & Found kampus.
Tugasmu: Tentukan Kategori dan Tag barang berikut ini berdasarkan 42 aset resmi.

Nama Barang: "${itemName}"
Deskripsi/Lokasi: "${itemDesc}"

Daftar Pilihan Kategori dan Tag yang VALID:
1. Gadget -> handphone, laptop, tablet, earphone, hedset, adapter, powerbank, smartwatch, flashdisk, mouse, kalulator
2. Pakaian & Aksesoris -> baju, celana, jaket, sepatu, sendal, topi, kaos_kaki, sabuk, kacamata, jam_tangan, cincin, kalung, gelang, anting
3. Personal -> dompet, helm, kunci_kendaraan, kunci_rumah, botol_minum, tumbler, tempat_makan, ransel, totebag, slipbag, tas_laptop, pouch, make_up, barang_pribadi_lainnya
4. Dokumen & Kartu -> tanda_pengenal, kartu_atm, stnk

Kembalikan HANYA format JSON persis seperti ini:
{
  "category": "Gadget",
  "tag": "handphone",
  "label": "Handphone / HP"
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
    category: 'Personal',
    tag: 'barang_pribadi_lainnya',
    label: 'Barang Pribadi Lainnya',
  };
}
