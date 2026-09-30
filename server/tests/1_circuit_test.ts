/**
 * ============================================================================
 * PENGUJIAN 1: SIRKUIT ZKP (Circuit Testing)
 * ============================================================================
 * 
 * Tujuan:
 *   Memverifikasi bahwa sirkuit single_keyword_proof.circom:
 *   1. Terkompilasi sempurna ke WebAssembly (WASM + zkey tersedia)
 *   2. Menghasilkan proof valid untuk keyword yang benar
 *   3. Menolak proof untuk keyword yang salah (soundness)
 *   4. Tidak membocorkan informasi keyword di publicSignals (zero-knowledge)
 *   5. Proof valid lolos verifikasi backend (completeness)
 *   6. Proof dari satu item tidak bisa dipakai untuk item lain
 * 
 * Output Visual:
 *   Terminal log dengan tabel hasil, warna, dan timing
 * 
 * Cara jalankan:
 *   cd server && npx tsx tests/1_circuit_test.ts
 */

// @ts-ignore
import * as snarkjs from 'snarkjs';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { keccak256 } from 'js-sha3';
// @ts-ignore
import { buildPoseidon } from 'circomlibjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

// ── Paths ke build artifacts ─────────────────────────────────────────────────
const WASM_PATH = path.join(ROOT, 'zk/build/single_keyword_proof_js/single_keyword_proof.wasm');
const ZKEY_PATH = path.join(ROOT, 'zk/build/single_keyword_final.zkey');
const VKEY_PATH = path.join(ROOT, 'zk/zk_v2_verification_key.json');
const CIRCOM_PATH = path.join(ROOT, 'zk/circuits/single_keyword_proof.circom');

// ── Helpers ──────────────────────────────────────────────────────────────────
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
const DIM = '\x1b[2m';
const RESET = '\x1b[0m';
const CHECK = '✅';
const CROSS = '❌';
const WARN = '⚠️';
const LOCK = '🔒';
const ROCKET = '🚀';

function banner(text: string) {
  const line = '═'.repeat(68);
  console.log(`\n${CYAN}${BOLD}╔${line}╗${RESET}`);
  console.log(`${CYAN}${BOLD}║${RESET}  ${text.padEnd(66)}${CYAN}${BOLD}║${RESET}`);
  console.log(`${CYAN}${BOLD}╚${line}╝${RESET}`);
}

function section(text: string) {
  console.log(`\n${YELLOW}${BOLD}── ${text} ${'─'.repeat(Math.max(0, 60 - text.length))}${RESET}`);
}

function pass(label: string, detail?: string) {
  console.log(`  ${CHECK} ${GREEN}PASS${RESET}  ${label}${detail ? `  ${DIM}${detail}${RESET}` : ''}`);
}

function fail(label: string, detail?: string) {
  console.log(`  ${CROSS} ${RED}FAIL${RESET}  ${label}${detail ? `  ${DIM}${detail}${RESET}` : ''}`);
}

function info(label: string, value: string) {
  console.log(`  ${LOCK} ${label}: ${CYAN}${value}${RESET}`);
}

// ── Test Runner ──────────────────────────────────────────────────────────────
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, label: string, detail?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    pass(label, detail);
  } else {
    failedTests++;
    fail(label, detail);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN TEST EXECUTION
// ══════════════════════════════════════════════════════════════════════════════
async function main() {
  const startTime = performance.now();

  banner(`${ROCKET} PENGUJIAN SIRKUIT ZKP — single_keyword_proof.circom`);
  console.log(`${DIM}  Tanggal : ${new Date().toLocaleString('id-ID')}${RESET}`);
  console.log(`${DIM}  Node    : ${process.version}${RESET}`);
  console.log(`${DIM}  OS      : ${process.platform} ${process.arch}${RESET}`);

  // ─── TC-1: Verifikasi Build Artifacts ────────────────────────────────────
  section('TC-1: Verifikasi Build Artifacts (Kompilasi WASM)');
  
  const wasmExists = fs.existsSync(WASM_PATH);
  assert(wasmExists, 'WASM file exists', WASM_PATH);
  
  const zkeyExists = fs.existsSync(ZKEY_PATH);
  assert(zkeyExists, 'zkey file exists', ZKEY_PATH);
  
  const vkeyExists = fs.existsSync(VKEY_PATH);
  assert(vkeyExists, 'Verification key exists', VKEY_PATH);
  
  const circomExists = fs.existsSync(CIRCOM_PATH);
  assert(circomExists, 'Circom source exists', CIRCOM_PATH);

  if (wasmExists) {
    const wasmSize = fs.statSync(WASM_PATH).size;
    info('WASM size', `${(wasmSize / 1024).toFixed(1)} KB`);
    assert(wasmSize > 0, 'WASM file not empty', `${wasmSize} bytes`);
  }

  if (zkeyExists) {
    const zkeySize = fs.statSync(ZKEY_PATH).size;
    info('zkey size', `${(zkeySize / 1024).toFixed(1)} KB`);
    assert(zkeySize > 0, 'zkey file not empty', `${zkeySize} bytes`);
  }

  // ─── TC-2: Verifikasi Circuit Structure ──────────────────────────────────
  section('TC-2: Verifikasi Struktur Sirkuit');

  const circomSrc = fs.readFileSync(CIRCOM_PATH, 'utf-8');
  assert(
    circomSrc.includes('signal input secret'),
    'Circuit has private input "secret"',
    'sinyal privat (tidak dikirim ke server)'
  );
  assert(
    circomSrc.includes('signal input target_hash'),
    'Circuit has public input "target_hash"',
    'commitment dari pelapor'
  );
  assert(
    circomSrc.includes('Poseidon(1)'),
    'Circuit uses Poseidon(1) hash',
    'hash ZK-friendly, bukan SHA256'
  );
  assert(
    circomSrc.includes('h.out === target_hash'),
    'Circuit enforces Poseidon(secret) === target_hash',
    'constraint utama'
  );
  assert(
    circomSrc.includes('public [target_hash]'),
    'Only target_hash is public (secret stays private)',
    'zero-knowledge property'
  );

  // ─── TC-3: Generate & Verify Proof (Happy Path) ─────────────────────────
  section('TC-3: Generate & Verify Proof — Keyword Benar (Completeness)');

  const poseidon = await buildPoseidon();
  const poseidonHash = (fe: bigint): string => poseidon.F.toString(poseidon([fe]));

  const keyword = 'geologi';
  const fieldElement = stringToFieldElement(keyword);
  const commitment = poseidonHash(fieldElement);

  info('Keyword', `"${keyword}"`);
  info('Field Element', fieldElement.toString().slice(0, 30) + '...');
  info('Commitment (Poseidon)', commitment.slice(0, 30) + '...');

  const proveStart = performance.now();
  const { proof, publicSignals } = await snarkjs.groth16.fullProve(
    { secret: fieldElement.toString(), target_hash: commitment },
    WASM_PATH,
    ZKEY_PATH
  );
  const proveTime = performance.now() - proveStart;

  assert(proof !== null && proof !== undefined, 'Proof generated successfully', `${proveTime.toFixed(0)}ms`);
  assert(publicSignals.length === 1, 'publicSignals has exactly 1 element (target_hash only)');
  assert(publicSignals[0] === commitment, 'publicSignal matches commitment');

  // Verify
  const vKey = JSON.parse(fs.readFileSync(VKEY_PATH, 'utf-8'));
  const verifyStart = performance.now();
  const isValid = await snarkjs.groth16.verify(vKey, publicSignals, proof);
  const verifyTime = performance.now() - verifyStart;

  assert(isValid === true, 'Backend verification PASSES', `${verifyTime.toFixed(0)}ms`);

  // ─── TC-4: Reject Invalid Keyword (Soundness) ───────────────────────────
  section('TC-4: Reject Invalid Keyword — Keyword Salah (Soundness)');

  const wrongKeyword = 'matematika';
  const wrongFE = stringToFieldElement(wrongKeyword);
  info('Wrong keyword', `"${wrongKeyword}"`);
  info('Correct commitment target', commitment.slice(0, 30) + '...');

  let proofGeneratedForWrong = false;
  try {
    await snarkjs.groth16.fullProve(
      { secret: wrongFE.toString(), target_hash: commitment },
      WASM_PATH,
      ZKEY_PATH
    );
    proofGeneratedForWrong = true;
  } catch (e: any) {
    proofGeneratedForWrong = false;
  }

  assert(
    !proofGeneratedForWrong,
    'fullProve() REJECTS wrong keyword (constraint violation)',
    'Poseidon(matematika) ≠ commitment(geologi)'
  );

  // ─── TC-5: Zero-Knowledge Property ──────────────────────────────────────
  section('TC-5: Zero-Knowledge Property — Tidak Ada Kebocoran Informasi');

  info('Checking proof structure', 'π_a, π_b, π_c (Groth16 elliptic curve points)');
  
  const proofStr = JSON.stringify(proof);
  const keywordStr = keyword;
  const fieldElementStr = fieldElement.toString();

  assert(
    !proofStr.includes(keywordStr),
    'Proof does NOT contain keyword plaintext',
    `"${keyword}" not in proof JSON`
  );
  assert(
    !proofStr.includes(fieldElementStr),
    'Proof does NOT contain field element',
    'field element not leaked'
  );
  assert(
    publicSignals.length === 1,
    'publicSignals contains ONLY target_hash (no secret)',
    `[${publicSignals[0].slice(0, 20)}...]`
  );
  assert(
    publicSignals[0] === commitment && publicSignals.indexOf(fieldElementStr) === -1,
    'Secret field element is NOT in publicSignals',
    'zero-knowledge verified'
  );

  // Verify two proofs for same keyword produce different proof values (randomized)
  const { proof: proof2 } = await snarkjs.groth16.fullProve(
    { secret: fieldElement.toString(), target_hash: commitment },
    WASM_PATH,
    ZKEY_PATH
  );

  const proofsDiffer = JSON.stringify(proof) !== JSON.stringify(proof2);
  assert(
    proofsDiffer,
    'Two proofs for same input are DIFFERENT (randomized)',
    'prevents proof replay analysis'
  );

  // ─── TC-6: Cross-Item Proof Reuse Prevention ────────────────────────────
  section('TC-6: Cross-Item Proof Reuse Prevention');

  const otherKeyword = 'hitam';
  const otherFE = stringToFieldElement(otherKeyword);
  const otherCommitment = poseidonHash(otherFE);

  info('Item A commitment', commitment.slice(0, 20) + '... (geologi)');
  info('Item B commitment', otherCommitment.slice(0, 20) + '... (hitam)');

  // Try verifying proof from Item A against Item B's commitment
  const crossVerify = await snarkjs.groth16.verify(vKey, [otherCommitment], proof);
  assert(
    !crossVerify,
    'Proof from Item A FAILS verification on Item B commitment',
    'publicSignal binding prevents cross-item replay'
  );

  // ─── TC-7: Multiple Keywords Batch Test ──────────────────────────────────
  section('TC-7: Multi-Keyword Batch Proof (Simulasi Claim v2)');

  const reporterKeywords = ['biru', 'geologi', 'stiker'];
  const claimerKeywords = ['biru', 'geologi', 'plastik']; // 2 match, 1 different

  console.log(`  Reporter keywords : ${JSON.stringify(reporterKeywords)}`);
  console.log(`  Claimer keywords  : ${JSON.stringify(claimerKeywords)}`);

  // Generate commitments for reporter
  const commitments = reporterKeywords.map(kw => poseidonHash(stringToFieldElement(kw)));
  console.log(`  Commitments       : [${commitments.map(c => c.slice(0, 12) + '...').join(', ')}]`);

  let matchCount = 0;
  const matchResults: { keyword: string; matched: boolean; time: number }[] = [];

  for (const claimerKw of claimerKeywords) {
    const claimerFE = stringToFieldElement(claimerKw);
    let matched = false;
    const kwStart = performance.now();
    
    for (const cmt of commitments) {
      try {
        await snarkjs.groth16.fullProve(
          { secret: claimerFE.toString(), target_hash: cmt },
          WASM_PATH,
          ZKEY_PATH
        );
        matched = true;
        matchCount++;
        break;
      } catch {
        // constraint failed — not a match
      }
    }
    
    const kwTime = performance.now() - kwStart;
    matchResults.push({ keyword: claimerKw, matched, time: kwTime });
  }

  console.log('\n  Hasil per keyword:');
  console.log(`  ${'Keyword'.padEnd(15)} ${'Status'.padEnd(10)} ${'Time'.padEnd(10)}`);
  console.log(`  ${'─'.repeat(15)} ${'─'.repeat(10)} ${'─'.repeat(10)}`);
  for (const r of matchResults) {
    const status = r.matched ? `${GREEN}MATCH${RESET}` : `${RED}NO MATCH${RESET}`;
    console.log(`  ${r.keyword.padEnd(15)} ${status.padEnd(20)} ${r.time.toFixed(0)}ms`);
  }

  const score = matchCount / commitments.length;
  console.log(`\n  Intersection Score : ${BOLD}${matchCount}/${commitments.length} = ${(score * 100).toFixed(0)}%${RESET}`);
  console.log(`  Threshold (0.5)    : ${score >= 0.5 ? `${GREEN}LOLOS${RESET}` : `${RED}DITOLAK${RESET}`}`);

  assert(matchCount === 2, 'Correctly identified 2 matching keywords', '"biru" & "geologi"');
  assert(score >= 0.5, 'Score above threshold (0.5)', `${(score * 100).toFixed(0)}% >= 50%`);

  // ─── TC-8: Performance Benchmark ────────────────────────────────────────
  section('TC-8: Performance Benchmark');

  const benchRounds = 3;
  const proveTimes: number[] = [];
  const verifyTimes: number[] = [];

  for (let i = 0; i < benchRounds; i++) {
    const pStart = performance.now();
    const { proof: bp, publicSignals: bps } = await snarkjs.groth16.fullProve(
      { secret: fieldElement.toString(), target_hash: commitment },
      WASM_PATH,
      ZKEY_PATH
    );
    proveTimes.push(performance.now() - pStart);

    const vStart = performance.now();
    await snarkjs.groth16.verify(vKey, bps, bp);
    verifyTimes.push(performance.now() - vStart);
  }

  const avgProve = proveTimes.reduce((a, b) => a + b, 0) / benchRounds;
  const avgVerify = verifyTimes.reduce((a, b) => a + b, 0) / benchRounds;

  console.log(`\n  ${'Operasi'.padEnd(20)} ${'Avg'.padEnd(12)} ${'Min'.padEnd(12)} ${'Max'.padEnd(12)}`);
  console.log(`  ${'─'.repeat(20)} ${'─'.repeat(12)} ${'─'.repeat(12)} ${'─'.repeat(12)}`);
  console.log(`  ${'fullProve()'.padEnd(20)} ${avgProve.toFixed(0).padEnd(12)}ms ${Math.min(...proveTimes).toFixed(0).padEnd(12)}ms ${Math.max(...proveTimes).toFixed(0)}ms`);
  console.log(`  ${'verify()'.padEnd(20)} ${avgVerify.toFixed(0).padEnd(12)}ms ${Math.min(...verifyTimes).toFixed(0).padEnd(12)}ms ${Math.max(...verifyTimes).toFixed(0)}ms`);

  assert(avgVerify < 100, 'verify() average < 100ms (NFR-04)', `${avgVerify.toFixed(0)}ms`);

  // ─── Summary ─────────────────────────────────────────────────────────────
  const totalTime = performance.now() - startTime;
  
  banner('RINGKASAN PENGUJIAN SIRKUIT');
  console.log(`\n  Total Test Cases : ${BOLD}${totalTests}${RESET}`);
  console.log(`  ${GREEN}Passed${RESET}         : ${BOLD}${passedTests}${RESET}`);
  if (failedTests > 0) {
    console.log(`  ${RED}Failed${RESET}         : ${BOLD}${failedTests}${RESET}`);
  }
  console.log(`  Total Time       : ${BOLD}${(totalTime / 1000).toFixed(2)}s${RESET}`);
  console.log(`  Result           : ${failedTests === 0 ? `${GREEN}${BOLD}ALL PASSED ✅${RESET}` : `${RED}${BOLD}SOME FAILED ❌${RESET}`}`);

  console.log(`\n${DIM}  Properti yang terverifikasi:${RESET}`);
  console.log(`  ${CHECK} Completeness  — Pemilik sah selalu bisa generate proof valid`);
  console.log(`  ${CHECK} Soundness     — Keyword salah tidak bisa menghasilkan proof`);
  console.log(`  ${CHECK} Zero-Knowledge — Proof tidak membocorkan keyword plaintext`);
  console.log(`  ${CHECK} Non-Replayable — Proof satu item tidak valid untuk item lain`);
  console.log();

  process.exit(failedTests > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(`\n${RED}FATAL ERROR:${RESET}`, err);
  process.exit(1);
});
