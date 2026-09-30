# Technical Flow Guide: Solusi Problem Tri-Layer Lock

> **Scope:** Panduan teknis konkret untuk menyelesaikan 4 problem utama yang ditemukan di analisis arsitektur.
> Baca [`analisis_tri_layer_lock.md`](./analisis_tri_layer_lock.md) dulu sebelum dokumen ini.

> [!NOTE]
> **Status dokumen:** Dokumen ini adalah **cetak biru desain** (bagaimana masalah diselesaikan secara konsep). Sebagian nama fungsi, path file, dan model LLM di contoh kode **berbeda dari implementasi final**. Bagian yang sudah disinkronkan dengan kode aktual ditandai dengan blok `Catatan implementasi`. Lokasi file final ada di `server/src/zk/`, bukan `server/src/utils/`.

---

## Problem Map

```
Problem 1: Threshold Logic  ──┐
Problem 2: Order Sensitivity ─┼─► Semua ada di LAYER 1 (ZKP Circuit)
Problem 3: Case Sensitivity  ──┘

Problem 4: Simetri Ekstraksi ────► LAYER 2 (Normalization Pipeline)
```

---

## Problem 1: Threshold Logic ("minimal 2 dari 3")

### Root Cause

Circuit Groth16/Circom adalah sistem persamaan aljabar. Operasi `>=` (greater than or equal) **tidak bisa langsung direpresentasikan** — harus di-encode menggunakan range proof yang butuh banyak constraint.

```circom
// ❌ INI TIDAK BISA DITULIS BEGINI di Circom
if (totalMatch >= 2) { valid = 1; }

// ✅ Harus pakai LessThan comparator dari circomlib
// yang sendirinya butuh ~n bit decomposition constraint
```

### Solusi: Ganti "threshold" → "AND semua keyword wajib cocok"

Alih-alih threshold parsial, simplifikasi: **semua keyword yang didaftarkan harus dibuktikan**. Jumlah keyword yang didaftarkan adalah pilihan pelapor (bisa 1, 2, atau 3 — bukan threshold).

**Mengapa ini lebih baik untuk hackathon:**
- Circuit tetap simple: murni AND constraint
- Beban ada di pelapor: pilih keyword yang cukup spesifik tapi tidak terlalu susah diingat
- Kalau pengklaim tidak tahu salah satu → otomatis gagal (lebih aman)

```circom
// ✅ SIMPLE AND — ini yang dipakai
pragma circom 2.1.0;
include "poseidon.circom";

// Fixed 3 keyword — kalau pelapor cuma mau 2,
// isi keyword ke-3 dengan nilai dummy yang sama di kedua sisi
template OwnershipProof() {
    signal input secret_1;   // private
    signal input secret_2;   // private
    signal input secret_3;   // private

    signal input hash_1;     // public (commitment dari server)
    signal input hash_2;     // public
    signal input hash_3;     // public

    component h1 = Poseidon(1);
    component h2 = Poseidon(1);
    component h3 = Poseidon(1);

    h1.inputs[0] <== secret_1;
    h2.inputs[0] <== secret_2;
    h3.inputs[0] <== secret_3;

    hash_1 === h1.out;
    hash_2 === h2.out;
    hash_3 === h3.out;
}

component main {public [hash_1, hash_2, hash_3]} = OwnershipProof();
```

> **Catatan implementasi:** Circuit final ada di `server/zk/circuits/ownership_proof.circom`. Baris `include` aktual adalah `include "../../node_modules/circomlib/circuits/poseidon.circom";`. Sisa logika template identik dengan di atas. Konstanta jumlah keyword didefinisikan sebagai `MAX_KEYWORDS = 3` di `server/src/zk/normalizeKeywords.ts` dan harus selalu sinkron dengan circuit.

**Catatan untuk juri:** Simplifikasi ini justru **lebih secure** — threshold parsial membuka attack surface di mana attacker hanya perlu menebak sebagian keyword. AND penuh = zero partial credit.

---

## Problem 2: Order Sensitivity

### Root Cause

Kalau pelapor input: `["biru", "geologi"]` dan pengklaim input: `["geologi", "biru"]`, circuit akan gagal karena:
```
hash_1 (server) = H("biru")
secret_1 (claim) = "geologi"
H("geologi") ≠ H("biru")  → CONSTRAINT FAIL
```

Padahal pengklaim tahu kedua keyword.

### Solusi: Sort Alphabetical Sebelum Hash — di Kedua Sisi

Ini adalah **canonical ordering**. Aturannya: sebelum di-hash, keywords selalu di-sort A-Z. Implementasi wajib sama persis di sisi pelapor (saat report) dan pengklaim (saat claim).

```typescript
// server/src/zk/normalizeKeywords.ts
// ⚠️ Konsepnya harus sama di kedua sisi — backend (report) & frontend (claim).
// Catatan: saat ini belum ada file shared di frontend; logika field element
// di-inline langsung di ClaimModal.svelte (lihat Problem 3).

/**
 * Normalisasi array keyword menjadi canonical form:
 * 1. Lowercase semua
 * 2. Trim whitespace
 * 3. Filter kosong & buang placeholder dummy
 * 4. Sort A-Z
 * 5. Deduplikasi
 * 6. Pad ke panjang tetap (MAX_KEYWORDS) dengan string dummy
 *    supaya circuit selalu terima input jumlah sama
 */
export const MAX_KEYWORDS = 3;
export const DUMMY_KEYWORD = "__empty__";

export function normalizeKeywords(keywords: string[]): string[] {
  const cleaned = keywords
    .map((k) => k.toLowerCase().trim())
    .filter((k) => k.length > 0 && k !== DUMMY_KEYWORD);

  const unique = [...new Set(cleaned)];
  const sorted = unique.sort(); // A-Z alphabetical

  // Pad ke MAX_KEYWORDS dengan dummy
  while (sorted.length < MAX_KEYWORDS) {
    sorted.push(DUMMY_KEYWORD);
  }

  return sorted.slice(0, MAX_KEYWORDS); // maks MAX_KEYWORDS
}
```

**Contoh:**
```typescript
normalizeKeywords(["biru", "Geologi", "geologi "])
// → ["__empty__", "biru", "geologi"]  (sorted A-Z, deduplicated, padded)

normalizeKeywords(["Geologi", "biru"])
// → ["__empty__", "biru", "geologi"]  ← IDENTIK dengan di atas ✅
```

---

## Problem 3: Case & Typo Sensitivity

### Root Cause

Hash adalah fungsi exact-match:
```
H("geologi")  ≠  H("Geologi")  ≠  H("geologi ")
```

### Solusi: Normalization Sebelum Konversi ke Field Element

Normalization wajib dilakukan **sebelum** `stringToFieldElement()`. Urutan operasinya:

```
raw keyword
    ↓
toLowerCase()
    ↓
trim()
    ↓
normalizeKeywords() [sort + pad]
    ↓
stringToFieldElement()   ← baru ke field BN254
    ↓
Poseidon Hash
    ↓
commitment disimpan di server
```

**Untuk typo** (misal "stcker" vs "stiker"): ini **tidak bisa** diselesaikan di layer ZKP. Typo harus diselesaikan di Layer 2 (LLM extractor) sebelum masuk ke normalization. ZKP bukan spell-checker.

```typescript
// server/src/zk/fieldElement.ts
import { keccak256 } from "js-sha3";

export const BN254_FIELD_SIZE = BigInt(
  "21888242871839275222246405745257275088548364400416034343698204186575808495617"
);

export function stringToFieldElement(input: string): bigint {
  // ⚠️ Input harus sudah dinormalisasi sebelum masuk sini
  // (lowercase, trim, sorted via normalizeKeywords)
  const hashHex = keccak256(input);
  return BigInt("0x" + hashHex) % BN254_FIELD_SIZE;
}
```

> **Catatan implementasi:** Di sisi backend, `stringToFieldElement` mengembalikan `bigint`. Di sisi frontend, versi yang di-inline di `ClaimModal.svelte` mengembalikan `string` (memakai `keccak_256` dari `js-sha3`, bukan `keccak256`) agar cocok sebagai input JSON circuit. Nilai numeriknya identik (sama-sama `BigInt(hex) % BN254_FIELD_SIZE`).

---

## Problem 4 (Kritis): Simetri Ekstraksi

### Root Cause

Ini masalah paling fundamental: bagaimana menjamin LLM menghasilkan keyword yang **identik** dari dua input yang berbeda tapi bermakna sama?

```
Input A: "ada stiker geologi di belakang helm"
Input B: "helmnya ada sticker anak geologi"

LLM(A) harus == LLM(B) == ["geologi"]
```

### Solusi yang Diimplementasi: Two-Stage Pipeline

Bukan pilih antara LLM atau NLP deterministik — **gabungkan keduanya** dalam urutan yang tepat:

```
[Input teks bebas user]
         ↓
  Stage 1: NLP Deterministik
  (tangani case, typo ringan, stopword)
         ↓
  Stage 2: LLM Structured Extractor
  (tangani sinonim, bahasa informal, konteks)
         ↓
  Stage 3: Final Normalization
  (sort, pad, dedup — deterministik)
         ↓
  [Canonical keyword array yang siap di-hash]
```

### Stage 1: NLP Deterministik (Pre-processing)

```typescript
// server/src/zk/nlpPreprocess.ts

// Stopword Bahasa Indonesia — extend sesuai kebutuhan
const INDONESIAN_STOPWORDS = new Set([
  "ada", "itu", "ini", "sama", "yang", "di", "ke", "dari",
  "pada", "dalam", "untuk", "dengan", "dan", "atau", "tapi",
  "karena", "sebab", "jika", "kalau", "biar", "supaya",
  "kayaknya", "sepertinya", "mungkin", "paling", "banget",
  "sekali", "juga", "cuma", "hanya", "terus", "lalu",
  "kemudian", "setelah", "sebelum", "waktu", "saat",
  "saya", "aku", "kamu", "dia", "mereka", "kita", "kami",
  "tas", "dompet", "hp", "handphone", "botol", "minum",
  "warna", "warnanya", "bentuk", "bentuknya", "merk", "merknya",
  "kelihatan", "kelihatannya", "soalnya", "keliatannya", "keliatan",
  "punya", "kalo", "yg", "dgn", "utk", "udah", "sudah", "belum"
]);

export function preprocessText(text: string): string {
  if (!text) return "";
  const cleaned = text.toLowerCase().replace(/[^a-z\s]/g, " ");
  const tokens = cleaned.split(/\s+/).filter(Boolean);
  return tokens.filter((token) => !INDONESIAN_STOPWORDS.has(token)).join(" ");
}
```

> **Catatan implementasi:** Implementasi aktual **tidak** memfilter berdasarkan panjang kata (contoh dokumen lama memakai `word.length > 2`), melainkan hanya membuang stopword eksplisit. Regex juga `[^a-z\s]` sehingga angka ikut dibuang.

### Stage 2: LLM Structured Extractor (Groq API)

**Ini adalah prompt yang harus di-pin dan tidak boleh berubah setelah sistem live:**

```typescript
// server/src/zk/keywordExtractor.ts
// Groq kini dipanggil lewat helper terpusat server/src/ai/groqClient.ts
// (callGroqJson). Model & prompt asli ada di bawah.

const EXTRACTOR_MODEL = "qwen/qwen3.8-27b"; // dipin di ai/groqClient.ts (GROQ_MODEL)
const EXTRACTOR_SYSTEM_PROMPT = "You are a deterministic NLP extractor. Output valid JSON strictly containing a \"keywords\" array of strings.";

// Prompt user (ringkas) yang dipakai keywordExtractor.ts:
// "Kamu adalah AI NLP Extractor. Tugasmu mengekstrak maksimal MAX_KEYWORDS
//  kata kunci berupa ciri fisik spesifik benda dari teks.
//  ATURAN: HANYA ambil objek/warna/motif/brand/bahan spesifik; jangan ubah kata;
//  output HANYA JSON: { \"keywords\": [\"ciri1\", \"ciri2\"] }"

// Panggilan aktual (via groqClient):
//   callGroqJson({ messages, temperature: 0, timeoutMs: 8000 })
// temperature WAJIB 0 untuk determinisme.
```

> **Catatan implementasi:** Dokumen lama menyebut model `meta-llama/llama-4-scout-17b-16e-instruct` dan parameter `seed: 42`. Implementasi final memakai model **`qwen/qwen3.8-27b`** (didefinisikan sebagai `GROQ_MODEL` di `server/src/ai/groqClient.ts`) dan **tidak** memakai `seed`. Prompt asli berbeda dari contoh lama; lihat prompt di `server/src/zk/keywordExtractor.ts`.

### Stage 3: Final Normalization (deterministik)

```typescript
// SKETSA PIPELINE (belum menjadi satu fungsi bernama getCanonicalKeywords).
// Implementasi aktual: extractKeywordsWithAI() di zk/keywordExtractor.ts
// sudah menjalankan Stage 1 (preprocessText) -> Stage 2 (LLM) -> Stage 3
// (normalizeKeywords) secara internal dan mengembalikan array canonical.

import { preprocessText } from "./zk/nlpPreprocess";
import { extractKeywordsWithAI } from "./zk/keywordExtractor";
import { normalizeKeywords } from "./zk/normalizeKeywords";

// Pemakaian aktual di report phase (server/src/handlers/report.handler.ts):
//   const keywords = await extractKeywordsWithAI(inputData.secretDetail || '');
//
// Pemakaian aktual di claim phase (frontend ClaimModal.svelte):
//   fetch('/api/extract') -> extractKeywordsWithAI di backend -> keywords
//   (CATATAN: claim.handler.ts sendiri TIDAK menjalankan pipeline ini,
//    ia hanya memverifikasi proof ZKP.)
```

> **Catatan implementasi:** Fungsi terpadu `getCanonicalKeywords()` yang disebut di dokumen lama **tidak ada** di kode final. Peran itu dipegang `extractKeywordsWithAI()` (yang di dalamnya memanggil `preprocessText` → Groq → `normalizeKeywords`). Jalur report memanggilnya langsung; jalur claim memanggilnya lewat endpoint `POST /api/extract` dari frontend, bukan dari `claim.handler.ts`.

---

## Alur Flow Lengkap dengan Semua Problem Solved

```
══════════════════════════════════════════════════════════
                    REPORT PHASE
══════════════════════════════════════════════════════════

Pelapor: "ada stiker geologi dan jas hujan plastik biru"
                    ↓
         [Stage 1: NLP Preprocess]
         "stiker geologi hujan plastik biru"
                    ↓
         [Stage 2: LLM Extract]
         ["biru", "geologi", "plastik"]
                    ↓
         [Stage 3: normalize]
         sort A-Z + pad → ["biru", "geologi", "plastik"]
                    ↓
         [stringToFieldElement masing-masing]
         [F("biru"), F("geologi"), F("plastik")]
                    ↓
         [Poseidon Hash masing-masing]
         [H1, H2, H3]
                    ↓
         Server simpan: { commitments: [H1, H2, H3], itemId }
         Keyword asli DIBUANG setelah hashing

══════════════════════════════════════════════════════════
                    CLAIM PHASE
══════════════════════════════════════════════════════════

Pengklaim: "helmnya ada sticker anak Geologi sama jas ujan biru"
                    ↓
         [Frontend POST /api/extract]
         Backend menjalankan Stage 1 + 2 + 3
         (preprocess → LLM → normalize)
                    ↓
         ["biru", "geologi", "plastik"]  ← LLM tahu "sticker"="stiker"
         (keyword canonical diterima frontend;          dan "jas ujan"
          keyword TIDAK dikirim balik saat claim)
                    ↓
         [stringToFieldElement - inline di ClaimModal.svelte]
         [F("biru"), F("geologi"), F("plastik")]
                    ↓
         [snarkjs.groth16.fullProve()]
         Input: {
           secret_1: F("biru"),
           secret_2: F("geologi"),
           secret_3: F("plastik"),
           hash_1: H1,  ← dari `commitments` item (store server)
           hash_2: H2,
           hash_3: H3
         }
                    ↓
         { proof, publicSignals }  ← yang dikirim ke server
         (keyword TIDAK dikirim)
                    ↓
         [Server: snarkjs.groth16.verify()]
         Valid → item status jadi `disputed`, masuk Dispute Window (1 menit) ✅
         Invalid → Reject ❌
```

---

## Struktur File Aktual (vs Rekomendasi Awal)

> **Catatan implementasi:** Struktur di bawah adalah yang **benar-benar ada** di repo. Berbeda dari rekomendasi awal (folder `utils/` dan shared utils frontend) yang tidak pernah dibuat.

```
server/src/
├── zk/
│   ├── normalizeKeywords.ts   ← Problem 1, 2, 3 (MAX_KEYWORDS, DUMMY_KEYWORD)
│   ├── fieldElement.ts        ← Problem 3
│   ├── nlpPreprocess.ts       ← Problem 4 Stage 1
│   ├── keywordExtractor.ts    ← Problem 4 Stage 2 (via ai/groqClient)
│   ├── poseidon.ts            ← singleton Poseidon (commitment)
│   ├── disputeTimer.ts        ← Layer 3 dispute window
│   └── resolveDisputes.ts     ← Layer 3 FCFS resolver
├── ai/
│   ├── groqClient.ts          ← client Groq terpusat
│   └── verifyClaim.ts         ← chat/emoji AI (bukan verifikasi ZKP)
├── handlers/
│   ├── report.handler.ts      ← memanggil extractKeywordsWithAI + poseidon
│   └── claim.handler.ts       ← verifikasi proof ZKP (tanpa pipeline NLP)
└── data/store.ts              ← data item + commitments

web/src/lib/
├── components/ClaimModal.svelte  ← fullProve() + stringToFieldElement (inline)
└── socket.ts                     ← socket event handler
```

> [!IMPORTANT]
> **Shared package belum diimplementasikan.** Rekomendasi awal (`web/src/lib/utils/normalizeKeywords.ts`, `fieldElement.ts`, `actions/zkpProver.ts`) **tidak ada**. Saat ini:
> - Logika `stringToFieldElement` di frontend di-inline di `ClaimModal.svelte:107-116`.
> - Normalisasi keyword di sisi klaim dilakukan oleh **backend** via `/api/extract` (frontend tidak menormalisasi sendiri).
> - Karena itu, `normalizeKeywords.ts`/`fieldElement.ts` backend dan inline frontend **tidak** berupa file shared tunggal. Menjadikannya `packages/shared/` tetap rekomendasi yang baik untuk mencegah drift.

> [!WARNING]
> LLM extractor (Stage 2) tidak bisa dijamin 100% deterministik meskipun temperature=0. Untuk kasus edge yang LLM-nya berbeda output, sistem akan menghasilkan false negative (pengklaim yang sebenarnya tahu keyword tapi gagal). Ini acceptable trade-off untuk PoC hackathon — lebih baik false negative daripada false positive (orang yang tidak tahu lolos).
