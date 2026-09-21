# Ringkasan Eksekusi Integrasi ZKP di Backend

Dokumen ini adalah rekapitulasi detail dari seluruh arsitektur, modifikasi, dan penambahan file yang telah kita lakukan untuk menyuntikkan teknologi **Zero-Knowledge Proof (ZKP)** berpadu dengan **AI (NLP)** ke dalam sistem backend *Lost & Found*.

---

## 1. Perubahan Struktur Database & Skema Data

Untuk memastikan keamanan ZKP, kita membuang penyimpanan teks mentah rahasia di sisi server. 

### A. `server/src/data/store.ts` (Tipe Data Inti)
- **Dihapus:** Field `secretDetail` (yang tadinya menyimpan teks mentah ciri rahasia dari pelapor).
- **Ditambah:** Field `commitments: string[]` (Menyimpan 3 *Hash Poseidon* dari ciri rahasia).
- **Diubah:** Field `resolved: boolean` diubah menjadi `status: 'open' | 'disputed' | 'resolved'` untuk mendukung sistem *Gale-Shapley*.

### B. `server/src/schemas/item.schema.ts` & `claim.schema.ts` (Zod Validation)
- `itemAddSchema`: Tetap menerima `secretDetail` dari form frontend, namun menambah *default* field `commitments`.
- `claimSubmitSchema`: Menghapus input `claimText`, lalu menggantinya dengan:
  - `proof`: Obyek JSON (Bukti matematis ZKP).
  - `publicSignals`: Array berisi 3 Hash Poseidon.
- **Dihapus:** `verifyClaimApiSchema` dihapus karena proses verifikasi klaim kini sepenuhnya bergantung pada ZKP, bukan menembak AI secara langsung saat klaim.

---

## 2. Layer 2: Mesin NLP & Ekstraksi Keyword

Sistem ZKP membutuhkan input *string* yang identik agar *Hash*-nya sama. Kita menggunakan AI untuk melakukan standardisasi kalimat pelapor dan pengklaim.

### A. `server/src/zk/nlpPreprocess.ts`
- **Fungsi:** `cleanText(text: string)`
- **Cara Kerja:** Merupakan *middleware* string. Mengubah teks menjadi *lowercase*, membuang tanda baca, dan menghapus *stopword* bahasa Indonesia (contoh: "yang", "dan", "di", "itu"). Ini mencegah AI kebingungan.

### B. `server/src/zk/keywordExtractor.ts`
- **Fungsi:** `extractKeywordsWithAI(text: string)`
- **Cara Kerja:** Menembak API Groq menggunakan model `qwen/qwen3.8-27b` dengan `temperature: 0`. AI dipaksa melalui *prompt* yang sangat ketat untuk mengeluarkan **tepat 3 kata baku** yang menggambarkan ciri fisik unik barang.

### C. `server/src/routes/api.ts`
- **Fungsi Baru:** `POST /api/extract`
- **Cara Kerja:** Berfungsi sebagai *Proxy AI* untuk frontend. Saat pengklaim mengetik ciri barang, frontend akan menembak API ini. API ini akan memanggil `extractKeywordsWithAI` dan mengembalikan 3 keyword baku. Ini mencegah tereksposnya API Key Groq ke browser pengguna.

---

## 3. Layer 1: Hashing & Verifikasi ZKP

Ini adalah otak utama dimana ZKP bekerja mengamankan kerahasiaan.

### A. `server/src/handlers/report.handler.ts` (Fase Pelaporan)
- **Cara Kerja Baru:** 
  1. Saat pelapor men-submit barang lewat *socket*, backend menerima field `secretDetail`.
  2. Teks tersebut dikirim ke `extractKeywordsWithAI` untuk mendapatkan 3 keyword baku.
  3. Menggunakan library `circomlibjs`, ketiga keyword di-hash menggunakan fungsi **Poseidon**.
  4. Hanya Hash tersebut yang dimasukkan ke `commitments`, lalu `secretDetail` **dibuang** (tidak disimpan di `items.json`).

### B. `server/src/handlers/claim.handler.ts` (Fase Klaim)
- **Cara Kerja Baru:**
  1. Frontend mengirim `proof` dan `publicSignals` via *socket*.
  2. Backend mengecek: Apakah `publicSignals` dari pengklaim sama persis dengan `commitments` di database? Jika beda, tolak (hash mismatch).
  3. Jika sama, backend menggunakan kunci sakti `verification_key.json` dan memanggil `snarkjs.groth16.verify()`.
  4. Jika valid, klaim dicatat dan status barang berubah dari `open` menjadi `disputed`.

---

## 4. Layer 3: Dispute Resolution (Gale-Shapley)

Karena ZKP tidak mengikat identitas (satu barang bisa diklaim banyak orang dengan ciri yang sama), kita menggunakan sistem jendela waktu (*Dispute Window*).

### A. `server/src/zk/disputeTimer.ts`
- **Fungsi:** `startDisputeWindow(io, itemId)`
- **Cara Kerja:** Begitu ada klaim pertama yang valid secara ZKP, timer **1 Menit** mulai berjalan. Selama 1 menit ini, orang lain boleh ikut mengirimkan *Proof* ZKP jika mereka merasa itu barangnya. Setelah 1 menit habis, fungsi ini otomatis mengeksekusi `resolveDisputes()`.

### B. `server/src/zk/resolveDisputes.ts`
- **Fungsi:** `resolveDisputes(itemId)`
- **Cara Kerja:** Mengimplementasikan algoritma Gale-Shapley versi sederhana (First-Come First-Served untuk 1 item). Mengurutkan semua klaim yang masuk berdasarkan waktu (*timestamp*). Pengklaim valid pertama otomatis dimenangkan (`status = approved`), sedangkan yang lainnya ditolak (`status = rejected`). 
- Status barang kemudian diubah secara permanen menjadi `resolved`.

---

## 5. Security & Cleanup (Keamanan Tambahan)

- **`server/src/data/sanitize.ts`**: Fungsi sanitasi disederhanakan karena tidak ada lagi field `secretDetail` yang bisa bocor secara tidak sengaja ke klien.
- **`.gitignore` (Server)**: Diperbarui untuk mengabaikan file raksasa `*.ptau` dan intermediate `.zkey` peninggalan *Trusted Setup*. Hanya menyisakan `circuit_final.zkey` dan `ownership_proof.wasm` agar aman di-push ke Github.
- **Reset Database**: `server/data/items.json` telah dikosongkan agar kompatibel murni dengan arsitektur Hash Poseidon ZKP yang baru.
