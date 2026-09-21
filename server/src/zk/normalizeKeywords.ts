/**
 * normalizeKeywords.ts
 * --------------------
 * Mengubah array keyword mentah menjadi canonical form yang
 * deterministik — dipakai di KEDUA SISI: backend (report) dan
 * frontend (claim). Output harus selalu identik untuk keyword
 * yang sama, terlepas dari urutan atau variasi case input.
 *
 * Pipeline:
 *   1. Lowercase semua
 *   2. Trim whitespace
 *   3. Filter kosong
 *   4. Deduplikasi
 *   5. Sort A-Z
 *   6. Pad ke MAX_KEYWORDS dengan DUMMY_KEYWORD
 */

/** Jumlah keyword yang diterima circuit — harus sama dengan circuit .circom */
export const MAX_KEYWORDS = 3;

/**
 * Placeholder untuk slot keyword yang tidak terpakai.
 * Nilai ini harus konsisten di semua sisi (backend & frontend).
 */
export const DUMMY_KEYWORD = "__empty__";

/**
 * Normalisasi array keyword menjadi canonical form.
 *
 * @param keywords - Array keyword mentah dari LLM extractor atau input langsung
 * @returns Array string dengan panjang tepat MAX_KEYWORDS, sorted A-Z
 *
 * @example
 * normalizeKeywords(["Geologi", "biru ", "GEOLOGI"])
 * // → ["__empty__", "biru", "geologi"]
 *
 * normalizeKeywords(["biru", "geologi", "plastik"])
 * // → ["biru", "geologi", "plastik"]
 */
export function normalizeKeywords(keywords: string[]): string[] {
  // Step 1-3: Bersihkan setiap keyword
  const cleaned = keywords
    .map((k) => k.toLowerCase().trim())
    .filter((k) => k.length > 0 && k !== DUMMY_KEYWORD);

  // Step 4: Deduplikasi
  const unique = [...new Set(cleaned)];

  // Step 5: Sort A-Z (canonical ordering — selesaikan masalah order sensitivity)
  const sorted = unique.sort();

  // Step 6: Pad ke MAX_KEYWORDS dengan dummy supaya circuit selalu dapat input penuh
  while (sorted.length < MAX_KEYWORDS) {
    sorted.push(DUMMY_KEYWORD);
  }

  // Potong jika melebihi MAX_KEYWORDS
  return sorted.slice(0, MAX_KEYWORDS);
}
