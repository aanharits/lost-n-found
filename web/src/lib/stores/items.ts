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

const CACHE_ITEMS_KEY = 'lnf_cached_items';

function getInitialItems(): Item[] {
  if (!browser) return [];
  try {
    const raw = sessionStorage.getItem(CACHE_ITEMS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// Store reaktif daftar barang yang ditampilkan pada papan (instan 0ms dari sessionStorage saat F5)
export const items = writable<Item[]>(getInitialItems());

/** Simpan data item terakhir ke sessionStorage untuk instant rendering saat F5 */
export function persistItemsToLocal(data: Item[]): void {
  if (!browser || !Array.isArray(data)) return;
  try {
    sessionStorage.setItem(CACHE_ITEMS_KEY, JSON.stringify(data));
  } catch {
    // Kuota sessionStorage penuh atau privasi browser dinonaktifkan
  }
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
