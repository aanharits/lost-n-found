import { eq, asc } from 'drizzle-orm';
import { db } from './index.js';
import { itemsTable, claimsTable } from './schema.js';
import type { Item } from './types.js';
import { rowToItem } from './mappers.js';
import { generateShortCode } from '../utils/shortCode.js';
import {
  getItemsCache,
  setItemsCache,
  getFetchPromise,
  setFetchPromise,
  findItemInCache,
  addItemToCache,
  removeItemFromCache,
  updateItemPositionInCache,
  updateItemPositionsBatchInCache,
  updateItemStatusInCache,
  expireItemsInCache,
  invalidateItemsCache,
} from './cache.js';

// Kolom item untuk publik (mengecualikan evidencePhoto yang bisa berukuran beberapa Megabyte Base64)
export const publicItemColumns = {
  id: itemsTable.id,
  shortCode: itemsTable.shortCode,
  type: itemsTable.type,
  title: itemsTable.title,
  icon: itemsTable.icon,
  category: itemsTable.category,
  tag: itemsTable.tag,
  description: itemsTable.description,
  commitments: itemsTable.commitments,
  status: itemsTable.status,
  date: itemsTable.date,
  time: itemsTable.time,
  reporterName: itemsTable.reporterName,
  reporterNpm: itemsTable.reporterNpm,
  reporterContact: itemsTable.reporterContact,
  reporterToken: itemsTable.reporterToken,
  x: itemsTable.x,
  y: itemsTable.y,
  createdAt: itemsTable.createdAt,
  updatedAt: itemsTable.updatedAt,
  republishedAt: itemsTable.republishedAt,
};

/** Ambil semua item beserta claims-nya (In-Memory Cache & tanpa payload Base64 evidencePhoto) */
export async function dbGetItems(): Promise<Item[]> {
  const cached = getItemsCache();
  if (cached !== null) {
    return cached;
  }

  const existingPromise = getFetchPromise();
  if (existingPromise) {
    return existingPromise;
  }

  const promise = (async () => {
    try {
      const [rows, claimRows] = await Promise.all([
        db.select(publicItemColumns).from(itemsTable).orderBy(asc(itemsTable.createdAt)),
        db.select().from(claimsTable).orderBy(asc(claimsTable.createdAt)),
      ]);

      const items = rows.map((row) => {
        const claims = claimRows.filter((c) => c.itemId === row.id);
        return rowToItem(row, claims);
      });

      setItemsCache(items);
      return items;
    } finally {
      setFetchPromise(null);
    }
  })();

  setFetchPromise(promise);
  return promise;
}

/** Ambil satu item beserta claims-nya (cek cache terlebih dahulu) */
export async function dbGetItem(id: string): Promise<Item | null> {
  const cached = findItemInCache(id);
  if (cached) return cached;

  const [rows, claimRows] = await Promise.all([
    db.select().from(itemsTable).where(eq(itemsTable.id, id)),
    db.select().from(claimsTable).where(eq(claimsTable.itemId, id)).orderBy(asc(claimsTable.createdAt)),
  ]);
  if (rows.length === 0) return null;
  return rowToItem(rows[0], claimRows);
}

/** Tambah item baru */
export async function dbInsertItem(item: Omit<Item, 'claims'>): Promise<Item> {
  const shortCode = item.shortCode && item.shortCode.trim() !== ''
    ? item.shortCode.trim()
    : generateShortCode();

  const [inserted] = await db.insert(itemsTable).values({
    id: item.id,
    shortCode,
    type: item.type,
    title: item.title,
    icon: item.icon ?? '📦',
    category: item.category ?? '',
    tag: item.tag ?? '',
    description: item.desc,
    commitments: item.commitments,
    evidencePhoto: item.evidencePhoto ?? '',
    status: item.status ?? 'open',
    date: item.date,
    time: item.time,
    reporterName: item.reporterName,
    reporterNpm: item.reporterNpm,
    reporterContact: item.reporterContact,
    reporterToken: item.reporterToken!,
    x: String(item.x ?? 100),
    y: String(item.y ?? 100),
  }).returning();

  const newItem = rowToItem(inserted, []);
  addItemToCache(newItem);
  return newItem;
}

/** Ambil semua item khusus untuk Satpam (termasuk evidencePhoto asli dari database) */
export async function dbGetItemsForSatpam(): Promise<Item[]> {
  const [rows, claimRows] = await Promise.all([
    db.select().from(itemsTable).orderBy(asc(itemsTable.createdAt)),
    db.select().from(claimsTable).orderBy(asc(claimsTable.createdAt)),
  ]);

  return rows.map((row) => {
    const claims = claimRows.filter((c) => c.itemId === row.id);
    return rowToItem(row, claims);
  });
}

/** Backfill short_code untuk item lawas yang masih kosong di database */
export async function dbBackfillShortCodes(): Promise<number> {
  const allRows = await db.select().from(itemsTable);
  let updatedCount = 0;
  for (const row of allRows) {
    if (!row.shortCode || row.shortCode.trim() === '') {
      const code = generateShortCode();
      await db.update(itemsTable)
        .set({ shortCode: code, updatedAt: new Date() })
        .where(eq(itemsTable.id, row.id));
      updatedCount++;
    }
  }
  if (updatedCount > 0) {
    invalidateItemsCache();
  }
  return updatedCount;
}

/** Update status item */
export async function dbUpdateItemStatus(
  id: string,
  status: 'open' | 'disputed' | 'resolved' | 'expired' | 'archived'
): Promise<void> {
  updateItemStatusInCache(id, status);
  await db.update(itemsTable)
    .set({ status, updatedAt: new Date() })
    .where(eq(itemsTable.id, id));
}

/**
 * Publish ulang item dari arsip expired ke board publik (status → 'archived').
 * Menandai republishedAt sebagai titik awal jendela expire 7 hari yang baru.
 */
export async function dbRepublishItem(id: string): Promise<void> {
  const now = new Date();
  updateItemStatusInCache(id, 'archived');
  await db.update(itemsTable)
    .set({ status: 'archived', updatedAt: now, republishedAt: now })
    .where(eq(itemsTable.id, id));
}

/**
 * Expire item yang sudah lebih dari X hari.
 * - Item 'open'  : dihitung dari createdAt (sejak dilaporkan).
 * - Item 'archived': dihitung dari updatedAt (sejak dipublish ulang ke board),
 *   sehingga item yang baru diaktifkan Satpam diberi jendela 7 hari baru.
 * Item yang sudah 'expired'/'resolved'/'disputed' tidak disentuh.
 */
export async function dbExpireOldItems(olderThanDays: number): Promise<string[]> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - olderThanDays);
  const rows = await db.select().from(itemsTable);
  const toExpire = rows.filter((r) => {
    if (r.status !== 'open' && r.status !== 'archived') return false;
    const ref = r.status === 'archived' ? (r.republishedAt ?? r.updatedAt) : r.createdAt;
    return ref != null && ref < cutoff;
  });
  if (toExpire.length === 0) return [];
  await Promise.all(
    toExpire.map((r) =>
      db.update(itemsTable)
        .set({ status: 'expired', updatedAt: new Date() })
        .where(eq(itemsTable.id, r.id))
    )
  );
  expireItemsInCache(new Set(toExpire.map((r) => r.id)));
  return toExpire.map((r) => r.id);
}

/** Ambil semua item expired (untuk Satpam arsip) */
export async function dbGetExpiredItems(): Promise<Item[]> {
  const [rows, claimRows] = await Promise.all([
    db.select().from(itemsTable).where(eq(itemsTable.status, 'expired')).orderBy(asc(itemsTable.createdAt)),
    db.select().from(claimsTable).orderBy(asc(claimsTable.createdAt)),
  ]);
  return rows.map((row) => {
    const claims = claimRows.filter((c) => c.itemId === row.id);
    return rowToItem(row, claims);
  });
}

/** Update posisi kartu di board */
export async function dbUpdateItemPosition(id: string, x: number, y: number): Promise<void> {
  updateItemPositionInCache(id, x, y);
  await db.update(itemsTable)
    .set({ x: String(x), y: String(y), updatedAt: new Date() })
    .where(eq(itemsTable.id, id));
}

/** Update posisi batch untuk items_organize */
export async function dbUpdateItemPositionsBatch(positions: Array<{ id: string; x: number; y: number }>): Promise<void> {
  updateItemPositionsBatchInCache(positions);
  await Promise.all(
    positions.map(({ id, x, y }) =>
      db.update(itemsTable)
        .set({ x: String(x), y: String(y), updatedAt: new Date() })
        .where(eq(itemsTable.id, id))
    )
  );
}

/** Hapus item (autentikasi kepemilikan ditangani di handler) */
export async function dbDeleteItem(id: string): Promise<boolean> {
  const result = await db.delete(itemsTable).where(eq(itemsTable.id, id)).returning();
  if (result.length > 0) {
    removeItemFromCache(id);
  }
  return result.length > 0;
}
