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

### Telemetry: Phase 0 Capture

At the start of Phase 0, initialize the telemetry object that will be built up throughout the run:

1. **Record `runStartedAt`** — current ISO 8601 timestamp
2. **Record `skillVersion`** — read from this file's frontmatter (currently "4.0")
3. **Record `model`** — note the current LLM model if detectable (optional, set null if unknown)
4. **Set `includedSetup`** — `true` if Phase 0B runs, `false` if hub already existed
5. **Initialize counters** — `searchesPerformed: 0`, phase timing tracker
6. **Start phase timer** for `phaseTiming.environment`

See [hub-architecture.md](references/hub-architecture.md) for the complete telemetry schema.

### Key Principle

Phase 0 should be **fast**. If the hub exists, it's a 2-second check. If it's first-time, the setup conversation is brief and then research proceeds normally.

---

## Phase 1: INTERPRET — Understand Intent

Parse natural language into research parameters. No structured input required.

**Valid inputs:**
- "Research sexual behavior trends and the adult entertainment industry across American generations"
- "How has drug use changed in America since the 1960s?"
- "Compare remote work vs office work outcomes since COVID"
- "I'm looking to buy a chainsaw" *(triggers Product/Purchase lens)*
- "Help me pick a good laptop for software development" *(triggers Product/Purchase lens)*
- "What's the best SUV for a family of 5?" *(triggers Product/Purchase lens)*

### Steps:

1. **Extract core topic** — what is being studied?
2. **Extract implied populations** — map casual references to researchable groups:
   - "the adult industry" → adult entertainment workers (subgroups TBD)
   - "people as far back as the 30s" → birth cohorts from ~1930 onward
3. **Extract time scope** — map to temporal boundaries (do NOT choose segmentation yet):
   - "across generations" → all living/recent generations
   - "since the 60s" → 1960-present
4. **Extract research intent** — trends over time? group comparison? impact analysis?
5. **Classify into research lenses** (triggers automatic dimensions in Phase 3):
   - **Population lens** → demographics, health, economic, social
   - **Behavior lens** → prevalence, taxonomy, outcomes
   - **Industry lens** → market size, revenue, worker conditions
   - **Culture lens** → generational shifts, media, public opinion
   - **Product/Purchase lens** → product specs, pricing, brand comparison, value analysis, purchase recommendations
   - Most topics combine 2-3 lenses. The Product/Purchase lens is special — when detected, it activates Phase 1B and overrides much of the standard pipeline with product-specific scaffolding.

**Product/Purchase lens detection signals:**
- Explicit: "buy", "purchase", "looking for", "which should I get", "help me choose", "best [product] for"
- Implicit: mentions of brands, models, price ranges, product categories, "compare [products]"
- Context: any request where the end goal is selecting a product to acquire

**Telemetry:** Record `userPrompt` — the exact original text the user provided, before any interpretation. End `phaseTiming.interpret` timer.

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

3. **Determine temporal segmentation:**
   - **Generations** — social/cultural topics spanning 50+ years
   - **Decades** — economic/industry topics or shorter spans
   - **Policy eras** — regulation-driven topics
   - **Technology eras** — tech-driven topics

**Product/Purchase lens additions to Phase 2:**

When the Product/Purchase lens is active, replace or augment the standard searches with:

1. **Conduct 3-5 product-focused searches:**
   - "best [product type] [current year]"
   - "[product type] comparison review [current year]"
   - "[product type] buyer's guide"
   - "[product type] reddit recommendations"
   - "[brand] [product type] specs"

2. **Identify from results:**
   - Major brands and their market positioning
   - Key differentiating specs for this product type
   - Price tiers and value breakpoints
   - Expert review sources and independent testing labs
   - Common complaints and praise patterns
   - Ecosystem dependencies (batteries, platforms, accessories)

3. **Determine product segmentation:**
   - **Market tiers** — entry/mid/pro, economy/mid/luxury, budget/mainstream/premium
   - **Power types** — gas/battery/corded, manual/electric, etc.
   - **Use case categories** — if products serve different scenarios

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

1. **Discover product tiers/categories** in the market (e.g., Entry/Farm/Pro for chainsaws, Power Tool/Precision/Duster for blowers)
2. **Discover the 5-8 key differentiating specs** for this product type (the specs that actually matter for buying decisions)
3. **Discover 1-2 meaningful derived metrics** — ratios that combine two specs into a single value insight:
   - Power-to-weight ratio (HP ÷ lbs)
   - Price per performance unit ($ ÷ HP, $ ÷ CFM)
   - Cost per capacity ($ ÷ cubic feet, $ ÷ watt-hours)
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

**Telemetry:** Record `researchPlan` — the full checkpoint text shown above (standard or product format). Record `checkpointModified` — `true` if the user requested changes, `false` if they approved as-is. End `phaseTiming.discover` timer. Also increment `searchesPerformed` with the count of web searches done in Phases 2-3.

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

**Product/Purchase lens additions to Phase 4:**

When the Product/Purchase lens is active, the research phase focuses on per-product data gathering:

1. **For each product on the shortlist**, gather the complete data object per the schema in [product-comparison-template.md](references/product-comparison-template.md):
   - All numeric specs (8-15 per product)
   - Pre-calculate derived metrics
   - Boolean features (if Features Matrix flagged)
   - Use case ratings 1-5 (if Multi-Use-Case flagged)
   - Qualitative data: bestFor, prosText, consText, verdict, highlights
   - Sources list per product

2. **Build the productDetails data** (separate file) for each product:
   - Full manufacturer spec sheet (key-value pairs)
   - Purchase links with retailer, URL, price, stock status (2-3 retailers per product)
   - Ratings with source, stars, review count, URL (2-3 sources per product)
   - Pros and cons extracted from actual user reviews (not just spec-derived)

3. **Gather ecosystem data** (if Ecosystem Dependency flagged):
   - Tool count per ecosystem, voltage, battery range, average battery price, retailer availability

4. **Gather TCO components** (if Durable/Semi-Durable lifecycle):
   - Annual fuel/energy cost, annual maintenance cost, consumable costs, expected lifespan
   - Assumptions clearly documented

5. **Track all sources** — manufacturer sites, retailer listings, review sites, community forums, expert reviews

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

**Product/Purchase lens additions to Phase 5:**

When the Product/Purchase lens is active, replace the standard narrative flow with product-specific analysis:

### 5A-P: Product Key Findings
- **Best value discovery** — which product gives the most for the money?
- **The "value paradox"** — is the cheapest to buy also the cheapest to own? (often not)
- **Hidden gems** — products that experts love but casual buyers overlook
- **Anti-recommendations** — products that look good on paper but have hidden downsides (Durable lifecycle only)
- **Tradeoff identification** — the two most important competing metrics (these become the primary scatter plot)

### 5B-P: Product Visualization Selection
Use the chart selection table in [product-comparison-template.md](references/product-comparison-template.md). Key mappings:
- Products ranked by one spec → Horizontal bar (sorted)
- Two competing specs → Scatter plot (this is the hero chart)
- Derived value metric → Horizontal bar with quality-indicator coloring
- TCO breakdown → Stacked horizontal bar
- Use case fit → Heatmap-style grid or rated dots
- Top contenders across dimensions → Radar chart
- Boolean features → Checklist matrix table

### 5C-P: Product Dashboard Structure
Organize by the Section Selection Decision Tree from Phase 1B:
1. **Overview** — stat cards, user profile insight, primary scatter plot, category distribution
2. **Spec Comparison** — sortable table, bar charts for top 3-4 specs
3. **[Primary Metric] Deep Dive** — derived metrics, value analysis charts
4. **[Conditional sections]** — TCO, Features Matrix, Use Case Fit, Ecosystem, secondary metrics
5. **Recommendations** — award cards, quick decision guide, multi-tier purchase options, avoid list
6. **Sources** — methodology, pricing notes, disclaimers

### 5D-P: Recommendation Engine
Build curated picks with these award categories (select 5-7 that fit):
- **Best Overall Value** — best bang for the buck
- **Best Premium / No Compromises** — money is secondary to quality
- **Best Budget** — cheapest viable option
- **Best "Buy It For Life"** — longest-lasting, most durable (Durable lifecycle)
- **Best for [Primary Use Case]** — tailored to user's main need
- **Best for [Secondary Use Case]** — if Multi-Use-Case
- **Hidden Gem** — underrated product experts love
- **Most Comfortable / Ergonomic** — if comfort is a differentiator
- **Best Using Your [Ecosystem]** — if user has existing ecosystem

Also build **multi-tier purchase options** (2-4 strategies):
- **Option A** — Best of Both Worlds (premium combo, ~$X total)
- **Option B** — Best Value (good-enough combo, ~$X total)
- **Option C** — Single Tool (one product covers most needs, ~$X)
- **Option D** — Ultra-Budget (cheapest viable path, ~$X)

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

**Product/Purchase lens additions to Phase 6:**

When the Product/Purchase lens is active, use the product-specific component patterns from [product-comparison-template.md](references/product-comparison-template.md).

### Product Comparison File Structure (within the hub):

```
<hubPath>/src/projects/<slug>/
├── App.jsx                    # Sidebar nav + section routing + product detail routing
├── components/
│   ├── CustomTooltip.jsx
│   ├── InsightCallout.jsx
│   ├── ComparisonTable.jsx    # Sortable/filterable table with expandable rows
│   ├── ProductDetail.jsx      # Full product deep-dive page
│   ├── RecommendationCards.jsx
│   ├── [MetricDeepDive].jsx   # e.g., PowerPerformance, AirflowAnalysis
│   ├── [ConditionalSection].jsx # TCO, FeaturesMatrix, UseCaseMatrix, Ecosystem
│   └── Sources.jsx
└── data/
    ├── products.js            # Product array + constants
    └── productDetails.js      # Deep per-product info
```

### Product Comparison Build Order:

1. **Data files first** — `products.js` with the standardized product schema, `productDetails.js` with deep per-product info including `getAggregateRating()` helper
2. **Reusable components** — CustomTooltip, InsightCallout (with variant support: info/warning/recommendation/critical/highlight)
3. **ComparisonTable** — sortable columns, category/tier/brand filters, expandable rows, link to ProductDetail
4. **ProductDetail** — full page with specs table, purchase links, aggregate ratings, retailer rating breakdown, pros/cons from reviews, use case fit bars, highlights, back button
5. **Overview section** — stat cards, primary scatter plot, key insights, category distribution charts
6. **Metric deep-dive sections** — bar charts for key specs, derived metric charts, scatter plots
7. **Conditional sections** — build only those flagged in Phase 1B (TCO, Features Matrix, Use Case Fit, Ecosystem)
8. **Recommendations** — award cards, quick decision guide, multi-tier purchase options, avoid list (if Durable)
9. **Sources** — methodology notes, pricing disclaimers, safety warnings (if applicable)
10. **App.jsx** — project-level sidebar nav with icons, section routing, ProductDetail routing, mobile responsive

### Important: Store the User's Original Query

When updating `config.json` and `projects/index.js`, always store the user's original natural-language query in the `query` field. This is displayed in the hub's project cards and sidebar so the user remembers what each research was about.

### Telemetry: Phase 6 Capture

After the build completes, count and record:

1. **`sectionsBuilt`** — number of section components created (count files in components/ that are sections, not utilities)
2. **`chartsBuilt`** — number of individual chart/visualization elements across all sections
3. **`filesGenerated`** — total files written to the project directory (App.jsx + components + data files)
4. **`sourcesCount`** — count unique sources referenced in the data files
5. **`productsCompared`** — length of the products array (Product lens only, null otherwise)
6. **`dataPointsCollected`** — approximate count of individual data values gathered during Phase 4
7. **Increment `searchesPerformed`** — add any searches done during Phase 4 research
8. **End `phaseTiming.build`** timer

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

### Telemetry: Phase 7 Finalization

After QA and delivery, finalize the telemetry object and persist it.

See [hub-architecture.md](references/hub-architecture.md) for the complete schemas and estimation formulas.

#### Step 1: Core Telemetry
1. **Record `runCompletedAt`** — current ISO 8601 timestamp
2. **Calculate `durationMinutes`** — difference between `runCompletedAt` and `runStartedAt`
3. **End `phaseTiming.present`** timer
4. **Record `tokenUsage`** — if available from the runtime environment, otherwise `null`

#### Step 2: Content Analysis (Readability & Cognitive Depth)
Analyze ALL text content in the built dashboard (insight callouts, section descriptions, data labels, tooltip text, recommendation text):
1. **Count `totalWords` and `totalSentences`** across all components
2. **Calculate `fleschKincaidGrade`** using: `0.39 × (words/sentences) + 11.8 × (syllables/words) − 15.59`
3. **Assign `fleschKincaidLabel`** — map grade to label (e.g., 8.0 = "8th Grade", 13.0 = "College")
4. **Assess `bloomsLevel`** — evaluate the dominant cognitive level of the content:
   - Data display = Remember/Understand (1-2)
   - Comparative analysis = Analyze (4)
   - Recommendations/verdicts = Evaluate (5)
5. **Set `bloomsRange`** — the full range of levels present (e.g., "Understand → Evaluate")
6. **Write `readabilityNote`** — brief characterization (e.g., "College-prep level with data-driven analytical content")

#### Step 3: Hours Saved Estimation
Calculate the equivalent manual effort using build metrics:
1. **`researchHours`** = `(sourcesCount × 0.75) + (dataPointsCollected × 0.02) + (searchesPerformed × 0.25)`
2. **`productionHours`** — calculate for ALL six output formats:
   - `interactive-dashboard` = `(sectionsBuilt × 6) + (chartsBuilt × 3) + (filesGenerated × 0.5)`
   - `white-paper` = `(sectionsBuilt × 4) + (sourcesCount × 0.5) + (dataPointsCollected × 0.01)`
   - `blog-post` = `(sectionsBuilt × 2.5) + (chartsBuilt × 1)`
   - `technical-doc` = `(sectionsBuilt × 3) + (sourcesCount × 0.3)`
   - `presentation` = `(sectionsBuilt × 1.5) + (chartsBuilt × 0.5)`
   - `github-repo` = `(sectionsBuilt × 3) + (chartsBuilt × 2) + (filesGenerated × 0.5)`
3. **`totalHoursSaved`** = `researchHours + productionHours['interactive-dashboard']`
4. **`equivalentLabel`** — human-readable (e.g., "~2 weeks full-time")

#### Step 4: Consumption Time
Estimate how long a human reader would need to fully consume the dashboard:
1. **`readingMinutes`** = `totalWords / (fleschKincaidGrade > 12 ? 120 : 150)`
2. **`chartExplorationMinutes`** = `chartsBuilt × 0.75`
3. **`interactiveOverheadMinutes`** = `(readingMinutes + chartExplorationMinutes) × 0.2`
4. **`estimatedMinutes`** = sum of above three
5. **`estimatedLabel`** — human-readable (e.g., "~45 min deep read")

#### Step 5: Persist
Write the complete telemetry object (including `contentAnalysis`, `hoursSaved`, `consumptionTime`) to both:
- `config.json` → under the project's `telemetry` field
- `projects/index.js` → in the project's registry entry as a `telemetry` property

Verify the hub home page displays all telemetry stats on the project card.

**Product/Purchase lens additions to Phase 7:**

5. **Product QA (additional checks):**
   - Every product in the comparison table expands correctly with detail
   - ProductDetail pages render for all products with purchase links, ratings, and specs
   - All purchase links are valid URLs (not placeholder text)
   - Aggregate ratings calculate correctly from source ratings
   - Recommendation cards reference real products in the data
   - Quick decision guide answers map to actual products with correct prices
   - Multi-tier purchase options have accurate total costs
   - Filters (tier, brand, category) work correctly and show accurate counts
   - Scatter plot axes are labeled and tooltips show product names
   - Brand colors are consistent across all charts

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
