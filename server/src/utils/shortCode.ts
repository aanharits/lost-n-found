/**
 * Generator dan validator Human-Readable Short ID (4-5 karakter)
 * Format retro arcade yang mudah diingat, misalnya:
 * - B-7K9 (5 karakter dengan dash)
 * - A82F (4 karakter)
 * Karakter ambigu dihilangkan: 0, O, 1, I
 */

const SAFE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';

/**
 * Generate human-readable short code 4-5 karakter
 * Default format: [Letter]-[3 alphanumeric chars] -> e.g. "B-7K9"
 */
export function generateShortCode(): string {
  const prefix = LETTERS.charAt(Math.floor(Math.random() * LETTERS.length));
  let suffix = '';
  for (let i = 0; i < 3; i++) {
    suffix += SAFE_ALPHABET.charAt(Math.floor(Math.random() * SAFE_ALPHABET.length));
  }
  return `${prefix}-${suffix}`;
}

/**
 * Generate short code 4 karakter alfanumerik tanpa tanda hubung (e.g. "A82F")
 */
export function generateCompactCode(): string {
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += SAFE_ALPHABET.charAt(Math.floor(Math.random() * SAFE_ALPHABET.length));
  }
  return code;
}

/**
 * Validasi apakah sebuah kode memenuhi kriteria format short code
 */
export function isValidShortCode(code: string): boolean {
  if (!code || typeof code !== 'string') return false;
  const clean = code.trim().toUpperCase();
  // Cocok dengan "B-7K9" atau "A82F" atau "#B-7K9"
  return /^#?[A-Z0-9-]{3,8}$/.test(clean);
}
