import type { Server as SocketIOServer, Socket } from 'socket.io';
import { profileSchema } from '../schemas/profile.schema.js';

// Penyimpanan data user aktif berdasarkan socket.id
const connectedUsers = new Map<string, { name: string; npm?: string; contact?: string; gender?: string }>();

// Mengambil jumlah total user yang sedang terhubung
export function getConnectedUsersCount(): number {
  return connectedUsers.size;
}

// Mengambil daftar seluruh profil user yang sedang aktif
export function getConnectedUsersList(): Array<{ name: string; npm?: string; contact?: string; gender?: string }> {
  return Array.from(connectedUsers.values());
}

// Mengambil data profil user berdasarkan socket.id
export function getConnectedUser(socketId: string) {
  return connectedUsers.get(socketId);
}

// Menangani event user bergabung ke lobby/board
export function handleUserJoin(io: SocketIOServer, socket: Socket, data: unknown): void {
  const parsed = profileSchema.safeParse(data);
  if (!parsed.success) return;

  const profile = parsed.data;
  connectedUsers.set(socket.id, profile);
  console.log(`[User] Joined: ${profile.name} (${profile.npm || '-'})`);

  // Kirim notifikasi toast ke user lain bahwa ada user baru bergabung
  socket.broadcast.emit('user_joined_toast', {
    name: profile.name,
    npm: profile.npm,
  });

  // Broadcast pembaruan jumlah user dan daftar user aktif
  io.emit('users_count', connectedUsers.size);
  io.emit('active_users_list', Array.from(connectedUsers.values()));
}

// Menangani event user terputus dari server
export function handleDisconnect(io: SocketIOServer, socket: Socket): void {
  const user = connectedUsers.get(socket.id);
  if (user) {
    console.log(`[User] Left: ${user.name}`);
    connectedUsers.delete(socket.id);
    io.emit('user_left_toast', { name: user.name });
  }

  // Broadcast pembaruan jumlah user setelah ada yang keluar
  io.emit('users_count', connectedUsers.size);
  io.emit('active_users_list', Array.from(connectedUsers.values()));
}
