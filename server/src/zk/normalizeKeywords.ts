/**
 * normalizeKeywords.ts (ZKP v2)
 * --------------------
 * Mengubah array keyword mentah menjadi canonical form yang
 * deterministik — dipakai di backend (report phase).
 *
 * Pipeline:
 *   1. Lowercase semua
 *   2. Trim whitespace
 *   3. Filter kosong
 *   4. Deduplikasi
 *   5. Sort A-Z
 *   6. Potong jika melebihi MAX_KEYWORDS
 *
 * ZKP v2: TIDAK ada dummy padding.
 * Panjang output = jumlah keyword nyata (0 sampai MAX_KEYWORDS).
 * Setiap commitment mewakili keyword nyata dari pelapor.
 * Sirkuit yang dipakai: single_keyword_proof.circom (1 per keyword)
 */

/** Batas ATAS jumlah keyword yang disimpan sebagai commitment */
export const MAX_KEYWORDS = 5;

/**
 * Batas BAWAH jumlah keyword nyata saat report.
 * Penting: dengan intersection scoring, N kecil (mis. 1) membuat penebak
 * cukup tahu 1 keyword untuk skor 1.0. Minimal 3 mencegah lubang ini.
 */
export const MIN_KEYWORDS = 3;

/**
 * Normalisasi array keyword menjadi canonical form.
 *
 * @param keywords - Array keyword mentah dari LLM extractor
 * @returns Array string panjang 0–MAX_KEYWORDS, sorted A-Z, tanpa duplikat, tanpa dummy
 *
 * @example
 * normalizeKeywords(["Geologi", "biru ", "GEOLOGI"])
 * // → ["biru", "geologi"]
 *
 * normalizeKeywords(["biru", "geologi", "plastik"])
 * // → ["biru", "geologi", "plastik"]
 */
export function normalizeKeywords(keywords: string[]): string[] {
  // Step 1-3: Bersihkan setiap keyword
  const cleaned = keywords
    .map((k) => k.toLowerCase().trim())
    .filter((k) => k.length > 0);

  // Step 4: Deduplikasi
  const unique = [...new Set(cleaned)];

  // Step 5: Sort A-Z (canonical ordering)
  const sorted = unique.sort();

  // Step 6: Potong jika melebihi batas atas
  return sorted.slice(0, MAX_KEYWORDS);
}
