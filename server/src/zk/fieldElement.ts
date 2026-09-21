/**
 * fieldElement.ts
 * ---------------
 * Mengubah string keyword menjadi BigInt yang valid di dalam
 * scalar field BN254 — field yang dipakai oleh circuit Groth16.
 *
 * Dipakai di KEDUA SISI: backend (hitung commitment saat report)
 * dan frontend (generate proof saat claim).
 *
 * Kenapa perlu konversi ini?
 *   Poseidon di circomlib hanya menerima angka dalam field BN254.
 *   String "geologi" harus diubah ke BigInt < BN254_FIELD_SIZE.
 *
 * Caranya:
 *   1. keccak256(string) → 256-bit digest (hex string)
 *   2. Parse sebagai BigInt
 *   3. Mod dengan BN254_FIELD_SIZE → dijamin < field size
 *
 * Bias dari mod reduction: < 2^-250 → tidak signifikan secara praktis.
 */

import { keccak256 } from "js-sha3";

/**
 * Ukuran scalar field BN254 (prime p).
 * Semua nilai yang masuk ke circuit Poseidon harus < angka ini.
 */
export const BN254_FIELD_SIZE = BigInt(
  "21888242871839275222246405745257275088548364400416034343698204186575808495617"
);

/**
 * Konversi string apapun ke BigInt yang valid di field BN254.
 *
 * ⚠️ Input harus sudah dinormalisasi (lowercase, trim) sebelum
 * masuk ke sini. Gunakan normalizeKeywords() terlebih dahulu.
 *
 * @param input - String yang sudah dinormalisasi
 * @returns BigInt dalam range [0, BN254_FIELD_SIZE)
 *
 * @example
 * stringToFieldElement("geologi")
 * // → 12345678901234567890n (BigInt, selalu sama untuk input yang sama)
 */
export function stringToFieldElement(input: string): bigint {
  // keccak256 menghasilkan hex string 64 karakter (256 bit)
  const hashHex = keccak256(input);
  // Parse sebagai BigInt unsigned
  const asBigInt = BigInt("0x" + hashHex);
  // Reduce ke dalam field size BN254
  return asBigInt % BN254_FIELD_SIZE;
}

/**
 * Konversi array keyword (sudah dinormalisasi) ke array BigInt field elements.
 * Convenience wrapper untuk memproses semua keyword sekaligus.
 *
 * @param keywords - Array dari normalizeKeywords() (panjang = MAX_KEYWORDS)
 * @returns Array BigInt siap dipakai sebagai input circuit
 *
 * @example
 * keywordsToFieldElements(["__empty__", "biru", "geologi"])
 * // → [BigInt, BigInt, BigInt]
 */
export function keywordsToFieldElements(keywords: string[]): bigint[] {
  return keywords.map(stringToFieldElement);
}
