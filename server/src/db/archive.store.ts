import { eq, asc, and, ne, isNotNull, lt } from 'drizzle-orm';
import { db } from './index.js';
import { archiveRequestsTable, type ArchiveRequestRecord } from './schema.js';
import type { ArchiveRequest } from './types.js';
import { rowToArchiveRequest } from './mappers.js';

// ─── Archive Requests (Inbox Satpam dari Global Board) ────────────────────────

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
  // Urutkan yang terbaru di awal
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
  return matched.map(rowToArchiveRequest).reverse();
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
