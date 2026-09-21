import { z } from 'zod';

// Skema validasi pengajuan klaim barang via event socket claim_submit
export const claimSubmitSchema = z.object({
  itemId: z.string().min(1, 'ID item wajib ada'),
  proof: z.any({ required_error: 'ZKP Proof wajib ada' }),
  publicSignals: z.array(z.string()).length(3, 'Public signals harus berjumlah 3'),
  claimantName: z.string().optional().default(''),
  claimantNpm: z.string().optional().default(''),
  claimantContact: z.string().optional().default(''),
});

export type ClaimSubmitInput = z.infer<typeof claimSubmitSchema>;
