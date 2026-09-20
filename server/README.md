# Backend Server - Lost & Found Kampus AI

Folder ini berisi seluruh source code backend untuk aplikasi Lost & Found Kampus AI. Backend bertindak sebagai pusat komunikasi realtime, validasi skema data, pengelola penyimpanan lokal, serta jembatan integrasi ke layanan kecerdasan buatan Groq Cloud API.

---

## Arsitektur & Peran Utama

Backend mengimplementasikan arsitektur modular berbasis domain handler dengan pemisahan tanggung jawab yang jelas:

1. **Server HTTP (Hono)**:
   Menyediakan endpoint REST API (seperti `/health` dan `/api/verify-claim`) dengan performa tinggi menggunakan adapter `@hono/node-server`.

2. **Server Realtime (Socket.IO)**:
   Mengelola koneksi dua arah dengan browser klien untuk menyiarkan penambahan barang, pemindahan kartu pada papan, status pengguna online, dan pembaruan hasil klaim.

3. **Domain Handlers (`src/handlers/`)**:
   - `user.handler.ts`: Mengelola sesi pengguna, presensi, hitungan user online, serta event join dan leave.
   - `report.handler.ts`: Menangani pembuatan laporan barang hilang/ketemu dan pemilihan ikon kategori via AI.
   - `claim.handler.ts`: Memproses pengajuan klaim barang, evaluasi ambang batas kelulusan AI, dan status verifikasi.
   - `board.handler.ts`: Mengelola sinkronisasi koordinat drag-and-drop kartu barang dan perapihan posisi otomatis.
   - `chat.handler.ts`: Menangani percakapan interaktif pengguna dengan karakter Satpam AI.

4. **Validasi Skema (`src/schemas/`)**:
   Seluruh input data yang masuk melalui socket maupun HTTP diverifikasi secara ketat menggunakan Zod sebelum diproses oleh handler.

5. **AI Evaluation (`src/ai/verifyClaim.ts`)**:
   Mengeksekusi analisis teks klaim terhadap Ciri Khas Rahasia pelapor menggunakan model bahasa besar Groq AI dengan aturan zero-hint.

6. **Penyimpanan Data & Sanitasi (`src/data/`)**:
   - `store.ts`: Membaca dan menulis data barang ke file lokal `data/items.json`.
   - `sanitize.ts`: Menghapus data sensitif (`secretDetail`) sebelum data dikirim ke klien publik untuk menjaga kerahasiaan verifikasi.

---

## Struktur Folder

```
server/
├── data/
│   └── items.json            # File database lokal untuk data barang
├── src/
│   ├── ai/
│   │   └── verifyClaim.ts    # Integrasi API Groq untuk verifikasi klaim
│   ├── data/
│   │   ├── sanitize.ts       # Utilitas pembersihan data rahasia
│   │   └── store.ts          # Operasi baca-tulis file JSON
│   ├── handlers/
│   │   ├── board.handler.ts  # Logika pergerakan dan penataan papan
│   │   ├── chat.handler.ts   # Logika chat Satpam AI
│   │   ├── claim.handler.ts  # Logika pemrosesan klaim
│   │   ├── report.handler.ts # Logika pelaporan barang
│   │   └── user.handler.ts   # Logika manajemen user dan presensi
│   ├── routes/
│   │   └── api.ts            # Endpoint REST API Hono
│   ├── schemas/
│   │   ├── chat.schema.ts    # Skema Zod untuk chat
│   │   ├── claim.schema.ts   # Skema Zod untuk klaim
│   │   ├── item.schema.ts    # Skema Zod untuk barang
│   │   └── profile.schema.ts # Skema Zod untuk profil pengguna
│   ├── socket/
│   │   └── handlers.ts       # Wiring event Socket.IO ke domain handlers
│   └── index.ts              # Entry point utama aplikasi server
├── .env                      # Konfigurasi environment (PORT, GROQ_API_KEY)
├── package.json              # Dependensi dan script server
└── tsconfig.json             # Konfigurasi compiler TypeScript
```

---

## Konfigurasi Lingkungan (.env)

Buat file `.env` di dalam folder ini dengan variabel berikut:

```env
PORT=3001
GROQ_API_KEY=your_groq_api_key_here
```

---

## Perintah yang Tersedia

Jalankan perintah berikut di dalam folder `server`:

* `npm run dev`: Menjalankan server dalam mode development dengan auto-reload menggunakan `tsx watch`.
* `npm run start`: Menjalankan server langsung menggunakan runtime `tsx`.
* `npm run build`: Menjalankan pengecekan tipe TypeScript (`tsc --noEmit`).
* `npm run typecheck`: Menjalankan verifikasi tipe data TypeScript tanpa menghasilkan output file.
