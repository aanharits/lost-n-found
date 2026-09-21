import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

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

// Kamus Regex komprehensif untuk mendeteksi barang kampus (Bahasa Indonesia, slang, brand)
const REGEX_RULES: Array<{ tag: string; category: string; label: string; regex: RegExp }> = [
  // Gadget
  {
    tag: 'hp',
    category: 'Gadget',
    label: 'HP',
    regex: /\b(hp|handphone|smartphone|ponsel|telepon|iphone|samsung|xiaomi|redmi|oppo|vivo|realme|infinix|poco|pixel|android|ios|rog phone)\b/i,
  },
  {
    tag: 'laptop',
    category: 'Gadget',
    label: 'Laptop',
    regex: /\b(laptop|macbook|notebook|thinkpad|asus|acer|lenovo|dell|pavilion|rog|tuf|legion|ideapad|msi|chromebook)\b/i,
  },
  {
    tag: 'tws',
    category: 'Gadget',
    label: 'TWS',
    regex: /\b(tws|airpod\w*|earbud\w*|headset|earphone|headphone|buds|galaxy buds|head-set|ear-phone)\b/i,
  },
  {
    tag: 'casan',
    category: 'Gadget',
    label: 'Casan',
    regex: /\b(casan|charger|kabel data|type[- ]?c|lightning|adapter|adaptor|powerbank|power bank|colokan|kabel cas)\b/i,
  },
  {
    tag: 'kalkulator',
    category: 'Gadget',
    label: 'Kalkulator',
    regex: /\b(kalkulator|calculator|casio|citiz\w*)\b/i,
  },
  {
    tag: 'smartwatch',
    category: 'Gadget',
    label: 'Smartwatch',
    regex: /\b(smartwatch|smart watch|apple watch|mi band|garmin|fitbit|galaxy watch|smart band|jam pintar)\b/i,
  },

  // Pakaian & Aksesoris
  {
    tag: 'kacamata',
    category: 'Pakaian & Aksesoris',
    label: 'Kacamata',
    regex: /\b(kacamata|kaca mata|sunglasses|eyewear|frame kacamata)\b/i,
  },
  {
    tag: 'jaket',
    category: 'Pakaian & Aksesoris',
    label: 'Jaket',
    regex: /\b(jaket|jacket|hoodie|sweater|cardigan|rompi|outer|parka|varsity|windbreaker|almamater|jas lab)\b/i,
  },
  {
    tag: 'sepatu',
    category: 'Pakaian & Aksesoris',
    label: 'Sepatu',
    regex: /\b(sepatu|sneaker\w*|pantofel|boots|flat shoes|heels|sandal|sendal|vans|converse|nike|adidas|ventela|compass)\b/i,
  },
  {
    tag: 'tas',
    category: 'Pakaian & Aksesoris',
    label: 'Tas',
    regex: /\b(tas|ransel|backpack|tote bag|totebag|waist bag|waistbag|sling bag|slingbag|carrier|tas punggung|tas jinjing|tas selempang)\b/i,
  },
  {
    tag: 'perhiasan',
    category: 'Pakaian & Aksesoris',
    label: 'Perhiasan',
    regex: /\b(perhiasan|cincin|kalung|gelang|anting|liontin|emas|perak|jewelry|bracelet|necklace|ring)\b/i,
  },
  {
    tag: 'kaos_kaki',
    category: 'Pakaian & Aksesoris',
    label: 'Kaos Kaki',
    regex: /\b(kaos kaki|kaoskaki|socks)\b/i,
  },
  {
    tag: 'topi',
    category: 'Pakaian & Aksesoris',
    label: 'Topi',
    regex: /\b(topi|beanie|bucket hat|cap|snapback|kupluk|baret)\b/i,
  },

  // Personal
  {
    tag: 'kunci',
    category: 'Personal',
    label: 'Kunci',
    regex: /\b(kunci|key|kontak|remote|gantungan kunci|vario|beat|scoopy|nmax|pcx|aerox|mio|cbr|ninja|klx|brio|avanza|innova|motor|mobil)\b/i,
  },
  {
    tag: 'helm',
    category: 'Personal',
    label: 'Helm',
    regex: /\b(helm|helmet|kyt|ink|nhk|bogo|agv|shoei|arai|zeus|cargloss|jpn)\b/i,
  },
  {
    tag: 'dompet',
    category: 'Personal',
    label: 'Dompet',
    regex: /\b(dompet|wallet|purse|pouch|card holder|cardholder)\b/i,
  },
  {
    tag: 'tempat_makan',
    category: 'Personal',
    label: 'Tempat Makan',
    regex: /\b(tempat makan|kotak makan|lunch box|lunchbox|tupperware|tumbler|botol|botol minum|thermos|termos|mistin)\b/i,
  },
  {
    tag: 'buku',
    category: 'Personal',
    label: 'Buku',
    regex: /\b(buku|book|binder|novel|komik|catatan|modul|diktat|kitab)\b/i,
  },
  {
    tag: 'alat_tulis',
    category: 'Personal',
    label: 'Alat Tulis',
    regex: /\b(alat tulis|pulpen|bolpoin|pen|pensil|pencil|penghapus|tipex|tip-ex|penggaris|spidol|pencil case|kotak pensil|tempat pensil|stabilo)\b/i,
  },
  {
    tag: 'make_up',
    category: 'Personal',
    label: 'Make Up',
    regex: /\b(make up|makeup|lipstik|lipstick|lip balm|lip gloss|bedak|cushion|sunscreen|parfum|perfume|skincare|eyeliner|maskara|mascara|sisir|cermin)\b/i,
  },

  // Dokumen & Kartu
  {
    tag: 'ktm',
    category: 'Dokumen & Kartu',
    label: 'KTM',
    regex: /\b(ktm|kartu tanda mahasiswa|kartu mahasiswa|id card kampus)\b/i,
  },
  {
    tag: 'ktp',
    category: 'Dokumen & Kartu',
    label: 'KTP',
    regex: /\b(ktp|kartu tanda penduduk|e-ktp)\b/i,
  },
  {
    tag: 'sim',
    category: 'Dokumen & Kartu',
    label: 'SIM',
    regex: /\b(sim [abc]|surat izin mengemudi)\b/i,
  },
  {
    tag: 'atm',
    category: 'Dokumen & Kartu',
    label: 'ATM',
    regex: /\b(atm|kartu debit|kartu kredit|bca|mandiri|bni|bri|bsi|cimb|flazz|e-toll|emoney|e-money)\b/i,
  },
  {
    tag: 'kartu_praktikum',
    category: 'Dokumen & Kartu',
    label: 'Kartu Praktikum',
    regex: /\b(kartu praktikum|kartu lab|kartu ujian|kartu perpus\w*|kartu perpustakaan)\b/i,
  },
];

// Deteksi tag via Regex berkecepatan 0ms
export function classifyWithRegex(text: string): TagInfo | null {
  for (const rule of REGEX_RULES) {
    if (rule.regex.test(text)) {
      return {
        category: rule.category,
        tag: rule.tag,
        label: rule.label,
      };
    }
  }
  return null;
}

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
