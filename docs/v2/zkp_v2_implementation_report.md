# Laporan Pengerjaan ZKP v2 + Normalisasi Keyword

> **Status:** Selesai diimplementasikan & terverifikasi (server `tsc --noEmit` 0 error, web `svelte-check` 0 error/0 warning).
> **Branch:** `feat/zkp-v2-intersection`
> **Tanggal:** 22 September 2026

Dokumen ini mencatat **apa saja yang dikerjakan** pada serangkaian perbaikan setelah migrasi ZKP v1 → v2, beserta alasan dan bukti verifikasinya. Cocok dibaca setelah [`zkp_v2_intersection_scoring.md`](./zkp_v2_intersection_scoring.md) dan [`keyword_extraction_strategy.md`](./keyword_extraction_strategy.md).

---

## Daftar Isi

1. [Latar Belakang Singkat](#1-latar-belakang-singkat)
2. [Ringkasan 7 Perbaikan](#2-ringkasan-7-perbaikan)
3. [Detail Tiap Perbaikan](#3-detail-tiap-perbaikan)
4. [Alasan Angka: Kenapa 5 dan 0.5](#4-alasan-angka-kenapa-5-dan-05)
5. [Bukti Verifikasi](#5-bukti-verifikasi)
6. [Dampak ke Sistem](#6-dampak-ke-sistem)
7. [Yang Belum Dikerjakan](#7-yang-belum-dikerjakan)
8. [Cara Menguji Manual](#8-cara-menguji-manual)

---

## 1. Latar Belakang Singkat

ZKP v1 memakai satu circuit `ownership_proof.circom` yang membuktikan **3 keyword sekaligus** dengan logika AND. Cacatnya:

- **Padding dummy `__empty__`** menghukum pengklaim yang justru tahu lebih banyak.
- **AND mutlak** membuat pengklaim yang tahu sebagian langsung gagal.

ZKP v2 menggantinya dengan `single_keyword_proof.circom` (1 keyword per proof) + **intersection scoring**: `score = matched / N`. Perubahan ini sudah berjalan, namun menyisakan beberapa cacat teknis dan peluang perbaikan. Dokumen ini mencatat perbaikannya.

---

## 2. Ringkasan 7 Perbaikan

| # | Perbaikan | File | Kategori |
|---|---|---|---|
| 1 | Fix error type `targetItem` before declaration | `web/src/lib/components/ClaimModal.svelte` | Bug (blokir check) |
| 2 | Hapus `web/public/`, pakai `web/static/zk/` | `web/public/` dihapus | Bug (file salah lokasi) |
| 3 | Normalisasi mekanis + buang imbuhan, pisah dari stopword | `server/src/zk/nlpPreprocess.ts` | Fitur (akurasi) |
| 4 | Prompt LLM ketat + few-shot | `server/src/zk/keywordExtractor.ts` | Fitur (akurasi) |
| 5 | `MAX_KEYWORDS` 7→5 + `MIN_KEYWORDS=3` + guard report | `normalizeKeywords.ts`, `report.handler.ts` | Desain & keamanan |
| 6 | `SCORE_THRESHOLD` 0.33→0.5 + label confidence | `server/src/handlers/claim.handler.ts` | Keamanan |
| 7 | Display `score * 100` | `web/src/lib/components/ClaimsReviewModal.svelte` | Tampilan |

---

## 3. Detail Tiap Perbaikan

### Perbaikan 1 — Error type `targetItem` before declaration

**Masalah:**
Di `ClaimModal.svelte`, `submitLabel` (baris 16) memakai `targetItem` yang baru dideklarasikan di baris 19. `svelte-check` melaporkan:

```
Block-scoped variable 'targetItem' used before its declaration.
Variable 'targetItem' is used before being assigned.
```

**Solusi:** pindahkan deklarasi `targetItem` ke atas `submitLabel`, sehingga urutan ketergantungan benar.

**Kenapa penting:** ini satu-satunya error yang memblokir `npm run check`, jadi harus dibereskan pertama agar langkah lain bisa diverifikasi.

---

### Perbaikan 2 — Hapus `web/public/`, gunakan `web/static/zk/`

**Masalah:**
File ZKP v2 (`single_keyword_proof.wasm`, `.zkey`) disalin ke **dua** tempat:
- `web/public/zk/` — **tidak dipakai** SvelteKit.
- `web/static/zk/` — lokasi yang benar.

Akibatnya: `public/` menjadi file mati yang ikut ter-commit, sementara `static/zk/` justru untracked.

**Solusi:** hapus folder `web/public/`, track `web/static/zk/single_keyword_proof.*`.

**Catatan teknis:** SvelteKit (adapter-node) hanya menyajikan aset dari `static/`. URL runtime adalah `/zk/single_keyword_proof.wasm`, sesuai yang dipakai `ClaimModal`.

**Verifikasi:** `git ls-files web/public` → kosong.

---

### Perbaikan 3 — Normalisasi mekanis + buang imbuhan

**Masalah:**
`nlpPreprocess.ts` sebelumnya mencampur dua hal berbeda: normalisasi bentuk (mekanis) dan penyaringan stopword (butuh daftar). Akibatnya:
- `"tasnya"` ≠ `"tas"` → hash beda.
- `"gantungannya"` ≠ `"gantungan"` → hash beda.

**Solusi:** pisahkan menjadi dua bagian yang jelas:

```text
A. Normalisasi MEKANIS (tanpa kamus, bahasa-agnostik)
   - lowercase, rapikan spasi, hapus tanda baca
   - buang imbuhan: akhiran -nya/-ku/-mu, awalan me-/di-/ter-/ber-/pe-
B. Penyaringan STOPWORD (butuh daftar, sempit)
```

Fungsi baru yang diekspos:
- `normalizeToken(token)` — normalisasi mekanis satu kata.
- `stripSuffix` / `stripPrefix` — internal, dipakai `normalizeToken`.

**Bug yang ditemukan & diperbaiki saat implementasi:**
`stripPrefix` awalnya lupa memanggil `startsWith`, sehingga memotong sembarang kata. Contoh rusak: `"hujan"` → `"jan"`, `"gantungan"` → `"ungan"`, `"dompet"` → `"pet"`. Setelah diperbaiki (tambah cek `token.startsWith(prefix)`), hasilnya benar.

**Hasil uji:**
```text
tasnya     -> tas
dompetku   -> dompet
gantungannya -> gantungan
helmnya    -> helm
hujan      -> hujan
membawa    -> bawa
dibawa     -> bawa

"tasnya hitam ada gantungannya"  -> "tas hitam gantungan"
"helmnya ada sticker anak geologi sama jas ujan warna biru"
                                 -> "helm sticker anak geologi jas ujan biru"
```

**Kenapa penting:** normalisasi mekanis bekerja untuk kata apa pun **tanpa kamus**, sehingga tahan terhadap input yang tidak terdaftar.

---

### Perbaikan 4 — Prompt LLM ketat + few-shot

**Masalah:**
Prompt lama terlalu longgar: hanya "ambil objek, warna, motif, brand, bahan". Tidak melarang kata generik, tidak menetapkan bentuk tunggal, dan tidak memberi contoh. Akibatnya LLM bisa mengeluarkan `"stickernya"` di satu sisi dan `"stiker"` di sisi lain.

**Solusi:** prompt baru dengan:
1. Penegasan determinisme ("output harus sama untuk makna yang sama").
2. Bentuk kata dasar/tunggal, huruf kecil, tanpa imbuhan.
3. Pemetaan sinonim eksplisit (sticker/stiker, hape/handphone, ujan/hujan, casan/charger, dompet/wallet).
4. Larangan kata generik (besar, bagus, unik, dsb).
5. **Few-shot 2 contoh** — ini yang paling ampuh membuat LLM meniru pola.

Prompt lengkap ada di [`keyword_extraction_strategy.md`](./keyword_extraction_strategy.md) §6.

**Catatan:** jumlah keyword pada contoh disamakan dengan `MAX_KEYWORDS` (5) agar konsisten.

---

### Perbaikan 5 — `MAX_KEYWORDS` 7→5 + `MIN_KEYWORDS=3` + guard report

**Masalah:**
- `MAX_KEYWORDS = 7` terlalu besar: mendilusi skor dan memperbanyak target tebak.
- Tidak ada batas bawah: pelapor bisa menyimpan hanya 1 keyword, sehingga penebak cukup tahu 1 untuk skor 1.0.

**Solusi di `normalizeKeywords.ts`:**
```typescript
export const MAX_KEYWORDS = 5;   // batas atas
export const MIN_KEYWORDS = 3;   // batas bawah untuk report
```

**Solusi di `report.handler.ts`:**
Jika keyword nyata < `MIN_KEYWORDS`, laporan ditolak dan server mengirim `item_add_error` ke pelapor:
```typescript
if (keywords.length < MIN_KEYWORDS) {
  socket.emit('item_add_error', {
    message: `Ciri rahasia terlalu sedikit. Tambahkan minimal ${MIN_KEYWORDS} ciri pembeda...`
  });
  return;
}
```

**Kenapa penting:** mencegah skenario N=1 di mana `ceil(1/2) = 1` membuat sistem bisa ditebak dengan satu tebakan.

---

### Perbaikan 6 — `SCORE_THRESHOLD` 0.33→0.5 + label confidence

**Masalah:**
- Threshold 0.33 terlalu longgar (N=3 cukup 1 match).
- Label `confidence` memakai ambang lama (`0.67`/`0.33`) yang tidak konsisten dengan threshold baru, dan label "Rendah" tak akan pernah muncul pada klaim tersimpan.

**Solusi di `claim.handler.ts`:**
```typescript
const SCORE_THRESHOLD = 0.5;
// ...
confidence: score >= 0.8 ? 'Tinggi' : score >= 0.5 ? 'Sedang' : 'Rendah',
```

**Arti threshold 0.5:** pengklaim harus membuktikan minimal `ceil(N / 2)` commitment.

---

### Perbaikan 7 — Display `score * 100`

**Masalah:**
`claim.score` kini bertipe float 0.0–1.0, tapi UI menampilkan `{claim.score}%` → muncul `0.667%` alih-alih `67%`.

**Solusi di `ClaimsReviewModal.svelte`:**
```svelte
AI: {claim.confidence} ({(claim.score * 100).toFixed(0)}%)
```

---

## 4. Alasan Angka: Kenapa 5 dan 0.5

### `MAX_KEYWORDS = 5` (bukan 7)

| Kriteria | N = 5 | N = 7 |
|---|---|---|
| Pemilik sah (tahu 3 ciri) lolos @0.5 | ✅ 0.6 | ❌ 0.43 |
| Risiko brute-force (300 tebakan) | ~39% | ~50% |
| Beban ZKP worst case (M×N) | 25 | 49 |
| Realisme ciri pembeda manusia | ✅ | ⚠️ jadi generik |

### `SCORE_THRESHOLD = 0.5` → minimal `ceil(N/2)` match

| N | Minimal match | Skor |
|---|---|---|
| 1 | 1 | 1.0 |
| 2 | 1 | 0.5 |
| 3 | 2 | 0.67 |
| 4 | 2 | 0.5 |
| 5 | 3 | 0.6 |

Dengan `MIN_KEYWORDS = 3`, N=1 tidak akan terjadi, sehingga minimal match efektif adalah 2.

---

## 5. Bukti Verifikasi

| Pemeriksaan | Perintah | Hasil |
|---|---|---|
| Type server | `npm run typecheck` (server) | 0 error |
| Type + Svelte web | `npm run check` (web) | 0 error, 0 warning |
| Normalisasi imbuhan | uji `normalizeToken` | `tasnya`→`tas`, dll |
| Preprocess | uji `preprocessText` | sesuai harapan |
| Poseidon konsistensi | banding `circomlibjs` vs `poseidon-lite` | identik (dari analisis v2) |

---

## 6. Dampak ke Sistem

| Aspek | Sebelum | Sesudah |
|---|---|---|
| Imbuhan (`tasnya`) | hash beda | normal, dicocokkan |
| Prompt LLM | longgar | ketat + few-shot |
| Batas keyword | 1–7 (tanpa min) | 3–5 |
| Ambang lolos | 33% commitment | 50% commitment |
| Lokasi file ZKP | ganda (`public`+`static`) | tunggal (`static/zk`) |
| Tampilan skor | `0.667%` | `67%` |

---

## 7. Yang Belum Dikerjakan

Sengaja ditunda (prioritas lebih rendah / opsional):

- **`zk/canonicalKeywords.ts`** — peta sinonim kecil. Belum dibuat karena LLM + normalisasi mekanis sudah menangani mayoritas kasus.
- **Rate limiting** `claim_submit` — mencegah spam tebakan berulang.
- **Pembersihan artefak v1** — `ownership_proof.circom`, `verification_key.json` lama, dll.
- **Sinkronisasi dokumen v2** — §4.7 (`try/catch` → pre-check Poseidon) dan §5 (threshold) di `zkp_v2_intersection_scoring.md`.
- **Web Worker** untuk `fullProve()` — masih di main thread.

---

## 8. Cara Menguji Manual

### 8.1 Uji normalisasi (tanpa UI)
```bash
cd server
npx tsx -e "import('./src/zk/nlpPreprocess.js').then(m => console.log(m.preprocessText('tasnya hitam ada gantungannya')))"
# harapan: "tas hitam gantungan"
```

### 8.2 Uji alur klaim end-to-end
1. Jalankan server (`npm run dev` di `server/`) dan web (`npm run dev` di `web/`).
2. Buat laporan baru dengan **minimal 3 ciri** pembeda. Jika kurang → harus muncul `item_add_error`.
3. Klaim dengan gaya bahasa berbeda (imbuhan/sinonim).
4. Pastikan klaim lolos jika `score >= 0.5`.
5. Tunggu dispute window 1 menit → cek pemenang & tampilan skor di modal riwayat klaim.

### 8.3 Checklist
```text
[ ] Laporan < 3 ciri ditolak dengan pesan yang jelas
[ ] Laporan >= 3 ciri tersimpan dengan commitments
[ ] "tasnya" / "tas" menghasilkan hash yang sama
[ ] Klaim sebagian (skor >= 0.5) lolos, di bawah 0.5 ditolak
[ ] Skor tampil dalam persen (mis. 67%, bukan 0.667%)
[ ] Pemenang ditentukan setelah dispute window
```

---

## Referensi

| Dokumen | Isi |
|---|---|
| [`zkp_v2_intersection_scoring.md`](./zkp_v2_intersection_scoring.md) | Desain inti ZKP v2 |
| [`keyword_extraction_strategy.md`](./keyword_extraction_strategy.md) | Strategi normalisasi & prompt |
| [`backend_zkp_summary.md`](../v1/backend_zkp_summary.md) | Integrasi backend (v1) |
| [`technical_flow_guide.md`](../v1/technical_flow_guide.md) | Solusi problem Tri-Layer Lock (v1) |
