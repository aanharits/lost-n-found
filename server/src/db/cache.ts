import type { Item, Claim } from './types.js';

// ─── In-Memory Items Cache (RAM) ─────────────────────────────────────────────
// Menyimpan item aktif di RAM backend untuk respons seketika (~0ms) saat refresh/connect

let itemsCache: Item[] | null = null;
let fetchPromise: Promise<Item[]> | null = null;

export function getItemsCache(): Item[] | null {
  return itemsCache;
}

export function setItemsCache(items: Item[] | null): void {
  itemsCache = items;
}

export function getFetchPromise(): Promise<Item[]> | null {
  return fetchPromise;
}

export function setFetchPromise(p: Promise<Item[]> | null): void {
  fetchPromise = p;
}

/** Mengosongkan cache agar query berikutnya mengambil data segar dari database */
export function invalidateItemsCache(): void {
  itemsCache = null;
}

/** Cari item dari cache berdasarkan ID */
export function findItemInCache(id: string): Item | undefined {
  return itemsCache?.find((i) => i.id === id);
}

/** Tambah item baru ke cache (tanpa evidencePhoto agar hemat RAM) */
export function addItemToCache(item: Item): void {
  if (itemsCache) {
    itemsCache.push({ ...item, evidencePhoto: '' });
  }
}

/** Hapus item dari cache */
export function removeItemFromCache(id: string): void {
  if (itemsCache) {
    itemsCache = itemsCache.filter((i) => i.id !== id);
  }
}

/** Update koordinat posisi kartu tunggal di cache */
export function updateItemPositionInCache(id: string, x: number, y: number): void {
  if (itemsCache) {
    const target = itemsCache.find((i) => i.id === id);
    if (target) {
      target.x = x;
      target.y = y;
    }
  }
}

/** Update koordinat batch kartu di cache */
export function updateItemPositionsBatchInCache(positions: Array<{ id: string; x: number; y: number }>): void {
  if (itemsCache) {
    for (const pos of positions) {
      const target = itemsCache.find((i) => i.id === pos.id);
      if (target) {
        target.x = pos.x;
        target.y = pos.y;
      }
    }
  }
}

/** Update status item di cache */
export function updateItemStatusInCache(id: string, status: Item['status']): void {
  if (itemsCache) {
    const target = itemsCache.find((i) => i.id === id);
    if (target) target.status = status;
  }
}

/** Tandai status item expired secara massal di cache */
export function expireItemsInCache(expiredIds: Set<string>): void {
  if (itemsCache) {
    for (const item of itemsCache) {
      if (expiredIds.has(item.id)) {
        item.status = 'expired';
      }
    }
  }
}

/** Tambah klaim baru ke item tertentu di cache */
export function addClaimToCacheItem(itemId: string, claim: Claim): void {
  if (itemsCache) {
    const target = itemsCache.find((i) => i.id === itemId);
    if (target) {
      if (!target.claims) target.claims = [];
      target.claims.push(claim);
    }
  }
}

/** Update status klaim di cache */
export function updateClaimInCache(
  claimId: string,
  status: Claim['status'],
  reasoning?: string
): void {
  if (itemsCache) {
    for (const item of itemsCache) {
      const claim = item.claims?.find((c) => c.id === claimId);
      if (claim) {
        claim.status = status;
        if (reasoning) claim.reasoning = reasoning;
        break;
      }
    }
  }
}
