# LOST & FOUND KAMPUS AI (ZKP Edition)

## 1. Project Summary

Lost & Found Kampus AI adalah platform pelaporan barang hilang dan temuan di lingkungan kampus yang menggunakan antarmuka papan digital interaktif bertema visual pixel-art.

Kini, sistem telah berevolusi menjadi platform yang sangat aman dengan teknologi **Zero-Knowledge Proof (ZKP)** berpadu dengan **AI (NLP)**. Dengan ZKP, pengguna dapat membuktikan bahwa mereka adalah pemilik sah suatu barang **tanpa pernah** membocorkan ciri rahasia barang tersebut ke server, mencegah penyalahgunaan data oleh admin maupun peretas.

---

## 2. Architecture & Technology (Tri-Layer Lock)

Aplikasi dibangun dengan arsitektur modular (Backend & Frontend) yang mengimplementasikan sistem **Tri-Layer Lock**:
1. **Layer 1 (The Vault - ZKP):** Menggunakan `circom` dan `snarkjs` dengan fungsi *Hash Poseidon*. Bukti matematis diproses langsung di *browser* pengklaim.
2. **Layer 2 (The Translator - NLP AI):** Menggunakan API Groq (`qwen/qwen3.8-27b`) sebagai *proxy* di backend untuk menstandardisasi input teks pengguna menjadi 3 keyword baku.
3. **Layer 3 (The Judge - Gale-Shapley):** Algoritma penjadwalan/timer (*Dispute Window*) 1 menit untuk memutuskan siapa pemenang sah dari sebuah barang berdasarkan waktu klaim pertama yang valid secara ZKP.

### Teknologi Backend (`/server`)
- **Runtime**: Node.js dengan TypeScript.
- **Web Framework**: Hono (`hono`).
- **Komunikasi Realtime**: Socket.IO (`socket.io`).
- **Validasi Data**: Zod (`zod`).
- **ZKP Library**: `snarkjs` (Verifikasi Proof) dan `circomlibjs` (Hashing Poseidon).

### Teknologi Frontend (`/web`)
- **Framework**: SvelteKit 2 (Svelte 5).
- **Styling**: Tailwind CSS v4.
- **ZKP Prover**: `snarkjs` (dijalankan di sisi klien menggunakan file statis `.wasm` dan `.zkey`).

---

## 3. Directory Guide (Dokumentasi ZKP Lengkap)

Bagi developer yang ingin memahami alur kerja ZKP di proyek ini, silakan baca dokumentasi berikut secara berurutan di dalam folder `docs/`:

1. **`PRD.md`** - Dokumen rancangan produk dan aturan bisnis secara keseluruhan.
2. **`analisis_tri_layer_lock.md`** - Teori arsitektur penggabungan ZKP, AI, dan Gale-Shapley.
3. **`zkp_setup_guide.md`** - Cara menginstal Rust, Circom, dan melakukan *Trusted Setup*.
4. **`zkp_build_log.md`** - Log/catatan historis proses *compile* sirkuit ZKP.
5. **`backend_zkp_summary.md`** - Penjelasan detail modifikasi kode di sisi *backend* Node.js.
6. **`frontend_zkp_guide.md`** - Panduan wajib bagi *frontend developer* untuk menggunakan `snarkjs` di sisi UI.

---

## 4. System Flow

```
[User Login & Lobby]
       |
       v
[Papan Interaktif (Board)]
- Realtime sync daftar barang via Socket.IO
       |
       +------------------------------------+
       |                                    |
       v                                    v
[Fase Pelaporan]                   [Fase Klaim (ZKP)]
1. Penemu input ciri rahasia       1. Pengklaim ketik ciri barang
2. AI Proxy ekstrak jadi keyword   2. AI Proxy standarisasi jadi keyword
3. Backend Hash dengan Poseidon    3. Frontend (Browser) convert jadi Hash
4. Cuma Hash yang disimpan di DB!  4. Frontend racik ZKP Proof (.wasm & .zkey)
   (Teks rahasia dibuang)          5. ZKP Proof dikirim ke Backend
                                            |
                                            v
                                  [Backend Verifikasi]
                                  - Cek Hash & snarkjs.verify()
                                  - Jika Valid -> Masuk Dispute Window (1 Menit)
                                            |
                                            v
                                  [Resolusi Gale-Shapley]
                                  - Pengklaim sah pertama (First-Come) menang!
                                  - Muncul tombol Chat WhatsApp
```

---

## 5. How to Run

### System Requirements
- Node.js version 18 or higher.
- Internet connection for Groq API.

### Menjalankan Backend (Server)
1. Buka terminal, masuk ke folder `server` (`cd server`).
2. Buat file `.env` dan masukkan API key Groq:
   ```env
   PORT=3001
   GROQ_API_KEY=gsk_your_groq_api_key_here
   ```
3. Install dependensi: `npm install`
4. Jalankan: `npm run dev`

### Menjalankan Frontend (Web)
*(Pastikan file `ownership_proof.wasm` dan `circuit_final.zkey` sudah di-copy dari `server/zk/build/` ke folder `web/public/`)*
1. Buka terminal baru, masuk ke folder `web` (`cd web`).
2. Install dependensi: `npm install`
3. Jalankan: `npm run dev`
4. Buka di browser: `http://localhost:5173/`
