// ─── Domain Types untuk Database Store ────────────────────────────────────────

// Bentuk Item yang dipakai di seluruh aplikasi (frontend-friendly, claims embedded)
export interface Item {
  id: string;
  shortCode: string;      // Human-readable short ID (misal 'B-7K9')
  type: 'lost' | 'found';
  title: string;
  icon: string;
  category?: string;
  tag?: string;
  desc: string;           // alias 'description' untuk kompatibilitas frontend
  commitments: string[];
  claims: Claim[];
  status: 'open' | 'disputed' | 'resolved' | 'expired' | 'archived';
  date: string;
  time: string;
  evidencePhoto?: string; // Data URL foto bukti asli (hanya untuk Satpam)
  reporterName: string;
  reporterNpm: string;
  reporterContact: string;
  reporterToken?: string; // Disertakan saat validasi kepemilikan, disanitasi saat broadcast publik
  x: number;
  y: number;
}

// Bentuk Claim (pengajuan klaim kepemilikan via ZKP)
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

// Bentuk ArchiveRequest (Inbox request aktivasi arsip barang lawas dari mahasiswa untuk Satpam)
export interface ArchiveRequest {
  id: string;
  senderName: string;
  senderNpm: string;
  senderContact: string;     // Kontak/WA pengirim
  itemTitle: string;         // Nama barang yang dicari
  itemCategory?: string;     // Kategori barang
  dateFrom?: string;         // Rentang tanggal perkiraan hilang (mulai)
  dateTo?: string;           // Rentang tanggal perkiraan hilang (akhir)
  locationHint?: string;     // Petunjuk lokasi hilang
  description: string;       // Deskripsi barang
  status: 'pending' | 'approved' | 'rejected';
  matchedItemId?: string;    // ID barang expired yang dipublikasikan ulang
  rejectMessage?: string;    // Alasan penolakan dari Satpam
  createdAt: string;
}
