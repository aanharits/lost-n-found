/**
 * nlpPreprocess.ts
 * ----------------
 * Stage 1 dari NLP Pipeline (Layer 2).
 * Berfungsi membersihkan teks input dari pelapor maupun pengklaim
 * secara deterministik sebelum masuk ke LLM Extractor.
 * 
 * Pipeline:
 * 1. Lowercase semua huruf
 * 2. Hapus tanda baca (hanya sisakan huruf dan spasi)
 * 3. Hapus stopword Bahasa Indonesia (kata-kata yang tidak ada makna fisiknya)
 */

const INDONESIAN_STOPWORDS = new Set([
  "ada", "itu", "ini", "sama", "yang", "di", "ke", "dari", 
  "pada", "dalam", "untuk", "dengan", "dan", "atau", "tapi",
  "karena", "sebab", "jika", "kalau", "biar", "supaya",
  "kayaknya", "sepertinya", "mungkin", "paling", "banget",
  "sekali", "juga", "cuma", "hanya", "terus", "lalu",
  "kemudian", "setelah", "sebelum", "waktu", "saat",
  "saya", "aku", "kamu", "dia", "mereka", "kita", "kami",
  "tas", "dompet", "hp", "handphone", "botol", "minum", // kadang perlu di-filter kalau bukan ciri pembeda
  "warna", "warnanya", "bentuk", "bentuknya", "merk", "merknya",
  "kelihatan", "kelihatannya", "soalnya", "keliatannya", "keliatan",
  "punya", "kalo", "yg", "dgn", "utk", "udah", "sudah", "belum"
]);

/**
 * Membersihkan teks input agar lebih optimal saat diekstrak oleh LLM.
 * 
 * @param text Teks mentah dari pengguna
 * @returns Teks bersih tanpa tanda baca dan stopword
 * 
 * @example
 * preprocessText("kayaknya di dalam tas nya ada boneka warna biru!")
 * // -> "boneka biru"
 */
export function preprocessText(text: string): string {
  if (!text) return "";

  // 1. Lowercase
  let cleaned = text.toLowerCase();

  // 2. Hapus tanda baca dan karakter non-alfabet (sisakan spasi)
  cleaned = cleaned.replace(/[^a-z\s]/g, " ");

  // 3. Pecah jadi token (kata)
  const tokens = cleaned.split(/\s+/).filter(Boolean);

  // 4. Buang stopword
  const filteredTokens = tokens.filter(token => !INDONESIAN_STOPWORDS.has(token));

  // 5. Gabungkan kembali
  return filteredTokens.join(" ");
}
