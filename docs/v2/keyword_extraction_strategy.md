# Strategi Ekstraksi & Normalisasi Keyword (ZKP v2)

> **Status:** Dokumen desain & analisis — sebagian belum diimplementasikan.
> **Konteks:** Melengkapi [`zkp_v2_intersection_scoring.md`](./zkp_v2_intersection_scoring.md). Dokumen ini menjawab satu pertanyaan inti:
> **"Bagaimana membuat keyword dari pelapor dan pengklaim sedekat mungkin, mengingat manusia menulis dengan gaya bahasa yang berbeda-beda?"**

---

## Daftar Isi

1. [Ringkasan Masalah](#1-ringkasan-masalah)
2. [Konsep Kunci: Tiga Jenis Normalisasi](#2-konsep-kunci-tiga-jenis-normalisasi)
3. [Peran Stopword vs Canonical Mapping](#3-peran-stopword-vs-canonical-mapping)
4. [Mengapa Daftar Kata Tidak Boleh Jadi Tulang Punggung](#4-mengapa-daftar-kata-tidak-boleh-jadi-tulang-punggung)
5. [Pipeline Normalisasi yang Diusulkan](#5-pipeline-normalisasi-yang-diusulkan)
6. [Prompt LLM yang Diperketat](#6-prompt-llm-yang-diperketat)
7. [Use Case Lengkap](#7-use-case-lengkap)
8. [Batas Jaminan (Jujur)](#8-batas-jaminan-jujur)
9. [Rekomendasi Implementasi](#9-rekomendasi-implementasi)
10. [Checklist Implementasi](#10-checklist-implementasi)

---

## 1. Ringkasan Masalah

Sistem ZKP v2 (`single_keyword_proof`) memverifikasi apakah `Poseidon(keyword_pengklaim) == commitment_pelapor`. Ini berjalan baik **asalkan keyword di kedua sisi identik**.

Kenyataannya, pelapor dan pengklaim menulis dengan gaya berbeda:

```
Pelapor   : "tasnya hitam ada sticker anak geologi"
Pengklaim : "tas hitam, stickernya gambar geologi"
```

Perhatikan bedanya:
- `"tasnya"` vs `"tas"` — perbedaan imbuhan.
- `"sticker"` vs `"stiker"` — perbedaan ejaan/serapan.
- `"anak"` vs `"gambar"` — perbedaan sinonim.
- `"ada"` — kata pengisi tanpa makna fisik.

Kalau dibiarkan mentah, hash-nya beda total (*avalanche effect*): satu karakter beda = seluruh hash berubah. Padahal kedua kalimat bermakna hampir sama.

Tujuan dokumen ini: **memaksimalkan peluang kedua sisi menghasilkan keyword identik**, dengan pendekatan yang tidak rapuh terhadap bahasa.

---

## 2. Konsep Kunci: Tiga Jenis Normalisasi

Kesalahan umum adalah menganggap semua normalisasi bisa diselesaikan dengan "menambah daftar kata". Padahal ada tiga jenis yang sifatnya berbeda:

| Jenis | Butuh kamus? | Bekerja untuk bahasa apa pun? | Contoh |
|---|---|---|---|
| **A. Normalisasi mekanis** | ❌ Tidak | ✅ Ya | `lowercase`, `trim`, hapus tanda baca, buang imbuhan |
| **B. Normalisasi semantik** | ⚠️ Opsional | ✅ Ya (via LLM) | sinonim, sinonim serapan, konteks |
| **C. Penyaringan kata tak berguna** | ✅ Ya | ❌ Terbatas | stopword, kata generik |

**Implikasi desain:** A dan B yang menjadi tulang punggung. C hanya pelengkap.

Penjelasan singkat tiap jenis:

### A. Normalisasi Mekanis (deterministik, bahasa-agnostik)

Aturan yang **tidak perlu tahu arti kata**, hanya bentuknya:

- **Lowercase** — `"Stiker"` → `"stiker"`.
- **Trim & rapikan spasi** — `"  biru  "` → `"biru"`.
- **Hapus tanda baca** — `"stiker-baru"` → `"stiker baru"`.
- **Buang imbuhan umum** — `"tasnya"` → `"tas"`, `"dompetku"` → `"dompet"`.
  Ini bekerja untuk bahasa apa pun yang menempelkan imbuhan (`-nya`, `-ku`, `-mu`, awalan `me-`, `di-`, `ter-`), **tanpa perlu kamus**.

### B. Normalisasi Semantik (LLM sebagai "kamus universal")

Di sinilah **LLM** mengambil peran utama. LLM sudah dilatih pada miliaran teks manusia, jadi ia tahu:

- `"sticker"` = `"stiker"`
- `"hape"` = `"hp"` = `"handphone"`
- `"ujan"` = `"hujan"`
- `"holo"` = `"hologram"`

Tugas prompt: **minta LLM mengeluarkan bentuk baku**, bukan menyerahkan sinonim ke daftar kita. Ini yang membuat sistem tahan terhadap kata yang tidak pernah kita antisipasi.

### C. Penyaringan Kata Tak Berguna (butuh daftar)

Hanya untuk kata yang **jelas tidak membedakan**:

- Stopword: `"ada"`, `"yang"`, `"di"`, `"itu"`.
- Kata generik penilaian: `"bagus"`, `"unik"`, `"mahal"`, `"besar"`.

Daftar ini **sempit** dan **tidak wajib lengkap** — kalau sebuah kata tak ada di daftar, ia dibiarkan lewat (lihat §4).

---

## 3. Peran Stopword vs Canonical Mapping

Keduanya sering disalahpahami sebagai hal yang sama. Padahal **arahnya berlawanan**:

| | Stopword | Canonical Mapping |
|---|---|---|
| Arah operasi | **Membuang** kata | **Mengganti** kata |
| Struktur data | `Set` (daftar) | `Map` (peta pasangan) |
| Fungsi | `tokens.filter(t => !STOP.has(t))` | `tokens.map(t => MAP[t] ?? t)` |
| Contoh | `"yang"` → dibuang | `"sticker"` → `"stiker"` |
| Hasil akhir | kata **hilang** | kata **tetap ada**, berganti nama |
| Tujuan | menghilangkan noise | **menciptakan kesamaan** |

### Analogi

- **Stopword** = membuang sampah dari keranjang.
- **Canonical mapping** = melipat & menyetrika pakaian supaya semua tampak seragam.

### Kesalahan yang harus dihindari

Jangan pernah "menyelesaikan sinonim dengan menambah stopword". Contoh: kalau `"sticker"` dimasukkan ke stopword, maka:
- Pelapor yang menulis `"sticker"` **kehilangan** ciri itu.
- Pelapor yang menulis `"stiker"` **tetap punya** ciri itu.

Akibatnya justru **makin asimetris**. Stopword membuang informasi; canonical mapping menyatukan informasi. Menaikkan jumlah stopword untuk masalah sinonim = memperburuk masalah.

---

## 4. Mengapa Daftar Kata Tidak Boleh Jadi Tulang Punggung

Pertanyaan penting: **"Bagaimana kalau user menulis kata yang tidak ada di daftar kita?"**

Jawaban: **tidak apa-apa, sistem tetap jalan.** Yang terjadi adalah:

- **Stopword tak dikenal** → kata **dibiarkan** (dianggap penting). Tidak merusak.
- **Canonical tak dikenal** → kata **dibiarkan apa adanya**. Tidak merusak.

Daftar yang tidak lengkap hanya berarti kita kehilangan **bonus** (kecocokan ekstra), **bukan kehilangan fungsi**. Tanggung jawab menyatukan makna tetap dipegang LLM.

### Aturan desain

> **Daftar kata = lapisan tambahan (enhancement), bukan tulang punggung (core).**
> Core = normalisasi mekanis (A) + LLM semantik (B).

Konsekuensinya: prioritaskan A dan B. Tambahkan C hanya untuk kasus yang sudah terbukti berulang menimbulkan noise.

---

## 5. Pipeline Normalisasi yang Diusulkan

```
[teks mentah user]
        │
        ▼
┌─────────────────────────────────────────────┐
│ TAHAP 1 — Normalisasi Mekanis (tanpa kamus) │  ← selalu jalan, bahasa-agnostik
│  • lowercase                                 │
│  • trim & rapikan spasi                      │
│  • hapus tanda baca                          │
│  • buang imbuhan umum (-nya, -ku, -mu, ...)  │
└─────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────┐
│ TAHAP 2 — Ekstraksi Semantik (LLM)          │  ← "kamus universal"
│  • buang kata non-fisik (opsional)           │
│  • keluarkan bentuk baku                     │
│  • batasi maksimal MAX_KEYWORDS              │
└─────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────┐
│ TAHAP 3 — Canonical Map kecil (OPSIONAL)    │  ← cadangan untuk variasi dikenal
│  • sinonim yang sudah terbukti berulang      │
└─────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────┐
│ TAHAP 4 — Kanonisasi Final (deterministik)  │
│  • lowercase + trim                          │
│  • deduplikasi                               │
│  • sort A-Z                                  │
│  • potong ke MAX_KEYWORDS                    │
└─────────────────────────────────────────────┘
        │
        ▼
[array keyword canonical — siap di-hash Poseidon]
```

Catatan pemetaan ke kode saat ini:

| Tahap | Modul saat ini | Perlu perubahan? |
|---|---|---|
| 1 | `zk/nlpPreprocess.ts` | Ya — pisahkan bagian mekanis dari stopword; tambah buang imbuhan |
| 2 | `zk/keywordExtractor.ts` | Ya — prompt diperketat (§6) |
| 3 | *belum ada* | Baru (`zk/canonicalKeywords.ts`), opsional |
| 4 | `zk/normalizeKeywords.ts` | Tidak (sudah benar) |

---

## 6. Prompt LLM yang Diperketat

Prompt saat ini (`keywordExtractor.ts`) terlalu longgar: hanya "ambil objek, warna, motif, brand, bahan". Tidak melarang kata generik, tidak menetapkan bentuk tunggal, tidak memberi contoh.

### Prinsip prompt yang baik

1. **Tegaskan determinisme** — "output harus sama untuk makna yang sama".
2. **Tetapkan bentuk baku** — kata dasar, huruf kecil, tanpa imbuhan.
3. **Sertakan pemetaan sinonim eksplisit** — contoh nyata dari domain Lost & Found.
4. **Larang kata generik** — sebutkan daftarnya.
5. **Beri contoh (few-shot)** — ini yang paling ampuh membuat LLM meniru pola.
6. **Format JSON ketat** — sudah ada, pertahankan.

### Contoh prompt versi ketat

```text
Kamu adalah deterministic keyword extractor untuk sistem Lost & Found.
Output HARUS persis sama untuk makna yang sama, apa pun gaya bahasanya.

TUGAS: ekstrak maksimal 5 CIRI FISIK PEMBEDA dari teks.

ATURAN WAJIB:
1. Bentuk kata DASAR/tunggal, huruf kecil, tanpa imbuhan.
   Contoh: "stickernya" -> "stiker"; "dompetku hitam" -> ["dompet","hitam"].
2. Gunakan BENTUK BAKU berikut bila muncul variasi:
   sticker/stiker -> stiker | hape/handphone -> hp | tas/ransel/backpack -> tas
   ujan/hujan -> hujan | casan/charger -> charger | dompet/wallet -> dompet
3. DILARANG kata umum yang tidak membedakan:
   besar, kecil, bagus, unik, cantik, lucu, mahal, murah, baru, lama,
   biasa, umum, barang, mainan.
4. HANYA masukkan ciri yang benar-benar membedakan dari barang sejenis.
5. Jangan mengarang ciri yang tidak ada di teks.
6. Urutkan menaik (A-Z), buang duplikat.

Kembalikan HANYA JSON:
{"keywords": ["ciri1", "ciri2"]}

CONTOH:
Input: "helmnya ada sticker anak geologi sama jas ujan warna biru"
Output: {"keywords": ["biru","geologi","hujan","jas","stiker"]}

Input: "dompet hitam kulit ada logo kuda"
Output: {"keywords": ["hitam","kuda","kulit","logo"]}
```

> **Catatan:** jumlah kata pada contoh (`5`) harus sinkron dengan `MAX_KEYWORDS` yang dipilih. Lihat §9.

---

## 7. Use Case Lengkap

Berikut use case nyata dari aplikasi Lost & Found, untuk menunjukkan **lapisan mana yang bekerja** di tiap situasi.

### Use Case 1 — Variasi Imbuhan (tanpa butuh daftar)

| | Teks |
|---|---|
| Pelapor | `"tasnya hitam ada gantungan"` |
| Pengklaim | `"tas hitam gantungannya"` |

**Lapisan yang bekerja:** Tahap 1 (mekanis, tanpa kamus).
- `"tasnya"` → buang `-nya` → `"tas"`
- `"gantungannya"` → buang `-nya` → `"gantungan"`

**Hasil:** kedua sisi bertemu di `["gantungan","hitam","tas"]` — **tanpa stopword maupun canonical map**. Membuktikan normalisasi mekanis menangani kasus umum ini.

---

### Use Case 2 — Sinonim Serapan (LLM yang kerja)

| | Teks |
|---|---|
| Pelapor | `"ada sticker anak geologi"` |
| Pengklaim | `"stickernya gambar geologi"` |

**Lapisan yang bekerja:** Tahap 2 (LLM).
- LLM tahu `"sticker"` = `"stiker"` → keluarkan `"stiker"` di kedua sisi.
- Canonical map hanya **cadangan** bila LLM meleset.

**Hasil:** kedua sisi → `"stiker"`, `"geologi"` cocok. Tanpa canonical map pun tetap berhasil jika LLM konsisten.

---

### Use Case 3 — Kata Tidak Ada di Daftar (pertanyaan inti)

| | Teks |
|---|---|
| Pelapor | `"botol ada holo anime"` |
| Pengklaim | `"botol hologram anime jepang"` |

**Lapisan yang bekerja:** Tahap 2 (LLM), bukan daftar.
- `"holo"` mungkin tidak ada di stopword/canonical mana pun → **dibiarkan**.
- LLM menormalkan `"holo"`/`"hologram"` → `"hologram"`.
- `"jepang"` (kata ekstra di pengklaim) → **diabaikan**, tidak dihukum (prinsip intersection v2).

**Hasil:** kata tak terdaftar **tidak merusak sistem**. Kekurangan daftar = kehilangan bonus, bukan kehilangan fungsi.

---

### Use Case 4 — Typo Berat & Bahasa Campur

| | Teks |
|---|---|
| Pelapor | `"tas itm ada keychain kuda"` |
| Pengklaim | `"tas warna itam keychain bentuk kuda"` |

**Lapisan yang bekerja:** Tahap 2 (LLM) + jaring pengaman v2.
- `"itm"` vs `"itam"` → LLM biasanya menyimpulkan `"hitam"`.
- Jika LLM gagal: v2 tetap selamat — pengklaim masih match `"tas"` dan `"kuda"` → skor `2/3 = 0.67` → **lolos**.

**Hasil:** v2 menoleransi kegagalan sebagian. Bandingkan dengan v1 (AND-gate) yang akan **gagal total**.

---

### Use Case 5 — Kata Generik (di sini stopword berguna)

| | Teks |
|---|---|
| Pelapor | `"tas besar warna hitam bagus"` |
| Pengklaim | `"tas hitam unik"` |

**Lapisan yang bekerja:** Tahap 3 (penyaringan) / prompt.
- `"besar"`, `"bagus"`, `"unik"` = generik, tidak membedakan.
- Buang kata generik → tersisa `"tas"`, `"hitam"` → kedua sisi cocok.
- Tanpa penyaringan: `"besar"` vs `"unik"` jadi noise yang **menaikkan N pelapor** → **mendilusi skor** (`3/5` lebih buruk dari `2/3`).

**Hasil:** stopword/prompt ketat tetap punya peran **sempit dan jelas**: hanya kata generik.

---

### Rangkuman Pola Use Case

| Use Case | Butuh daftar? | Lapisan penentu |
|---|---|---|
| 1. Imbuhan (`-nya`, `-ku`) | ❌ Tidak | Mekanis (Tahap 1) |
| 2. Sinonim serapan | ⚠️ Opsional | LLM (Tahap 2) |
| 3. Kata tak terdaftar/asing | ❌ Tidak | Dibiarkan → LLM |
| 4. Typo berat | ❌ Tidak | LLM + toleransi skor v2 |
| 5. Kata generik | ✅ Ya (sempit) | Stopword / prompt (Tahap 3) |

---

## 8. Batas Jaminan (Jujur)

LLM bersifat **probabilistik**. Meskipun `temperature = 0`, output untuk dua input yang bermakna sama **bisa berbeda**. Karena itu:

> **Tidak ada jaminan bahwa keyword pelapor dan pengklaim akan 100% identik.**

Yang bisa dilakukan adalah **memperbesar peluang** persamaan lewat kombinasi:
1. Normalisasi mekanis (mengurangi variasi bentuk).
2. Prompt ketat + few-shot + temperature 0 (mengurangi variasi semantik).
3. Canonical map (menutup sisa variasi yang diketahui).
4. **Intersection scoring v2** (menoleransi kegagalan sebagian).

Poin 4 adalah kunci: karena v2 memakai skor proporsional, **satu-dua keyword yang meleset tidak fatal**. Inilah yang membuat sistem tahan terhadap ketidaksempurnaan LLM.

### Framing yang benar untuk juri

Jangan klaim "dijamin identik". Framing yang dapat dipertahankan:

> *"Kami meminimalkan asimetri bahasa lewat pipeline normalisasi deterministik dan prompt terstruktur, lalu menoleransi sisa ketidakpastian melalui intersection scoring — sehingga pemilik sah tetap lolos meski deskripsinya berbeda gaya."*

---

## 9. Rekomendasi Implementasi

### 9.1 Pilihan `MAX_KEYWORDS`

`MAX_KEYWORDS` adalah **batas atas**, bukan target. Analisis membandingkan 5 vs 7:

| Kriteria | N = 5 | N = 7 |
|---|---|---|
| Pemilik sah (tahu 3 ciri) lolos @threshold 0.5 | ✅ 0.6 | ❌ 0.43 |
| Risiko brute-force (300 tebakan) | ~39% | ~50% |
| Beban ZKP worst case (M×N) | 25 iterasi | 49 iterasi |
| Realisme manusia menyebut ciri pembeda | ✅ | ⚠️ keyword jadi generik |

**Rekomendasi: `MAX_KEYWORDS = 5`.** Lebih menghargai pemilik sah dan lebih aman terhadap brute-force daripada 7.

### 9.2 Pilihan `SCORE_THRESHOLD`

Karena skor = `matched / N`, jumlah match yang dibutuhkan = `ceil(N / 2)` untuk threshold 0.5:

| N | Minimal match @0.5 | Skor |
|---|---|---|
| 1 | 1 | 1.0 |
| 2 | 1 | 0.5 |
| 3 | 2 | 0.67 |
| 4 | 2 | 0.5 |
| 5 | 3 | 0.6 |

**Rekomendasi: `SCORE_THRESHOLD = 0.5`** (naik dari 0.33).

> **Peringatan:** jika pelapor hanya menyimpan 1 keyword (N=1), penebak cukup tahu 1 untuk skor 1.0. Karena itu sebaiknya **wajibkan minimal 3 keyword nyata saat report**, agar `ceil(N/2)` tidak pernah jatuh ke 1-dari-1.

### 9.3 Prioritas Pengerjaan

| Prioritas | Pekerjaan | Dampak |
|---|---|---|
| 🔴 Tinggi | Pisahkan normalisasi mekanis dari stopword + buang imbuhan (`nlpPreprocess`) | Menaikkan kecocokan tanpa daftar |
| 🔴 Tinggi | Perketat prompt + few-shot (`keywordExtractor`) | Menaikkan kecocokan sinonim |
| 🟡 Sedang | Samakan `MAX_KEYWORDS = 5` di prompt, schema, frontend | Konsistensi & keamanan |
| 🟡 Sedang | `SCORE_THRESHOLD = 0.5` + minimal 3 keyword saat report | Keamanan |
| 🟢 Rendah | `zk/canonicalKeywords.ts` (map kecil opsional) | Menutup variasi dikenal |

---

## 10. Checklist Implementasi

```
TAHAP 1 — Normalisasi Mekanis
  [ ] Pisahkan stopword dari logika mekanis di nlpPreprocess.ts
  [ ] Tambah stripCommonAffixes() -> buang -nya, -ku, -mu, awalan me-/di-
  [ ] Pastikan tanda baca & spasi rapi
  [ ] Uji: "tasnya" == "tas", "dompetku" == "dompet"

TAHAP 2 — Prompt LLM Ketat
  [ ] Ganti prompt di keywordExtractor.ts dengan versi §6
  [ ] Sertakan 2+ contoh few-shot
  [ ] Sinkronkan angka pada contoh dengan MAX_KEYWORDS

TAHAP 3 — Canonical Map (opsional)
  [ ] Buat zk/canonicalKeywords.ts (Map sinonim)
  [ ] Terapkan SETELAH ekstraksi, SEBELUM normalizeKeywords
  [ ] Isi hanya sinonim yang terbukti berulang di data nyata

TAHAP 4 — Konstanta Bersama
  [ ] MAX_KEYWORDS = 5 (satu sumber, dipakai prompt + schema + frontend)
  [ ] SCORE_THRESHOLD = 0.5
  [ ] Minimal 3 keyword nyata saat report

TAHAP 5 — Pengujian
  [ ] Test imbuhan: kedua sisi bertemu tanpa daftar
  [ ] Test sinonim: "sticker"/"stiker" cocok
  [ ] Test kata asing: tidak merusak, minimal diabaikan
  [ ] Test typo: skor tetap >= threshold via sebagian match
  [ ] Test kata generik: tersaring, skor tidak terdilusi
```

---

## Referensi

| Dokumen | Isi |
|---|---|
| [`zkp_v2_intersection_scoring.md`](./zkp_v2_intersection_scoring.md) | Desain inti ZKP v2 (N-commitment + intersection scoring) |
| [`backend_zkp_summary.md`](../v1/backend_zkp_summary.md) | Ringkasan integrasi ZKP di backend (v1) |
| [`technical_flow_guide.md`](../v1/technical_flow_guide.md) | Solusi problem teknis Tri-Layer Lock (v1) |
| [`analisis_tri_layer_lock.md`](../v1/analisis_tri_layer_lock.md) | Analisis fundamental arsitektur (v1) |
