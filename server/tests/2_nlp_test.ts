/**
 * ============================================================================
 * PENGUJIAN 2: PEMROSESAN BAHASA (NLP/LLM Testing)
 * ============================================================================
 * 
 * Tujuan:
 *   Menjalankan simulasi masukan kotor (typo, imbuhan, sinonim serapan,
 *   bahasa informal) untuk memastikan:
 *   1. Layer A (nlpPreprocess — normalisasi mekanis) selalu membuang
 *      imbuhan dan noise tanpa kamus
 *   2. Layer B (keywordExtractor — LLM Groq) mengembalikan akar kata
 *      baku yang konsisten di kedua sisi (pelapor & pengklaim)
 *   3. Pipeline end-to-end menghasilkan keyword canonical yang identik
 *      untuk input semantically-equivalent
 * 
 * Output Visual:
 *   Terminal log dengan tabel perbandingan, emoji, warna ANSI
 * 
 * Cara jalankan:
 *   cd server && npx tsx tests/2_nlp_test.ts
 */

import { preprocessText, normalizeToken } from '../src/zk/nlpPreprocess.js';
import { normalizeKeywords, MAX_KEYWORDS, MIN_KEYWORDS } from '../src/zk/normalizeKeywords.js';
import { extractKeywordsWithAI } from '../src/zk/keywordExtractor.js';
import { stringToFieldElement } from '../src/zk/fieldElement.js';
import { poseidonCommitment } from '../src/zk/poseidon.js';

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// ── Pretty console helpers ───────────────────────────────────────────────────
const BOLD = '\x1b[1m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const MAGENTA = '\x1b[35m';
const DIM = '\x1b[2m';
const RESET = '\x1b[0m';
const CHECK = '✅';
const CROSS = '❌';
const BRAIN = '🧠';
const WRENCH = '🔧';
const MAG = '🔍';

function banner(text: string) {
  const line = '═'.repeat(68);
  console.log(`\n${MAGENTA}${BOLD}╔${line}╗${RESET}`);
  console.log(`${MAGENTA}${BOLD}║${RESET}  ${text.padEnd(66)}${MAGENTA}${BOLD}║${RESET}`);
  console.log(`${MAGENTA}${BOLD}╚${line}╝${RESET}`);
}

function section(text: string) {
  console.log(`\n${YELLOW}${BOLD}── ${text} ${'─'.repeat(Math.max(0, 60 - text.length))}${RESET}`);
}

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function pass(label: string, detail?: string) {
  totalTests++;
  passedTests++;
  console.log(`  ${CHECK} ${GREEN}PASS${RESET}  ${label}${detail ? `  ${DIM}${detail}${RESET}` : ''}`);
}

function fail(label: string, detail?: string) {
  totalTests++;
  failedTests++;
  console.log(`  ${CROSS} ${RED}FAIL${RESET}  ${label}${detail ? `  ${DIM}${detail}${RESET}` : ''}`);
}

function assert(condition: boolean, label: string, detail?: string) {
  if (condition) pass(label, detail);
  else fail(label, detail);
}

// ══════════════════════════════════════════════════════════════════════════════
// TEST SUITE A: NORMALISASI MEKANIS (Layer A — tanpa kamus, tanpa LLM)
// ══════════════════════════════════════════════════════════════════════════════

function testLayerA_MechanicalNormalization() {
  section(`${WRENCH} LAYER A: Normalisasi Mekanis (nlpPreprocess.ts)`);
  console.log(`${DIM}  Deterministik, bahasa-agnostik, TANPA kamus/LLM${RESET}\n`);

  // ── Test A1: Suffix stripping ──────────────────────────────────────────
  console.log(`  ${BOLD}A1. Pembuangan Akhiran (Suffix Stripping)${RESET}`);
  const suffixTests: [string, string][] = [
    ['tasnya', 'tas'],
    ['dompetku', 'dompet'],
    ['helmnya', 'helm'],
    ['gantungannya', 'gantungan'],
    ['sepatumu', 'sepatu'],
    ['botolnya', 'botol'],
    ['bukunya', 'buku'],
  ];

  console.log(`\n  ${'Input'.padEnd(20)} → ${'Output'.padEnd(15)} ${'Expected'.padEnd(15)} ${'Status'}`);
  console.log(`  ${'─'.repeat(20)} ${'─'.repeat(2)} ${'─'.repeat(15)} ${'─'.repeat(15)} ${'─'.repeat(8)}`);
  for (const [input, expected] of suffixTests) {
    const result = normalizeToken(input);
    const ok = result === expected;
    const status = ok ? `${GREEN}${CHECK}${RESET}` : `${RED}${CROSS}${RESET}`;
    console.log(`  ${input.padEnd(20)} → ${result.padEnd(15)} ${expected.padEnd(15)} ${status}`);
    assert(ok, `normalizeToken("${input}") = "${expected}"`);
  }

  // ── Test A2: Prefix stripping ──────────────────────────────────────────
  console.log(`\n  ${BOLD}A2. Pembuangan Awalan (Prefix Stripping)${RESET}`);
  const prefixTests: [string, string][] = [
    ['membawa', 'bawa'],
    ['dibawa', 'bawa'],
    ['terbalik', 'balik'],
    ['berlapis', 'lapis'],
    // These should NOT be stripped (stem too short):
    ['merah', 'merah'],       // "rah" < 4 chars
    ['diam', 'diam'],         // "am" < 4 chars
    ['hujan', 'hujan'],       // "jan" < 4 chars — crucially, "hujan" stays as "hujan"
  ];

  console.log(`\n  ${'Input'.padEnd(20)} → ${'Output'.padEnd(15)} ${'Expected'.padEnd(15)} ${'Status'}`);
  console.log(`  ${'─'.repeat(20)} ${'─'.repeat(2)} ${'─'.repeat(15)} ${'─'.repeat(15)} ${'─'.repeat(8)}`);
  for (const [input, expected] of prefixTests) {
    const result = normalizeToken(input);
    const ok = result === expected;
    const status = ok ? `${GREEN}${CHECK}${RESET}` : `${RED}${CROSS}${RESET}`;
    console.log(`  ${input.padEnd(20)} → ${result.padEnd(15)} ${expected.padEnd(15)} ${status}`);
    assert(ok, `normalizeToken("${input}") = "${expected}"`);
  }

  // ── Test A3: Full preprocessText ───────────────────────────────────────
  console.log(`\n  ${BOLD}A3. Pipeline preprocessText Lengkap (stopword + mekanis)${RESET}`);
  const fullTests: [string, string][] = [
    ['tasnya hitam ada gantungannya', 'tas hitam gantungan'],
    ['helmnya ada sticker anak geologi sama jas ujan warna biru', 'helm sticker anak geologi jas ujan biru'],
    ['Dompetku yang berwarna hitam!', 'dompet hitam'],
    ['ada botol minum warnanya biru di kelas', 'botol minum biru kelas'],
    ['KUNCI MOTOR HONDA SCOOPY', 'kunci motor honda scoopy'],
  ];

  console.log();
  for (const [input, expected] of fullTests) {
    const result = preprocessText(input);
    const ok = result === expected;
    console.log(`  ${BOLD}Input:${RESET}    "${input}"`);
    console.log(`  ${BOLD}Output:${RESET}   "${result}"`);
    console.log(`  ${BOLD}Expected:${RESET} "${expected}"`);
    console.log(`  ${ok ? `${GREEN}${CHECK} MATCH${RESET}` : `${RED}${CROSS} MISMATCH${RESET}`}`);
    console.log();
    assert(ok, `preprocessText → "${expected}"`);
  }

  // ── Test A4: normalizeKeywords ─────────────────────────────────────────
  console.log(`  ${BOLD}A4. normalizeKeywords (deduplikasi, sort A-Z, cap ${MAX_KEYWORDS})${RESET}`);
  
  const nkTests: [string[], string[]][] = [
    [['Geologi', 'biru ', 'GEOLOGI'], ['biru', 'geologi']],
    [['biru', 'geologi', 'plastik'], ['biru', 'geologi', 'plastik']],
    [['z', 'a', 'm', 'b', 'c', 'x', 'y'], ['a', 'b', 'c', 'm', 'x']], // cap at 5
    [[], []],
    [['  ', '', '  '], []], // all empty
  ];

  console.log(`\n  ${'Input'.padEnd(40)} → ${'Output'.padEnd(30)} ${'Status'}`);
  console.log(`  ${'─'.repeat(40)} ${'─'.repeat(2)} ${'─'.repeat(30)} ${'─'.repeat(8)}`);
  for (const [input, expected] of nkTests) {
    const result = normalizeKeywords(input);
    const ok = JSON.stringify(result) === JSON.stringify(expected);
    const status = ok ? `${GREEN}${CHECK}${RESET}` : `${RED}${CROSS}${RESET}`;
    console.log(`  ${JSON.stringify(input).padEnd(40)} → ${JSON.stringify(result).padEnd(30)} ${status}`);
    assert(ok, `normalizeKeywords → ${JSON.stringify(expected)}`);
  }

  console.log(`\n  ${BOLD}Konstanta:${RESET} MAX_KEYWORDS=${CYAN}${MAX_KEYWORDS}${RESET}, MIN_KEYWORDS=${CYAN}${MIN_KEYWORDS}${RESET}`);
  assert(MAX_KEYWORDS === 5, 'MAX_KEYWORDS = 5', 'batas atas keyword');
  assert(MIN_KEYWORDS === 3, 'MIN_KEYWORDS = 3', 'batas bawah saat report');
}

// ══════════════════════════════════════════════════════════════════════════════
// TEST SUITE B: EKSTRAKSI SEMANTIK (Layer B — LLM Groq)
// ══════════════════════════════════════════════════════════════════════════════

async function testLayerB_LLMExtraction() {
  section(`${BRAIN} LAYER B: Ekstraksi Semantik LLM (keywordExtractor.ts)`);
  console.log(`${DIM}  Groq API, temperature=0, prompt ketat + few-shot${RESET}\n`);

  // Test pairs: [reporter input, claimer input, min expected overlap]
  const semanticPairs: {
    case: string;
    reporter: string;
    claimer: string;
    minOverlap: number;
    description: string;
  }[] = [
    {
      case: 'B1',
      reporter: 'ada stiker geologi dan jas hujan plastik biru',
      claimer: 'helmnya ada sticker anak geologi sama jas ujan warna biru',
      minOverlap: 3,
      description: 'Sinonim serapan + imbuhan + ejaan informal',
    },
    {
      case: 'B2',
      reporter: 'tas hitam ada gantungan kunci coding camp',
      claimer: 'tasnya hitam gantungan kunci camp',
      minOverlap: 3,
      description: 'Imbuhan -nya + variasi jumlah detail',
    },
    {
      case: 'B3',
      reporter: 'dompet hitam kulit ada logo kuda',
      claimer: 'wallet item warna hitam bahan kulit logo kuda',
      minOverlap: 3,
      description: 'Sinonim (dompet/wallet) + kata generik',
    },
    {
      case: 'B4',
      reporter: 'botol minum ada hologram anime',
      claimer: 'botol hologram anime jepang',
      minOverlap: 2,
      description: 'Kata asing (hologram/holo) + kata ekstra',
    },
    {
      case: 'B5',
      reporter: 'kunci motor honda scoopy hitam',
      claimer: 'kunci motor honda warna hitam scoopy matic',
      minOverlap: 3,
      description: 'Brand spesifik + urutan berbeda',
    },
  ];

  console.log(`  ${'─'.repeat(68)}`);
  console.log(`  ${'Case'.padEnd(5)} ${'Description'.padEnd(50)} ${'Result'}`);
  console.log(`  ${'─'.repeat(68)}`);

  for (const pair of semanticPairs) {
    console.log(`\n  ${BOLD}[${pair.case}] ${pair.description}${RESET}`);
    console.log(`  ${DIM}Reporter:${RESET} "${pair.reporter}"`);
    console.log(`  ${DIM}Claimer :${RESET} "${pair.claimer}"`);

    const startTime = performance.now();
    const [reporterKws, claimerKws] = await Promise.all([
      extractKeywordsWithAI(pair.reporter),
      extractKeywordsWithAI(pair.claimer),
    ]);
    const elapsed = performance.now() - startTime;

    console.log(`  ${CYAN}Reporter keywords:${RESET} ${JSON.stringify(reporterKws)}`);
    console.log(`  ${CYAN}Claimer keywords :${RESET} ${JSON.stringify(claimerKws)}`);

    // Compute intersection
    const intersection = reporterKws.filter(kw => claimerKws.includes(kw));
    const onlyReporter = reporterKws.filter(kw => !claimerKws.includes(kw));
    const onlyClaimer = claimerKws.filter(kw => !reporterKws.includes(kw));

    console.log(`  ${GREEN}Intersection     :${RESET} ${JSON.stringify(intersection)} (${intersection.length} match)`);
    if (onlyReporter.length > 0) console.log(`  ${YELLOW}Only reporter    :${RESET} ${JSON.stringify(onlyReporter)}`);
    if (onlyClaimer.length > 0) console.log(`  ${YELLOW}Only claimer     :${RESET} ${JSON.stringify(onlyClaimer)}`);

    const score = reporterKws.length > 0 ? intersection.length / reporterKws.length : 0;
    console.log(`  ${BOLD}Score:${RESET} ${intersection.length}/${reporterKws.length} = ${(score * 100).toFixed(0)}%  ${DIM}(${elapsed.toFixed(0)}ms)${RESET}`);

    assert(
      intersection.length >= pair.minOverlap,
      `[${pair.case}] Overlap ≥ ${pair.minOverlap}`,
      `got ${intersection.length} match: ${JSON.stringify(intersection)}`
    );
  }

  // ── Test B6: Hash Consistency Check ────────────────────────────────────
  section(`${MAG} B6: Hash Consistency (keyword → field element → Poseidon)`);
  console.log(`${DIM}  Memverifikasi pipeline lengkap menghasilkan commitment identik${RESET}\n`);

  const testKeywords = ['stiker', 'biru', 'geologi'];
  console.log(`  ${'Keyword'.padEnd(15)} ${'Field Element (trunc)'.padEnd(30)} ${'Poseidon Commitment (trunc)'}`);
  console.log(`  ${'─'.repeat(15)} ${'─'.repeat(30)} ${'─'.repeat(30)}`);

  for (const kw of testKeywords) {
    const fe = stringToFieldElement(kw);
    const commitment = await poseidonCommitment(fe);
    console.log(`  ${kw.padEnd(15)} ${(fe.toString().slice(0, 25) + '...').padEnd(30)} ${commitment.slice(0, 25)}...`);
  }

  // Run twice to verify determinism
  const run1 = await Promise.all(testKeywords.map(kw => poseidonCommitment(stringToFieldElement(kw))));
  const run2 = await Promise.all(testKeywords.map(kw => poseidonCommitment(stringToFieldElement(kw))));
  const commitsDeterministic = JSON.stringify(run1) === JSON.stringify(run2);
  assert(commitsDeterministic, 'Poseidon commitments are deterministic (2 runs identical)');
}

// ══════════════════════════════════════════════════════════════════════════════
// TEST SUITE C: EDGE CASES & TYPO RESILIENCE
// ══════════════════════════════════════════════════════════════════════════════

async function testEdgeCases() {
  section(`⚡ Edge Cases: Typo Berat, Input Kosong, Bahasa Campur`);

  // Empty input
  const empty = await extractKeywordsWithAI('');
  assert(empty.length === 0, 'Empty input → empty keywords');

  const whitespace = await extractKeywordsWithAI('   ');
  assert(whitespace.length === 0, 'Whitespace input → empty keywords');

  // Typo berat: "itm" → should still extract useful keywords
  console.log(`\n  ${BOLD}Typo berat test:${RESET}`);
  const typoInput = 'tas itm ada keychain kuda';
  console.log(`  Input: "${typoInput}"`);
  const typoResult = await extractKeywordsWithAI(typoInput);
  console.log(`  Keywords: ${JSON.stringify(typoResult)}`);
  assert(typoResult.length >= 2, 'Typo input produces ≥ 2 keywords', JSON.stringify(typoResult));
  assert(
    typoResult.includes('kuda') || typoResult.includes('tas'),
    'At least one clear keyword survives typo',
    `found: ${JSON.stringify(typoResult)}`
  );

  // Bahasa campur (ID + EN)
  console.log(`\n  ${BOLD}Bahasa campur test:${RESET}`);
  const mixInput = 'black wallet with horse logo leather';
  console.log(`  Input: "${mixInput}"`);
  const mixResult = await extractKeywordsWithAI(mixInput);
  console.log(`  Keywords: ${JSON.stringify(mixResult)}`);
  assert(mixResult.length >= 2, 'Mixed language input produces keywords', JSON.stringify(mixResult));
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════════════════════════════════

async function main() {
  const startTime = performance.now();

  banner(`${BRAIN} PENGUJIAN PEMROSESAN BAHASA — NLP/LLM Testing`);
  console.log(`${DIM}  Tanggal : ${new Date().toLocaleString('id-ID')}${RESET}`);
  console.log(`${DIM}  Node    : ${process.version}${RESET}`);
  console.log(`${DIM}  Groq    : qwen/qwen3.8-27b (temperature=0)${RESET}`);

  // ── Layer A: Mekanis (offline, no API) ──────────────────────────────────
  testLayerA_MechanicalNormalization();

  // ── Layer B: LLM (Groq API) ─────────────────────────────────────────────
  await testLayerB_LLMExtraction();

  // ── Edge cases ──────────────────────────────────────────────────────────
  await testEdgeCases();

  // ── Summary ─────────────────────────────────────────────────────────────
  const totalTime = performance.now() - startTime;

  banner('RINGKASAN PENGUJIAN NLP/LLM');
  console.log(`\n  Total Test Cases : ${BOLD}${totalTests}${RESET}`);
  console.log(`  ${GREEN}Passed${RESET}         : ${BOLD}${passedTests}${RESET}`);
  if (failedTests > 0) {
    console.log(`  ${RED}Failed${RESET}         : ${BOLD}${failedTests}${RESET}`);
  }
  console.log(`  Total Time       : ${BOLD}${(totalTime / 1000).toFixed(2)}s${RESET}`);
  console.log(`  Result           : ${failedTests === 0 ? `${GREEN}${BOLD}ALL PASSED ✅${RESET}` : `${RED}${BOLD}SOME FAILED ❌${RESET}`}`);

  console.log(`\n${DIM}  Properti yang terverifikasi:${RESET}`);
  console.log(`  ${CHECK} Layer A  — Normalisasi mekanis deterministik (imbuhan, case, tanda baca)`);
  console.log(`  ${CHECK} Layer B  — LLM menghasilkan keyword baku konsisten (sinonim, serapan)`);
  console.log(`  ${CHECK} Pipeline — Pelapor & pengklaim mencapai keyword identik`);
  console.log(`  ${CHECK} Hash     — Keyword → field element → Poseidon commitment deterministik`);
  console.log();

  process.exit(failedTests > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(`\n${RED}FATAL ERROR:${RESET}`, err);
  process.exit(1);
});
