import type { Item } from './store.js';

// Karena menggunakan ZKP, tidak ada field secretDetail mentah yang tersimpan.
// Fungsi ini dipertahankan hanya agar kompatibel dengan pemanggilan dari file lain.
export function sanitizeItem(item: Item): Item {
  return item;
}

export function sanitizeItems(items: Item[]): Item[] {
  return items;
}
