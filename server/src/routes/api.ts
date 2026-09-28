import { Hono } from 'hono';
import { extractKeywordsWithAI } from '../zk/keywordExtractor.js';
import { sanitizeEvidencePhoto } from '../utils/imageSanitizer.js';
import { dbGetItems } from '../db/db-store.js';

const api = new Hono();
const SATPAM_SECRET_KEY = process.env.SATPAM_ACCESS_KEY || 'satpamganteng';

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

// Endpoint untuk upload & sanitasi foto bukti fisik
api.post('/upload', async (c) => {
  let imagePayload = '';
  const contentType = c.req.header('content-type') || '';

  try {
    if (contentType.includes('application/json')) {
      const body = await c.req.json();
      imagePayload = body.image || '';
    } else if (contentType.includes('multipart/form-data')) {
      const formData = await c.req.formData();
      const file = formData.get('file') as File | null;
      if (file) {
        const buffer = await file.arrayBuffer();
        const base64 = Buffer.from(buffer).toString('base64');
        const mimeType = file.type || 'image/jpeg';
        imagePayload = `data:${mimeType};base64,${base64}`;
      }
    }
  } catch (err: any) {
    return c.json({ error: 'Gagal membaca payload upload: ' + err.message }, 400);
  }

  if (!imagePayload) {
    return c.json({ error: 'Data gambar tidak ditemukan dalam request' }, 400);
  }

  const result = sanitizeEvidencePhoto(imagePayload);
  if (!result.valid || !result.sanitized) {
    return c.json({ error: result.error || 'Gambar tidak valid' }, 422);
  }

  return c.json({
    success: true,
    data: result.sanitized,
    message: 'Foto bukti berhasil disanitasi dan diterima'
  });
});

// Endpoint verifikasi access key Satpam
api.post('/satpam/verify', async (c) => {
  let key = '';
  try {
    const body = await c.req.json();
    key = (body.accessKey || '').trim();
  } catch {
    key = '';
  }

  if (key === SATPAM_SECRET_KEY) {
    return c.json({ success: true, message: 'Autentikasi Satpam berhasil' });
  }

  return c.json({ success: false, message: 'Access key Satpam tidak valid' }, 401);
});

// Endpoint untuk mengambil semua item arsip untuk Satpam (termasuk foto bukti fisik)
api.get('/satpam/items', async (c) => {
  const authHeader = c.req.header('x-satpam-key') || c.req.header('authorization') || '';
  const cleanKey = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (cleanKey !== SATPAM_SECRET_KEY) {
    return c.json({ error: 'Akses ditolak: Access key Satpam tidak valid' }, 403);
  }

  try {
    const items = await dbGetItems();
    const sanitized = items.map(({ reporterToken: _, ...rest }) => rest);
    return c.json({ success: true, items: sanitized });
  } catch (err: any) {
    console.error('[API Satpam] Error loading items:', err);
    return c.json({ error: 'Gagal memuat arsip Satpam' }, 500);
  }
});

export default api;
