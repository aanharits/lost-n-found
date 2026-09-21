# ZKP Setup Guide — Lost & Found Kampus AI

> **OS:** Windows  
> **Tanggal setup:** 21 September 2026  
> **Branch:** `feat/zkp`

Dokumen ini mencatat semua yang diinstall untuk setup ZKP dari awal, apa fungsinya, dan cara install-nya. Dibuat supaya anggota tim lain bisa replikasi setup ini tanpa bingung.

---

## Gambaran Besar: Apa yang Diinstall dan Untuk Apa

```
Yang diinstall:

1. RUST          → bahasa pemrograman untuk build Circom
                   (diinstall via winget, sekali saja)

2. CIRCOM        → compiler bahasa circuit ZKP (.circom → .wasm + .r1cs)
                   (diinstall via binary pre-built dari GitHub releases)

3. SNARKJS CLI   → tool CLI untuk trusted setup (generate .zkey, .ptau, dll)
                   (diinstall via npm install -g)

4. SNARKJS npm   → library untuk verify proof di Node.js (backend)
   CIRCOMLIBJS      library untuk hitung hash Poseidon (backend)
   JS-SHA3          library untuk konversi string → field element
                   (diinstall via npm install di folder /server)

5. SNARKJS npm   → library untuk generate proof di browser (frontend)
   JS-SHA3          library untuk konversi string → field element
                   (diinstall via npm install di folder /web)
```

---

## Detail Tiap Tool

### 1. Rust

**Apa itu:** Bahasa pemrograman system-level yang dipakai untuk membangun Circom. Kamu tidak perlu nulis kode Rust — ini hanya dependency agar Circom bisa diinstall.

**Dipakai di:** Setup phase only (tidak dipakai saat app jalan)

**Install via:** winget (Windows Package Manager)

```powershell
winget install Rustlang.Rustup -e --silent
```

> Saat prompt muncul "Do you agree to all the source agreements terms? [Y/N]" → ketik `Y` lalu Enter.

**Verifikasi:**
```powershell
# Buka terminal BARU setelah install, lalu:
cargo --version
# Output: cargo 1.98.1 (atau versi lain)
```

**Catatan untuk anggota tim lain:** Kalau hanya butuh pakai file hasil setup (`.wasm`, `.zkey`, `verification_key.json`), **tidak perlu install Rust**. Rust hanya dibutuhkan kalau mau compile ulang circuit.

---

### 2. Circom

**Apa itu:** Compiler bahasa khusus untuk menulis ZKP circuit. Kamu nulis logika verifikasi dalam bahasa Circom (file `.circom`), lalu compiler ini mengubahnya menjadi file yang bisa dipakai snarkjs.

**Dipakai di:** Setup phase only — untuk compile `ownership_proof.circom`

**Versi yang diinstall:** 2.2.3

**Install via:** Pre-built binary dari GitHub Releases

> ⚠️ **Kenapa tidak pakai `cargo install`?**  
> Cara normal install Circom adalah via `cargo install --git https://github.com/iden3/circom.git` yang compile dari source code Rust. Di Windows, ini butuh **Visual Studio Build Tools (~6GB)**. Untuk menghindari download 6GB, kita pakai binary Windows yang sudah jadi dari GitHub Releases — hasilnya sama persis, tanpa perlu VS Build Tools.

**Langkah install:**

```powershell
# 1. Buat folder untuk binary
New-Item -ItemType Directory -Force -Path "C:\Users\<username>\bin"

# 2. Download binary Circom untuk Windows
Invoke-WebRequest `
  -Uri "https://github.com/iden3/circom/releases/download/v2.2.3/circom-windows-amd64.exe" `
  -OutFile "C:\Users\<username>\bin\circom.exe"

# 3. Tambahkan ke PATH permanen
[Environment]::SetEnvironmentVariable(
  "PATH",
  $env:PATH + ";C:\Users\<username>\bin",
  [System.EnvironmentVariableTarget]::User
)
```

> Ganti `<username>` dengan username Windows kamu (cek dengan `$env:USERNAME` di PowerShell).

**Verifikasi:**
```powershell
# Buka terminal BARU, lalu:
circom --version
# Output: circom compiler 2.2.3
```

**File yang dihasilkan setelah compile:**
```
build/
├── ownership_proof.r1cs          → representasi matematis circuit
└── ownership_proof_js/
    └── ownership_proof.wasm      → "mesin" generate proof di browser
```

---

### 3. snarkjs (Global CLI)

**Apa itu:** Tool command-line untuk menjalankan proses **Trusted Setup** — proses menghasilkan "kunci kriptografis" yang mengikat circuit ZKP kita ke sistem Groth16. Trusted setup hanya dilakukan **satu kali**.

**Dipakai di:** Setup phase only — untuk generate `.ptau`, `.zkey`, dan `verification_key.json`

**Install via:** npm global

```bash
npm install -g snarkjs
```

**Verifikasi:**
```bash
snarkjs --version
# Output: 0.7.x atau versi terbaru
```

**Yang dihasilkan oleh snarkjs CLI saat trusted setup:**

| File | Ukuran | Dipakai di |
|---|---|---|
| `pot14_final.ptau` | ~50MB | Hanya saat setup (bisa dibuang setelah selesai) |
| `ownership_proof_final.zkey` | 30-100MB | Frontend (`web/static/zk/`) |
| `verification_key.json` | ~2KB | Backend (`server/zk/`) |

---

### 4. npm Packages — Backend (`/server`)

Diinstall di folder `server/`:

```bash
cd server
npm install snarkjs circomlibjs js-sha3
```

| Package | Versi | Fungsi |
|---|---|---|
| `snarkjs` | latest | Verify proof dari pengklaim di Node.js (`groth16.verify()`) |
| `circomlibjs` | latest | Hitung hash Poseidon saat pelapor daftarkan keyword (report phase) |
| `js-sha3` | latest | Konversi string keyword → field element BN254 sebelum di-hash |

**Di code dipakai untuk:**
```typescript
import * as snarkjs from 'snarkjs';
import { buildPoseidon } from 'circomlibjs';
import { keccak256 } from 'js-sha3';

// Saat report: hitung commitment dari keyword
const poseidon = await buildPoseidon();
const commitment = poseidon([stringToFieldElement("geologi")]);

// Saat claim: verifikasi proof dari pengklaim
const isValid = await snarkjs.groth16.verify(vKey, publicSignals, proof);
```

---

### 5. npm Packages — Frontend (`/web`)

Diinstall di folder `web/`:

```bash
cd web
npm install snarkjs js-sha3
```

| Package | Versi | Fungsi |
|---|---|---|
| `snarkjs` | latest | Generate proof di browser (`groth16.fullProve()`) |
| `js-sha3` | latest | Konversi string keyword → field element BN254 sebelum di-prove |

> `circomlibjs` **tidak** diinstall di frontend karena menghitung commitment (Poseidon hash) hanya dilakukan di backend saat report. Frontend hanya perlu `fullProve()`.

**Di code dipakai untuk:**
```typescript
import * as snarkjs from 'snarkjs';
import { keccak256 } from 'js-sha3';

// Saat claim: generate proof di browser (berjalan di Web Worker)
const { proof, publicSignals } = await snarkjs.groth16.fullProve(
  circuitInput,
  '/zk/ownership_proof.wasm',
  '/zk/ownership_proof_final.zkey'
);
```

---

## Ringkasan: Siapa Install Apa

| Tool | Orang yang setup circuit | Developer lain (tim) |
|---|---|---|
| Rust | ✅ Install | ❌ Tidak perlu |
| Circom binary | ✅ Install | ❌ Tidak perlu |
| snarkjs CLI (global) | ✅ Install | ❌ Tidak perlu |
| snarkjs (npm server) | ✅ `npm install` | ✅ `npm install` (otomatis) |
| circomlibjs (npm server) | ✅ `npm install` | ✅ `npm install` (otomatis) |
| js-sha3 (npm) | ✅ `npm install` | ✅ `npm install` (otomatis) |
| `.wasm` file | ✅ Generate | 📥 Dapat dari Google Drive / repo |
| `.zkey` file | ✅ Generate | 📥 Dapat dari Google Drive / repo |
| `verification_key.json` | ✅ Generate | 📥 Dapat dari Google Drive / repo |

---

## Struktur File Setelah Setup Lengkap

```
lost-n-found/
├── server/
│   ├── zk/
│   │   └── verification_key.json     ← hasil trusted setup (2KB)
│   └── package.json                  ← sudah ada snarkjs, circomlibjs, js-sha3
│
└── web/
    ├── static/
    │   └── zk/
    │       ├── ownership_proof.wasm  ← hasil compile circuit (1-5MB)
    │       └── ownership_proof_final.zkey  ← hasil trusted setup (30-100MB)
    └── package.json                  ← sudah ada snarkjs, js-sha3
```

---

## Langkah Selanjutnya Setelah Setup

Setelah semua terinstall, urutan langkah berikutnya adalah:

```
1. Tulis circuit → server/zk/ownership_proof.circom
2. Compile circuit:
   circom ownership_proof.circom --r1cs --wasm -o build/
3. Trusted setup:
   snarkjs powersoftau new bn128 14 pot14_0000.ptau
   snarkjs powersoftau contribute pot14_0000.ptau pot14_final.ptau
   snarkjs powersoftau prepare phase2 pot14_final.ptau pot14_final.ptau
   snarkjs groth16 setup build/ownership_proof.r1cs pot14_final.ptau circuit_0000.zkey
   snarkjs zkey contribute circuit_0000.zkey circuit_final.zkey
   snarkjs zkey export verificationkey circuit_final.zkey verification_key.json
4. Test circuit lokal:
   node test-circuit.js
5. Distribusikan file ke folder yang benar (lihat struktur di atas)
```

Lihat [`technical_flow_guide.md`](./technical_flow_guide.md) untuk detail implementasi code-nya.
