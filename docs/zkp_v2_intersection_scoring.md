# ZKP v2: N-Commitment + Intersection Scoring + Gale-Shapley Bobot

> **Status:** Rencana Implementasi (Belum Dieksekusi)
> **Tujuan:** Menggantikan arsitektur ZKP v1 (AND-gate biner) dengan sistem yang lebih toleran terhadap asimetri pengetahuan antara pelapor dan pengklaim, tanpa mengorbankan esensi kriptografi Zero-Knowledge Proof.

---

## 1. Latar Belakang & Masalah yang Dipecahkan

### Masalah di ZKP v1 (Sistem Sekarang)

Sistem ZKP v1 mengharuskan **3 keyword yang SAMA PERSIS** antara sisi pelapor dan sisi pengklaim. Karena padding dengan dummy `__empty__` dan AND-gate absolut, terjadi dua kegagalan:

**Kegagalan A: Dummy padding menghukum pengklaim yang lebih detail**

```
PELAPOR nulis: "gantungan kunci"
LLM extract  : ["gantungan"]  -- 1 keyword nyata
Padding      : ["__empty__", "__empty__", "gantungan"]
Commitment   : [H("__empty__"), H("__empty__"), H("gantungan")]

PENGKLAIM nulis: "gantungan kunci coding camp"
LLM extract    : ["camp", "coding", "gantungan"]  -- 3 keyword nyata
ZKP check      :
  H("camp")      vs H("__empty__") → GAGAL
  H("coding")    vs H("__empty__") → GAGAL
  H("gantungan") vs H("gantungan") → OK

HASIL: GAGAL — padahal pengklaim terbukti tahu lebih banyak dari pelapor.
```

**Kegagalan B: Asimetri perspektif pelapor vs pengklaim**

Pelapor (penemu) melihat barang dari luar dan mencatat apa yang tampak. Pengklaim (pemilik) mengingat detail spesifik yang hanya dia tahu. Dua perspektif ini akan hampir selalu menghasilkan keyword yang **berbeda namun sama-sama valid**.

---

## 2. Konsep Inti ZKP v2

### Prinsip Utama: Intersection over Union

Alih-alih menuntut semua keyword cocok (AND-gate), sistem baru mengukur **berapa banyak commitment pelapor yang berhasil dibuktikan oleh pengklaim**.

```
Score = |claimer_keyword_hashes ∩ reporter_commitments| / |reporter_commitments|

Contoh:
  Reporter commit   : {H("gantungan"), H("hitam"), H("kuda")}  -- N = 3
  Claimer keywords  : {H("camp"), H("gantungan"), H("hitam")}  -- M = 3
  Intersection      : {H("gantungan"), H("hitam")}             -- match = 2

  Score = 2/3 = 0.667
```

Pengklaim yang mengetahui **lebih banyak** dari yang dicommit pelapor mendapat skor sempurna.
Pengklaim yang hanya mengetahui sebagian mendapat skor proporsional.
Keyword ekstra milik pengklaim yang tidak ada di commitment **diabaikan, tidak dihukum**.

### Perubahan Filosofi

| Aspek | v1 (AND-gate) | v2 (Intersection) |
|---|---|---|
| Dummy padding | Ya (`__empty__`) | **Tidak** — hanya keyword nyata |
| Jumlah keyword | Paksa 3 | Bebas (1–7) |
| Cara verifikasi | 1 proof untuk semua sekaligus | 1 proof per keyword |
| Hasil verifikasi | Boolean (pass/fail) | Float score (0.0–1.0) |
| Input Gale-Shapley | Timestamp saja | **Score + Timestamp** |

---

## 3. Alur Lengkap Baru

### 3.1 Report Phase (Pelapor Menyimpan Barang)

```
User input: "tas hitam, gambar kuda kecil, gantungan kunci coding camp"
                         ↓
              [LLM Extract — tanpa batas 3]
                         ↓
     keywords = ["gantungan", "hitam", "kuda"]  -- N keyword nyata (tanpa dummy)
                         ↓
     [stringToFieldElement per keyword]
     field_elements = [F("gantungan"), F("hitam"), F("kuda")]
                         ↓
     [Poseidon per field element]
     commitments = [H_gantungan, H_hitam, H_kuda]  -- array panjang N
                         ↓
     Database menyimpan: { commitments: [H_gantungan, H_hitam, H_kuda] }
     -- Keyword asli dan field element DIBUANG setelah hashing
```

> **Perubahan dari v1:** `normalizeKeywords.ts` tidak lagi melakukan padding ke panjang tetap 3. Fungsi hanya mendeduplicasi, lowercase, dan sort. Panjang array output = jumlah keyword nyata.

---

### 3.2 Claim Phase (Pengklaim Membuktikan Dirinya di Browser)

```
User input: "tas hitam ada gantungan kunci sama stiker coding"
                         ↓
              [POST /api/extract ke backend]
              Backend ekstrak via LLM:
              keywords = ["coding", "gantungan", "hitam"]  -- M keyword nyata
                         ↓
              [stringToFieldElement per keyword — inline di ClaimModal]
              field_elements = [F("coding"), F("gantungan"), F("hitam")]
                         ↓
   Untuk SETIAP pasangan (claimer_keyword x reporter_commitment):

   Proof_1: "Saya tahu secret s.t. Poseidon(s) = H_gantungan?"
            secret = "gantungan" → H("gantungan") = H_gantungan OK

   Proof_2: "Saya tahu secret s.t. Poseidon(s) = H_hitam?"
            secret = "hitam"     → H("hitam") = H_hitam OK

   Proof_3: "Saya tahu secret s.t. Poseidon(s) = H_kuda?"
            secret = "coding"    → H("coding") ≠ H_kuda GAGAL
            secret = "hitam"     → H("hitam")  ≠ H_kuda GAGAL
            secret = "gantungan" → H("gantungan") ≠ H_kuda GAGAL
            (tidak ada keyword claimer yang cocok dengan H_kuda)
                         ↓
   proofs = [
     { commitmentIndex: 0, proof: Proof_gantungan, publicSignal: H_gantungan },
     { commitmentIndex: 1, proof: Proof_hitam,     publicSignal: H_hitam     },
   ]
   -- Hanya proof yang BERHASIL digenerate yang dikirim ke backend
   -- Keyword "coding" yang tidak cocok tidak menghasilkan proof manapun
```

> **Catatan teknis:** Sirkuit yang digunakan untuk v2 jauh lebih sederhana dari v1. Hanya 1 private input (secret) dan 1 public input (target_hash). Output: constraint `Poseidon(secret) === target_hash`.

---

### 3.3 Backend Verification & Scoring

```
Backend menerima: { itemId, proofs: [{ commitmentIndex, proof, publicSignal }, ...] }
                         ↓
[Validasi 1: commitmentIndex dalam range]
  proofs[0].commitmentIndex = 0 → item.commitments[0] = H_gantungan OK
  proofs[1].commitmentIndex = 1 → item.commitments[1] = H_hitam OK
                         ↓
[Validasi 2: publicSignal cocok dengan commitment di database]
  proofs[0].publicSignal === item.commitments[0] ? OK
  proofs[1].publicSignal === item.commitments[1] ? OK
                         ↓
[Validasi 3: snarkjs.verify() per proof]
  groth16.verify(vKey, [proofs[0].publicSignal], proofs[0].proof) → true OK
  groth16.verify(vKey, [proofs[1].publicSignal], proofs[1].proof) → true OK
                         ↓
[Hitung Score]
  matched_commitments = 2  (index 0 dan 1 verified)
  total_commitments   = 3  (dari item.commitments.length)
  score = 2/3 = 0.667
                         ↓
[Threshold check]
  score >= 0.33?  → YES → klaim diterima ke Dispute Window dengan score 0.667
  score < 0.33?   → NO  → emit 'claim_error', klaim ditolak langsung
```

> **Threshold 0.33** berarti minimal 1 dari setiap 3 commitment harus terbukti. Untuk konteks hackathon, threshold yang lebih tinggi (0.5) mungkin lebih aman.

---

### 3.4 Dispute Window & Gale-Shapley dengan Score

```
Item: "tas hitam"
commitments: [H_gantungan, H_hitam, H_kuda]  (N=3)
Dispute Window: 1 menit

Kandidat yang masuk selama window:

  Prover A: match={gantungan, hitam}        → score=0.667, createdAt: 00:31:05
  Prover B: match={hitam}                   → score=0.333, createdAt: 00:31:12
  Prover C: match={gantungan, hitam, kuda}  → score=1.0,   createdAt: 00:31:58

Gale-Shapley ranking (Primary: score DESC, Secondary: createdAt ASC):
  1. Prover C → score 1.0    → WINNER → status: approved
  2. Prover A → score 0.667  → LOSER  → status: rejected
  3. Prover B → score 0.333  → LOSER  → status: rejected

Item → status: resolved
```

> **Logika tiebreaker:** Jika dua prover memiliki score sama, timestamp yang lebih awal menang. Ini mempertahankan keadilan sekaligus memberi insentif untuk segera mengklaim.

---

## 4. Perubahan File yang Diperlukan

### 4.1 Sirkuit Baru: `single_keyword_proof.circom`

Menggantikan `ownership_proof.circom` (3 input sekaligus):

```circom
pragma circom 2.0.0;
include "../../node_modules/circomlib/circuits/poseidon.circom";

// Sirkuit single-keyword: buktikan pengetahuan 1 keyword
// jauh lebih sederhana dari v1
template SingleKeywordProof() {
    signal input secret;       // private: field element dari keyword
    signal input target_hash;  // public: commitment dari pelapor

    component h = Poseidon(1);
    h.inputs[0] <== secret;
    h.out === target_hash;
}

component main {public [target_hash]} = SingleKeywordProof();
```

> **Keuntungan:** Sirkuit ini jauh lebih kecil — compile lebih cepat, `fullProve()` di browser lebih ringan per iterasi.

---

### 4.2 `normalizeKeywords.ts` — Hapus Padding

```typescript
// SEBELUM (v1):
export const MAX_KEYWORDS = 3;
export const DUMMY_KEYWORD = '__empty__';

export function normalizeKeywords(keywords: string[]): string[] {
  const cleaned = keywords.map(...).filter(...).sort();
  while (cleaned.length < MAX_KEYWORDS) cleaned.push(DUMMY_KEYWORD);
  return cleaned.slice(0, MAX_KEYWORDS);
}

// SESUDAH (v2):
export const MAX_KEYWORDS = 7;  // batas atas, bukan batas bawah

export function normalizeKeywords(keywords: string[]): string[] {
  const cleaned = keywords
    .map((k) => k.toLowerCase().trim())
    .filter((k) => k.length > 0);
  const unique = [...new Set(cleaned)].sort();
  return unique.slice(0, MAX_KEYWORDS);
  // Tidak ada padding — panjang output = jumlah keyword nyata
}
```

---

### 4.3 `report.handler.ts` — Tidak Ada Perubahan Berarti

Logika report sudah benar: ekstrak keyword, hash per keyword, simpan array commitment. Hanya perlu memastikan `normalizeKeywords` tidak lagi memaksa panjang 3.

---

### 4.4 `claim.schema.ts` — Update Validasi

```typescript
// SEBELUM (v1):
export const claimSubmitSchema = z.object({
  proof: z.any(),
  publicSignals: z.array(z.string()).length(3),  // kaku 3
});

// SESUDAH (v2):
export const claimSubmitSchema = z.object({
  proofs: z.array(z.object({
    commitmentIndex: z.number().int().min(0),
    proof: z.any(),
    publicSignal: z.string(),
  })).min(1),  // minimal 1 proof
});
```

---

### 4.5 `claim.handler.ts` — Verifikasi Iteratif + Scoring

```typescript
// Pseudocode logika baru
const { itemId, proofs, claimantName, claimantNpm, claimantContact } = parsed.data;
const item = getItems().find(i => i.id === itemId);

let matchedCount = 0;
const verifiedIndices = new Set<number>();

for (const p of proofs) {
  const { commitmentIndex, proof, publicSignal } = p;

  if (commitmentIndex >= item.commitments.length) continue;
  if (publicSignal !== item.commitments[commitmentIndex]) continue;
  if (verifiedIndices.has(commitmentIndex)) continue;

  const isValid = await snarkjs.groth16.verify(vKey, [publicSignal], proof);
  if (isValid) {
    matchedCount++;
    verifiedIndices.add(commitmentIndex);
  }
}

const score = matchedCount / item.commitments.length;

if (score < SCORE_THRESHOLD) {
  socket.emit('claim_error', { message: 'Ciri-ciri yang kamu sebutkan tidak cukup cocok.' });
  return;
}

// Score disimpan di claimEntry untuk dipakai Gale-Shapley
const claimEntry = buildClaimEntry(claimantName, claimantNpm, claimantContact, score);
```

---

### 4.6 `resolveDisputes.ts` — Sort by Score, Tiebreak by Timestamp

```typescript
// SEBELUM (v1): sort by createdAt saja
const sorted = pendingClaims.sort((a, b) =>
  new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
);

// SESUDAH (v2): sort by score DESC, tiebreak by createdAt ASC
const sorted = pendingClaims.sort((a, b) => {
  if (b.score !== a.score) return b.score - a.score;
  return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
});
```

---

### 4.7 `ClaimModal.svelte` — Multiple `fullProve()`

```typescript
// Pseudocode logika baru di browser
const keywords = await fetchExtract(claimText);
const fieldElements = keywords.map(stringToFieldElement);

const proofs = [];

for (const [kwIdx, fe] of fieldElements.entries()) {
  for (const [cmtIdx, commitment] of targetItem.commitments.entries()) {
    try {
      const { proof, publicSignals } = await snarkjs.groth16.fullProve(
        { secret: fe, target_hash: commitment },
        "/zk/single_keyword_proof.wasm",
        "/zk/single_keyword_proof.zkey"
      );
      // fullProve berhasil = keyword ini cocok dengan commitment ini
      proofs.push({ commitmentIndex: cmtIdx, proof, publicSignal: publicSignals[0] });
      break;  // keyword ini sudah match, lanjut ke keyword berikutnya
    } catch {
      // constraint gagal = tidak cocok, coba kombinasi berikutnya
    }
  }
}

socket.emit('claim_submit', { itemId, proofs, claimantName, claimantNpm, claimantContact });
```

> **Catatan performa:** `fullProve()` gagal dengan exception jika constraint tidak terpenuhi. Ini digunakan sebagai mekanisme filter alami. Jumlah iterasi worst case = M × N, tapi N biasanya kecil (3–5).

---

## 5. Implikasi Keamanan

### Yang Tetap Terjaga

- **Zero-Knowledge:** Verifier tidak pernah tahu isi keyword, hanya tahu proof valid
- **Soundness:** Tidak bisa forge proof tanpa mengetahui secret yang menghasilkan hash
- **Completeness:** Pemilik yang tahu keyword pasti bisa generate proof

### Yang Berubah (Disengaja)

- **Jaminan berubah:** dari "tahu SEMUA keyword" menjadi "tahu SETIDAKNYA threshold% keyword"
- **Score tidak dikembalikan ke frontend secara numerik** — hanya status "diterima/ditolak" — sehingga tidak ada oracle attack

### Risiko Baru

- **Brute force parsial:** Attacker yang menebak 1 keyword benar bisa lolos threshold jika N kecil dan threshold rendah. Mitigasi: threshold minimal 0.5 dan `MAX_KEYWORDS` = 7.
- **Ulang klaim berulang:** Attacker bisa mencoba berulang kali dengan keyword berbeda. Mitigasi: rate limiting per user per item.

---

## 6. Langkah Implementasi (Urutan Pengerjaan)

```
FASE 1: Infrastruktur Sirkuit Baru
  [ ] Buat single_keyword_proof.circom
  [ ] Compile: circom → wasm + r1cs
  [ ] Jalankan trusted setup baru → circuit_final.zkey
  [ ] Generate verification_key.json baru
  [ ] Copy wasm + zkey ke web/public/zk/

FASE 2: Normalisasi tanpa Padding
  [ ] Update normalizeKeywords.ts: hapus DUMMY_KEYWORD dan padding
  [ ] MAX_KEYWORDS menjadi batas atas (7), bukan batas bawah

FASE 3: Backend Verifikasi Iteratif
  [ ] Update claim.schema.ts: proofs[] menggantikan proof + publicSignals
  [ ] Update claim.handler.ts: loop verify + hitung score
  [ ] Update buildClaimEntry: tambah field score (float)
  [ ] Tambah konstanta SCORE_THRESHOLD (default 0.33)

FASE 4: Dispute Resolution dengan Score
  [ ] Update resolveDisputes.ts: sort by score DESC, tiebreak timestamp

FASE 5: Frontend Multiple Proof
  [ ] Update ClaimModal.svelte: loop fullProve() per pasangan keyword × commitment
  [ ] Kirim array proofs (bukan proof tunggal) ke backend

FASE 6: Pengujian End-to-End
  [ ] Test A: pengklaim tahu lebih banyak dari pelapor → skor 1.0, lolos
  [ ] Test B: pengklaim tahu sebagian → skor < 1.0, tetap lolos threshold
  [ ] Test C: pengklaim palsu tidak tahu → skor 0.0, ditolak
  [ ] Test D: dua pengklaim bersaing → yang skor lebih tinggi menang
```

---

## 7. Ringkasan Perbandingan v1 vs v2

| | ZKP v1 | ZKP v2 |
|---|---|---|
| Sirkuit | `ownership_proof.circom` (3 input AND) | `single_keyword_proof.circom` (1 input) |
| Dummy keyword | Ya (`__empty__`) | Tidak |
| Jumlah commitment | Paksa 3 | Bebas N (1–7) |
| Cara klaim | 1x `fullProve()` untuk semua | Nx `fullProve()` per keyword |
| Hasil verifikasi | Boolean | Float score |
| Tiebreaker Gale | Timestamp | Score → Timestamp |
| Pengklaim lebih detail | Dihukum (FAIL) | Diuntungkan (skor tinggi) |
| Kompleksitas sirkuit | Tinggi (3 Poseidon + AND) | Rendah (1 Poseidon) |
| Kompleksitas backend | Rendah | Menengah |
| Keadilan sistem | Kaku | Proporsional |
