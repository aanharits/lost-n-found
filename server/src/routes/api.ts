import { Hono } from 'hono';

import { getItems } from '../data/store.js';
import { extractKeywordsWithAI } from '../zk/keywordExtractor.js';

const api = new Hono();

// Endpoint untuk mengekstrak keyword dari teks bebas pengguna
// Endpoint ini dipanggil oleh frontend sebelum melakukan generate proof ZKP
api.post('/extract', async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: 'Body request harus berupa JSON valid' }, 400);
  }

  // Validasi payload
  const { text } = body as any;
  if (typeof text !== 'string') {
    return c.json({ error: 'Payload harus memiliki properti "text" berupa string' }, 400);
  }

  try {
    const keywords = await extractKeywordsWithAI(text);
    return c.json({ keywords });
  } catch (error: any) {
    console.error('[API Extract] Error:', error);
    return c.json({ error: 'Gagal mengekstrak keyword' }, 500);
  }
});

export default api;
