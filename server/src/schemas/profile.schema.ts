import { z } from 'zod';

// Skema validasi data profil saat user bergabung ke lobby
export const profileSchema = z.object({
  name: z.string().min(1, 'Nama wajib diisi'),
  npm: z.string().optional(),
  contact: z.string().optional(),
  gender: z.string().optional(),
});

export type ProfileInput = z.infer<typeof profileSchema>;
