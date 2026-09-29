# ZKP v1 → v2: Ringkasan Lengkap

> Berdasarkan 3 file di [`docs/v2/`](./): [`zkp_v2_intersection_scoring.md`](./zkp_v2_intersection_scoring.md), [`zkp_v2_implementation_report.md`](./zkp_v2_implementation_report.md), [`keyword_extraction_strategy.md`](./keyword_extraction_strategy.md)

---

## 1. Konteks: Sistem Ini Ngapain?

Lost & Found pakai **Zero-Knowledge Proof (ZKP)** untuk verifikasi klaim barang. Idenya:
- Pelapor (penemu) simpan barang → nulis deskripsi → sistem ekstrak **keyword** → hash tiap keyword pakai Poseidon → simpan **commitment** (hash-nya aja, bukan keyword aslinya)
- Pengklaim (pemilik asli) → nulis deskripsi dari ingatannya → sistem ekstrak keyword → generate ZK-proof bahwa dia tahu secret yang menghasilkan hash yang sama
- Backend verifikasi proof → kalau cocok, klaim diterima → Gale-Shapley tentukan pemenang kalau ada banyak pengklaim

**Kuncinya:** Backend tidak pernah lihat keyword asli. Hanya proof kriptografi yang dikirim. Tapi sistem ini hanya bekerja kalau keyword dari kedua sisi **identik** — karena 1 karakter beda = hash beda total (*avalanche effect* dari Poseidon).

---

## 2. Problem di v1: Dua Kegagalan Fatal

### Problem A — Dummy Padding Menghukum Orang yang Tahu Lebih Banyak

v1 memaksa semua item punya tepat **3 commitment**. Kalau keyword nyata < 3, di-pad dengan `__empty__`:

```
SKENARIO: Gantungan kunci sederhana

Pelapor nulis  : "gantungan kunci"
LLM extract    : ["gantungan"]       ← hanya 1 keyword nyata
Padding v1     : ["__empty__", "__empty__", "gantungan"]
Commitment db  : [H("__empty__"), H("__empty__"), H("gantungan")]

Pengklaim nulis : "gantungan kunci coding camp"
LLM extract     : ["camp", "coding", "gantungan"]   ← 3 keyword nyata, lebih detail!
ZKP check (AND) :
  H("camp")      vs H("__empty__") → ❌ GAGAL
  H("coding")    vs H("__empty__") → ❌ GAGAL
  H("gantungan") vs H("gantungan") → ✅ OK

HASIL AKHIR: ❌ GAGAL TOTAL
```

**Ironisnya:** Pengklaim yang tahu **lebih banyak** dari yang dilaporkan malah dihukum gagal karena pengetahuannya "tidak cocok" dengan slot dummy. Ini bug desain fundamental.

---

### Problem B — AND-gate Absolut Tidak Realistis

Pelapor adalah **penemu** barang — mereka lihat dari luar dan catat apa yang tampak. Pengklaim adalah **pemilik** — mereka ingat detail yang mungkin tidak tampak dari luar. Dua perspektif ini hampir mustahil menghasilkan keyword identik 100%.

```
Contoh asimetri perspektif:
  Pelapor   : "tas hitam, ada sticker, ada gantungan"
  Pengklaim : "tas hitam kulit, stiker geologi UGM, keychain kuda"

v1: "sticker" ≠ "stiker" → hash beda → GAGAL
    "gantungan" ≠ "keychain" → hash beda → GAGAL
    Satu pun tidak lolos AND-gate → GAGAL TOTAL
```

Satu kata beda = seluruh klaim gagal. Tidak ada toleransi sama sekali.

---

## 3. Solusi v2: Ganti Arsitektur dari AND-gate ke Intersection Scoring

### Perubahan Circuit

v1 pakai **1 circuit** untuk 3 keyword sekaligus dengan AND-gate:
```
ownership_proof.circom:
  Poseidon(keyword1) === commitment1  AND
  Poseidon(keyword2) === commitment2  AND
  Poseidon(keyword3) === commitment3
```

v2 pakai **circuit jauh lebih sederhana**, hanya 1 keyword per proof:
```circom
// single_keyword_proof.circom
template SingleKeywordProof() {
    signal input secret;       // private: 1 keyword saja
    signal input target_hash;  // public: 1 commitment saja

    component h = Poseidon(1);
    h.inputs[0] <== secret;
    h.out === target_hash;    // hanya 1 constraint
}
```

Backend kemudian iterasi semua kombinasi `(keyword_pengklaim × commitment_pelapor)` dan hitung berapa yang match.

### Formula Scoring

```
Score = jumlah_commitment_yang_terbukti / total_commitment_pelapor

Contoh:
  Reporter commit  : {H("gantungan"), H("hitam"), H("kuda")}   N = 3
  Claimer keywords : {H("coding"), H("gantungan"), H("hitam")} M = 3

  Iterasi:
    H("coding")    vs H("gantungan") → ❌
    H("coding")    vs H("hitam")     → ❌
    H("coding")    vs H("kuda")      → ❌
    H("gantungan") vs H("gantungan") → ✅ match index 0
    H("hitam")     vs H("hitam")     → ✅ match index 1
    H("kuda")      → tidak ada keyword claimer yang cocok → ❌

  matched = 2, total = 3
  Score = 2/3 = 0.667 → ≥ threshold 0.5 → LOLOS ✅

  Keyword "coding" yang ekstra → diabaikan, tidak dihukum
```

### Perbandingan Lengkap v1 vs v2

| Aspek | v1 | v2 |
|---|---|---|
| Circuit | `ownership_proof.circom` (3 input AND) | `single_keyword_proof.circom` (1 input) |
| Dummy keyword | Ya (`__empty__`) | ❌ Dihapus |
| Jumlah commitment | Paksa = 3 | Bebas N (3–5) |
| Cara klaim | 1x `fullProve()` untuk semua | Nx `fullProve()` per keyword |
| Hasil verifikasi | Boolean (pass/fail) | Float score (0.0–1.0) |
| Tiebreaker Gale-Shapley | Timestamp saja | Score dulu → baru Timestamp |
| Pengklaim lebih detail | Dihukum FAIL | Diuntungkan (skor lebih tinggi) |
| Kompleksitas circuit | Tinggi (3 Poseidon + AND) | Rendah (1 Poseidon) |
| Keadilan sistem | Kaku/biner | Proporsional |

---

## 4. Masalah Baru yang Muncul Setelah v2 Berjalan

Setelah arsitektur v2 diimplementasikan, muncul masalah berikutnya: **hash masih beda** walaupun tidak ada AND-gate lagi, karena variasi bahasa manusia:

```
Pelapor   ekstrak : ["tasnya", "hitam", "gantungan"]
Pengklaim ekstrak : ["tas", "hitam", "gantungannya"]

Poseidon("tasnya")      ≠ Poseidon("tas")          → tidak match
Poseidon("gantungannya") ≠ Poseidon("gantungan")   → tidak match

Score = 1/3 = 0.33 → di bawah threshold → GAGAL
Padahal kedua orang ngomongin barang yang sama!
```

Ini yang memicu 7 perbaikan teknis + strategi normalisasi keyword 3 layer.

---

## 5. Strategi Normalisasi Keyword: 3 Layer

Tujuannya: **memaksimalkan peluang keyword dari kedua sisi identik**, tanpa bergantung pada daftar kata yang tidak mungkin lengkap.

```
[teks mentah user]
        │
        ▼
┌─────────────────────────────────────────────┐
│ LAYER A — Normalisasi Mekanis (tanpa kamus) │  ← selalu jalan, bahasa-agnostik
│  • lowercase                                │
│  • trim & rapikan spasi                     │
│  • hapus tanda baca                         │
│  • buang imbuhan (-nya, -ku, -mu, me-, di-) │
└─────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────┐
│ LAYER B — LLM sebagai Kamus Universal       │  ← handle sinonim & typo
│  • keluarkan bentuk baku                    │
│  • handle sinonim serapan                   │
│  • buang kata non-fisik                     │
│  • batasi MAX_KEYWORDS                      │
└─────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────┐
│ LAYER C — Canonical Map kecil (OPSIONAL)    │  ← cadangan, belum dibuat
│  • sinonim yang sudah terbukti berulang     │
└─────────────────────────────────────────────┘
        │
        ▼
[Kanonisasi final: lowercase, dedup, sort A-Z, potong ke MAX_KEYWORDS]
        │
        ▼
[array keyword canonical → siap di-hash Poseidon]
```

**Filosofi kunci:** Layer A & B adalah tulang punggung. Layer C hanya enhancement.
> Daftar kata yang tidak lengkap = kehilangan **bonus**, bukan kehilangan **fungsi**.

---

## 6. Test Case: 5 Skenario Nyata

---

### Test Case 1 — Variasi Imbuhan Bahasa Indonesia

**Skenario:** Pelapor dan pengklaim nulis kata yang sama tapi beda imbuhan.

| | Teks |
|---|---|
| Pelapor | `"tasnya hitam ada gantungan"` |
| Pengklaim | `"tas hitam gantungannya"` |

**Layer yang bekerja:** Layer A saja — tanpa kamus, tanpa LLM.
```
"tasnya"       → buang -nya → "tas"
"gantungan"    → tidak ada imbuhan → "gantungan"
"gantungannya" → buang -nya → "gantungan"
```

**Hasil kedua sisi:**
```
Pelapor  : ["gantungan", "hitam", "tas"]
Pengklaim: ["gantungan", "hitam", "tas"]
                           ↕
              IDENTIK → hash cocok semua → score 1.0 ✅
```

**Poin penting:** Ini kasus yang paling sering terjadi dalam bahasa Indonesia. Dan sepenuhnya bisa ditangani tanpa daftar kata apapun — hanya aturan mekanis buang imbuhan.

---

### Test Case 2 — Sinonim Serapan (Ejaan Berbeda)

**Skenario:** Kata yang sama secara makna tapi beda ejaan — satu pakai bahasa Inggris, satu pakai serapan Indonesia.

| | Teks |
|---|---|
| Pelapor | `"ada sticker anak geologi"` |
| Pengklaim | `"stickernya gambar geologi"` |

**Layer yang bekerja:** Layer B (LLM).
```
"sticker"    → LLM: ini sama dengan "stiker" → output "stiker"
"stiker"     → LLM: bentuk baku → output "stiker"
"stickernya" → Layer A dulu: buang -nya → "stiker" → LLM konfirmasi → "stiker"
"anak"       → LLM: bukan ciri fisik pembeda → dibuang
"gambar"     → LLM: generik → dibuang
```

**Hasil kedua sisi:**
```
Pelapor  : ["geologi", "stiker"]
Pengklaim: ["geologi", "stiker"]
                  ↕
         IDENTIK → score 1.0 ✅
```

**Poin penting:** Tanpa LLM, `"sticker"` dan `"stiker"` tidak akan pernah match karena hash-nya pasti beda. LLM berfungsi sebagai "kamus universal" yang tahu equivalensi ini tanpa kita perlu hardcode daftar sinonim.

---

### Test Case 3 — Kata yang Tidak Ada di Daftar Manapun

**Skenario:** User pakai kata informal / singkatan yang tidak mungkin ada di database kita.

| | Teks |
|---|---|
| Pelapor | `"botol ada holo anime"` |
| Pengklaim | `"botol hologram anime jepang"` |

**Layer yang bekerja:** Layer B (LLM) + toleransi skor v2.
```
"holo"     → tidak ada di stopword, tidak ada di canonical map → dibiarkan
           → LLM: tahu "holo" = "hologram" → output "hologram"
"hologram" → LLM: output "hologram"
"jepang"   → kata ekstra di pengklaim → diabaikan (prinsip intersection: tidak dihukum)
```

**Hasil:**
```
Pelapor  : ["anime", "botol", "hologram"]
Pengklaim: ["anime", "botol", "hologram"]   ("jepang" diabaikan karena tidak ada di commitment)
                        ↕
              IDENTIK → score 1.0 ✅
```

**Poin penting:** Ini jawaban untuk pertanyaan "bagaimana kalau user nulis kata yang tidak ada di daftar kita?" — sistem tidak rusak. Kalau LLM bisa normalkan, bagus. Kalau tidak bisa, kata itu tetap lewat sebagaimana adanya, dan v2 masih toleransi partial match.

---

### Test Case 4 — Typo Berat & Bahasa Campur

**Skenario:** Input ada typo yang cukup parah, bahasa campur informal.

| | Teks |
|---|---|
| Pelapor | `"tas itm ada keychain kuda"` |
| Pengklaim | `"tas warna itam keychain bentuk kuda"` |

**Layer yang bekerja:** Layer B (LLM) + jaring pengaman skor v2.
```
"itm"  → typo dari "hitam"
"itam" → typo dari "hitam"
LLM biasanya bisa simpulkan keduanya → "hitam"

Kalau LLM gagal normalkan typo:
  "itm" ≠ "itam" → tidak match
  Tapi "tas" ✅ match, "kuda" ✅ match, "keychain" ✅ match
  Score = 3/4 = 0.75 → ≥ threshold 0.5 → TETAP LOLOS ✅
```

**Hasil (worst case, LLM gagal handle typo):**
```
Pelapor  : ["itm", "kuda", "keychain", "tas"]   N=4 commitment
Pengklaim: ["itam", "kuda", "keychain", "tas"]
  matched = 3 (kuda, keychain, tas)
  score = 3/4 = 0.75 ✅
```

**Poin penting:** Ini menunjukkan kenapa intersection scoring v2 sangat penting. Di v1, typo satu kata = gagal total. Di v2, typo itu hanya mengurangi skor — sistem masih bisa lolos kalau ciri lain cocok.

---

### Test Case 5 — Kata Generik (Peran Stopword)

**Skenario:** User masukin kata yang tidak membedakan barang — siapapun bisa nebak ini.

| | Teks |
|---|---|
| Pelapor | `"tas besar warna hitam bagus"` |
| Pengklaim | `"tas hitam unik"` |

**Layer yang bekerja:** Layer C (stopword/prompt) — ini satu-satunya use case di mana stopword punya peran jelas.
```
Tanpa filter kata generik:
  Pelapor commit : ["bagus", "besar", "hitam", "tas"]   N=4
  Pengklaim match: ["hitam", "tas"]                     matched=2
  Score = 2/4 = 0.5 → barely lolos, skor terdilusi

Dengan filter kata generik ("besar", "bagus", "unik" dibuang oleh prompt LLM):
  Pelapor commit : ["hitam", "tas"]   N=2
  Pengklaim match: ["hitam", "tas"]   matched=2
  Score = 2/2 = 1.0 ✅ skor lebih akurat
```

**Poin penting:** Kata generik tidak merusak sistem, tapi mereka **mendilusi skor** dan **memudahkan brute force** (karena N bertambah dengan kata yang mudah ditebak). Prompt LLM yang melarang kata generik menyelesaikan ini lebih efektif dari daftar stopword manual.

---

### Rangkuman Test Case

| Use Case | Problem | Layer Solusi | Tanpa layer itu? |
|---|---|---|---|
| 1. Imbuhan `-nya/-ku` | `tasnya` ≠ `tas` | Layer A (mekanis) | Tidak match, score turun |
| 2. Sinonim serapan `sticker`/`stiker` | Hash beda | Layer B (LLM) | Tidak match, score turun |
| 3. Kata informal `holo`/`hologram` | Tidak ada di daftar | Layer B (LLM) | Dibiarkan lewat, tidak rusak |
| 4. Typo berat `itm`/`itam` | Hash beda | Layer B + toleransi v2 | Skor turun tapi mungkin masih lolos |
| 5. Kata generik `bagus`, `besar` | Mendilusi skor | Layer C / Prompt | Skor terdilusi, lebih mudah brute-force |

---

## 7. 7 Perbaikan Teknis Post-Migrasi

Setelah arsitektur v2 berjalan, ini bug dan improvement yang dikerjakan:

### Fix 1 — Bug `targetItem` Before Declaration

- **File:** `web/src/lib/components/ClaimModal.svelte`
- **Problem:** `submitLabel` di baris 16 pakai `targetItem` yang baru dideklarasi baris 19 → `svelte-check` error: *"Block-scoped variable used before its declaration"*
- **Fix:** Pindahkan deklarasi `targetItem` ke atas `submitLabel`
- **Kenapa kritis:** Ini satu-satunya error yang blokir `npm run check` — harus beres dulu sebelum bisa verifikasi perbaikan lain

### Fix 2 — File ZKP di Lokasi Salah

- **Problem:** File `.wasm` & `.zkey` ada di **dua tempat**:
  - `web/public/zk/` → **tidak dipakai** SvelteKit (SvelteKit pakai `static/`, bukan `public/`)
  - `web/static/zk/` → lokasi yang benar
  - Akibatnya: `public/` jadi file mati yang ikut ter-commit, `static/zk/` malah untracked
- **Fix:** Hapus `web/public/`, track `web/static/zk/single_keyword_proof.*`

### Fix 3 — Normalisasi Imbuhan di `nlpPreprocess.ts`

- **File:** `server/src/zk/nlpPreprocess.ts`
- **Problem:** `nlpPreprocess.ts` campur aduk dua hal yang sifatnya beda — normalisasi mekanis dan filtering stopword. Akibatnya imbuhan tidak dibuang.
- **Fix:** Pisahkan jadi 2 bagian jelas:
  ```
  A. Normalisasi MEKANIS (tanpa kamus, bahasa-agnostik):
     lowercase, rapikan spasi, hapus tanda baca
     buang imbuhan: akhiran -nya/-ku/-mu, awalan me-/di-/ter-/ber-/pe-

  B. Penyaringan STOPWORD (butuh daftar, sempit):
     hanya kata yang jelas tidak membedakan
  ```
- **Bug ditemukan saat implementasi:** `stripPrefix` lupa cek `startsWith` → motong sembarang kata:
  ```
  Sebelum fix: "hujan" → "jan"     (prefix "me-" dipotong dari mana saja!)
               "gantungan" → "ungan"
               "dompet" → "pet"
  Sesudah fix: "hujan" → "hujan"   ✅ (tidak ada prefix yang cocok)
               "membawa" → "bawa"  ✅ (me- yang valid)
  ```
- **Hasil uji normalisasi:**
  ```
  tasnya       → tas
  dompetku     → dompet
  gantungannya → gantungan
  helmnya      → helm
  hujan        → hujan         ← tidak berubah (bukan imbuhan)
  membawa      → bawa
  dibawa       → bawa          ← me-/di- keduanya → bentuk dasar sama

  "tasnya hitam ada gantungannya" → "tas hitam gantungan"
  ```

### Fix 4 — Prompt LLM Ketat + Few-Shot

- **Problem:** Prompt lama terlalu longgar: hanya "ambil objek, warna, motif, brand, bahan". Tidak ada aturan bentuk baku, tidak ada larangan kata generik, tidak ada contoh → LLM bisa output `"stickernya"` di satu sisi dan `"stiker"` di sisi lain
- **Fix:** Prompt baru dengan 5 elemen kunci:
  1. Penegasan determinisme: *"output harus sama untuk makna yang sama"*
  2. Bentuk kata dasar/tunggal, huruf kecil, tanpa imbuhan
  3. Peta sinonim eksplisit: `sticker/stiker → stiker`, `hape/hp → hp`, `ujan/hujan → hujan`, `casan/charger → charger`
  4. Larangan kata generik: `besar, kecil, bagus, unik, cantik, mahal, baru, lama`
  5. **2 contoh few-shot** — ini yang paling ampuh membuat LLM konsisten

### Fix 5 — `MAX_KEYWORDS` 7→5 + `MIN_KEYWORDS=3` + Guard di Report

- **Problem 1:** `MAX_KEYWORDS=7` terlalu besar. Pemilik sah yang ingat 3 ciri dapat skor 3/7 = 0.43 → tidak lolos threshold 0.5 → sistem tidak adil untuk pemilik sah
- **Problem 2:** Tidak ada batas bawah — pelapor bisa simpan N=1 keyword. Pengklaim cukup tebak 1 kata untuk score 1.0 → sistem trivial ditembus
- **Fix:**
  ```typescript
  export const MAX_KEYWORDS = 5;  // batas atas
  export const MIN_KEYWORDS = 3;  // batas bawah saat report
  ```
  Kalau keyword nyata < 3 saat report → tolak dengan pesan error ke pelapor
- **Kenapa 5 bukan 7:**

  | Kriteria | N=5 | N=7 |
  |---|---|---|
  | Pemilik sah (tahu 3 ciri) lolos @0.5 | ✅ skor 0.6 | ❌ skor 0.43 |
  | Risiko brute-force (300 tebakan) | ~39% | ~50% |
  | Beban ZKP worst case (M×N proof) | 25 iterasi | 49 iterasi |
  | Realisme manusia nyebut ciri pembeda | ✅ | ⚠️ keyword mulai jadi generik |

### Fix 6 — `SCORE_THRESHOLD` 0.33→0.5 + Label Confidence

- **Problem:** Threshold 0.33 terlalu longgar — N=3 cukup 1 match untuk lolos. Siapapun yang bisa nebak 1 ciri bisa klaim. Label confidence juga pakai ambang lama (0.67/0.33) yang tidak konsisten
- **Fix:**
  ```typescript
  const SCORE_THRESHOLD = 0.5;
  confidence: score >= 0.8 ? 'Tinggi' : score >= 0.5 ? 'Sedang' : 'Rendah'
  ```
- Threshold 0.5 artinya harus buktikan minimal `ceil(N/2)` commitment:

  | N | Minimal match @0.5 |
  |---|---|
  | 3 | 2 dari 3 |
  | 4 | 2 dari 4 |
  | 5 | 3 dari 5 |

### Fix 7 — Tampilan Skor di UI

- **File:** `web/src/lib/components/ClaimsReviewModal.svelte`
- **Problem:** `claim.score` bertipe float 0–1, tapi template tulis `{claim.score}%` → tampil `0.667%` bukan `67%`
- **Fix:**
  ```svelte
  AI: {claim.confidence} ({(claim.score * 100).toFixed(0)}%)
  ```

---

## 8. Status Current State Sistem

### ✅ Yang Sudah Berjalan (Verified)

| Komponen | Status |
|---|---|
| Circuit baru `single_keyword_proof.circom` | ✅ Compiled & deployed di `web/static/zk/` |
| Normalisasi imbuhan bahasa Indonesia | ✅ `nlpPreprocess.ts` — terpisah dari stopword |
| Prompt LLM ketat + few-shot | ✅ `keywordExtractor.ts` |
| `MAX_KEYWORDS=5`, `MIN_KEYWORDS=3` | ✅ `normalizeKeywords.ts` + guard di `report.handler.ts` |
| `SCORE_THRESHOLD=0.5` + label confidence | ✅ `claim.handler.ts` |
| Skor tampil dalam persen | ✅ `ClaimsReviewModal.svelte` |
| File ZKP di `web/static/zk/` saja | ✅ `web/public/` dihapus |
| TypeScript server: 0 error | ✅ `tsc --noEmit` |
| Svelte web: 0 error, 0 warning | ✅ `svelte-check` |

### Alur Current State (End-to-End)

```
REPORT FLOW (Pelapor):
  1. User input deskripsi barang
  2. nlpPreprocess → normalisasi mekanis (imbuhan dibuang)
  3. LLM extract → keyword baku, max 5, tanpa kata generik
  4. Guard: keywords.length < 3 → tolak dengan error message
  5. normalizeKeywords → dedup, sort A-Z, potong ke 5
  6. Poseidon hash per keyword → simpan array commitments (keyword asli dibuang)

CLAIM FLOW (Pengklaim):
  1. User input deskripsi dari ingatan
  2. Pipeline normalisasi yang sama (nlpPreprocess + LLM)
  3. ClaimModal: loop fullProve() per kombinasi (keyword × commitment)
     → fullProve berhasil = match, push ke proofs array
     → fullProve exception = tidak cocok, lanjut
  4. Kirim array proofs ke backend
  5. Backend verifikasi per proof: range check + publicSignal check + groth16.verify()
  6. Score = matched / total_commitments_pelapor
  7. Score < 0.5 → emit 'claim_error'
  8. Score ≥ 0.5 → masuk dispute window dengan score tersimpan
  9. Setelah 1 menit → Gale-Shapley: sort by score DESC, tiebreak by createdAt ASC
  10. Pemenang = approved, lainnya = rejected
```
