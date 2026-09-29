import type { Server as SocketIOServer, Socket } from 'socket.io';
import {
  dbInsertArchiveRequest,
  dbGetArchiveRequests,
  dbGetArchiveRequestsBySender,
  dbUpdateArchiveRequestStatus,
  dbRepublishItem,
  dbGetItem,
} from '../db/db-store.js';

// Helper: validasi access key Satpam dengan aman.
// Mengembalikan false jika env key kosong, agar tidak ada bypass "key kosong".
function isValidSatpamKey(accessKey: unknown): boolean {
  const secret = (process.env.SATPAM_ACCESS_KEY || '').trim();
  if (!secret) return false;
  const key = typeof accessKey === 'string' ? accessKey.trim() : '';
  return key === secret;
}

/**
 * Handler: User global board kirim permintaan aktivasi barang expired ke Satpam.
 * Event: 'archive_request_submit'
 *
 * Catatan: TIDAK ada AI matching. Satpam yang membaca request lalu memeriksa
 * arsip (termasuk foto asli) dan memutuskan publish/tolak secara manual.
 */
export async function handleArchiveRequestSubmit(
  io: SocketIOServer,
  socket: Socket,
  data: unknown
): Promise<void> {
  const d = data as any;

  if (!d?.senderName || !d?.senderContact || !d?.itemTitle || !d?.description) {
    socket.emit('archive_request_error', { message: 'Data permintaan tidak lengkap.' });
    return;
  }

  const req = await dbInsertArchiveRequest({
    senderName: String(d.senderName).trim(),
    senderNpm: String(d.senderNpm || '').trim(),
    senderContact: String(d.senderContact).trim(),
    itemTitle: String(d.itemTitle).trim(),
    itemCategory: String(d.itemCategory || '').trim(),
    dateFrom: String(d.dateFrom || '').trim(),
    dateTo: String(d.dateTo || '').trim(),
    locationHint: String(d.locationHint || '').trim(),
    description: String(d.description).trim(),
  });

  console.log(`[ArchiveReq] Permintaan baru dari ${req.senderName}: "${req.itemTitle}"`);

  // Kirim konfirmasi ke user
  socket.emit('archive_request_sent', {
    message: `Permintaan kamu sudah diterima! Satpam akan memeriksa arsip dan menghubungi WA kamu (${req.senderContact}) segera.`,
    requestId: req.id,
  });

  // Broadcast ke room satpam: ada inbox baru (murni data permintaan)
  io.to('satpam_room').emit('archive_request_inbox', { request: req });
}

/**
 * Handler: Satpam menyetujui request + mem-publish item arsip ke board publik.
 * Event: 'archive_request_approve'
 */
export async function handleArchiveRequestApprove(
  io: SocketIOServer,
  socket: Socket,
  data: unknown
): Promise<void> {
  const d = data as any;

  if (!isValidSatpamKey(d?.accessKey)) {
    socket.emit('archive_request_error', { message: 'Akses tidak sah.' });
    return;
  }

  const { requestId, itemId } = d;
  if (!requestId || !itemId) {
    socket.emit('archive_request_error', { message: 'requestId dan itemId wajib diisi.' });
    return;
  }

  const item = await dbGetItem(itemId);
  if (!item) {
    socket.emit('archive_request_error', { message: 'Item tidak ditemukan.' });
    return;
  }

  // Update item: expired → archived (tampil kembali di board, bisa diklaim lagi).
  // republishedAt di-set agar jendela expire 7 hari dimulai ulang dari sekarang.
  await dbRepublishItem(itemId);

  // Update request status
  await dbUpdateArchiveRequestStatus(requestId, 'approved', itemId);

  console.log(`[ArchiveReq] Satpam publish item "${item.title}" (${itemId}) via request ${requestId}`);

  // Broadcast ke SEMUA client: item muncul kembali di board dengan status 'archived'.
  // evidencePhoto & reporterToken TIDAK boleh ikut tersebar ke publik (foto bukti rahasia satpam).
  const { reporterToken: _, evidencePhoto: __, ...publicItem } = item;
  io.emit('item_archived_republished', { item: publicItem });

  // Notifikasi balik ke satpam
  socket.emit('archive_request_approved', {
    message: `Item "${item.title}" berhasil dipublish ke board publik.`,
    itemId,
  });
}

/**
 * Handler: Satpam menolak request + pesan opsional untuk pengirim.
 * Event: 'archive_request_reject'
 */
export async function handleArchiveRequestReject(
  io: SocketIOServer,
  socket: Socket,
  data: unknown
): Promise<void> {
  const d = data as any;

  if (!isValidSatpamKey(d?.accessKey)) {
    socket.emit('archive_request_error', { message: 'Akses tidak sah.' });
    return;
  }

  const rejectMessage = String(d.rejectMessage || '').trim();
  const updated = await dbUpdateArchiveRequestStatus(d.requestId, 'rejected', undefined, rejectMessage);
  if (!updated) {
    socket.emit('archive_request_error', { message: 'Request tidak ditemukan.' });
    return;
  }

  console.log(`[ArchiveReq] Satpam menolak request ${d.requestId}`);
  socket.emit('archive_request_rejected', {
    requestId: d.requestId,
    rejectMessage,
  });
}

/**
 * Handler: Satpam minta list semua archive requests.
 * Event: 'archive_requests_get'
 */
export async function handleArchiveRequestsGet(socket: Socket, data: unknown): Promise<void> {
  const d = data as any;
  if (!isValidSatpamKey(d?.accessKey)) {
    socket.emit('archive_request_error', { message: 'Akses tidak sah.' });
    return;
  }
  const requests = await dbGetArchiveRequests();
  socket.emit('archive_requests_list', { requests });
}

/**
 * Handler: User mengecek status request-nya sendiri lewat NPM / nomor WA.
 * Event: 'archive_requests_mine'
 */
export async function handleArchiveRequestsMine(socket: Socket, data: unknown): Promise<void> {
  const d = data as any;
  const npm = String(d?.npm || '').trim();
  const contact = String(d?.contact || '').trim();

  if (!npm && !contact) {
    socket.emit('archive_requests_mine_result', { requests: [] });
    return;
  }

  const requests = await dbGetArchiveRequestsBySender(npm, contact);
  socket.emit('archive_requests_mine_result', { requests });
}