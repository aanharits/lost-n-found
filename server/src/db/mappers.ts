import type { Item, Claim, ArchiveRequest } from './types.js';
import type { ClaimRecord, ArchiveRequestRecord } from './schema.js';

// ─── Helper Mappers: Konversi dari Format DB Record ke Domain Model ───────────

export function rowToClaim(row: ClaimRecord): Claim {
  return {
    id: row.id,
    text: row.text ?? '',
    score: row.score ?? 1.0,
    confidence: row.confidence ?? 'Tinggi',
    reasoning: row.reasoning ?? '',
    status: (row.status ?? 'pending') as Claim['status'],
    claimantName: row.claimantName ?? '',
    claimantNpm: row.claimantNpm,
    claimantContact: row.claimantContact ?? '',
    createdAt: row.createdAt?.toISOString() ?? new Date().toISOString(),
  };
}

export function rowToItem(row: any, claims: ClaimRecord[]): Item {
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
    reporterToken: row.reporterToken,
    x: Number(row.x ?? 100),
    y: Number(row.y ?? 100),
  };
}

export function rowToArchiveRequest(row: ArchiveRequestRecord): ArchiveRequest {
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
