import { Hono } from 'hono';
import { verifyClaimApiSchema } from '../schemas/claim.schema.js';
import { getItems } from '../data/store.js';
import { verifyClaimWithAI } from '../ai/verifyClaim.js';

const api = new Hono();

// Endpoint REST untuk verifikasi klaim barang tanpa mengekspos secretDetail ke client
api.post('/verify-claim', async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Body request harus berupa JSON valid' }, 400);
  }

  const parsed = verifyClaimApiSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: 'Invalid payload', details: parsed.error.flatten() }, 400);
  }

  const { itemId, claimText } = parsed.data;
  const items = getItems();
  const item = items.find((i) => i.id === itemId);

  if (!item) {
    return c.json({ error: 'Item tidak ditemukan' }, 404);
  }

  // Jalankan verifikasi AI dengan mencocokkan teks klaim terhadap detail rahasia
  const result = await verifyClaimWithAI(
    item.secretDetail,
    claimText,
    item.title,
    item.desc
  );

  // Kembalikan hanya hasil evaluasi skor dan alasan tanpa detail rahasia
  return c.json({
    score: result.score,
    confidence: result.confidence,
    reasoning: result.reasoning,
  });
});

export default api;
