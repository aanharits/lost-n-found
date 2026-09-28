/**
 * Kamus aturan regex klasifikasi barang Lost & Found (44 Item Desain Resmi)
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

// ==========================================
// 1. GADGET (12 Items)
// ==========================================
export const GADGET_REGEX_RULES: TagRule[] = [
  {
    tag: 'handphone',
    category: 'Gadget',
    label: 'Handphone / HP',
    regex: /\b(hp|handphone|smartphone|ponsel|telepon|iphone|samsung|xiaomi|redmi|oppo|vivo|realme|infinix|poco|pixel|android|ios|rog phone)\b/i,
  },
  {
    tag: 'laptop',
    category: 'Gadget',
    label: 'Laptop',
    regex: /(?<!\btas\s+)\b(laptop|macbook|notebook|thinkpad|asus|acer|lenovo|dell|pavilion|rog|tuf|legion|ideapad|msi|chromebook)\b/i,
  },
  {
    tag: 'tablet',
    category: 'Gadget',
    label: 'Tablet / iPad',
    regex: /\b(tablet|ipad|tab|galaxy tab|ipad air|ipad pro|ipad mini)\b/i,
  },
  {
    tag: 'earphone',
    category: 'Gadget',
    label: 'Earphone / TWS',
    regex: /\b(earphone|ear-phone|tws|airpod\w*|earbud\w*|in-ear|galaxy buds)\b/i,
  },
  {
    tag: 'hedset',
    category: 'Gadget',
    label: 'Headset / Headphone',
    regex: /\b(hedset|headset|headphone|head-set|head-phone)\b/i,
  },
  {
    tag: 'adapter',
    category: 'Gadget',
    label: 'Adapter / Charger',
    regex: /\b(adapter|adaptor|charger|casan|colokan|kabel data|type[- ]?c|lightning|kabel cas|kepala charger)\b/i,
  },
  {
    tag: 'powerbank',
    category: 'Gadget',
    label: 'Powerbank',
    regex: /\b(powerbank|power bank|pb|anker|baseus|remax)\b/i,
  },
  {
    tag: 'smartwatch',
    category: 'Gadget',
    label: 'Smartwatch',
    regex: /\b(smartwatch|smart watch|apple watch|mi band|garmin|fitbit|galaxy watch|smart band|jam pintar)\b/i,
  },
  {
    tag: 'flashdisk',
    category: 'Gadget',
    label: 'Flashdisk / USB',
    regex: /\b(flashdisk|flash disk|usb|thumbdrive|pendrive|sandisk)\b/i,
  },
  {
    tag: 'mouse',
    category: 'Gadget',
    label: 'Mouse',
    regex: /\b(mouse|mousepad|logitech|razer)\b/i,
  },
  {
    tag: 'kalulator',
    category: 'Gadget',
    label: 'Kalkulator',
    regex: /\b(kalulator|kalkulator|calculator|casio|citiz\w*)\b/i,
  },
];

// ==========================================
// 2. PAKAIAN & AKSESORIS (14 Items)
// ==========================================
export const PAKAIAN_REGEX_RULES: TagRule[] = [
  {
    tag: 'anting',
    category: 'Pakaian & Aksesoris',
    label: 'Anting',
    regex: /\b(anting|anting-anting|earring\w*|giwang)\b/i,
  },
  {
    tag: 'baju',
    category: 'Pakaian & Aksesoris',
    label: 'Baju / Kaos',
    regex: /\b(baju|kaos|t-shirt|tshirt|kemeja|polo|blouse|jersey|singlet)\b/i,
  },
  {
    tag: 'celana',
    category: 'Pakaian & Aksesoris',
    label: 'Celana',
    regex: /\b(celana|jeans|chino|kulot|training|boxer|rok|trousers|pants)\b/i,
  },
  {
    tag: 'cincin',
    category: 'Pakaian & Aksesoris',
    label: 'Cincin',
    regex: /\b(cincin|ring|cincin tunangan|cincin emas|cincin perak)\b/i,
  },
  {
    tag: 'gelang',
    category: 'Pakaian & Aksesoris',
    label: 'Gelang',
    regex: /\b(gelang|bracelet|bangle|gelang emas|gelang perak)\b/i,
  },
  {
    tag: 'jaket',
    category: 'Pakaian & Aksesoris',
    label: 'Jaket / Hoodie',
    regex: /\b(jaket|jacket|hoodie|sweater|cardigan|rompi|outer|parka|varsity|windbreaker|almamater|jas lab|jas)\b/i,
  },
  {
    tag: 'jam_tangan',
    category: 'Pakaian & Aksesoris',
    label: 'Jam Tangan',
    regex: /\b(jam tangan|arloji|jam analog|jam digital|casio watch|g-shock|seiko)\b/i,
  },
  {
    tag: 'kacamata',
    category: 'Pakaian & Aksesoris',
    label: 'Kacamata',
    regex: /\b(kacamata|kaca mata|sunglasses|eyewear|frame kacamata|kacamata minus|kacamata baca)\b/i,
  },
  {
    tag: 'kalung',
    category: 'Pakaian & Aksesoris',
    label: 'Kalung',
    regex: /\b(kalung|necklace|liontin|kalung emas|kalung perak)\b/i,
  },
  {
    tag: 'kaos_kaki',
    category: 'Pakaian & Aksesoris',
    label: 'Kaos Kaki',
    regex: /\b(kaos kaki|kaoskaki|socks)\b/i,
  },
  {
    tag: 'sabuk',
    category: 'Pakaian & Aksesoris',
    label: 'Sabuk / Gesper',
    regex: /\b(sabuk|ikat pinggang|gesper|belt)\b/i,
  },
  {
    tag: 'sendal',
    category: 'Pakaian & Aksesoris',
    label: 'Sandal / Sendal',
    regex: /\b(sendal|sandal|slippers|flip[- ]?flop|crocs|swallow)\b/i,
  },
  {
    tag: 'sepatu',
    category: 'Pakaian & Aksesoris',
    label: 'Sepatu',
    regex: /\b(sepatu|sneaker\w*|pantofel|boots|flat shoes|heels|vans|converse|nike|adidas|ventela|compass)\b/i,
  },
  {
    tag: 'topi',
    category: 'Pakaian & Aksesoris',
    label: 'Topi',
    regex: /\b(topi|beanie|bucket hat|cap|snapback|kupluk|baret)\b/i,
  },
];

// ==========================================
// 3. PERSONAL (15 Items)
// ==========================================
export const PERSONAL_REGEX_RULES: TagRule[] = [
  {
    tag: 'kunci_rumah',
    category: 'Personal',
    label: 'Kunci Rumah',
    regex: /\b(kunci rumah|kunci kos|kunci kosan|kunci kost|kunci kamar|kunci pintu|kunci gembok|gembok)\b/i,
  },
  {
    tag: 'kunci_kendaraan',
    category: 'Personal',
    label: 'Kunci Kendaraan',
    regex: /\b(kunci motor|kunci mobil|kunci kendaraan|remote motor|remote mobil|kontak motor|kontak mobil|gantungan kunci|kunci)\b/i,
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
    regex: /\b(dompet|wallet|purse|card holder|cardholder)\b/i,
  },
  {
    tag: 'botol_minum',
    category: 'Personal',
    label: 'Botol Minum',
    regex: /\b(botol minum|botol air|water bottle|botol)\b/i,
  },
  {
    tag: 'tumbler',
    category: 'Personal',
    label: 'Tumbler / Termos',
    regex: /\b(tumbler|termos|thermos|corkcicle|stanley|hydroflask)\b/i,
  },
  {
    tag: 'tempat_makan',
    category: 'Personal',
    label: 'Tempat Makan',
    regex: /\b(tempat makan|kotak makan|lunch box|lunchbox|tupperware|mistin|tempat bekal|kotak bekal|bekal)\b/i,
  },
  {
    tag: 'tas_laptop',
    category: 'Personal',
    label: 'Tas Laptop',
    regex: /\b(tas laptop|laptop bag|sleeve laptop|softcase laptop)\b/i,
  },
  {
    tag: 'totebag',
    category: 'Personal',
    label: 'Totebag',
    regex: /\b(totebag|tote bag|tas jinjing)\b/i,
  },
  {
    tag: 'slipbag',
    category: 'Personal',
    label: 'Sling Bag / Waist Bag',
    regex: /\b(slipbag|sling bag|slingbag|waist bag|waistbag|tas selempang)\b/i,
  },
  {
    tag: 'ransel',
    category: 'Personal',
    label: 'Ransel / Backpack',
    regex: /\b(ransel|backpack|tas punggung|tas gendong|carrier|tas)\b/i,
  },
  {
    tag: 'pouch',
    category: 'Personal',
    label: 'Pouch / Kotak Pensil',
    regex: /\b(pouch|pouch bag|tempat pensil|kotak pensil|pencil case)\b/i,
  },
  {
    tag: 'make_up',
    category: 'Personal',
    label: 'Make Up / Kosmetik',
    regex: /\b(make up|makeup|lipstik|lipstick|lip balm|lip gloss|bedak|cushion|sunscreen|parfum|perfume|skincare|eyeliner|maskara|mascara)\b/i,
  },
  {
    tag: 'barang_pribadi_lainnya',
    category: 'Personal',
    label: 'Barang Pribadi Lainnya',
    regex: /\b(barang pribadi|payung|umbrella|sisir|cermin|kipas|buku|book|binder|novel|komik|catatan|modul|diktat|alat tulis|pulpen|bolpoin|pen|pensil|penghapus|tipex|penggaris|spidol)\b/i,
  },
];

// ==========================================
// 4. DOKUMEN & KARTU (3 Items)
// ==========================================
export const DOKUMEN_REGEX_RULES: TagRule[] = [
  {
    tag: 'kartu_atm',
    category: 'Dokumen & Kartu',
    label: 'Kartu ATM / Bank',
    regex: /\b(atm|kartu atm|kartu debit|kartu kredit|bca|mandiri|bni|bri|bsi|cimb|flazz|e-toll|emoney|e-money)\b/i,
  },
  {
    tag: 'stnk',
    category: 'Dokumen & Kartu',
    label: 'STNK',
    regex: /\b(stnk|surat tanda nomor kendaraan|surat kendaraan)\b/i,
  },
  {
    tag: 'tanda_pengenal',
    category: 'Dokumen & Kartu',
    label: 'Tanda Pengenal (KTP, SIM, KTM)',
    regex: /\b(ktm|ktp|sim|kartu tanda mahasiswa|kartu mahasiswa|e-ktp|kartu tanda penduduk|sim [abc]|surat izin mengemudi|id card|kartu praktikum|kartu identitas)\b/i,
  },
];

// Gabungan seluruh aturan regex (Dokumen dan Personal diprioritaskan agar frasa majemuk seperti tas laptop tidak tertimpa nama merek)
export const ALL_REGEX_RULES: TagRule[] = [
  ...DOKUMEN_REGEX_RULES,
  ...PERSONAL_REGEX_RULES,
  ...GADGET_REGEX_RULES,
  ...PAKAIAN_REGEX_RULES,
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
