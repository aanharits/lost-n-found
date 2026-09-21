/**
 * Kamus aturan regex klasifikasi barang Lost & Found
 */

export interface TagRule {
  tag: string;
  category: string;
  label: string;
  regex: RegExp;
}

export interface TagResult {
  category: string;
  tag: string;
  label: string;
}

// 1. Gadget
export const GADGET_REGEX_RULES: TagRule[] = [
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
];

// 2. Pakaian & Aksesoris
export const PAKAIAN_REGEX_RULES: TagRule[] = [
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
];

// 3. Personal
export const PERSONAL_REGEX_RULES: TagRule[] = [
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
];

// 4. Dokumen & Kartu
export const DOKUMEN_REGEX_RULES: TagRule[] = [
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

// Gabungan seluruh aturan regex
export const ALL_REGEX_RULES: TagRule[] = [
  ...GADGET_REGEX_RULES,
  ...PAKAIAN_REGEX_RULES,
  ...PERSONAL_REGEX_RULES,
  ...DOKUMEN_REGEX_RULES,
];

// Evaluasi teks terhadap daftar regex rule (0ms)
export function classifyWithRegex(text: string): TagResult | null {
  for (const rule of ALL_REGEX_RULES) {
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
