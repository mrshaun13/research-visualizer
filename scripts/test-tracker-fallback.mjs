#!/usr/bin/env node
/**
 * Test: tracker phaseTiming fallback behavior
 *
 * Covers four scenarios:
 *   1. No build log at all + AI provides all timing → timingSource: "estimated"
 *   2. Partial build log (no session-end) + AI provides phaseTiming → timingSource: "estimated"
 *   3. Full build log (session-start + session-end) + AI provides phaseTiming → timingSource: "verified"
 *   4. Full tracked session (all phases + session-end) + AI phaseTiming → tracker values win over AI
 *
 * Runs hub-gen.mjs as a subprocess against a minimal temp hub.
 * Cleans up after itself.
 */

import { execSync } from 'child_process';
import { mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { tmpdir } from 'os';
import { randomBytes } from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const HUB_GEN = join(__dirname, 'hub-gen.mjs');

// ── Helpers ──────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assert(label, condition, detail = '') {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.error(`  ❌ ${label}${detail ? ': ' + detail : ''}`);
    failed++;
  }
}

function makeTempHub(slug) {
  const id = randomBytes(4).toString('hex');
  const hub = join(tmpdir(), `hub-test-${id}`);
  const projectDir = join(hub, 'src', 'projects', slug);
  mkdirSync(projectDir, { recursive: true });
  // Minimal hub-config.json (write-meta reads it for skillVersion)
  writeFileSync(join(hub, 'hub-config.json'), JSON.stringify({
    version: '2.0', skillVersion: '8.1', port: 5180, projects: [], libraries: []
  }));
  return { hub, projectDir };
}

function runHubGen(hub, ...args) {
  const cmd = `node ${HUB_GEN} ${hub} ${args.join(' ')}`;
  try {
    const out = execSync(cmd, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
    return { stdout: out, stderr: '', code: 0 };
  } catch (e) {
    return { stdout: e.stdout || '', stderr: e.stderr || '', code: e.status ?? 1 };
  }
}

function readMeta(projectDir) {
  const p = join(projectDir, 'meta.json');
  if (!existsSync(p)) return null;
  return JSON.parse(readFileSync(p, 'utf-8'));
}

function trackerExists(projectDir) {
  return existsSync(join(projectDir, 'build-log.jsonl'));
}

function cleanup(hub) {
  rmSync(hub, { recursive: true, force: true });
}

// ── Base meta payload (no timing fields — used in tracker scenarios) ──────────

const SLUG = 'test-duck';

const BASE_META_NO_TIMING = {
  userPrompt: 'test prompt',
  researchPlan: 'test plan',
  checkpointModified: false,
  model: 'claude-test',
  tokenUsage: null,
  searchesPerformed: 3,
  sourcesCount: 5,
  sectionsBuilt: 3,
  chartsBuilt: 2,
  filesGenerated: 4,
  dataPointsCollected: 20,
  sourceDiversityScore: 0.7,
  skillVersion: '8.1',
  includedSetup: false,
  glossary: { enabled: true, termsIdentified: 3, termsRendered: 2 },
  contentAnalysis: {
    fleschKincaidGrade: 8.0, fleschKincaidLabel: 'Middle School',
    bloomsLevel: 2, bloomsLabel: 'Understanding', bloomsRange: 'Comprehension',
    totalWords: 1000, totalSentences: 80, readabilityNote: 'test'
  },
  hoursSaved: { researchHours: 2.0, totalHoursSaved: 2.0, equivalentLabel: '~2 hours' },
  consumptionTime: { estimatedMinutes: 8, estimatedLabel: '~8 min' },
  dataQualityDistribution: { t1: 1, t2: 3, t3: 1, t4: 0 },
  promptComplexity: { wordCount: 5, entityCount: 1, ambiguityScore: 0.1 },
};

const PHASE_TIMING_AI = {
  environment: 0.1, interpret: 0.2, survey: 1.0,
  discover: 0.5, research: 2.0, analyze: 0.5,
  build: 5.0, enrich: 0.8, present: 1.5,
};

// Full meta with AI-provided timing (for no-tracker scenario)
const FULL_META_AI_TIMING = {
  ...BASE_META_NO_TIMING,
  runStartedAt: '2026-02-24T06:00:00.000Z',
  runCompletedAt: '2026-02-24T06:15:00.000Z',
  durationMinutes: 15,
  phaseTiming: { ...PHASE_TIMING_AI },
};

// ── Test 1: No build log, AI timing → estimated ─────────────────────────────

console.log('\n── Test 1: No build log + AI timing → timingSource: estimated ──');
{
  const { hub, projectDir } = makeTempHub(SLUG);
  const payload = JSON.stringify(FULL_META_AI_TIMING).replace(/'/g, "'\\''");
  const r = runHubGen(hub, 'write-meta', SLUG, `'${payload}'`);

  assert('exit code 0', r.code === 0, r.stderr);
  const meta = readMeta(projectDir);
  assert('meta.json written', meta !== null);
  assert('timingSource is estimated', meta?.timingSource === 'estimated', `got: ${meta?.timingSource}`);
  assert('runStartedAt preserved from AI', meta?.runStartedAt === FULL_META_AI_TIMING.runStartedAt);
  assert('durationMinutes preserved from AI', meta?.durationMinutes === 15);
  assert('phaseTiming.build from AI', meta?.phaseTiming?.build === 5.0);

  cleanup(hub);
}

// ── Test 2: Partial build log (no session-end) → estimated ──────────────

console.log('\n── Test 2: Partial build log (no session-end) + AI phaseTiming → estimated ──');
{
  const { hub, projectDir } = makeTempHub(SLUG);

  // Write session-start only (no session-end — incomplete log)
  runHubGen(hub, 'track', SLUG, 'session-start');
  assert('build log created', trackerExists(projectDir));

  const payload = JSON.stringify(FULL_META_AI_TIMING).replace(/'/g, "'\\''");
  const r = runHubGen(hub, 'write-meta', SLUG, `'${payload}'`);

  assert('exit code 0', r.code === 0, r.stderr);
  const meta = readMeta(projectDir);
  assert('meta.json written', meta !== null);
  assert('timingSource is estimated (no session-end)', meta?.timingSource === 'estimated', `got: ${meta?.timingSource}`);
  assert('phaseTiming from AI preserved', meta?.phaseTiming?.build === 5.0);

  cleanup(hub);
}

// ── Test 3: Full build log (with session-end) → verified ───────────────

console.log('\n── Test 3: Full build log (session-start + session-end) + AI phaseTiming → verified ──');
{
  const { hub, projectDir } = makeTempHub(SLUG);

  runHubGen(hub, 'track', SLUG, 'session-start');
  runHubGen(hub, 'track', SLUG, 'session-end');
  assert('build log created', trackerExists(projectDir));

  const payload = JSON.stringify({
    ...BASE_META_NO_TIMING,
    phaseTiming: { ...PHASE_TIMING_AI },
  }).replace(/'/g, "'\\''");
  const r = runHubGen(hub, 'write-meta', SLUG, `'${payload}'`);

  assert('exit code 0', r.code === 0, r.stderr);
  const meta = readMeta(projectDir);
  assert('meta.json written', meta !== null);
  assert('timingSource is verified', meta?.timingSource === 'verified', `got: ${meta?.timingSource}`);
  assert('durationMinutes computed from tracker', typeof meta?.durationMinutes === 'number');

  cleanup(hub);
}

// ── Test 4: Full tracked session + AI phaseTiming → tracker wins ────────

console.log('\n── Test 4: Full tracked session (all phases + session-end) + AI phaseTiming → tracker values win ──');
{
  const { hub, projectDir } = makeTempHub(SLUG);

  const phases = ['environment', 'interpret', 'survey', 'discover', 'research', 'analyze', 'build', 'enrich', 'present'];
  runHubGen(hub, 'track', SLUG, 'session-start');
  for (const phase of phases) {
    runHubGen(hub, 'track', SLUG, 'phase-start', phase);
    runHubGen(hub, 'track', SLUG, 'phase-end', phase);
  }
  runHubGen(hub, 'track', SLUG, 'session-end');

  // AI provides phaseTiming with obviously wrong values (999) — tracker should override
  const aiPhaseTiming = {};
  for (const p of phases) aiPhaseTiming[p] = 999;

  const payload = JSON.stringify({
    ...BASE_META_NO_TIMING,
    phaseTiming: aiPhaseTiming,
  }).replace(/'/g, "'\\''");
  const r = runHubGen(hub, 'write-meta', SLUG, `'${payload}'`);

  assert('exit code 0', r.code === 0, r.stderr);
  const meta = readMeta(projectDir);
  assert('meta.json written', meta !== null);
  assert('timingSource is verified', meta?.timingSource === 'verified', `got: ${meta?.timingSource}`);
  assert('no untracked sentinels', !Object.values(meta?.phaseTiming || {}).includes('untracked'));
  assert('tracker overrode AI value for build (not 999)', meta?.phaseTiming?.build !== 999, `got: ${meta?.phaseTiming?.build}`);
  assert('tracker overrode AI value for survey (not 999)', meta?.phaseTiming?.survey !== 999);
  assert('all 9 phases have numeric timing', phases.every(p => typeof meta?.phaseTiming?.[p] === 'number'), JSON.stringify(meta?.phaseTiming));
  assert('no warnings about untracked phases', !r.stdout.includes('has no timing'));

  cleanup(hub);
}

// ── Summary ───────────────────────────────────────────────────────────────────

console.log(`\n${'─'.repeat(52)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  console.error('FAIL');
  process.exit(1);
} else {
  console.log('PASS');
}
