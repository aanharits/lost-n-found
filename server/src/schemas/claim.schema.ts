import { z } from 'zod';

// Skema validasi satu proof per keyword (ZKP v2)
const singleProofSchema = z.object({
  commitmentIndex: z.number().int().min(0, 'Index commitment harus >= 0'),
  proof: z.any({ required_error: 'ZKP Proof wajib ada' }),
  publicSignal: z.string().min(1, 'Public signal wajib ada'),
});

// Skema validasi pengajuan klaim barang via event socket claim_submit (ZKP v2)
// proofs[] menggantikan proof + publicSignals tunggal dari v1
export const claimSubmitSchema = z.object({
  itemId: z.string().min(1, 'ID item wajib ada'),
  proofs: z.array(singleProofSchema).min(1, 'Minimal harus ada 1 proof'),
  claimantName: z.string().optional().default(''),
  claimantNpm: z.string().optional().default(''),
  claimantContact: z.string().optional().default(''),
});

export type ClaimSubmitInput = z.infer<typeof claimSubmitSchema>;
export type SingleProof = z.infer<typeof singleProofSchema>;
