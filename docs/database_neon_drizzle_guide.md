# Panduan Arsitektur Database: Neon PostgreSQL & Drizzle ORM

Dokumentasi komprehensif integrasi database **Neon Serverless PostgreSQL** menggunakan **Drizzle ORM** untuk sistem **Lost & Found Kampus AI**.

---

## 1. Ringkasan Arsitektur

Sistem menggunakan arsitektur **Hybrid Realtime-Persistence**:

- **Persistence Layer (Neon PostgreSQL):** Menyimpan data barang laporan (_items_), bukti komitmen ZKP (_commitments_), dan riwayat pengajuan klaim (_claims_) secara permanen, terstruktur, dan tahan _restart/redeploy_.
- **Realtime Communication Layer (Socket.IO):** Mengirimkan pembaruan data secara instan ke seluruh antarmuka pengguna tanpa membebani database dengan _polling_.
- **Lightweight Ownership (No-Auth):** Pengguna tidak memerlukan registrasi/login dengan kata sandi. Kepemilikan barang untuk hak **Edit & Hapus** serta **Pencegahan Self-Claim** divalidasi menggunakan kombinasi **NPM** dan **Device Secret Token (`reporter_token`)** yang tersimpan di `localStorage` pelapor.

```
┌────────────────────────────────────────────────────────┐
│                   Frontend (SvelteKit)                 │
│  - Profil Mahasiswa di localStorage (Nama, NPM, WA)   │
│  - Anonymous Device Token (reporter_token)             │
└───────────────▲────────────────────────┬───────────────┘
                │                        │
       WebSocket Live Update       HTTP / Socket Event
       (item_added, updated)       (lapor, edit, hapus, klaim)
                │                        │
┌───────────────┴────────────────────────▼───────────────┐
│                    Backend (Hono)                      │
│  - Validasi Skema (Zod)                                │
│  - Verifikasi Kepemilikan (reporter_token / NPM)       │
│  - Verifikasi Zero-Knowledge Proof (snarkjs)           │
└────────────────────────▲───────────────────────────────┘
                         │ Drizzle ORM
                         ▼
┌────────────────────────────────────────────────────────┐
│              Neon Serverless PostgreSQL                │
│  - Tabel: items (Laporan barang & koordinat papan)     │
│  - Tabel: claims (Histori pengajuan klaim & ZKP score) │
└────────────────────────────────────────────────────────┘
```

---

## 2. Skema & Spesifikasi Tabel

### A. Tabel `items` (Daftar Laporan Barang)

Menyimpan semua barang hilang dan ketemu yang dipasang pada papan interaktif.

| Kolom              | Tipe Data      | Nullable | Default       | Deskripsi                                                       |
| ------------------ | -------------- | -------- | ------------- | --------------------------------------------------------------- |
| `id`               | `VARCHAR(64)`  | NO       | -             | Primary Key (misal: `item1790318557579`)                        |
| `type`             | `VARCHAR(10)`  | NO       | -             | Jenis laporan: `'lost'` (hilang) atau `'found'` (ketemu)        |
| `title`            | `VARCHAR(255)` | NO       | -             | Nama barang (misal: "Tumbler Hydroflask Hitam")                 |
| `icon`             | `VARCHAR(16)`  | YES      | `'📦'`        | Emoji icon kartu                                                |
| `category`         | `VARCHAR(64)`  | YES      | `''`          | Kategori utama (Gadget, Apparel, Personal, Dokumen)             |
| `tag`              | `VARCHAR(64)`  | YES      | `''`          | Sub-tag untuk pencocokan icon SVG (misal: `hp`, `tempat_makan`) |
| `description`      | `TEXT`         | NO       | -             | Lokasi / detail penemuan yang ditampilkan publik                |
| `commitments`      | `JSONB`        | YES      | `'[]'::jsonb` | Array hash Poseidon dari ciri rahasia barang untuk ZKP          |
| `status`           | `VARCHAR(20)`  | YES      | `'open'`      | Status barang: `'open'`, `'disputed'`, `'resolved'`             |
| `date`             | `VARCHAR(32)`  | YES      | `''`          | Tanggal kejadian (YYYY-MM-DD)                                   |
| `time`             | `VARCHAR(32)`  | YES      | `''`          | Waktu kejadian (HH:mm)                                          |
| `reporter_name`    | `VARCHAR(100)` | YES      | `''`          | Nama pelapor                                                    |
| `reporter_npm`     | `VARCHAR(32)`  | NO       | -             | NPM pelapor (identitas akademik mahasiswa)                      |
| `reporter_contact` | `VARCHAR(64)`  | YES      | `''`          | Kontak WhatsApp / Telegram pelapor                              |
| `reporter_token`   | `VARCHAR(64)`  | NO       | -             | **UUID Token Rahasia** pelapor untuk hak Edit/Hapus             |
| `x`                | `NUMERIC`      | YES      | `100`         | Koordinat horizontal kartu pada papan retro                     |
| `y`                | `NUMERIC`      | YES      | `100`         | Koordinat vertikal kartu pada papan retro                       |
| `created_at`       | `TIMESTAMPTZ`  | YES      | `NOW()`       | Waktu pembuatan laporan                                         |
| `updated_at`       | `TIMESTAMPTZ`  | YES      | `NOW()`       | Waktu pembaruan terakhir                                        |

---

### B. Tabel `claims` (Pengajuan Klaim Kepemilikan)

Menyimpan riwayat pengajuan bukti kepemilikan via Zero-Knowledge Proof (ZKP v2).

| Kolom              | Tipe Data      | Nullable | Default          | Deskripsi                                             |
| ------------------ | -------------- | -------- | ---------------- | ----------------------------------------------------- |
| `id`               | `VARCHAR(64)`  | NO       | -                | Primary Key (misal: `claim1790318569472`)             |
| `item_id`          | `VARCHAR(64)`  | NO       | -                | Foreign Key ➡️ `items(id)` dengan `ON DELETE CASCADE` |
| `text`             | `TEXT`         | YES      | `'ZKP Verified'` | Label penjelas klaim (tidak membocorkan rahasia)      |
| `score`            | `REAL`         | YES      | `1.0`            | Skor intersection matching (0.0 s.d. 1.0)             |
| `confidence`       | `VARCHAR(32)`  | YES      | `'Tinggi'`       | Tingkat kepercayaan (Tinggi, Sedang, Rendah)          |
| `reasoning`        | `TEXT`         | YES      | `''`             | Keterangan status ZKP dan dispute window              |
| `status`           | `VARCHAR(20)`  | YES      | `'pending'`      | Status klaim: `'pending'`, `'approved'`, `'rejected'` |
| `claimant_name`    | `VARCHAR(100)` | YES      | `''`             | Nama pengklaim barang                                 |
| `claimant_npm`     | `VARCHAR(32)`  | NO       | -                | NPM pengklaim barang                                  |
| `claimant_contact` | `VARCHAR(64)`  | YES      | `''`             | No WhatsApp pengklaim untuk serah-terima              |
| `created_at`       | `TIMESTAMPTZ`  | YES      | `NOW()`          | Waktu pengajuan klaim                                 |

---

## 3. Implementasi Drizzle ORM di Server

### A. Dependensi yang Dibutuhkan (`server/package.json`)

```bash
npm install drizzle-orm @neondatabase/serverless
npm install -D drizzle-kit
```

### B. Definisi Skema (`server/src/db/schema.ts`)

```typescript
import {
  pgTable,
  varchar,
  text,
  jsonb,
  numeric,
  real,
  timestamp,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Tabel items
export const itemsTable = pgTable("items", {
  id: varchar("id", { length: 64 }).primaryKey(),
  type: varchar("type", { length: 10 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  icon: varchar("icon", { length: 16 }).default("📦"),
  category: varchar("category", { length: 64 }).default(""),
  tag: varchar("tag", { length: 64 }).default(""),
  description: text("description").notNull(),
  commitments: jsonb("commitments").$type<string[]>().default([]),
  status: varchar("status", { length: 20 }).default("open"),
  date: varchar("date", { length: 32 }).default(""),
  time: varchar("time", { length: 32 }).default(""),
  reporterName: varchar("reporter_name", { length: 100 }).default(""),
  reporterNpm: varchar("reporter_npm", { length: 32 }).notNull(),
  reporterContact: varchar("reporter_contact", { length: 64 }).default(""),
  reporterToken: varchar("reporter_token", { length: 64 }).notNull(),
  x: numeric("x").default("100"),
  y: numeric("y").default("100"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// Tabel claims
export const claimsTable = pgTable("claims", {
  id: varchar("id", { length: 64 }).primaryKey(),
  itemId: varchar("item_id", { length: 64 })
    .notNull()
    .references(() => itemsTable.id, { onDelete: "cascade" }),
  text: text("text").default("ZKP Proof Verified (Hidden)"),
  score: real("score").default(1.0),
  confidence: varchar("confidence", { length: 32 }).default("Tinggi"),
  reasoning: text("reasoning").default(""),
  status: varchar("status", { length: 20 }).default("pending"),
  claimantName: varchar("claimant_name", { length: 100 }).default(""),
  claimantNpm: varchar("claimant_npm", { length: 32 }).notNull(),
  claimantContact: varchar("claimant_contact", { length: 64 }).default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// Relasi satu item ke banyak klaim (One-to-Many)
export const itemsRelations = relations(itemsTable, ({ many }) => ({
  claims: many(claimsTable),
}));

export const claimsRelations = relations(claimsTable, ({ one }) => ({
  item: one(itemsTable, {
    fields: [claimsTable.itemId],
    references: [itemsTable.id],
  }),
}));

export type ItemRecord = typeof itemsTable.$inferSelect;
export type NewItemRecord = typeof itemsTable.$inferInsert;
export type ClaimRecord = typeof claimsTable.$inferSelect;
export type NewClaimRecord = typeof claimsTable.$inferInsert;
```

### C. File Koneksi Database (`server/src/db/index.ts`)

```typescript
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema.js";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "[Database] DATABASE_URL tidak ditemukan pada environment variables (.env)",
  );
}

// Inisialisasi HTTP client connection ke Neon
const sql = neon(process.env.DATABASE_URL);
export const db = drizzle(sql, { schema });
```

### D. Konfigurasi Drizzle Kit (`server/drizzle.config.ts`)

```typescript
import { defineConfig } from "drizzle-kit";
import dotenv from "dotenv";

dotenv.config();

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

---

## 4. Flow Logika Kepemilikan (No-Auth)

### 1. Inisialisasi Identitas di Frontend

- Di `Lobby.svelte`, saat pengguna memasukkan Nama, NPM, dan No HP:
  ```typescript
  // Cek apakah sudah ada token kepemilikan perangkat di localStorage
  let reporterToken = localStorage.getItem("lf_device_token");
  if (!reporterToken) {
    reporterToken = "tok_" + crypto.randomUUID();
    localStorage.setItem("lf_device_token", reporterToken);
  }
  ```

### 2. Pelaporan Barang Baru (`item_add`)

- Client menyertakan `reporterToken` ke payload laporan.
- Backend menyimpan data barang beserta `reporter_token` ke tabel `items`.
- Saat data di-broadcast ke publik via Socket.IO, `reporter_token` **tidak diekspos** (disanitasi), atau client memvalidasi kepemilikan berdasarkan `item.reporterNpm === currentPlayer.npm`.

### 3. Pencegahan Self-Claim (Tidak Bisa Klaim Barang Sendiri)

- **Frontend (`ItemCard.svelte`):**
  Jika `item.reporterNpm === currentPlayer.npm`:
  - Tombol **KLAIM BARANG** disembunyikan.
  - Ditampilkan badge **"BARANG SAYA"** beserta tombol **EDIT** & **HAPUS**.
- **Backend (`claim.handler.ts`):**
  ```typescript
  if (item.reporterNpm === claimantNpm) {
    socket.emit("claim_error", {
      message: "Anda tidak dapat mengklaim barang yang Anda laporkan sendiri.",
    });
    return;
  }
  ```

### 4. Edit dan Hapus Laporan

- Endpoint / Socket Handler `item_delete` & `item_edit`:
  Backend memeriksa apakah `reporterToken === item.reporterToken` atau `reporterNpm === requesterNpm`.
  Jika tidak cocok, kembalikan status error `403 Forbidden` (_"Hanya pembuat laporan yang berhak mengedit atau menghapus barang ini"_).
