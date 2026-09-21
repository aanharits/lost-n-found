# ZKP Build Log — Circuit & Trusted Setup

> **Tanggal:** 21 September 2026  
> **Branch:** `feat/zkp`  
> **Status:** ✅ Selesai — siap lanjut ke testing & integrasi

Dokumen ini mencatat **apa yang dilakukan, kenapa, dan hasilnya** pada sesi build ZKP hari ini. Mulai dari penulisan circuit sampai trusted setup selesai.

---

## Apa yang Dikerjakan Hari Ini

```
1. Buat struktur folder ZKP di project
2. Tulis circuit ownership_proof.circom
3. Compile circuit → .r1cs + .wasm
4. Trusted Setup Phase 1 (Powers of Tau)
5. Trusted Setup Phase 2 (Circuit-specific)
6. Export verification_key.json
7. Distribusikan file ke folder yang benar
8. Tulis utility: normalizeKeywords.ts + fieldElement.ts
```

---

## 1. Struktur Folder yang Dibuat

```
lost-n-found/
├── server/
│   ├── zk/
│   │   ├── circuits/
│   │   │   └── ownership_proof.circom     ← source circuit (ditulis manual)
│   │   ├── build/                         ← output compile & setup
│   │   │   ├── ownership_proof.r1cs
│   │   │   ├── ownership_proof.sym
│   │   │   ├── ownership_proof_js/
│   │   │   │   └── ownership_proof.wasm
│   │   │   ├── pot14_0000.ptau
│   │   │   ├── pot14_0001.ptau
│   │   │   ├── pot14_final.ptau
│   │   │   ├── circuit_0000.zkey
│   │   │   └── circuit_final.zkey
│   │   └── verification_key.json          ← dipakai backend untuk verify
│   └── src/
│       └── zk/
│           ├── normalizeKeywords.ts        ← utility normalisasi keyword
│           └── fieldElement.ts             ← utility konversi string → field
│
└── web/
    └── static/
        └── zk/
            ├── ownership_proof.wasm        ← didownload browser saat fullProve
            └── circuit_final.zkey          ← didownload browser saat fullProve
```

**Command yang dijalankan:**
```powershell
New-Item -ItemType Directory -Force -Path "server/zk/circuits"
New-Item -ItemType Directory -Force -Path "server/zk/build"
New-Item -ItemType Directory -Force -Path "web/static/zk"
```

---

## 2. Circuit: `ownership_proof.circom`

**Lokasi:** `server/zk/circuits/ownership_proof.circom`

### Apa yang dilakukan circuit ini?

Circuit ini membuktikan bahwa seorang pengklaim **mengetahui 3 keyword rahasia** yang ketika di-hash Poseidon menghasilkan nilai yang cocok dengan commitment pelapor — **tanpa pernah mengirimkan keyword itu ke server**.

### Struktur Input

| Signal | Tipe | Artinya |
|---|---|---|
| `secret_1` | Private | Keyword 1 (hanya pengklaim tahu) |
| `secret_2` | Private | Keyword 2 |
| `secret_3` | Private | Keyword 3 |
| `hash_1` | Public | Poseidon(keyword_1) yang disimpan server saat report |
| `hash_2` | Public | Poseidon(keyword_2) |
| `hash_3` | Public | Poseidon(keyword_3) |

### Logika Constraint

```
Poseidon(secret_1) === hash_1
Poseidon(secret_2) === hash_2
Poseidon(secret_3) === hash_3
```

Semua harus cocok (AND penuh). Tidak ada threshold parsial — satu tidak cocok = proof invalid = klaim ditolak.

### Kenapa Poseidon, bukan SHA256?

SHA256 bisa dipakai, tapi Poseidon dirancang khusus untuk ZK circuit — jauh lebih efisien dalam jumlah constraint yang dihasilkan.

### Catatan Penting untuk Slot Keyword Kosong

Jika pelapor hanya punya 2 keyword, slot ke-3 diisi dengan nilai dummy yang sama di **kedua sisi** (pelapor & pengklaim):

```typescript
stringToFieldElement("__empty__")  // nilai ini selalu konsisten
```

### Hasil Compile

```
template instances:      71
non-linear constraints:  648
linear constraints:      597
public inputs:           3
private inputs:          3
wires:                   1249
labels:                  1747
```

648 constraint = ukuran circuit yang kecil → `fullProve()` di browser akan cepat (< 5 detik).

**Command compile:**
```bash
circom circuits/ownership_proof.circom --r1cs --wasm --sym -o build/
```

---

## 3. Trusted Setup

Trusted setup adalah proses **satu kali** untuk menghasilkan kunci kriptografis yang mengikat circuit ke sistem ZKP Groth16.

### Phase 1 — Powers of Tau (Universal)

Phase 1 tidak spesifik ke circuit manapun. File `.ptau` yang dihasilkan bisa dipakai ulang untuk circuit lain selama tidak melebihi batas constraint (2^14 = 16.384 — circuit kita hanya 648).

```bash
# Generate parameter awal
snarkjs powersoftau new bn128 14 build/pot14_0000.ptau -v

# Kontribusi entropy (untuk hackathon, 1x kontribusi cukup)
snarkjs powersoftau contribute build/pot14_0000.ptau build/pot14_0001.ptau \
  --name="LostFoundKampus" \
  -e="random entropy hackathon 2026"

# Persiapkan untuk Phase 2 (proses terlama, ~3 menit)
snarkjs powersoftau prepare phase2 build/pot14_0001.ptau build/pot14_final.ptau -v
```

### Phase 2 — Circuit-specific Setup

Phase 2 mengikat parameter Phase 1 ke circuit spesifik kita.

```bash
# Setup Groth16 untuk circuit ini
snarkjs groth16 setup build/ownership_proof.r1cs build/pot14_final.ptau build/circuit_0000.zkey

# Kontribusi entropy circuit-specific
snarkjs zkey contribute build/circuit_0000.zkey build/circuit_final.zkey \
  --name="LostFoundKampus" \
  -e="hackathon entropy 2026 lost and found"

# Export verification key untuk backend
snarkjs zkey export verificationkey build/circuit_final.zkey verification_key.json
```

### File yang Dihasilkan dan Lokasinya

| File | Ukuran | Lokasi Final | Dipakai Oleh |
|---|---|---|---|
| `ownership_proof.wasm` | ~200KB | `web/static/zk/` | Browser — `fullProve()` |
| `circuit_final.zkey` | ~20MB | `web/static/zk/` | Browser — `fullProve()` |
| `verification_key.json` | ~2KB | `server/zk/` | Backend — `verify()` |
| `pot14_final.ptau` | ~50MB | `server/zk/build/` | Hanya saat setup (bisa diarsip) |

**Command distribusi file:**
```powershell
Copy-Item "build/ownership_proof_js/ownership_proof.wasm" "../../web/static/zk/"
Copy-Item "build/circuit_final.zkey" "../../web/static/zk/"
# verification_key.json sudah langsung di server/zk/
```

---

## 4. Utility Files yang Ditulis

### `server/src/zk/normalizeKeywords.ts`

Fungsi untuk mengubah array keyword mentah menjadi **canonical form yang deterministik**. Dipakai di backend (saat report) dan harus di-copy persis ke frontend (saat claim).

**Yang dilakukan:**
1. Lowercase semua
2. Trim whitespace
3. Filter yang kosong
4. Deduplikasi
5. Sort A-Z ← ini yang solve Order Sensitivity problem
6. Pad ke `MAX_KEYWORDS = 3` dengan `"__empty__"`

**Contoh:**
```typescript
normalizeKeywords(["Geologi", "biru ", "GEOLOGI"])
// → ["__empty__", "biru", "geologi"]

normalizeKeywords(["geologi", "biru"])
// → ["__empty__", "biru", "geologi"]  ← identik dengan di atas ✅
```

### `server/src/zk/fieldElement.ts`

Fungsi untuk mengubah string keyword menjadi BigInt yang valid di scalar field BN254 — format yang dibutuhkan circuit Poseidon.

**Pipeline konversi:**
```
"geologi"
    ↓ keccak256()
"a3f9b2c1..." (hex 64 char)
    ↓ BigInt("0x" + hex)
123456789...n (BigInt 256-bit)
    ↓ % BN254_FIELD_SIZE
98765432...n  (BigInt < 2^254, valid di circuit)
```

**Kenapa keccak256 bukan langsung encode string?**

Field BN254 punya batas maksimum ±2^254. String yang di-encode langsung ke integer bisa melebihi batas ini. keccak256 memastikan output selalu 256-bit, lalu mod field size menjamin nilainya selalu dalam range yang valid.

---

## 5. Status Saat Ini

```
✅ Circuit ditulis       → server/zk/circuits/ownership_proof.circom
✅ Circuit dikompile     → 648 constraints, 6 inputs (3 pub + 3 priv)
✅ Trusted setup selesai → verification_key.json + circuit_final.zkey
✅ File didistribusikan  → web/static/zk/ dan server/zk/
✅ Utility ditulis       → normalizeKeywords.ts + fieldElement.ts

⏭️  Langkah selanjutnya:
   1. Test circuit lokal (test-circuit.js)
   2. Tulis keywordExtractor.ts (Groq API)
   3. Tulis nlpPreprocess.ts (stopword filter)
   4. Update report.handler.ts (ganti secretDetail → commitments)
   5. Update claim.handler.ts (terima proof, bukan teks)
   6. Update ClaimModal.svelte (tambah fullProve flow)
```

---

## Catatan untuk Tim

> [!IMPORTANT]
> File `circuit_final.zkey` (ukuran ~20MB) dan `ownership_proof.wasm` di folder `web/static/zk/` **tidak boleh di-gitignore**. File ini harus ikut di-commit supaya teman tim tidak perlu redo trusted setup.
> Kalau terlalu besar untuk GitHub biasa, gunakan Git LFS atau share via Google Drive.

> [!WARNING]
> Jangan pernah mengubah file `ownership_proof.circom` setelah trusted setup selesai. Perubahan apapun pada circuit akan membuat semua file `.zkey` dan `verification_key.json` yang ada menjadi tidak valid — trusted setup harus diulang dari awal.

> [!NOTE]
> File-file di `server/zk/build/` (`.ptau`, `.r1cs`, `circuit_0000.zkey`) hanya dibutuhkan saat setup. Boleh diabaikan dari git (sudah atau bisa ditambah ke `.gitignore`), tapi jangan hapus dulu sampai project selesai.
