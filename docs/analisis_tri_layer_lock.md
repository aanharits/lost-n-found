# 🔬 Analisis "Tri-Layer Lock" — Layer per Layer

---

## Layer 1: Multi-Keyword Hashing (ZKP)

**Ide:** Ganti 1 kalimat → array keyword terpisah, masing-masing di-hash sendiri.

### ✅ Yang Benar

Ini menyelesaikan problem *exact string match* dengan tepat. Circuit dengan multiple public inputs seperti ini valid secara circom:

```
Public:  [Hash_1, Hash_2, Hash_3]
Private: [kata_1, kata_2, kata_3]
Constraint: SHA256(kata_1)==Hash_1 AND SHA256(kata_2)==Hash_2 ...
```

### ⚠️ Problem Baru yang Muncul

**Masalah 1: Threshold Logic di Circuit**

Kamu bilang *"minimal 2 dari 3 keyword"* — ini bukan trivial di ZKP. Circuit harus encode logika threshold, bukan sekedar AND. Di Circom ini butuh struktur **comparator + sum constraints** yang lebih kompleks:

```circom
// Ini tidak sesimple AND
signal totalMatch;
totalMatch <== match1 + match2 + match3;
// threshold: totalMatch >= 2 → valid
// Tapi ">=" di circuit butuh range proof → constraint meledak
```

**Masalah 2: Order Sensitivity**

Kalau Hash_1 = hash("geologi") dan Hash_2 = hash("biru"), pengklaim harus tau **urutan** keyword-nya sama dengan pelapor. Ini bisa diatasi dengan sorted canonical form tapi harus didesain dari awal.

**Masalah 3: Keyword masih case/typo sensitive**

"geologi" vs "Geologi" vs "geologi " = hash beda. Solusinya `toLowerCase().trim()` sebelum hash, tapi ini harus distandarisasi di kedua sisi.

---

## Layer 2: LLM sebagai Keyword Extractor (Client-side)

**Ide:** LLM ekstrak keyword dari natural language input user, keyword bersih itu yang masuk ke ZKP prover.

### ✅ Yang Benar — Ini Secara Konseptual Paling Kuat

Ini adalah **Semantic Normalization**. Pemisahan concern-nya sangat elegan:

```
NLP responsibility  → LLM (handle bahasa manusia yang messy)
Security responsibility → ZKP (handle kebenaran matematis)
```

### 🔴 Problem Kritis: Simetri Ekstraksi

Ini adalah **masalah terbesar** yang sering kelewatan:

```
Pelapor extract "ada stiker geologi dan jas hujan biru"
  → LLM-nya: ["geologi", "biru"]
  → Hash: [H("geologi"), H("biru")]

Pengklaim extract "ada sticker anak geologi sama jas ujan warna biru"
  → LLM yang SAMA harus menghasilkan: ["geologi", "biru"] ← harus identik!
```

**Masalah:** LLM adalah model non-deterministik. Output-nya bisa berbeda untuk input yang semantically sama, bahkan dengan model yang sama dan temperature=0. Kamu perlu **prompt engineering yang sangat ketat + model yang di-pin ke versi spesifik** untuk menjamin determinisme ini.

Solusinya: Bukan LLM generatif biasa, tapi **NLP pipeline deterministik** seperti:

- Lowercasing + stop word removal + stemming (Sastrawi untuk Bahasa Indonesia)
- Hasilnya: canonical token set yang reproducible

Atau kalau tetap pakai LLM: **output format JSON strict** dengan few-shot prompt + temperature=0 + model version pinned.

### ⚠️ "LLM di HP User" — Ini Realistis?

Untuk hackathon dengan timeline pendek, LLM lokal di device berat secara setup. Lebih realistis: call ke **API Groq** (yang sudah kamu pakai) dari browser/backend dengan prompt khusus ekstraksi keyword.

---

## Layer 3: Gale-Shapley untuk Multi-Prover

**Ide:** Kalau beberapa orang lolos ZKP (tahu keyword yang sama), gunakan AI scoring + Gale-Shapley untuk resolve siapa pemilik sebenarnya.

### ✅ Yang Benar — Secara Teori

Ini valid dan mathematically beautiful. Dan skenarionya nyata: barang generik kampus (charger, payung hitam, botol minum) sangat mungkin keyword-nya bisa ditebak oleh banyak orang.

### ⚠️ Logical Gap yang Perlu Dipikirkan

**Gap 1: Kalau ZKP sudah "mutlak", kenapa perlu AI lagi?**

Ini pertanyaan yang pasti ditanya juri. Jawabannya harus disiapkan:

> *"ZKP membuktikan bahwa claimant TAHU keyword rahasia — tapi tidak membuktikan bahwa mereka PEMILIK ASLI. Di barang generik, banyak orang yang mungkin tahu atau menebak dengan benar keyword umum. Gale-Shapley + AI scoring adalah resolusi kontekstual untuk kasus ambiguitas ini."*

**Gap 2: Skor AI tidak deterministik**

Kalau preferensi Gale-Shapley didasarkan pada AI score (0-100), dan AI score-nya non-deterministik, maka fairness-nya bisa dipertanyakan. Solusi yang lebih defensible: gunakan **timestamp submit** sebagai primary sort key (sudah ada di integration guide), AI score hanya sebagai tiebreaker.

---

## 📊 Scoreboard Keseluruhan

| Komponen | Validitas Teknis | Realisme Implementasi | Nilai Jual ke Juri |
|---|---|---|---|
| Multi-keyword ZKP hashing | ✅ Benar | ⚠️ Threshold logic rumit | ⭐⭐⭐⭐⭐ |
| LLM keyword extractor | ✅ Konsep benar | ⚠️ Determinisme harus dijaga | ⭐⭐⭐⭐⭐ |
| Simetri extraction (kritis!) | ⚠️ Butuh solusi konkret | 🔴 Harus didesain hati-hati | — |
| Gale-Shapley post-ZKP | ✅ Benar | ✅ Sudah ada di guide | ⭐⭐⭐⭐⭐ |
| Narasi "Tri-Layer Lock" | — | ✅ Sangat catchy | ⭐⭐⭐⭐⭐ |

---

## 🎯 Hal yang Harus Diputuskan Sebelum Coding

Sebelum lanjut implementasi, ada **1 keputusan arsitektur paling kritis** yang harus dijawab dulu:

> **Siapa yang melakukan keyword extraction — dan bagaimana menjamin hasilnya identik di sisi pelapor dan pengklaim?**

Ada tiga opsi konkret:

**Opsi 1 — NLP Deterministik (Paling Safe)**

Pakai rule-based: lowercase + hapus stopword Bahasa Indonesia + sort alphabetical. Hasilnya 100% reproducible, zero AI di path ini.

**Opsi 2 — LLM dengan Structured Output (Middle Ground)**

Groq API dengan prompt ketat, format JSON, temperature=0, model version pinned. Ada risiko kecil non-determinisme tapi manageable untuk PoC.

**Opsi 3 — Hybrid**

Rule-based sebagai primary normalization, LLM hanya sebagai fallback untuk kata yang tidak dikenali stopword list.

---

## ✅ Kesimpulan

Solusi ini secara keseluruhan **valid, inovatif, dan defensible** untuk hackathon. Problem utama yang tersisa bukan di konsep, tapi di **detail implementasi simetri extraction**. Kalau itu solved, arsitektur ini genuinely impressive.
