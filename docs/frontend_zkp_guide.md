# Panduan Integrasi ZKP untuk Frontend

Dokumen ini ditujukan untuk **Frontend Developer** agar bisa menyambungkan UI dengan mesin Zero-Knowledge Proof (ZKP) di backend.

> **INFO PENTING**: 
> Kamu **TIDAK PERLU** menginstall *Rust*, *Circom*, atau menjalankan proses *Trusted Setup*. Semua mesin ZKP sudah matang dan di-compile oleh tim Backend. Kamu cukup menggunakan library `snarkjs`.

---

## 1. Persiapan File Wajib

Tim backend sudah membuatkan 2 file sakti hasil kompilasi sirkuit:
1. `ownership_proof.wasm` (Program ZKP)
2. `circuit_final.zkey` (Kunci Prover)

**Tugasmu:**
Pindahkan/Copy kedua file ini dari folder `server/zk/build/` ke folder **`static/zk/`** di dalam *project* Frontend ini (SvelteKit memakai folder `static/`, bukan `public/`).
Tujuannya agar browser pengguna bisa men-download file ini secara statis lewat URL (misal: `http://localhost:5173/zk/ownership_proof.wasm`).

> **Catatan:** File statis SvelteKit di `static/zk/` akan diakses dengan prefix `/zk/` (contoh: `/zk/circuit_final.zkey`). Jangan letakkan langsung di root.

---

## 2. Install snarkjs di Frontend

Buka terminal di folder Frontend (`web/`) lalu jalankan:
```bash
npm install snarkjs js-sha3
```

---

## 3. Alur Pengajuan Klaim (ZKP Proof Generation)

Saat pengguna mengisi form "Klaim Barang" dan mengetikkan ciri-ciri rahasianya (misal: "ada boneka doraemon biru"), kamu tidak boleh mengirim teks mentah ini langsung ke socket/API klaim.

Ikuti 3 langkah ini:

### Langkah A: Ekstrak Keyword lewat API Proxy
Panggil endpoint AI di backend untuk mengubah kalimat panjang menjadi 3 keyword baku.

```javascript
// 1. Ambil input teks dari form pengguna
const rawClaimText = "didalam tasnya ada boneka doraemon warnanya biru";

// 2. Minta backend mengekstraknya jadi array 3 kata
const base = import.meta.env.PUBLIC_SERVER_URL || 'http://localhost:3001';
const response = await fetch(`${base}/api/extract`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ text: rawClaimText })
});

const data = await response.json();
// data.keywords akan berisi: ["biru", "boneka", "doraemon"]
```

### Langkah B: Generate ZKP Proof di Browser
Gunakan `snarkjs` untuk membuat bukti matematis tanpa membocorkan keyword-nya. Pastikan kamu mengubah keyword (string) menjadi angka (*Field Element*) terlebih dahulu. 

```javascript
import * as snarkjs from "snarkjs";
import { keccak_256 } from "js-sha3";

// Fungsi helper mengubah string ke BigInt Field Element BN254
function stringToFieldElement(str) {
  const hashHex = keccak_256(str);
  const hashBigInt = BigInt('0x' + hashHex);
  const PRIME = BigInt("21888242871839275222246405745257275088548364400416034343698204186575808495617");
  return (hashBigInt % PRIME).toString();
}

// 3. Konversi ke Field Element
const secret_1 = stringToFieldElement(data.keywords[0]);
const secret_2 = stringToFieldElement(data.keywords[1]);
const secret_3 = stringToFieldElement(data.keywords[2]);

// 4. Generate Proof menggunakan file statis di folder static/zk
// PENTING: circuit butuh 6 input — 3 secret (private) DAN 3 hash (public)
// yang diambil dari commitments barang (targetItem.commitments).
const { proof, publicSignals } = await snarkjs.groth16.fullProve(
  {
    secret_1, secret_2, secret_3,           // Input RAHASIA (tidak dikirim ke server)
    hash_1: targetItem.commitments[0],      // Public input dari server
    hash_2: targetItem.commitments[1],
    hash_3: targetItem.commitments[2]
  },
  "/zk/ownership_proof.wasm",               // Path ke file WASM di static/zk
  "/zk/circuit_final.zkey"                  // Path ke file ZKEY di static/zk
);
```

### Langkah C: Kirim Proof ke Socket Backend
Setelah *Proof* tercipta, kirimkan melalui *Socket.IO event* `claim_submit`.

```javascript
// 5. Kirim data klaim via socket
socket.emit('claim_submit', {
  itemId: "ID_BARANG_YANG_DIKLAIM",
  proof: proof,                 // Objek JSON bukti matematis
  publicSignals: publicSignals, // Array 3 Hash Poseidon
  claimantName: "Budi",
  claimantNpm: "12345678",
  claimantContact: "0812345678"
});
```

---

## 4. Alur Pelaporan Barang Hilang (Opsional/Info)
Saat seseorang melapor menemukan barang (Event `item_add`), Frontend **tetap bisa mengirimkan teks mentahnya (secretDetail)** ke socket. Backend akan otomatis mengambil alih fungsi AI Extraction & Hashing-nya, lalu menghapus teks mentahnya sebelum disebarkan ke database dan pengguna lain.

```javascript
socket.emit('item_add', {
  id: "item_123",
  type: "found",
  title: "Tas Hitam",
  desc: "Ditemukan di kantin",
  secretDetail: "di dalamnya ada dompet warna merah", // Ini AMAN, backend yang akan memprosesnya jadi ZKP Hash
  // ... field lainnya
});
```
