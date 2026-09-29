import { eq, asc, isNull, and, ne, isNotNull, lt } from 'drizzle-orm';
import { db } from './index.js';
import {
  itemsTable,
  claimsTable,
  archiveRequestsTable,
  type ItemRecord,
  type ClaimRecord,
  type ArchiveRequestRecord,
} from './schema.js';
import { generateShortCode } from '../utils/shortCode.js';

// ─── Type exports yang kompatibel dengan interface lama di store.ts ───────────

// Bentuk Item yang dipakai di seluruh aplikasi (frontend-friendly, claims embedded)
export interface Item {
  id: string;
  shortCode: string;      // Human-readable short ID (misal 'B-7K9')
  type: 'lost' | 'found';
  title: string;
  icon: string;
  category?: string;
  tag?: string;
  desc: string;           // alias 'description' untuk kompatibilitas frontend
  commitments: string[];
  claims: Claim[];
  status: 'open' | 'disputed' | 'resolved' | 'expired' | 'archived';
  date: string;
  time: string;
  evidencePhoto?: string; // Data URL foto bukti asli (hanya untuk Satpam)
  reporterName: string;
  reporterNpm: string;
  reporterContact: string;
  reporterToken?: string; // Disertakan saat perlu validasi kepemilikan, disanitasi saat broadcast publik
  x: number;
  y: number;
}

export interface Claim {
  id: string;
  text: string;
  score: number;
  confidence: string;
  reasoning: string;
  status: 'pending' | 'approved' | 'rejected';
  claimantName: string;
  claimantNpm: string;
  claimantContact: string;
  createdAt: string;
}

// ─── Helper: Konversi dari format DB record ke format Item frontend ───────────
function rowToItem(row: ItemRecord, claims: ClaimRecord[]): Item {
  // Fallback jika item lama di DB belum memiliki short_code
  const shortCode = row.shortCode && row.shortCode.trim() !== ''
    ? row.shortCode
    : row.id.startsWith('item')
      ? `#${row.id.slice(-4).toUpperCase()}`
      : `#${row.id.slice(0, 4).toUpperCase()}`;

  return {
    id: row.id,
    shortCode,
    type: row.type as 'lost' | 'found',
    title: row.title,
    icon: row.icon ?? '📦',
    category: row.category ?? '',
    tag: row.tag ?? '',
    desc: row.description,
    commitments: (row.commitments as string[]) ?? [],
    claims: claims.map(rowToClaim),
    status: (row.status ?? 'open') as 'open' | 'disputed' | 'resolved' | 'expired' | 'archived',
    date: row.date ?? '',
    time: row.time ?? '',
    evidencePhoto: row.evidencePhoto ?? '',
    reporterName: row.reporterName ?? '',
    reporterNpm: row.reporterNpm,
    reporterContact: row.reporterContact ?? '',
    reporterToken: row.reporterToken, // dipakai untuk validasi, jangan di-broadcast
    x: Number(row.x ?? 100),
    y: Number(row.y ?? 100),
  };
}

function rowToClaim(row: ClaimRecord): Claim {
  return {
    id: row.id,
    text: row.text ?? '',
    score: row.score ?? 1.0,
    confidence: row.confidence ?? 'Tinggi',
    reasoning: row.reasoning ?? '',
    status: (row.status ?? 'pending') as 'pending' | 'approved' | 'rejected',
    claimantName: row.claimantName ?? '',
    claimantNpm: row.claimantNpm,
    claimantContact: row.claimantContact ?? '',
    createdAt: row.createdAt?.toISOString() ?? new Date().toISOString(),
  };
}

// ─── CRUD Items ───────────────────────────────────────────────────────────────

/** Ambil semua item beserta claims-nya */
export async function dbGetItems(): Promise<Item[]> {
  const [rows, claimRows] = await Promise.all([
    db.select().from(itemsTable).orderBy(asc(itemsTable.createdAt)),
    db.select().from(claimsTable).orderBy(asc(claimsTable.createdAt)),
  ]);

  return rows.map((row) => {
    const claims = claimRows.filter((c) => c.itemId === row.id);
    return rowToItem(row, claims);
  });
}

/** Ambil satu item beserta claims-nya */
export async function dbGetItem(id: string): Promise<Item | null> {
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
  return rowToItem(inserted, []);
}

/** Ambil semua item khusus untuk Satpam (termasuk evidencePhoto) */
export async function dbGetItemsForSatpam(): Promise<Item[]> {
  return dbGetItems();
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
  return updatedCount;
}

/** Update status item */
export async function dbUpdateItemStatus(id: string, status: 'open' | 'disputed' | 'resolved' | 'expired' | 'archived'): Promise<void> {
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
    // Item archived dipatok dari waktu publish ulang (republishedAt), bukan createdAt lama
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
  await db.update(itemsTable)
    .set({ x: String(x), y: String(y), updatedAt: new Date() })
    .where(eq(itemsTable.id, id));
}

/** Update posisi batch untuk items_organize */
export async function dbUpdateItemPositionsBatch(positions: Array<{ id: string; x: number; y: number }>): Promise<void> {
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
  return result.length > 0;
}

// ─── CRUD Claims ──────────────────────────────────────────────────────────────

/** Tambah klaim baru */
export async function dbInsertClaim(itemId: string, claim: Claim): Promise<Claim> {
  const [inserted] = await db.insert(claimsTable).values({
    id: claim.id,
    itemId,
    text: claim.text,
    score: claim.score,
    confidence: claim.confidence,
    reasoning: claim.reasoning,
    status: claim.status,
    claimantName: claim.claimantName,
    claimantNpm: claim.claimantNpm,
    claimantContact: claim.claimantContact,
  }).returning();
  return rowToClaim(inserted);
}

/** Update status klaim (approved/rejected) */
export async function dbUpdateClaimStatus(
  claimId: string,
  status: 'pending' | 'approved' | 'rejected',
  reasoning?: string
): Promise<void> {
  await db.update(claimsTable)
    .set({ status, ...(reasoning && { reasoning }) })
    .where(eq(claimsTable.id, claimId));
}

/** Ambil semua klaim untuk satu item */
export async function dbGetClaimsByItemId(itemId: string): Promise<Claim[]> {
  const rows = await db.select().from(claimsTable)
    .where(eq(claimsTable.itemId, itemId))
    .orderBy(asc(claimsTable.createdAt));
  return rows.map(rowToClaim);
}

// ─── Archive Requests (Inbox Satpam dari Global Board) ────────────────────────

export interface ArchiveRequest {
  id: string;
  senderName: string;
  senderNpm: string;
  senderContact: string;     // WA pengirim
  itemTitle: string;         // Nama barang yang dicari
  itemCategory?: string;     // Kategori barang
  dateFrom?: string;         // Kira-kira kapan hilang (mulai)
  dateTo?: string;           // Kira-kira kapan hilang (akhir)
  locationHint?: string;     // Lokasi hilang
  description: string;       // Deskripsi singkat (bukan ciri rahasia)
  status: 'pending' | 'approved' | 'rejected'; // Pending = belum diproses satpam
  matchedItemId?: string;    // Item expired yang di-publish manual oleh satpam
  rejectMessage?: string;    // Pesan penolakan dari satpam untuk pengirim
  createdAt: string;
}

// Konversi record DB → bentuk ArchiveRequest yang ramah frontend
function rowToArchiveRequest(row: ArchiveRequestRecord): ArchiveRequest {
  return {
    id: row.id,
    senderName: row.senderName,
    senderNpm: row.senderNpm ?? '',
    senderContact: row.senderContact,
    itemTitle: row.itemTitle,
    itemCategory: row.itemCategory ?? '',
    dateFrom: row.dateFrom ?? '',
    dateTo: row.dateTo ?? '',
    locationHint: row.locationHint ?? '',
    description: row.description,
    status: (row.status ?? 'pending') as ArchiveRequest['status'],
    matchedItemId: row.matchedItemId ?? undefined,
    rejectMessage: row.rejectMessage ?? '',
    createdAt: (row.createdAt ?? new Date()).toISOString(),
  };
}

export async function dbInsertArchiveRequest(
  req: Omit<ArchiveRequest, 'id' | 'status' | 'createdAt' | 'matchedItemId' | 'rejectMessage'>
): Promise<ArchiveRequest> {
  const newReq = {
    ...req,
    id: 'areq' + Date.now(),
    status: 'pending' as const,
    createdAt: new Date(),
  };
  await db.insert(archiveRequestsTable).values(newReq);
  return {
    id: newReq.id,
    senderName: newReq.senderName,
    senderNpm: newReq.senderNpm ?? '',
    senderContact: newReq.senderContact,
    itemTitle: newReq.itemTitle,
    itemCategory: newReq.itemCategory ?? '',
    dateFrom: newReq.dateFrom ?? '',
    dateTo: newReq.dateTo ?? '',
    locationHint: newReq.locationHint ?? '',
    description: newReq.description,
    status: 'pending',
    matchedItemId: undefined,
    rejectMessage: '',
    createdAt: newReq.createdAt.toISOString(),
  };
}

export async function dbGetArchiveRequests(): Promise<ArchiveRequest[]> {
  const rows = await db.select().from(archiveRequestsTable).orderBy(asc(archiveRequestsTable.createdAt));
  // newest first
  return rows.map(rowToArchiveRequest).reverse();
}

/** Ambil semua request milik seorang pengirim berdasarkan NPM atau nomor WA (untuk cek status). */
export async function dbGetArchiveRequestsBySender(npm: string, contact: string): Promise<ArchiveRequest[]> {
  const cleanNpm = npm.trim().toLowerCase();
  const cleanContact = contact.replace(/\D/g, '');
  const rows = await db.select().from(archiveRequestsTable).orderBy(asc(archiveRequestsTable.createdAt));
  const matched = rows.filter((r) => {
    const byNpm = cleanNpm && (r.senderNpm ?? '').trim().toLowerCase() === cleanNpm;
    const byContact = cleanContact && (r.senderContact ?? '').replace(/\D/g, '') === cleanContact;
    return byNpm || byContact;
  });
  return matched.map(rowToArchiveRequest).reverse(); // newest first
}

export async function dbUpdateArchiveRequestStatus(
  reqId: string,
  status: 'approved' | 'rejected',
  matchedItemId?: string,
  rejectMessage?: string
): Promise<ArchiveRequest | null> {
  const patch: Partial<ArchiveRequestRecord> = { status, processedAt: new Date() };
  if (matchedItemId) patch.matchedItemId = matchedItemId;
  if (typeof rejectMessage === 'string') patch.rejectMessage = rejectMessage;
  await db.update(archiveRequestsTable).set(patch).where(eq(archiveRequestsTable.id, reqId));
  const rows = await db.select().from(archiveRequestsTable).where(eq(archiveRequestsTable.id, reqId)).limit(1);
  return rows[0] ? rowToArchiveRequest(rows[0]) : null;
}

/**
 * Hapus request yang sudah diproses (approved/rejected) lebih dari N jam.
 * Request 'pending' tidak pernah dihapus. Mengembalikan jumlah yang dihapus.
 */
export async function dbCleanupProcessedArchiveRequests(olderThanHours: number): Promise<number> {
  const cutoff = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);
  const deleted = await db.delete(archiveRequestsTable)
    .where(
      and(
        ne(archiveRequestsTable.status, 'pending'),
        isNotNull(archiveRequestsTable.processedAt),
        lt(archiveRequestsTable.processedAt, cutoff)
      )
    )
    .returning({ id: archiveRequestsTable.id });
  return deleted.length;
}
