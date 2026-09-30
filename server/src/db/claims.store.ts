import { eq, asc } from 'drizzle-orm';
import { db } from './index.js';
import { claimsTable } from './schema.js';
import type { Claim } from './types.js';
import { rowToClaim } from './mappers.js';
import { addClaimToCacheItem, updateClaimInCache } from './cache.js';

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

  const newClaim = rowToClaim(inserted);
  addClaimToCacheItem(itemId, newClaim);
  return newClaim;
}

/** Update status klaim (approved/rejected) */
export async function dbUpdateClaimStatus(
  claimId: string,
  status: 'pending' | 'approved' | 'rejected',
  reasoning?: string
): Promise<void> {
  updateClaimInCache(claimId, status, reasoning);
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
