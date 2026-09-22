# Panduan Membaca Dokumentasi (Reading Order)

Dokumen di folder `docs/` mencatat sejarah pemikiran, pengembangan, dan integrasi proyek **Lost & Found Kampus** sampai sistem keamanan ZKP v2.

Folder dipisahkan berdasarkan versi agar tidak tercampur:

- **`docs/v1/`** — Dokumen era **ZKP v1** (circuit `ownership_proof`, AND-gate 3 keyword, dummy padding).
- **`docs/v2/`** — Dokumen era **ZKP v2** (circuit `single_keyword_proof`, intersection scoring, normalisasi keyword). Ini yang **aktif dipakai saat ini**.
- **`docs/` (root)** — Dokumen umum/lintas-versi (PRD, Gale-Shapley, panduan migrasi, dsb).

---

## 🏆 FASE 0: Mulai Dari Sini

1. [PRD.md](./PRD.md) - Product Requirements Document (requirements, acceptance criteria, roadmap).
2. [gale_shapley_architecture.md](./gale_shapley_architecture.md) - Peran Layer 3 (Dispute Window) dan roadmap menuju N-to-N matching.

---

## ⚡ FASE 1: ZKP v2 (AKTIF — Baca Ini Dulu)

Dokumen versi terkini. Jika kamu baru mengenal proyek ini, mulai dari sini.

1. [zkp_v2_intersection_scoring.md](./v2/zkp_v2_intersection_scoring.md) - Desain inti v2: N-commitment + intersection scoring + Gale-Shapley berbobot.
2. [keyword_extraction_strategy.md](./v2/keyword_extraction_strategy.md) - Strategi normalisasi keyword (mekanis vs stopword vs canonical) dan prompt LLM ketat.
3. [zkp_v2_implementation_report.md](./v2/zkp_v2_implementation_report.md) - Laporan pengerjaan v2: 7 perbaikan, alasan angka (5 & 0.5), bukti verifikasi.

---

## 📦 FASE 2: ZKP v1 (Arsip — Referensi Historis)

Dokumen era v1, bermanfaat untuk memahami **dari mana** desain v2 berasal dan masalah apa yang dipecahkan.

4. [analisis_tri_layer_lock.md](./v1/analisis_tri_layer_lock.md) - Analisis arsitektur Tri-Layer Lock (NLP + ZKP + Gale-Shapley).
5. [technical_flow_guide.md](./v1/technical_flow_guide.md) - Solusi teknis 4 problem inti Tri-Layer Lock.
6. [backend_zkp_summary.md](./v1/backend_zkp_summary.md) - Integrasi API Groq LLM & verifikasi proof di backend (v1).
7. [frontend_zkp_guide.md](./v1/frontend_zkp_guide.md) - Panduan generate proof di browser (v1).
8. [zkp_setup_guide.md](./v1/zkp_setup_guide.md) - Instalasi Circom, SnarkJS, dan Powers of Tau.
9. [zkp_build_log.md](./v1/zkp_build_log.md) - Jurnal kompilasi circuit v1 (`ownership_proof`).
10. [zkp_test_report.md](./v1/zkp_test_report.md) - Laporan pengujian End-to-End v1.

---

## 📜 FASE 3: Sejarah Pengembangan Kuno (Pre-ZKP)

Warisan dari fase awal (sebelum ide ZKP & Gale-Shapley). Baca sebagai referensi tambahan saja:

* [MIGRATE_TECH_STACK.md](./MIGRATE_TECH_STACK.md) & [MIGRATION_NOTES.md](./MIGRATION_NOTES.md) - Jurnal migrasi dari Vanilla HTML/JS ke Svelte 5 & TypeScript.
* [tag-feature-summary.md](./tag-feature-summary.md) - Rangkuman fitur otomatisasi Tagging & Kategori berbasis AI NLP.
* [integration_guide.md](./integration_guide.md) - Cetak biru arsitektur alur data aplikasi awal.
