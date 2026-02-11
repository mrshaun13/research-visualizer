---
name: research-visualizer
description: >
  Deep research on any topic and build an interactive statistical visualization dashboard.
  Use when the user asks to research a topic, visualize data, create a research dashboard,
  explore trends, compare populations, or analyze statistics across time periods or groups.
  Includes a Product/Purchase specialization that auto-detects when a user wants to compare
  products or make a buying decision, and scaffolds a comprehensive product comparison dashboard
  with specs, pricing, recommendations, purchase links, and data-driven analysis.
  Handles the full pipeline from research discovery through interactive React dashboard delivery.
license: MIT
compatibility: Requires internet access for web search and data fetching.
metadata:
  author: mrshaun13
  version: "6.1"
---

# Deep Research → Interactive Dashboard Pipeline

Takes a simple research topic from a user, autonomously discovers dimensions, metrics, subgroups, and taxonomies, then produces an interactive web dashboard.

**Specialization: Product Comparison** — When the user's intent is to compare products or make a purchase decision, the skill auto-detects this and activates a deeper product-specific template with standardized sections for specs, pricing, cost analysis, recommendations, purchase links, and more. See [product-comparison-template.md](references/product-comparison-template.md).

## Design Philosophy

**The user provides:** A topic in natural language (1-2 sentences).
**The agent handles:** Research scoping, subgroup discovery, metric identification, taxonomy compilation, data gathering, visualization selection, and dashboard construction.

## Pipeline

```
ENVIRONMENT CHECK → INTERPRET → SURVEY → DISCOVER → RESEARCH → ANALYZE → BUILD → PRESENT
       ↓                ↓                               ↓
  Hub exists?       Product lens?                User Checkpoint
    ↓ no               ↓ yes
  FIRST-TIME SETUP  PRODUCT CLASSIFY
                      (lifecycle, flags, user profile)
```

---

## Phase 0: ENVIRONMENT CHECK — Detect or Set Up Research Hub

Before any research begins, check whether the Research Hub is already installed. The hub is a single web application that hosts ALL research dashboards in one place, eliminating the need for multiple dev servers and installs.

See [hub-architecture.md](references/hub-architecture.md) for the complete config schema, directory structure, and project registry format.

### Config Architecture (Two-Layer)

The skill uses a **two-layer config** to make the entire setup portable across machines:

1. **Pointer config** (machine-local, `~/.codeium/windsurf/skills/research-visualizer/config.json`):
   - Contains ONLY `personalHubPath` — the absolute path to the user's personal hub repo on this machine.
   - This is the **installation detection marker**. If it exists, the hub has been set up on this machine.
   - Never committed to any repo.

2. **Portable config** (`<personalHubPath>/hub-config.json`, git-synced):
   - Contains everything else: port, gitRepo, libraries array, projects array, telemetry.
   - Committed to the personal hub repo — syncs across machines automatically via git.
   - The personal hub repo IS the portable unit: clone it on a new machine, point the skill at it, done.

3. **Machine-local vite config** (`<personalHubPath>/.local-config.json`, gitignored):
   - Contains machine-specific library paths for Vite aliases (e.g., where the public library is cloned locally).
   - Created by the skill during Phase 0 setup. Read by `vite.config.js` at dev server startup.
   - Supports multiple libraries via an array of `{ name, alias, localPath }` entries.

### No-Topic Invocation

If the user invokes the skill **without a research topic** (e.g., "start research hub", "open my research", "browse the library"):
- Run Detection and setup as normal (Phase 0, 0B, 0C as needed)
- Start the dev server if not running, open browser preview
- **Do NOT proceed to Phase 1** — the user just wants to browse. Inform them: "Your Research Hub is running. You can browse your local research and any configured libraries."

### Detection

1. **Check for pointer config:** `~/.codeium/windsurf/skills/research-visualizer/config.json`
2. **If pointer exists:**
   - Read `personalHubPath` from pointer
   - Read `hub-config.json` from `<personalHubPath>/hub-config.json` for all portable settings
   - **Git sync (personal):** If the hub has a `.git` remote, run `git pull` (stash first if uncommitted changes). Note if new projects were pulled.
   - **Library sync:** For each library in `hub-config.json` `libraries` array where `browseEnabled` is true, check if `.local-config.json` has a `localPath` for it. If so, run `git -C <localPath> pull` to fetch latest community research.
   - Check if Vite dev server is running on configured port (default 5180)
   - If no topic provided → start server if needed, open browser, stop here
   - If topic provided → **Skip to Phase 1**
3. **If pointer does NOT exist → First-Time Setup (Phase 0B)**

### Phase 0B: First-Time Setup

This runs ONCE per machine. The goal is to either clone an existing personal hub or scaffold a new one, then create the machine-local pointer.

1. **Inform the user immediately:**
   > "I see this is your first time running Research Visualizer on this machine. I'll set up a **Research Hub** — a single web app that will host all your research dashboards in one place. You'll never need multiple dev servers again."

2. **Ask about existing hub:**
   > "Do you have an existing personal Research Hub git repo from another machine? If so, I can clone it and you'll have all your previous research, settings, and library configs instantly. If not, I'll create a fresh one."

   - **If the user provides a git repo URL → Phase 0B-CLONE**
   - **If the user says no / skip → Phase 0B-SCAFFOLD**

#### Phase 0B-CLONE: Clone Existing Hub

1. **Ask for install location:** Default: `~/git/personal-research-hub/`
2. **Clone the repo:** `git clone <repo-url> <chosen-path>`
3. **Run `npm install`** in the cloned directory
4. **Read `hub-config.json`** from the cloned repo — this has all projects, library configs, and settings already.
5. **Create pointer config** at `~/.codeium/windsurf/skills/research-visualizer/config.json`:
   ```json
   { "personalHubPath": "<chosen-path>" }
   ```
6. **Create `.local-config.json`** in the hub directory — for each library in `hub-config.json` `libraries` array where `browseEnabled` is true, ask the user where the library is cloned (or offer to clone it). Populate the `libraries` array with `{ name, alias, localPath }` entries.
7. **Inform the user:** "Cloned your Research Hub with N existing projects and M library connections."
8. **Continue to Phase 0B-LIBRARIES.**

#### Phase 0B-SCAFFOLD: Create Fresh Hub

1. **Ask for hub location:** Default: `~/git/personal-research-hub/`
2. **Scaffold the hub app** — copy every file verbatim from [hub-scaffold-templates.md](references/hub-scaffold-templates.md). The `vite.config.js` template reads from `.local-config.json` dynamically (no hardcoded paths).
3. **Run `npm install`**
4. **Initialize git repo:** `git init`, `git branch -m main`, `.gitignore` (node_modules/, dist/, .DS_Store, *.local, .local-config.json). Ask about connecting a remote — if provided, push; if skipped, local only.
5. **Create `hub-config.json`** in the hub directory — set `version: "2.0"`, `port: 5180`, `gitRepo` (or null), empty `libraries` array, empty `projects` array.
6. **Create pointer config** at `~/.codeium/windsurf/skills/research-visualizer/config.json`:
   ```json
   { "personalHubPath": "<chosen-path>" }
   ```
7. **Create empty `.local-config.json`** in the hub directory: `{ "libraries": [] }`
8. **Continue to Phase 0B-LIBRARIES.**

### Phase 0B-LIBRARIES: Library Setup (One-Time Per Library)

**Skip if `hub-config.json` already has a non-empty `libraries` array.** This phase handles both browsing AND contributing for each library. Multiple libraries can be configured.

For each library the user wants to add (start with the default Community Research Hub):

1. **Ask about browsing:**
   > "Would you like to browse the **Community Research Hub**? Community-contributed dashboards you can explore alongside your own. No account needed — it's a public repo."

2. **If yes to browsing:**
   - Clone read-only: `git clone https://github.com/mrshaun13/research-hub.git <hubPath>/../research-hub` (or ask user for location)
   - Add library entry to `hub-config.json` `libraries` array with `browseEnabled: true`
   - Add entry to `.local-config.json` `libraries` array with `{ name, alias: "@public-library", localPath: "<clone-path>" }`
   - Run `npm install` in the library clone if needed

3. **Ask about contributing:**
   > "Would you also like to **contribute** your research back to this library? Zero effort after a one-time setup — your agent pushes via the GitHub API after each build."

4. **If yes to contributing:**
   - Capture `git config user.name` (for slug collision avoidance)
   - Ask for the contributor PAT (from the library maintainer). **Note:** The user does NOT need their own GitHub account or any git setup. The PAT is all that's needed — the agent uses the GitHub API directly.
   - Update the library entry in `hub-config.json`: set `contributeEnabled: true`, `token`, `gitUsername`, `branch: "agent-contributions"`

5. **If no to browsing:** Add library entry with `browseEnabled: false`. User can enable later.
6. **If no to contributing:** Set `contributeEnabled: false` in the library entry. User can opt in later.

7. **Ask if the user wants to add another library:**
   > "Do you have any other shared research libraries to connect? (You can always add more later.)"
   - If yes → repeat steps 1-6 for the new library
   - If no → continue

8. **Continue to Phase 1** (or stop here if no topic was provided).

### Backwards Compatibility

The skill works with **any combination** of these features:

| Personal Git Repo | Libraries | Contribution | What Works |
|---|---|---|---|
| ✗ | ✗ | ✗ | Local-only research. No sync, no browsing, no sharing. Fully functional. |
| ✓ | ✗ | ✗ | Personal research syncs across machines via git. No public library. |
| ✗ | ✓ (browse) | ✗ | Browse community research. Personal research is local-only. |
| ✓ | ✓ (browse) | ✗ | Full sync + browse community. No contributions. |
| ✗ | ✓ (browse) | ✓ | Browse + contribute. No personal git sync. Agent uses GitHub API to contribute (no local git needed). |
| ✓ | ✓ (browse) | ✓ | Full experience: sync, browse, contribute. |

**Key principle:** No feature depends on another. A user with zero GitHub setup gets a fully functional local research hub.

**Telemetry:** Initialize the telemetry object at the start of Phase 0. See [hub-architecture.md](references/hub-architecture.md#telemetry-schema) for the complete schema, capture timing, and formulas.

### Key Principle

Phase 0 should be **fast**. If the hub exists, it's a 2-second check (read pointer → read hub-config → git pull → go). If it's first-time, the setup conversation is brief and then research proceeds normally.

---

## Phase 1: INTERPRET — Understand Intent

Parse natural language into research parameters. No structured input required.

**Valid inputs:**
- "How has homeownership changed in America since the 1950s?"
- "Research the rise and fall of shopping malls in the US"
- "Compare remote work vs office work outcomes since COVID"
- "How has commercial aviation safety improved over time?"
- "I'm looking to buy a boat for weekend fishing" *(triggers Product/Purchase lens)*
- "Help me pick a good laptop for software development" *(triggers Product/Purchase lens)*
- "What's the best SUV for a family of 5?" *(triggers Product/Purchase lens)*

### Steps:

1. **Extract core topic** — what is being studied?
2. **Extract implied populations** — map casual references to researchable groups:
   - "shopping malls" → retail industry, consumers, commercial real estate (subgroups TBD)
   - "people as far back as the 50s" → population cohorts from ~1950 onward
3. **Extract time scope** — map to temporal boundaries (do NOT choose segmentation yet):
   - "over time" → full available historical range
   - "since the 60s" → 1960-present
4. **Extract research intent** — trends over time? group comparison? impact analysis?
5. **Classify into research lenses** (triggers automatic dimensions in Phase 3):
   - **Population lens** → demographics, health, economic, social
   - **Behavior lens** → prevalence, taxonomy, outcomes
   - **Industry lens** → market size, revenue, worker conditions
   - **Culture lens** → societal shifts over time, media, public opinion
   - **Product/Purchase lens** → product specs, pricing, brand comparison, value analysis, purchase recommendations
   - Most topics combine 2-3 lenses. The Product/Purchase lens is special — when detected, it activates Phase 1B and overrides much of the standard pipeline with product-specific scaffolding.

**Product/Purchase lens detection signals:**
- Explicit: "buy", "purchase", "looking for", "which should I get", "help me choose", "best [product] for"
- Implicit: mentions of brands, models, price ranges, product categories, "compare [products]"
- Context: any request where the end goal is selecting a product to acquire

**Output:** Topic, populations, time scope, intent, lenses. If Product/Purchase lens is detected, proceed to Phase 1B. Otherwise, proceed directly to Phase 2.

---

## Phase 1B: PRODUCT CLASSIFY *(Product/Purchase lens only)*

When the Product/Purchase lens is detected, classify the product BEFORE surveying. This classification drives which sections get built and how deep the analysis goes.

See [product-comparison-template.md](references/product-comparison-template.md) for the complete classification framework.

### Steps:

1. **Classify lifecycle tier:**
   - **Durable / Investment** (5+ years): vehicles, pro tools, appliances, HVAC, furniture, instruments
   - **Semi-Durable** (1–5 years): phones, laptops, cameras, mid-range tools, gaming consoles
   - **Consumable / Short-Life** (<1 year): compact tools, accessories, cables, budget items

2. **Set product characteristic flags:**
   - **Ecosystem Dependency** — requires batteries, subscriptions, or proprietary accessories?
   - **Multi-Use-Case** — serves 3+ distinct scenarios?
   - **High Feature Density** — 6+ boolean features differentiate products?
   - **Clear Market Tiers** — products span obvious quality/price tiers?
   - **Derived Metric Opportunity** — two specs combine into a meaningful ratio?
   - **Existing User Ecosystem** — user already owns compatible batteries/tools/platform?

3. **Extract user profile** (from prompt or reasonable inference):
   - Budget range, use intensity, experience level, key constraints, primary use case
   - If the user provides minimal info, assume the most common buyer profile and state assumptions in the Overview. The user can correct at the checkpoint.

4. **Pre-select dashboard sections** using the Section Selection Decision Tree in [product-comparison-template.md](references/product-comparison-template.md):
   - Universal sections (always): Overview, Spec Comparison, Recommendations, Sources
   - Conditional sections (based on flags): Cost Analysis/TCO, Features Matrix, Use Case Fit, Ecosystem Comparison, metric deep-dives
   - Target: 5–8 sections total

**Output:** Lifecycle tier, flags, user profile, pre-selected sections. Proceed to Phase 2.

---

## Phase 2: SURVEY — Broad Landscape Scan

Understand the research landscape before diving deep.

### Steps:

1. **Conduct 3-5 broad searches:**
   - "[topic] research overview"
   - "[topic] major studies statistics"
   - "[topic] trends data [time scope]"
   - "[population] demographics research"
   - "[topic] systematic review OR meta-analysis"

2. **Identify from results:**
   - Major studies and datasets that exist
   - Commonly measured dimensions
   - Known subgroups in existing research
   - Temporal inflection points
   - Data availability (rich vs sparse areas)

3. **Determine temporal segmentation** — choose the lens that reveals the most interesting story, not the most obvious one:
   - **Inflection-point eras** — segment around pivotal events, inventions, or crises that changed the trajectory (often the most narratively compelling)
   - **Policy/regulatory eras** — when laws, regulations, or institutional changes drove the shifts
   - **Technology eras** — when new technology created before/after discontinuities
   - **Decades** — neutral, works for any topic, good default when no clear inflection points exist
   - **Generations** — only when the research is explicitly about age-cohort identity or attitudes
   
   **Guiding principle:** The best segmentation is the one where the data looks *different* on either side of the boundary. If a timeline split doesn't reveal a meaningful change, it's the wrong split.

**Product/Purchase lens:** See [product-comparison-template.md](references/product-comparison-template.md#phase-2-additions-product-survey) for product-specific search patterns and segmentation.

**Output:** Major data sources, preliminary dimensions, temporal segmentation (or product segmentation for Product lens). Proceed to Phase 3.

---

## Phase 3: DISCOVER — Autonomous Dimension Discovery

This is where the skill becomes intelligent — discovering what the user would have had to specify manually.

### 3A: Subgroup Discovery

1. Start with broadest grouping from Phase 1
2. Search for: "types of [group]" OR "[group] subcategories"
3. For each candidate subgroup, apply the split test:
   - **>20% difference** on key metrics → SPLIT (different stories)
   - **<20% difference** across all metrics → MERGE (noise without insight)
4. Bounds: max 2 levels deep, max 5 subgroups per population

See [subgroup-discovery.md](references/subgroup-discovery.md) for the full decision matrix.

### 3B: Core Metric Identification

Apply the **Standard Research Dimensions Framework** based on lenses from Phase 1. Universal dimensions (temporal trends, demographics, baseline comparison) are ALWAYS included. Lens-specific dimensions are added automatically.

See [research-dimensions.md](references/research-dimensions.md) for the complete framework.

### 3C: Taxonomy Discovery

For each dimension with categorical subtypes:
1. Search for academic taxonomies and platform categorizations
2. Cross-reference 2-3 sources into unified list of 25-30 items
3. Rank by data availability, trim to top 25-30

See [subgroup-discovery.md](references/subgroup-discovery.md) for search templates.

### 3C-P: Product-Specific Discovery *(Product/Purchase lens only)*

When the Product/Purchase lens is active, replace or augment 3A-3C with product-specific discovery. The key steps:

1. **Discover product tiers/categories** — research how the market actually segments this product type (don't assume tiers)
2. **Discover 5-8 key differentiating specs** and **1-2 derived metrics** (ratios that combine specs into value insights)
3. **Discover brands**, use cases, ecosystem constraints, and price/value breakpoints
4. **Build product shortlist** — 8-20 products across the full price range (popular choices + hidden gems, 3+ brands, all tiers)
5. **Gather per-product data** — manufacturer specs, street prices with purchase URLs, review aggregates, expert reviews, community sentiment

See [product-comparison-template.md](references/product-comparison-template.md#phase-3-product-discovery) for the full 9-step discovery process with examples for each product category.

### 3D: User Checkpoint

Present a **Research Plan Summary** for lightweight approval:

**Standard research checkpoint:**
```
TOPIC: [interpreted topic]
TIME AXIS: [segmentation] — [periods]
POPULATIONS: [discovered groups and subgroups]
CORE METRICS: [auto-identified per lens]
TAXONOMIES: [Category]: [N items] each
PROPOSED SECTIONS: [~5-8 sections]
KEY DATA SOURCES: [major studies]
```

**Product comparison checkpoint:**
```
PRODUCT TYPE: [interpreted product]
LIFECYCLE: [Durable / Semi-Durable / Consumable]
YOUR PROFILE: [inferred user profile — budget, use case, experience]
PRODUCTS: [N] models across [N] brands
TIERS: [discovered tiers]
KEY SPECS: [5-8 differentiating specs identified]
DERIVED METRICS: [1-2 calculated ratios]
FLAGS: [Ecosystem ✓/✗] [Multi-Use ✓/✗] [Features Matrix ✓/✗] [TCO ✓/✗]
PROPOSED SECTIONS: [5-8 sections with names]
DATA SOURCES: [review sites, manufacturer sites, community sources]
```

Ask: "Here's what I found and plan to build. Should I proceed, or adjust anything?"

**Contribution intent:** If any library in `hub-config.json` has `contributeEnabled: true` AND `confirmEachShare: true`, also ask: *"Would you like to share this research with [library name] when it's done?"* Store the answer for Phase 7. If `confirmEachShare: false`, contribution intent is implicitly yes — do not ask.

This is the ONLY required user interaction between the initial prompt and the final dashboard.

---

## Phase 4: RESEARCH — Deep Data Gathering

Gather data for every cell in the dimension matrix.

1. **For each metric × group × time period**, search and extract statistics
2. **Tag every data point** with a quality tier (T1 Gold → T4 Estimate)
3. **Triangulate** — 2-3 independent sources per data point when possible
4. **Fill gaps** with informed estimates, clearly marked as T4
5. **For each taxonomy** — gather prevalence per group × period (produces heatmap matrices)
6. **Track all sources** in structured citation list

See [subgroup-discovery.md](references/subgroup-discovery.md) for data quality tier definitions.

**Product/Purchase lens:** See [product-comparison-template.md](references/product-comparison-template.md#phase-4-additions-product-data-gathering) for per-product data gathering, ecosystem data, and TCO components.

---

## Phase 5: ANALYZE — Data-Driven Story & Visualization

Visualization decisions are made HERE — after seeing the data, not before.

### 5A: Key Findings
For each dataset: most surprising finding, biggest group differences, clearest trends, counterintuitive results. These become insight callouts.

### 5B: Auto-Select Visualizations
Map each dataset to optimal chart type using deterministic rules (same data shape → same chart type, always).

See [visualization-rules.md](references/visualization-rules.md) for the complete mapping table.

### 5C: Dashboard Structure
Organize by narrative flow:
1. **Broad** — overview metrics, population sizes, temporal context
2. **Deep** — subgroup demographics, career, economics
3. **Compare** — health, social, economic outcomes across groups
4. **Explore** — heatmaps and ranked lists for discovered taxonomies
5. **Context** — related societal metrics
6. **Sources** — citations, methodology, limitations

Each section: title + subtitle + 1-3 chart cards + insight callout + filters where applicable.

**Product/Purchase lens:** See [product-comparison-template.md](references/product-comparison-template.md#phase-5-additions-product-analysis) for product key findings, visualization selection, dashboard structure, and recommendation engine.

---

## Phase 6: BUILD — Build Into Research Hub

All projects are built into the Research Hub — a single web application that hosts all research dashboards. **Never create a standalone Vite project.** The hub was set up in Phase 0.

See [hub-architecture.md](references/hub-architecture.md) for the hub directory structure, config schema, and project registry format.
See [build-templates.md](references/build-templates.md) for data schemas, component patterns, and design principles.

### Steps:

1. **Read pointer config** (`~/.codeium/windsurf/skills/research-visualizer/config.json`) to get `personalHubPath`
2. **Read `hub-config.json`** from `<personalHubPath>/hub-config.json` for port and project list
3. **Generate a slug** for the new project (kebab-case from topic, e.g., "cisco-history-dashboard")
4. **Create project directory:** `<personalHubPath>/src/projects/<slug>/`
5. **Write project files** into that directory:
   - `App.jsx` — the project's own App component with internal sidebar nav, section routing, filter controls
   - `components/` — all section components (Overview, Sources, etc.)
   - `data/` — all data files as ES module exports
6. **Update the project registry** at `<personalHubPath>/src/projects/index.js`:
   - Add a lazy import: `'<slug>': lazy(() => import('./<slug>/App'))`
   - Add metadata entry to `projectRegistry` array (title, subtitle, slug, query, lens, icon, accentColor, createdAt)
7. **Update `hub-config.json`** — add the new project to the `projects` array with metadata + the original user query. **Do NOT include telemetry yet** — telemetry is computed and persisted in Phase 7 step 4.
8. **Check dev server status:**
   - If Vite is already running on the hub port → tell user to refresh their browser (Vite HMR will pick up new files)
   - If Vite is NOT running → start it from `<personalHubPath>`: `npm run dev`
9. **Open browser preview** on the hub's port

### Project File Structure (within the hub):

```
<hubPath>/src/projects/<slug>/
├── App.jsx                    # Project's own App with internal sidebar nav + section routing
├── components/
│   ├── CustomTooltip.jsx      # Dark-themed chart tooltips
│   ├── InsightCallout.jsx     # Colored callout boxes
│   ├── Overview.jsx           # Overview section
│   ├── [SectionName].jsx      # Additional sections
│   └── Sources.jsx            # Methodology, disclaimers
└── data/
    └── researchData.js        # All research data as ES module exports
```

**Product/Purchase lens:** See [product-comparison-template.md](references/product-comparison-template.md#phase-6-additions-product-build) for product file structure, component patterns, and build order.

### Important: Store the User's Original Query

When updating `hub-config.json` and `projects/index.js`, always store the user's original natural-language query in the `query` field. This is displayed in the hub's project cards and sidebar so the user remembers what each research was about.

---

## Phase 7: PRESENT — Polish, Validate, Deliver

**Ordering is critical.** Steps 1-4 must complete before steps 5-8 begin. The hub is rendered ONCE at the end, after all syncs are done, so the user sees their research in both their personal space and the public library.

1. **Build test:** Run `npx vite build` from the hub directory — must complete with zero errors
2. **QA:** Charts render, axis labels visible, tooltips correct, findings match data, citations complete, T4 estimates marked
3. **Product QA:** See [product-comparison-template.md](references/product-comparison-template.md#phase-7-additions-product-qa) for product-specific checks.

4. **Finalize telemetry — GATE (steps 5-8 MUST NOT run until this is done):**
   Compute ALL telemetry fields from [hub-architecture.md](references/hub-architecture.md#telemetry-schema) and persist to BOTH `hub-config.json` AND `projects/index.js`. This includes: `runStartedAt`, `runCompletedAt`, `durationMinutes`, `skillVersion`, `userPrompt`, `researchPlan`, `checkpointModified`, `searchesPerformed`, `sourcesCount`, `sectionsBuilt`, `chartsBuilt`, `filesGenerated`, `dataPointsCollected`, `phaseTiming` (all 8 phases), `contentAnalysis` (FK grade, Bloom's, word count), `hoursSaved` (using formulas from hub-architecture.md), and `consumptionTime`. Every field in the schema is required — do not skip any.

5. **Git sync (personal):** If the hub has a git remote: `git add -A` → `git commit` → `git push`. If push fails, note it.

6. **Library share:** For each library where contribution intent is yes (from Phase 3D):
   - Push project files + updated `index.js` (with full telemetry) to the library's `branch` via the GitHub API. Library slug = `<slug>-<gitUsername>`.
   - See [hub-architecture.md](references/hub-architecture.md#agent-side-contribution-flow-phase-7-step-8) for the complete API flow.
   - If 401/403: PAT may be invalid — suggest contacting the library maintainer.

7. **Library sync:** For each library just pushed to, pull the latest into the local library clone: `git -C <localPath> pull`. This ensures the hub shows the user's contribution in the library view.

8. **Deliver to hub:** Start dev server if not running (`npm run dev`), or tell user to refresh. Open browser preview. The user should now see their research in their personal space AND in the public library. Summarize sections, note gaps.

---

## Edge Cases & Troubleshooting

See [hub-architecture.md](references/hub-architecture.md#edge-cases--troubleshooting) for the full troubleshooting table covering research, product lens, hub, git, and library edge cases.
