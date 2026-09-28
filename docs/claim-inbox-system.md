# Docs: Sistem Klaim & Inbox

## 1. Sistem Klaim Dua Fase

### Masalah dengan sistem lama
Gale-Shapley dipakai sebagai **penentu utama** dengan timer 1 menit — ini janggal karena pemilik asli yang baru buka app beberapa jam kemudian sudah kalah. Siapa yang tahu ciri paling banyak belum tentu pemilik asli.

### Desain baru: Reporter sebagai hakim utama

```
Pengklaim kirim ciri barang
         |
   [ZKP Verification]
         |
   score < 50%  -->  Ditolak (tidak masuk riwayat)
         |
   score >= 50% -->  Masuk antrian PENDING di inbox reporter
         |
         +--------> Timer 48 jam mulai (fallback)
                         |
              Reporter approve manual?
              /                      \
            YA                       TIDAK (timeout 48 jam)
             |                             |
    Klaim dipilih APPROVED         Gale-Shapley jalan:
    Sisanya REJECTED               - Sort score DESC
    Timer dibatalkan               - Tiebreak: klaim paling awal
    Item -> RESOLVED               Item -> RESOLVED
```

### Aturan sistem

| Kondisi | Tindakan |
|---|---|
| ZKP score < 50% | Ditolak, tidak tampil di inbox reporter |
| ZKP score >= 50% | Masuk antrian pending, reporter notified |
| Reporter approve dalam 48 jam | Langsung resolved, timer dibatalkan |
| Reporter tidak aktif 48 jam | Gale-Shapley auto-resolve berdasarkan score |
| Item sudah resolved | Klaim baru ditolak |

### Kenapa Gale-Shapley masih ada?
Gale-Shapley sekarang berperan sebagai **safety net** bukan penentu utama:
- Manusia (reporter) lebih tahu siapa pemilik aslinya
- Gale-Shapley menjamin tidak ada item yang nyangkut selamanya
- Secara akademik: ZKP membuktikan *pengetahuan*, reporter membuktikan *identitas*, Gale-Shapley menyelesaikan *deadlock*

---

## 2. Inbox Panel

### Akses
Tombol **INBOX** di header board (antara status online dan profil). Badge merah muncul jika ada item pending.

### Tab KLAIM MASUK (untuk reporter)
- Menampilkan semua klaim pending untuk barang yang pernah dilaporkan
- Info: nama pengklaim, NPM, ZKP score, deskripsi klaim, waktu
- Tombol **SETUJUI KLAIM INI** — satu klik, sisanya otomatis ditolak
- Klaim yang sudah diproses tampil sebagai daftar collapsed

### Tab KLAIM SAYA (untuk pengklaim)
- Semua klaim yang pernah diajukan beserta statusnya
- Status: `PENDING` / `DISETUJUI` / `DITOLAK`
- Jika disetujui: tombol **HUBUNGI VIA WHATSAPP** muncul otomatis

### Alur user

**Pengklaim:**
1. Klik kartu -> KLAIM BARANG
2. Isi ciri barang -> kirim -> ZKP diverifikasi otomatis
3. Modal sukses: "Pantau di INBOX > KLAIM SAYA"
4. Buka INBOX, cek tab KLAIM SAYA -> status real-time

**Reporter:**
1. Badge merah muncul di tombol INBOX
2. Buka INBOX -> tab KLAIM MASUK
3. Review deskripsi + ZKP score tiap pengklaim
4. Klik SETUJUI -> selesai, pengklaim lain otomatis ditolak

---

## File yang Berubah

### Server
| File | Perubahan |
|---|---|
| `schemas/claim.schema.ts` | Tambah `claimApproveSchema` |
| `handlers/claim.handler.ts` | Tambah `handleClaimApprove` |
| `socket/handlers.ts` | Register event `claim_approve` |
| `zk/disputeTimer.ts` | Timer 1 menit -> 48 jam, tambah `cancelDisputeWindow` |

### Web
| File | Perubahan |
|---|---|
| `stores/ui.ts` | Tambah `inboxOpen`, `inboxTab` stores |
| `components/InboxPanel.svelte` | Komponen baru |
| `components/Board.svelte` | Tombol INBOX + badge counter di HUD |
| `components/ClaimModal.svelte` | Pesan sukses diarahkan ke inbox |

### Socket Events
| Event | Arah | Keterangan |
|---|---|---|
| `claim_approve` | Client -> Server | Reporter setujui klaim |
| `claim_approve_error` | Server -> Client | Error saat approve |
| `dispute_resolved` | Server -> All | Ada field baru: `resolvedBy: 'reporter' atau 'auto'` |
