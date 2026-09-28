import { eq, asc } from 'drizzle-orm';
import { db } from './index.js';
import { itemsTable, claimsTable, type ItemRecord, type ClaimRecord } from './schema.js';

// ─── Type exports yang kompatibel dengan interface lama di store.ts ───────────

// Bentuk Item yang dipakai di seluruh aplikasi (frontend-friendly, claims embedded)
export interface Item {
  id: string;
  type: 'lost' | 'found';
  title: string;
  icon: string;
  category?: string;
  tag?: string;
  desc: string;           // alias 'description' untuk kompatibilitas frontend
  commitments: string[];
  claims: Claim[];
  status: 'open' | 'disputed' | 'resolved';
  date: string;
  time: string;
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
  return {
    id: row.id,
    type: row.type as 'lost' | 'found',
    title: row.title,
    icon: row.icon ?? '📦',
    category: row.category ?? '',
    tag: row.tag ?? '',
    desc: row.description,
    commitments: (row.commitments as string[]) ?? [],
    claims: claims.map(rowToClaim),
    status: (row.status ?? 'open') as 'open' | 'disputed' | 'resolved',
    date: row.date ?? '',
    time: row.time ?? '',
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
  const [inserted] = await db.insert(itemsTable).values({
    id: item.id,
    type: item.type,
    title: item.title,
    icon: item.icon ?? '📦',
    category: item.category ?? '',
    tag: item.tag ?? '',
    description: item.desc,
    commitments: item.commitments,
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

/** Update status dan koordinat item */
export async function dbUpdateItemStatus(id: string, status: 'open' | 'disputed' | 'resolved'): Promise<void> {
  await db.update(itemsTable)
    .set({ status, updatedAt: new Date() })
    .where(eq(itemsTable.id, id));
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
