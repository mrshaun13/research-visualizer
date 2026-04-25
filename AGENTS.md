# AGENTS.md

## Project overview

The **research-visualizer** skill: captures user prompts, runs the deep-research pipeline, generates interactive dashboards, and scaffolds/maintains the hub repos that host them. Source of truth for the entire research artifact — including the React UI shipped to `research-hub` and any local hub.

## Key files

- `SKILL.md` — skill definition and pipeline phases (frontmatter + phased prose).
- `scripts/hub-gen.mjs` — build tooling (`scaffold`, `add-project`, `write-meta`, `validate`, `track`).
- `assets/hub-scaffold-templates.md` — source for all scaffolded hub files (`App.jsx`, `HubHome.jsx`, `ProjectDetailFlyout.jsx`, `CompareView.jsx`, `eslint.config.js`, `vite.config.js`, `package.json`, `index.html`, `src/projects/index.js`, etc.). Hub repos are downstream artifacts.
- `references/hub-architecture.md` — schemas for `hub-config.json` and `meta.json`.
- `extensions/` — pluggable per-domain pipeline augmentations.

## Editing SKILL.md

- Preserve YAML frontmatter (`name`, `description`, `license`, `compatibility`, `metadata.version`).
- Bump `metadata.version` on any behavioral change.
- Keep phase headings (`## Phase N: NAME`) and the pipeline diagram in sync.
- Track-block convention: every `> **Track**` block is exactly one `run_command`, with calls chained by `&&`.

## Editing scaffold templates

UI/UX changes to HubHome, the project detail flyout, compare view, registry rendering, etc. live in `assets/hub-scaffold-templates.md`, **not** in any hub repo. After edits, the skill's `scaffold` command regenerates files in the target hub. Treat hub repo source files as build output.

## Where to file concerns

| Concern | Repo |
|---|---|
| Pipeline behavior, prompt/telemetry capture, `meta.json` schema | `research-visualizer` (here) |
| Scaffolded UI (HubHome, flyout, compare, registry rendering) | `research-visualizer` (here, in `assets/hub-scaffold-templates.md`) |
| `hub-gen.mjs` commands, validation, scaffold logic | `research-visualizer` (here) |
| GitHub Actions for processing contributions, `CONTRIBUTING.md` | `research-hub` |

## Related repos

- `research-hub` — public library; hosts contributed research + contribution-processing CI
- `personal-research-hub` — private/local hub instance
