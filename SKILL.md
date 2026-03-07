---
name: research-visualizer
description: >
  Deep research on any topic and build an interactive statistical visualization dashboard.
  Use when the user asks to research a topic, visualize data, create a research dashboard,
  explore trends, compare populations, or analyze statistics across time periods or groups.
  Supports a pluggable extension system with two output modes: bespoke (unique React dashboards)
  and template (shared component + JSON data for high-volume structured reports).
  Extensions auto-detect from user prompts and augment the pipeline with specialized logic.
  Handles the full pipeline from research discovery through interactive React dashboard delivery.
license: MIT
compatibility: Requires internet access for web search and data fetching.
metadata:
  author: mrshaun13
  version: "8.14.1"
---

# Deep Research → Interactive Dashboard Pipeline

Takes a simple research topic from a user, autonomously discovers dimensions, metrics, subgroups, and taxonomies, then produces an interactive web dashboard.

**Extension System** — Specialized workflows (product comparisons, incident reviews, sprint analyses) are handled by pluggable extensions that auto-detect from user prompts and augment the pipeline. See [extensions/registry.md](extensions/registry.md).

```
ENVIRONMENT CHECK → INTERPRET → SURVEY → DISCOVER → RESEARCH → ANALYZE → BUILD → ENRICH → PRESENT
       ↓                ↓                     ↓                                ↓
  Hub exists?       Extension?         User Checkpoint                   Glossary (always on)
    ↓ no               ↓ yes
  FIRST-TIME SETUP  Extension Phase 1B
```

---

## Phase 0: ENVIRONMENT CHECK

See [hub-architecture.md](references/hub-architecture.md) for config schema, directory structure, and project registry.

### Shell Variables

`SKILL_ROOT` is the directory containing this SKILL.md file. Set once per session:

```bash
GEN="<skill-root>/scripts/hub-gen.mjs"
HUB=$(node -e "try{console.log(JSON.parse(require('fs').readFileSync('<skill-root>/config.json','utf-8')).personalHubPath)}catch{process.exit(1)}")
```

**Pre-check:** If `$GEN` does not exist, halt with: `hub-gen.mjs not found at $GEN — check skill installation.`

### Config (Two-Layer)

1. **Pointer config** (`<skill-root>/config.json`): Machine-local. Contains only `personalHubPath`. Written by `hub-gen.mjs scaffold --init`. Located relative to the skill's install directory (works for both global and workspace installs).
2. **Portable config** (`<personalHubPath>/hub-config.json`): Git-synced. Port, gitRepo, libraries, projects, telemetry.
3. **Machine-local vite config** (`<personalHubPath>/.local-config.json`): Gitignored. Library paths for Vite aliases.

### No-Topic Invocation

If invoked without a topic: run detection/setup, start dev server, open browser preview, **stop** — do NOT proceed to Phase 1.

### Detection

> **Track:** Derive slug (kebab-case) from topic immediately. Batch in one command:
> ```bash
> node $GEN $HUB track <slug> session-start 2>&1 | tail -1 && \
> node $GEN $HUB track <slug> phase-start environment 2>&1 | tail -1
> ```

1. Check pointer config exists
2. **If exists:** Read `personalHubPath` → read `hub-config.json` → `git pull` (stash if needed) → sync libraries (`git -C <localPath> pull` for each with `browseEnabled: true`) → check dev server on port → if no topic, start server + stop; if topic, run batch then → **Phase 1**:
   ```bash
   node $GEN $HUB track <slug> phase-end environment 2>&1 | tail -1 && \
   node $GEN $HUB track <slug> phase-start interpret 2>&1 | tail -1
   ```
3. **If not exists → [First-Time Setup](references/first-time-setup.md)** (runs ONCE per machine — clone or scaffold hub, configure libraries)

### Key Principles

- No feature depends on another. Zero GitHub setup → fully functional local hub.
- Phase 0 should take ~2 seconds when hub exists.
- See [hub-architecture.md § Telemetry](references/hub-architecture.md#telemetry-schema) for schema and formulas.

### Build Log (Optional)

Phase timing via `build-log.jsonl`. `write-meta` reads build log → computes timing → writes `session-end` → **preserves** the file as a permanent committed artifact. AI provides **zero timing data**.

**Opt-out:** Phase timing is on by default. User can say **"skip timing"** at any point to disable for the current project.
1. First track batch: run with `SafeToAutoRun: true`. Note to user: *"Phase timing enabled. Say **skip timing** to disable."*
2. Auto-run succeeds → no further prompts needed.
3. Manual approval required → remind on each: *"Say **skip timing** to stop these prompts."*
4. On skip → stop all `track` commands. At `write-meta`, pass `"phaseTiming": null`. `write-meta` will set `timingSource: "estimated"` automatically (no build log).

**When disabled:** Skip all `> **Track**` blocks throughout the phases.

**When enabled:**
- `track <slug> phase-start <phase>` / `phase-end <phase>` at every boundary.
- `track <slug> user-prompt discover checkpoint` before and `user-response discover checkpoint` after.
- **Every `> Track` block is exactly ONE `run_command`. Chain all calls with `&&`. This is not optional.**
- `$GEN` and `$HUB` are set in the Shell Variables block above; up to 6 track calls per command.
```bash
node $GEN $HUB track <slug> phase-end <A> 2>&1 | tail -1 && \
node $GEN $HUB track <slug> phase-start <B> 2>&1 | tail -1 && \
node $GEN $HUB track <slug> phase-end <B> 2>&1 | tail -1 && \
node $GEN $HUB track <slug> phase-start <C> 2>&1 | tail -1
```
- Always set `SafeToAutoRun: true` on `track` commands. No other `hub-gen.mjs` subcommands qualify.
- When timing is enabled, all 9 phases (`environment`, `interpret`, `survey`, `discover`, `research`, `analyze`, `build`, `enrich`, `present`) must have both `phase-start` and `phase-end` events.

Derive slug in Phase 1 (kebab-case, same as `add-project`). For resumed sessions: `track-read <slug> --json`. See [hub-architecture.md § Build Log](references/hub-architecture.md#build-log-v81) for the full event table.

---

## Phase 1: INTERPRET — Understand Intent

> **Track:** Batched with `phase-end environment` from Phase 0 (no separate command needed if chained).

Parse natural language into research parameters:
1. **Core topic** — what is being studied?
2. **Implied populations** — map casual references to researchable groups
3. **Time scope** — temporal boundaries (do NOT choose segmentation yet)
4. **Research intent** — trends? comparison? impact analysis?
5. **Research lenses** — Population (demographics, health) · Behavior (prevalence, outcomes) · Industry (market, revenue) · Culture (shifts, media). Most topics combine 2-3.

### Extension Detection

Scan prompt against [extensions/registry.md](extensions/registry.md) triggers. If matched, load `EXTENSION.md` — it may inject Phase 1B before Phase 2.

**Output:** Topic, populations, time scope, intent, lenses, active extension. → Phase 2.

> **Track (batch):**
> ```bash
> node $GEN $HUB track <slug> phase-end interpret 2>&1 | tail -1 && \
> node $GEN $HUB track <slug> phase-start survey 2>&1 | tail -1
> ```

---

## Phase 2: SURVEY — Broad Landscape Scan

1. **3-5 broad searches:** "[topic] research overview", "[topic] major studies statistics", "[topic] trends data [time scope]", "[population] demographics research", "[topic] systematic review OR meta-analysis"
2. **Identify:** Major datasets, commonly measured dimensions, known subgroups, temporal inflection points, data availability
3. **Temporal segmentation** — pick the lens where data looks *different* on either side of the boundary: inflection-point eras > policy eras > technology eras > decades > generations

**Extension hook:** Load Phase 2 instructions if active.

> **Track (batch):**
> ```bash
> node $GEN $HUB track <slug> phase-end survey 2>&1 | tail -1 && \
> node $GEN $HUB track <slug> phase-start discover 2>&1 | tail -1
> ```

---

## Phase 3: DISCOVER — Dimension Discovery

### 3A: Subgroup Discovery
Split test: >20% difference → SPLIT; <20% → MERGE. Max 2 levels, 5 subgroups. See [subgroup-discovery.md](references/subgroup-discovery.md).

### 3B: Core Metrics
Apply Standard Research Dimensions Framework per lenses. See [research-dimensions.md](references/research-dimensions.md).

### 3C: Taxonomy Discovery
Search academic taxonomies, cross-reference 2-3 sources, trim to top 25-30. See [subgroup-discovery.md](references/subgroup-discovery.md).

**Extension hook:** May override 3A-3C.

### 3D: User Checkpoint

> **Track (batch — run immediately before presenting checkpoint):**
> ```bash
> node $GEN $HUB track <slug> phase-end discover 2>&1 | tail -1 && \
> node $GEN $HUB track <slug> user-prompt discover checkpoint 2>&1 | tail -1
> ```

Present research plan:
```
TOPIC · TIME AXIS · POPULATIONS · CORE METRICS · TAXONOMIES · PROPOSED SECTIONS · KEY DATA SOURCES
```

Ask: "Should I proceed, or adjust anything?"

**HARD RULE: ALWAYS wait for explicit user response. Do NOT auto-approve for benchmarks, speed tests, or any reason. Silence does not count as approval.**

After presenting, inform default visibility (personal if gitRepo exists, local if not). See [hub-visibility.md](references/hub-visibility.md). For libraries with `contributeEnabled: true`: if `confirmEachShare: true` (default), ask about sharing; if `confirmEachShare: false` (power-user pre-approval), auto-set `visibility: "public"` — no ask needed. Never push to a public library without user approval (either per-project ask or blanket pre-approval via `confirmEachShare: false`).

> **Track (batch — run immediately after user approves):**
> ```bash
> node $GEN $HUB track <slug> user-response discover checkpoint 2>&1 | tail -1 && \
> node $GEN $HUB track <slug> phase-start research 2>&1 | tail -1
> ```

---

## Phase 4: RESEARCH — Deep Data Gathering

1. For each metric × group × time period, search and extract statistics
2. Tag every data point with quality tier (T1 Gold → T4 Estimate)
3. Triangulate — 2-3 independent sources per data point
4. Fill gaps with T4 estimates, clearly marked
5. Gather taxonomy prevalence per group × period
6. Track all sources in structured citation list

See [subgroup-discovery.md](references/subgroup-discovery.md) for tier definitions. **Extension hook:** Load Phase 4 if active.

> **Track (batch):**
> ```bash
> node $GEN $HUB track <slug> phase-end research 2>&1 | tail -1 && \
> node $GEN $HUB track <slug> phase-start analyze 2>&1 | tail -1
> ```

---

## Phase 5: ANALYZE — Story & Visualization

Decisions made HERE, after seeing the data.

- **5A:** Key findings — surprises, group differences, trends, counterintuitive results → insight callouts
- **5B:** Auto-select chart types per [visualization-rules.md](references/visualization-rules.md)
- **5C:** Structure: Broad → Deep → Compare → Explore → Context → Sources. Each section: title + subtitle + 1-3 charts + insight callout.

**Extension hook:** Load Phase 5 if active.

> **Track (batch):**
> ```bash
> node $GEN $HUB track <slug> phase-end analyze 2>&1 | tail -1 && \
> node $GEN $HUB track <slug> phase-start build 2>&1 | tail -1
> ```

---

## Phase 6: BUILD — Into Research Hub

**Never create a standalone Vite project.** See [hub-architecture.md](references/hub-architecture.md), [build-templates.md](assets/build-templates.md), [collections-architecture.md](references/collections-architecture.md).

### Bespoke Mode (default)

**hub-gen.mjs handles structure; AI writes only creative content.**

1. Read pointer config → get `personalHubPath`
2. Read `hub-config.json` for port and project list
3. Generate slug (kebab-case)
4. **`node scripts/hub-gen.mjs <hub-path> add-project --json '<payload>'`** — payload: `slug`, `title`, `subtitle`, `query`, `lens`, `icon`, `accentColor`, `visibility`, `createdAt`, `sections`. Creates directory, App.jsx, updates config + registry. Parse `--json` output for `createdPaths`.
5. **AI writes creative content:**
   - `components/*.jsx` — sections with charts, callouts. Import shared components from `../../../components/`.
   - `data/*.js` — research data as ES module exports.
6. **`node scripts/hub-gen.mjs <hub-path> install-components`**
7. Start dev server if not already running (port from `hub-config.json`):
   ```bash
   lsof -i :<port> | grep -q LISTEN || npm run dev &
   ```
8. Open browser preview

> **Code hygiene rule:** Only declare a variable (`const`, `let`) if it is referenced in the JSX return value or passed to a child component. Do not leave computed values that are unused. If a value was computed for exploration but isn't needed in the final render, delete it before moving to the next component.

> **Atomic write groups:** Write files in three ordered batches to prevent Vite HMR from seeing partial project state:
> 1. All `data/` files (`researchData.js`, any JSON)
> 2. All `components/` files
> 3. `App.jsx` + registry update (`sync-registry`) + `hub-config.json` update

> **Track (batch):**
> ```bash
> node $GEN $HUB track <slug> phase-end build 2>&1 | tail -1 && \
> node $GEN $HUB track <slug> phase-start enrich 2>&1 | tail -1
> ```

#### Shared Component Reference

**Import path: `../../../components/`** — that's 3 levels up from `src/projects/<slug>/components/`. NOT 2.

| Component | Import | Props | Notes |
|-----------|--------|-------|-------|
| `InsightCallout` | `import InsightCallout from '../../../components/InsightCallout'` | `children`, `color` | Colors: `violet` (default), `amber`, `emerald`, `blue`, `red`, `cyan`, `orange`, `indigo`, `rose`, `teal`, `purple`. No `emoji`/`icon` prop. |
| `CustomTooltip` | `import CustomTooltip from '../../../components/CustomTooltip'` | Recharts `content` | `<Tooltip content={<CustomTooltip />} />` |
| `GlossaryTerm` | `import { GlossaryTerm } from '../../../components/GlossaryTerm'` | `term`, `glossary`, `children` | `term` must exactly match a glossaryTerms key. |

### Template Mode (extension-driven)

When extension has `output_mode: template` → produces JSON data file. See [collections-architecture.md](references/collections-architecture.md).

### Store Original Query

Always store user's original query in `hub-config.json` `query` field for hub UI display.

---

## Phase 6B: ENRICH — Key Term Glossary

Scan built project text, identify domain/technical terms a general audience wouldn't know, wrap in `<GlossaryTerm>`. Enabled by default (`glossaryEnrichment: true`).

**Density:** `terms = max(3, floor(wordCount / 250))`. Max 2 per section. Never two in same sentence.
**Priority:** Acronyms → Jargon → Technical → Tribal. Skip common words, proper nouns.

### Steps
1. Scan text in components (overview paragraphs, callouts, labels)
2. Rank by obscurity, apply density rules, distribute across sections
3. Generate definition + research prompt per term
4. Create `data/glossaryTerms.js` — `{ definition, researchPrompt }` per term
5. Wrap in components: `<GlossaryTerm term="X" glossary={glossaryTerms}>X</GlossaryTerm>`

### Enrich Guardrails

1. **JSX only.** Wraps go in `components/*.jsx` ONLY. NEVER in `data/*.js`.
2. **Key-match required.** `term="X"` must exactly match a `glossaryTerms.js` key. Verify before writing.
3. **Single-pass editing.** Plan ALL wraps first, execute in one `multi_edit` per file. No iterative fix passes.
4. **No invented props.** See Shared Component Reference above.

> **Track (batch):**
> ```bash
> node $GEN $HUB track <slug> phase-end enrich 2>&1 | tail -1 && \
> node $GEN $HUB track <slug> phase-start present 2>&1 | tail -1
> ```

---

## Phase 7: PRESENT — Validate & Deliver

**Steps 1-5 must complete before 6-9.**

1. **`node scripts/hub-gen.mjs <hub-path> validate --fix --build --json`** — 13 categories + vite build. Parse `summary.passed`.
   - **Zero-warning gate:** After `--fix`, re-run `node $GEN $HUB validate --check`. Exit code 0 = clean. Exit code 1 = errors (fix before proceeding). Exit code 2 = warnings remain (run `node $GEN $HUB doctor` then re-validate).
2. Fix remaining errors manually if any.
3. QA: charts render, tooltips work, findings match data, citations complete.
4. Extension QA if active.
4b. **If phase timing enabled:** `track <slug> phase-end present` — must run before `write-meta`.
> ```bash
> node $GEN $HUB track <slug> phase-end present 2>&1 | tail -1
> ```
5. **Telemetry GATE:** `node scripts/hub-gen.mjs <hub-path> write-meta <slug> '<json>'` — provide all required fields per [hub-architecture.md § Telemetry](references/hub-architecture.md#telemetry-fields). Missing fields = exit 1.
   - **`model`:** Use the exact model identifier if known (e.g. `"claude-sonnet-4-5"`). Use `null` if not retrievable — the card will not show it.
   - **If timing enabled:** DO provide `phaseTiming` estimates (tracker overrides with real values). `write-meta` sets `timingSource` automatically (`"verified"` if build log has `session-end`, `"estimated"` otherwise).
   - **If timing skipped:** Pass `"phaseTiming": null`. `write-meta` sets `timingSource: "estimated"` automatically.
6. **Git sync:** `git add -A` → `git commit` → `git push`
7. **Library share:** Only if `visibility: "public"`. Push via GitHub API per [hub-contribution.md](references/hub-contribution.md).
8. **Library sync:** `git -C <localPath> pull` for pushed libraries.
9. **Deliver:** Open browser preview using the port from `hub-config.json` (not any default). Verify port: `lsof -i :<port> | grep -q LISTEN && echo running || echo not running`. Summarize.

---

## Edge Cases

See [hub-architecture.md](references/hub-architecture.md#edge-cases--troubleshooting).
