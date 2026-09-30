# Migration Notes — Lost & Found Kampus AI

> Migrasi arsitektur dari vanilla HTML/CSS/JS + Express ke SvelteKit + Hono.  
> Tanggal: September 2026

---

## Security Fixes ⚠️

### 1. API Key Dipindah ke Backend
- **Sebelum**: API key Groq di-hardcode di `js/app.js` (line 652) — terexpose di browser client
- **Sesudah**: Key disimpan di `apps/server/.env` (`GROQ_API_KEY`), hanya diakses oleh backend via `dotenv`. Tidak pernah dikirim ke client.

### 2. secretDetail Tidak Pernah Dikirim ke Browser
- **Sebelum**: `server.js` broadcast seluruh object item (termasuk `secretDetail`) via `io.emit('items_init', items)` dan `io.emit('item_added', newItem)` — kebocoran data verifikasi
- **Sesudah**: Fungsi `sanitizeItem()` di `apps/server/src/data/sanitize.ts` menghapus field `secretDetail` sebelum data dikirim ke client manapun. Digunakan di SEMUA socket emit: `items_init`, `item_added`, `reset_demo_items`.

---

## File Mapping (Lama → Baru)

### Backend (server.js → apps/server/)

| File Lama | File Baru | Keterangan |
|---|---|---|
| `server.js` (line 1-17) | `apps/server/src/index.ts` | Entry point, setup Hono + Socket.IO |
| `server.js` (line 24-101) | `apps/server/src/data/store.ts` | loadItems, saveItems, types |
| — (baru) | `apps/server/src/data/sanitize.ts` | sanitizeItem() — security fix |
| `js/app.js` (line 652-707) | `apps/server/src/ai/verifyClaim.ts` | fetchAI dipindah ke backend, pakai axios |
| `server.js` (line 130-242) | `apps/server/src/socket/handlers.ts` | Socket handlers dipecah per fungsi |
| — (baru) | `apps/server/src/routes/api.ts` | REST endpoint POST /api/verify-claim |

### Frontend (index.html + app.js → apps/web/)

| File Lama | File Baru | Keterangan |
|---|---|---|
| `index.html` + `board.html` | `apps/web/src/routes/+page.svelte` | Konsolidasi 2 file duplikat → 1 route |
| `index.html` (line 19-109) | `apps/web/src/lib/components/Lobby.svelte` | Lobby character select |
| `index.html` (line 112-193) | `apps/web/src/lib/components/Board.svelte` | Board container + controls |
| `js/app.js` renderBoard() | `apps/web/src/lib/components/ItemCard.svelte` | 1 komponen per kartu barang |
| `index.html` (line 226-276) | `apps/web/src/lib/components/ReportModal.svelte` | Form lapor barang |
| `index.html` (line 195-215) | `apps/web/src/lib/components/ClaimModal.svelte` | Form klaim + verifikasi AI |
| `index.html` (line 217-224) | `apps/web/src/lib/components/ClaimsReviewModal.svelte` | Riwayat klaim |
| `index.html` (line 155-189) | `apps/web/src/lib/components/SatpamChat.svelte` | Chat Satpam AI + avatar |
| `index.html` (line 16) | `apps/web/src/lib/components/ToastContainer.svelte` | Toast notifikasi realtime |
| — (reuse markup) | `apps/web/src/lib/components/Avatar.svelte` | Avatar reusable (lobby + board) |
| `js/app.js` global vars | `apps/web/src/lib/stores/player.ts` | currentPlayer store |
| `js/app.js` global vars | `apps/web/src/lib/stores/items.ts` | items store |
| `js/app.js` global vars | `apps/web/src/lib/stores/ui.ts` | UI state store |
| `js/app.js` setupSocketListeners() | `apps/web/src/lib/socket.ts` | Socket.IO singleton + listeners |
| `js/app.js` addDragListeners() | `apps/web/src/lib/actions/draggable.ts` | Svelte action drag & drop |
| `styles/styles.css` | `apps/web/src/app.css` | Port ke Tailwind v4 @theme |

---

## Dependencies Baru

### Backend (apps/server)

| Package | Fungsi |
|---|---|
| `hono` | Web framework minimalis, pengganti Express |
| `@hono/node-server` | Adapter Node.js, return http.Server untuk attach Socket.IO |
| `socket.io` | Realtime WebSocket (tetap dari versi lama) |
| `dotenv` | Load environment variables dari .env |
| `zod` | Validasi payload socket/REST sebelum diproses |
| `axios` | HTTP client untuk panggil Groq API dari backend |
| `typescript` | Type-checking untuk semua kode backend |
| `tsx` | Runner TypeScript langsung tanpa compile step |

### Frontend (apps/web)

| Package | Fungsi |
|---|---|
| `svelte` + `@sveltejs/kit` | Framework frontend reaktif dengan SSR |
| `@sveltejs/adapter-node` | Deploy adapter untuk server Node.js |
| `tailwindcss` v4 + `@tailwindcss/vite` | Utility-first CSS framework (v4, pakai @theme) |
| `socket.io-client` | Koneksi Socket.IO dari browser ke backend |
| `axios` | HTTP client untuk REST calls |

---

## Logika Bisnis yang Dipertahankan

Semua logika bisnis berikut TETAP IDENTIK dengan versi lama:

- ✅ Threshold approve ≥80% (tidak diturunkan)
- ✅ 1x retry di zona abu-abu (score 40-79, attempt pertama)
- ✅ Zero-hint rule (reasoning tidak pernah membocorkan detail rahasia)
- ✅ Alur Lobby → Board (1 koneksi Socket.IO persisten, bukan routing)
- ✅ Drag-and-drop posisi card (live sync antar user)
- ✅ Smart emoji picker (lokal + AI fallback)
- ✅ Satpam AI chat
- ✅ Realtime multi-user (toast join/leave, online count)
- ✅ Format data items.json kompatibel (field names sama)

---

## Cara Menjalankan

```bash
# Terminal 1: Backend
cd apps/server
npm install
npm run dev

# Terminal 2: Frontend
cd apps/web
npm install
npm run dev
```

Backend: http://localhost:3001  
Frontend: http://localhost:5173
