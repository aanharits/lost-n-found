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

## 3. System Flow

### A. Report & Auto-Classification Flow
```
User Submits Report
        │
        ▼
Server Classification Engine
        │
   ┌────┴────────────────────────┐
   ▼                             ▼
Pattern Matching (Regex)      AI Fallback (LLM)
(Fast dictionary check)       (Uncommon keywords)
   │                             │
   └──────────────┬──────────────┘
                  ▼
      Assign Category & Sub-Tag
                  │
                  ▼
   Save Item & Broadcast to Clients
```

### B. Board Highlighting & Focus Flow
```
User Trigger (Gamepad / Status Button / Satpam Chat)
        │
        ▼
Highlight Store Updates Active Target
        │
   ┌────┴────────────────────────┐
   ▼                             ▼
Target Cards Highlighted      Other Cards Dimmed
(Gold glow & pulse effect)    (Reduced opacity & grayscale)
   │                             │
   └──────────────┬──────────────┘
                  ▼
   Auto-Scroll to First Matched Item
```

### C. Satpam AI Assistant Flow
```
User Asks Satpam in Natural Language
        │
        ▼
Intent Detection & Query Processing
        │
   ┌────┴────────────────────────┐
   ▼                             ▼
Generate Conversational Reply   Extract Highlight Criteria
   │                             │
   └──────────────┬──────────────┘
                  ▼
   Deliver Response & Focus Board Cards
```

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
