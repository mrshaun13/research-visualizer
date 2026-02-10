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
  version: "4.0"
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

### Detection

1. **Check for config file:** `~/.codeium/windsurf/skills/research-visualizer/config.json`
2. **If config exists:**
   - Read `hubPath` from config
   - Verify the hub directory exists at that path
   - Check if a Vite dev server is already running on the configured port (default 5180): `lsof -i :<port>` or `ps aux | grep vite`
   - If server is running: note it — you will tell the user to refresh their browser at the end
   - If server is not running: you will start it at the end
   - **Skip to Phase 1** — the hub is ready, proceed with research
3. **If config does NOT exist → First-Time Setup (Phase 0B)**

### Phase 0B: First-Time Setup

This runs ONCE, the very first time the skill is invoked.

1. **Inform the user immediately:**
   > "I see this is your first time running Research Visualizer. I'll set up a **Research Hub** — a single web app that will host all your research dashboards in one place. You'll never need multiple dev servers again."

2. **Ask for hub location:**
   > "Where would you like to install the Research Hub? Default: `~/research-hub/`"
   - Accept the user's choice or use the default
   - The path must be absolute

3. **Scaffold the hub app** at the chosen location using the structure defined in [hub-architecture.md](references/hub-architecture.md):
   - `package.json` — with React 18, Vite 5, Recharts, Tailwind CSS 3, Lucide React
   - `vite.config.js` — configured with the chosen port (default 5180)
   - `tailwind.config.js`, `postcss.config.js`, `index.html`
   - `src/main.jsx`, `src/index.css`
   - `src/App.jsx` — Hub shell with ChatGPT-style collapsible sidebar + project routing
   - `src/components/HubHome.jsx` — Landing page with project cards grid
   - `src/projects/index.js` — Empty project registry (will be populated as projects are added)

4. **Run `npm install`** in the hub directory

5. **Create config.json** at `~/.codeium/windsurf/skills/research-visualizer/config.json`:
   ```json
   {
     "version": "1.0",
     "created": "<ISO timestamp>",
     "hubPath": "<chosen path>",
     "port": 5180,
     "projects": []
   }
   ```

6. **Continue to Phase 1** with the user's research request.

**Telemetry:** Initialize the telemetry object at the start of this phase. See [hub-architecture.md](references/hub-architecture.md#telemetry-schema) for the complete schema, capture timing, and formulas.

### Key Principle

Phase 0 should be **fast**. If the hub exists, it's a 2-second check. If it's first-time, the setup conversation is brief and then research proceeds normally.

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

When the Product/Purchase lens is active, replace or augment 3A-3C with product-specific discovery:

1. **Discover product tiers/categories** in the market — do NOT assume tiers; research how the market actually segments this product type. Search for "[product type] categories" and "[product type] buying guide tiers" to find the natural groupings. Examples of how different products segment differently:
   - Vehicles: Economy / Mid-Size / Luxury / Performance
   - Laptops: Budget / Mainstream / Ultrabook / Workstation
   - Boats: Day Sailor / Cruiser / Offshore / Pontoon
   - Tires: All-Season / Summer / Winter / Performance / All-Terrain
   - Power tools: Entry / Prosumer / Professional
   - Espresso machines: Manual / Semi-Auto / Super-Auto
   The right tiers are whatever the industry and buyers actually use — discover them, don't invent them.
2. **Discover the 5-8 key differentiating specs** for this product type (the specs that actually matter for buying decisions — these vary enormously by product category)
3. **Discover 1-2 meaningful derived metrics** — ratios that combine two specs into a single value insight. The right ratio depends entirely on the product type:
   - Vehicles: cost per mile, cargo space per dollar
   - Laptops: benchmark score per dollar, battery life per pound
   - Boats: price per foot of LOA, fuel cost per hour
   - Power tools: power-to-weight ratio, price per performance unit
   - Espresso machines: cost per cup over 5 years, brew time per cup
4. **Discover brands** and their market positioning (budget vs premium, specialist vs generalist)
5. **Discover user's existing ecosystem/constraints** (batteries owned, brand loyalty, space limitations)
6. **Discover use cases** the product serves — if 3+ distinct scenarios exist, flag Multi-Use-Case
7. **Discover price tiers and value breakpoints** — where does quality jump relative to price?
8. **Build product shortlist** — select 8-20 products across the full price range, including:
   - The "obvious" popular choices everyone considers
   - 1-2 hidden gems that experts recommend but casual buyers miss
   - At least 3 brands represented
   - Coverage across all discovered tiers/categories
9. **Gather per-product data:**
   - Manufacturer specs (official spec sheet)
   - Street prices from 2-3 retailers with direct purchase URLs
   - Review aggregates (stars + review count) from major retailers
   - 1-2 expert/professional review sources
   - Community sentiment (Reddit, forums) for real-world pros/cons
   - Warranty info, made-in country, release year

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

1. **Read config.json** to get `hubPath`
2. **Generate a slug** for the new project (kebab-case from topic, e.g., "cisco-history-dashboard")
3. **Create project directory:** `<hubPath>/src/projects/<slug>/`
4. **Write project files** into that directory:
   - `App.jsx` — the project's own App component with internal sidebar nav, section routing, filter controls
   - `components/` — all section components (Overview, Sources, etc.)
   - `data/` — all data files as ES module exports
5. **Update the project registry** at `<hubPath>/src/projects/index.js`:
   - Add a lazy import: `'<slug>': lazy(() => import('./<slug>/App'))`
   - Add metadata entry to `projectRegistry` array (title, subtitle, slug, query, lens, icon, accentColor, createdAt)
6. **Update config.json** — add the new project to the `projects` array with the same metadata + the original user query
7. **Check dev server status:**
   - If Vite is already running on the hub port → tell user to refresh their browser (Vite HMR will pick up new files)
   - If Vite is NOT running → start it: `cd <hubPath> && npm run dev`
8. **Open browser preview** on the hub's port

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

When updating `config.json` and `projects/index.js`, always store the user's original natural-language query in the `query` field. This is displayed in the hub's project cards and sidebar so the user remembers what each research was about.

---

## Phase 7: PRESENT — Polish, Validate, Deliver

1. **Build test:** Run `npx vite build` from the hub directory — must complete with zero errors
2. **Visual QA:** Every chart renders, axis labels visible, tooltips correct, all filters work
3. **Content QA:** Findings match data, citations complete, limitations documented, T4 estimates marked
4. **Deliver to hub:**
   - If dev server is already running → tell user: "Your new research is ready! Refresh your browser to see it in the Research Hub."
   - If dev server is NOT running → start it from the hub directory (`npm run dev`) and open browser preview
   - Summarize sections, note gaps, offer to deploy
5. **Verify hub integration:** Confirm the new project appears in the hub sidebar and is navigable from the hub home page

6. **Finalize telemetry:** Capture content analysis, hours-saved estimation, consumption time, and persist to config.json and projects/index.js. See [hub-architecture.md](references/hub-architecture.md#telemetry-schema) for all schemas, formulas, and capture timing.

**Product/Purchase lens:** See [product-comparison-template.md](references/product-comparison-template.md#phase-7-additions-product-qa) for product-specific QA checks.

---

## Edge Cases & Troubleshooting

| Situation | How to Handle |
|---|---|
| Topic is too broad (e.g., "research everything about health") | Ask user to narrow: "What aspect of health? Which population?" |
| No academic data exists for a dimension | Note as data-limited, use T3/T4 sources, caveat clearly in dashboard |
| Subgroup discovery finds >5 meaningful splits | Keep top 3-4 most distinct, merge rest into "other" |
| Taxonomy discovery returns <10 items | Expand search to adjacent fields, accept smaller taxonomy |
| User checkpoint gets major revisions | Re-run Phase 3 discovery for new dimensions, don't restart from scratch |
| File writing fails (write_to_file doesn't persist) | Fall back to shell heredoc commands, verify with `ls -la` |
| Build fails with import errors | Check all exports match imports, verify data file schemas |
| Charts render but show wrong data | Spot-check: compare 2-3 data points in chart vs source data file |
| Product lens: too many products to compare (>25) | Narrow to top 15-20 by eliminating discontinued, unavailable, or redundant models |
| Product lens: can't find purchase links for a product | Use manufacturer URL + generic retailer search URL; note "check availability" |
| Product lens: conflicting specs across sources | Prefer manufacturer specs > independent testing > retailer listings; note discrepancies |
| Product lens: user's product category is ambiguous | Ask: "Are you looking for [interpretation A] or [interpretation B]?" before proceeding |
| Product lens: no clear market tiers exist | Use price-based segmentation (Budget/Mid/Premium) or skip tier system entirely |
| Product lens: product is too niche (<5 options exist) | Include all available options; supplement with adjacent products or previous-gen models |
| Hub: config.json exists but hubPath directory is missing | Re-run first-time setup (Phase 0B), preserve existing project entries from config |
| Hub: dev server already running on the port | Skip starting a new server; tell user to refresh browser |
| Hub: project slug already exists in registry | Ask user: overwrite existing project or choose a new name? |
| Hub: npm install fails in hub directory | Check node/npm versions, clear node_modules and retry, check for lockfile conflicts |
| Hub: new project doesn't appear after refresh | Verify projects/index.js was updated correctly, check for import errors in browser console |
