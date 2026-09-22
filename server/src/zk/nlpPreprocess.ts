/**
 * nlpPreprocess.ts
 * ----------------
 * Stage 1 dari NLP Pipeline (Layer 2).
 *
 * Terbagi menjadi DUA bagian yang sengaja dipisahkan:
 *
 *   A. Normalisasi MEKANIS (deterministik, bahasa-agnostik)
 *      - lowercase, rapikan spasi, hapus tanda baca
 *      - buang imbuhan umum (-nya, -ku, -mu, awalan me-/di-/ter-/ber-/pe-)
 *      Bagian ini TIDAK membutuhkan kamus dan bekerja untuk kata apa pun.
 *
 *   B. Penyaringan STOPWORD (butuh daftar, sifatnya pelengkap)
 *      - hanya membuang kata yang jelas tidak membedakan ciri fisik
 *      - daftar sengaja SEMPIT; kata yang tidak ada di daftar dibiarkan lewat
 *
 * Lihat docs/keyword_extraction_strategy.md untuk alasan desain lengkap.
 */

// ---------------------------------------------------------------------------
// A. Normalisasi mekanis
// ---------------------------------------------------------------------------

/**
 * Akhiran (suffix) umum Bahasa Indonesia yang bisa dibuang tanpa kamus.
 * Diurutkan dari yang terpanjang agar pemotongan tidak menyisakan sisa.
 */
const COMMON_SUFFIXES = ["nya", "ku", "mu", "kah", "lah", "pun"] as const;

/**
 * Awalan (prefix) umum. Hanya dibuang jika sisa katanya masih cukup panjang
 * (>= 3 huruf) supaya tidak merusak kata pendek yang memang utuh.
 */
const COMMON_PREFIXES = ["meng", "meny", "mem", "men", "me", "di", "ter", "ber", "pe"] as const;

/**
 * Membuang akhiran umum dari satu token.
 * Contoh: "tasnya" -> "tas", "dompetku" -> "dompet".
 */
function stripSuffix(token: string): string {
  for (const suffix of COMMON_SUFFIXES) {
    if (token.length > suffix.length + 2 && token.endsWith(suffix)) {
      return token.slice(0, -suffix.length);
    }
  }
  return token;
}

/**
 * Membuang awalan umum dari satu token bila hasilnya masih bermakna.
 * Contoh: "menyala" -> tidak dipotong paksa karena sisa terlalu pendek.
 */
function stripPrefix(token: string): string {
  for (const prefix of COMMON_PREFIXES) {
    if (token.startsWith(prefix) && token.length > prefix.length) {
      const stem = token.slice(prefix.length);
      if (stem.length >= 3) {
        return stem;
      }
    }
  }
  return token;
}

/**
 * Normalisasi mekanis satu token: lowercase, buang awalan & akhiran.
 * Aman untuk kata apa pun; tidak bergantung pada daftar kata.
 */
export function normalizeToken(token: string): string {
  const lower = token.toLowerCase().trim();
  return stripPrefix(stripSuffix(lower));
}

// ---------------------------------------------------------------------------
// B. Penyaringan stopword (sempit)
// ---------------------------------------------------------------------------

/**
 * Kata yang dilewatkan sebelum masuk LLM.
 *
 * Prinsip: HANYA buang kata yang tidak punya makna fisik / tidak membedakan.
 * JANGAN masukkan sinonim atau jenis barang ke sini — untuk itu gunakan
 * canonical mapping atau serahkan ke LLM (lihat dokumentasi strategi).
 */
const INDONESIAN_STOPWORDS = new Set([
  "ada", "itu", "ini", "sama", "yang", "di", "ke", "dari",
  "pada", "dalam", "untuk", "dengan", "dan", "atau", "tapi",
  "karena", "sebab", "jika", "kalau", "biar", "supaya",
  "kayaknya", "sepertinya", "mungkin", "paling", "banget",
  "sekali", "juga", "cuma", "hanya", "terus", "lalu",
  "kemudian", "setelah", "sebelum", "waktu", "saat",
  "saya", "aku", "kamu", "dia", "mereka", "kita", "kami",
  "warna", "warnanya", "bentuk", "bentuknya", "merk", "merknya",
  "kelihatan", "kelihatannya", "soalnya", "keliatannya", "keliatan",
  "punya", "kalo", "yg", "dgn", "utk", "udah", "sudah", "belum",
]);

/**
 * Membersihkan teks input agar optimal saat diekstrak LLM.
 *
 * Pipeline:
 *   1. lowercase
 *   2. hapus tanda baca / karakter non-alfabet
 *   3. normalisasi mekanis tiap token (buang imbuhan)
 *   4. buang stopword
 *
 * @param text Teks mentah dari pelapor/pengklaim
 * @returns Teks bersih siap dikirim ke LLM
 *
 * @example
 * preprocessText("tasnya hitam ada gantungannya")
 * // -> "tas hitam gantungan"
 */
export function preprocessText(text: string): string {
  if (!text) return "";

  // 1 & 2: lowercase + buang non-alfabet (sisakan spasi)
  const cleaned = text.toLowerCase().replace(/[^a-z\s]/g, " ");

  // 3 & 4: normalisasi mekanis + buang stopword
  const tokens = cleaned
    .split(/\s+/)
    .filter(Boolean)
    .map(normalizeToken)
    .filter((token) => token.length > 0 && !INDONESIAN_STOPWORDS.has(token));

  return tokens.join(" ");
}
