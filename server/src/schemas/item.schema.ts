import { z } from 'zod';

// Skema validasi pembuatan postingan item baru
export const itemAddSchema = z.object({
  id: z.string().min(1, 'ID item wajib ada'),
  shortCode: z.string().optional(),
  type: z.enum(['lost', 'found'], {
    errorMap: () => ({ message: 'Type harus "lost" atau "found"' }),
  }),
  title: z.string().min(1, 'Nama barang wajib diisi'),
  icon: z.string().default('📦'),
  category: z.string().optional().default(''),
  tag: z.string().optional().default(''),
  desc: z.string().min(1, 'Lokasi wajib diisi'),
  secretDetail: z.string().optional().default(''),
  commitments: z.array(z.string()).optional().default([]),
  evidencePhoto: z.string().optional().default(''),
  claims: z.array(z.any()).optional().default([]),
  status: z.enum(['open', 'disputed', 'resolved']).optional().default('open'),
  date: z.string().optional().default(''),
  time: z.string().optional().default(''),
  reporterName: z.string().optional().default(''),
  reporterNpm: z.string().optional().default(''),
  reporterContact: z.string().optional().default(''),
  reporterToken: z.string().min(1, 'Reporter token wajib ada'),
  x: z.number().optional().default(100),
  y: z.number().optional().default(100),
});

export type ItemAddInput = z.infer<typeof itemAddSchema>;

// Skema validasi hapus laporan barang (hanya pemilik)
export const itemDeleteSchema = z.object({
  id: z.string().min(1, 'ID item wajib ada'),
  reporterToken: z.string().optional().default(''),
  reporterNpm: z.string().optional().default(''),
});

export type ItemDeleteInput = z.infer<typeof itemDeleteSchema>;

// Skema validasi pergeseran posisi kartu barang di papan
export const itemMoveSchema = z.object({
  id: z.string().min(1, 'ID item wajib ada'),
  x: z.number(),
  y: z.number(),
});

export type ItemMoveInput = z.infer<typeof itemMoveSchema>;

// Skema validasi request pemilihan emoji barang menggunakan AI
export const emojiPickSchema = z.object({
  itemName: z.string().min(1, 'Nama barang wajib ada'),
});

export type EmojiPickInput = z.infer<typeof emojiPickSchema>;
