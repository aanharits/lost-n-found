import { Server as SocketIOServer } from 'socket.io';
import { sanitizeItems } from '../data/sanitize.js';
import { getItems } from '../data/store.js';
import { handleUserJoin, handleDisconnect, getConnectedUsersCount } from '../handlers/user.handler.js';
import { handleItemAdd, handlePickEmoji } from '../handlers/report.handler.js';
import { handleClaimSubmit } from '../handlers/claim.handler.js';
import { handleItemMove, handleItemsOrganize, handleResetDemo } from '../handlers/board.handler.js';
import { handleChatMessage } from '../handlers/chat.handler.js';

// Wiring event Socket.IO ke handler domain masing-masing
export function setupSocketHandlers(io: SocketIOServer): void {
  io.on('connection', (socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);

    // Kirim data item awal yang sudah disanitasi ke client yang baru terhubung
    socket.emit('items_init', sanitizeItems(getItems()));

    // Broadcast jumlah user aktif ke semua client
    io.emit('users_count', getConnectedUsersCount());

    // Event bergabung dan terputusnya user
    socket.on('user_join', (data) => handleUserJoin(io, socket, data));
    socket.on('disconnect', () => handleDisconnect(io, socket));

    // Event penambahan item laporan dan pemilihan emoji
    socket.on('item_add', (data) => handleItemAdd(io, socket, data));
    socket.on('pick_emoji', (data) => handlePickEmoji(socket, data));

    // Event pengajuan klaim barang
    socket.on('claim_submit', (data) => handleClaimSubmit(io, socket, data));

    // Event pergerakan dan organisasi papan barang
    socket.on('item_move', (data) => handleItemMove(io, socket, data));
    socket.on('items_organize', (data) => handleItemsOrganize(io, socket, data));
    socket.on('reset_demo_items', () => handleResetDemo(io));

    // Event percakapan dengan Satpam AI
    socket.on('chat_message', (data) => handleChatMessage(socket, data));
  });
}
