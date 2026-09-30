Halo! Saya sedang mengembangkan aplikasi web "Lost & Found" bertema retro pixel-art 8-bit (SvelteKit + Vite di frontend, Node/TypeScript + Drizzle ORM SQLite di backend).
Saat ini kita berada di branch: `feat/satpam-board-photo-archive`.

Tolong bantu implementasikan fitur baru: **Foto Bukti Fisik, Human-Readable Item ID, Role Akses Satpam di Lobby, dan Board Arsip Satpam (Retro Folder Archive)** secara bertahap (per-phase).

Berikut spesifikasi lengkap kebutuhannya:

### 1. Form Report Barang & Short ID

- Tambahkan field bukti foto di form report barang hilang/temuan.
- User bisa memilih antara:
  a. Upload file gambar dari perangkat.
  b. Langsung buka kamera (HTML5 WebCam capture) dengan preview sebelum submit.
- Generate ID barang yang ramah pengguna berukuran 4-5 karakter (misal format `#B-82A` atau `A7K9`) yang mudah diingat dan tercantum di ItemCard.
- **Penting untuk Privasi Publik**: Di sisi Main Board (dashboard umum), foto asli TIDAK ditampilkan ke publik. Main board tetap menggunakan aset ilustrasi 8-bit sesuai hasil klasifikasi tag yang sudah ada.

### 2. Autentikasi & Lobby Akses Satpam

- Pada komponen Lobby (`Lobby.svelte`):
  - Tambahkan opsi pemilihan Role: **Mahasiswa / Umum** dan **Petugas Satpam**.
  - Untuk Satpam: Sediakan pilihan avatar khusus Satpam retro 8-bit.
  - Form data Satpam tidak memerlukan NIM/Prodi, melainkan 1 input field password/key akses (default key: `satpamganteng`).
  - Jika key valid, user diarahkan masuk sebagai Satpam.

### 3. Board Satpam (Arsip Berkas 8-Bit)

- Layout, header, dan struktur grid tetap identik dan presisi dengan board utama agar nuansa game retro tidak berubah.
- Yang membedakan adalah visual kartu barang di grid:
  - **Layer 1 (Card Grid)**: Berbentuk kartu arsip/folder map berkas retro 8-bit bertuliskan tanggal/kategori laporan.
  - **Layer 2 (Detail Modal)**: Ketika folder diklik, muncul animasi membuka map dokumen arsip (seperti membuka berkas rahasia/berkas kepolisian). Di dalamnya tampil list dokumen: Foto bukti asli barang yang diambil/diupload pelapor, ID singkat barang (4-5 karakter), nama barang, waktu penemuan, dan detail pelapor.

### 4. Standar Implementasi & Eksekusi

- Jalankan eksekusi secara modular dan terstruktur per-phase:
  - Phase 1: Update schema database & backend endpoint (penyimpanan bukti foto & short ID).
  - Phase 2: Form report (upload + live camera capture & ID badge di item card).
  - Phase 3: Lobby role selector & auth key Satpam (`satpamganteng`).
  - Phase 4: UI Board Satpam, sprite/desain map folder 8-bit, animasi buka dokumen, dan viewer foto bukti asli.
- Utamakan transisi yang catchy, smooth, dan kental dengan estetika retro pixel game.
- Buat commit secara berkala per-fitur/phase.

Silakan mulai dari **Phase 1: Analisis kode & Penyesuaian Schema Database/Backend**.
