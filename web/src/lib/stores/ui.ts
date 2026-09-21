import { writable } from 'svelte/store';
export { highlight, activeHighlight, currentFilter, scrollToCard, isItemHighlighted, type HighlightState } from './highlight.js';

export type Scene = 'lobby' | 'board';
export type FilterType = 'all' | 'lost' | 'found';
export type ModalType = 'none' | 'report' | 'claim' | 'claimsReview';

// Scene aktif ('lobby' | 'board')
export const currentScene = writable<Scene>('lobby');

// Modal aktif
export const activeModal = writable<ModalType>('none');

// Target item untuk modal klaim & review
export const claimTargetItemId = writable<string | null>(null);
export const reviewTargetItemId = writable<string | null>(null);

// Status koneksi socket dan counter user online
export const onlineCount = writable<number>(1);
export const socketConnected = writable<boolean>(false);

// Counter percobaan verifikasi klaim
export const claimAttemptCount = writable<number>(0);
