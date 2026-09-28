/**
 * Generator dan formatter Human-Readable Short Code di Frontend
 * Format: e.g. "B-7K9" atau "A82F"
 */

const SAFE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';

export function generateShortCode(): string {
  const prefix = LETTERS.charAt(Math.floor(Math.random() * LETTERS.length));
  let suffix = '';
  for (let i = 0; i < 3; i++) {
    suffix += SAFE_ALPHABET.charAt(Math.floor(Math.random() * SAFE_ALPHABET.length));
  }
  return `${prefix}-${suffix}`;
}

export function formatShortCode(code?: string, id?: string): string {
  if (code && code.trim() !== '') {
    return code.startsWith('#') ? code : `#${code}`;
  }
  if (id) {
    if (id.startsWith('item')) {
      return `#${id.slice(-4).toUpperCase()}`;
    }
    return `#${id.slice(0, 4).toUpperCase()}`;
  }
  return '#ITEM';
}
