import { z } from 'zod';

// Skema validasi pesan obrolan user ke Satpam AI via event chat_message
export const chatMessageSchema = z.object({
  message: z.string().min(1, 'Pesan wajib diisi'),
  boardData: z.string().optional().default(''),
  historyContext: z.string().optional().default(''),
});

export type ChatMessageInput = z.infer<typeof chatMessageSchema>;
