import { io, type Socket } from 'socket.io-client';
import { browser } from '$app/environment';
import { items, type Item } from './stores/items.js';
import { socketConnected, onlineCount } from './stores/ui.js';

const SERVER_URL = browser
  ? (import.meta.env.PUBLIC_SERVER_URL || 'http://localhost:3001')
  : '';

let socket: Socket | null = null;

// Callback untuk menampilkan notifikasi toast ke UI
let toastCallback: ((message: string, type: string) => void) | null = null;
export function setToastCallback(cb: (message: string, type: string) => void) {
  toastCallback = cb;
}

// Helper untuk memicu toast notification
function showToast(message: string, type: string = 'info') {
  if (toastCallback) toastCallback(message, type);
}

// Mengambil instance socket aktif
export function getSocket(): Socket | null {
  return socket;
}

// Inisialisasi koneksi Socket.IO ke backend dan daftarkan seluruh event listener realtime
export function initSocket(): Socket {
  if (socket) return socket;
  if (!browser) return null as any;

  socket = io(SERVER_URL, {
    transports: ['websocket', 'polling'],
  });

  // Listener status koneksi websocket
  socket.on('connect', () => {
    console.log('[Socket] Connected to WebSocket server');
    socketConnected.set(true);
  });

  socket.on('disconnect', () => {
    console.warn('[Socket] Disconnected from WebSocket server');
    socketConnected.set(false);
  });

  // Menerima data awal seluruh item saat pertama kali terhubung
  socket.on('items_init', (serverItems: Item[]) => {
    if (Array.isArray(serverItems)) {
      items.set(serverItems);
    }
  });

  // Menerima item baru yang dibuat oleh pengguna lain
  socket.on('item_added', (newItem: Item) => {
    items.update((current) => {
      const exists = current.some((i) => i.id === newItem.id);
      if (!exists) {
        showToast(`Laporan Baru: "${newItem.title}" (${newItem.type === 'found' ? 'Ketemu' : 'Hilang'})`, 'info');
        return [...current, newItem];
      }
      return current;
    });
  });

  // Sinkronisasi posisi kartu barang yang digeser user lain
  socket.on('item_moved', (posData: { id: string; x: number; y: number }) => {
    items.update((current) =>
      current.map((item) =>
        item.id === posData.id ? { ...item, x: posData.x, y: posData.y } : item
      )
    );
  });

  // Sinkronisasi pengaturan posisi otomatis seluruh item di board
  socket.on('items_organized', (positions: Array<{ id: string; x: number; y: number }>) => {
    if (Array.isArray(positions)) {
      positions.forEach((pos) => {
        const el = document.getElementById(pos.id);
        if (el) {
          el.style.left = `${pos.x}px`;
          el.style.top = `${pos.y}px`;
        }
      });

      items.update((current) =>
        current.map((item) => {
          const pos = positions.find((p) => p.id === item.id);
          return pos ? { ...item, x: pos.x, y: pos.y } : { ...item };
        })
      );
    }
  });

  // Sinkronisasi status klaim yang diperbarui oleh server
  socket.on('claim_updated', (data: {
    itemId: string;
    itemTitle: string;
    claim: any;
    resolved: boolean;
    claims: any[];
    reporterContact?: string;
  }) => {
    items.update((current) =>
      current.map((item) => {
        if (item.id === data.itemId) {
          return { ...item, claims: data.claims, resolved: data.resolved };
        }
        return item;
      })
    );
    showToast(`Update klaim untuk "${data.itemTitle}" (${data.claim.status})`, 'warning');
  });

  // Memperbarui jumlah user online
  socket.on('users_count', (count: number) => {
    onlineCount.set(count || 1);
  });

  // Notifikasi saat user lain masuk atau keluar
  socket.on('user_joined_toast', (u: { name: string }) => {
    showToast(`${u.name} masuk ke board!`, 'success');
  });

  socket.on('user_left_toast', (u: { name: string }) => {
    showToast(`${u.name} keluar`, 'danger');
  });

  return socket;
}
