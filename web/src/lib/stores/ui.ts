import { writable } from 'svelte/store';

export type Scene = 'lobby' | 'board';
export type FilterType = 'all' | 'lost' | 'found';
export type ModalType = 'none' | 'report' | 'claim' | 'claimsReview';

// Store status scene tampilan aktif (lobby atau board)
export const currentScene = writable<Scene>('lobby');

// Store filter kategori barang (all, lost, found)
export const currentFilter = writable<FilterType>('all');

// Store modal dialog yang sedang terbuka
export const activeModal = writable<ModalType>('none');

// Store ID barang yang sedang dipilih untuk klaim atau review
export const claimTargetItemId = writable<string | null>(null);
export const reviewTargetItemId = writable<string | null>(null);

// Store jumlah user online dan status koneksi socket
export const onlineCount = writable<number>(1);
export const socketConnected = writable<boolean>(false);

// Store penghitung percobaan klaim untuk batas kesempatan
export const claimAttemptCount = writable<number>(0);

export interface HighlightState {
  category?: string | null;
  tag?: string | null;
  itemType?: 'lost' | 'found' | null;
  itemIds: string[];
  source?: 'satpam' | 'filter' | 'direct';
}

// Store sorotan aktif oleh Satpam AI atau filter tag di papan
export const activeHighlight = writable<HighlightState | null>(null);

// Store filter kategori tag (all, Gadget, Pakaian & Aksesoris, Personal, Dokumen & Kartu)
export const activeCategoryFilter = writable<string>('all');
