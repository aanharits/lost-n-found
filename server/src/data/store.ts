import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '../../data');
const DATA_FILE = path.join(DATA_DIR, 'items.json');

// Definisi struktur data klaim
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

// Definisi struktur data barang laporan
export interface Item {
  id: string;
  type: 'lost' | 'found';
  title: string;
  icon: string;
  category?: string;
  tag?: string;
  desc: string;
  secretDetail: string;
  claims: Claim[];
  resolved: boolean;
  date: string;
  time: string;
  reporterName: string;
  reporterNpm: string;
  reporterContact: string;
  x: number;
  y: number;
}

// In-memory state untuk daftar barang
let items: Item[] = [];

// Membaca daftar item dari file items.json atau inisialisasi array kosong
export function loadItems(): Item[] {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        items = parsed;
        return items;
      }
    }
  } catch (err: any) {
    console.error('[Store] Failed to read items.json:', err.message);
  }

  items = [];
  saveItemsToFile(items);
  return items;
}

// Menyimpan daftar item ke file disk items.json
export function saveItemsToFile(itemsList?: Item[]): void {
  if (itemsList !== undefined) {
    items = itemsList;
  }
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(items, null, 2), 'utf8');
  } catch (err: any) {
    console.error('[Store] Failed to save items.json:', err.message);
  }
}

// Mengambil referensi data item saat ini
export function getItems(): Item[] {
  return items;
}

// Mengganti daftar item di memori
export function setItems(newItems: Item[]): void {
  items = newItems;
}

// Muat data item saat file pertama kali diimpor
loadItems();
