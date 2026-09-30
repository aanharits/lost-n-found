# 🌐 Frontend Web - Lost & Found Kampus AI

Frontend untuk **Lost & Found Kampus AI** dibangun menggunakan **SvelteKit 2 (Svelte 5 Runes)** dan **Tailwind CSS v4**, mengusung desain visual retro interaktif yang menggabungkan estetika papan *corkboard*, konsol *NES arcade*, dan sistem arsip *Windows 95*.

---

## 🎨 Desain & Arsitektur Antarmuka

### 1. Svelte 5 Runes & Reactive State
- Menggunakan paradigma modern Svelte 5 (`$state`, `$derived`, `$effect`) untuk manajemen state reaktif berkecepatan tinggi.
- Client-side Zero-Knowledge Proof (ZKP) dihitung secara lokal di browser pengguna menggunakan `snarkjs` dan sirkuit WASM (`ownership_proof.wasm`).

### 2. Papan Interaktif Corkboard & Realtime Drag-and-Drop
- Kartu barang (`ItemCard.svelte`) dapat digerakkan secara bebas menggunakan Svelte action kustom `draggable.ts`.
- Koordinat perpindahan `(x, y)` langsung dipancarkan dan disinkronkan ke seluruh pengguna aktif melalui Socket.IO.
- Dilengkapi tombol **"RAPIHKAN PAPAN"** untuk penataan ulang otomatis berbasis grid jika kartu menumpuk.

### 3. Keamanan Privasi Bukti Fisik
- **Aset Ikon Saja di Board:** Main board publik secara sengaja hanya menampilkan aset visual pixel art (📱, 🔑, 👛, 🎒, 📚) untuk mencegah oknum jahat menyalin ciri fisik (stiker, goresan, nomor seri).
- **Foto Asli ke Posko Satpam:** Foto bukti fisik yang diunggah pelapor dialihkan langsung ke dashboard **Posko Arsip Satpam (`/arsip`)** yang dilindungi kata sandi.

---

## 📂 Struktur Komponen Antarmuka (`src/lib/components/`)

```
web/src/lib/components/
├── Lobby.svelte                  # Layar pemilihan 8 karakter & data mahasiswa
├── Board.svelte                  # Wadah papan pengumuman interaktif utama
├── ItemCard.svelte               # Kartu barang individual (drag, badge, aksi)
├── ReportModal.svelte            # Form pelaporan barang & input ciri rahasia
├── ClaimModal.svelte             # Form klaim barang dengan kalkulator ZKP SnarkJS
├── SatpamChat.svelte             # Widget chat mengambang Asisten Satpam AI
│
├── arsip/                        # Dashboard Khusus Petugas Posko Satpam (/arsip)
│   ├── SatpamExplorer.svelte     # File explorer arsip & penampil foto fisik asli
│   ├── SatpamMutasiModal.svelte  # Buku mutasi resmi serah terima barang
│   └── SatpamArchiveInbox.svelte # Inbox kelola permohonan aktivasi arsip dari mhs
│
└── shared/                       # Komponen Navigasi & Panel Tambahan
    ├── BoardHeader.svelte        # Header papan, counter online, profile capsule
    ├── InboxPanel.svelte         # Drawer slide-in kanan (status klaim & timer 24 jam)
    ├── CategoryGamepad.svelte    # Filter kategori bergaya tombol kontroler NES
    ├── ArchiveRequestModal.svelte# Form mahasiswa minta pencarian arsip lama
    ├── DosTerminal.svelte        # Terminal retro MS-DOS C:\> interaktif
    └── ItemDetailModal.svelte    # Tampilan detail kartu barang
```

---

## 🗃️ Manajemen State & Store (`src/lib/stores/`)

- **`items.ts`**: Menyimpan daftar barang aktif yang tersinkronisasi langsung dari server Socket.IO.
- **`player.ts`**: Menyimpan profil pemain yang sedang aktif (Nama, NPM, Avatar, Kontak WhatsApp) pada `localStorage`.
- **`ui.ts`**: Mengontrol pergantian scene (`lobby` ➜ `board`), dialog modal aktif, filter kategori, dan status notifikasi toast.

---

## 🛠️ Perintah Tersedia

Jalankan perintah berikut di dalam folder `web/`:

* `npm run dev`: Menjalankan frontend development server di `http://localhost:5173/`.
* `npm run build`: Membangun bundle produksi aplikasi menggunakan adapter Node.
* `npm run check`: Menjalankan verifikasi tipe dan diagnosa sintaks melalui `svelte-check`.
* `npm run preview`: Menjalankan preview lokal dari bundle produksi yang telah di-build.
