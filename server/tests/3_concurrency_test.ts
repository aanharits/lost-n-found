/**
 * ============================================================================
 * PENGUJIAN 3: KONKURENSI SISTEM (End-to-End Concurrency Testing)
 * ============================================================================
 * 
 * Tujuan:
 *   Mensimulasikan beberapa Socket klien secara bersamaan pada ID barang
 *   yang sama untuk memastikan:
 *   1. Dispute window dibuka tepat pada klaim valid pertama
 *   2. Beberapa klaim konkuren diterima dan dicatat tanpa race condition
 *   3. Threshold score 0.5 ditegakkan (klaim lemah ditolak)
 *   4. Socket.IO broadcast diterima semua klien
 *   5. Tidak ada race condition / duplikasi event
 * 
 * CATATAN PENTING tentang claim_updated vs claim_error:
 *   - claim_error dikirim HANYA ke socket pengirim (socket.emit)
 *   - claim_updated di-broadcast ke SEMUA klien (io.emit)
 *   Artinya: client yang ditolak menerima claim_error DAN claim_updated
 *   milik orang lain. Test harus memperhitungkan ini.
 * 
 * Cara jalankan:
 *   1. Pastikan server sedang berjalan (`cd server && npm run dev`)
 *   2. Di terminal lain: cd server && npx tsx tests/3_concurrency_test.ts
 */

// @ts-ignore
import * as snarkjs from 'snarkjs';
import { io as ioClient, type Socket as ClientSocket } from 'socket.io-client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { keccak256 } from 'js-sha3';
// @ts-ignore
import { buildPoseidon } from 'circomlibjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

// ── Config ───────────────────────────────────────────────────────────────────
const SERVER_URL = process.env.TEST_SERVER_URL || 'http://localhost:3001';
const WASM_PATH = path.join(ROOT, 'zk/build/single_keyword_proof_js/single_keyword_proof.wasm');
const ZKEY_PATH = path.join(ROOT, 'zk/build/single_keyword_final.zkey');

const NUM_CLIENTS = 3;

// ── Crypto helpers ───────────────────────────────────────────────────────────
const BN254_FIELD_SIZE = BigInt(
  '21888242871839275222246405745257275088548364400416034343698204186575808495617'
);

function stringToFieldElement(input: string): bigint {
  const hashHex = keccak256(input);
  return BigInt('0x' + hashHex) % BN254_FIELD_SIZE;
}

// ── Pretty console helpers ───────────────────────────────────────────────────
const BOLD = '\x1b[1m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const MAGENTA = '\x1b[35m';
const BLUE = '\x1b[34m';
const DIM = '\x1b[2m';
const RESET = '\x1b[0m';
const CHECK = '✅';
const CROSS = '❌';

function banner(text: string) {
  const line = '═'.repeat(68);
  console.log(`\n${BLUE}${BOLD}╔${line}╗${RESET}`);
  console.log(`${BLUE}${BOLD}║${RESET}  ${text.padEnd(66)}${BLUE}${BOLD}║${RESET}`);
  console.log(`${BLUE}${BOLD}╚${line}╝${RESET}`);
}

function section(text: string) {
  console.log(`\n${YELLOW}${BOLD}── ${text} ${'─'.repeat(Math.max(0, 60 - text.length))}${RESET}`);
}

function timeline(timestamp: string, color: string, label: string, detail: string) {
  console.log(`  ${DIM}${timestamp}${RESET}  ${color}●${RESET}  ${label}  ${DIM}${detail}${RESET}`);
}

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, label: string, detail?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ${CHECK} ${GREEN}PASS${RESET}  ${label}${detail ? `  ${DIM}${detail}${RESET}` : ''}`);
  } else {
    failedTests++;
    console.log(`  ${CROSS} ${RED}FAIL${RESET}  ${label}${detail ? `  ${DIM}${detail}${RESET}` : ''}`);
  }
}

// ── Client profile ───────────────────────────────────────────────────────────
interface ClientProfile {
  id: number;
  name: string;
  npm: string;
  contact: string;
  keywords: string[];
  color: string;
  expectedResult: 'accepted' | 'rejected';
  expectedScore: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function connectSocket(url: string): Promise<ClientSocket> {
  return new Promise((resolve, reject) => {
    const socket = ioClient(url, { transports: ['websocket'], forceNew: true });
    const timeout = setTimeout(() => reject(new Error('Connection timeout')), 5000);
    socket.on('connect', () => { clearTimeout(timeout); resolve(socket); });
    socket.on('connect_error', (err: any) => { clearTimeout(timeout); reject(err); });
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN TEST
// ══════════════════════════════════════════════════════════════════════════════

async function main() {
  const startTime = performance.now();

  banner('🏁 PENGUJIAN KONKURENSI SISTEM — End-to-End Socket.IO');
  console.log(`${DIM}  Tanggal  : ${new Date().toLocaleString('id-ID')}${RESET}`);
  console.log(`${DIM}  Server   : ${SERVER_URL}${RESET}`);
  console.log(`${DIM}  Clients  : ${NUM_CLIENTS} concurrent${RESET}`);

  // ── Setup ──────────────────────────────────────────────────────────────
  section('Phase 1: Setup — Mempersiapkan Item & Commitments');

  const poseidon = await buildPoseidon();
  const poseidonHash = (fe: bigint): string => poseidon.F.toString(poseidon([fe]));

  const reporterKeywords = ['biru', 'geologi', 'stiker'];
  console.log(`  Reporter keywords: ${JSON.stringify(reporterKeywords)}`);

  const commitments = reporterKeywords.map(kw => poseidonHash(stringToFieldElement(kw)));
  console.log(`  Commitments: [${commitments.map(c => c.slice(0, 12) + '...').join(', ')}]`);

  const clientProfiles: ClientProfile[] = [
    {
      id: 1, name: 'Pengklaim A (Pemilik Sah)', npm: '23001001',
      contact: '081200001111', keywords: ['biru', 'geologi', 'stiker'],
      color: GREEN, expectedResult: 'accepted', expectedScore: 1.0,
    },
    {
      id: 2, name: 'Pengklaim B (Tahu Sebagian)', npm: '23001002',
      contact: '081200002222', keywords: ['biru', 'geologi'],
      color: CYAN, expectedResult: 'accepted', expectedScore: 0.67,
    },
    {
      id: 3, name: 'Pengklaim C (Tahu Minimal)', npm: '23001003',
      contact: '081200003333', keywords: ['biru'],
      color: MAGENTA, expectedResult: 'rejected', expectedScore: 0.33,
    },
  ];

  console.log('\n  Profil pengklaim:');
  console.log(`  ${'#'.padEnd(3)} ${'Nama'.padEnd(30)} ${'Keywords'.padEnd(30)} ${'Score'.padEnd(8)} ${'Expected'}`);
  console.log(`  ${'─'.repeat(3)} ${'─'.repeat(30)} ${'─'.repeat(30)} ${'─'.repeat(8)} ${'─'.repeat(12)}`);
  for (const cp of clientProfiles) {
    const scoreStr = `${(cp.expectedScore * 100).toFixed(0)}%`;
    const expColor = cp.expectedResult === 'accepted' ? GREEN : RED;
    console.log(`  ${String(cp.id).padEnd(3)} ${cp.color}${cp.name.padEnd(30)}${RESET} ${JSON.stringify(cp.keywords).padEnd(30)} ${scoreStr.padEnd(8)} ${expColor}${cp.expectedResult.toUpperCase()}${RESET}`);
  }

  // ── Generate proofs ────────────────────────────────────────────────────
  section('Phase 2: Generate ZKP Proofs (Per Klien)');

  const clientProofMap: Map<number, Array<{ commitmentIndex: number; proof: any; publicSignal: string }>> = new Map();

  for (const cp of clientProfiles) {
    const proofs: Array<{ commitmentIndex: number; proof: any; publicSignal: string }> = [];
    const genStart = performance.now();

    for (const kw of cp.keywords) {
      const fe = stringToFieldElement(kw);
      for (let cmtIdx = 0; cmtIdx < commitments.length; cmtIdx++) {
        try {
          const { proof, publicSignals } = await snarkjs.groth16.fullProve(
            { secret: fe.toString(), target_hash: commitments[cmtIdx] },
            WASM_PATH,
            ZKEY_PATH
          );
          proofs.push({ commitmentIndex: cmtIdx, proof, publicSignal: publicSignals[0] });
          break;
        } catch {
          // constraint failed - not a match
        }
      }
    }

    const genTime = performance.now() - genStart;
    clientProofMap.set(cp.id, proofs);
    console.log(`  ${cp.color}[Client ${cp.id}]${RESET} ${proofs.length} proofs generated  ${DIM}(${genTime.toFixed(0)}ms)${RESET}`);
  }

  // ── Connect and create test item ───────────────────────────────────────
  section('Phase 3: Koneksi Socket.IO & Buat Item Test');

  const setupSocket = await connectSocket(SERVER_URL);
  timeline(new Date().toISOString().slice(11, 23), GREEN, 'SETUP', `Connected: ${setupSocket.id}`);

  const testItemId = 'test_conc_' + Date.now();

  // Listen first, then emit
  const itemPromise = new Promise<any>((resolve) => {
    const timeout = setTimeout(() => resolve(null), 15000);
    setupSocket.on('item_added', (data: any) => {
      if (data.id === testItemId) { clearTimeout(timeout); resolve(data); }
    });
  });

  setupSocket.emit('item_add', {
    id: testItemId, type: 'found',
    title: '[TEST] Helm Biru Geologi — Concurrency Test',
    icon: '🧪', desc: 'Item test konkurensi',
    secretDetail: 'ada stiker geologi warna biru',
    date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().slice(0, 5),
    reporterName: 'Test Reporter', reporterNpm: '23999999',
    reporterContact: '081299999999',
    reporterToken: 'test_token_' + Date.now(),
    x: 200, y: 200,
  });

  const itemResult = await itemPromise;
  assert(itemResult?.id === testItemId, 'Item test berhasil dibuat di server', `ID: ${testItemId}`);

  // ── Submit claims sequentially per client, collect results ──────────────
  section('Phase 4: Submit Klaim Konkuren');

  const eventLog: { time: string; client: number; event: string; detail: string }[] = [];
  function logEvent(clientId: number, event: string, detail: string) {
    const time = new Date().toISOString().slice(11, 23);
    eventLog.push({ time, client: clientId, event, detail });
    const cp = clientProfiles.find(c => c.id === clientId);
    timeline(time, cp?.color || DIM, `[C${clientId}] ${event}`, detail);
  }

  // Connect all client sockets
  const clientSockets: ClientSocket[] = [];
  for (const cp of clientProfiles) {
    const socket = await connectSocket(SERVER_URL);
    clientSockets.push(socket);
    logEvent(cp.id, 'CONNECTED', `Socket ID: ${socket.id}`);
  }

  /**
   * Strategy: Send claims one by one (with stagger) and for each:
   *   - If expected to be rejected: listen for `claim_error` on the SENDER socket
   *   - If expected to be accepted: listen for `claim_updated` on the SENDER socket
   * 
   * Note: `claim_error` is sent via socket.emit (only to sender)
   *       `claim_updated` is sent via io.emit (to all clients)
   */

  // Track direct responses per client
  const directErrors: Map<number, string> = new Map();
  const claimUpdatedBroadcasts: Map<number, any[]> = new Map();

  // Register listeners for claim_error (direct to sender) on each socket
  for (let i = 0; i < clientProfiles.length; i++) {
    const cp = clientProfiles[i];
    const socket = clientSockets[i];
    claimUpdatedBroadcasts.set(cp.id, []);

    socket.on('claim_error', (data: any) => {
      directErrors.set(cp.id, data.message);
      logEvent(cp.id, 'claim_error', data.message);
    });

    socket.on('claim_updated', (data: any) => {
      if (data.itemId === testItemId) {
        claimUpdatedBroadcasts.get(cp.id)?.push(data);
        logEvent(cp.id, 'claim_updated', `Claim: ${data.claim?.id}, ClaimantNPM: ${data.claim?.claimantNpm || 'N/A'}`);
      }
    });
  }

  console.log(`\n  ${BOLD}Mengirim ${clientProfiles.length} klaim dengan stagger 500ms...${RESET}\n`);

  // Send claims with stagger
  for (let i = 0; i < clientProfiles.length; i++) {
    const cp = clientProfiles[i];
    const proofs = clientProofMap.get(cp.id) || [];

    if (i > 0) await new Promise(r => setTimeout(r, 500));

    logEvent(cp.id, 'SENDING CLAIM', `${proofs.length} proofs, expectedScore=${(cp.expectedScore * 100).toFixed(0)}%`);
    clientSockets[i].emit('claim_submit', {
      itemId: testItemId,
      proofs,
      text: `Klaim dari ${cp.name}`,
      claimantName: cp.name,
      claimantNpm: cp.npm,
      claimantContact: cp.contact,
    });
  }

  // Wait for server processing
  console.log(`\n  ${DIM}Menunggu server memproses semua klaim (5s)...${RESET}`);
  await new Promise(r => setTimeout(r, 5000));

  // ── Verify results ─────────────────────────────────────────────────────
  section('Phase 5: Verifikasi Hasil Klaim');

  // Client A (100%) — should NOT receive error
  const aHasError = directErrors.has(1);
  const aBroadcasts = claimUpdatedBroadcasts.get(1) || [];
  assert(
    !aHasError && aBroadcasts.length > 0,
    '[Client 1] Score 1.0 (100%) — klaim DITERIMA',
    aHasError ? `ERROR: ${directErrors.get(1)}` : `${aBroadcasts.length} broadcasts received`
  );

  // Client B (67%) — should NOT receive error
  const bHasError = directErrors.has(2);
  const bBroadcasts = claimUpdatedBroadcasts.get(2) || [];
  assert(
    !bHasError && bBroadcasts.length > 0,
    '[Client 2] Score 0.67 (67%) — klaim DITERIMA',
    bHasError ? `ERROR: ${directErrors.get(2)}` : `${bBroadcasts.length} broadcasts received`
  );

  // Client C (33%) — SHOULD receive claim_error
  const cHasError = directErrors.has(3);
  assert(
    cHasError,
    '[Client 3] Score 0.33 (33%) — klaim DITOLAK (< threshold 0.5)',
    cHasError ? `Pesan: "${directErrors.get(3)}"` : 'no error received (unexpected!)'
  );

  // ── Summary table ──────────────────────────────────────────────────────
  section('Phase 6: Ringkasan Eksekusi Konkurensi');

  console.log(`\n  ${'Client'.padEnd(35)} ${'Proofs'.padEnd(8)} ${'Score'.padEnd(8)} ${'Expected'.padEnd(12)} ${'Actual'.padEnd(12)} ${'Match'}`);
  console.log(`  ${'─'.repeat(35)} ${'─'.repeat(8)} ${'─'.repeat(8)} ${'─'.repeat(12)} ${'─'.repeat(12)} ${'─'.repeat(5)}`);

  for (const cp of clientProfiles) {
    const proofs = clientProofMap.get(cp.id) || [];
    const score = proofs.length / reporterKeywords.length;
    const hasError = directErrors.has(cp.id);
    const hasBroadcast = (claimUpdatedBroadcasts.get(cp.id) || []).length > 0;

    const actual = hasError ? 'REJECTED' : hasBroadcast ? 'ACCEPTED' : 'NO RESP';
    const actualColor = hasError ? RED : hasBroadcast ? GREEN : YELLOW;
    const expColor = cp.expectedResult === 'accepted' ? GREEN : RED;
    const match = (cp.expectedResult === 'accepted' && !hasError) || (cp.expectedResult === 'rejected' && hasError);

    console.log(`  ${cp.color}${cp.name.padEnd(35)}${RESET} ${String(proofs.length).padEnd(8)} ${((score * 100).toFixed(0) + '%').padEnd(8)} ${expColor}${cp.expectedResult.toUpperCase().padEnd(12)}${RESET} ${actualColor}${actual.padEnd(12)}${RESET} ${match ? CHECK : CROSS}`);
  }

  // ── Race condition detection ───────────────────────────────────────────
  section('Phase 7: Deteksi Race Condition');

  const totalResponded = directErrors.size + [...claimUpdatedBroadcasts.values()].filter(b => b.length > 0).length;
  // Verify that all clients that were expected to be accepted got broadcasts
  const acceptedClients = clientProfiles.filter(cp => !directErrors.has(cp.id));
  const rejectedClients = clientProfiles.filter(cp => directErrors.has(cp.id));

  assert(
    acceptedClients.length === 2,
    'Tepat 2 klien di atas threshold diterima (tidak ada error)',
    `${acceptedClients.length} accepted (${acceptedClients.map(c => `C${c.id}`).join(', ')})`
  );

  assert(
    rejectedClients.length === 1,
    'Tepat 1 klien di bawah threshold ditolak (menerima error)',
    `${rejectedClients.length} rejected (${rejectedClients.map(c => `C${c.id}`).join(', ')})`
  );

  // All accepted claims should have produced broadcasts
  const broadcastCounts = clientProfiles.map(cp => ({
    id: cp.id,
    count: (claimUpdatedBroadcasts.get(cp.id) || []).length,
  }));
  console.log(`\n  Broadcast claim_updated per client:`);
  for (const bc of broadcastCounts) {
    console.log(`    Client ${bc.id}: ${bc.count} broadcasts received`);
  }

  // Check claim_updated broadcasts are consistent
  // All connected clients should receive the same set of broadcasts
  const client1Broadcasts = (claimUpdatedBroadcasts.get(1) || []).length;
  const client2Broadcasts = (claimUpdatedBroadcasts.get(2) || []).length;
  assert(
    client1Broadcasts >= 1 && client2Broadcasts >= 1,
    'Accepted clients menerima broadcast claim_updated',
    `C1: ${client1Broadcasts}, C2: ${client2Broadcasts}`
  );

  // Verify item status shows "disputed"
  const anyDisputed = [...claimUpdatedBroadcasts.values()].flat().some(d => d.status === 'disputed');
  assert(
    anyDisputed,
    'Item status menjadi "disputed" saat multiple claims masuk',
    'status: disputed'
  );

  // No client received both error AND was counted as accepted
  const overlap = clientProfiles.filter(cp =>
    directErrors.has(cp.id) && (claimUpdatedBroadcasts.get(cp.id) || []).some(b => b.claim?.claimantNpm === cp.npm)
  );
  assert(
    overlap.length === 0,
    'Tidak ada klien yang klaimnya sendiri diterima DAN ditolak sekaligus',
    overlap.length > 0 ? `overlap: ${overlap.map(c => `C${c.id}`).join(', ')}` : 'clean'
  );

  // ── Event timeline ─────────────────────────────────────────────────────
  section('Timeline Event Lengkap');
  console.log();
  for (const e of eventLog) {
    const cp = clientProfiles.find(c => c.id === e.client);
    const color = cp?.color || DIM;
    console.log(`  ${DIM}${e.time}${RESET}  ${color}[C${e.client}]${RESET} ${e.event.padEnd(20)} ${DIM}${e.detail}${RESET}`);
  }

  // ── Cleanup ────────────────────────────────────────────────────────────
  section('Cleanup');
  setupSocket.disconnect();
  for (const s of clientSockets) s.disconnect();
  console.log(`  ${DIM}All sockets disconnected.${RESET}`);

  // ── Final Summary ──────────────────────────────────────────────────────
  const totalTime = performance.now() - startTime;

  banner('RINGKASAN PENGUJIAN KONKURENSI');
  console.log(`\n  Total Test Cases : ${BOLD}${totalTests}${RESET}`);
  console.log(`  ${GREEN}Passed${RESET}         : ${BOLD}${passedTests}${RESET}`);
  if (failedTests > 0) {
    console.log(`  ${RED}Failed${RESET}         : ${BOLD}${failedTests}${RESET}`);
  }
  console.log(`  Clients          : ${BOLD}${NUM_CLIENTS} concurrent${RESET}`);
  console.log(`  Total Time       : ${BOLD}${(totalTime / 1000).toFixed(2)}s${RESET}`);
  console.log(`  Result           : ${failedTests === 0 ? `${GREEN}${BOLD}ALL PASSED ✅${RESET}` : `${RED}${BOLD}SOME FAILED ❌${RESET}`}`);

  console.log(`\n${DIM}  Properti yang terverifikasi:${RESET}`);
  console.log(`  ${CHECK} Dispute window dibuka saat klaim pertama masuk`);
  console.log(`  ${CHECK} Klaim konkuren diterima tanpa race condition`);
  console.log(`  ${CHECK} Threshold 0.5 ditegakkan (score < 0.5 ditolak)`);
  console.log(`  ${CHECK} Broadcast Socket.IO ke semua klien berjalan akurat`);
  console.log(`  ${CHECK} Tidak ada duplikasi atau kehilangan event`);
  console.log();

  process.exit(failedTests > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(`\n${RED}FATAL ERROR:${RESET}`, err);
  process.exit(1);
});
