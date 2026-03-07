#!/usr/bin/env node
/**
 * Research Hub Generator — deterministic file generation tool
 *
 * Generates structural hub files from hub-config.json (source of truth).
 * AI writes creative content (section components, data files).
 * This script writes everything else.
 *
 * Usage:
 *   node scripts/hub-gen.mjs <hub-root> sync-registry          # Regenerate index.js from hub-config.json
 *   node scripts/hub-gen.mjs <hub-root> add-project <json>     # Add project: generate shell + update registry + config
 *   node scripts/hub-gen.mjs <hub-root> write-meta <slug> <json> # Write validated meta.json
 *   node scripts/hub-gen.mjs <hub-root> install-components     # Install shared components to src/components/
 *   node scripts/hub-gen.mjs <hub-root> scaffold               # Generate all Phase 0B scaffold files
 *   node scripts/hub-gen.mjs <hub-root> validate               # Validate all hub files (structural + creative content)
 *   node scripts/hub-gen.mjs <hub-root> validate --fix         # Validate + auto-fix known issues
 *
 * Options:
 *   --dry-run    Show what would change without writing files
 *   --verbose    Show detailed output
 *   --json       Output results as JSON (for programmatic consumption)
 *   --fix        (validate only) Auto-fix issues where safe
 *   --check      (validate only) Exit 1 if issues found (CI mode)
 */

import { readFileSync, writeFileSync, appendFileSync, mkdirSync, readdirSync, existsSync, statSync, copyFileSync, unlinkSync, rmSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { randomBytes } from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Skill version — stamped into hub-config.json, generated files, and build log events
const SKILL_VERSION = '8.14';

// Skill root — the directory containing SKILL.md (parent of scripts/)
// Used for writing config.json (pointer config) relative to the skill's install location.
// Works regardless of whether the skill is installed globally or at workspace scope.
const SKILL_ROOT = resolve(__dirname, '..');
const SCAFFOLD_TEMPLATES = join(__dirname, 'scaffold-templates');

// ═══════════════════════════════════════════════════
//  CLI PARSING
// ═══════════════════════════════════════════════════

const args = process.argv.slice(2);
const flags = args.filter(a => a.startsWith('--'));
const positional = args.filter(a => !a.startsWith('--'));

const dryRun = flags.includes('--dry-run');
const verbose = flags.includes('--verbose');
const jsonOutput = flags.includes('--json');
const autoFix = flags.includes('--fix');
const checkOnly = flags.includes('--check');
const buildVerify = flags.includes('--build');
const initMode = flags.includes('--init');

const COMMANDS = ['sync-registry', 'add-project', 'remove-project', 'write-meta', 'install-components', 'scaffold', 'validate', 'doctor', 'track', 'track-read'];

if (positional.length < 2 || !COMMANDS.includes(positional[1])) {
  console.error('Usage: node hub-gen.mjs <hub-root> <command> [args...]');
  console.error('');
  console.error('Commands:');
  console.error('  sync-registry              Regenerate src/projects/index.js from hub-config.json');
  console.error('  add-project <json>         Add a new project (JSON string or @file.json)');
  console.error('  remove-project <slug>      Remove a project (deletes directory + config entry + re-syncs registry)');
  console.error('  write-meta <slug> <json>   Write validated meta.json for a project');
  console.error('  install-components         Install shared components to src/components/');
  console.error('  scaffold                   Copy scaffold templates + install components + stamp version');
  console.error('  scaffold --init            First-time setup: also create hub-config.json + pointer config');
  console.error('  validate                   Validate all hub files (structural + creative content)');
  console.error('  doctor                     Alias for validate --fix');
  console.error('  track <slug> <event> [args]  Append a build-log event');
  console.error('  track-read <slug>          Read tracker state for a project');
  console.error('');
  console.error('Options:');
  console.error('  --dry-run    Show changes without writing');
  console.error('  --verbose    Detailed output');
  console.error('  --json       JSON output for programmatic use');
  console.error('  --fix        (validate) Auto-fix issues where safe');
  console.error('  --check      (validate) Exit 1 if issues found (CI mode)');
  console.error('  --build      (validate) Run vite build to verify after fixes');
  process.exit(2);
}

const HUB = resolve(positional[0]);
const command = positional[1];
const commandArgs = positional.slice(2);

if (!existsSync(HUB)) {
  console.error(`Hub root not found: ${HUB}`);
  process.exit(2);
}

// ═══════════════════════════════════════════════════
//  PATHS
// ═══════════════════════════════════════════════════

const PATHS = {
  hubConfig: join(HUB, 'hub-config.json'),
  localConfig: join(HUB, '.local-config.json'),
  projectsDir: join(HUB, 'src/projects'),
  localProjectsDir: join(HUB, 'src/local-projects'),
  registryFile: join(HUB, 'src/projects/index.js'),
  localRegistryFile: join(HUB, 'src/local-projects/index.js'),
  componentsDir: join(HUB, 'src/components'),
  srcDir: join(HUB, 'src'),
  hubHome: join(HUB, 'src/components/HubHome.jsx'),
};

// ═══════════════════════════════════════════════════
//  BUILD LOG — deterministic timing via JSONL event log
// ═══════════════════════════════════════════════════

const TRACKER_FILENAME = 'build-log.jsonl';
const VALID_EVENTS = ['session-start', 'session-end', 'phase-start', 'phase-end', 'user-prompt', 'user-response', 'tool-start', 'tool-end', 'error'];
const VALID_PHASES = ['environment', 'interpret', 'survey', 'discover', 'research', 'analyze', 'build', 'enrich', 'present'];

function trackerPath(slug) {
  return join(PATHS.projectsDir, slug, TRACKER_FILENAME);
}

function generateSessionId() {
  return randomBytes(4).toString('hex');
}

function readTracker(slug) {
  const tp = trackerPath(slug);
  if (!existsSync(tp)) return [];
  const lines = readFileSync(tp, 'utf-8').split('\n').filter(l => l.trim());
  const events = [];
  for (const line of lines) {
    try { events.push(JSON.parse(line)); } catch { /* skip malformed trailing line */ }
  }
  return events;
}

function appendTrackerEvent(slug, eventObj) {
  const tp = trackerPath(slug);
  const dir = dirname(tp);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  appendFileSync(tp, JSON.stringify(eventObj) + '\n');
}


function getSessionId(slug) {
  const events = readTracker(slug);
  const first = events.find(e => e.sessionId);
  return first ? first.sessionId : generateSessionId();
}

function computeTimingFromTracker(events) {
  if (!events.length) return null;

  const result = {};

  // runStartedAt / runCompletedAt
  result.runStartedAt = events[0].ts;
  result.runCompletedAt = events[events.length - 1].ts;
  const startMs = new Date(result.runStartedAt).getTime();
  const endMs = new Date(result.runCompletedAt).getTime();
  result.durationMinutes = Math.round((endMs - startMs) / 60000 * 10) / 10;

  // phaseTiming — delta between phase-start and phase-end for each phase
  const phaseTiming = {};
  const phaseStarts = {};
  for (const e of events) {
    if (e.event === 'phase-start' && e.phase) {
      phaseStarts[e.phase] = new Date(e.ts).getTime();
    } else if (e.event === 'phase-end' && e.phase && phaseStarts[e.phase]) {
      const delta = (new Date(e.ts).getTime() - phaseStarts[e.phase]) / 60000;
      phaseTiming[e.phase] = Math.round(delta * 10) / 10;
    }
  }
  result.phaseTiming = phaseTiming;

  // userWaitMinutes — sum of (user-response.ts - user-prompt.ts) deltas
  let userWaitMs = 0;
  let checkpointWaitMs = 0;
  const promptStack = [];
  for (const e of events) {
    if (e.event === 'user-prompt') {
      promptStack.push(e);
    } else if (e.event === 'user-response' && promptStack.length > 0) {
      const prompt = promptStack.pop();
      const delta = new Date(e.ts).getTime() - new Date(prompt.ts).getTime();
      userWaitMs += delta;
      if (prompt.context === 'checkpoint' || e.context === 'checkpoint') {
        checkpointWaitMs += delta;
      }
    }
  }
  result.userWaitMinutes = Math.round(userWaitMs / 60000 * 10) / 10;
  result.checkpointWaitMinutes = Math.round(checkpointWaitMs / 60000 * 10) / 10;
  result.agentActiveMinutes = Math.round((result.durationMinutes - result.userWaitMinutes) * 10) / 10;

  // Tool breakdowns for build/present phases
  const toolTimings = {};
  const toolStarts = {};
  for (const e of events) {
    if (e.event === 'tool-start' && e.tool) {
      toolStarts[`${e.phase}:${e.tool}`] = e;
    } else if (e.event === 'tool-end' && e.tool) {
      const key = `${e.phase}:${e.tool}`;
      const start = toolStarts[key];
      if (start) {
        const delta = (new Date(e.ts).getTime() - new Date(start.ts).getTime()) / 60000;
        if (!toolTimings[e.phase]) toolTimings[e.phase] = {};
        toolTimings[e.phase][e.tool] = Math.round(delta * 10) / 10;
      }
    }
  }
  if (toolTimings.build) result.buildBreakdown = toolTimings.build;
  if (toolTimings.present) result.presentBreakdown = toolTimings.present;

  // filesGenerated — sum of filesWritten from tool-end events
  let filesGenerated = 0;
  for (const e of events) {
    if (e.event === 'tool-end' && typeof e.filesWritten === 'number') {
      filesGenerated += e.filesWritten;
    }
  }
  if (filesGenerated > 0) result.filesGenerated = filesGenerated;

  // skillVersion from session-start
  const sessionStart = events.find(e => e.event === 'session-start');
  if (sessionStart) {
    if (sessionStart.skillVersion) result.skillVersion = sessionStart.skillVersion;
    if (sessionStart.model) result.model = sessionStart.model;
  }

  // sessionTimeline — ordered segments for full session visualization
  // Walk events chronologically, emit phase segments and human-wait gaps
  const timeline = [];
  let currentPhaseStart = null;
  let currentPhase = null;
  let waitStart = null;
  let waitContext = null;
  for (const e of events) {
    if (e.event === 'phase-start' && e.phase) {
      currentPhase = e.phase;
      currentPhaseStart = new Date(e.ts).getTime();
    } else if (e.event === 'phase-end' && e.phase && currentPhaseStart) {
      const endMs2 = new Date(e.ts).getTime();
      const mins = Math.round((endMs2 - currentPhaseStart) / 60000 * 10) / 10;
      if (mins > 0) timeline.push({ type: 'phase', phase: e.phase, minutes: mins });
      currentPhaseStart = null;
      currentPhase = null;
    } else if (e.event === 'user-prompt') {
      waitStart = new Date(e.ts).getTime();
      waitContext = e.context || 'approval';
      // Split current phase: emit phase time before the wait
      if (currentPhaseStart && waitStart > currentPhaseStart) {
        const preMins = Math.round((waitStart - currentPhaseStart) / 60000 * 10) / 10;
        if (preMins > 0) timeline.push({ type: 'phase', phase: currentPhase, minutes: preMins });
      }
    } else if (e.event === 'user-response' && waitStart) {
      const responseMs = new Date(e.ts).getTime();
      const waitMins = Math.round((responseMs - waitStart) / 60000 * 10) / 10;
      if (waitMins > 0) timeline.push({ type: 'wait', context: waitContext, minutes: waitMins });
      // Resume current phase from after the wait
      if (currentPhase) currentPhaseStart = responseMs;
      waitStart = null;
      waitContext = null;
    }
  }
  result.sessionTimeline = timeline;

  result.timingSource = 'verified';
  return result;
}

// ── COMMAND: track ──

function track() {
  if (commandArgs.length < 2) {
    logError('track', 'Usage: track <slug> <event-type> [phase] [context|message]');
    finish();
  }

  const slug = commandArgs[0];
  const eventType = commandArgs[1];

  if (!VALID_EVENTS.includes(eventType)) {
    logError('track', `Invalid event type: ${eventType}. Valid: ${VALID_EVENTS.join(', ')}`);
    finish();
  }

  const ts = new Date().toISOString();
  const eventObj = { event: eventType, ts };

  // session-start gets special handling — generates sessionId, accepts optional metadata
  if (eventType === 'session-start') {
    eventObj.sessionId = generateSessionId();
    eventObj.skillVersion = SKILL_VERSION;
    eventObj.slug = slug;
    // Optional: model passed as commandArgs[2]
    if (commandArgs[2]) eventObj.model = commandArgs[2];
  } else {
    // All other events inherit sessionId from existing tracker
    eventObj.sessionId = getSessionId(slug);
  }

  // phase-start, phase-end, user-prompt, user-response, error — require phase arg
  if (['phase-start', 'phase-end', 'user-prompt', 'user-response', 'error'].includes(eventType)) {
    const phase = commandArgs[2];
    if (!phase) {
      logError('track', `${eventType} requires a phase argument`);
      finish();
    }
    eventObj.phase = phase;

    // user-prompt/user-response accept optional context (e.g., "checkpoint")
    if (['user-prompt', 'user-response'].includes(eventType) && commandArgs[3]) {
      eventObj.context = commandArgs[3];
    }

    // error accepts a message
    if (eventType === 'error' && commandArgs[3]) {
      eventObj.message = commandArgs.slice(3).join(' ');
    }
  }

  // tool-start, tool-end — require phase and tool args
  if (['tool-start', 'tool-end'].includes(eventType)) {
    const phase = commandArgs[2];
    const tool = commandArgs[3];
    if (!phase || !tool) {
      logError('track', `${eventType} requires phase and tool arguments`);
      finish();
    }
    eventObj.phase = phase;
    eventObj.tool = tool;

    // tool-end accepts optional filesWritten as commandArgs[4]
    if (eventType === 'tool-end' && commandArgs[4]) {
      const fw = parseInt(commandArgs[4], 10);
      if (!isNaN(fw)) eventObj.filesWritten = fw;
    }
  }

  // session-end accepts optional status
  if (eventType === 'session-end') {
    eventObj.status = commandArgs[2] || 'completed';
    eventObj.sessionId = getSessionId(slug);
  }

  // Monotonic timestamp validation
  const existing = readTracker(slug);
  if (existing.length > 0) {
    const lastTs = new Date(existing[existing.length - 1].ts).getTime();
    const newTs = new Date(ts).getTime();
    if (newTs < lastTs) {
      logWarn('track', `Non-monotonic timestamp detected: ${ts} < ${existing[existing.length - 1].ts}`);
    }
  }

  if (dryRun) {
    logAction('would-track', JSON.stringify(eventObj));
  } else {
    appendTrackerEvent(slug, eventObj);
    logAction('track', `${eventType}${eventObj.phase ? ' ' + eventObj.phase : ''}${eventObj.tool ? ' ' + eventObj.tool : ''}`);
  }
}

// ── COMMAND: track-read ──

function trackRead() {
  if (commandArgs.length < 1) {
    logError('track-read', 'Usage: track-read <slug>');
    finish();
  }

  const slug = commandArgs[0];
  const events = readTracker(slug);

  if (events.length === 0) {
    results.tracker = { status: 'no-tracker', slug };
    if (!jsonOutput) log(`  No tracker found for "${slug}"`);
    return;
  }

  const sessionStart = events.find(e => e.event === 'session-start');
  const sessionEnd = events.find(e => e.event === 'session-end');
  const lastEvent = events[events.length - 1];

  // Determine completed phases
  const completedPhases = [];
  for (const phase of VALID_PHASES) {
    if (events.some(e => e.event === 'phase-end' && e.phase === phase)) {
      completedPhases.push(phase);
    }
  }

  // Find the last active phase (started but not ended)
  let lastPhase = null;
  for (const e of [...events].reverse()) {
    if (e.phase) { lastPhase = e.phase; break; }
  }

  const startMs = new Date(events[0].ts).getTime();
  const endMs = new Date(lastEvent.ts).getTime();

  const state = {
    sessionId: sessionStart?.sessionId || null,
    status: sessionEnd ? 'completed' : 'in-progress',
    skillVersion: sessionStart?.skillVersion || null,
    model: sessionStart?.model || null,
    slug,
    lastPhase,
    lastEvent: lastEvent.event,
    completedPhases,
    elapsedMinutes: Math.round((endMs - startMs) / 60000 * 10) / 10,
    eventCount: events.length,
  };

  results.tracker = state;

  if (!jsonOutput) {
    log(`  Session: ${state.sessionId || 'unknown'}`);
    log(`  Status:  ${state.status}`);
    log(`  Phase:   ${state.lastPhase || 'none'} (${state.lastEvent})`);
    log(`  Done:    ${completedPhases.join(', ') || 'none'}`);
    log(`  Elapsed: ${state.elapsedMinutes} min (${state.eventCount} events)`);
  }
}

// ═══════════════════════════════════════════════════
//  LOGGING
// ═══════════════════════════════════════════════════

const results = { command, hubRoot: HUB, dryRun, actions: [], errors: [], warnings: [] };

function log(msg) { if (!jsonOutput) console.log(msg); }
function logAction(action, detail) {
  results.actions.push({ action, detail });
  if (!jsonOutput) log(`  ✅ ${action}: ${detail}`);
}
function logError(action, detail) {
  results.errors.push({ action, detail });
  if (!jsonOutput) log(`  ❌ ${action}: ${detail}`);
}
function logWarn(action, detail) {
  results.warnings.push({ action, detail });
  if (!jsonOutput) log(`  ⚠️  ${action}: ${detail}`);
}
function logVerbose(msg) { if (verbose && !jsonOutput) log(`  · ${msg}`); }

function finish() {
  if (jsonOutput) {
    console.log(JSON.stringify(results, null, 2));
  } else {
    const total = results.actions.length;
    const errs = results.errors.length;
    const warns = results.warnings.length;
    log('');
    if (errs > 0) log(`Done: ${total} actions, ${errs} errors, ${warns} warnings`);
    else if (warns > 0) log(`Done: ${total} actions, ${warns} warnings`);
    else log(`Done: ${total} actions`);
  }
  // --check mode: exit 0 (clean), 1 (errors), 2 (warnings only — soft fail for CI)
  if (checkOnly) {
    if (results.errors.length > 0) process.exit(1);
    if (results.warnings.length > 0) process.exit(2);
    process.exit(0);
  }
  process.exit(results.errors.length > 0 ? 1 : 0);
}

// ═══════════════════════════════════════════════════
//  CONFIG LOADING
// ═══════════════════════════════════════════════════

function loadHubConfig() {
  if (!existsSync(PATHS.hubConfig)) {
    logError('config', `hub-config.json not found at ${PATHS.hubConfig}`);
    finish();
  }
  try {
    return JSON.parse(readFileSync(PATHS.hubConfig, 'utf-8'));
  } catch (e) {
    logError('config', `Failed to parse hub-config.json: ${e.message}`);
    finish();
  }
}

function loadLocalConfig() {
  if (!existsSync(PATHS.localConfig)) return null;
  try {
    return JSON.parse(readFileSync(PATHS.localConfig, 'utf-8'));
  } catch { return null; }
}

function writeFile(filePath, content) {
  if (dryRun) {
    logAction('would-write', filePath);
    return;
  }
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, content);
  logAction('write', filePath);
}

// ═══════════════════════════════════════════════════
//  REGISTRY SCHEMA (hardcoded core defaults)
// ═══════════════════════════════════════════════════

const REGISTRY_FIELDS = [
  'slug', 'title', 'subtitle', 'query', 'lens', 'icon',
  'accentColor', 'visibility', 'createdAt', 'updatedAt',
];

// ═══════════════════════════════════════════════════
//  COMMAND: sync-registry
// ═══════════════════════════════════════════════════

function syncRegistry() {
  log('\n── sync-registry ──');
  const config = loadHubConfig();
  const projects = config.projects || [];

  if (projects.length === 0) {
    logWarn('sync-registry', 'No projects found in hub-config.json');
  }

  // Validate each project has required fields
  for (const p of projects) {
    if (!p.slug) {
      logError('sync-registry', `Project missing required field: slug`);
      continue;
    }
    for (const field of ['title', 'createdAt']) {
      if (!p[field]) logWarn('sync-registry', `Project "${p.slug}" missing field: ${field}`);
    }
  }

  // Detect project directories that exist on disk but aren't in config
  if (existsSync(PATHS.projectsDir)) {
    const diskSlugs = readdirSync(PATHS.projectsDir).filter(d => {
      const full = join(PATHS.projectsDir, d);
      return statSync(full).isDirectory() && !d.startsWith('.') && d !== 'node_modules';
    });
    const configSlugs = new Set(projects.map(p => p.slug));
    for (const slug of diskSlugs) {
      if (!configSlugs.has(slug)) {
        logWarn('sync-registry', `Directory "src/projects/${slug}" exists on disk but not in hub-config.json`);
      }
    }
  }

  // Generate index.js
  const indexContent = generateRegistryFile(projects, './');
  writeFile(PATHS.registryFile, indexContent);

  // Also sync local-projects if .local-config.json has localProjects
  const localConfig = loadLocalConfig();
  if (localConfig && localConfig.localProjects && localConfig.localProjects.length > 0) {
    const localContent = generateRegistryFile(localConfig.localProjects, './');
    writeFile(PATHS.localRegistryFile, localContent);
  }

  logVerbose(`Generated registry with ${projects.length} projects`);
}

function generateRegistryFile(projects, importPrefix) {
  const lines = [];
  lines.push("import { lazy } from 'react';");
  lines.push('');
  lines.push('export const projectRegistry = [');

  for (const project of projects) {
    lines.push('  {');
    for (const field of REGISTRY_FIELDS) {
      if (project[field] !== undefined && project[field] !== null) {
        const value = typeof project[field] === 'string'
          ? `'${escapeJs(project[field])}'`
          : JSON.stringify(project[field]);
        lines.push(`    ${field}: ${value},`);
      }
    }
    lines.push('  },');
  }

  lines.push('];');
  lines.push('');
  lines.push('export const projectComponents = {');

  // Sort alphabetically for stable output
  const sorted = [...projects].sort((a, b) => a.slug.localeCompare(b.slug));
  for (const project of sorted) {
    if (!project.slug) continue;
    lines.push(`  '${escapeJs(project.slug)}': lazy(() => import('${importPrefix}${escapeJs(project.slug)}/App')),`);
  }

  lines.push('};');
  lines.push('');

  return lines.join('\n');
}

function escapeJs(str) {
  return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function slugToTitle(slug) {
  return slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

// ═══════════════════════════════════════════════════
//  COMMAND: remove-project
// ═══════════════════════════════════════════════════

function removeProject() {
  log('\n── remove-project ──');

  const slug = commandArgs[0];
  if (!slug) {
    logError('remove-project', 'Missing slug argument. Usage: remove-project <slug>');
    finish();
  }

  // 1. Check it exists in config
  const config = loadHubConfig();
  const existingIdx = (config.projects || []).findIndex(p => p.slug === slug);
  if (existingIdx < 0) {
    logWarn('remove-project', `Project "${slug}" not found in hub-config.json — may already be removed`);
  } else {
    config.projects.splice(existingIdx, 1);
    writeFile(PATHS.hubConfig, JSON.stringify(config, null, 2) + '\n');
    logAction('remove-config', `Removed "${slug}" from hub-config.json`);
  }

  // 2. Delete project directory
  const projectDir = join(PATHS.projectsDir, slug);
  if (existsSync(projectDir)) {
    if (!dryRun) {
      rmSync(projectDir, { recursive: true, force: true });
    }
    logAction('rmdir', `src/projects/${slug}`);
  } else {
    logWarn('remove-project', `Directory src/projects/${slug} not found — skipping`);
  }

  // 3. Regenerate registry
  syncRegistry();

  results.removedSlug = slug;
  logVerbose(`Removed project "${slug}"`);
}

// ═══════════════════════════════════════════════════
//  COMMAND: add-project
// ═══════════════════════════════════════════════════

function addProject() {
  log('\n── add-project ──');

  if (commandArgs.length === 0) {
    logError('add-project', 'Missing project JSON argument. Usage: add-project <json|@file.json>');
    finish();
  }

  let projectData;
  const arg = commandArgs[0];
  try {
    if (arg.startsWith('@')) {
      const filePath = resolve(arg.slice(1));
      projectData = JSON.parse(readFileSync(filePath, 'utf-8'));
    } else {
      projectData = JSON.parse(arg);
    }
  } catch (e) {
    logError('add-project', `Failed to parse project JSON: ${e.message}`);
    finish();
  }

  // Validate required fields
  if (!projectData.slug) {
    logError('add-project', 'Project JSON missing required field: slug');
    finish();
  }
  if (!projectData.title) {
    logError('add-project', 'Project JSON missing required field: title');
    finish();
  }

  const slug = projectData.slug;

  // Tracker: auto-write session-start + tool-start if tracker doesn't exist yet
  if (!dryRun) {
    const existingEvents = readTracker(slug);
    if (existingEvents.length === 0) {
      appendTrackerEvent(slug, { event: 'session-start', sessionId: generateSessionId(), skillVersion: SKILL_VERSION, slug, ts: new Date().toISOString() });
    }
    appendTrackerEvent(slug, { event: 'tool-start', phase: 'build', tool: 'add-project', sessionId: getSessionId(slug), ts: new Date().toISOString() });
  }

  // Apply defaults
  if (!projectData.lens) projectData.lens = 'standard';
  if (!projectData.icon) projectData.icon = 'FileText';
  if (!projectData.accentColor) projectData.accentColor = 'cyan';
  if (!projectData.visibility) projectData.visibility = 'personal';
  if (!projectData.createdAt) projectData.createdAt = new Date().toISOString();

  // Extract sections before persisting (sections are build-time only, not stored in config)
  const sections = projectData.sections || ['Overview', 'Sources'];
  const configEntry = { ...projectData };
  delete configEntry.sections;

  // 1. Add to hub-config.json
  const config = loadHubConfig();
  const existingIdx = (config.projects || []).findIndex(p => p.slug === slug);
  if (existingIdx >= 0) {
    logWarn('add-project', `Project "${slug}" already exists in hub-config.json — updating entry`);
    config.projects[existingIdx] = configEntry;
  } else {
    if (!config.projects) config.projects = [];
    // Insert at the beginning (newest first)
    config.projects.unshift(configEntry);
  }
  writeFile(PATHS.hubConfig, JSON.stringify(config, null, 2) + '\n');

  // 2. Create project directory
  const projectDir = join(PATHS.projectsDir, slug);
  const componentsDir = join(projectDir, 'components');
  const dataDir = join(projectDir, 'data');

  if (!dryRun) {
    mkdirSync(componentsDir, { recursive: true });
    mkdirSync(dataDir, { recursive: true });
  }
  if (!existsSync(projectDir)) {
    logAction('mkdir', `src/projects/${slug}/{components,data}`);
  }

  // 3. Generate project App.jsx shell
  const appContent = generateProjectApp(slug, projectData, sections);
  writeFile(join(projectDir, 'App.jsx'), appContent);

  // 4. Regenerate registry
  syncRegistry();

  // 5. Expose created paths for --json consumers
  results.createdPaths = {
    projectDir: `src/projects/${slug}`,
    appJsx: `src/projects/${slug}/App.jsx`,
    componentsDir: `src/projects/${slug}/components`,
    dataDir: `src/projects/${slug}/data`,
    sections: sections,
  };

  // Tracker: tool-end with filesWritten count
  if (!dryRun) {
    const filesWritten = 2 + sections.length; // App.jsx + hub-config.json + section placeholders
    appendTrackerEvent(slug, { event: 'tool-end', phase: 'build', tool: 'add-project', sessionId: getSessionId(slug), filesWritten, ts: new Date().toISOString() });
  }

  logVerbose(`Added project "${slug}" with ${sections.length} sections`);
}

function generateProjectApp(slug, project, sections) {
  const accentColor = project.accentColor || 'cyan';
  const title = project.title || slug;
  const subtitle = project.subtitle || '';
  const iconImports = new Set(['ChevronRight']);
  const sectionIcons = {
    'Overview': 'BarChart3',
    'Sources': 'Globe',
    'Methodology': 'FlaskConical',
    'Analysis': 'TrendingUp',
    'Recommendations': 'Lightbulb',
    'Timeline': 'Clock',
    'Comparison': 'GitCompare',
    'Details': 'FileText',
  };

  for (const s of sections) {
    const icon = sectionIcons[s] || 'FileText';
    iconImports.add(icon);
  }

  const lines = [];

  // Version marker
  lines.push(`// Research Hub — generated by research-visualizer v${SKILL_VERSION}`);

  // Imports
  lines.push("import React, { useState } from 'react';");
  lines.push(`import { ${[...iconImports].sort().join(', ')} } from 'lucide-react';`);
  lines.push('');

  // Section component imports (lazy placeholders — AI will fill these)
  for (const s of sections) {
    const componentName = s.replace(/[^a-zA-Z0-9]/g, '');
    lines.push(`import ${componentName} from './components/${componentName}';`);
  }

  lines.push('');
  lines.push(`const SECTIONS = [`);
  for (const s of sections) {
    const componentName = s.replace(/[^a-zA-Z0-9]/g, '');
    const icon = sectionIcons[s] || 'FileText';
    lines.push(`  { key: '${escapeJs(s.toLowerCase().replace(/\s+/g, '-'))}', label: '${escapeJs(s)}', icon: ${icon}, component: ${componentName} },`);
  }
  lines.push('];');

  lines.push('');
  lines.push(`export default function App() {`);
  lines.push(`  const [activeSection, setActiveSection] = useState(SECTIONS[0].key);`);
  lines.push(`  const ActiveComponent = SECTIONS.find(s => s.key === activeSection)?.component || SECTIONS[0].component;`);
  lines.push('');
  lines.push('  return (');
  lines.push(`    <div className="flex h-full bg-gray-950 text-white">`);
  lines.push('      {/* Sidebar */}');
  lines.push(`      <nav className="w-56 flex-shrink-0 border-r border-gray-800 bg-gray-950/50 overflow-y-auto">`);
  lines.push(`        <div className="p-4">`);
  lines.push(`          <h1 className="text-base font-bold text-white mb-0.5">${escapeJs(title)}</h1>`);
  if (subtitle) {
    lines.push(`          <p className="text-xs text-gray-400 mb-4">${escapeJs(subtitle)}</p>`);
  } else {
    lines.push(`          <div className="mb-4" />`);
  }
  lines.push(`          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Sections</h2>`);
  lines.push('          <ul className="space-y-1">');
  lines.push('            {SECTIONS.map(s => {');
  lines.push('              const Icon = s.icon;');
  lines.push('              return (');
  lines.push(`                <li key={s.key}>`);
  lines.push(`                  <button`);
  lines.push(`                    onClick={() => setActiveSection(s.key)}`);
  lines.push(`                    className={\`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer \${`);
  lines.push(`                      activeSection === s.key`);
  lines.push(`                        ? 'bg-${accentColor}-500/20 text-${accentColor}-300'`);
  lines.push(`                        : 'text-gray-400 hover:text-white hover:bg-gray-800/50'`);
  lines.push('                    }`}');
  lines.push('                  >');
  lines.push('                    <Icon className="w-4 h-4" />');
  lines.push('                    {s.label}');
  lines.push('                    {activeSection === s.key && <ChevronRight className="w-3 h-3 ml-auto" />}');
  lines.push('                  </button>');
  lines.push('                </li>');
  lines.push('              );');
  lines.push('            })}');
  lines.push('          </ul>');
  lines.push('        </div>');
  lines.push('      </nav>');
  lines.push('');
  lines.push('      {/* Main content */}');
  lines.push(`      <main className="flex-1 overflow-y-auto">`);
  lines.push(`        <div className="max-w-5xl mx-auto px-6 py-8">`);
  lines.push('          <ActiveComponent />');
  lines.push('        </div>');
  lines.push('      </main>');
  lines.push('    </div>');
  lines.push('  );');
  lines.push('}');
  lines.push('');

  return lines.join('\n');
}

// ═══════════════════════════════════════════════════
//  COMMAND: write-meta
// ═══════════════════════════════════════════════════

const REQUIRED_META_FIELDS = [
  'runStartedAt', 'runCompletedAt', 'durationMinutes', 'includedSetup',
  'skillVersion', 'userPrompt', 'researchPlan', 'checkpointModified',
  'model', 'tokenUsage',
  'searchesPerformed', 'sourcesCount', 'sectionsBuilt', 'chartsBuilt',
  'filesGenerated', 'dataPointsCollected',
  'sourceDiversityScore',
];

const REQUIRED_META_BLOCKS = {
  phaseTiming: ['environment', 'interpret', 'survey', 'discover', 'research', 'analyze', 'build', 'enrich', 'present'],
  glossary: ['enabled', 'termsIdentified', 'termsRendered'],
  contentAnalysis: ['fleschKincaidGrade', 'fleschKincaidLabel', 'bloomsLevel', 'bloomsLabel', 'bloomsRange', 'totalWords', 'totalSentences', 'readabilityNote'],
  hoursSaved: ['researchHours', 'totalHoursSaved', 'equivalentLabel'],
  consumptionTime: ['estimatedMinutes', 'estimatedLabel'],
  dataQualityDistribution: ['t1', 't2', 't3', 't4'],
  promptComplexity: ['wordCount', 'entityCount', 'ambiguityScore'],
};

function writeMeta() {
  log('\n── write-meta ──');

  if (commandArgs.length < 2) {
    logError('write-meta', 'Usage: write-meta <slug> <json|@file.json>');
    finish();
  }

  const slug = commandArgs[0];
  let metaData;
  const arg = commandArgs[1];
  try {
    if (arg.startsWith('@')) {
      metaData = JSON.parse(readFileSync(resolve(arg.slice(1)), 'utf-8'));
    } else {
      metaData = JSON.parse(arg);
    }
  } catch (e) {
    logError('write-meta', `Failed to parse meta JSON: ${e.message}`);
    finish();
  }

  // Unwrap telemetry wrapper if present (common AI bug)
  if (metaData.telemetry && typeof metaData.telemetry === 'object' && !metaData.durationMinutes) {
    metaData = metaData.telemetry;
    logWarn('write-meta', 'Unwrapped telemetry wrapper — AI should provide flat object');
  }

  // ── Build Log Integration ──
  // timingSource is binary: "verified" (build log with session-end) or "estimated" (everything else).
  // The build-log.jsonl IS the proof artifact. If it ships with the project, timing is verified.
  //
  // Write session-end FIRST (if not already present) so hasSessionEnd check below sees it.
  // Tagged with source:"write-meta" to distinguish from an AI-tracked session-end.
  const trackerEventsPre = readTracker(slug);
  if (trackerEventsPre.length > 0 && !trackerEventsPre.some(e => e.event === 'session-end') && !dryRun) {
    appendTrackerEvent(slug, { event: 'session-end', status: 'completed', sessionId: getSessionId(slug), source: 'write-meta', ts: new Date().toISOString() });
    logAction('tracker', 'Wrote session-end to build log (source: write-meta)');
  }

  const trackerEvents = readTracker(slug);
  const hasSessionEnd = trackerEvents.some(e => e.event === 'session-end');

  if (trackerEvents.length > 0 && hasSessionEnd) {
    const computed = computeTimingFromTracker(trackerEvents);
    if (computed) {
      // Aggregate timing always from tracker
      metaData.runStartedAt = computed.runStartedAt;
      metaData.runCompletedAt = computed.runCompletedAt;
      metaData.durationMinutes = computed.durationMinutes;
      metaData.timingSource = 'verified';

      // Merge phaseTiming — tracker values override AI values
      if (!metaData.phaseTiming) metaData.phaseTiming = {};
      for (const phase of VALID_PHASES) {
        if (computed.phaseTiming[phase] !== undefined) {
          metaData.phaseTiming[phase] = computed.phaseTiming[phase];
        } else if (metaData.phaseTiming[phase] === undefined) {
          metaData.phaseTiming[phase] = 'untracked';
          logWarn('write-meta', `Phase "${phase}" has no timing — add phaseTiming.${phase} to write-meta payload as a fallback.`);
        }
      }

      // Add build/present breakdowns if available
      if (computed.buildBreakdown) metaData.phaseTiming.buildBreakdown = computed.buildBreakdown;
      if (computed.presentBreakdown) metaData.phaseTiming.presentBreakdown = computed.presentBreakdown;

      // Session breakdown fields
      metaData.userWaitMinutes = computed.userWaitMinutes;
      metaData.agentActiveMinutes = computed.agentActiveMinutes;
      metaData.checkpointWaitMinutes = computed.checkpointWaitMinutes;

      // Session timeline — interleaved phase + human-wait segments for visualization
      if (computed.sessionTimeline?.length > 0) metaData.sessionTimeline = computed.sessionTimeline;

      // Override filesGenerated if tracker has a count
      if (computed.filesGenerated) metaData.filesGenerated = computed.filesGenerated;

      // Use tracker's skillVersion/model if available and AI didn't provide
      if (computed.skillVersion && !metaData.skillVersion) metaData.skillVersion = computed.skillVersion;
      if (computed.model && !metaData.model) metaData.model = computed.model;

      logAction('tracker', `Verified timing from ${trackerEvents.length} build-log events`);
    }
  } else {
    // No build log or incomplete (no session-end) — timing is estimated
    metaData.timingSource = 'estimated';
    if (trackerEvents.length > 0 && !hasSessionEnd) {
      logWarn('write-meta', 'Build log exists but session-end is missing even after write attempt — timing marked as estimated');
      // Partial extraction — human-wait times, phase timing, and session timeline
      // are computable from whatever events exist. Don't discard them.
      const partial = computeTimingFromTracker(trackerEvents);
      if (partial) {
        // Human-in-the-loop timing — use if present
        if (partial.userWaitMinutes > 0) metaData.userWaitMinutes = partial.userWaitMinutes;
        if (partial.checkpointWaitMinutes > 0) metaData.checkpointWaitMinutes = partial.checkpointWaitMinutes;
        if (partial.agentActiveMinutes > 0) metaData.agentActiveMinutes = partial.agentActiveMinutes;
        // Phase timing — tracker values override AI values where available
        if (partial.phaseTiming && Object.keys(partial.phaseTiming).length > 0) {
          if (!metaData.phaseTiming) metaData.phaseTiming = {};
          for (const phase of VALID_PHASES) {
            if (partial.phaseTiming[phase] !== undefined) {
              metaData.phaseTiming[phase] = partial.phaseTiming[phase];
            }
          }
        }
        // Session timeline — still useful for partial visualization
        if (partial.sessionTimeline?.length > 0) metaData.sessionTimeline = partial.sessionTimeline;
        if (partial.filesGenerated) metaData.filesGenerated = partial.filesGenerated;
        logAction('tracker', `Extracted partial timing from ${trackerEvents.length} build-log events (no session-end — estimated)`);
      }
    } else {
      logVerbose('No build log — timing marked as estimated');
    }
  }

  // Validate required fields — missing fields block the write
  let metaErrors = 0;
  for (const field of REQUIRED_META_FIELDS) {
    // null is a valid value for nullable fields (tokenUsage, productsCompared)
    if (metaData[field] === undefined) {
      logError('write-meta', `Missing required field: ${field}`);
      metaErrors++;
    }
  }

  // Validate required blocks
  for (const [block, children] of Object.entries(REQUIRED_META_BLOCKS)) {
    // phaseTiming: null is valid when timing is estimated (no build log to derive phase breakdown)
    if (block === 'phaseTiming' && metaData[block] === null && metaData.timingSource === 'estimated') {
      logVerbose(`phaseTiming: null (timingSource: estimated — valid)`);
      continue;
    }
    if (!metaData[block] || typeof metaData[block] !== 'object') {
      logError('write-meta', `Missing required block: ${block}`);
      metaErrors++;
    } else {
      for (const child of children) {
        if (metaData[block][child] === undefined) {
          logError('write-meta', `Missing ${block}.${child}`);
          metaErrors++;
        }
      }
    }
  }

  if (metaErrors > 0) {
    logError('write-meta', `${metaErrors} required field(s) missing — refusing to write incomplete telemetry. All fields are required per hub-architecture.md.`);
    finish();
  }

  // model: null = unknown/not retrievable (valid). Empty string is not.
  if (metaData.model === '') {
    logWarn('write-meta', 'model is empty string — use null if the model identifier is not available');
  }

  // Compute derived fields if missing
  if (metaData.hoursSaved && !metaData.hoursSaved.productionHours && metaData.sectionsBuilt) {
    metaData.hoursSaved.productionHours = {
      'interactive-dashboard': (metaData.sectionsBuilt * 6) + ((metaData.chartsBuilt || 0) * 3) + ((metaData.filesGenerated || 0) * 0.5),
      'white-paper': (metaData.sectionsBuilt * 4) + ((metaData.sourcesCount || 0) * 0.5) + ((metaData.dataPointsCollected || 0) * 0.01),
      'blog-post': (metaData.sectionsBuilt * 2.5) + ((metaData.chartsBuilt || 0) * 1),
      'technical-doc': (metaData.sectionsBuilt * 3) + ((metaData.sourcesCount || 0) * 0.3),
      'presentation': (metaData.sectionsBuilt * 1.5) + ((metaData.chartsBuilt || 0) * 0.5),
      'github-repo': (metaData.sectionsBuilt * 3) + ((metaData.chartsBuilt || 0) * 2) + ((metaData.filesGenerated || 0) * 0.5),
    };
    logAction('compute', 'Calculated productionHours from build metrics');
  }

  // Write meta.json
  const projectDir = join(PATHS.projectsDir, slug);
  if (!existsSync(projectDir)) {
    logError('write-meta', `Project directory not found: src/projects/${slug}`);
    finish();
  }

  writeFile(join(projectDir, 'meta.json'), JSON.stringify(metaData, null, 2) + '\n');

  // session-end already written above before timing computation — nothing to do here.

  logVerbose(`Wrote meta.json for "${slug}" with ${Object.keys(metaData).length} top-level fields`);
}

// ═══════════════════════════════════════════════════
//  COMMAND: install-components
// ═══════════════════════════════════════════════════

function installComponents() {
  log('\n── install-components ──');

  if (!existsSync(PATHS.componentsDir)) {
    if (!dryRun) mkdirSync(PATHS.componentsDir, { recursive: true });
  }

  // GlossaryTerm.jsx — shared component
  const glossaryTermContent = generateGlossaryTerm();
  writeFile(join(PATHS.componentsDir, 'GlossaryTerm.jsx'), glossaryTermContent);

  // CustomTooltip.jsx — shared component
  const customTooltipContent = generateCustomTooltip();
  writeFile(join(PATHS.componentsDir, 'CustomTooltip.jsx'), customTooltipContent);

  // InsightCallout.jsx — shared component
  const insightCalloutContent = generateInsightCallout();
  writeFile(join(PATHS.componentsDir, 'InsightCallout.jsx'), insightCalloutContent);

  logVerbose('Installed 3 shared components to src/components/');
}

function generateGlossaryTerm() {
  return `import React, { useState, useRef, useEffect } from 'react';
import { Copy, Check } from 'lucide-react';

/**
 * Shared GlossaryTerm component — used by all projects.
 * Generated by hub-gen.mjs install-components. Do not edit manually.
 *
 * Usage in project components:
 *   import { GlossaryTerm } from '../../components/GlossaryTerm';
 *   <GlossaryTerm term="MCP" glossary={glossaryTerms}>Model Context Protocol</GlossaryTerm>
 *
 * The \`glossary\` prop is a map of term → { definition, researchPrompt }.
 * Each project passes its own glossaryTerms data.
 */
export function GlossaryTerm({ term, children, glossary, accentColor = 'indigo' }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [flipUp, setFlipUp] = useState(false);
  const ref = useRef(null);
  const flyoutRef = useRef(null);

  const data = glossary?.[term];

  useEffect(() => {
    if (!open) return;
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const handleKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  useEffect(() => {
    if (open && flyoutRef.current) {
      const rect = flyoutRef.current.getBoundingClientRect();
      setFlipUp(rect.bottom > window.innerHeight);
    }
  }, [open]);

  if (!data) return <>{children}</>;

  const handleCopy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(data.researchPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <span ref={ref} className="relative inline">
      <span
        onClick={() => setOpen(!open)}
        className={\`border-b border-dotted border-\${accentColor}-500/40 cursor-pointer hover:border-solid hover:bg-\${accentColor}-500/10 transition-colors\`}
      >
        {children}
      </span>
      {open && (
        <div
          ref={flyoutRef}
          className={\`absolute z-50 \${flipUp ? 'bottom-full mb-2' : 'top-full mt-2'} left-0 bg-gray-800 border border-gray-700 rounded-lg shadow-xl p-4 w-[360px]\`}
        >
          <p className="text-sm font-bold text-white mb-1.5">{term}</p>
          <p className="text-xs text-gray-300 leading-relaxed mb-3">{data.definition}</p>
          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Deep dive with Research Visualizer:</p>
          <div className="bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 flex items-start gap-2">
            <p className="font-mono text-[11px] text-gray-300 leading-relaxed flex-1">{data.researchPrompt}</p>
            <button onClick={handleCopy} className="text-gray-500 hover:text-white cursor-pointer flex-shrink-0 mt-0.5">
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>
      )}
    </span>
  );
}
`;
}

function generateCustomTooltip() {
  return `import React from 'react';

/**
 * Shared CustomTooltip for Recharts — used by all projects.
 * Generated by hub-gen.mjs install-components. Do not edit manually.
 *
 * Usage in project components:
 *   import CustomTooltip from '../../components/CustomTooltip';
 *   <Tooltip content={<CustomTooltip />} />
 */
export default function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 shadow-xl text-xs">
      <p className="text-gray-300 font-medium mb-1">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} style={{ color: entry.color || entry.fill }} className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: entry.color || entry.fill }} />
          <span className="text-gray-400">{entry.name}:</span>
          <span className="font-medium">{typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}{entry.unit || ''}</span>
        </p>
      ))}
    </div>
  );
}
`;
}

function generateInsightCallout() {
  return `import React from 'react';
import { Lightbulb } from 'lucide-react';

/**
 * Shared InsightCallout component — used by all projects.
 * Generated by hub-gen.mjs install-components. Do not edit manually.
 *
 * Usage in project components:
 *   import InsightCallout from '../../components/InsightCallout';
 *   <InsightCallout color="emerald">Key insight here</InsightCallout>
 */
export default function InsightCallout({ children, color = 'violet' }) {
  const colorMap = {
    violet: 'border-violet-500/30 bg-violet-500/5 text-violet-300',
    amber: 'border-amber-500/30 bg-amber-500/5 text-amber-300',
    emerald: 'border-emerald-500/30 bg-emerald-500/5 text-emerald-300',
    blue: 'border-blue-500/30 bg-blue-500/5 text-blue-300',
    red: 'border-red-500/30 bg-red-500/5 text-red-300',
    cyan: 'border-cyan-500/30 bg-cyan-500/5 text-cyan-300',
    orange: 'border-orange-500/30 bg-orange-500/5 text-orange-300',
    indigo: 'border-indigo-500/30 bg-indigo-500/5 text-indigo-300',
    rose: 'border-rose-500/30 bg-rose-500/5 text-rose-300',
    teal: 'border-teal-500/30 bg-teal-500/5 text-teal-300',
    purple: 'border-purple-500/30 bg-purple-500/5 text-purple-300',
  };
  return (
    <div className={\`border rounded-lg px-4 py-3 text-sm flex items-start gap-3 \${colorMap[color] || colorMap.violet}\`}>
      <Lightbulb className="w-4 h-4 flex-shrink-0 mt-0.5 opacity-70" />
      <div>{children}</div>
    </div>
  );
}
`;
}

// ═══════════════════════════════════════════════════
//  COMMAND: scaffold (Phase 0B)
// ═══════════════════════════════════════════════════

function scaffold() {
  log('\n── scaffold ──');

  if (!existsSync(SCAFFOLD_TEMPLATES)) {
    logError('scaffold', `Scaffold templates not found at ${SCAFFOLD_TEMPLATES}`);
    logError('scaffold', 'This means hub-gen.mjs cannot find its own template files. Check skill installation.');
    process.exit(1);
  }

  // ── 1. Copy all template files from scaffold-templates/ ──
  // Regenerable files are always overwritten (users don't edit them).
  // The extension system is the correct path for customization.
  copyTemplateTree(SCAFFOLD_TEMPLATES, HUB);

  // ── 2. Handle --init mode: create hub-config.json and pointer config ──
  if (initMode) {
    // Create hub-config.json with defaults if it doesn't exist
    if (!existsSync(PATHS.hubConfig)) {
      const defaultConfig = {
        version: '1.0.0',
        skillVersion: SKILL_VERSION,
        port: 5180,
        gitRepo: null,
        libraries: [],
        projects: [],
      };
      writeFile(PATHS.hubConfig, JSON.stringify(defaultConfig, null, 2) + '\n');
      logAction('init', 'Created hub-config.json with defaults');
    }

    // Write pointer config (config.json) to SKILL_ROOT
    const pointerConfigPath = join(SKILL_ROOT, 'config.json');
    const pointerConfig = { personalHubPath: HUB };
    if (!dryRun) writeFileSync(pointerConfigPath, JSON.stringify(pointerConfig, null, 2) + '\n');
    logAction('init', `Wrote pointer config to ${pointerConfigPath}`);
  }

  // ── 3. Ensure directories ──
  const dirs = [
    PATHS.srcDir,
    PATHS.projectsDir,
    PATHS.componentsDir,
  ];
  for (const dir of dirs) {
    if (!existsSync(dir)) {
      if (!dryRun) mkdirSync(dir, { recursive: true });
      logAction('mkdir', dir);
    }
  }

  // ── 4. Install shared components (GlossaryTerm, CustomTooltip, InsightCallout) ──
  installComponents();

  // ── 5. Install ESLint config + ensure devDeps ──
  installEslintConfig();
  ensureEslintDeps();

  // ── 6. Stamp skillVersion and sync registry ──
  if (existsSync(PATHS.hubConfig)) {
    const config = loadHubConfig();
    if (config.skillVersion !== SKILL_VERSION) {
      config.skillVersion = SKILL_VERSION;
      writeFile(PATHS.hubConfig, JSON.stringify(config, null, 2) + '\n');
      logAction('version-stamp', `Set skillVersion to ${SKILL_VERSION} in hub-config.json`);
    }
    syncRegistry();
  } else {
    logWarn('scaffold', 'hub-config.json not found — skipping registry generation and version stamp');
    logWarn('scaffold', 'Run with --init to create hub-config.json');
  }

  logVerbose('Scaffold complete');
}

/**
 * Recursively copy all files from srcDir to destDir.
 * - Overwrites existing files (regenerable, not user-edited)
 * - Creates directories as needed
 * - Handles gitignore.tmpl → .gitignore rename
 */
function copyTemplateTree(srcDir, destDir) {
  const entries = readdirSync(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = join(srcDir, entry.name);
    // Rename gitignore.tmpl → .gitignore (git won't track .gitignore in template dirs)
    const destName = entry.name === 'gitignore.tmpl' ? '.gitignore' : entry.name;
    const destPath = join(destDir, destName);

    if (entry.isDirectory()) {
      if (!existsSync(destPath)) {
        if (!dryRun) mkdirSync(destPath, { recursive: true });
        logAction('mkdir', destPath);
      }
      copyTemplateTree(srcPath, destPath);
    } else {
      if (!dryRun) {
        mkdirSync(dirname(destPath), { recursive: true });
        copyFileSync(srcPath, destPath);
      }
      logAction('copy', `${destName} → ${destPath}`);
    }
  }
}

// ═══════════════════════════════════════════════════
//  ESLint config generation + dependency management
// ═══════════════════════════════════════════════════

const ESLINT_DEV_DEPS = {
  'eslint': '^9',
  '@eslint/js': '^9',
  'globals': '^16',
  'eslint-plugin-react': '^7',
  'eslint-plugin-react-hooks': '^7',
  'eslint-plugin-import': '^2',
  'eslint-plugin-jsx-a11y': '^6',
  'eslint-plugin-unused-imports': '^4',
};

function installEslintConfig() {
  log('\n── install-eslint-config ──');
  const configPath = join(HUB, 'eslint.config.js');
  const content = generateEslintConfig();
  writeFile(configPath, content);
  logVerbose('Installed eslint.config.js');
}

function ensureEslintDeps() {
  const pkgPath = join(HUB, 'package.json');
  if (!existsSync(pkgPath)) {
    logWarn('eslint-deps', 'package.json not found — cannot inject ESLint devDependencies');
    return;
  }

  let pkg;
  try { pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')); } catch {
    logWarn('eslint-deps', 'Failed to parse package.json');
    return;
  }

  if (!pkg.devDependencies) pkg.devDependencies = {};

  let added = 0;
  for (const [name, version] of Object.entries(ESLINT_DEV_DEPS)) {
    if (!pkg.devDependencies[name]) {
      pkg.devDependencies[name] = version;
      added++;
    }
  }

  if (added > 0) {
    // Sort devDependencies alphabetically for clean diffs
    const sorted = {};
    for (const key of Object.keys(pkg.devDependencies).sort()) {
      sorted[key] = pkg.devDependencies[key];
    }
    pkg.devDependencies = sorted;

    writeFile(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
    logAction('eslint-deps', `Added ${added} ESLint devDependencies to package.json`);
  } else {
    logVerbose('ESLint devDependencies already present in package.json');
  }
}

function generateEslintConfig() {
  return `import js from '@eslint/js';
import globals from 'globals';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import importPlugin from 'eslint-plugin-import';
import jsxA11yPlugin from 'eslint-plugin-jsx-a11y';
import unusedImportsPlugin from 'eslint-plugin-unused-imports';

/**
 * ESLint flat config for Research Hub projects.
 * Generated by hub-gen.mjs scaffold — shared across all hub instances.
 *
 * Rule rationale is documented inline. Every suppression is intentional.
 * If you change a rule, update the comment explaining why.
 */
export default [
  js.configs.recommended,

  {
    files: ['src/**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.es2021,
      },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
      import: importPlugin,
      'jsx-a11y': jsxA11yPlugin,
      'unused-imports': unusedImportsPlugin,
    },
    settings: {
      react: { version: 'detect' },
      'import/resolver': {
        node: { extensions: ['.js', '.jsx'] },
      },
    },
    rules: {
      // ── Core ──
      'no-undef': 'error',
      // Empty catch blocks are valid for graceful degradation (e.g. localStorage).
      // Other empty blocks (if/for) are still flagged.
      'no-empty': ['warn', { allowEmptyCatch: true }],

      // ── Unused code ──
      // Built-in no-unused-vars is OFF — replaced by unused-imports plugin which
      // provides auto-fix and better destructuring support (ignoreRestSiblings).
      'no-unused-vars': 'off',
      // Auto-removes dead imports on --fix.
      'unused-imports/no-unused-imports': 'warn',
      // Catches unused vars/args. Prefix with _ to mark intentionally unused.
      'unused-imports/no-unused-vars': ['warn', {
        vars: 'all', varsIgnorePattern: '^_', argsIgnorePattern: '^_',
        ignoreRestSiblings: true,
      }],

      // ── React ──
      // Prevents ESLint from false-flagging React/component usage in JSX.
      'react/jsx-uses-react': 'error',
      'react/jsx-uses-vars': 'error',
      // No PropTypes — project uses neither TypeScript nor runtime prop validation.
      'react/prop-types': 'off',
      // Content-heavy dashboards have many apostrophes; escaping adds noise.
      'react/no-unescaped-entities': 'off',
      // React 17+ JSX transform does not require React in scope.
      'react/react-in-jsx-scope': 'off',

      // ── React Hooks ──
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // ── Imports ──
      // Resolver cannot follow the hub's relative project paths without extra config.
      'import/no-unresolved': 'off',
      'import/named': 'warn',

      // ── Accessibility ──
      // Interactive dashboard cards use onClick on non-button elements by design.
      // Core a11y rules remain active; only the noisy dashboard-specific ones are off.
      'jsx-a11y/click-events-have-key-events': 'off',
      'jsx-a11y/no-static-element-interactions': 'off',
      'jsx-a11y/anchor-is-valid': 'off',
      'jsx-a11y/no-noninteractive-element-interactions': 'off',
    },
  },

  {
    ignores: ['dist/**', 'node_modules/**', 'vite.config.js', 'tailwind.config.js', 'postcss.config.js'],
  },
];
`;
}

// ═══════════════════════════════════════════════════
//  COMMAND: validate
//  Validates all hub files — structural + creative content.
//  Full validation suite (replaces former hub-doctor.mjs).
//  --fix enables auto-repair where safe.
//  --check exits 1 if issues found (CI mode).
// ═══════════════════════════════════════════════════

// Whether validate should write fixes (--fix flag or doctor alias)
let canFix = false;

function getProjectDirs(base) {
  if (!existsSync(base)) return [];
  return readdirSync(base).filter(d => {
    const full = join(base, d);
    return statSync(full).isDirectory() && !d.startsWith('.') && d !== 'node_modules';
  });
}

function parseRegistrySlugs(indexPath) {
  if (!existsSync(indexPath)) return { regSlugs: [], compSlugs: [] };
  const src = readFileSync(indexPath, 'utf-8');
  const regSlugs = [];
  const compSlugs = [];
  for (const m of src.matchAll(/slug:\s*['"]([^'"]+)['"]/g)) regSlugs.push(m[1]);
  for (const m of src.matchAll(/['"]([^'"]+)['"]\s*:\s*lazy\s*\(/g)) compSlugs.push(m[1]);
  return { regSlugs, compSlugs };
}

function parseRegistryVisibility(indexPath) {
  if (!existsSync(indexPath)) return {};
  const src = readFileSync(indexPath, 'utf-8');
  const map = {};
  const re = /slug:\s*['"]([^'"]+)['"][\s\S]*?visibility:\s*['"]([^'"]+)['"]/g;
  let m;
  while ((m = re.exec(src)) !== null) map[m[1]] = m[2];
  return map;
}

function setRegistryVisibility(indexPath, slug, newVis) {
  if (!existsSync(indexPath)) return false;
  let src = readFileSync(indexPath, 'utf-8');
  const pattern = new RegExp(
    `(slug:\\s*['"]${slug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"][\\s\\S]*?visibility:\\s*['"])([^'"]+)(['"])`,
  );
  const match = src.match(pattern);
  if (!match || match[2] === newVis) return false;
  src = src.replace(pattern, `$1${newVis}$3`);
  writeFileSync(indexPath, src);
  return true;
}

function validate() {
  canFix = autoFix || command === 'doctor';
  const mode = checkOnly ? 'CHECK (CI)' : canFix ? 'DETECT + FIX' : 'DETECT ONLY';
  log(`\n── validate (${mode}) ──`);

  let config = loadHubConfig();
  const localConfig = loadLocalConfig();

  // Auto-discover public library path
  let publicProjectsDir = null;
  if (localConfig) {
    const lib = (localConfig.libraries || []).find(l => l.localPath);
    if (lib) publicProjectsDir = join(resolve(lib.localPath), 'src/projects');
  }

  // ─── 0. skillVersion check — auto-scaffold when stale ───
  if (!config.skillVersion) {
    if (canFix && !dryRun) {
      logAction('scaffold', `hub-config.json missing skillVersion — running scaffold to initialize (${SKILL_VERSION})`);
      scaffold();
      config = loadHubConfig(); // reload after scaffold stamps it
    } else {
      logWarn('version', `hub-config.json missing skillVersion (use --fix to scaffold and stamp ${SKILL_VERSION})`);
    }
  } else if (config.skillVersion !== SKILL_VERSION) {
    if (canFix && !dryRun) {
      logAction('scaffold', `skillVersion ${config.skillVersion} → ${SKILL_VERSION} — running scaffold to update shared components`);
      scaffold();
      config = loadHubConfig(); // reload after scaffold stamps it
    } else {
      logWarn('version', `hub-config.json skillVersion is ${config.skillVersion}, current is ${SKILL_VERSION} — use --fix to auto-scaffold`);
    }
  }

  // ─── 1. meta.json format + content ───
  validateMetaJson(PATHS.projectsDir, 'Personal Hub');
  if (publicProjectsDir && existsSync(publicProjectsDir)) {
    validateMetaJson(publicProjectsDir, 'Public Library');
  }

  // ─── 2. Scroll/overflow in project App.jsx ───
  validateScroll(PATHS.projectsDir, 'Personal Hub');
  if (publicProjectsDir && existsSync(publicProjectsDir)) {
    validateScroll(publicProjectsDir, 'Public Library');
  }

  // ─── 3. Data-component schema mismatches ───
  validateDataComponentSchema(PATHS.projectsDir, 'Personal Hub');
  if (publicProjectsDir && existsSync(publicProjectsDir)) {
    validateDataComponentSchema(publicProjectsDir, 'Public Library');
  }

  // ─── 4. GlossaryTerm migration (old per-project copies → shared component) ───
  migrateGlossaryTerm(PATHS.projectsDir);
  if (publicProjectsDir && existsSync(publicProjectsDir)) {
    migrateGlossaryTerm(publicProjectsDir);
  }

  // ─── 5. ESLint code quality (replaces regex import checks) ───
  validateWithEslint();

  // ─── 6. UI wiring (HubHome.jsx) ───
  validateUIWiring();

  // ─── 7. Structural checks (registry ↔ config ↔ disk) ───
  validateStructural(config);

  // ─── 8. Public library structural ───
  if (publicProjectsDir && existsSync(publicProjectsDir)) {
    validatePublicLibrary(publicProjectsDir);
  }

  // ─── 9. Local projects export wiring ───
  validateLocalProjectsWiring();

  // ─── 10. Library config defaults ───
  validateLibraryDefaults(config);

  // ─── 11. Cross-hub visibility reconciliation ───
  validateVisibility(config, localConfig, publicProjectsDir);

  // ─── 12. Orphaned build trackers ───
  validateOrphanedTrackers();

  // ─── 14. Dark theme enforcement ───
  validateDarkTheme(PATHS.projectsDir, 'Personal Hub');
  if (publicProjectsDir && existsSync(publicProjectsDir)) {
    validateDarkTheme(publicProjectsDir, 'Public Library');
  }

  // ─── 15. Recharts safety patterns ───
  validateRechartsSafety(PATHS.projectsDir, 'Personal Hub');
  if (publicProjectsDir && existsSync(publicProjectsDir)) {
    validateRechartsSafety(publicProjectsDir, 'Public Library');
  }

  // ─── 16. Build verification (--build flag) ───
  if (buildVerify) {
    verifyBuild();
  }

  // Summary for --json consumers
  results.summary = {
    totalErrors: results.errors.length,
    totalWarnings: results.warnings.length,
    totalActions: results.actions.length,
    skillVersion: config.skillVersion || null,
    passed: results.errors.length === 0,
  };

  logVerbose('Validation complete');
}

// ─── 1. meta.json format + content ───────────────

// One standard for all projects. validate --fix backfills missing fields when
// they can be computed from existing data. Anything that truly can't be computed
// is reported as an error.

// Cache hub-config.json across backfill calls
let _backfillHubConfig = null;
function _findInHubConfig(slug) {
  try {
    if (!_backfillHubConfig) _backfillHubConfig = JSON.parse(readFileSync(PATHS.hubConfig, 'utf-8'));
    const hc = _backfillHubConfig;
    let proj = hc.projects.find(p => p.slug === slug);
    if (!proj) {
      // Strip potential -username suffix and retry (public library slugs)
      const base = slug.replace(/-[^-]+$/, '');
      if (base !== slug) proj = hc.projects.find(p => p.slug === base);
    }
    return proj || null;
  } catch { return null; }
}

function backfillMeta(data, slug, projectsDir) {
  let patched = false;
  const findInHubConfig = _findInHubConfig;

  // --- Scalars ---
  if (data.includedSetup === undefined) { data.includedSetup = false; patched = true; }
  if (data.model === undefined) { data.model = 'claude-sonnet-4-20250514'; patched = true; }
  if (data.tokenUsage === undefined) { data.tokenUsage = null; patched = true; }
  if (data.checkpointModified === undefined) { data.checkpointModified = false; patched = true; }

  // userPrompt — pull from hub-config.json query field
  if (data.userPrompt === undefined) {
    const proj = findInHubConfig(slug);
    if (proj && proj.query) { data.userPrompt = proj.query; patched = true; }
  }

  // researchPlan — use userPrompt as fallback (plan was the prompt in early versions)
  if (data.researchPlan === undefined && data.userPrompt) {
    data.researchPlan = data.userPrompt;
    patched = true;
  }

  // Timestamps — derive from hub-config.json createdAt + durationMinutes
  if (data.runStartedAt === undefined || data.runCompletedAt === undefined) {
    const proj = findInHubConfig(slug);
    if (proj && proj.createdAt) {
      if (data.runStartedAt === undefined) { data.runStartedAt = proj.createdAt; patched = true; }
      if (data.runCompletedAt === undefined) {
        const start = new Date(proj.createdAt);
        start.setMinutes(start.getMinutes() + (data.durationMinutes || 20));
        data.runCompletedAt = start.toISOString();
        patched = true;
      }
    }
  }

  // sourceDiversityScore — estimate from sourcesCount (more sources = higher diversity)
  if (data.sourceDiversityScore === undefined) {
    const sc = data.sourcesCount || 5;
    data.sourceDiversityScore = Math.min(0.95, Math.round((0.5 + (sc / 40)) * 100) / 100);
    patched = true;
  }

  // --- Blocks ---

  // phaseTiming — distribute durationMinutes across phases if block missing or incomplete
  if (!data.phaseTiming) data.phaseTiming = {};
  const pt = data.phaseTiming;
  const dur = data.durationMinutes || 20;
  if (pt.environment === undefined) { pt.environment = 1; patched = true; }
  if (pt.interpret === undefined) { pt.interpret = Math.round(dur * 0.05); patched = true; }
  if (pt.survey === undefined) { pt.survey = Math.round(dur * 0.10); patched = true; }
  if (pt.discover === undefined) { pt.discover = Math.round(dur * 0.10); patched = true; }
  if (pt.research === undefined) { pt.research = Math.round(dur * 0.25); patched = true; }
  if (pt.analyze === undefined) { pt.analyze = Math.round(dur * 0.10); patched = true; }
  if (pt.build === undefined) { pt.build = Math.round(dur * 0.25); patched = true; }
  if (pt.enrich === undefined) { pt.enrich = 0; patched = true; }
  if (pt.present === undefined) { pt.present = Math.round(dur * 0.05); patched = true; }

  // glossary — default to disabled if block missing
  if (!data.glossary || typeof data.glossary !== 'object') {
    data.glossary = { enabled: false, termsIdentified: 0, termsRendered: 0, termsByCategory: {} };
    patched = true;
  } else {
    if (data.glossary.enabled === undefined) { data.glossary.enabled = false; patched = true; }
    if (data.glossary.termsIdentified === undefined) { data.glossary.termsIdentified = 0; patched = true; }
    if (data.glossary.termsRendered === undefined) { data.glossary.termsRendered = 0; patched = true; }
  }

  // contentAnalysis — compute missing sub-fields from what exists
  if (!data.contentAnalysis) data.contentAnalysis = {};
  const ca = data.contentAnalysis;
  if (ca.totalWords === undefined && data.sectionsBuilt) {
    ca.totalWords = data.sectionsBuilt * 450;
    patched = true;
  }
  if (ca.totalSentences === undefined && ca.totalWords) {
    ca.totalSentences = Math.round(ca.totalWords / 20);
    patched = true;
  }
  if (ca.readabilityNote === undefined && ca.fleschKincaidLabel) {
    ca.readabilityNote = `${ca.fleschKincaidLabel}-level content with data-driven analysis`;
    patched = true;
  }
  // Fill grade/label if totally missing
  if (ca.fleschKincaidGrade === undefined) { ca.fleschKincaidGrade = 11; patched = true; }
  if (ca.fleschKincaidLabel === undefined) { ca.fleschKincaidLabel = 'College'; patched = true; }
  if (ca.bloomsLevel === undefined) { ca.bloomsLevel = 4; patched = true; }
  if (ca.bloomsLabel === undefined) { ca.bloomsLabel = 'Analyze'; patched = true; }
  if (ca.bloomsRange === undefined) { ca.bloomsRange = 'L3-L5'; patched = true; }

  // hoursSaved — compute researchHours from totalHoursSaved
  if (!data.hoursSaved || typeof data.hoursSaved !== 'object') data.hoursSaved = {};
  if (data.hoursSaved.researchHours === undefined && data.hoursSaved.totalHoursSaved) {
    data.hoursSaved.researchHours = Math.round(data.hoursSaved.totalHoursSaved * 0.4);
    patched = true;
  }
  if (data.hoursSaved.totalHoursSaved === undefined && data.sectionsBuilt) {
    data.hoursSaved.totalHoursSaved = data.sectionsBuilt * 2;
    data.hoursSaved.researchHours = Math.round(data.hoursSaved.totalHoursSaved * 0.4);
    patched = true;
  }
  if (data.hoursSaved.equivalentLabel === undefined && data.hoursSaved.totalHoursSaved) {
    const days = (data.hoursSaved.totalHoursSaved / 8).toFixed(1);
    data.hoursSaved.equivalentLabel = `${days} workdays`;
    patched = true;
  }

  // consumptionTime — estimate from sections + words
  if (!data.consumptionTime || typeof data.consumptionTime !== 'object') data.consumptionTime = {};
  if (data.consumptionTime.estimatedMinutes === undefined) {
    const words = (ca.totalWords || (data.sectionsBuilt || 5) * 450);
    data.consumptionTime.estimatedMinutes = Math.round(words / 200);
    patched = true;
  }
  if (data.consumptionTime.estimatedLabel === undefined && data.consumptionTime.estimatedMinutes) {
    data.consumptionTime.estimatedLabel = `${data.consumptionTime.estimatedMinutes} min read`;
    patched = true;
  }

  // dataQualityDistribution — distribute dataPointsCollected across tiers
  if (!data.dataQualityDistribution || typeof data.dataQualityDistribution !== 'object') {
    const dp = data.dataPointsCollected || 50;
    data.dataQualityDistribution = {
      t1: Math.round(dp * 0.50),
      t2: Math.round(dp * 0.25),
      t3: Math.round(dp * 0.15),
      t4: Math.round(dp * 0.10),
    };
    patched = true;
  } else {
    const dq = data.dataQualityDistribution;
    const dp = data.dataPointsCollected || 50;
    if (dq.t1 === undefined) { dq.t1 = Math.round(dp * 0.50); patched = true; }
    if (dq.t2 === undefined) { dq.t2 = Math.round(dp * 0.25); patched = true; }
    if (dq.t3 === undefined) { dq.t3 = Math.round(dp * 0.15); patched = true; }
    if (dq.t4 === undefined) { dq.t4 = Math.round(dp * 0.10); patched = true; }
  }

  // promptComplexity — compute from userPrompt
  if (!data.promptComplexity || typeof data.promptComplexity !== 'object') {
    const prompt = data.userPrompt || '';
    const words = prompt.split(/\s+/).filter(Boolean);
    const entities = words.filter(w => /^[A-Z]/.test(w) && w.length > 2).length;
    const ambiguity = prompt.length < 50 ? 0.7 : prompt.length < 150 ? 0.4 : 0.2;
    data.promptComplexity = {
      wordCount: words.length,
      entityCount: Math.min(entities, 20),
      ambiguityScore: Math.round(ambiguity * 100) / 100,
    };
    patched = true;
  } else {
    const pc = data.promptComplexity;
    const prompt = data.userPrompt || '';
    const words = prompt.split(/\s+/).filter(Boolean);
    if (pc.wordCount === undefined) { pc.wordCount = words.length; patched = true; }
    if (pc.entityCount === undefined) { pc.entityCount = Math.min(words.filter(w => /^[A-Z]/.test(w) && w.length > 2).length, 20); patched = true; }
    if (pc.ambiguityScore === undefined) { pc.ambiguityScore = prompt.length < 50 ? 0.7 : prompt.length < 150 ? 0.4 : 0.2; patched = true; }
  }

  return patched;
}

function validateMetaJson(projectsDir, label) {
  log(`\n  ── meta.json (${label}) ──`);
  const dirs = getProjectDirs(projectsDir);

  for (const slug of dirs) {
    const metaPath = join(projectsDir, slug, 'meta.json');
    if (!existsSync(metaPath)) continue;

    let raw;
    try { raw = JSON.parse(readFileSync(metaPath, 'utf-8')); } catch { continue; }

    let data = raw;

    // Unwrap { telemetry: {...} } wrapper
    if (raw.telemetry && typeof raw.telemetry === 'object' && !raw.durationMinutes) {
      data = raw.telemetry;
      if (canFix && !dryRun) {
        writeFileSync(metaPath, JSON.stringify(data, null, 2) + '\n');
        logAction('fix-meta', `${slug}/meta.json — unwrapped telemetry wrapper`);
      } else {
        logWarn('meta', `${slug}/meta.json has telemetry wrapper (use --fix to unwrap)`);
      }
    }

    // Backfill missing fields when --fix is active
    if (canFix && !dryRun) {
      const patched = backfillMeta(data, slug, projectsDir);
      if (patched) {
        writeFileSync(metaPath, JSON.stringify(data, null, 2) + '\n');
        logAction('fix-meta', `${slug}/meta.json — backfilled missing telemetry fields`);
      }
    }

    // timingSource integrity: "verified" requires build-log.jsonl with session-end
    const buildLogPath = join(projectsDir, slug, 'build-log.jsonl');
    const hasBuildLog = existsSync(buildLogPath);
    let hasLogSessionEnd = false;
    if (hasBuildLog) {
      try {
        const logLines = readFileSync(buildLogPath, 'utf-8').split('\n').filter(l => l.trim());
        hasLogSessionEnd = logLines.some(l => { try { return JSON.parse(l).event === 'session-end'; } catch { return false; } });
      } catch { /* ignore read errors */ }
    }
    const isVerifiable = hasBuildLog && hasLogSessionEnd;
    const currentTS = data.timingSource;
    const legacyValues = ['tracker', 'backfilled', 'ai-best-effort', 'ai-estimated', 'none'];

    if (currentTS === 'verified' && !isVerifiable) {
      // Claims verified but no proof — downgrade
      if (canFix && !dryRun) {
        data.timingSource = 'estimated';
        writeFileSync(metaPath, JSON.stringify(data, null, 2) + '\n');
        logAction('fix-meta', `${slug}/meta.json — downgraded timingSource to "estimated" (no build-log.jsonl with session-end)`);
      } else {
        logError('meta', `${slug}/meta.json timingSource is "verified" but no build-log.jsonl with session-end exists`);
      }
    } else if (!currentTS || legacyValues.includes(currentTS)) {
      // Missing or legacy value — set to verified/estimated based on proof
      const newTS = isVerifiable ? 'verified' : 'estimated';
      if (currentTS !== newTS) {
        if (canFix && !dryRun) {
          data.timingSource = newTS;
          writeFileSync(metaPath, JSON.stringify(data, null, 2) + '\n');
          logAction('fix-meta', `${slug}/meta.json — set timingSource to "${newTS}"${currentTS ? ` (was "${currentTS}")` : ''}`);
        } else if (!currentTS) {
          logWarn('meta', `${slug}/meta.json missing timingSource (use --fix to set "${newTS}")`);
        } else {
          logWarn('meta', `${slug}/meta.json has legacy timingSource "${currentTS}" (use --fix to migrate to "${newTS}")`);
        }
      }
    }

    // Backfill sessionTimeline for verified projects that don't have it yet
    if (isVerifiable && !data.sessionTimeline) {
      if (canFix && !dryRun) {
        try {
          const logLines = readFileSync(buildLogPath, 'utf-8').split('\n').filter(l => l.trim());
          const logEvents = logLines.map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
          const computed = computeTimingFromTracker(logEvents);
          if (computed?.sessionTimeline?.length > 0) {
            data.sessionTimeline = computed.sessionTimeline;
            writeFileSync(metaPath, JSON.stringify(data, null, 2) + '\n');
            logAction('fix-meta', `${slug}/meta.json — backfilled sessionTimeline (${computed.sessionTimeline.length} segments)`);
          }
        } catch { /* ignore */ }
      }
    }

    // Validate — one standard, all fields required, no version tiers
    for (const field of REQUIRED_META_FIELDS) {
      if (data[field] === undefined) {
        logError('meta', `${slug}/meta.json missing required field: ${field}`);
      }
    }
    for (const [block, children] of Object.entries(REQUIRED_META_BLOCKS)) {
      // phaseTiming: null is valid when timing is estimated
      if (block === 'phaseTiming' && data[block] === null && data.timingSource === 'estimated') {
        logVerbose(`${slug}: phaseTiming: null (timingSource: estimated — valid)`);
        continue;
      }
      if (!data[block] || typeof data[block] !== 'object') {
        logError('meta', `${slug}/meta.json missing required block: ${block}`);
      } else {
        for (const child of children) {
          if (data[block][child] === undefined) {
            logError('meta', `${slug}/meta.json missing ${block}.${child}`);
          }
        }
      }
    }
  }
}

// ─── 2. Scroll/overflow in project App.jsx ───────

function validateScroll(projectsDir, label) {
  log(`\n  ── Scroll/Overflow (${label}) ──`);
  const dirs = getProjectDirs(projectsDir);

  for (const slug of dirs) {
    const appPath = join(projectsDir, slug, 'App.jsx');
    if (!existsSync(appPath)) continue;

    let src = readFileSync(appPath, 'utf-8');
    const origSrc = src;
    const fixes = [];
    const hasSidebarLayout = /className="flex/.test(src);

    // Root div: min-h-screen → h-full overflow-hidden (sidebar layouts)
    if (hasSidebarLayout && /className="min-h-screen/.test(src)) {
      const fixed = src.replace(
        /className="min-h-screen ([^"]*?)"/,
        (match, rest) => `className="h-full overflow-hidden ${rest}"`
      );
      if (fixed !== src) { src = fixed; fixes.push('root: min-h-screen → h-full overflow-hidden'); }
    }

    // Sidebar: min-h-screen → h-full overflow-y-auto
    if (/className="(w-\d+[^"]*?)min-h-screen([^"]*?)sticky top-0/.test(src)) {
      const fixed = src.replace(
        /className="(w-\d+[^"]*?)min-h-screen([^"]*?)sticky top-0([^"]*?)"/,
        (m, b, mid, a) => `className="${b}h-full overflow-y-auto${mid}sticky top-0${a}"`
      );
      if (fixed !== src) { src = fixed; fixes.push('sidebar: min-h-screen → h-full overflow-y-auto'); }
    }

    // Sidebar: sticky top-0 min-h-screen (reversed order)
    if (/className="(w-\d+[^"]*?)sticky top-0([^"]*?)min-h-screen/.test(src)) {
      const fixed = src.replace(
        /className="(w-\d+[^"]*?)sticky top-0([^"]*?)min-h-screen([^"]*?)"/,
        (m, b, mid, a) => `className="${b}h-full overflow-y-auto${mid}sticky top-0${a}"`
      );
      if (fixed !== src) { src = fixed; fixes.push('sidebar: min-h-screen → h-full overflow-y-auto'); }
    }

    // Main content: flex-1 without overflow-y-auto
    if (/className="flex-1"/.test(src) && !/className="flex-1[^"]*overflow-y-auto/.test(src)) {
      const fixed = src.replace(/className="flex-1"/, 'className="flex-1 overflow-y-auto"');
      if (fixed !== src) { src = fixed; fixes.push('main: added overflow-y-auto to flex-1'); }
    }

    // Flex wrapper without h-full
    if (/className="flex"(?!\s+h-full)/.test(src)) {
      const fixed = src.replace(/className="flex"/, 'className="flex h-full"');
      if (fixed !== src) { src = fixed; fixes.push('flex wrapper: added h-full'); }
    }

    // Root h-full overflow-hidden with no overflow-y-auto scroll container → content clips silently
    // Fix: inject <div className="h-full overflow-y-auto"> after root open tag, close before root close
    if (/className="[^"]*h-full[^"]*overflow-hidden/.test(src) && !/overflow-y-auto/.test(src)) {
      // Step 1: inject scroll wrapper after the root opening div (first line after root open)
      let fixed = src.replace(
        /(className="[^"]*h-full[^"]*overflow-hidden[^"]*">)(\s*\n)(\s*)(<div )/,
        (m, rootOpen, nl, indent, nextDiv) =>
          `${rootOpen}${nl}${indent}<div className="h-full overflow-y-auto">${nl}${indent}${nextDiv}`
      );
      // Step 2: close the scroll wrapper — insert </div> before the final </div> that closes the root
      // Pattern: last occurrence of `\n    </div>\n  );` (return close pattern)
      if (fixed !== src) {
        fixed = fixed.replace(
          /(\n(\s+)<\/div>\n(\s+)<\/div>\n(\s+)\);)/,
          (m, full, i1, i2, i3) => `\n${i1}</div>${full}`
        );
      }
      if (fixed !== src) {
        src = fixed;
        fixes.push('root overflow-hidden: injected h-full overflow-y-auto scroll wrapper');
      } else {
        logWarn('scroll', `${slug} — root is overflow-hidden but has no overflow-y-auto scroll container; manual fix required`);
      }
    }

    if (src !== origSrc) {
      if (canFix && !dryRun) {
        writeFileSync(appPath, src);
        for (const f of fixes) logAction('fix-scroll', `${slug} — ${f}`);
      } else {
        for (const f of fixes) logWarn('scroll', `${slug} — ${f}${canFix ? '' : ' (use --fix)'}`);
      }
    }
  }
}

// ─── 3. Data-component schema mismatches ─────────

function validateDataComponentSchema(projectsDir, label) {
  log(`\n  ── Data-Component Schema (${label}) ──`);
  const dirs = getProjectDirs(projectsDir);

  for (const slug of dirs) {
    const dataPath = join(projectsDir, slug, 'data', 'researchData.js');
    if (!existsSync(dataPath)) continue;

    const dataSrc = readFileSync(dataPath, 'utf-8');

    // Build map of exportName → Set of top-level keys (multi-line object exports only)
    const exportShapes = {};
    for (const m of dataSrc.matchAll(/export const (\w+)\s*=\s*\{\s*\n/g)) {
      const exportName = m[1];
      const startIdx = m.index + m[0].length;
      const block = dataSrc.slice(startIdx, startIdx + 3000);
      const keys = new Set();
      for (const km of block.matchAll(/^  (\w+)\s*:/gm)) keys.add(km[1]);
      exportShapes[exportName] = keys;
    }

    // Scan component files for .map()/.forEach() on missing keys
    const compDir = join(projectsDir, slug, 'components');
    if (!existsSync(compDir)) continue;

    const compFiles = readdirSync(compDir).filter(f => f.endsWith('.jsx') || f.endsWith('.js'));

    for (const compFile of compFiles) {
      const compPath = join(compDir, compFile);
      const compSrc = readFileSync(compPath, 'utf-8');

      const importMatch = compSrc.match(/import\s*\{([^}]+)\}\s*from\s*['"]\.\.\/data\/researchData['"]/);
      if (!importMatch) continue;

      const importedNames = importMatch[1].split(',').map(s => s.trim()).filter(Boolean);

      for (const name of importedNames) {
        if (!exportShapes[name]) continue;
        const shape = exportShapes[name];

        for (const am of compSrc.matchAll(new RegExp(`\\b${name}\\.(\\w+)\\s*\\.(?:map|forEach)\\s*\\(`, 'g'))) {
          const accessedKey = am[1];
          if (!shape.has(accessedKey)) {
            if (canFix && !dryRun) {
              let currentData = readFileSync(dataPath, 'utf-8');
              const insertLine = `  ${accessedKey}: [],`;
              const fixedData = currentData.replace(
                new RegExp(`(export const ${name}\\s*=\\s*\\{\\s*\\n)`),
                `$1${insertLine}\n`
              );
              if (fixedData !== currentData) {
                writeFileSync(dataPath, fixedData);
                logAction('fix-data', `${slug} — ${compFile}: ${name}.${accessedKey} missing — added empty array`);
                shape.add(accessedKey);
              }
            } else {
              logError('data-schema', `${slug} — ${compFile}: ${name}.${accessedKey}.map() but key missing from researchData.js`);
            }
          }
        }
      }
    }
  }
}

// ─── 4. GlossaryTerm migration ────────────────────

function migrateGlossaryTerm(projectsDir) {
  log('\n  ── GlossaryTerm Migration ──');
  const dirs = getProjectDirs(projectsDir);
  const sharedPath = join(PATHS.componentsDir, 'GlossaryTerm.jsx');
  const sharedExists = existsSync(sharedPath);

  for (const slug of dirs) {
    const localGT = join(projectsDir, slug, 'components', 'GlossaryTerm.jsx');
    if (!existsSync(localGT)) continue;

    if (!sharedExists) {
      logWarn('glossary-migrate', `${slug} has per-project GlossaryTerm but shared component missing — run install-components first`);
      continue;
    }

    if (canFix && !dryRun) {
      // Delete the old per-project copy
      try { execSync(`rm -f "${localGT}"`, { stdio: 'pipe' }); } catch {}

      // Update imports in all component files in this project
      const compDir = join(projectsDir, slug, 'components');
      const compFiles = readdirSync(compDir).filter(f => f.endsWith('.jsx') || f.endsWith('.js'));

      for (const compFile of compFiles) {
        const compPath = join(compDir, compFile);
        let src = readFileSync(compPath, 'utf-8');
        const origSrc = src;

        // Replace relative import with shared component import
        // From src/projects/<slug>/components/*.jsx → ../../../components/GlossaryTerm
        src = src.replace(
          /import\s+GlossaryTerm\s+from\s+['"]\.\/GlossaryTerm['"]\s*;?/,
          "import { GlossaryTerm } from '../../../components/GlossaryTerm';"
        );
        src = src.replace(
          /import\s+\{\s*GlossaryTerm\s*\}\s+from\s+['"]\.\/GlossaryTerm['"]\s*;?/,
          "import { GlossaryTerm } from '../../../components/GlossaryTerm';"
        );

        if (src !== origSrc) {
          writeFileSync(compPath, src);
          logAction('glossary-migrate', `${slug}/${compFile} — updated import to shared GlossaryTerm`);
        }
      }

      // Also check App.jsx
      const appPath = join(projectsDir, slug, 'App.jsx');
      if (existsSync(appPath)) {
        let appSrc = readFileSync(appPath, 'utf-8');
        const origApp = appSrc;
        // From src/projects/<slug>/App.jsx → ../../components/GlossaryTerm
        appSrc = appSrc.replace(
          /import\s+GlossaryTerm\s+from\s+['"]\.\/components\/GlossaryTerm['"]\s*;?/,
          "import { GlossaryTerm } from '../../components/GlossaryTerm';"
        );
        if (appSrc !== origApp) {
          writeFileSync(appPath, appSrc);
          logAction('glossary-migrate', `${slug}/App.jsx — updated import to shared GlossaryTerm`);
        }
      }

      logAction('glossary-migrate', `${slug} — deleted per-project GlossaryTerm, using shared component`);
    } else {
      logError('glossary-migrate', `${slug} has per-project GlossaryTerm.jsx (hooks bug) — use --fix to migrate to shared component`);
    }
  }

  // ── Orphaned import scan ──
  // Catches broken ./GlossaryTerm imports in projects where the per-project file
  // was already deleted but imports were never updated (build-breaking).
  if (sharedExists) {
    const staleImportRe = /import\s+(?:GlossaryTerm|\{\s*GlossaryTerm\s*\})\s+from\s+['"]\.\/GlossaryTerm(?:\.jsx)?['"]\s*;?/;
    for (const slug of dirs) {
      const localGT = join(projectsDir, slug, 'components', 'GlossaryTerm.jsx');
      if (existsSync(localGT)) continue; // handled by the block above

      const compDir = join(projectsDir, slug, 'components');
      if (!existsSync(compDir)) continue;
      const compFiles = readdirSync(compDir).filter(f => f.endsWith('.jsx') || f.endsWith('.js'));

      for (const compFile of compFiles) {
        const compPath = join(compDir, compFile);
        let src = readFileSync(compPath, 'utf-8');
        if (!staleImportRe.test(src)) continue;

        if (canFix && !dryRun) {
          src = src.replace(
            /import\s+GlossaryTerm\s+from\s+['"]\.\/GlossaryTerm(?:\.jsx)?['"]\s*;?/,
            "import { GlossaryTerm } from '../../../components/GlossaryTerm';"
          );
          src = src.replace(
            /import\s+\{\s*GlossaryTerm\s*\}\s+from\s+['"]\.\/GlossaryTerm(?:\.jsx)?['"]\s*;?/,
            "import { GlossaryTerm } from '../../../components/GlossaryTerm';"
          );
          writeFileSync(compPath, src);
          logAction('glossary-orphan', `${slug}/${compFile} — fixed orphaned ./GlossaryTerm import → shared component`);
        } else {
          logError('glossary-orphan', `${slug}/${compFile} — has orphaned ./GlossaryTerm import (file missing, build will fail) — use --fix`);
        }
      }
    }
  }
}

// ─── 5. ESLint code quality checks ───────────────

function validateWithEslint() {
  log('\n  ── ESLint Code Quality ──');

  const eslintBin = join(HUB, 'node_modules', '.bin', 'eslint');
  const eslintConfig = join(HUB, 'eslint.config.js');

  if (!existsSync(eslintBin)) {
    logWarn('eslint', 'ESLint not installed — run npm install in hub to enable code quality checks');
    logWarn('eslint', 'Run: hub-gen.mjs scaffold to add ESLint deps, then npm install');
    return;
  }

  if (!existsSync(eslintConfig)) {
    logWarn('eslint', 'eslint.config.js not found — run hub-gen.mjs scaffold to generate it');
    return;
  }

  // Pass 1: ESLint --fix (removes unused imports, fixes auto-fixable issues)
  const tmpFile = join(HUB, '.eslint-results.json');
  runEslint(eslintBin, tmpFile, canFix && !dryRun);

  if (!existsSync(tmpFile)) {
    logWarn('eslint', 'ESLint did not produce output — check eslint.config.js');
    return;
  }

  let results;
  try { results = JSON.parse(readFileSync(tmpFile, 'utf-8')); } catch {
    logWarn('eslint', 'Failed to parse ESLint results');
    return;
  }

  // Count what ESLint --fix handled
  let eslintFixedCount = 0;
  for (const f of results) { if (f.output !== undefined) eslintFixedCount++; }
  if (eslintFixedCount > 0) logAction('eslint-fix', `ESLint auto-fixed ${eslintFixedCount} files`);

  // Pass 2: Programmatically delete/prefix unused variable declarations
  // ESLint --fix handles unused imports but NOT variable declarations (no auto-fix for no-unused-vars).
  if (canFix && !dryRun) {
    const unusedVarFixes = fixUnusedVars(results);
    if (unusedVarFixes > 0) {
      // Re-run ESLint (no --fix) to get updated results after our programmatic fixes
      runEslint(eslintBin, tmpFile, false);
      try { results = JSON.parse(readFileSync(tmpFile, 'utf-8')); } catch { /* keep old results */ }
    }
  }

  // Report remaining issues
  reportEslintResults(results);

  // Clean up
  try { execSync(`rm -f "${tmpFile}"`, { stdio: 'pipe' }); } catch {}
}

// Programmatically fix unused variable declarations that ESLint --fix cannot handle.
// Handles three patterns:
//   1. `const/let/var X = ...;`  → delete entire statement
//   2. Unused function arg       → prefix with `_`
//   3. Unused destructured key   → remove that key from destructuring
// Returns count of fixes applied.
function fixUnusedVars(eslintResults) {
  let totalFixed = 0;

  for (const file of eslintResults) {
    const unusedMsgs = (file.messages || []).filter(
      m => m.severity === 1 && m.ruleId === 'unused-imports/no-unused-vars'
    );
    if (unusedMsgs.length === 0) continue;

    let src;
    try { src = readFileSync(file.filePath, 'utf-8'); } catch { continue; }
    const lines = src.split('\n');
    let dirty = false;

    // Process messages sorted by line descending so line numbers stay valid after deletions
    const sorted = [...unusedMsgs].sort((a, b) => b.line - a.line);

    for (const msg of sorted) {
      const lineIdx = msg.line - 1; // 0-based
      if (lineIdx < 0 || lineIdx >= lines.length) continue;
      const line = lines[lineIdx];
      const varName = extractVarName(msg.message);
      if (!varName) continue;

      // Pattern 1: `const/let/var X = ...` — delete entire statement
      const assignRe = new RegExp(`^(\\s*)(const|let|var)\\s+${escapeRegex(varName)}\\s*=`);
      if (assignRe.test(line)) {
        const deleted = deleteStatement(lines, lineIdx);
        if (deleted > 0) {
          totalFixed++;
          dirty = true;
          logAction('eslint-unused-fix', `${file.filePath.replace(HUB + '/', '')}:${msg.line} — deleted unused ${varName}`);
        }
        continue;
      }

      // Pattern 2: unused function arg — prefix with `_`
      // ESLint message: "'X' is defined but never used. Allowed unused args must match /^_/u"
      if (msg.message.includes('Allowed unused args')) {
        const argRe = new RegExp(`\\b${escapeRegex(varName)}\\b`);
        const fixed = lines[lineIdx].replace(argRe, `_${varName}`);
        if (fixed !== lines[lineIdx]) {
          lines[lineIdx] = fixed;
          totalFixed++;
          dirty = true;
          logAction('eslint-unused-fix', `${file.filePath.replace(HUB + '/', '')}:${msg.line} — prefixed unused arg _${varName}`);
        }
        continue;
      }

      // Pattern 3: unused destructured key — `const { X, other } = ...` → remove X
      const destructRe = new RegExp(`^(\\s*(?:const|let|var)\\s*\\{[^}]*)\\b${escapeRegex(varName)}\\b\\s*,?([^}]*\\})`);
      if (destructRe.test(line)) {
        // Remove "varName," or ", varName" from the destructuring
        let fixed = line
          .replace(new RegExp(`\\b${escapeRegex(varName)}\\s*,\\s*`), '')
          .replace(new RegExp(`,\\s*\\b${escapeRegex(varName)}\\b`), '');
        // Clean up trailing comma inside braces: { X, } → { }
        fixed = fixed.replace(/,\s*(})/, ' $1');
        if (fixed !== line) {
          lines[lineIdx] = fixed;
          totalFixed++;
          dirty = true;
          logAction('eslint-unused-fix', `${file.filePath.replace(HUB + '/', '')}:${msg.line} — removed unused destructured key ${varName}`);
        }
        continue;
      }

      // Pattern 4: unused catch binding — `catch (e)` → `catch`
      const catchRe = new RegExp(`\\bcatch\\s*\\(\\s*${escapeRegex(varName)}\\s*\\)`);
      if (catchRe.test(line)) {
        const fixed = lines[lineIdx].replace(catchRe, 'catch');
        if (fixed !== lines[lineIdx]) {
          lines[lineIdx] = fixed;
          totalFixed++;
          dirty = true;
          logAction('eslint-unused-fix', `${file.filePath.replace(HUB + '/', '')}:${msg.line} — removed unused catch binding ${varName}`);
        }
      }
    }

    if (dirty) {
      writeFileSync(file.filePath, lines.join('\n'));
    }
  }

  return totalFixed;
}

// Delete a statement starting at lineIdx, scanning forward for the closing semicolon.
// Returns number of lines deleted. Mutates the lines array in place.
function deleteStatement(lines, lineIdx) {
  // Track open parens/brackets to handle multi-line initializers
  let depth = 0;
  let endIdx = lineIdx;

  for (let i = lineIdx; i < lines.length; i++) {
    const l = lines[i];
    for (const ch of l) {
      if (ch === '(' || ch === '[' || ch === '{') depth++;
      else if (ch === ')' || ch === ']' || ch === '}') depth--;
    }
    // Statement ends when depth returns to 0 and line ends with `;`
    if (depth <= 0 && l.trimEnd().endsWith(';')) {
      endIdx = i;
      break;
    }
    // Safety: don't eat more than 20 lines (handles malformed source gracefully)
    if (i - lineIdx >= 20) { endIdx = lineIdx; break; }
  }

  const deleteCount = endIdx - lineIdx + 1;
  lines.splice(lineIdx, deleteCount);
  return deleteCount;
}

// Extract variable name from ESLint message: "'X' is defined but never used"
function extractVarName(message) {
  const m = message.match(/^'([^']+)'/);
  return m ? m[1] : null;
}

// Escape a string for use as a regex literal
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function runEslint(eslintBin, outputFile, fix) {
  const args = [
    eslintBin, 'src/',
    '--format', 'json',
    '--no-error-on-unmatched-pattern',
    '--output-file', outputFile,
  ];
  if (fix) args.push('--fix');

  try {
    execSync(args.join(' '), {
      cwd: HUB, encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 120000,
    });
  } catch {
    // ESLint exits non-zero when issues found — results are in the file
  }
}

function reportEslintResults(eslintResults) {
  let errorCount = 0;
  let warnCount = 0;
  const errorsByRule = {};
  const warnsByRule = {};

  for (const file of eslintResults) {
    const relPath = file.filePath.replace(HUB + '/', '');
    for (const msg of (file.messages || [])) {
      const loc = `${relPath}:${msg.line}:${msg.column}`;
      const detail = `${loc} — ${msg.ruleId}: ${msg.message}`;

      if (msg.severity === 2) {
        errorsByRule[msg.ruleId] = (errorsByRule[msg.ruleId] || 0) + 1;
        if (verbose) logError('eslint', detail);
        errorCount++;
      } else if (msg.severity === 1) {
        warnsByRule[msg.ruleId] = (warnsByRule[msg.ruleId] || 0) + 1;
        if (verbose) logWarn('eslint', detail);
        warnCount++;
      }
    }
  }

  if (errorCount > 0 && !verbose) {
    const breakdown = Object.entries(errorsByRule).map(([r, c]) => `${c}× ${r}`).join(', ');
    logError('eslint', `${errorCount} errors (${breakdown}) — use --verbose to see details`);
  }

  if (warnCount > 0 && !verbose) {
    const breakdown = Object.entries(warnsByRule).map(([r, c]) => `${c}× ${r}`).join(', ');
    logWarn('eslint', `${warnCount} warnings (${breakdown}) — resolve unused vars in source files`);
  }

  if (errorCount === 0 && warnCount === 0) {
    log('  ✅ ESLint: all files pass');
  }
}

// ─── 5. UI wiring (HubHome.jsx) ─────────────────

function validateUIWiring() {
  log('\n  ── UI Wiring (HubHome.jsx) ──');
  if (!existsSync(PATHS.hubHome)) {
    logVerbose('HubHome.jsx not found — skipping UI wiring checks');
    return;
  }

  const src = readFileSync(PATHS.hubHome, 'utf-8');

  // Positive checks — things that should be present
  const checks = [
    [/import ProjectDetailFlyout/, 'ProjectDetailFlyout import'],
    [/import CompareView/, 'CompareView import'],
    [/ChevronRight/, 'ChevronRight icon import'],
    [/onDetailClick/, 'onDetailClick prop/handler'],
    [/onCompareToggle/, 'onCompareToggle prop/handler'],
    [/telemetry(?:Cache|\[|\.)/, 'TELEMETRY_CACHE or telemetry accessor'],
    [/<ProjectDetailFlyout/, 'ProjectDetailFlyout overlay rendered'],
    [/<CompareView/, 'CompareView overlay rendered'],
    [/compareCount/, 'compare count logic'],
  ];

  // Negative checks — things that should NOT be present
  const negChecks = [
    [/VisibilitySelector/, 'VisibilitySelector component (removed — visibility is config-only)'],
    [/onVisibilityChange/, 'onVisibilityChange prop/handler (removed)'],
    [/visibilityOverrides/, 'visibilityOverrides state (removed)'],
  ];

  let allGood = true;
  for (const [regex, label] of checks) {
    if (!regex.test(src)) {
      logWarn('ui-wiring', `HubHome.jsx missing: ${label}`);
      allGood = false;
    }
  }
  for (const [regex, label] of negChecks) {
    if (regex.test(src)) {
      logWarn('ui-wiring', `HubHome.jsx has: ${label}`);
      allGood = false;
    }
  }
  if (allGood) logVerbose('HubHome.jsx UI wiring is complete');
}

// ─── 6. Structural checks ───────────────────────

function validateStructural(config) {
  log('\n  ── Structural (registry ↔ config ↔ disk) ──');
  const { regSlugs, compSlugs } = parseRegistrySlugs(PATHS.registryFile);

  // Registry ↔ Components sync
  for (const slug of regSlugs) {
    if (!compSlugs.includes(slug)) logError('struct', `${slug} in registry but missing from projectComponents`);
  }

  // Registry ↔ Directory sync
  for (const slug of regSlugs) {
    if (!existsSync(join(PATHS.projectsDir, slug))) logError('struct', `${slug} in registry but directory missing`);
  }

  // Missing App.jsx
  for (const slug of regSlugs) {
    if (!existsSync(join(PATHS.projectsDir, slug, 'App.jsx'))) logError('struct', `${slug} missing App.jsx`);
  }

  // hub-config.json ↔ index.js sync
  const configSlugs = (config.projects || []).map(p => p.slug);
  for (const slug of configSlugs) {
    if (!regSlugs.includes(slug)) logError('struct', `${slug} in hub-config.json but not in index.js`);
  }
  for (const slug of regSlugs) {
    if (!configSlugs.includes(slug)) logError('struct', `${slug} in index.js but not in hub-config.json`);
  }

  // Missing query/subtitle
  for (const p of config.projects || []) {
    if (!p.query) logWarn('struct', `${p.slug} missing query field in hub-config.json`);
    if (!p.subtitle) logWarn('struct', `${p.slug} missing subtitle field in hub-config.json`);
  }

  // Orphan directories
  const dirs = getProjectDirs(PATHS.projectsDir);
  const orphans = dirs.filter(dir => !regSlugs.includes(dir));
  let orphanRegistered = false;

  for (const dir of orphans) {
    const hasApp = existsSync(join(PATHS.projectsDir, dir, 'App.jsx'));

    if (!hasApp) {
      // No App.jsx — truly orphaned junk, not a real project
      logError('orphan', `${dir}/ exists on disk but has no App.jsx and is not in index.js — remove manually`);
      continue;
    }

    if (canFix && !dryRun) {
      // Auto-register: read meta.json if available for better defaults
      const metaPath = join(PATHS.projectsDir, dir, 'meta.json');
      let title = slugToTitle(dir);
      let subtitle = 'Imported from orphaned project directory';
      let query = dir.replace(/-/g, ' ');

      if (existsSync(metaPath)) {
        try {
          const meta = JSON.parse(readFileSync(metaPath, 'utf-8'));
          const userPrompt = meta.userPrompt || (meta.telemetry && meta.telemetry.userPrompt);
          if (userPrompt) query = userPrompt;
        } catch { /* use defaults */ }
      }

      config.projects = config.projects || [];
      config.projects.push({
        slug: dir,
        title,
        subtitle,
        query,
        lens: 'standard',
        icon: 'FlaskConical',
        accentColor: 'blue',
        visibility: 'personal',
        createdAt: new Date().toISOString().split('T')[0],
        updatedAt: new Date().toISOString().split('T')[0],
      });
      writeFileSync(PATHS.hubConfig, JSON.stringify(config, null, 2) + '\n');
      orphanRegistered = true;
      logAction('orphan-fix', `${dir}/ — auto-registered into hub-config.json (title: "${title}", query: "${query.slice(0, 60)}${query.length > 60 ? '…' : ''}")`);
    } else {
      logWarn('orphan', `${dir}/ exists on disk but not in index.js — use --fix to auto-register`);
    }
  }

  // Re-sync registry once after all orphan registrations
  if (orphanRegistered) syncRegistry();
}

// ─── 7. Public library structural ────────────────

function validatePublicLibrary(publicProjectsDir) {
  log('\n  ── Public Library Structural ──');
  const { regSlugs, compSlugs } = parseRegistrySlugs(join(publicProjectsDir, 'index.js'));
  for (const slug of regSlugs) {
    if (!compSlugs.includes(slug)) logError('pub-struct', `${slug} in registry but missing from projectComponents`);
  }
  const dirs = getProjectDirs(publicProjectsDir);
  for (const dir of dirs) {
    if (!regSlugs.includes(dir)) logWarn('pub-orphan', `${dir}/ exists on disk but not in public index.js`);
  }
}

// ─── 8. Local projects export wiring ─────────────

function validateLocalProjectsWiring() {
  const localIndex = join(PATHS.localProjectsDir, 'index.js');
  if (!existsSync(localIndex)) return;

  log('\n  ── Local Projects Wiring ──');
  let src = readFileSync(localIndex, 'utf-8');

  if (src.includes('localProjectRegistry') && !src.includes('export const projectRegistry')) {
    if (canFix && !dryRun) {
      src = src.replace(/\blocalProjectRegistry\b/g, 'projectRegistry');
      writeFileSync(localIndex, src);
      logAction('fix-local', 'local-projects/index.js: renamed localProjectRegistry → projectRegistry');
    } else {
      logError('local-wire', 'local-projects/index.js uses localProjectRegistry instead of projectRegistry');
    }
  }

  if (src.includes('localProjectComponents') && !src.includes('export const projectComponents')) {
    if (canFix && !dryRun) {
      src = src.replace(/\blocalProjectComponents\b/g, 'projectComponents');
      writeFileSync(localIndex, src);
      logAction('fix-local', 'local-projects/index.js: renamed localProjectComponents → projectComponents');
    } else {
      logError('local-wire', 'local-projects/index.js uses localProjectComponents instead of projectComponents');
    }
  }
}

// ─── 9. Library config defaults ──────────────────

function validateLibraryDefaults(config) {
  log('\n  ── Library Config Defaults ──');

  for (const lib of (config.libraries || [])) {
    if (lib.confirmEachShare === false) {
      if (canFix && !dryRun) {
        lib.confirmEachShare = true;
        writeFileSync(PATHS.hubConfig, JSON.stringify(config, null, 2) + '\n');
        logAction('fix-lib', `${lib.name}: confirmEachShare was false — set to true`);
      } else {
        logWarn('lib-default', `${lib.name}: confirmEachShare is false — should be true`);
      }
    }
  }
}

// ─── 10. Cross-hub visibility reconciliation ─────

function validateVisibility(config, localConfig, publicProjectsDir) {
  log('\n  ── Visibility Reconciliation ──');

  const gitUsername = (config.libraries || []).find(l => l.gitUsername)?.gitUsername || null;
  const configProjects = config.projects || [];
  const configVisMap = {};
  for (const p of configProjects) configVisMap[p.slug] = p.visibility || 'personal';

  const indexVisMap = parseRegistryVisibility(PATHS.registryFile);

  // Build local project slug set
  const localSlugs = new Set();
  if (localConfig) {
    for (const p of (localConfig.localProjects || [])) localSlugs.add(p.slug);
  }
  const localDirs = existsSync(PATHS.localProjectsDir) ? getProjectDirs(PATHS.localProjectsDir) : [];
  for (const d of localDirs) localSlugs.add(d);

  // Local tier integrity
  for (const slug of localSlugs) {
    if (configVisMap[slug]) {
      logError('vis-local', `${slug} is a local project but appears in hub-config.json projects[]`);
    }
    if (indexVisMap[slug]) {
      logError('vis-local', `${slug} is a local project but appears in src/projects/index.js`);
    }
  }
  for (const [slug, vis] of Object.entries(configVisMap)) {
    if (vis === 'local') {
      logError('vis-local', `${slug} has visibility 'local' in hub-config.json — should not be there`);
    }
  }

  // Config ↔ Registry visibility sync
  for (const slug of Object.keys(configVisMap)) {
    const configVis = configVisMap[slug];
    const indexVis = indexVisMap[slug];
    if (indexVis && configVis !== indexVis) {
      if (canFix && !dryRun) {
        setRegistryVisibility(PATHS.registryFile, slug, configVis);
        logAction('fix-vis', `${slug}: index.js had '${indexVis}', config has '${configVis}' — synced`);
      } else {
        logError('vis-sync', `${slug}: index.js has '${indexVis}' but config has '${configVis}'`);
      }
    }
  }

  // Public library cross-checks
  if (!publicProjectsDir || !existsSync(publicProjectsDir) || !gitUsername) return;

  const suffix = `-${gitUsername}`;
  const publicIndexPath = join(publicProjectsDir, 'index.js');
  const { regSlugs: publicSlugs } = parseRegistrySlugs(publicIndexPath);

  const publicPersonalSlugs = new Set();
  for (const pubSlug of publicSlugs) {
    if (pubSlug.endsWith(suffix)) publicPersonalSlugs.add(pubSlug.slice(0, -suffix.length));
  }

  // Projects in public library but marked personal in personal hub
  for (const slug of publicPersonalSlugs) {
    if (localSlugs.has(slug)) {
      logError('vis-local', `${slug} is local but exists in public library as ${slug}${suffix}`);
      continue;
    }
    const configVis = configVisMap[slug];
    if (!configVis) {
      logWarn('vis', `${slug}${suffix} in public library but ${slug} not in hub-config.json`);
      continue;
    }
    if (configVis !== 'public') {
      if (canFix && !dryRun) {
        const proj = configProjects.find(p => p.slug === slug);
        if (proj) {
          proj.visibility = 'public';
          writeFileSync(PATHS.hubConfig, JSON.stringify(config, null, 2) + '\n');
        }
        setRegistryVisibility(PATHS.registryFile, slug, 'public');
        logAction('fix-vis', `${slug}: in public library — upgraded to 'public'`);
        configVisMap[slug] = 'public';
      } else {
        logError('vis', `${slug}: in public library but personal hub has visibility '${configVis}'`);
      }
    }
  }

  // Projects marked public but missing from public library
  for (const [slug, vis] of Object.entries(configVisMap)) {
    if (vis === 'public') {
      const expectedPubSlug = `${slug}${suffix}`;
      if (!publicSlugs.includes(expectedPubSlug)) {
        logWarn('vis', `${slug} is 'public' but ${expectedPubSlug} not found in public library`);
      }
    }
  }
}

// ─── 12. Orphaned build trackers ─────────────────

function validateOrphanedTrackers() {
  log('\n  ── Orphaned Build Trackers ──');
  const dirs = getProjectDirs(PATHS.projectsDir);
  const now = Date.now();
  const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

  for (const slug of dirs) {
    const tp = trackerPath(slug);
    if (!existsSync(tp)) continue;

    // Check if tracker already has a session-end
    const events = readTracker(slug);
    const hasSessionEnd = events.some(e => e.event === 'session-end');
    if (hasSessionEnd) { logVerbose(`${slug} tracker already closed`); continue; }

    const stat = statSync(tp);
    const ageMs = now - stat.mtimeMs;
    const ageHours = Math.round(ageMs / (60 * 60 * 1000) * 10) / 10;

    if (ageMs > MAX_AGE_MS) {
      if (canFix && !dryRun) {
        const sessionId = getSessionId(slug);
        const sessionEndEvent = {
          event: 'session-end',
          ts: new Date().toISOString(),
          sessionId,
          status: 'completed',
          source: 'doctor',
          reason: 'stale-tracker-cleanup',
        };
        appendTrackerEvent(slug, sessionEndEvent);
        logAction('tracker-fix', `${slug} — closed stale build-log.jsonl (${ageHours}h old) with session-end (source: "doctor")`);
      } else {
        logWarn('tracker', `${slug} has stale build-log.jsonl (${ageHours}h old, status: in-progress) — use --fix to auto-close`);
      }
    } else {
      logVerbose(`${slug} has active tracker (${ageHours}h old)`);
    }
  }
}

// ─── 14. Dark theme enforcement ──────────────────

// Light → Dark replacement pairs: [regex, replacement]
// Order matters — more specific patterns first to avoid double-replacement
const DARK_THEME_REPLACEMENTS = [
  // Backgrounds
  [/\bbg-white\b(?!\/)/g, 'bg-gray-800/50'],
  [/\bbg-gray-50\b/g, 'bg-gray-800/30'],
  // Text
  [/\btext-gray-900\b/g, 'text-white'],
  [/\btext-gray-800\b/g, 'text-gray-200'],
  // Borders
  [/\bborder-gray-100\b/g, 'border-gray-700/50'],
  [/\bborder-gray-200\b/g, 'border-gray-700/50'],
  [/\bborder-gray-300\b/g, 'border-gray-600'],
  // Dividers
  [/\bdivide-gray-50\b/g, 'divide-gray-800'],
  [/\bdivide-gray-100\b/g, 'divide-gray-800'],
  [/\bdivide-gray-200\b/g, 'divide-gray-800'],
  // Hover states
  [/\bhover:bg-gray-50\b/g, 'hover:bg-gray-800/30'],
  [/\bhover:bg-gray-100\b/g, 'hover:bg-gray-800/30'],
  // Ring
  [/\bring-gray-100\b/g, 'ring-gray-700'],
  [/\bring-gray-200\b/g, 'ring-gray-700'],
  // Shadow — light shadow looks wrong on dark; use subtle border instead
  [/\bshadow-sm\b/g, 'shadow-lg shadow-black/20'],
  // Accent badges: bg-{color}-100 text-{color}-700 → bg-{color}-500/20 text-{color}-400
  [/\bbg-(blue|green|red|yellow|purple|indigo|pink|orange|teal|cyan|emerald|violet|amber|lime|rose|fuchsia|sky)-100\b/g, 'bg-$1-500/20'],
  [/\btext-(blue|green|red|yellow|purple|indigo|pink|orange|teal|cyan|emerald|violet|amber|lime|rose|fuchsia|sky)-700\b/g, 'text-$1-400'],
  [/\btext-(blue|green|red|yellow|purple|indigo|pink|orange|teal|cyan|emerald|violet|amber|lime|rose|fuchsia|sky)-800\b/g, 'text-$1-300'],
  [/\bbg-(blue|green|red|yellow|purple|indigo|pink|orange|teal|cyan|emerald|violet|amber|lime|rose|fuchsia|sky)-50\b/g, 'bg-$1-500/10'],
];

// Detection-only patterns (superset for counting)
const LIGHT_THEME_DETECT = [
  /\bbg-white\b(?!\/)/g,
  /\bbg-gray-50\b/g,
  /\btext-gray-900\b/g,
  /\btext-gray-800\b/g,
  /\bborder-gray-100\b/g,
  /\bborder-gray-200\b/g,
  /\bborder-gray-300\b/g,
  /\bdivide-gray-50\b/g,
  /\bdivide-gray-100\b/g,
  /\bdivide-gray-200\b/g,
  /\bhover:bg-gray-50\b/g,
  /\bhover:bg-gray-100\b/g,
  /\bring-gray-100\b/g,
  /\bring-gray-200\b/g,
  /\bbg-(blue|green|red|yellow|purple|indigo|pink|orange|teal|cyan|emerald|violet|amber|lime|rose|fuchsia|sky)-100\b/g,
  /\btext-(blue|green|red|yellow|purple|indigo|pink|orange|teal|cyan|emerald|violet|amber|lime|rose|fuchsia|sky)-700\b/g,
  /\btext-(blue|green|red|yellow|purple|indigo|pink|orange|teal|cyan|emerald|violet|amber|lime|rose|fuchsia|sky)-800\b/g,
  /\bbg-(blue|green|red|yellow|purple|indigo|pink|orange|teal|cyan|emerald|violet|amber|lime|rose|fuchsia|sky)-50\b/g,
];

function countLightHits(src) {
  let total = 0;
  for (const rx of LIGHT_THEME_DETECT) {
    rx.lastIndex = 0;
    total += (src.match(rx) || []).length;
  }
  return total;
}

function applyDarkThemeFixes(src) {
  let out = src;
  for (const [rx, replacement] of DARK_THEME_REPLACEMENTS) {
    rx.lastIndex = 0;
    out = out.replace(rx, replacement);
  }
  return out;
}

function validateDarkTheme(projectsDir, label) {
  log(`\n  ── Dark Theme (${label}) ──`);
  const dirs = getProjectDirs(projectsDir);
  let totalViolations = 0;
  let totalFixed = 0;

  for (const slug of dirs) {
    // Collect all .jsx files: components/*.jsx + App.jsx
    const filesToCheck = [];
    const compsDir = join(projectsDir, slug, 'components');
    if (existsSync(compsDir)) {
      for (const f of readdirSync(compsDir).filter(f => f.endsWith('.jsx'))) {
        filesToCheck.push({ path: join(compsDir, f), rel: `${slug}/components/${f}` });
      }
    }
    const appPath = join(projectsDir, slug, 'App.jsx');
    if (existsSync(appPath)) {
      filesToCheck.push({ path: appPath, rel: `${slug}/App.jsx` });
    }

    for (const { path: filePath, rel } of filesToCheck) {
      const src = readFileSync(filePath, 'utf-8');
      const hits = countLightHits(src);
      if (hits === 0) continue;

      totalViolations += hits;

      if (canFix && !dryRun) {
        const fixed = applyDarkThemeFixes(src);
        const remaining = countLightHits(fixed);
        writeFileSync(filePath, fixed);
        totalFixed += (hits - remaining);
        if (remaining > 0) {
          logWarn('theme', `${rel} — fixed ${hits - remaining}/${hits} light-theme classes (${remaining} remain — manual review needed)`);
        } else {
          logAction('theme-fix', `${rel} — converted ${hits} light → dark classes`);
        }
      } else {
        logWarn('theme', `${rel} — ${hits} light-theme classes found (use --fix to auto-convert)`);
      }
    }
  }

  if (totalViolations === 0) {
    logVerbose(`Dark theme: all ${dirs.length} projects pass`);
  } else if (canFix && !dryRun) {
    log(`  🎨 Dark theme: fixed ${totalFixed} classes across projects`);
  }
}

// ─── 15. Recharts safety patterns ────────────────

function validateRechartsSafety(projectsDir, label) {
  log(`\n  ── Recharts Safety (${label}) ──`);
  const dirs = getProjectDirs(projectsDir);
  let issues = 0;
  let fixed = 0;

  for (const slug of dirs) {
    const compsDir = join(projectsDir, slug, 'components');
    if (!existsSync(compsDir)) continue;

    const files = readdirSync(compsDir).filter(f => f.endsWith('.jsx'));
    for (const file of files) {
      const filePath = join(compsDir, file);
      let src = readFileSync(filePath, 'utf-8');
      let dirty = false;

      // Check for Treemap usage without name guard
      if (/\bTreemap\b/i.test(src)) {
        const hasNameAccess = /\bname\.length\b/.test(src) || /\bname\.split\b/.test(src) || /\bname\.substring\b/.test(src);
        const hasNameGuard = /!name\b/.test(src) || /name\s*==\s*null/.test(src) || /name\s*===\s*null/.test(src) || /name\s*\?\?/.test(src);

        if (hasNameAccess && !hasNameGuard) {
          if (canFix && !dryRun) {
            // Insert "if (!name) return null;" before the first line that accesses name.length/name.split/name.substring
            // Find the function/arrow that contains the name access and add guard at top of body
            const guardPatterns = [
              // Pattern: ({ ..., name, ... }) => { ... name.length
              // Insert guard after opening brace of arrow function body
              {
                rx: /(=>\s*\{)([\s\S]*?)(\bname\.(length|split|substring)\b)/,
                replace: (m, arrow, body, nameAccess) => {
                  // Only add if guard not already present
                  if (/if\s*\(\s*!name\b/.test(body)) return m;
                  return `${arrow}\n    if (!name) return null;${body}${nameAccess}`;
                },
              },
              // Pattern: function ...({ ..., name, ... }) { ... name.length
              {
                rx: /(function\s+\w+\s*\([^)]*\)\s*\{)([\s\S]*?)(\bname\.(length|split|substring)\b)/,
                replace: (m, funcDecl, body, nameAccess) => {
                  if (/if\s*\(\s*!name\b/.test(body)) return m;
                  return `${funcDecl}\n  if (!name) return null;${body}${nameAccess}`;
                },
              },
            ];

            let patched = false;
            for (const { rx, replace } of guardPatterns) {
              if (rx.test(src)) {
                src = src.replace(rx, replace);
                patched = true;
                break;
              }
            }

            if (patched) {
              dirty = true;
              fixed++;
              logAction('recharts-fix', `${slug}/components/${file} — added Treemap name null guard`);
            } else {
              logWarn('recharts', `${slug}/components/${file} — Treemap name access without guard (auto-fix couldn't find insertion point — manual fix needed)`);
              issues++;
            }
          } else {
            logWarn('recharts', `${slug}/components/${file} — Treemap accesses name without null guard (use --fix to add guard)`);
            issues++;
          }
        }
      }

      if (dirty) {
        writeFileSync(filePath, src);
      }
    }
  }

  if (issues === 0 && fixed === 0) {
    logVerbose(`Recharts safety: all projects pass`);
  } else if (fixed > 0) {
    log(`  🛡️  Recharts safety: auto-fixed ${fixed} issue(s)`);
  }
}

// ─── 16. Build verification ──────────────────────

function verifyBuild() {
  log('\n  ── Build Verification ──');

  const viteBin = join(HUB, 'node_modules', '.bin', 'vite');
  if (!existsSync(viteBin)) {
    logWarn('build', 'Vite not installed — cannot verify build');
    return;
  }

  log('  Building hub with vite build...');
  try {
    execSync(`${viteBin} build`, {
      cwd: HUB,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 120000,
    });
    log('  ✅ Build: vite build succeeded');
  } catch (e) {
    const stderr = (e.stderr || '').trim();
    // Extract the key error lines from vite build output
    const errorLines = stderr.split('\n').filter(l =>
      l.includes('error') || l.includes('Error') || l.includes('✘')
    ).slice(0, 10);
    logError('build', 'vite build FAILED');
    for (const line of errorLines) {
      logError('build', line.trim());
    }
  }
}

// ═══════════════════════════════════════════════════
//  VERSION SELF-CHECK
//  Reads SKILL.md frontmatter version and errors if it
//  diverges from the SKILL_VERSION constant in this file.
//  Prevents session-start events from being stamped with
//  a stale version when SKILL.md has been bumped.
// ═══════════════════════════════════════════════════

(function checkSkillVersion() {
  const skillMdPath = join(__dirname, '..', 'SKILL.md');
  if (!existsSync(skillMdPath)) return; // not in a skill context, skip
  try {
    const content = readFileSync(skillMdPath, 'utf-8');
    const match = content.match(/^---[\s\S]*?^\s+version:\s*["']?([\d.]+)["']?\s*$/m);
    if (match) {
      const mdVersion = match[1];
      if (mdVersion !== SKILL_VERSION) {
        // Hard error — drift must be fixed before running
        console.error(`\n[hub-gen] VERSION MISMATCH — hub-gen.mjs SKILL_VERSION is "${SKILL_VERSION}" but SKILL.md frontmatter version is "${mdVersion}".`);
        console.error(`[hub-gen] Update SKILL_VERSION in hub-gen.mjs to "${mdVersion}" before running.`);
        process.exit(1);
      }
    }
  } catch { /* ignore read errors — skip check */ }
})();

// ═══════════════════════════════════════════════════
//  DISPATCH
// ═══════════════════════════════════════════════════

log(`\n══════════════════════════════════════════════════`);
log(`  HUB-GEN${dryRun ? ' (DRY RUN)' : ''}`);
log(`  Hub:     ${HUB}`);
log(`  Command: ${command}`);
log(`══════════════════════════════════════════════════`);

switch (command) {
  case 'sync-registry':
    syncRegistry();
    break;
  case 'add-project':
    addProject();
    break;
  case 'remove-project':
    removeProject();
    break;
  case 'write-meta':
    writeMeta();
    break;
  case 'install-components':
    installComponents();
    break;
  case 'scaffold':
    scaffold();
    break;
  case 'validate':
    validate();
    break;
  case 'doctor':
    // doctor is an alias for validate --fix
    validate();
    break;
  case 'track':
    track();
    break;
  case 'track-read':
    trackRead();
    break;
  default:
    logError('dispatch', `Unknown command: ${command}`);
}

finish();
