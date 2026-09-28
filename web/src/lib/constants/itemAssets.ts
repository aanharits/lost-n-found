/**
 * Mapping Komprehensif Aset Desain Lost & Found (42 Item Desain Resmi)
 * Catatan: alat_makan dan camera telah dihapus sesuai arahan pengguna.
 */

export type CategoryId = 'Gadget' | 'Pakaian & Aksesoris' | 'Personal' | 'Dokumen & Kartu';

export interface ItemAssetInfo {
  tag: string;
  category: CategoryId;
  label: string;
  assetFile: string;
  aliases: string[];
}

export const ITEM_ASSETS: ItemAssetInfo[] = [
  // ==========================================
  // 1. GADGET (11 Items)
  // ==========================================
  {
    tag: 'adapter',
    category: 'Gadget',
    label: 'Adapter / Charger',
    assetFile: 'adapter.svg',
    aliases: ['casan', 'charger', 'adaptor', 'kabel data', 'colokan', 'kabel cas', 'kepala charger', 'type c', 'lightning']
  },
  {
    tag: 'earphone',
    category: 'Gadget',
    label: 'Earphone / TWS',
    assetFile: 'earphone.svg',
    aliases: ['tws', 'airpods', 'airpod', 'earbuds', 'earbud', 'in ear', 'galaxy buds', 'ear phone']
  },
  {
    tag: 'flashdisk',
    category: 'Gadget',
    label: 'Flashdisk / USB',
    assetFile: 'flashdisk.svg',
    aliases: ['flashdisk', 'flash disk', 'usb', 'thumbdrive', 'pendrive', 'sandisk']
  },
  {
    tag: 'handphone',
    category: 'Gadget',
    label: 'Handphone / HP',
    assetFile: 'handphone.svg',
    aliases: ['hp', 'smartphone', 'ponsel', 'iphone', 'samsung', 'android', 'telepon', 'xiaomi', 'redmi', 'oppo', 'vivo', 'realme', 'infinix', 'poco', 'pixel']
  },
  {
    tag: 'hedset',
    category: 'Gadget',
    label: 'Headset / Headphone',
    assetFile: 'hedset.svg',
    aliases: ['headset', 'headphone', 'head set', 'hedset']
  },
  {
    tag: 'kalulator',
    category: 'Gadget',
    label: 'Kalkulator',
    assetFile: 'kalulator.svg',
    aliases: ['kalkulator', 'calculator', 'kalulator', 'casio', 'citizen']
  },
  {
    tag: 'laptop',
    category: 'Gadget',
    label: 'Laptop',
    assetFile: 'laptop.svg',
    aliases: ['laptop', 'macbook', 'notebook', 'thinkpad', 'ideapad', 'chromebook', 'asus', 'lenovo', 'dell']
  },
  {
    tag: 'mouse',
    category: 'Gadget',
    label: 'Mouse',
    assetFile: 'mouse.svg',
    aliases: ['mouse', 'mouse wireless', 'mousepad', 'logitech']
  },
  {
    tag: 'powerbank',
    category: 'Gadget',
    label: 'Powerbank',
    assetFile: 'powerbank.svg',
    aliases: ['powerbank', 'power bank', 'pb']
  },
  {
    tag: 'smartwatch',
    category: 'Gadget',
    label: 'Smartwatch',
    assetFile: 'smartwatch.svg',
    aliases: ['smartwatch', 'smart watch', 'apple watch', 'mi band', 'garmin', 'fitbit', 'galaxy watch', 'jam pintar']
  },
  {
    tag: 'tablet',
    category: 'Gadget',
    label: 'Tablet / iPad',
    assetFile: 'tablet.svg',
    aliases: ['tablet', 'ipad', 'tab', 'galaxy tab', 'ipad pro', 'ipad air', 'ipad mini']
  },

  // ==========================================
  // 2. PAKAIAN & AKSESORIS (14 Items)
  // ==========================================
  {
    tag: 'anting',
    category: 'Pakaian & Aksesoris',
    label: 'Anting',
    assetFile: 'anting.svg',
    aliases: ['anting', 'anting anting', 'earring', 'earrings', 'giwang']
  },
  {
    tag: 'baju',
    category: 'Pakaian & Aksesoris',
    label: 'Baju / Kaos',
    assetFile: 'baju.svg',
    aliases: ['baju', 'kaos', 't-shirt', 'tshirt', 'kemeja', 'pakaian', 'polo', 'blouse', 'jersey', 'singlet']
  },
  {
    tag: 'celana',
    category: 'Pakaian & Aksesoris',
    label: 'Celana',
    assetFile: 'celana.svg',
    aliases: ['celana', 'jeans', 'chino', 'kulot', 'training', 'boxer', 'rok', 'trousers', 'pants']
  },
  {
    tag: 'cincin',
    category: 'Pakaian & Aksesoris',
    label: 'Cincin',
    assetFile: 'cincin.svg',
    aliases: ['cincin', 'ring', 'perhiasan']
  },
  {
    tag: 'gelang',
    category: 'Pakaian & Aksesoris',
    label: 'Gelang',
    assetFile: 'gelang.svg',
    aliases: ['gelang', 'bracelet', 'bangle']
  },
  {
    tag: 'jaket',
    category: 'Pakaian & Aksesoris',
    label: 'Jaket / Hoodie',
    assetFile: 'jaket.svg',
    aliases: ['jaket', 'jacket', 'hoodie', 'sweater', 'cardigan', 'outer', 'parka', 'varsity', 'windbreaker', 'almamater', 'jas lab', 'jas']
  },
  {
    tag: 'jam_tangan',
    category: 'Pakaian & Aksesoris',
    label: 'Jam Tangan',
    assetFile: 'jam_tangan.svg',
    aliases: ['jam tangan', 'arloji', 'jam analog', 'jam digital', 'watch', 'jam']
  },
  {
    tag: 'kacamata',
    category: 'Pakaian & Aksesoris',
    label: 'Kacamata',
    assetFile: 'kacamata.svg',
    aliases: ['kacamata', 'kaca mata', 'sunglasses', 'eyewear', 'frame kacamata']
  },
  {
    tag: 'kalung',
    category: 'Pakaian & Aksesoris',
    label: 'Kalung',
    assetFile: 'kalung.svg',
    aliases: ['kalung', 'necklace', 'liontin']
  },
  {
    tag: 'kaos_kaki',
    category: 'Pakaian & Aksesoris',
    label: 'Kaos Kaki',
    assetFile: 'kaos_kaki.svg',
    aliases: ['kaos kaki', 'kaoskaki', 'socks']
  },
  {
    tag: 'sabuk',
    category: 'Pakaian & Aksesoris',
    label: 'Sabuk / Gesper',
    assetFile: 'sabuk.svg',
    aliases: ['sabuk', 'ikat pinggang', 'belt', 'gesper']
  },
  {
    tag: 'sendal',
    category: 'Pakaian & Aksesoris',
    label: 'Sandal / Sendal',
    assetFile: 'sendal.svg',
    aliases: ['sendal', 'sandal', 'slippers', 'flip flop', 'crocs', 'swallow']
  },
  {
    tag: 'sepatu',
    category: 'Pakaian & Aksesoris',
    label: 'Sepatu',
    assetFile: 'sepatu.svg',
    aliases: ['sepatu', 'sneakers', 'sneaker', 'boots', 'shoes', 'pantofel', 'flat shoes', 'heels', 'converse', 'vans', 'ventela', 'compass']
  },
  {
    tag: 'topi',
    category: 'Pakaian & Aksesoris',
    label: 'Topi',
    assetFile: 'topi.svg',
    aliases: ['topi', 'cap', 'beanie', 'bucket hat', 'kupluk', 'snapback']
  },

  // ==========================================
  // 3. PERSONAL (14 Items)
  // ==========================================
  {
    tag: 'tempat_makan',
    category: 'Personal',
    label: 'Tempat Makan',
    assetFile: 'tempat_makan.svg',
    aliases: ['tempat makan', 'kotak makan', 'lunchbox', 'lunch box', 'tupperware', 'mistin', 'tempat bekal', 'kotak bekal', 'bekal']
  },
  {
    tag: 'botol_minum',
    category: 'Personal',
    label: 'Botol Minum',
    assetFile: 'botol_minum.svg',
    aliases: ['botol minum', 'botol air', 'water bottle', 'botol']
  },
  {
    tag: 'tumbler',
    category: 'Personal',
    label: 'Tumbler / Termos',
    assetFile: 'tumbler.svg',
    aliases: ['tumbler', 'termos', 'thermos', 'corkcicle', 'stanley', 'hydroflask']
  },
  {
    tag: 'dompet',
    category: 'Personal',
    label: 'Dompet',
    assetFile: 'dompet.svg',
    aliases: ['dompet', 'wallet', 'purse', 'cardholder', 'card holder']
  },
  {
    tag: 'helm',
    category: 'Personal',
    label: 'Helm',
    assetFile: 'helm.svg',
    aliases: ['helm', 'helmet', 'kyt', 'ink', 'nhk', 'bogo', 'agv', 'shoei', 'arai', 'zeus', 'cargloss', 'jpn']
  },
  {
    tag: 'kunci_kendaraan',
    category: 'Personal',
    label: 'Kunci Kendaraan',
    assetFile: 'kunci_kendaraan.svg',
    aliases: ['kunci motor', 'kunci mobil', 'remote motor', 'remote mobil', 'kontak motor', 'kontak mobil', 'gantungan kunci', 'kunci kendaraan', 'kunci']
  },
  {
    tag: 'kunci_rumah',
    category: 'Personal',
    label: 'Kunci Rumah',
    assetFile: 'kunci_rumah.svg',
    aliases: ['kunci rumah', 'kunci kos', 'kunci kosan', 'kunci kost', 'kunci kamar', 'kunci pintu', 'kunci gembok', 'gembok']
  },
  {
    tag: 'make_up',
    category: 'Personal',
    label: 'Make Up / Kosmetik',
    assetFile: 'make_up.svg',
    aliases: ['make up', 'makeup', 'lipstik', 'lipstick', 'skincare', 'bedak', 'cushion', 'sunscreen', 'parfum', 'perfume', 'eyeliner', 'maskara']
  },
  {
    tag: 'pouch',
    category: 'Personal',
    label: 'Pouch / Kotak Pensil',
    assetFile: 'pouch.svg',
    aliases: ['pouch', 'kotak pensil', 'tempat pensil', 'pencil case', 'pouch bag']
  },
  {
    tag: 'ransel',
    category: 'Personal',
    label: 'Ransel / Backpack',
    assetFile: 'ransel.svg',
    aliases: ['ransel', 'backpack', 'tas punggung', 'tas gendong', 'carrier', 'tas']
  },
  {
    tag: 'slipbag',
    category: 'Personal',
    label: 'Sling Bag / Waist Bag',
    assetFile: 'slipbag.svg',
    aliases: ['slipbag', 'sling bag', 'slingbag', 'waist bag', 'waistbag', 'tas selempang']
  },
  {
    tag: 'tas_laptop',
    category: 'Personal',
    label: 'Tas Laptop',
    assetFile: 'tas_laptop.svg',
    aliases: ['tas laptop', 'laptop bag', 'sleeve laptop', 'softcase laptop']
  },
  {
    tag: 'totebag',
    category: 'Personal',
    label: 'Totebag',
    assetFile: 'totebag.svg',
    aliases: ['totebag', 'tote bag', 'tas jinjing']
  },
  {
    tag: 'barang_pribadi_lainnya',
    category: 'Personal',
    label: 'Barang Pribadi Lainnya',
    assetFile: 'barang_pribadi_lainnya.svg',
    aliases: ['barang pribadi', 'payung', 'umbrella', 'sisir', 'cermin', 'kipas', 'buku', 'book', 'binder', 'novel', 'komik', 'catatan', 'modul', 'diktat', 'alat tulis', 'pulpen', 'bolpoin', 'pen', 'pensil', 'penghapus', 'tipex', 'penggaris', 'spidol', 'lainnya']
  },

  // ==========================================
  // 4. DOKUMEN & KARTU (3 Items)
  // ==========================================
  {
    tag: 'kartu_atm',
    category: 'Dokumen & Kartu',
    label: 'Kartu ATM / Bank',
    assetFile: 'kartu_atm.svg',
    aliases: ['kartu atm', 'atm', 'kartu debit', 'kartu kredit', 'bca', 'mandiri', 'bni', 'bri', 'bsi', 'cimb', 'flazz', 'e-toll', 'emoney', 'e-money']
  },
  {
    tag: 'stnk',
    category: 'Dokumen & Kartu',
    label: 'STNK',
    assetFile: 'stnk.svg',
    aliases: ['stnk', 'surat tanda nomor kendaraan', 'surat kendaraan']
  },
  {
    tag: 'tanda_pengenal',
    category: 'Dokumen & Kartu',
    label: 'Tanda Pengenal (KTP, SIM, KTM)',
    assetFile: 'tanda_pengenal.svg',
    aliases: ['ktm', 'ktp', 'sim', 'kartu tanda mahasiswa', 'kartu mahasiswa', 'e-ktp', 'kartu tanda penduduk', 'sim a', 'sim c', 'surat izin mengemudi', 'id card', 'kartu praktikum', 'kartu identitas', 'kartu pelajar']
  },
];

// Lookup Map langsung untuk Tag
const TAG_MAP = new Map<string, ItemAssetInfo>();

for (const item of ITEM_ASSETS) {
  TAG_MAP.set(item.tag.toLowerCase(), item);
  TAG_MAP.set(item.assetFile.replace('.svg', '').toLowerCase(), item);
  for (const alias of item.aliases) {
    TAG_MAP.set(alias.toLowerCase(), item);
    TAG_MAP.set(alias.toLowerCase().replace(/[\s-]+/g, '_'), item);
  }
}

// Kompilasi aturan pencocokan kata (word-boundary) terurut dari yang terpanjang ke terpendek
interface CompiledRule {
  keyword: string;
  regex: RegExp;
  item: ItemAssetInfo;
}

const COMPILED_RULES: CompiledRule[] = [];

for (const item of ITEM_ASSETS) {
  const allTerms = [item.tag.replace(/_/g, ' '), ...item.aliases.map((a) => a.replace(/_/g, ' '))];
  for (const term of allTerms) {
    const trimmed = term.trim().toLowerCase();
    if (!trimmed) continue;
    const escaped = trimmed.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
    // Batasan kata agar 'cam' tidak cocok ke 'kacamata', atau 'tas' tidak cocok ke 'kertas'
    const regex = new RegExp(`(^|[^a-zA-Z0-9])${escaped}($|[^a-zA-Z0-9])`, 'i');
    COMPILED_RULES.push({ keyword: trimmed, regex, item });
  }
}

// Urutkan berdasarkan panjang keyword menurun (frasa majemuk diprioritaskan)
COMPILED_RULES.sort((a, b) => b.keyword.length - a.keyword.length);

/**
 * Mencocokkan teks (judul/nama barang) secara akurat berdasarkan keyword dengan batas kata
 */
export function matchItemByText(text: string): ItemAssetInfo | null {
  if (!text) return null;
  const target = ` ${text.trim().toLowerCase()} `;
  for (const rule of COMPILED_RULES) {
    if (rule.regex.test(target)) {
      return rule.item;
    }
  }
  return null;
}

/**
 * Mengambil path URL aset SVG asli berdasarkan tag atau teks nama barang
 */
export function getItemAsset(tag?: string, titleFallback?: string): string | null {
  if (tag) {
    const normalized = tag.toLowerCase().trim().replace(/[\s-]+/g, '_');
    const found = TAG_MAP.get(normalized);
    if (found) {
      return `/items/${found.assetFile}`;
    }
  }

  // Jika tag tidak ada atau belum terdaftar, gunakan pencocokan teks presisi
  if (titleFallback) {
    const matched = matchItemByText(titleFallback);
    if (matched) {
      return `/items/${matched.assetFile}`;
    }
  }

  return null;
}

/**
 * Mengambil kategori resmi berdasarkan tag atau teks nama barang
 */
export function getItemCategory(tag?: string, titleFallback?: string): CategoryId {
  if (tag) {
    const normalized = tag.toLowerCase().trim().replace(/[\s-]+/g, '_');
    const found = TAG_MAP.get(normalized);
    if (found) return found.category;
  }
  if (titleFallback) {
    const matched = matchItemByText(titleFallback);
    if (matched) return matched.category;
  }
  return 'Personal';
}

/**
 * Mengambil label barang yang rapi berdasarkan tag
 */
export function getItemLabel(tag?: string): string {
  if (!tag) return 'Lainnya';
  const normalized = tag.toLowerCase().trim().replace(/[\s-]+/g, '_');
  const found = TAG_MAP.get(normalized);
  return found ? found.label : tag;
}
