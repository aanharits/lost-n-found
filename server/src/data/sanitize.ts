import type { Item } from './store.js';

// Menghapus field secretDetail sebelum dikirim ke client agar tidak bocor
export function sanitizeItem(item: Item): Omit<Item, 'secretDetail'> {
  const { secretDetail, ...sanitized } = item;
  return sanitized;
}

// Menghapus field secretDetail dari seluruh array item
export function sanitizeItems(items: Item[]): Omit<Item, 'secretDetail'>[] {
  return items.map(sanitizeItem);
}
