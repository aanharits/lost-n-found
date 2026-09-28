/**
 * Sanitasi dan validasi payload foto bukti barang.
 * Mendukung data URL base64 gambar dan URL absolut (http/https).
 * Batas maksimal ukuran payload base64: ~5MB.
 */

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export interface SanitizeImageResult {
  valid: boolean;
  sanitized?: string;
  error?: string;
}

export function sanitizeEvidencePhoto(photoInput: unknown): SanitizeImageResult {
  if (!photoInput) {
    return { valid: true, sanitized: '' };
  }

  if (typeof photoInput !== 'string') {
    return { valid: false, error: 'Format data gambar tidak valid (harus berupa string).' };
  }

  const trimmed = photoInput.trim();
  if (trimmed === '') {
    return { valid: true, sanitized: '' };
  }

  // 1. Jika berupa data URL base64
  if (trimmed.startsWith('data:image/')) {
    const match = trimmed.match(/^data:image\/(png|jpeg|jpg|webp|gif);base64,([A-Za-z0-9+/=]+)$/);
    if (!match) {
      return { valid: false, error: 'Format gambar harus berupa PNG, JPEG, WEBP, atau GIF base64 yang valid.' };
    }

    const base64Data = match[2];
    // Hitung perkiraan ukuran byte dari base64: length * 3 / 4
    const approxBytes = Math.ceil((base64Data.length * 3) / 4);
    if (approxBytes > MAX_IMAGE_SIZE_BYTES) {
      return { valid: false, error: 'Ukuran foto bukti melebihi batas maksimal 5MB.' };
    }

    return { valid: true, sanitized: trimmed };
  }

  // 2. Jika berupa URL gambar (misal dari CDN / object storage)
  if (/^https?:\/\/.+/i.test(trimmed)) {
    // Validasi URL sederhana
    try {
      const url = new URL(trimmed);
      if (['http:', 'https:'].includes(url.protocol)) {
        return { valid: true, sanitized: trimmed };
      }
    } catch {
      return { valid: false, error: 'URL foto bukti tidak valid.' };
    }
  }

  return { valid: false, error: 'Foto bukti harus berupa data URL gambar base64 atau URL valid.' };
}
