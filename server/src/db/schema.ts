import { pgTable, varchar, text, jsonb, numeric, real, timestamp } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ─── Tabel items (Laporan barang hilang & ketemu) ─────────────────────────────
export const itemsTable = pgTable('items', {
  id: varchar('id', { length: 64 }).primaryKey(),
  shortCode: varchar('short_code', { length: 16 }),           // Human-readable short ID (contoh: 'B-7K9')
  type: varchar('type', { length: 10 }).notNull(),           // 'lost' | 'found'
  title: varchar('title', { length: 255 }).notNull(),
  icon: varchar('icon', { length: 16 }).default('📦'),
  category: varchar('category', { length: 64 }).default(''),
  tag: varchar('tag', { length: 64 }).default(''),
  description: text('description').notNull(),
  commitments: jsonb('commitments').$type<string[]>().default([]),
  evidencePhoto: text('evidence_photo').default(''),          // Foto bukti fisik pelapor (rahasia satpam)
  status: varchar('status', { length: 20 }).default('open'), // 'open' | 'disputed' | 'resolved'
  date: varchar('date', { length: 32 }).default(''),
  time: varchar('time', { length: 32 }).default(''),

  // Identitas pelapor (3 data awal)
  reporterName: varchar('reporter_name', { length: 100 }).default(''),
  reporterNpm: varchar('reporter_npm', { length: 32 }).notNull(),
  reporterContact: varchar('reporter_contact', { length: 64 }).default(''),

  // Device token rahasia: disimpan di localStorage pelapor untuk hak Edit/Hapus
  reporterToken: varchar('reporter_token', { length: 64 }).notNull(),

  // Koordinat posisi kartu di papan retro
  x: numeric('x').default('100'),
  y: numeric('y').default('100'),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  // Waktu saat item di-publish ulang dari arsip Satpam ke board (jendela expire baru)
  republishedAt: timestamp('republished_at', { withTimezone: true }),
});

// ─── Tabel claims (Riwayat pengajuan klaim via ZKP) ───────────────────────────
export const claimsTable = pgTable('claims', {
  id: varchar('id', { length: 64 }).primaryKey(),
  itemId: varchar('item_id', { length: 64 })
    .notNull()
    .references(() => itemsTable.id, { onDelete: 'cascade' }),

  text: text('text').default(''),
  score: real('score').default(1.0),                         // Intersection score 0.0–1.0
  confidence: varchar('confidence', { length: 32 }).default('Tinggi'),
  reasoning: text('reasoning').default(''),
  status: varchar('status', { length: 20 }).default('pending'), // 'pending' | 'approved' | 'rejected'

  // Identitas pengklaim
  claimantName: varchar('claimant_name', { length: 100 }).default(''),
  claimantNpm: varchar('claimant_npm', { length: 32 }).notNull(),
  claimantContact: varchar('claimant_contact', { length: 64 }).default(''),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// ─── Tabel archive_requests (Inbox request aktivasi arsip untuk Satpam) ───────
export const archiveRequestsTable = pgTable('archive_requests', {
  id: varchar('id', { length: 64 }).primaryKey(),
  senderName: varchar('sender_name', { length: 100 }).notNull(),
  senderNpm: varchar('sender_npm', { length: 32 }).default(''),
  senderContact: varchar('sender_contact', { length: 64 }).notNull(),
  itemTitle: varchar('item_title', { length: 255 }).notNull(),
  itemCategory: varchar('item_category', { length: 64 }).default(''),
  dateFrom: varchar('date_from', { length: 32 }).default(''),
  dateTo: varchar('date_to', { length: 32 }).default(''),
  locationHint: varchar('location_hint', { length: 255 }).default(''),
  description: text('description').notNull(),
  status: varchar('status', { length: 20 }).default('pending'), // 'pending' | 'approved' | 'rejected'
  matchedItemId: varchar('matched_item_id', { length: 64 }),
  // Pesan yang ditulis Satpam saat menolak request (ditampilkan ke pengirim)
  rejectMessage: text('reject_message').default(''),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  // Diisi ketika status diubah ke approved/rejected; dipakai untuk auto-cleanup
  processedAt: timestamp('processed_at', { withTimezone: true }),
});

// ─── Relasi (One-to-Many: 1 item → banyak claims) ────────────────────────────
export const itemsRelations = relations(itemsTable, ({ many }) => ({
  claims: many(claimsTable),
}));

export const claimsRelations = relations(claimsTable, ({ one }) => ({
  item: one(itemsTable, {
    fields: [claimsTable.itemId],
    references: [itemsTable.id],
  }),
}));

// ─── TypeScript Types ─────────────────────────────────────────────────────────
export type ItemRecord = typeof itemsTable.$inferSelect;
export type NewItemRecord = typeof itemsTable.$inferInsert;
export type ClaimRecord = typeof claimsTable.$inferSelect;
export type NewClaimRecord = typeof claimsTable.$inferInsert;
export type ArchiveRequestRecord = typeof archiveRequestsTable.$inferSelect;
export type NewArchiveRequestRecord = typeof archiveRequestsTable.$inferInsert;
