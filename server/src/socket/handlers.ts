import { Server as SocketIOServer } from 'socket.io';
import { dbGetItems } from '../db/db-store.js';
import { handleUserJoin, handleDisconnect, getConnectedUsersCount } from '../handlers/user.handler.js';
import { handleItemAdd, handlePickEmoji } from '../handlers/report.handler.js';
import { handleClaimSubmit } from '../handlers/claim.handler.js';
import { handleItemMove, handleItemsOrganize, handleResetDemo } from '../handlers/board.handler.js';
import { handleItemDelete } from '../handlers/item.handler.js';
import { handleChatMessage } from '../handlers/chat.handler.js';

// Wiring event Socket.IO ke handler domain masing-masing
export function setupSocketHandlers(io: SocketIOServer): void {
  io.on('connection', (socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);

    // Daftarkan seluruh event listener secara synchronous terlebih dahulu
    // agar event yang dikirim langsung oleh client tidak hilang (race condition)
    try {
      // Handler autentikasi & room khusus Petugas Satpam
      const SATPAM_SECRET_KEY = process.env.SATPAM_ACCESS_KEY || 'satpamganteng';

      socket.on('satpam_join', async (data: { accessKey?: string }) => {
        const key = data?.accessKey?.trim();
        if (key === SATPAM_SECRET_KEY) {
          socket.join('satpam_room');
          console.log(`[Socket] Satpam verified and joined satpam_room: ${socket.id}`);
          try {
            const allItems = await dbGetItems();
            // Satpam boleh melihat evidencePhoto, hanya reporterToken yang disanitasi
            const satpamItems = allItems.map(({ reporterToken: _, ...rest }) => rest);
            socket.emit('satpam_auth_success', { ok: true });
            socket.emit('satpam_items_init', satpamItems);
          } catch (err) {
            console.error('[Socket] Failed to load satpam items:', err);
            socket.emit('satpam_items_init', []);
          }
        } else {
          console.warn(`[Socket] Satpam auth failed for ${socket.id}: Invalid key`);
          socket.emit('satpam_auth_failed', { message: 'Access key Satpam tidak valid.' });
        }
      });

      socket.on('satpam_get_items', async (data: { accessKey?: string }) => {
        const key = data?.accessKey?.trim();
        if (key === SATPAM_SECRET_KEY) {
          try {
            const allItems = await dbGetItems();
            const satpamItems = allItems.map(({ reporterToken: _, ...rest }) => rest);
            socket.emit('satpam_items_response', satpamItems);
          } catch (err) {
            console.error('[Socket] Failed to load satpam items:', err);
            socket.emit('satpam_items_response', []);
          }
        } else {
          socket.emit('satpam_auth_failed', { message: 'Access key Satpam tidak valid.' });
        }
      });
    } catch (err) {
      console.error('[Socket] Failed to register satpam handlers:', err);
    }

    // Event bergabung dan terputusnya user
    socket.on('user_join', (data) => handleUserJoin(io, socket, data));
    socket.on('disconnect', () => handleDisconnect(io, socket));

    // Event penambahan item laporan dan pemilihan emoji
    socket.on('item_add', (data) => handleItemAdd(io, socket, data));
    socket.on('pick_emoji', (data) => handlePickEmoji(socket, data));

    // Event hapus laporan (oleh pemilik)
    socket.on('item_delete', (data) => handleItemDelete(io, socket, data));

    // Event pengajuan klaim barang
    socket.on('claim_submit', (data) => handleClaimSubmit(io, socket, data));

    // Event pergerakan dan organisasi papan barang
    socket.on('item_move', (data) => handleItemMove(io, socket, data));
    socket.on('items_organize', (data) => handleItemsOrganize(io, socket, data));
    socket.on('reset_demo_items', () => handleResetDemo(io));

    // Event percakapan dengan Satpam AI
    socket.on('chat_message', (data) => handleChatMessage(socket, data));

    // Broadcast jumlah user aktif ke semua client
    io.emit('users_count', getConnectedUsersCount());

    // Kirim data item awal dari DB ke client secara asynchronous
    // (setelah semua listener teregistrasi, sanitasi reporter_token & evidencePhoto untuk publik)
    dbGetItems()
      .then((items) => {
        const sanitized = items.map(({ reporterToken: _, evidencePhoto: __, ...rest }) => rest);
        socket.emit('items_init', sanitized);
      })
      .catch((err) => {
        console.error('[Socket] Failed to load items from DB:', err);
        socket.emit('items_init', []);
      });
  });
}
