# Tag System & Board Highlighting Architecture

Dokumentasi arsitektur dan fungsionalitas sistem klasifikasi otomatis serta navigasi visual papan Lost & Found.

---

## 1. System Overview

Sistem ini dirancang untuk mengotomatisasi pengelompokan barang dan memudahkan penelusuran visual di papan Lost & Found:

- **Zero-Friction Auto-Tagging**: Pengguna tidak dibebani pemilihan kategori manual saat melapor. Sistem secara otomatis mengenali jenis barang dari judul dan deskripsi laporan menggunakan aturan berbasis pola kata kunci lokal dengan dukungan AI sebagai cadangan (*fallback*).
- **Minimalist Card Interface**: Kartu barang berfokus pada ilustrasi ikon retro yang bersih tanpa label teks bertumpuk, menjaga tata letak kartu tetap rapi.
- **Visual Highlighting & Dimming**: Filtrasi barang bekerja secara non-destruktif tanpa menyembunyikan kartu dari papan. Kartu yang sesuai kriteria akan disorot secara visual, sementara kartu lainnya diredupkan.
- **Dedicated Gamepad Controller**: Navigasi kategori diakses melalui panel gamepad retro di sisi kiri papan, dilengkapi layar LCD kecil sebagai indikator kategori atau status yang sedang aktif.

---

## 2. Category & Tag Taxonomy

| Kategori Utama | Sub-Tag | Contoh Barang |
| :--- | :--- | :--- |
| **Gadget** | `hp`, `laptop`, `tws`, `casan`, `kalkulator`, `smartwatch` | Smartphone, Laptop, Earphone nirkabel, Charger, Kalkulator, Smartwatch |
| **Pakaian & Aksesoris** | `kacamata`, `jaket`, `sepatu`, `tas`, `perhiasan`, `kaos_kaki`, `topi` | Kacamata, Jaket/Hoodie, Sepatu, Ransel/Tote bag, Cincin/Kalung, Topi |
| **Personal** | `kunci`, `helm`, `dompet`, `tempat_makan`, `buku`, `alat_tulis`, `make_up` | Kunci kendaraan, Helm, Dompet, Kotak makan/Tumbler, Buku, Alat tulis |
| **Dokumen & Kartu** | `ktm`, `ktp`, `sim`, `atm`, `kartu_praktikum` | KTM, KTP, SIM, Kartu ATM/Debit, Kartu praktikum/lab |
| **Lainnya** | `lainnya` | Barang di luar daftar pola |

---

## 3. High-Level Flow

### A. Auto-Classification on Report
1. Pengguna mengirim laporan barang tanpa perlu memilih kategori.
2. Sistem backend memproses judul dan deskripsi laporan.
3. Pola kata kunci dicocokkan terlebih dahulu untuk klasifikasi instan.
4. Jika tidak ditemukan kecocokan, model AI digunakan untuk menentukan kategori dan sub-tag yang paling sesuai.
5. Informasi kategori dan tag disimpan bersama laporan dan diperbarui ke seluruh klien secara realtime.

### B. Board Highlighting & Focus
1. **Pemicu**: Pengguna memilih kategori di Gamepad, memilih status (Hilang/Ketemu), atau menerima saran dari percakapan Satpam AI.
2. **Efek Visual**: Kartu yang relevan disorot dengan efek visual aktif, sedangkan kartu lainnya diredupkan. Layar secara otomatis bergeser (*smooth scroll*) ke kartu pertama yang cocok.
3. **Pembatalan Sorotan**: Mengklik kembali opsi yang sedang aktif atau mengklik area kosong pada papan akan mengembalikan seluruh kartu ke tampilan normal.

---

## 4. Icon Asset Guidelines

Ikon kategori dan sub-tag dirender secara modular melalui komponen SVG:
- **Direktori Aset**: `web/static/assets/tags/`
- **Format**: File SVG berdimensi persegi (24x24 px atau 32x32 px) dengan gaya pixel art.
- **Konvensi Penamaan**: Menggunakan nama sub-tag dalam huruf kecil (contoh: `hp.svg`, `kunci.svg`, `ktm.svg`). Ketika file aset tersedia, sistem otomatis memprioritaskan file tersebut dibandingkan ikon bawaan.

---

## 5. Component Overview

- **Backend / Server**: Mengelola kamus klasifikasi kata kunci, integrasi model AI untuk kasus ambigu, pengayaan metadata laporan, dan deteksi maksud (*intent*) dalam percakapan Satpam AI.
- **Frontend / Web**: Mengelola state sorotan terpusat, kontroler Gamepad kategori, kartu barang dengan efek sorotan dinamis, serta rendering ikon SVG.
