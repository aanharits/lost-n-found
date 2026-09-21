import { writable, derived, get } from 'svelte/store';
import { items } from './items.js';

export interface HighlightState {
  category?: string | null;
  tag?: string | null;
  itemType?: 'lost' | 'found' | null;
  itemIds: string[];
  source?: 'satpam' | 'category' | 'status' | 'direct';
}

// Scroll otomatis ke kartu barang dengan durasi delay
export function scrollToCard(itemId: string, delay = 150) {
  setTimeout(() => {
    const el = document.getElementById(itemId);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, delay);
}

// Evaluasi apakah kartu memenuhi kriteria highlight aktif
export function isItemHighlighted(
  item: { id: string; type: string; category?: string | null; tag?: string | null },
  state: HighlightState | null
): boolean {
  if (!state) return false;
  return !!(
    (state.itemIds && state.itemIds.includes(item.id)) ||
    (state.tag && item.tag === state.tag) ||
    (state.category && item.category?.toLowerCase() === state.category.toLowerCase()) ||
    (state.itemType && item.type === state.itemType)
  );
}

function createHighlightStore() {
  const { subscribe, set } = writable<HighlightState | null>(null);

  return {
    subscribe,

    // Toggle highlight kategori barang
    toggleCategory(catId: string) {
      const current = get({ subscribe });
      if (current?.category === catId) {
        set(null);
        return;
      }

      const allItems = get(items);
      const matching = allItems.filter(
        (i) => i.category?.toLowerCase() === catId.toLowerCase()
      );
      const itemIds = matching.map((i) => i.id);

      set({
        category: catId,
        itemIds,
        source: 'category',
      });

      if (itemIds.length > 0) {
        scrollToCard(itemIds[0]);
      }
    },

    // Toggle highlight status barang (hilang / ketemu)
    toggleStatus(type: 'all' | 'lost' | 'found') {
      if (type === 'all') {
        set(null);
        return;
      }

      const current = get({ subscribe });
      if (current?.itemType === type) {
        set(null);
        return;
      }

      const allItems = get(items);
      const matching = allItems.filter((i) => i.type === type);
      const itemIds = matching.map((i) => i.id);

      set({
        itemType: type,
        itemIds,
        source: 'status',
      });

      if (itemIds.length > 0) {
        scrollToCard(itemIds[0]);
      }
    },

    // Set highlight dari respons Satpam AI
    fromSatpam(data: {
      category?: string | null;
      tag?: string | null;
      itemType?: 'lost' | 'found' | null;
      itemIds?: string[];
    }) {
      const itemIds = data.itemIds || [];
      set({
        category: data.category || null,
        tag: data.tag || null,
        itemType: data.itemType || null,
        itemIds,
        source: 'satpam',
      });

      if (itemIds.length > 0) {
        scrollToCard(itemIds[0], 300);
      }
    },

    // Batalkan seluruh sorotan
    clear() {
      set(null);
    },
  };
}

export const highlight = createHighlightStore();

// Alias & derived store untuk kompatibilitas
export const activeHighlight = highlight;
export const currentFilter = derived(highlight, ($h) => $h?.itemType || 'all');
