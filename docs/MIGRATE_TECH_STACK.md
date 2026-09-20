# Migrasi Lost & Found Kampus AI → SvelteKit + Hono

Migrasi arsitektur dari vanilla HTML/CSS/JS + Express + Socket.IO ke SvelteKit (frontend) + Hono (backend), TETAP pakai Socket.IO, pertahankan SEMUA logika bisnis yang sudah ada.

## User Review Required

> [!IMPORTANT]
> **GROQ_API_KEY**: API key Groq dipindahkan ke file `.env` di backend. Pastikan key ini diatur di `.env`.

> [!WARNING]
> **Data items.json**: File `data/items.json` yang ada akan di-copy ke lokasi baru `apps/server/data/items.json`. Format field tetap identik, data yang sudah ada tidak akan berubah.

> [!IMPORTANT]
> **Port**: Backend Hono akan jalan di port 3001, SvelteKit dev server di port 5173 (default). Frontend menghubungi backend via `PUBLIC_SERVER_URL=http://localhost:3001`.

---

## Proposed Changes — Eksekusi Per Phase

---

### Phase 0: Perbaikan Keamanan

#### [NEW] `apps/server/src/data/sanitize.ts`
- Fungsi `sanitizeItem(item)` → return copy item TANPA field `secretDetail`
- Digunakan di SEMUA tempat yang emit data item ke client

#### [NEW] `apps/server/src/routes/api.ts`
- Endpoint `POST /api/verify-claim` → menerima `{ itemId, claimText }`, backend ambil `secretDetail` dari data server, panggil Groq API (key dari env `GROQ_API_KEY`), return `{ score, confidence, reasoning }` — **TIDAK PERNAH return secretDetail**

#### Penggunaan sanitize di socket handlers:
- `items_init` → `items.map(sanitizeItem)`
- `item_added` → `sanitizeItem(newItem)`
- `claim_updated` → tidak menyertakan object item lengkap (sudah OK di design sekarang, tapi pastikan)
- `reset_demo_items` → `items.map(sanitizeItem)`

---

### Phase 1: Struktur Folder Baru (2 service terpisah)

```
/apps/web/          → SvelteKit (frontend)
/apps/server/       → Hono + Socket.IO (backend, TypeScript)
/apps/server/data/  → items.json tetap dipakai
```

#### [NEW] `apps/server/package.json`
- Dependencies: `hono`, `@hono/node-server`, `socket.io`, `dotenv`, `zod`
- Dev: `typescript`, `tsx`, `@types/node`

#### [NEW] `apps/server/tsconfig.json`

#### [NEW] `apps/server/.env`
```
GROQ_API_KEY=gsk_your_groq_api_key_here
PORT=3001
```

#### [NEW] `apps/web/` — SvelteKit project via `npx create-svelte`
- adapter-node
- Dependencies: `socket.io-client`, `@tailwindcss/vite` (Tailwind v4)

---

### Phase 2: Dependencies

**Backend** (`apps/server`):
| Package | Fungsi |
|---|---|
| `hono` | Web framework pengganti Express |
| `@hono/node-server` | Adapter Node.js, return `http.Server` untuk attach Socket.IO |
| `socket.io` | Realtime WebSocket (tetap dipakai) |
| `dotenv` | Load `GROQ_API_KEY` dari `.env` |
| `zod` | Validasi payload dari client |

**Frontend** (`apps/web`):
| Package | Fungsi |
|---|---|
| `svelte` + `@sveltejs/kit` | Framework frontend |
| `@sveltejs/adapter-node` | SSR adapter |
| `tailwindcss` + `@tailwindcss/vite` | Styling (Tailwind v4) |
| `socket.io-client` | Koneksi ke backend Socket.IO |

---

### Phase 3: Pemecahan Backend

#### [NEW] `apps/server/src/index.ts`
- Entry point: setup Hono app + `serve()` dari `@hono/node-server` → return `http.Server`
- Attach `new Server(httpServer)` (Socket.IO)
- Panggil `setupSocketHandlers(io)`
- CORS middleware untuk SvelteKit dev

#### [NEW] `apps/server/src/data/store.ts`
- `loadItems()`, `saveItemsToFile()`, `defaultItems`, `getItems()`, `setItems()`
- Port dari `server.js` lines 24-102

#### [NEW] `apps/server/src/data/sanitize.ts`
- `sanitizeItem(item)` → omit `secretDetail`
- `sanitizeItems(items)` → `items.map(sanitizeItem)`

#### [NEW] `apps/server/src/ai/verifyClaim.ts`
- `verifyClaimWithAI(secretDetail, claimText, itemTitle, itemDesc)` → panggil Groq
- Port dari `fetchAI()` di `app.js` lines 652-707
- Prompt verifikasi klaim port dari `submitClaim()` lines 856-881
- **Zero-hint rule**, threshold scoring tetap identik

#### [NEW] `apps/server/src/socket/handlers.ts`
- `setupSocketHandlers(io)` → register semua event handlers
- Pecah per handler: `handleUserJoin`, `handleItemAdd`, `handleItemMove`, `handleItemsOrganize`, `handleClaimSubmit`, `handleResetDemo`, `handleDisconnect`
- **Semua emit item ke client pakai `sanitizeItem()`**
- `handleClaimSubmit` → panggil `verifyClaimWithAI()` di server, return hasil ke client

#### [NEW] `apps/server/src/routes/api.ts`
- `POST /api/verify-claim` → Hono route, validasi input pakai Zod, panggil `verifyClaimWithAI()`

---

### Phase 4: Pemecahan Frontend (SvelteKit)

#### [NEW] `apps/web/src/routes/+page.svelte`
- Root page: render `<Lobby>` atau `<Board>` berdasarkan store `currentScene`
- **TIDAK pakai routing halaman terpisah** — 1 koneksi Socket.IO persisten

#### [NEW] `apps/web/src/lib/components/Lobby.svelte`
- Character select (male/female card) + form nama/NPM/kontak
- Preset testing user (Budi/Siti)
- Port dari `index.html` lines 19-109 + `app.js` lines 202-298

#### [NEW] `apps/web/src/lib/components/Board.svelte`
- Board container, action buttons (Lapor/Rapihkan), filter tabs
- Live realtime bar (socket status, online users, current user badge)
- Port dari `index.html` lines 112-193 + `app.js` lines 300-518

#### [NEW] `apps/web/src/lib/components/ItemCard.svelte`
- 1 kartu barang, terima props `item`
- Handle drag sendiri via Svelte action
- Port dari `renderBoard()` card template + `addDragListeners()`

#### [NEW] `apps/web/src/lib/components/ReportModal.svelte`
- Form lapor barang
- Port dari `index.html` lines 226-276 + `app.js` lines 522-646

#### [NEW] `apps/web/src/lib/components/ClaimModal.svelte`
- Form + hasil verifikasi klaim (approve/grey-zone retry/reject)
- Port dari `index.html` lines 195-215 + `app.js` lines 798-1020
- **Klaim sekarang di-submit via socket ke backend** (backend yang panggil AI, bukan client)

#### [NEW] `apps/web/src/lib/components/ClaimsReviewModal.svelte`
- Riwayat klaim per item
- Port dari `index.html` lines 217-224 + `app.js` lines 1022-1086

#### [NEW] `apps/web/src/lib/components/SatpamChat.svelte`
- Avatar + chat panel Satpam AI
- Port dari `index.html` lines 155-189 + `app.js` lines 712-793

#### [NEW] `apps/web/src/lib/components/ToastContainer.svelte`
- Notifikasi realtime (user join/leave, new item, claim update)
- Port dari `app.js` lines 23-34

#### [NEW] `apps/web/src/lib/components/Avatar.svelte`
- Avatar reusable: props `gender`, `bodyColor`
- Dipakai di Lobby character card DAN board satpam

#### Stores:

#### [NEW] `apps/web/src/lib/stores/player.ts`
- `currentPlayer` writable store, sync ke sessionStorage

#### [NEW] `apps/web/src/lib/stores/items.ts`
- `items` writable store array, di-update oleh socket event handlers

#### [NEW] `apps/web/src/lib/stores/ui.ts`
- State UI: `currentScene`, `currentFilter`, `activeModal`, dll

#### [NEW] `apps/web/src/lib/socket.ts`
- Inisialisasi `socket.io-client` (singleton)
- Semua listener → update stores
- Connect ke `PUBLIC_SERVER_URL`

#### [NEW] `apps/web/src/lib/actions/draggable.ts`
- Svelte action `use:draggable` untuk drag & drop cards

---

### Phase 5: Animasi (fitur bawaan Svelte)

| Elemen | Animasi |
|---|---|
| Card baru muncul | `transition:fly` dari atas |
| Ganti filter | `animate:flip` di ItemCard |
| Modal open/close | `transition:fade` overlay + `transition:fly` konten |
| Lobby → Board | `transition:fade` ~300ms |
| Hasil verifikasi klaim | `transition:fade` + `transition:fly` |
| Satpam AI mata | Eye tracking: `mousemove` → translate `.avatar-eye` |
| Toast notification | `transition:fly` dari kanan, fade out |
| Drag card | Svelte action custom |
| ItemCard hover | `hover:-translate-y-1` + transition-transform |

---

### Phase 6: Tailwind UI Tuning

- Port CSS variables (`--mc-wood`, `--mc-dirt`, `--mc-sky`, `--mc-stone`) ke `@theme` Tailwind v4
- Hover state ItemCard: `hover:-translate-y-1`, shadow membesar
- Konsistensi spacing (Tailwind scale)
- Kontras teks di background kayu
- **TIDAK ganti font-pixel/VT323 atau palet warna dasar**

---

### Phase 7: Dokumentasi

#### [NEW] `MIGRATION_NOTES.md`
- Mapping file lama → baru
- Daftar dependency baru + fungsinya
- Security fixes (2 poin dari Phase 0)

---

## Verification Plan

### Automated Tests
```bash
# Backend: pastikan server start tanpa error
cd apps/server && npx tsx src/index.ts

# Frontend: pastikan SvelteKit dev build berhasil
cd apps/web && npm run dev
```

### Manual Verification
- ✅ Lobby → Board transition bekerja
- ✅ Drag & drop card bekerja + sync realtime
- ✅ Report barang baru → muncul di board semua user
- ✅ Claim barang → verifikasi AI berjalan di backend (API key tidak terexpose di browser)
- ✅ Grey-zone retry (1x) bekerja
- ✅ `secretDetail` TIDAK PERNAH muncul di browser (cek Network tab)
- ✅ Socket status indicator bekerja
- ✅ Toast notification muncul saat user join/leave
- ✅ Filter SEMUA/HILANG/KETEMU bekerja
- ✅ Rapihkan board bekerja
- ✅ Satpam AI chat bekerja
- ✅ Data `items.json` format tetap kompatibel
