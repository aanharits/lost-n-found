# 🖥️ Server Backend - Lost & Found Kampus AI

Backend untuk **Lost & Found Kampus AI** berfungsi sebagai pusat orkestrasi realtime, verifikasi matematis Zero-Knowledge Proofs (ZKP), evaluasi Gale-Shapley Stable Matching, penghubung AI Groq Cloud, serta manajemen persistensi data menggunakan Drizzle ORM.

---

## 🏛️ Arsitektur & Layanan Backend

### 1. Web Framework & Realtime Server
- **Hono (`hono`)**: Framework HTTP performa tinggi dengan adapter Node.js (`@hono/node-server`) untuk REST API (`/health`, `/api/verify-claim`).
- **Socket.IO (`socket.io`)**: Menangani komunikasi dua arah berkecepatan tinggi: sinkronisasi koordinat drag-and-drop kartu, siaran laporan baru, timer dispute 1 menit, dan notifikasi inbox.

### 2. Kriptografi & Zero-Knowledge Proofs (`src/services/zkp.service.ts`)
- **Poseidon Hashing (`circomlibjs`)**: Mengubah ciri rahasia pelapor menjadi hash komitmen kriptografis `[h1, h2, h3]` yang aman.
- **Groth16 Verification (`snarkjs`)**: Memverifikasi bukti matematis (proof) yang dikirim oleh browser pengklaim terhadap komitmen hash barang tanpa membocorkan ciri rahasia.

### 3. Gale-Shapley Matching Engine (`src/services/galeShapley.service.ts`)
- **Dispute Window 1 Menit:** Ketika klaim valid pertama masuk, barang diberi status `disputed` dan timer 60 detik diaktifkan.
- **Stable Matching:** Mengevaluasi seluruh klaim valid dalam antrean 1 menit berdasarkan skor ZKP dan prioritas waktu kedatangan untuk menentukan SATU pemilik sah yang adil (mencegah *race condition* atau kecurangan bot).
- **Auto-Resolve:** Setelah 60 detik, klaim pemenang diubah ke `approved`, item menjadi `resolved`, dan nomor kontak WhatsApp dibuka untuk serah terima fisik.

### 4. Integrasi AI Groq Cloud (`src/services/groq.service.ts`)
- Menstandarisasi teks deskripsi bebas dari pengguna menjadi 3 keyword baku menggunakan model bahasa berkecepatan tinggi (Qwen 2.5 / Llama 3) sebelum proses hashing Poseidon.
- Menjalankan persona asisten chatbot interaktif Satpam Kampus.

### 5. Database & Drizzle ORM (`src/db/`)
- **Drizzle ORM (`drizzle-orm`)**: ORM TypeScript type-safe dengan skema PostgreSQL (`schema.ts`).
- **Neon Serverless PostgreSQL**: Database cloud serverless untuk penyimpanan persisten.
- **Dual-Mode Store (`src/data/store.ts`)**: Dilengkapi fallback otomatis ke in-memory store jika database cloud tidak terkonfigurasi atau sedang offline, menjamin keandalan saat demo.

---

## 📂 Struktur Direktori

```
server/
├── data/                     # File data lokal fallback
├── drizzle/                  # Migrasi SQL Drizzle
├── src/
│   ├── db/
│   │   ├── index.ts          # Inisialisasi koneksi Neon DB & Drizzle
│   │   └── schema.ts         # Definisi tabel (items, claims, archiveRequests)
│   ├── handlers/
│   │   ├── board.handler.ts  # Sinkronisasi koordinat kartu & rapihkan papan
│   │   ├── chat.handler.ts   # Chat interaktif Satpam AI
│   │   ├── claim.handler.ts  # Alur klaim ZKP & trigger dispute
│   │   ├── report.handler.ts # Laporan barang baru & alokasi foto ke arsip
│   │   └── user.handler.ts   # Manajemen presensi & user online
│   ├── services/
│   │   ├── archiveRequest.service.ts # Manajemen request aktivasi arsip
│   │   ├── galeShapley.service.ts    # Engine antrean dispute & matching 1 menit
│   │   ├── groq.service.ts           # Standardisasi keyword NLP & chat AI
│   │   └── zkp.service.ts            # Hashing Poseidon & verifikasi proof SnarkJS
│   ├── routes/
│   │   └── api.ts            # REST API endpoints Hono
│   ├── schemas/              # Validasi skema input dengan Zod
│   ├── socket/
│   │   └── handlers.ts       # Registrasi event Socket.IO
│   └── index.ts              # Entry point utama server
├── zk/                       # File sirkuit Circom & artefak build (.wasm, .zkey)
├── drizzle.config.ts         # Konfigurasi Drizzle Kit
├── package.json
└── tsconfig.json
```

---

## ⚙️ Variabel Lingkungan (.env)

Buat file `.env` di folder `server/`:

```env
PORT=3001
GROQ_API_KEY=gsk_your_groq_api_key_here
DATABASE_URL=postgresql://user:password@your-neon-host/dbname?sslmode=require
```
*(Catatan: Jika `DATABASE_URL` tidak diisi, backend otomatis beralih ke mode resilient in-memory store).*

---

## 🛠️ Perintah Tersedia

Jalankan perintah berikut di dalam folder `server/`:

* `npm run dev`: Menjalankan server dalam mode development dengan auto-reload (`tsx watch`).
* `npm run build`: Kompilasi dan pengecekan tipe TypeScript (`tsc --noEmit`).
* `npm run start`: Menjalankan server langsung dengan runtime `tsx`.
* `npm run db:push`: Menjalankan sinkronisasi skema Drizzle ke database Neon PostgreSQL.
* `npm run db:studio`: Membuka dashboard visual Drizzle Studio di browser.
