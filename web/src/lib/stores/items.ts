import { writable } from 'svelte/store';
import { browser } from '$app/environment';

// Tipe data objek klaim barang
export interface Claim {
  id: string;
  text: string;
  score: number;
  confidence: string;
  reasoning: string;
  // 'superseded' = klaim lama yang digantikan oleh revisi pengklaim yang sama
  status: 'pending' | 'approved' | 'rejected' | 'superseded';
  claimantName: string;
  claimantNpm: string;
  claimantContact: string;
  createdAt: string;
}

// Tipe data objek barang laporan
export interface Item {
  id: string;
  shortCode?: string;
  type: 'lost' | 'found';
  title: string;
  icon: string;
  category?: string;
  tag?: string;
  desc: string;
  commitments: string[];
  claims: Claim[];
  status: 'open' | 'disputed' | 'resolved' | 'expired' | 'archived';
  date: string;
  time: string;
  evidencePhoto?: string;
  reporterName: string;
  reporterNpm: string;
  reporterContact: string;
  x: number;
  y: number;
}

// Bersihkan cache lama di sessionStorage jika ada, agar tidak ada data hantu saat refresh
if (browser) {
  try {
    sessionStorage.removeItem('lnf_cached_items');
  } catch {}
}

// Store reaktif daftar barang yang ditampilkan pada papan (default kosong, diisi data live dari WebSocket)
export const items = writable<Item[]>([]);

// Status apakah data awal item dari server sudah selesai dimuat
export const itemsLoaded = writable<boolean>(false);

const LAST_COUNT_KEY = 'lnf_last_known_count';

function getSavedItemCount(): number {
  if (!browser) return 3;
  try {
    const raw = localStorage.getItem(LAST_COUNT_KEY);
    if (raw !== null) {
      const parsed = parseInt(raw, 10);
      if (!isNaN(parsed) && parsed >= 0) return Math.min(parsed, 16);
    }
  } catch {}
  return 3;
}

// Menyimpan estimasi jumlah item terakhir agar jumlah skeleton presisi sesuai data
export const lastKnownItemCount = writable<number>(getSavedItemCount());

export function updateLastKnownItemCount(count: number): void {
  if (!browser) return;
  try {
    localStorage.setItem(LAST_COUNT_KEY, String(count));
    lastKnownItemCount.set(count);
  } catch {}
}

/** No-op: tidak menyimpan cache lokal agar UI selalu 100% konsisten dengan database */
export function persistItemsToLocal(_data: Item[]): void {
  // sengaja dikosongkan agar data yang sudah dihapus tidak muncul kembali saat refresh
}

// Tipe data permintaan aktivasi barang dari arsip (Inbox Satpam)
export interface ArchiveRequest {
  id: string;
  senderName: string;
  senderNpm: string;
  senderContact: string;
  itemTitle: string;
  itemCategory?: string;
  dateFrom?: string;
  dateTo?: string;
  locationHint?: string;
  description: string;
  status: 'pending' | 'approved' | 'rejected';
  matchedItemId?: string;
  rejectMessage?: string; // Pesan penolakan dari Satpam untuk pengirim
  createdAt: string;
}

// Store inbox archive requests (hanya di-populate di Satpam /arsip)
export const archiveRequests = writable<ArchiveRequest[]>([]);

// Store request milik user sendiri (hasil cek status via NPM / WA)
export const myArchiveRequests = writable<ArchiveRequest[]>([]);
