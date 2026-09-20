import { z } from 'zod';

// Skema validasi pengajuan klaim barang via event socket claim_submit
export const claimSubmitSchema = z.object({
  itemId: z.string().min(1, 'ID item wajib ada'),
  claimText: z.string().min(1, 'Teks klaim wajib diisi'),
  claimantName: z.string().optional().default(''),
  claimantNpm: z.string().optional().default(''),
  claimantContact: z.string().optional().default(''),
  attemptNumber: z.number().min(1).optional().default(1),
});

export type ClaimSubmitInput = z.infer<typeof claimSubmitSchema>;

// Skema validasi pengajuan verifikasi klaim via REST API POST /api/verify-claim
export const verifyClaimApiSchema = z.object({
  itemId: z.string().min(1, 'ID item wajib ada'),
  claimText: z.string().min(1, 'Teks klaim wajib diisi'),
});

export type VerifyClaimApiInput = z.infer<typeof verifyClaimApiSchema>;
