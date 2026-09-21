import { writable } from 'svelte/store';

// Tipe data objek klaim barang
export interface Claim {
  id: string;
  text: string;
  score: number;
  confidence: string;
  reasoning: string;
  status: 'pending' | 'approved' | 'rejected';
  claimantName: string;
  claimantNpm: string;
  claimantContact: string;
  createdAt: string;
}

// Tipe data objek barang laporan
export interface Item {
  id: string;
  type: 'lost' | 'found';
  title: string;
  icon: string;
  category?: string;
  tag?: string;
  desc: string;
  commitments: string[];
  claims: Claim[];
  status: 'open' | 'disputed' | 'resolved';
  date: string;
  time: string;
  reporterName: string;
  reporterNpm: string;
  reporterContact: string;
  x: number;
  y: number;
}

// Store reaktif daftar barang yang ditampilkan pada papan
export const items = writable<Item[]>([]);
