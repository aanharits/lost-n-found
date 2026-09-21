# Panduan Membaca Dokumentasi (Reading Order)

Dokumen-dokumen di dalam folder `docs/` ini mencatat seluruh sejarah pemikiran, pengembangan, dan integrasi proyek **Lost & Found Kampus** hingga mencapai tahap implementasi akhir sistem keamanan kriptografi.

Bagi anggota tim baru, rekan *tester*, atau dosen pembimbing/penilai, silakan membaca dokumen-dokumen ini sesuai urutan berikut untuk memahami alur pikir proyek dari hulu ke hilir:

---

## 🏆 FASE 1: Konsep & Fondasi Keamanan (Wajib Dibaca)
Ini adalah dokumen teoritis yang merumuskan masalah utama dari aplikasi *Lost & Found* konvensional, serta solusi arsitektur yang kita tawarkan.
1. [analisis_tri_layer_lock.md](./analisis_tri_layer_lock.md) - Analisis fundamental tentang arsitektur *Tri-Layer Lock* (NLP + ZKP + Algoritma Gale-Shapley) yang menjadi inti keamanan aplikasi kita.
2. [gale_shapley_architecture.md](./gale_shapley_architecture.md) - Penjelasan mendalam tentang peran Layer 3 (Penyelesaian Sengketa / Masa Sanggah 1 Menit) dan *roadmap* algoritmanya menuju N-to-N matching.

---

## ⚙️ FASE 2: Implementasi Zero-Knowledge Proof (ZKP)
Dokumen teknis tentang bagaimana sirkuit kriptografi diracik dari nol dan dikompilasi agar bisa berjalan di browser web.
3. [zkp_setup_guide.md](./zkp_setup_guide.md) - Catatan langkah-langkah instalasi lingkungan *Circom*, *SnarkJS*, dan inisiasi *Powers of Tau (PTau)*.
4. [zkp_build_log.md](./zkp_build_log.md) - Jurnal log eksekusi kompilasi sirkuit `ownership_proof.circom` (pembuktian rahasia Poseidon Hash) menjadi file `.wasm` dan `.zkey`.

---

## 🚀 FASE 3: Integrasi Full-Stack (Frontend & Backend)
Dokumen yang menjelaskan bagaimana otak kriptografi (ZKP) dihubungkan ke UI (Svelte) dan logika *Server* (Node.js/Socket.io).
5. [backend_zkp_summary.md](./backend_zkp_summary.md) - Penjelasan integrasi API Groq LLM (untuk mengekstrak ciri-ciri rahasia) dan logika verifikasi *Proof* secara *real-time* di *Backend*.
6. [frontend_zkp_guide.md](./frontend_zkp_guide.md) - Penjelasan bagaimana *Browser* klien mengkomputasi *Proof* secara lokal (tanpa pernah membocorkan *keyword* rahasianya ke internet), dan bagaimana UI dinamis berganti teks (*Lost* vs *Found*).
7. [zkp_test_report.md](./zkp_test_report.md) - Laporan hasil pengujian *End-to-End* ZKP, termasuk catatan *bug fixes* mengenai isu salah ketik (Typo) yang sempat ditolak secara ketat oleh *hash* ZKP.

---

## 📜 Dokumen Sejarah Pengembangan Kuno (Pre-ZKP Phase)
Dokumen-dokumen di bawah ini adalah warisan dari fase awal pengembangan purwarupa (sebelum ide keamanan ZKP dan lelang Gale-Shapley dicetuskan). Anda cukup membacanya sebagai referensi tambahan:
* [PRD.md](./PRD.md) - *Product Requirements Document* asli.
* [MIGRATE_TECH_STACK.md](./MIGRATE_TECH_STACK.md) & [MIGRATION_NOTES.md](./MIGRATION_NOTES.md) - Jurnal sejarah migrasi besar-besaran proyek dari Vanilla HTML/JS ke ekosistem Svelte 5 & TypeScript.
* [tag-feature-summary.md](./tag-feature-summary.md) - Rangkuman pembuatan fitur otomatisasi Tagging & Kategori berbasis AI NLP.
* [technical_flow_guide.md](./technical_flow_guide.md) & [integration_guide.md](./integration_guide.md) - Cetak biru panduan arsitektur alur data tradisional aplikasi awal.
