# 🏷️ Fitur Tag System & Satpam AI Board Highlight
**Lost & Found Kampus AI — Minimalist Modern 8-Bit Nintendo Edition**

---

## 🎮 1. Ringkasan Fitur (Executive Summary)

Fitur **Tag System & Board Highlight** dirancang untuk mengatasi penumpukan barang pada papan Lost & Found kampus dengan pengalaman pengguna (*User Experience*) tanpa hambatan (**Zero-Friction UX**):

1. **Auto-Tagging (0 Friction):** Pelapor barang **tidak perlu** memilih kategori atau tag secara manual di form pelaporan. Sistem di background secara otomatis mengklasifikasikan barang menggunakan kamus Regex akurat (0ms) dengan AI Fallback (Groq API).
2. **Lencana Tag Minimalis 8-Bit:** Pada setiap kartu barang di papan, lencana tag ditampilkan secara ringkas (contoh: `[ HP ]`, `[ LAPTOP ]`, `[ KUNCI ]`, `[ DOMPET ]`) tanpa redundansi nama barang.
3. **Modular SVG Icon System:** Menggantikan emoji bawaan dengan sistem ikon SVG 8-bit bergaya retro pixel art. Komponen dibuat modular sehingga ketika tim desain mengirimkan file SVG final, aset dapat langsung ditimpa tanpa mengubah kode logika.
4. **Interactive Board Highlighting & Dimming:** Ketika mahasiswa menanyakan barang atau kategori ke **Satpam AI** (misal: *"di tag gadget ada barang apa aja"*), sistem secara otomatis:
   - Menyorot (*highlight*) kartu barang terkait dengan **animasi pulsing border keemasan & floating bounce**.
   - Meredupkan (*dimming*) kartu lain di papan menjadi abu-abu transparan (opacity 22%, grayscale 85%).
   - Menggeser kamera papan (*auto-scroll/focus*) langsung ke kartu yang dituju.
5. **Gamepad Nintendo Retro Kategori di Sisi Kiri:** Tombol kategori bersih (`GADGET`, `PAKAIAN`, `PERSONAL`, `DOKUMEN`) dikemas dalam bentuk gamepad konsol retro Nintendo yang diletakkan di sisi kiri papan. Dilengkapi layar mini LCD Game Boy dot-matrix dengan tulisan `Kategori : [SEMUA / KATEGORI AKTIF]`, tombol karet `SELECT`/`START`, lubang speaker 8-bit, serta bodi bernuansa *warm cream* (`#fefce8`). Untuk membatalkan sorotan (unhighlight), pengguna cukup mengklik kembali tombol kategori aktif atau mengklik area papan di mana saja secara intuitif.
6. **Highlighting Status Barang (Hilang & Ketemu):** Sistem filter status di pojok kanan atas (`SEMUA`, `HILANG`, `KETEMU`) kini juga menerapkan konsep penyorotan interaktif yang sama:
   - Kartu barang tidak dihilangkan dari papan, sehingga koordinat spasial papan tetap utuh dan rapi.
   - Mengklik tombol `HILANG` atau `KETEMU` akan langsung menyorot kartu yang relevan dengan animasi denyut keemasan dan meredupkan kartu lainnya.
   - Mengklik kembali tombol aktif atau area kosong papan akan membatalkan sorotan (*toggle unhighlight*).
   - Layar LCD Gamepad Nintendo di kiri papan secara otomatis menampilkan status aktif (`Status : HILANG` / `Status : KETEMU`).
   - Satpam AI mengenali pertanyaan seputar status barang (misal: *"ada barang apa aja yang hilang"*) dan langsung menyorot kartu di papan.

---

## 📂 2. Taksonomi Tag & Kategori (Design Taxonomy)

Sesuai dengan spesifikasi aset tim desain, sistem mengelompokkan barang ke dalam 4 kategori utama dan 25 sub-tag:

| Kategori Utama | Sub-Tag Valid | Contoh Kata Kunci Otomatis (Regex) | Aset Ikon SVG |
| :--- | :--- | :--- | :--- |
| **Gadget** | `hp`, `laptop`, `tws`, `casan`, `kalkulator`, `smartwatch` | iPhone, Samsung, MacBook, ROG, AirPods, Charger Type-C, Casio, Apple Watch | `TagIcon.svelte` (`hp.svg`, `laptop.svg`, dsb.) |
| **Pakaian & Aksesoris** | `kacamata`, `jaket`, `sepatu`, `tas`, `perhiasan`, `kaos_kaki`, `topi` | Kacamata minus, Hoodie, Sneaker, Backpack, Cincin, Kalung, Kaos kaki, Beanie, Snapback | `TagIcon.svelte` (`jaket.svg`, `sepatu.svg`, dsb.) |
| **Personal** | `kunci`, `helm`, `dompet`, `tempat_makan`, `buku`, `alat_tulis`, `make_up` | Kunci Vario/Beat, Helm KYT, Dompet kulit, Tupperware, Binder, Pulpen, Lipstik, Parfum | `TagIcon.svelte` (`kunci.svg`, `dompet.svg`, dsb.) |
| **Dokumen & Kartu** | `ktm`, `ktp`, `sim`, `atm`, `kartu_praktikum` | Kartu Mahasiswa, KTP, SIM A/C, Kartu ATM BCA, Kartu Lab Praktikum | `TagIcon.svelte` (`ktm.svg`, `atm.svg`, dsb.) |
| **Lainnya** | `lainnya` | Barang yang tidak masuk ke dalam kategori di atas | Mystery Question Box SVG |

---

## ⚙️ 3. Arsitektur Teknis & Alur Kerja (Technical Architecture)

### A. Alur Pelaporan Barang (Auto-Classification)
```
[ Mahasiswa Mengetik Nama Barang di Form ]
(Contoh: "Kunci Motor Honda Vario di Parkiran FT")
                  │
                  ▼
         [ Submit Laporan ]  (Form tetap bersih tanpa dropdown tag)
                  │
                  ▼
         [ Server: handleItemAdd ]
                  │
        ┌─────────┴─────────┐
        ▼                   ▼
1. Regex Lokal (0ms)   2. Groq AI Fallback
   Match: tag="kunci",    (Hanya jika kata kunci unik/ambigu)
   cat="Personal"
        └─────────┬─────────┘
                  │
                  ▼
  Item tersimpan dengan category: "Personal", tag: "kunci"
                  │
                  ▼
  Broadcast Socket 'item_added' -> Ditampilkan di Board
```

### B. Alur Interaksi Satpam AI & Board Highlighting
```
[ Mahasiswa Chat: "di tag gadget ada barang apa aja" ]
                  │
                  ▼
    [ Server: detectHighlightIntent ]
  Mendeteksi kata "gadget" -> filter itemIds kategori Gadget
                  │
                  ▼
    [ Groq LLM: Satpam AI Response ]
  "Di tag Gadget ada 2 barang di papan: Laptop Asus dan AirPods! 
   Sudah kubantu sorot di papan ya!"
                  │
                  ▼
    [ Socket Emit: chat_reply ]
  Payload: { reply, highlightCategory: 'Gadget', highlightItemIds: [...] }
                  │
                  ▼
    [ Client: Board.svelte & ItemCard.svelte ]
  1. Store $activeHighlight aktif.
  2. Kartu Gadget mendapat class .highlighted-card (Pulsing Glow & Bounce).
  3. Kartu non-Gadget mendapat class .dimmed-card (Abu-abu 22% Opacity).
  4. Kamera board scroll otomatis ke posisi kartu pertama yang disorot.
  5. Muncul banner HUD Nintendo: [ MENYOROT: GADGET ] [ ✕ BATAL ].
```

---

## 🎨 4. Panduan untuk Tim Desain (Design Assets Guide)

Komponen [`TagIcon.svelte`](file:///Users/aanharits/Downloads/lost%20n%20found/web/src/lib/components/TagIcon.svelte) telah disiapkan agar ramah aset SVG eksternal:

1. **Ukuran Rekomendasi:** `24x24 px` atau `32x32 px`, rasio `1:1` (Square).
2. **Gaya:** Minimalist Modern 8-Bit Pixel Art / SVG Flat Outline tebal (`stroke-width: 1.5 - 2px`).
3. **Format Nama File:** Gunakan nama sub-tag huruf kecil dengan pemisah garis bawah (`_`):
   ```
   web/static/assets/tags/
   ├── hp.svg
   ├── laptop.svg
   ├── tws.svg
   ├── casan.svg
   ├── kalkulator.svg
   ├── smartwatch.svg
   ├── kacamata.svg
   ├── jaket.svg
   ├── sepatu.svg
   ├── tas.svg
   ├── perhiasan.svg
   ├── kaos_kaki.svg
   ├── topi.svg
   ├── kunci.svg
   ├── helm.svg
   ├── dompet.svg
   ├── tempat_makan.svg
   ├── buku.svg
   ├── alat_tulis.svg
   ├── make_up.svg
   ├── ktm.svg
   ├── ktp.svg
   ├── sim.svg
   ├── atm.svg
   └── kartu_praktikum.svg
   ```
> Begitu file SVG dimasukkan ke folder statis, ikon otomatis ter-render menggantikan placeholder bawaan tanpa perlu merombak database atau komponen kartu!

---

## 🛠️ 5. Berkas yang Diubah & Ditambahkan

- **Server:**
  - [`server/src/schemas/item.schema.ts`](file:///Users/aanharits/Downloads/lost%20n%20found/server/src/schemas/item.schema.ts): Menambahkan field `category` dan `tag` pada schema Zod.
  - [`server/src/data/store.ts`](file:///Users/aanharits/Downloads/lost%20n%20found/server/src/data/store.ts): Update interface `Item` dengan `category` dan `tag`.
  - [`server/src/utils/tagRegexRules.ts`](file:///Users/aanharits/Downloads/lost%20n%20found/server/src/utils/tagRegexRules.ts): Kamus pola regex per kategori (`GADGET_RULES`, `PAKAIAN_RULES`, `PERSONAL_RULES`, `DOKUMEN_RULES`) & fungsi pencocokan cepat (0ms).
  - [`server/src/utils/tagClassifier.ts`](file:///Users/aanharits/Downloads/lost%20n%20found/server/src/utils/tagClassifier.ts): Orchestrator klasifikasi (Regex lokal -> AI Fallback Groq) & re-export modular.
  - [`server/src/handlers/report.handler.ts`](file:///Users/aanharits/Downloads/lost%20n%20found/server/src/handlers/report.handler.ts): Auto-enrichment `category` dan `tag` saat barang ditambahkan.
  - [`server/src/handlers/chat.handler.ts`](file:///Users/aanharits/Downloads/lost%20n%20found/server/src/handlers/chat.handler.ts): Deteksi intent sorotan tag/kategori dari pesan mahasiswa untuk dikirimkan ke client.
  - [`server/data/items.json`](file:///Users/aanharits/Downloads/lost%20n%20found/server/data/items.json): Data awal barang dilengkapi metadata tag & kategori.

- **Frontend (Web):**
  - [`web/src/lib/stores/items.ts`](file:///Users/aanharits/Downloads/lost%20n%20found/web/src/lib/stores/items.ts): Penambahan tipe `category` dan `tag` pada interface `Item`.
  - [`web/src/lib/stores/ui.ts`](file:///Users/aanharits/Downloads/lost%20n%20found/web/src/lib/stores/ui.ts): Store `activeHighlight` dan `activeCategoryFilter`.
  - [`web/src/lib/components/TagIcon.svelte`](file:///Users/aanharits/Downloads/lost%20n%20found/web/src/lib/components/TagIcon.svelte): Komponen renderer SVG 8-bit pixel art modular.
  - [`web/src/lib/components/CategoryGamepad.svelte`](file:///Users/aanharits/Downloads/lost%20n%20found/web/src/lib/components/CategoryGamepad.svelte): Komponen terisolasi untuk Gamepad Nintendo kategori 8-bit di sisi kiri papan.
  - [`web/src/lib/components/ItemCard.svelte`](file:///Users/aanharits/Downloads/lost%20n%20found/web/src/lib/components/ItemCard.svelte): Menampilkan TagIcon, lencana nama tag, dan class highlight/dimmed.
  - [`web/src/lib/components/Board.svelte`](file:///Users/aanharits/Downloads/lost%20n%20found/web/src/lib/components/Board.svelte): Papan utama lost and found dengan penyorotan interaktif status & integrasi gamepad.
  - [`web/src/lib/components/SatpamChat.svelte`](file:///Users/aanharits/Downloads/lost%20n%20found/web/src/lib/components/SatpamChat.svelte): Mengirimkan konteks tag ke Satpam AI, menerima sorotan, dan tombol interaktif `[ 📍 LIHAT DI PAPAN ]`.
  - [`web/src/app.css`](file:///Users/aanharits/Downloads/lost%20n%20found/web/src/app.css): Styling lencana tag, efek peredupan kartu, dan keyframes animasi denyut keemasan Nintendo (`nintendoHighlightPulse`).
