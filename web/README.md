# Frontend Web - Lost & Found Kampus AI

Folder ini berisi seluruh source code antarmuka web (frontend) untuk aplikasi Lost & Found Kampus AI. Frontend dibangun menggunakan meta-framework SvelteKit dengan Svelte 5 (Runes) dan Tailwind CSS v4, mengusung desain visual retro pixel-art ala game sandbox blocky/Minecraft.

---

## Arsitektur & Peran Utama

Frontend mengimplementasikan arsitektur berbasis komponen reaktif dengan manajemen state terpusat:

1. **Routing & Tampilan Utama (`src/routes/`)**:
   - `+layout.svelte`: Shell layout global yang memuat font pixel (Press Start 2P, VT323) dan merender `ToastContainer` untuk notifikasi realtime.
   - `+page.svelte`: Komponen halaman tunggal yang mengatur transisi adegan (scene) antara `Lobby` dan `Board` berdasarkan status login pengguna.

2. **Komponen Antarmuka (`src/lib/components/`)**:
   - `Lobby.svelte`: Layar pemilihan gender karakter dan pengisian data identitas (Nama, NPM, Kontak WA).
   - `Board.svelte`: Papan digital utama tempat kartu barang ditampilkan dengan kontrol filter kategori dan tombol aksi.
   - `ItemCard.svelte`: Komponen kartu barang interaktif yang mendukung drag-and-drop, badge status, dan tombol aksi klaim/tinjau.
   - `ReportModal.svelte`: Dialog form pelaporan barang hilang/ketemu dengan tombol batal dan simpan.
   - `ClaimModal.svelte`: Dialog form pengajuan klaim barang yang terhubung langsung dengan proses verifikasi AI.
   - `ClaimsReviewModal.svelte`: Dialog peninjauan riwayat seluruh klaim yang masuk untuk barang milik pelapor.
   - `SatpamChat.svelte`: Avatar Satpam AI di pojok kanan bawah papan dengan jendela obrolan interaktif.
   - `Avatar.svelte`: Komponen avatar pixel visual untuk karakter laki-laki dan perempuan.
   - `ToastContainer.svelte`: Penampil notifikasi melayang saat user baru bergabung atau terjadi pembaruan data.

3. **Manajemen State (`src/lib/stores/`)**:
   - `items.ts`: Menyimpan daftar barang yang tersinkronisasi langsung dari server socket.
   - `player.ts`: Menyimpan data profil pemain yang sedang login pada sesi browser.
   - `ui.ts`: Mengelola status adegan aktif, dialog modal yang terbuka, filter kategori terpilih, status koneksi socket, dan jumlah pengguna online.

4. **Interaksi & Aksi (`src/lib/actions/`)**:
   - `draggable.ts`: Svelte action kustom yang menangani interaksi drag-and-drop kartu barang pada koordinat papan dan menyiarkan hasil perpindahan ke server.

5. **Komunikasi Realtime (`src/lib/socket.ts`)**:
   - Singleton client Socket.IO yang menangani koneksi ke backend (`http://localhost:3001`), rekoneksi otomatis, dan pemetaan event socket ke store Svelte.

6. **Sistem Desain & Tema (`src/app.css`)**:
   - Konfigurasi `@theme` Tailwind CSS v4 dengan palet warna khusus (`mc-wood`, `mc-dark-wood`, `mc-dirt`, `mc-grass`).
   - Class styling khas GUI pixel: `.mc-block`, `.mc-modal-box`, `.mc-input`, `.mc-form-label`, dan `.mc-btn`.

---

## Struktur Folder

```
web/
├── src/
│   ├── lib/
│   │   ├── actions/
│   │   │   └── draggable.ts          # Svelte action drag and drop kartu
│   │   ├── components/
│   │   │   ├── Avatar.svelte         # Render avatar pixel karakter
│   │   │   ├── Board.svelte          # Wadah papan interaktif
│   │   │   ├── ClaimModal.svelte     # Form klaim barang
│   │   │   ├── ClaimsReviewModal.svelte # Riwayat klaim barang
│   │   │   ├── ItemCard.svelte       # Kartu barang individual
│   │   │   ├── Lobby.svelte          # Registrasi dan pilih karakter
│   │   │   ├── ReportModal.svelte    # Form lapor barang baru
│   │   │   ├── SatpamChat.svelte     # Chatbot Satpam AI
│   │   │   └── ToastContainer.svelte # Notifikasi toast realtime
│   │   ├── stores/
│   │   │   ├── items.ts              # Store data daftar barang
│   │   │   ├── player.ts             # Store profil pengguna saat ini
│   │   │   └── ui.ts                 # Store state UI global
│   │   └── socket.ts                 # Klien Socket.IO singleton
│   ├── routes/
│   │   ├── +layout.svelte            # Layout induk aplikasi
│   │   └── +page.svelte              # Entry page pengatur adegan
│   ├── app.css                       # Desain tema retro Minecraft & Tailwind v4
│   ├── app.html                      # Template HTML dasar
│   └── index.css                     # Directives Tailwind CSS
├── static/                           # Aset statis publik
├── package.json                      # Dependensi dan script frontend
├── svelte.config.js                  # Konfigurasi compiler SvelteKit
├── tsconfig.json                     # Konfigurasi compiler TypeScript
└── vite.config.ts                    # Konfigurasi bundler Vite (port 5173)
```

---

## Perintah yang Tersedia

Jalankan perintah berikut di dalam folder `web`:

* `npm run dev`: Menjalankan web development server di `http://localhost:5173/`.
* `npm run build`: Membangun bundle produksi aplikasi menggunakan adapter Node.
* `npm run preview`: Menjalankan preview lokal dari bundle produksi yang telah di-build.
* `npm run check`: Menjalankan verifikasi tipe dan diagnosa sintaks melalui `svelte-check`.
