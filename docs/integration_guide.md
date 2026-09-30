# Integration Guide: ZKP (Groth16) + Gale-Shapley untuk Lost & Found App

**Target audience:** Tim dev yang udah punya PoC React/Node.js
**Scope:** ZKP circuitry, snarkjs integration, Gale-Shapley logic, scheduler, dan skema database. UI lengkap nggak dibahas di sini.

---

## 0. Latar Belakang

PoC lama pakai chatbot NLP ("AI Guard") buat verifikasi klaim kepemilikan barang — user ngetik ciri rahasia, AI yang nilai match atau nggak. Masalahnya:

- **Prompt injection & halusinasi** — AI bisa dimanipulasi ("abaikan instruksi sebelumnya...").
- **Single point of failure** — backend/AI harus nyimpen rahasia plaintext.
- **Nggak ada resolusi konflik yang fair** — kalau beberapa orang klaim barang yang sama bersamaan, sistem lama cuma andalin logika dasar (first-come-first-serve).

Solusinya dua mekanisme:

1. **ZKP (Groth16)** — user buktikan tahu rahasia tanpa pernah mengirim rahasianya. Server cuma nyimpen hash.
2. **Gale-Shapley (Deferred Acceptance)** — kalau ada klaim bentrok, di-resolve sebagai *stable matching problem*, bukan siapa cepat dia dapat.

---

## 1. Zero-Knowledge Proof (Groth16) Integration

### 1.1 Alur Kerja

**Saat item dilaporkan (report phase):**
1. Pelapor input karakteristik rahasia `secret` (contoh: "ada stiker kucing di dalam").
2. Sistem generate `salt` random (mencegah dictionary attack karena secret biasanya low-entropy).
3. `secret` (string) dikonversi ke field element (lihat 1.4) sebelum di-hash, karena Poseidon cuma nerima angka dalam field BN254 (`p ≈ 2^254`).
4. Backend hitung `commitment = Poseidon(secretFieldElement, salt)`, simpan `commitment` + `salt` + `itemId`. `secret` mentah langsung dibuang.

**Saat item diklaim (claim phase):**
1. Claimant input `secret` versi dia di browser.
2. Frontend fetch `salt` publik dan `commitment` dari server.
3. `snarkjs.groth16.fullProve()` generate proof bahwa "gue tahu `secret` yang kalau di-hash sama `salt` ini hasilnya = `commitment`" — tanpa ngirim `secret` itu sendiri.
4. Frontend kirim `{ proof, publicSignals }` ke backend.
5. Backend verify pakai `snarkjs.groth16.verify()`. Valid → masuk antrian dispute (Section 2). Invalid → langsung reject.

Server nggak pernah pegang plaintext secret → nggak ada single point of failure, dan nggak ada AI di jalur verifikasi kepemilikan → nggak ada celah prompt injection.

### 1.2 Circom Circuit — `OwnershipProof()`

```circom
pragma circom 2.1.0;

include "poseidon.circom"; // dari circomlib

// Membuktikan: prover tahu (secret, salt) sehingga
// Poseidon(secret, salt) == expectedHash, tanpa membocorkan secret.
template OwnershipProof() {
    // --- Private inputs (cuma prover yang tahu) ---
    signal input secret;
    signal input salt;

    // --- Public input (sudah tersimpan di server sejak report phase) ---
    signal input expectedHash;

    component hasher = Poseidon(2);
    hasher.inputs[0] <== secret;
    hasher.inputs[1] <== salt;

    // Constraint utama: hash yang dihitung harus sama persis
    // dengan commitment yang tersimpan.
    expectedHash === hasher.out;
}

component main {public [expectedHash]} = OwnershipProof();
```

**Catatan:**
- `salt` diperlakukan sebagai private input di sini. Kalau tim lebih suka salt jadi public input (lebih gampang di-debug), tinggal pindahin ke `{public [expectedHash, salt]}`.
- Buat proteksi tambahan (expiry, itemId binding biar proof nggak bisa dipindah ke item lain), tambahin `itemId` sebagai public input dan ikut di-hash: `Poseidon(3)` dengan input `[secret, salt, itemId]`.

### 1.3 Trusted Setup — Groth16 (Phase 1 & Phase 2)

```bash
# --- Compile circuit ---
circom ownership_proof.circom --r1cs --wasm --sym -o build/

# =========================================================
# PHASE 1 — Powers of Tau (universal, circuit-independent)
# Bisa dipakai ulang untuk circuit lain, asal nggak lebih
# dari 2^14 constraint (ubah "14" kalau perlu).
# =========================================================
snarkjs powersoftau new bn128 14 pot14_0000.ptau -v
snarkjs powersoftau contribute pot14_0000.ptau pot14_0001.ptau \
  --name="Team contribution 1" -v
snarkjs powersoftau prepare phase2 pot14_0001.ptau pot14_final.ptau -v

# =========================================================
# PHASE 2 — Circuit-specific setup (Groth16)
# =========================================================
snarkjs groth16 setup build/ownership_proof.r1cs pot14_final.ptau \
  ownership_proof_0000.zkey

snarkjs zkey contribute ownership_proof_0000.zkey ownership_proof_0001.zkey \
  --name="Team contribution 2" -v

# Export verification key (JSON) — dipakai backend
snarkjs zkey export verificationkey ownership_proof_0001.zkey \
  verification_key.json
```

Untuk lomba/demo, satu kali contribute per phase udah cukup. Kalau mau nunjukin paham soal trusted setup, tambahin 1-2 contributor lagi (opsional, jangan overengineer).

**File yang perlu didistribusikan setelah setup:**

| File | Dipakai di | Taruh di |
|---|---|---|
| `build/ownership_proof_js/ownership_proof.wasm` | Frontend (witness calc) | `public/zk/` |
| `ownership_proof_0001.zkey` (rename → `ownership_proof_final.zkey`) | Frontend (proving key) | `public/zk/` |
| `verification_key.json` | Backend (verify) | `server/zk/` |

### 1.4 Utility: String → Field Element

Poseidon cuma nerima angka dalam field BN254, jadi `secret` (string) harus dikonversi dulu. Dipakai di **kedua sisi**: backend (saat hitung commitment di report phase) dan frontend (saat fullProve di claim phase) — taruh sebagai shared utility.

```bash
npm install js-sha3
```

```typescript
// utils/fieldElement.ts
import { keccak256 } from "js-sha3";

// Scalar field BN254 — batas atas yang diterima Poseidon/circomlib
export const BN254_FIELD_SIZE = BigInt(
  "21888242871839275222246405745257275088548364400416034343698204186575808495617"
);

/**
 * Ubah string apapun jadi BigInt yang pasti muat di field BN254.
 *
 * 1. keccak256(input) -> digest 256-bit (32 byte)
 * 2. Interpretasi digest sebagai BigInt big-endian
 * 3. mod field size -> dijamin selalu < field, snarkjs nggak akan
 *    throw "value out of range"
 *
 * Bias dari step mod: digest 2^256 di-reduce ke field ~2^254,
 * bias-nya < 2^-250 — nggak signifikan secara praktis.
 */
export function stringToFieldElement(input: string): bigint {
  const hashHex = keccak256(input); // 64 hex char
  const asBigInt = BigInt("0x" + hashHex);
  return asBigInt % BN254_FIELD_SIZE;
}
```

Pemakaian:
```typescript
const secretField = stringToFieldElement("ada stiker kucing di dalam");
const saltField = stringToFieldElement(crypto.randomUUID());
```

`js-sha3` pure-JS (nggak butuh native binding) — jalan sama persis di Node.js maupun browser tanpa polyfill tambahan.

### 1.5 Local Testing (sebelum hook ke React)

Test circuit-nya lokal dulu sebelum diintegrasiin ke frontend. Jangan hardcode `expectedHash` manual di `input.json` — generate dari script biar dijamin match sama parameter Poseidon internal circomlib.

```bash
npm install snarkjs circomlibjs
```

```javascript
// test-circuit.js
// Run: node test-circuit.js
// Prasyarat: trusted setup (1.3) sudah selesai, file wasm/zkey/
// verification_key.json ada di folder ini.

const snarkjs = require("snarkjs");
const { buildPoseidon } = require("circomlibjs");
const fs = require("fs");

async function main() {
  const poseidon = await buildPoseidon();

  // --- Dummy values (di real flow, hasil dari stringToFieldElement()) ---
  const secret = 123456789n;
  const salt = 987654321n;

  const hashRaw = poseidon([secret, salt]);
  const expectedHash = poseidon.F.toObject(hashRaw); // BigInt biasa

  const input = {
    secret: secret.toString(),
    salt: salt.toString(),
    expectedHash: expectedHash.toString(),
  };

  fs.writeFileSync("input.json", JSON.stringify(input, null, 2));
  console.log("✅ input.json generated:\n", input);

  // --- Generate proof (simulasi browser) ---
  console.time("fullProve");
  const { proof, publicSignals } = await snarkjs.groth16.fullProve(
    input,
    "build/ownership_proof_js/ownership_proof.wasm",
    "ownership_proof_final.zkey"
  );
  console.timeEnd("fullProve");
  console.log("publicSignals:", publicSignals);

  // --- Verify (simulasi backend) ---
  const vKey = JSON.parse(fs.readFileSync("verification_key.json", "utf-8"));
  const isValid = await snarkjs.groth16.verify(vKey, publicSignals, proof);
  console.log("✅ Proof valid?", isValid); // harus: true

  // --- Sanity check: public signal ditukar harus ditolak ---
  const tampered = [...publicSignals];
  tampered[0] = "1";
  const isTamperedValid = await snarkjs.groth16.verify(vKey, tampered, proof);
  console.log("❌ Tampered proof valid? (harus false):", isTamperedValid);
}

main().catch(console.error);
```

Kalau output `Proof valid? true` dan `Tampered proof valid? false`, circuit-nya udah bener secara logic — aman lanjut ke 1.6.

### 1.6 Frontend — `snarkjs.groth16.fullProve`

```typescript
import * as snarkjs from "snarkjs";
import { stringToFieldElement } from "./utils/fieldElement";

interface ClaimInput {
  secret: string;  // input mentah dari user
  salt: bigint;     // didapat dari GET /items/:id/commitment
}

async function generateOwnershipProof(
  itemId: string,
  input: ClaimInput,
  expectedHash: bigint
) {
  const circuitInput = {
    secret: stringToFieldElement(input.secret).toString(),
    salt: input.salt.toString(),
    expectedHash: expectedHash.toString(),
  };

  const { proof, publicSignals } = await snarkjs.groth16.fullProve(
    circuitInput,
    "/zk/ownership_proof.wasm",
    "/zk/ownership_proof_final.zkey"
  );

  return fetch(`/api/items/${itemId}/claim`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ proof, publicSignals }),
  });
}
```

`fullProve` ini paling berat secara komputasi (witness calc + proving) — jalanin di Web Worker kalau circuit makin gede biar UI nggak freeze.

### 1.7 Backend (Node.js) — `snarkjs.groth16.verify`

```typescript
import * as snarkjs from "snarkjs";
import fs from "fs";

const vKey = JSON.parse(
  fs.readFileSync("./zk/verification_key.json", "utf-8")
);

async function verifyOwnershipProof(
  proof: any,
  publicSignals: string[]
): Promise<boolean> {
  return snarkjs.groth16.verify(vKey, publicSignals, proof);
}

app.post("/api/items/:id/claim", async (req, res) => {
  const { proof, publicSignals } = req.body;
  const item = await db.items.findById(req.params.id);

  // Wajib: cek publicSignals cocok sama commitment item ini,
  // biar proof valid dari item lain nggak bisa dipakai di sini.
  if (publicSignals[0] !== item.commitment) {
    return res.status(400).json({ valid: false, reason: "hash mismatch" });
  }

  const isValid = await verifyOwnershipProof(proof, publicSignals);

  await db.claims.insert({
    itemId: item.id,
    claimantId: req.user.id,
    zkpValid: isValid,
    timestamp: Date.now(),
  });

  res.json({ valid: isValid });
});
```

Verify ini murah (~milidetik) — aman dipanggil per-request tanpa queue/rate limit khusus.

---

## 2. Gale-Shapley Algorithm untuk Claim Queue

### 2.1 Alur Kerja Dispute Window

1. Klaim kedua masuk untuk item yang sama dalam window waktu tertentu (misal 24 jam) → item ditandai `DISPUTED`, window dispute dibuka.
2. Selama window terbuka, semua klaim dikumpulkan — tiap klaim udah punya status `zkpValid` dari hasil verify (1.7).
3. Klaim dengan `zkpValid = false` otomatis diskualifikasi (= item "menolak" claimant tersebut).
4. Window tutup → jalanin Gale-Shapley (claimant-proposing deferred acceptance) buat resolve semua dispute sekaligus secara stabil.
5. Preferensi item: **valid dulu, lalu timestamp paling awal menang**.
6. Hasil akhir: stable matching — nggak ada claimant-item pair yang berdua lebih milih pasangan lain dibanding hasil matching-nya.

### 2.2 Implementasi TypeScript

```typescript
type ClaimantId = string;
type ItemId = string;

interface Claim {
  claimantId: ClaimantId;
  itemId: ItemId;
  zkpValid: boolean;
  timestamp: number;
}

/**
 * Preferensi ITEM terhadap claimant: hanya claimant dengan ZKP valid
 * yang masuk daftar. Diurutkan dari timestamp paling awal (paling disukai).
 */
function buildItemPreferences(claims: Claim[]): Map<ItemId, ClaimantId[]> {
  const grouped = new Map<ItemId, Claim[]>();
  for (const c of claims) {
    if (!c.zkpValid) continue;
    if (!grouped.has(c.itemId)) grouped.set(c.itemId, []);
    grouped.get(c.itemId)!.push(c);
  }

  const prefs = new Map<ItemId, ClaimantId[]>();
  for (const [itemId, itemClaims] of grouped) {
    const sorted = [...itemClaims].sort((a, b) => a.timestamp - b.timestamp);
    prefs.set(itemId, sorted.map((c) => c.claimantId));
  }
  return prefs;
}

/**
 * Preferensi CLAIMANT terhadap item: urutan item yang dia klaim,
 * berdasarkan urutan submit klaim (klaim pertama = prioritas utama dia).
 */
function buildClaimantPreferences(claims: Claim[]): Map<ClaimantId, ItemId[]> {
  const grouped = new Map<ClaimantId, Claim[]>();
  for (const c of claims) {
    if (!c.zkpValid) continue;
    if (!grouped.has(c.claimantId)) grouped.set(c.claimantId, []);
    grouped.get(c.claimantId)!.push(c);
  }

  const prefs = new Map<ClaimantId, ItemId[]>();
  for (const [claimantId, cClaims] of grouped) {
    const sorted = [...cClaims].sort((a, b) => a.timestamp - b.timestamp);
    prefs.set(claimantId, sorted.map((c) => c.itemId));
  }
  return prefs;
}

/**
 * Gale-Shapley Deferred Acceptance (claimant-proposing, item capacity = 1).
 * Return: Map<itemId, claimantId | null> — null = nggak ada claimant valid
 * yang berhasil matched ke item itu (butuh investigasi manual).
 */
function resolveDisputes(claims: Claim[]): Map<ItemId, ClaimantId | null> {
  const itemPrefs = buildItemPreferences(claims);
  const claimantPrefs = buildClaimantPreferences(claims);

  const itemRank = new Map<ItemId, Map<ClaimantId, number>>();
  for (const [itemId, prefList] of itemPrefs) {
    const rankMap = new Map<ClaimantId, number>();
    prefList.forEach((claimantId, idx) => rankMap.set(claimantId, idx));
    itemRank.set(itemId, rankMap);
  }

  const freeClaimants = new Set<ClaimantId>(claimantPrefs.keys());
  const nextProposalIdx = new Map<ClaimantId, number>(
    [...claimantPrefs.keys()].map((id) => [id, 0])
  );
  const currentMatch = new Map<ItemId, ClaimantId>();

  while (freeClaimants.size > 0) {
    const claimantId = freeClaimants.values().next().value as ClaimantId;
    const prefs = claimantPrefs.get(claimantId) ?? [];
    const idx = nextProposalIdx.get(claimantId)!;

    if (idx >= prefs.length) {
      freeClaimants.delete(claimantId);
      continue;
    }

    const itemId = prefs[idx];
    nextProposalIdx.set(claimantId, idx + 1);

    const rankMap = itemRank.get(itemId);
    if (!rankMap || !rankMap.has(claimantId)) continue;

    const heldClaimant = currentMatch.get(itemId);

    if (!heldClaimant) {
      currentMatch.set(itemId, claimantId);
      freeClaimants.delete(claimantId);
    } else {
      const heldRank = rankMap.get(heldClaimant)!;
      const newRank = rankMap.get(claimantId)!;

      if (newRank < heldRank) {
        currentMatch.set(itemId, claimantId);
        freeClaimants.delete(claimantId);
        freeClaimants.add(heldClaimant);
      }
    }
  }

  const result = new Map<ItemId, ClaimantId | null>();
  for (const itemId of itemPrefs.keys()) {
    result.set(itemId, currentMatch.get(itemId) ?? null);
  }
  return result;
}

export { resolveDisputes, buildItemPreferences, buildClaimantPreferences };
```

**Kompleksitas:** worst-case `O(n²)` (n = jumlah klaim di window itu) — buat skala lost-and-found kampus jelas nggak masalah.

**Sifat matematis (buat dipamerin ke juri):**
- **Stability** — nggak ada blocking pair.
- **Strategy-proof di sisi claimant** — nggak untung "curang" atur urutan klaim.
- **Claimant-optimal** — hasil terbaik yang mungkin didapat claimant di antara semua stable matching yang valid.

---

## 3. Dispute Window Scheduler

`resolveDisputes()` harus jalan tepat saat `dispute_closes_at` tercapai. `node-cron` nggak cocok buat ratusan item dengan closing time beda-beda — dia polling interval tetap dan harus scan semua item tiap kali. **BullMQ** (Redis-backed) lebih pas: tiap item punya *delayed job* sendiri yang di-trigger tepat di timestamp-nya lewat sorted-set internal Redis — O(1) dispatch, nggak ada loop scanning, job persist walau server restart.

```bash
npm install bullmq ioredis
```

```typescript
// queues/disputeQueue.ts
import { Queue, JobsOptions } from "bullmq";
import IORedis from "ioredis";

const connection = new IORedis({
  host: process.env.REDIS_HOST ?? "127.0.0.1",
  port: Number(process.env.REDIS_PORT ?? 6379),
  maxRetriesPerRequest: null, // wajib buat BullMQ
});

export const disputeQueue = new Queue("dispute-resolution", { connection });

/**
 * Dipanggil sekali begitu item pertama kali masuk status DISPUTED.
 */
export async function scheduleDisputeResolution(
  itemId: string,
  disputeClosesAt: Date
) {
  const delayMs = Math.max(0, disputeClosesAt.getTime() - Date.now());

  const opts: JobsOptions = {
    jobId: itemId,        // 1 item = 1 job -> otomatis dedup
    delay: delayMs,
    removeOnComplete: true,
    removeOnFail: false,  // simpan buat debug kalau worker error
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
  };

  await disputeQueue.add("resolve", { itemId }, opts);
}

/**
 * Kalau window di-extend (klaim baru masuk mepet closing time),
 * cabut job lama, jadwalin ulang.
 */
export async function rescheduleDisputeResolution(
  itemId: string,
  newClosesAt: Date
) {
  const existing = await disputeQueue.getJob(itemId);
  if (existing) await existing.remove();
  await scheduleDisputeResolution(itemId, newClosesAt);
}
```

```typescript
// workers/disputeWorker.ts
import { Worker } from "bullmq";
import IORedis from "ioredis";
import { resolveDisputes } from "../lib/gale-shapley";
import { db } from "../db";

const connection = new IORedis({ maxRetriesPerRequest: null });

new Worker(
  "dispute-resolution",
  async (job) => {
    const { itemId } = job.data as { itemId: string };

    const item = await db.items.findById(itemId);
    if (!item || item.status !== "DISPUTED") return; // sudah resolve / edge case

    const claims = await db.claims.findByItemId(itemId, { status: "PENDING" });
    const matchResult = resolveDisputes(claims);
    const winnerId = matchResult.get(itemId) ?? null;

    await db.transaction(async (trx) => {
      await db.claims.updateMany({ itemId, claimantId: winnerId }, { status: "MATCHED" }, trx);
      await db.claims.updateMany({ itemId, claimantId: { not: winnerId } }, { status: "REJECTED" }, trx);
      await db.items.update(itemId, { status: winnerId ? "RESOLVED" : "UNMATCHED" }, trx);
      await db.disputeResolutions.insert({ itemId, matchedClaimantId: winnerId }, trx);
    });

    console.log(`Item ${itemId} resolved -> winner: ${winnerId ?? "NONE"}`);
  },
  { connection, concurrency: 5 }
);
```

**Agenda** (MongoDB-backed) valid juga kalau stack lo kebetulan pakai MongoDB — tapi karena stack ini Postgres, nambah Redis buat BullMQ lebih ringan daripada nambah MongoDB cuma buat scheduling.

---

## 4. Database Schema (PostgreSQL)

```sql
-- Barang yang dilaporkan
CREATE TABLE items (
  id            UUID PRIMARY KEY,
  title         VARCHAR(255) NOT NULL,
  description   TEXT,
  commitment    VARCHAR(255) NOT NULL, -- Poseidon(secret, salt)
  salt          VARCHAR(255) NOT NULL, -- plaintext, aman karena bukan rahasia
  status        VARCHAR(20) NOT NULL DEFAULT 'OPEN',
                -- OPEN | DISPUTED | RESOLVED | UNMATCHED
  reported_by   UUID REFERENCES users(id),
  dispute_opens_at   TIMESTAMP,
  dispute_closes_at  TIMESTAMP,
  created_at    TIMESTAMP NOT NULL DEFAULT now()
);

-- Setiap percobaan klaim
CREATE TABLE claims (
  id            UUID PRIMARY KEY,
  item_id       UUID NOT NULL REFERENCES items(id),
  claimant_id   UUID NOT NULL REFERENCES users(id),
  proof         JSONB NOT NULL,       -- pi_a, pi_b, pi_c dari snarkjs
  public_signals JSONB NOT NULL,      -- [expectedHash, ...]
  zkp_valid     BOOLEAN NOT NULL,
  status        VARCHAR(20) NOT NULL DEFAULT 'PENDING',
                -- PENDING | MATCHED | REJECTED
  submitted_at  TIMESTAMP NOT NULL DEFAULT now()
);

-- Audit trail hasil Gale-Shapley per dispute window
CREATE TABLE dispute_resolutions (
  id            UUID PRIMARY KEY,
  item_id       UUID NOT NULL REFERENCES items(id),
  matched_claimant_id UUID REFERENCES users(id), -- NULL kalau nggak match
  resolved_at   TIMESTAMP NOT NULL DEFAULT now(),
  algorithm_version VARCHAR(20) DEFAULT 'gale-shapley-v1'
);
```

`dispute_resolutions` bukan wajib secara fungsional, tapi penting buat *auditability* dan jadi basis data buat fitur **Admin Archive/Warehouse** (dashboard React buat admin, rencana tahap akhir proyek) — nggak butuh mekanisme backend baru, tinggal query dari `items`, `claims`, `dispute_resolutions`.

---

## 5. End-to-End Flow Summary

```
[Report]
  User -> input secret -> backend hash jadi commitment (1.4) -> simpan di items
  secret asli langsung dibuang

[Claim]
  User -> input secret sendiri di browser
       -> snarkjs.groth16.fullProve() (1.6) pakai commitment+salt dari items
       -> kirim {proof, publicSignals} ke backend
  Backend -> cocokkan publicSignals[0] vs items.commitment
          -> snarkjs.groth16.verify() (1.7) -> simpan ke claims (zkp_valid)
          -> klaim ke-2+ untuk item sama -> items.status = DISPUTED
          -> scheduleDisputeResolution() (Section 3) dipanggil

[Dispute Window Closes] (BullMQ delayed job, Section 3)
  Ambil semua claims WHERE item_id = X AND status = PENDING
  -> resolveDisputes() (Section 2.2)
       - klaim zkp_valid=false auto reject
       - klaim valid diurutin by timestamp submit paling awal
       - deferred acceptance -> 1 item = 1 claimant (atau null)
  -> update claims.status, items.status
  -> simpan ke dispute_resolutions (audit trail)
```

---

## 6. Nilai Jual (Core Value)

1. **Zero-knowledge = nol pengetahuan** — server *provably* nggak pernah tahu rahasia asli. Beda kelas dibanding enkripsi biasa (yang masih bisa didekripsi kalau key bocor).
2. **Nggak ada AI di jalur kritikal keamanan** — verifikasi = fungsi matematis deterministik, nggak bisa di-jailbreak kayak chatbot.
3. **Gale-Shapley = provable fairness** — hasil matching *mathematically stable*, bukan cuma "algoritma keren".

Narasi ke juri: **security by math, fairness by math** — jauh lebih defensible dibanding "AI kami akurat".

## 7. Future Work (Catatan, Belum Diimplementasi)

**Admin Archive/Warehouse** — dashboard React buat admin, fetch data dari `items`, `claims`, `dispute_resolutions`. Fungsinya sebagai audit trail buat nunjukin ke juri gimana Gale-Shapley resolve konflik step-by-step. Nggak butuh mekanisme backend baru — skema di Section 4 udah cukup.
