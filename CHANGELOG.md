# Changelog

All notable changes to research-visualizer are documented here.

---

## [8.14.1] — 2026-03-07

**Fix:** Regression in public library telemetry introduced in v8.13 — library share status was not correctly recorded in `meta.json` after the path-anchoring refactor.

---

## [8.14] — 2026-03-06

**Zero-Warning Validate Gate**

- `validate --check` now exits with code 2 on warnings (previously only errors caused non-zero exit)
- Phase 7 PRESENT enforces a zero-warning gate: after `--fix`, re-run `validate --check`; exit 0 = clean, exit 2 = warnings remain (run `doctor` then re-validate)
- Prevents projects with suppressed warnings from entering the hub

---

## [8.13] — 2026-03-06

**Skill Installation Hardening**

- Path anchoring: `SKILL_ROOT` is now resolved relative to `SKILL.md` location, not the working directory — fixes breakage when invoked from outside the skill directory
- Template scaffold: `scaffold --init` copies updated scaffold templates on every run, keeping hub scaffold files in sync with the skill version
- Install-scope config: pointer `config.json` is now written relative to the skill root (works for both global and workspace installs)

---

## [8.12] — 2026-02-25

**Lower-Model Reliability Improvements**

- Track batching rule: all `track` calls at a phase boundary must be in a single `run_command` (reduces partial-phase telemetry)
- Dev server idempotency: `lsof` check before `npm run dev` prevents duplicate server instances
- Model null handling: `write-meta` accepts `null` for `model` field when runtime identifier is unavailable

---

## [8.11] — 2026-02-25

**Bug Fix + Prerequisites Documentation**

- Fixed `add-project` subdirectory bug where nested project paths were written incorrectly
- Added Node.js prerequisites and version check to README and `first-time-setup.md`
- Node 18 EOL warning added to setup flow; odd-version warning added for Current releases

---

## [8.10] — 2026-02-24

**Real-Time Build Tracking**

- `build-log.jsonl` records phase start/end timestamps during every run
- Session timeline visualization in the hub's project detail flyout
- `write-meta` reads build log to compute verified phase timing (`timingSource: "verified"`)
- Skip timing opt-out: user can say "skip timing" at any point to disable phase tracking for the session

---

## [8.0] — 2026-02-23

**hub-gen.mjs — Deterministic Build Tool**

Major architectural shift: structural hub operations moved from AI judgment to a deterministic Node.js script.

- `add-project` — creates project directory, `App.jsx`, updates config and registry
- `install-components` — copies shared components (GlossaryTerm, CustomTooltip, InsightCallout)
- `validate --fix --build --json` — 13-category validation with auto-fix and Vite build check
- `sync-registry` — regenerates `src/projects/index.js` from hub-config.json
- `write-meta` — writes telemetry with timing, model, and session metadata
- `track` — records phase boundary events to build log
- `scaffold --init` — full hub scaffolding + pointer config creation in one command
- AI now writes only creative content (components, data files); all structural files are generated

---

## [7.2.2] — 2026-02-19

**Doc Accuracy Pass**

Synced all spec files with working hub state — corrected stale references and inaccurate field descriptions that had drifted from the actual implementation.

---

## [7.2.1] — 2026-02-14

**Sacred vs Regenerable File Classification**

Added explicit classification of hub files into "sacred" (user research data — never overwritten) and "regenerable" (scaffold output — skill can rebuild from templates). Documented in `hub-architecture.md`.

---

## [7.2] — 2026-02-14

**Glossary UX Redesign**

- Percentage-based density rules: `terms = max(3, floor(wordCount / 250))`, max 2 per section, never two in the same sentence
- Hover tooltip redesigned for readability
- Glossary term priority order: Acronyms → Jargon → Technical → Tribal

---

## [7.1] — 2026-02-14

**Phase 6B: Key Term Glossary (ENRICH)**

- New post-build phase that wraps domain/technical terms in interactive `<GlossaryTerm>` components
- Each term gets a definition and a research prompt for deeper exploration
- Glossary enrichment is on by default; togglable via `hub-config.json` `glossaryEnrichment` flag
- Telemetry tracks glossary term count per project

---

## [7.0] — 2026-02-13

**Extension Architecture + Collections**

- Pluggable extension system: extensions live in `extensions/<slug>/EXTENSION.md` with YAML frontmatter and phase-specific instruction blocks
- Two output modes: **bespoke** (unique React component tree per run) and **template** (shared component + JSON data files, scales to 10K+ items)
- Collections architecture for template-mode: `manifest.json`, `schema.json`, `items/*.json`
- Product/Purchase Comparison extension shipped as first built-in extension
- Telemetry extraction moved to dedicated `telemetryUtils.js`

---

## [6.4] — 2026-02-13

**Telemetry Detail Flyout + Compare Tool**

- Project detail flyout in hub UI with phase timing, token usage, and quality fields
- Compare view: side-by-side project comparison
- Three new telemetry quality fields: `dataQuality`, `citationCount`, `taxonomyDepth`

---

## [6.3] — 2026-02-11

**Three-Tier Visibility System**

Replaced binary Share Lock with a three-tier model:

- `local` — never shared, not in git
- `personal` — in your hub git repo (default when `gitRepo` is set)
- `public` — contributed to a library

Visibility is set per-project at the Phase 3D checkpoint.

---

## [6.1] — 2026-02-10

**Telemetry Gate + Contribution Intent**

- Phase 7 now gates on `write-meta` completing successfully before git push
- Contribution intent captured at Phase 3D checkpoint (before research begins) rather than after build
- Render-once flow: browser preview opens only after validate passes

---

## [6.0] — 2026-02-10

**Two-Layer Portable Config Architecture**

- **Pointer config** (`config.json`, gitignored, machine-local): contains only `personalHubPath`
- **Portable config** (`hub-config.json`, git-synced): port, gitRepo, libraries, projects, telemetry
- **Machine-local Vite config** (`.local-config.json`, gitignored): library paths for Vite aliases
- Enables hub to sync across machines via git without exposing local paths

---

## [5.1] — 2026-02-10

**Hub Scaffold Templates + Public Library Sidebar**

- Hub scaffold templates extracted to `scripts/scaffold-templates/` — `scaffold --init` copies these verbatim
- Public library projects appear in hub sidebar under a separate "Library" section
- Back navigation added to project detail view

---

## [5.0] — 2026-02-10

**Public Library + Community Contributions**

- No-topic invocation: running the skill without a topic starts the hub (detection + dev server) and stops
- Community library: browse and contribute to a shared public hub via GitHub API
- Contribution flow: agent pushes via GitHub REST API to `agent-contributions` branch; CI validates and auto-merges

---

## [4.0] — 2026-02-09

**Research Hub Architecture**

All dashboards now live in a single persistent web app (the "Research Hub") instead of isolated Vite projects.

- One dev server, one port, no reinstalls per topic
- Project registry (`src/projects/index.js`) auto-generated from hub-config.json
- Project telemetry: every build records slug, title, duration, data quality tier, citation count

---

## [3.0] — 2026-02-09

**Product/Purchase Comparison Extension**

Specialized pipeline for product comparisons: trigger detection, structured comparison data model, side-by-side visualization layout.

---

## [2.1] — 2026-02-08

**agentskills.io Spec Compliance**

Restructured SKILL.md to conform to the agentskills.io specification: YAML frontmatter, phase labels, reference file separation, 500-line soft limit on main spec file.

---

## [2.0] — 2026-02-08

**Intelligent Autonomous Discovery**

- Subgroup discovery with 20% split threshold
- Standard Research Dimensions Framework
- Taxonomy discovery (cross-referenced, trimmed to 25–30 items)
- User checkpoint at Phase 3D before full research begins

---

## [1.0] — 2026-02-08

**Initial Release**

Deep research → interactive dashboard pipeline. Web search, data gathering, React dashboard generation, Recharts visualization.
