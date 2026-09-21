# Dokumentasi Teknis: Fitur Tag System & Board Highlighting
**Lost & Found Kampus AI**

---

## 1. Ikhtisar Arsitektur
Fitur ini mengotomatisasi kategorisasi barang dan mempermudah navigasi visual di papan lost & found:
- **Zero-Friction Auto-Tagging:** Pengguna tidak perlu memilih tag/kategori secara manual saat melapor. Sistem di backend mengklasifikasikan barang secara otomatis via kamus Regex (0ms) dengan fallback LLM Groq (`qwen/qwen3.8-27b`).
- **Clean Card UI:** Kartu barang hanya menampilkan ilustrasi SVG 8-bit tanpa badge teks berlebih agar tata letak kartu tetap lapang dan rapi.
- **Interactive Highlighting & Dimming:** Navigasi kategori maupun status (`HILANG` / `KETEMU`) tidak menghapus elemen dari DOM, melainkan memberi highlight (pulsing glow) pada kartu yang cocok dan meredupkan (opacity 22%, grayscale 85%) kartu lainnya.
- **Modular Gamepad Controller:** Kontroler gamepad retro Nintendo di sisi kiri papan diisolasi sebagai komponen mandiri ([`CategoryGamepad.svelte`](file:///Users/aanharits/Downloads/lost%20n%20found/web/src/lib/components/CategoryGamepad.svelte)) dengan layar LCD dot-matrix status/kategori.

---

## 2. Taksonomi Tag & Kategori

| Kategori Utama | Sub-Tag | Contoh Kata Kunci (Regex) | Aset Ikon SVG |
| :--- | :--- | :--- | :--- |
| **Gadget** | `hp`, `laptop`, `tws`, `casan`, `kalkulator`, `smartwatch` | iPhone, Samsung, MacBook, AirPods, Type-C, Casio, Apple Watch | `TagIcon.svelte` |
| **Pakaian & Aksesoris** | `kacamata`, `jaket`, `sepatu`, `tas`, `perhiasan`, `kaos_kaki`, `topi` | Kacamata, Hoodie, Sneaker, Backpack, Cincin, Kaos kaki, Topi | `TagIcon.svelte` |
| **Personal** | `kunci`, `helm`, `dompet`, `tempat_makan`, `buku`, `alat_tulis`, `make_up` | Kunci motor/mobil, Helm KYT, Dompet, Tupperware, Buku, Pulpen, Lipstik | `TagIcon.svelte` |
| **Dokumen & Kartu** | `ktm`, `ktp`, `sim`, `atm`, `kartu_praktikum` | KTM, KTP, SIM A/C, Kartu ATM BCA, Kartu Lab | `TagIcon.svelte` |
| **Lainnya** | `lainnya` | Barang di luar daftar pola | Default Mystery Box |

---

## 3. Alur Kerja Sistem

### A. Auto-Tagging pada Pelaporan Barang
```
Mahasiswa Submit Laporan
        │
        ▼
Server (handleItemAdd)
        │
   ┌────┴────┐
   ▼         ▼
[Regex]   [Groq AI] (Fallback jika kata kunci tidak umum)
   │         │
   └────┬────┘
        ▼
Simpan item { category, tag } -> Broadcast Socket 'item_added'
```

### B. Highlighting & Dimming (Kategori & Status)
1. **Trigger:** Klik tombol kategori di Gamepad, klik tombol status `HILANG`/`KETEMU` di kanan atas, atau interaksi tanya-jawab dengan Satpam AI.
2. **State:** Store `$activeHighlight` diisi dengan `{ category, tag, itemType, itemIds, source }`.
3. **Rendering:**
   - Kartu yang cocok menerima kelas `.highlighted-card` (animasi denyut & border emas).
   - Kartu lain menerima kelas `.dimmed-card` (opacity 22%, grayscale 85%).
   - Papan otomatis melakukan *smooth pan/scroll* ke kartu pertama yang cocok.
4. **Unhighlight:** Klik ulang tombol aktif atau klik area kosong di papan mereset `$activeHighlight` ke `null`.

### C. Integrasi Satpam AI
Fungsi `detectHighlightIntent` pada [`chat.handler.ts`](file:///Users/aanharits/Downloads/lost%20n%20found/server/src/handlers/chat.handler.ts) mem-parse query obrolan untuk mendeteksi intent kategori, sub-tag, status (hilang/ketemu), atau nama barang, lalu mengirim payload `highlightCategory`, `highlightTag`, `highlightType`, dan `highlightItemIds` bersamaan dengan respons AI.

---

## 4. Panduan Aset SVG Tim Desain
Aset SVG 8-bit dipetakan modular melalui [`TagIcon.svelte`](file:///Users/aanharits/Downloads/lost%20n%20found/web/src/lib/components/TagIcon.svelte):
- **Lokasi folder statis:** `web/static/assets/tags/`
- **Spesifikasi:** Format SVG square (24x24 px atau 32x32 px), stroke tebal pixel art.
- **Konvensi penamaan:** Huruf kecil sesuai sub-tag (contoh: `hp.svg`, `kunci.svg`, `ktm.svg`). Begitu file tersedia, aset otomatis menggantikan placeholder bawaan.

---

## 5. Struktur Modul & Berkas

### Server
- [`server/src/utils/tagRegexRules.ts`](file:///Users/aanharits/Downloads/lost%20n%20found/server/src/utils/tagRegexRules.ts): Kamus aturan regex per kategori dan fungsi pencocokan cepat `classifyWithRegex()`.
- [`server/src/utils/tagClassifier.ts`](file:///Users/aanharits/Downloads/lost%20n%20found/server/src/utils/tagClassifier.ts): Orchestrator klasifikasi (`autoClassifyItem`) dan integrasi AI Groq fallback.
- [`server/src/handlers/chat.handler.ts`](file:///Users/aanharits/Downloads/lost%20n%20found/server/src/handlers/chat.handler.ts): Deteksi intent highlight dan handler obrolan Satpam AI.
- [`server/src/handlers/report.handler.ts`](file:///Users/aanharits/Downloads/lost%20n%20found/server/src/handlers/report.handler.ts): Auto-enrichment `category` dan `tag` saat laporan baru dibuat.

### Web Client
- [`web/src/lib/components/CategoryGamepad.svelte`](file:///Users/aanharits/Downloads/lost%20n%20found/web/src/lib/components/CategoryGamepad.svelte): Komponen UI & logika Gamepad Nintendo retro untuk filter kategori.
- [`web/src/lib/components/Board.svelte`](file:///Users/aanharits/Downloads/lost%20n%20found/web/src/lib/components/Board.svelte): Kontainer papan, manajemen grid kartu, dan filter status `HILANG`/`KETEMU`.
- [`web/src/lib/components/ItemCard.svelte`](file:///Users/aanharits/Downloads/lost%20n%20found/web/src/lib/components/ItemCard.svelte): Kartu barang dengan status dinamis `.highlighted-card` / `.dimmed-card` dan render ikon SVG bersih.
- [`web/src/lib/components/TagIcon.svelte`](file:///Users/aanharits/Downloads/lost%20n%20found/web/src/lib/components/TagIcon.svelte): Renderer ikon SVG modular berbasis sub-tag.
- [`web/src/lib/stores/ui.ts`](file:///Users/aanharits/Downloads/lost%20n%20found/web/src/lib/stores/ui.ts): Definisi interface `HighlightState` dan store global reaktif.
