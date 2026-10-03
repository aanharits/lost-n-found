import { io, type Socket } from 'socket.io-client';
import { browser } from '$app/environment';
import { get } from 'svelte/store';
import { items, itemsLoaded, updateLastKnownItemCount, archiveRequests, myArchiveRequests, persistItemsToLocal, type Item, type ArchiveRequest } from './stores/items.js';
import { socketConnected, onlineCount } from './stores/ui.js';
import { currentPlayer } from './stores/player.js';

const SERVER_URL = browser
  ? (import.meta.env.PUBLIC_SERVER_URL || 'http://localhost:3001')
  : '';

let socket: Socket | null = null;

// Dipasang sekali per sesi halaman agar `visibilitychange` tidak menumpuk
// listener setiap `initSocket()` dipanggil ulang (mis. HMR).
let visibilityListenerAttached = false;

// Callback untuk menampilkan notifikasi toast ke UI
let toastCallback: ((message: string, type: string) => void) | null = null;
export function setToastCallback(cb: (message: string, type: string) => void) {
  toastCallback = cb;
}

// Helper untuk memicu toast notification
function showToast(message: string, type: string = 'info') {
  if (toastCallback) toastCallback(message, type);
}

// Menggabungkan daftar klaim berdasarkan `id` (data dari server diutamakan).
// Klaim lokal yang belum ada di payload tetap dipertahankan agar data tidak
// hilang bila payload server datang tidak lengkap — penggantian wholesale
// (claims: data.claims) rawan menghapus klaim yang sudah tampil di inbox.
function mergeClaimsById(local: any[], incoming: any[]): any[] {
  const seen = new Set<string>();
  const result: any[] = [];

  for (const claim of incoming || []) {
    if (!claim || !claim.id || seen.has(claim.id)) continue;
    seen.add(claim.id);
    result.push(claim);
  }

  for (const claim of local || []) {
    if (!claim || !claim.id || seen.has(claim.id)) continue;
    seen.add(claim.id);
    result.push(claim);
  }

  return result;
}

// Mengambil instance socket aktif
export function getSocket(): Socket | null {
  return socket;
}

// Meminta snapshot data terbaru dari server (pull manual).
//
// Dipakai saat inbox dibuka dan saat tab kembali aktif. Ini penting karena
// inbox/board hanya mengandalkan event push; bila satu saja event realtime
// terlewat (tab di background, koneksi sempat putus, reload dev server),
// datanya baru muncul setelah user me-refresh halaman.
export function requestItemsSnapshot(): void {
  if (!socket?.connected) return;

  const player = get(currentPlayer);

  const isSatpam = player?.role === 'satpam';
  const accessKey = player?.accessKey || '';

  // Jangan minta snapshot publik untuk sesi Satpam yang accessKey-nya belum
  // tersedia: balasan publik tidak menyertakan evidencePhoto sehingga bisa
  // menurunkan kualitas data yang sedang ditampilkan.
  if (isSatpam && !accessKey) return;

  socket.emit('items_get', { accessKey: isSatpam ? accessKey : '' });
}

// Inisialisasi koneksi Socket.IO ke backend dan daftarkan seluruh event listener realtime
export function initSocket(): Socket {
  // Pasang sekali untuk seluruh sesi halaman: setiap tab kembali aktif, tarik
  // snapshot agar event yang terlewat saat tab di background (browser menahan
  // timer websocket, koneksi sempat putus, HMR) tidak membuat inbox/board basi.
  if (browser && !visibilityListenerAttached) {
    visibilityListenerAttached = true;
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        requestItemsSnapshot();
      }
    });
  }

  if (socket) return socket;
  if (!browser) return null as any;

  // Gunakan WebSocket murni secara langsung tanpa jeda handshake HTTP polling
  socket = io(SERVER_URL, {
    transports: ['websocket'],
  });

  // Listener status koneksi websocket
  socket.on('connect', () => {
    console.log('[Socket] Connected to WebSocket server');
    socketConnected.set(true);
    // Reconnect (socket baru) otomatis dapat `items_init` dari server, jadi di
    // sini tidak perlu pull tambahan untuk menghindari duplikasi snapshot.
  });

  socket.on('disconnect', () => {
    console.warn('[Socket] Disconnected from WebSocket server');
    socketConnected.set(false);
  });

  // Menerima data awal seluruh item saat pertama kali terhubung (dan simpan ke cache lokal)
  socket.on('items_init', (serverItems: Item[]) => {
    if (Array.isArray(serverItems)) {
      items.set(serverItems);
      const activeCount = serverItems.filter((i) => i.status !== 'expired' && i.status !== 'resolved').length;
      updateLastKnownItemCount(activeCount);
      persistItemsToLocal(serverItems);
      itemsLoaded.set(true);
    }
  });

  // Menerima data arsip lengkap khusus Satpam (termasuk foto bukti fisik)
  socket.on('satpam_items_init', (satpamItems: Item[]) => {
    if (Array.isArray(satpamItems)) {
      items.set(satpamItems);
      itemsLoaded.set(true);
    }
  });

  socket.on('satpam_items_response', (satpamItems: Item[]) => {
    if (Array.isArray(satpamItems) && satpamItems.length > 0) {
      items.set(satpamItems);
      itemsLoaded.set(true);
    }
  });

  socket.on('satpam_item_added', (newItem: Item) => {
    items.update((current) => {
      const exists = current.some((i) => i.id === newItem.id);
      if (!exists) {
        return [...current, newItem];
      }
      return current.map((i) => (i.id === newItem.id ? { ...i, ...newItem } : i));
    });
  });

  // Menerima item baru yang dibuat oleh pengguna lain
  socket.on('item_added', (newItem: Item) => {
    items.update((current) => {
      const exists = current.some((i) => i.id === newItem.id);
      if (!exists) {
        return [...current, newItem];
      }
      return current;
    });
  });

  // Menangani error jika laporan gagal disimpan di server
  socket.on('item_add_error', (data: { message?: string }) => {
    showToast(data?.message || 'Gagal menyimpan laporan barang', 'danger');
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
    status: 'open' | 'disputed' | 'resolved';
    claims: any[];
    reporterContact?: string;
  }) => {
    items.update((current) =>
      current.map((item) => {
        if (item.id === data.itemId) {
          // Server adalah kebenaran untuk array `claims` milik item ini: ganti
          // seluruhnya agar perubahan status di server (mis. klaim lama menjadi
          // `superseded`) ikut tercermin. Klaim lokal yang belum dikenal server
          // tetap dipertahankan agar tidak hilang bila payload tidak lengkap.
          return { ...item, claims: mergeClaimsById(item.claims || [], data.claims), status: data.status };
        }
        return item;
      })
    );
    showToast(`Update klaim untuk "${data.itemTitle}" (${data.claim.status})`, 'warning');
  });

  // Menerima hasil akhir dispute window (pemenang ditentukan)
  socket.on('dispute_resolved', (data: {
    itemId: string;
    itemTitle: string;
    status: 'open' | 'disputed' | 'resolved';
    claims: any[];
    winnerId: string | null;
  }) => {
    items.update((current) =>
      current.map((item) => {
        if (item.id === data.itemId) {
          // Dedupe per id: klaim ganda membuat {#each} ber-key di InboxPanel crash.
          return { ...item, claims: mergeClaimsById([], data.claims), status: data.status };
        }
        return item;
      })
    );
    showToast(
      data.winnerId
        ? `Pemenang klaim "${data.itemTitle}" telah ditentukan.`
        : `Masa sanggah "${data.itemTitle}" berakhir.`,
      data.winnerId ? 'success' : 'info'
    );
  });

  // Memperbarui jumlah user online
  socket.on('users_count', (count: number) => {
    onlineCount.set(count || 1);
  });

  // Sinkronisasi laporan yang diedit oleh pemiliknya
  socket.on('item_updated', (updatedItem: Item) => {
    items.update((current) =>
      current.map((item) => (item.id === updatedItem.id ? { ...item, ...updatedItem } : item))
    );
  });

  // Hapus kartu dari board ketika pemilik menghapus laporan
  socket.on('item_deleted', ({ id }: { id: string }) => {
    items.update((current) => current.filter((i) => i.id !== id));
  });

  // Sembunyikan item dari board ketika auto-expired (> 7 hari tanpa klaim)
  socket.on('items_expired', ({ itemIds }: { itemIds: string[] }) => {
    if (!Array.isArray(itemIds)) return;
    items.update((current) =>
      current.map((item) =>
        itemIds.includes(item.id) ? { ...item, status: 'expired' as const } : item
      )
    );
  });

  // Tampilkan kembali item yang diaktifkan Satpam dari arsip (status: 'archived')
  socket.on('item_archived_republished', ({ item: republished }: { item: Item }) => {
    items.update((current) => {
      const exists = current.some((i) => i.id === republished.id);
      if (exists) {
        return current.map((i) => (i.id === republished.id ? { ...i, ...republished } : i));
      }
      return [...current, republished];
    });
    showToast(`Barang "${republished.title}" diaktifkan kembali dari Arsip Satpam — Silakan klaim jika itu milikmu!`, 'success');
  });

  // Konfirmasi archive request terkirim
  socket.on('archive_request_sent', (data: { message: string; requestId: string }) => {
    showToast(data.message, 'success');
  });

  // Satpam: terima inbox request baru (murni data permintaan, tanpa AI matching)
  socket.on('archive_request_inbox', (data: { request: ArchiveRequest }) => {
    archiveRequests.update((current) => {
      const exists = current.some((r) => r.id === data.request.id);
      if (exists) return current;
      return [data.request, ...current];
    });
  });

  // Satpam: list semua requests
  socket.on('archive_requests_list', (data: { requests: ArchiveRequest[] }) => {
    if (Array.isArray(data.requests)) {
      archiveRequests.set(data.requests);
    }
  });

  // User: hasil pengecekan status request berdasarkan NPM / WA
  socket.on('archive_requests_mine_result', (data: { requests: ArchiveRequest[] }) => {
    myArchiveRequests.set(Array.isArray(data.requests) ? data.requests : []);
  });

  // Error pada alur archive request (mis. access key salah / data tidak lengkap)
  socket.on('archive_request_error', (data: { message?: string }) => {
    showToast(data?.message || 'Permintaan arsip gagal diproses.', 'danger');
  });

  // Satpam berhasil mengaktifkan item dari arsip
  socket.on('archive_request_approved', (data: { message?: string }) => {
    showToast(data?.message || 'Item berhasil diaktifkan kembali.', 'success');
  });

  // Satpam menolak request arsip
  socket.on('archive_request_rejected', () => {
    showToast('Request arsip ditolak.', 'info');
  });

  return socket;
}

