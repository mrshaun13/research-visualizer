---
name: research-visualizer
description: >
  Deep research on any topic and build an interactive statistical visualization dashboard.
  Use when the user asks to research a topic, visualize data, create a research dashboard,
  explore trends, compare populations, or analyze statistics across time periods or groups.
  Handles the full pipeline from research discovery through interactive React dashboard delivery.
compatibility: Requires internet access for web search and data fetching.
metadata:
  author: mrshaun13
  version: "2.1"
---

# Deep Research → Interactive Dashboard Pipeline

Takes a simple research topic from a user, autonomously discovers dimensions, metrics, subgroups, and taxonomies, then produces an interactive web dashboard.

## Design Philosophy

**The user provides:** A topic in natural language (1-2 sentences).
**The agent handles:** Research scoping, subgroup discovery, metric identification, taxonomy compilation, data gathering, visualization selection, and dashboard construction.

## Pipeline

```
INTERPRET → SURVEY → DISCOVER → RESEARCH → ANALYZE → BUILD → PRESENT
                                    ↓
                            User Checkpoint
```

---

## Phase 1: INTERPRET — Understand Intent

Parse natural language into research parameters. No structured input required.

**Valid inputs:**
- "Research sexual behavior trends and the adult entertainment industry across American generations"
- "How has drug use changed in America since the 1960s?"
- "Compare remote work vs office work outcomes since COVID"

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
   - Most topics combine 2-3 lenses.

**Output:** Topic, populations, time scope, intent, lenses. Proceed directly to Phase 2.

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

**Output:** Major data sources, preliminary dimensions, temporal segmentation. Proceed to Phase 3.

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

### 3D: User Checkpoint

Present a **Research Plan Summary** for lightweight approval:

```
TOPIC: [interpreted topic]
TIME AXIS: [segmentation] — [periods]
POPULATIONS: [discovered groups and subgroups]
CORE METRICS: [auto-identified per lens]
TAXONOMIES: [Category]: [N items] each
PROPOSED SECTIONS: [~5-8 sections]
KEY DATA SOURCES: [major studies]
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

---

## Phase 6: BUILD — Scaffold and Implement

Build the complete web application using the default tech stack (React 18, Vite 5, Recharts, Tailwind CSS 3, Lucide React).

See [build-templates.md](references/build-templates.md) for file structures, data schemas, component patterns, and design principles.

### Steps:
1. Create project structure (standard or large based on section count)
2. Write data files as ES module exports
3. Build reusable components (CustomTooltip, Heatmap, InsightCallout)
4. Build section components per Phase 5 plan
5. Build main App with sidebar nav, section routing, filter controls
6. Install dependencies and verify: `npm install && npm run dev`

---

## Phase 7: PRESENT — Polish, Validate, Deliver

1. **Build test:** `npx vite build` — must complete with zero errors
2. **Visual QA:** Every chart renders, axis labels visible, tooltips correct, all filters work
3. **Content QA:** Findings match data, citations complete, limitations documented, T4 estimates marked
4. **Deliver:** Start dev server + browser preview, summarize sections, note gaps, offer to deploy

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
