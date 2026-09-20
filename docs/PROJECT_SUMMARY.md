# LOST & FOUND KAMPUS AI

## 1. Project Summary

Lost & Found Kampus AI adalah platform pelaporan barang hilang dan temuan di lingkungan kampus yang menggunakan antarmuka papan digital interaktif bertema visual pixel-art.

Sistem memanfaatkan kecerdasan buatan (Groq AI) untuk memvalidasi klaim kepemilikan secara otomatis serta merekomendasikan ikon barang, dipadukan dengan WebSocket (Socket.IO) untuk sinkronisasi realtime antarpengguna tanpa perlu memuat ulang halaman.

---

## 2. Architecture & Technology

Aplikasi dibangun dengan arsitektur modular yang memisahkan backend dan frontend:

### Backend (`/server`)

- **Runtime & Bahasa**: Node.js dengan TypeScript.
- **Web Framework**: Hono (`hono`, `@hono/node-server`) - Framework HTTP modern, ringan, dan cepat untuk menangani routing REST API dan health check.
- **Komunikasi Realtime**: Socket.IO (`socket.io`) - Mengatur komunikasi dua arah berbasis event untuk broadcast barang, pergerakan kartu, status online pengguna, dan notifikasi klaim.
- **Validasi Data**: Zod (`zod`) - Memvalidasi schema payload pada setiap event socket (tambah barang, klaim, geser kartu, profil user, pesan chat) dan request HTTP secara ketat.
- **HTTP Client**: Axios (`axios`) - Melakukan request HTTP dari backend ke Groq Cloud API untuk evaluasi klaim dan rekomendasi ikon.
- **Keamanan Data**: Sanitasi otomatis (`sanitizeItem`) memastikan data sensitif (`secretDetail`) hanya tersimpan di server dan tidak pernah dibocorkan ke payload socket publik.
- **Penyimpanan**: `server/data/items.json` - Penyimpanan persisten lokal berbasis file JSON tanpa ketergantungan database eksternal.

### Frontend (`/web`)

- **Framework**: SvelteKit 2 (Svelte 5 dengan Svelte Runes: `$state`, `$derived`, `$props`).
- **Styling**: Tailwind CSS v4 dengan konfigurasi custom design tokens retro/Minecraft pada `@theme` di `app.css`.
- **Klien Realtime**: Socket.IO Client (`socket.io-client`) - Mengelola koneksi socket tunggal (singleton) dengan rekoneksi otomatis dan sinkronisasi store.
- **State Management**: Svelte Stores (`writable`, `derived`) untuk reaktivitas global (`items`, `currentPlayer`, `uiState`).
- **Interaktivitas**: Svelte Actions kustom (`draggable.ts`) untuk interaksi drag-and-drop kartu pada papan digital.

---

## 3. Library List and Functions

| Modul  | Library                   | Fungsi Utama                                                       |
| :----- | :------------------------ | :----------------------------------------------------------------- |
| Server | `hono`                    | Framework server HTTP untuk melayani endpoint REST dan middleware. |
| Server | `@hono/node-server`       | Adapter server HTTP Node.js untuk Hono.                            |
| Server | `socket.io`               | Server WebSocket untuk komunikasi realtime multi-klien.            |
| Server | `zod`                     | Skema validasi data request HTTP dan event socket secara runtime.  |
| Server | `axios`                   | HTTP client pemanggil API Groq AI untuk evaluasi verifikasi.       |
| Server | `dotenv`                  | Manajemen konfigurasi environment variable (.env).                 |
| Server | `tsx`                     | Eksekutor TypeScript runtime untuk mode development dan watch.     |
| Web    | `@sveltejs/kit`           | Meta-framework frontend modern berbasis komponen reaktif.          |
| Web    | `svelte` (v5)             | Library UI reaktif berkinerja tinggi menggunakan paradigma Runes.  |
| Web    | `@tailwindcss/vite`       | Compiler Tailwind CSS v4 berbasis Vite.                            |
| Web    | `socket.io-client`        | Klien WebSocket untuk komunikasi dua arah dengan server.           |
| Web    | `clsx` & `tailwind-merge` | Utility manipulasi dan penggabungan class CSS dinamis.             |

---

## 4. System Flow

```
[User Login]
       |
       v
[Lobby: Registrasi User]
- Pilih Karakter (Laki-laki / Perempuan)
- Input Nama, NPM, dan Kontak WA
       |
       v
[Papan Interaktif (Board)]
- Realtime sync daftar barang via Socket.IO
- Drag and drop kartu barang
- Filter kategori (Semua / Hilang / Ketemu)
       |
       +------------------------------------+
       |                                    |
       v                                    v
[Lapor Barang Baru]                [Klaim Barang]
- Isi identitas barang             - Pengklaim input deskripsi ciri
- Input Ciri Khas Rahasia          - Backend kirim ke Groq AI
- AI pilihkan ikon kategori        - AI evaluasi skor kecocokan
- Broadcast live ke seluruh user            |
                                            v
                              [Hasil Evaluasi AI]
                              - Approved (>= 80%): Status selesai, buka link WA pelapor
                              - Pending (40% - 79%): Zero-hint, beri 1 kesempatan lagi
                              - Rejected (< 40%): Klaim ditolak permanen
```

### Mekanisme Verifikasi AI:

1. **Zero-Hint Security**: AI dilarang membocorkan detail ciri khusus kepada pengklaim saat status evaluasi ambigu.
2. **Double-Attempt Strict Threshold**: Jika pengklaim masuk kategori `pending`, ambang batas kelulusan pada percobaan kedua tetap >= 80%.
3. **Penyelesaian Transaksi**: Ketika klaim disetujui, tombol WhatsApp otomatis aktif dengan nomor kontak pelapor yang terenkapsulasi secara aman.

---

## 5. How to Run

### System Requirements

- Node.js version 18 or higher.
- Internet connection for Groq AI API calls.

### Langkah Menjalankan Server (Backend)

1. Buka terminal, masuk ke folder `server`:
   ```bash
   cd server
   ```
2. Salin file `.env.example` atau buat file `.env` dan masukkan API key Groq:
   ```env
   PORT=3001
   GROQ_API_KEY=gsk_your_groq_api_key_here
   ```
3. Install dependensi (jika belum):
   ```bash
   npm install
   ```
4. Jalankan mode development:
   ```bash
   npm run dev
   ```
   Server akan berjalan di port `3001`.

### Langkah Menjalankan Frontend (Web)

1. Buka terminal baru, masuk ke folder `web`:
   ```bash
   cd web
   ```
2. Install dependensi (jika belum):
   ```bash
   npm install
   ```
3. Jalankan server development:
   ```bash
   npm run dev
   ```
   Aplikasi frontend akan dapat diakses melalui browser di: `http://localhost:5173/`.

---

## 6. How to Use

1. **Memasuki Aplikasi**:
   - Buka browser pada `http://localhost:5173/`.
   - Di layar awal (Lobby), klik salah satu karakter (Laki-laki atau Perempuan).
   - Isi form data diri: Nama Lengkap, NPM, dan Nomor WhatsApp.
   - Klik tombol **Masuk ke Board**.

2. **Melaporkan Barang**:
   - Klik tombol **+ Lapor (AI)** di pojok kiri atas papan.
   - Pilih status laporan: **Barang Hilang (Lost)** atau **Nemu Barang (Found)**.
   - Isi nama barang dan lokasi barang hilang/ditemukan.
   - Isi **Ciri Khas Rahasia** (bagian kunci yang tidak diketahui orang lain, misal goresan tertentu, nomor seri, isi khusus).
   - Klik **Simpan**. AI akan memilihkan ikon yang relevan dan kartu barang akan langsung muncul di papan digital seluruh pengguna online.

3. **Mengajukan Klaim Barang**:
   - Cari kartu barang yang ingin diklaim, lalu klik tombol **Klaim Barang Ini**.
   - Ceritakan sedetail mungkin ciri-ciri barang yang kamu ketahui tanpa menebak-nebak.
   - Klik **Ajukan Klaim**. Satpam AI akan memproses verifikasi.
   - Jika klaim disetujui, tombol **Chat via WhatsApp** akan muncul untuk menghubungi pelapor secara langsung.

4. **Interaksi Papan & Satpam AI**:
   - Geser kartu ke posisi mana pun di papan dengan mouse (drag-and-drop). Posisi akan tersinkronisasi realtime ke user lain.
   - Klik tombol **Rapihkan** untuk menata ulang susunan kartu secara otomatis ke dalam baris dan kolom yang rapi.
   - Klik avatar Satpam di kanan bawah papan untuk membuka jendela chat interaktif dengan Satpam AI terkait bantuan barang hilang.
