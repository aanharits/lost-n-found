# 🎮 LOST & FOUND KAMPUS AI

[![Zero-Knowledge Proofs](https://img.shields.io/badge/ZKP-Circom%20%2B%20SnarkJS-orange?style=for-the-badge)](#1-zero-knowledge-proofs-zkp)
[![Game Theory](https://img.shields.io/badge/Algorithm-Gale--Shapley-success?style=for-the-badge)](#2-gale-shapley-stable-matching)
[![AI Engine](https://img.shields.io/badge/AI-Groq%20Cloud%20NLP-blue?style=for-the-badge)](#3-the-power-combo-llm--zkp)
[![Tech Stack](https://img.shields.io/badge/Stack-SvelteKit%205%20%7C%20Hono%20%7C%20Drizzle-purple?style=for-the-badge)](#-database-architecture-drizzle--neon)

> Platform lost-and-found kampus modern berbasis **Zero-Knowledge Proofs (ZKP)**, **Gale-Shapley Stable Matching**, dan **Groq Semantic AI**, dikemas dalam antarmuka papan pinboard retro pixel-art.

---

## 💡 Why This Architecture? (Design Decisions)

### 1. Zero-Knowledge Proofs (ZKP)

- **Masalah:** Di sistem biasa, pengklaim harus mengetik ciri rahasia ke server atau penemu (misal: _"ada gantungan stitch biru"_). Teks rahasia ini rawan diintip admin database, dicuri peretas, atau dibocorkan oleh oknum.
- **Solusi Kami:** Teks rahasia **tidak pernah disimpan di database**. Browser pengklaim membuat bukti matematis (_ZKP Groth16 Proof_) untuk membuktikan bahwa ia tahu ciri yang cocok dengan komitmen hash Poseidon di server. Server memverifikasi keabsahan bukti **tanpa pernah tahu isi kata rahasianya** (_Trustless & Zero-Leakage_).

---

### 2. Gale-Shapley Stable Matching

- **Masalah:** Sistem konvensional memakai _First-Come, First-Served (FCFS)_. Pemilik asli yang mengetik teliti pasti kalah balapan dari bot otomatis atau koneksi cepat (_race condition_). Selain itu, barang umum (seperti tumbler hitam atau kunci motor) sering diklaim banyak orang sekaligus tanpa ada penilaian yang adil.
- **Solusi Kami:** Begitu klaim valid pertama masuk, sistem membuka **Dispute Window 1 Menit ("APPROVAL 1 MENIT")**. Seluruh klaim yang lolos ZKP dalam 60 detik dievaluasi menggunakan algoritma **Gale-Shapley** (berdasarkan skor kecocokan ZKP dan prioritas waktu) untuk menetapkan pemilik sah secara adil dan stabil (_Pareto-optimal_).

---

### 3. The Power Combo: LLM + ZKP

- **Tantangan ZKP:** Sirkuit kriptografi bersifat kaku dan deterministik murni. Variasi kalimat manusia (misal: _"gantungan stitch biru"_ vs _"boneka stitch warna biru"_) akan menghasilkan hash berbeda total, sehingga klaim sah pasti ditolak.
- **Peran LLM (Groq NLP):** Bertindak sebagai _Semantic Normalizer_. LLM membaca deskripsi bahasa bebas manusia lalu merangkumnya menjadi **3 kata kunci kanonikal baku** (contoh: `["stitch", "biru", "gantungan"]`).
- **Sinergi:** Mahasiswa bebas bercerita dengan bahasa santai sehari-hari (**LLM**), sementara keabsahan dan kerahasiaan kepemilikan dijamin 100% secara matematis tanpa celah kebocoran (**ZKP**).

---

## 🏛️ Tri-Layer Lock Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             TRI-LAYER LOCK                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│ LAYER 1: THE VAULT (Zero-Knowledge Proofs)                                  │
│ ➜ Sirkuit Circom (Groth16) + Poseidon Hashing langsung di browser klien    │
├─────────────────────────────────────────────────────────────────────────────┤
│ LAYER 2: THE TRANSLATOR (Semantic NLP AI)                                   │
│ ➜ Groq Cloud API (Qwen 2.5) menstandarisasi bahasa bebas jadi 3 kata kunci │
├─────────────────────────────────────────────────────────────────────────────┤
│ LAYER 3: THE JUDGE (Gale-Shapley Stable Matching)                           │
│ ➜ Antrean sengketa 1 menit untuk eliminasi bot & pencocokan pemilik adil    │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🗺️ System Flow & Core Features

```
[ LOBBY ] ───► Pilih 8 Avatar Mahasiswa & Isi Identitas
     │         (Fitur Tambahan: MS-DOS Terminal `C:\>` & Bypass Posko Satpam)
     ▼
[ MAIN BOARD ] ───► Papan Pin Interaktif (Draggable Sticky Notes)
     │         ├─ Filter Kategori Gamepad NES (D-PAD)
     │         ├─ Pencarian & Highlight Kartu Otomatis
     │         ├─ Tombol Rapihkan Papan (Auto-Grid Layout)
     │         ├─ Drawer INBOX Kanan (Status Klaim, Timer 1 Menit, Request)
     │         ├─ Chat Asisten Satpam AI (Groq LLM)
     │         └─ Request Aktivasi Arsip Barang Lawas
     ▼
[ LAPOR / KLAIM ] ───► Foto asli masuk ke arsip Satpam, board hanya aset ikon
     │                 Pengklaim generate ZKP Proof di browser ➜ Lolos ZKP
     ▼
[ DISPUTE 1 MENIT ] ──► Antrean Gale-Shapley memvalidasi pemilik sah
     ▼
[ RESOLVED ] ───► Kontak WhatsApp dibuka untuk serah terima fisik barang
```

---

## 🛡️ Anti-Fraud Evidence Architecture

| Lokasi                            | Tampilan Bukti                           | Alasan Desain                                                                                                               |
| :-------------------------------- | :--------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------- |
| **Main Board Publik**             | Aset Ikon Pixel Art (📱, 🔑, 👛, 🎒, 📚) | **Anti-Fraud:** Mencegah oknum jahat melihat detail fisik (stiker, goresan, nomor seri, isi dompet) untuk memalsukan klaim. |
| **Posko Arsip Satpam (`/arsip`)** | Foto Bukti Fisik Asli (`evidencePhoto`)  | **Verifikasi Tatap Muka:** Rujukan otentik bagi satpam saat mahasiswa datang ke posko mengambil barang fisik.               |

---

## 🗄️ Database Architecture (Drizzle + Neon)

Menggunakan **Drizzle ORM** dengan database cloud **Neon PostgreSQL** (dilengkapi mode cadangan _in-memory store_ saat offline):

- **`items`**: Metadata barang, hash komitmen Poseidon `[h1, h2, h3]`, foto fisik rahasia satpam, posisi kartu `(x, y)`, status (`open`, `disputed`, `resolved`).
- **`claims`**: Riwayat pengajuan klaim ZKP, skor kecocokan, data pengklaim, dan status (`pending`, `approved`, `rejected`).
- **`archive_requests`**: Permohonan aktivasi pencarian arsip lama dari mahasiswa ke petugas satpam.

---

## 🚀 Quickstart Guide

### Prasyarat

- **Node.js**: Versi 18+ (disarankan Node 20 LTS)
- **Groq API Key**: Masukkan ke file `.env` di folder `server/`

### 1. Jalankan Backend Server

```bash
cd server
npm install
npm run dev
```

_Server berjalan di `http://localhost:3001`._

### 2. Jalankan Frontend Web

```bash
cd web
npm install
npm run dev
```

_Aplikasi web berjalan di `http://localhost:5173`._
