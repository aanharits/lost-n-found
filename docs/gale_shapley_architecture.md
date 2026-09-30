# Arsitektur Gale-Shapley pada Lost & Found

Dokumen ini menjelaskan peran algoritma **Gale-Shapley (Stable Marriage)** sebagai fondasi dari Layer 3 (Dispute Resolution) pada sistem *Tri-Layer Lock* kita, serta peta jalannya (roadmap) dari skala *Proof of Concept* hingga tahap *Production*.

---

## 1. Filosofi Gale-Shapley di Sistem Kita

Algoritma Gale-Shapley sejatinya dirancang untuk menyelesaikan masalah perjodohan/pencocokan optimal (N pihak A dengan N pihak B), seperti menempatkan mahasiswa kedokteran ke rumah sakit. 

Dalam konteks aplikasi Lost & Found kampus, sistem ini digunakan untuk menyelesaikan dilema **"Sengketa Kepemilikan"**.
Bayangkan jika dalam satu hari yang sama, ada 3 buah "Tumbler Merah" yang dilaporkan hilang, dan ada 4 mahasiswa yang mengklaim kehilangan tumbler merah. 
Siapa mendapatkan tumbler yang mana? Di sinilah Gale-Shapley beraksi dengan mencocokkan skor preferensi tertinggi antara *Claimant* (Pengklaim) dan *Item* (Barang).

---

## 2. Implementasi Saat Ini (Versi Proof of Concept / PoC)

Karena fokus proyek saat ini adalah pembuktian integrasi Zero-Knowledge Proof (ZKP) dalam aplikasi *single-item testing*, algoritma Gale-Shapley kita sederhanakan, namun **kerangka kerjanya** sudah aktif berjalan.

### Bagaimana Kerangka Kerjanya Diterapkan?
1. **Penahanan Keputusan (The Dispute Window):** Alih-alih memberikan kontak penemu langsung kepada orang pertama yang lolos ZKP, sistem mengaktifkan *Timer* Masa Sanggah (1 Menit) di `disputeTimer.ts`.
2. **Pengumpulan Kandidat (The Pool):** Selama jendela sengketa terbuka, sistem mengizinkan pengklaim lain yang juga tahu ciri-cirinya (bisa lolos ZKP) untuk masuk ke dalam *pool* sengketa (`item.claims`).
3. **Penyelesaian Otomatis (The Matcher):** Begitu timer habis, `resolveDisputes.ts` dieksekusi.

### Logika Penyelesaian (Saat ini):
Pada versi PoC, karena sengketa biasanya hanya terjadi pada 1 barang melawan beberapa penipu/pengklaim ganda (1-to-N), kriteria preferensi / bobot skor yang digunakan sangat sederhana:
**First-Come First-Served (FCFS)**. Pengklaim yang catatan waktunya (`createdAt`) paling awal akan disetujui (`approved`), sedangkan sisanya ditolak (`rejected`).

---

## 3. Rencana Masa Depan (Skala Skripsi / Production)

Kerangka yang sudah ada memungkinkan kita untuk **langsung mencabut** logika FCFS dan menggantinya dengan logika Gale-Shapley yang sesungguhnya (N-to-N Matching) tanpa mengganggu keamanan ZKP.

### Metrik Penilaian Bobot (Scoring Preference)
Ke depannya, *Matcher* tidak hanya melihat siapa yang cepat, tapi menghitung skor *Match* (0 - 100) berdasarkan:
1. **Verifikasi Identitas:** Apakah mahasiswa login dengan akun SSO kampus yang valid?
2. **Jarak Waktu & Lokasi (Proximity):** Seberapa dekat lokasi/waktu penemuan barang dengan jadwal kuliah mahasiswa tersebut? (Bisa dilacak dari data KRS kampus).
3. **Reputasi Akun:** Apakah akun ini sering mengklaim banyak barang dalam sebulan terakhir? (Indikasi penipuan).
4. **Bobot Ekstraksi ZKP Khusus:** (Opsional) Membedakan mana pengguna yang memberikan 5 keyword rahasia valid vs yang hanya 3.

### Alur Eksekusi N-to-N Kelak:
1. **Batching:** Setiap tengah malam (atau per jendela 12 jam), sistem menutup semua barang temuan hari itu.
2. **Scoring:** AI / Algoritma menghitung matriks kecocokan antara N Barang Temuan dengan M Pengklaim.
3. **Stable Matching (Gale-Shapley):** Sistem menjodohkan barang dengan pengklaim.
4. **Notifikasi:** Semua pemenang akan menerima notifikasi kontak WA penemu secara bersamaan di pagi hari.

---

## Kesimpulan

Meski saat ini logika penyelesaian akhirnya sangat sederhana, arsitektur "Masa Sanggah" (Dispute Window) yang kita terapkan telah berhasil meniru fase krusial dari algoritma Gale-Shapley: **Menghentikan klaim sepihak yang impulsif dan memungkinkan evaluasi multi-pihak secara adil.** Ini adalah benteng Lapis Ketiga (Layer 3) yang menyempurnakan keamanan kriptografi ZKP (Layer 1) kita.
