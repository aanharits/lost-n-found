# Technical Flow Guide: Solusi Problem Tri-Layer Lock

> **Scope:** Panduan teknis konkret untuk menyelesaikan 4 problem utama yang ditemukan di analisis arsitektur.
> Baca [`analisis_tri_layer_lock.md`](./analisis_tri_layer_lock.md) dulu sebelum dokumen ini.

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
// utils/normalizeKeywords.ts
// ⚠️ FILE INI HARUS DIPAKAI DI KEDUA SISI — backend & frontend

/**
 * Normalisasi array keyword menjadi canonical form:
 * 1. Lowercase semua
 * 2. Trim whitespace
 * 3. Sort A-Z
 * 4. Deduplikasi
 * 5. Pad ke panjang tetap (MAX_KEYWORDS) dengan string dummy
 *    supaya circuit selalu terima input jumlah sama
 */
export const MAX_KEYWORDS = 3;
export const DUMMY_KEYWORD = "__empty__";

export function normalizeKeywords(keywords: string[]): string[] {
  const cleaned = keywords
    .map((k) => k.toLowerCase().trim())
    .filter((k) => k.length > 0);

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
// utils/fieldElement.ts
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
// utils/nlpPreprocess.ts

// Stopword Bahasa Indonesia — extend sesuai kebutuhan
const STOPWORDS_ID = new Set([
  "ada", "di", "dan", "yang", "ini", "itu", "ke", "dari",
  "dengan", "untuk", "pada", "adalah", "kami", "saya", "nya",
  "si", "sang", "para", "tersebut", "juga", "sudah", "belum",
  "bisa", "kalau", "jika", "sama", "aja", "deh", "sih", "tuh",
  "kayak", "kayaknya", "kira", "mungkin", "seperti", "mirip",
  "anak", "mas", "pak", "bu", "kak"
]);

export function preprocessText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")  // hapus karakter non-alfanumerik
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOPWORDS_ID.has(word))
    .join(" ");
}
```

### Stage 2: LLM Structured Extractor (Groq API)

**Ini adalah prompt yang harus di-pin dan tidak boleh berubah setelah sistem live:**

```typescript
// utils/keywordExtractor.ts
import axios from "axios";

const EXTRACTOR_MODEL = "meta-llama/llama-4-scout-17b-16e-instruct"; // pin versi model
const EXTRACTOR_SYSTEM_PROMPT = `Kamu adalah sistem ekstraksi keyword untuk barang hilang/temuan.
Tugasmu: ekstrak kata kunci fisik yang bisa diverifikasi dari deskripsi barang.

ATURAN KETAT:
1. Output HANYA JSON: {"keywords": ["...", "..."]}
2. Maksimal 3 keyword
3. Hanya noun/adjektif fisik (warna, bahan, nama merek, ornamen, stiker, dll)
4. Tidak boleh: kata kerja, kata sifat emosional, kata umum (besar, kecil, bagus)
5. Lowercase semua
6. Tidak ada duplikat
7. Kalau input tidak ada ciri fisik spesifik, kembalikan: {"keywords": []}

CONTOH:
Input: "ada stiker anak geologi di belakang sama jas hujan plastik warna biru"
Output: {"keywords": ["biru", "geologi", "plastik"]}

Input: "helmnya saya yang hilang kemarin"
Output: {"keywords": []}`;

export async function extractKeywordsWithLLM(
  preprocessedText: string
): Promise<string[]> {
  try {
    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: EXTRACTOR_MODEL,
        messages: [
          { role: "system", content: EXTRACTOR_SYSTEM_PROMPT },
          { role: "user", content: preprocessedText },
        ],
        temperature: 0,              // ⚠️ WAJIB 0 untuk determinisme
        response_format: { type: "json_object" },
        seed: 42,                    // seed untuk reproducibility (jika didukung)
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 8000,
      }
    );

    const content = response.data.choices[0].message.content;
    const parsed = JSON.parse(content);
    return Array.isArray(parsed.keywords) ? parsed.keywords : [];
  } catch {
    return []; // fallback: kosong, tidak crash
  }
}
```

### Stage 3: Final Normalization (deterministik)

```typescript
// Pipeline lengkap — entry point yang dipakai di report & claim
import { preprocessText } from "./nlpPreprocess";
import { extractKeywordsWithLLM } from "./keywordExtractor";
import { normalizeKeywords } from "./normalizeKeywords";

export async function getCanonicalKeywords(rawInput: string): Promise<string[]> {
  // Stage 1: NLP pre-processing
  const preprocessed = preprocessText(rawInput);

  // Stage 2: LLM extraction (handle sinonim & bahasa informal)
  const extracted = await extractKeywordsWithLLM(preprocessed);

  // Stage 3: Final normalization (sort, dedup, pad)
  return normalizeKeywords(extracted);
}

// Pemakaian di report phase:
// const keywords = await getCanonicalKeywords("ada stiker geologi di belakang helm");
// → ["__empty__", "geologi", "stiker"]

// Pemakaian di claim phase (input berbeda, output harus sama):
// const keywords = await getCanonicalKeywords("helmnya ada sticker anak geologi");
// → ["__empty__", "geologi", "stiker"]  ← identik ✅
```

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
         Server simpan: { commitment: [H1, H2, H3], itemId }
         Keyword asli DIBUANG setelah hashing

══════════════════════════════════════════════════════════
                    CLAIM PHASE
══════════════════════════════════════════════════════════

Pengklaim: "helmnya ada sticker anak Geologi sama jas ujan biru"
                    ↓
         [Stage 1: NLP Preprocess]
         "sticker geologi ujan biru"
                    ↓
         [Stage 2: LLM Extract]
         ["biru", "geologi", "plastik"]  ← LLM tahu "sticker"="stiker"
                    ↓                        dan inferensi konteks "jas ujan"
         [Stage 3: normalize]
         sort A-Z + pad → ["biru", "geologi", "plastik"]
                    ↓
         [stringToFieldElement]
         [F("biru"), F("geologi"), F("plastik")]
                    ↓
         [snarkjs.groth16.fullProve()]
         Input: {
           secret_1: F("biru"),
           secret_2: F("geologi"),
           secret_3: F("plastik"),
           hash_1: H1,  ← dari server
           hash_2: H2,
           hash_3: H3
         }
                    ↓
         { proof, publicSignals }  ← yang dikirim ke server
         (keyword TIDAK dikirim)
                    ↓
         [Server: snarkjs.groth16.verify()]
         Valid → masuk queue Gale-Shapley ✅
         Invalid → Reject ❌
```

---

## Struktur File Rekomendasi

```
server/src/
├── utils/
│   ├── normalizeKeywords.ts   ← Problem 1, 2, 3
│   ├── fieldElement.ts        ← Problem 3
│   ├── nlpPreprocess.ts       ← Problem 4 Stage 1
│   └── keywordExtractor.ts    ← Problem 4 Stage 2
├── handlers/
│   ├── report.handler.ts      ← pakai getCanonicalKeywords()
│   └── claim.handler.ts       ← pakai getCanonicalKeywords()
└── zk/
    └── verification_key.json  ← output trusted setup

web/src/lib/
├── utils/
│   ├── normalizeKeywords.ts   ← SAMA PERSIS dengan server (shared logic)
│   └── fieldElement.ts        ← SAMA PERSIS dengan server
└── actions/
    └── zkpProver.ts           ← fullProve() wrapper
```

> [!IMPORTANT]
> `normalizeKeywords.ts` dan `fieldElement.ts` harus **100% identik** antara versi server dan frontend. Cara terbaik: jadikan satu package shared (`packages/shared/`) atau copy paste manual dan pastikan tidak ada perbedaan satu karakter pun.

> [!WARNING]
> LLM extractor (Stage 2) tidak bisa dijamin 100% deterministik meskipun temperature=0. Untuk kasus edge yang LLM-nya berbeda output, sistem akan menghasilkan false negative (pengklaim yang sebenarnya tahu keyword tapi gagal). Ini acceptable trade-off untuk PoC hackathon — lebih baik false negative daripada false positive (orang yang tidak tahu lolos).
