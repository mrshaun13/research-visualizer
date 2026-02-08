---
name: research-visualizer
description: Deep research on any topic and build an interactive statistical visualization dashboard from the findings
---

# Deep Research → Interactive Dashboard Pipeline

A repeatable agentic workflow that takes a simple research topic from a user, autonomously discovers the right dimensions, metrics, subgroups, and taxonomies, then produces a polished interactive web dashboard with statistical visualizations.

## Design Philosophy

**The user should NOT need to:**
- Know academic terminology (e.g., "Greatest Generation" vs "people born in the 1920s")
- Pre-specify subgroups they haven't discovered yet
- List domain-specific taxonomies (health conditions, trend categories, etc.)
- Know what chart types exist or which ones fit their data
- Provide a structured research plan before research begins

**The agent SHOULD autonomously:**
- Interpret natural language into research scope
- Discover meaningful subgroups within populations
- Identify core metrics from the topic domain
- Compile domain-specific taxonomies from the literature
- Apply standard research methodology dimensions automatically
- Select visualization types based on data shape after collection
- Present a lightweight checkpoint for user approval before building

## Pipeline Overview

```
INTERPRET → SURVEY → DISCOVER → RESEARCH → ANALYZE → BUILD → PRESENT
     ↑                              ↓
     └──── User Checkpoint ─────────┘
```

The user provides a topic in natural language. The agent does the rest, pausing once after DISCOVER for a lightweight approval before committing to the full build.

---

## Phase 1: INTERPRET — Understand the User's Intent

**Goal:** Parse a natural language prompt into research parameters without requiring structured input.

**Input examples (all valid):**
- "Research sexual behavior trends and the adult entertainment industry across American generations"
- "How has drug use changed in America since the 1960s and what are the health impacts?"
- "Compare remote work vs office work outcomes since COVID"
- "Study the evolution of hip-hop culture and its economic impact"

### Steps:

1. **Extract the core topic.** What is being studied? (behavior, industry, culture, phenomenon)

2. **Extract implied populations.** Who is involved? Map casual references to researchable groups:
   - "the adult industry" → adult entertainment workers (subgroups TBD)
   - "American generations" → US population segmented by birth cohort
   - "since COVID" → 2019-present, with pre-COVID baseline
   - "people as far back as the 30s" → birth cohorts from ~1930 onward

3. **Extract time scope.** Map natural language to temporal boundaries:
   - "across generations" → all living/recent generations
   - "since the 60s" → 1960-present
   - "over the last decade" → ~2015-2025
   - Do NOT assume a specific segmentation yet (generations vs decades vs eras) — that's discovered in Phase 3

4. **Extract research intent.** What angle does the user care about?
   - Trends over time? Comparison between groups? Impact/outcomes? Cultural shifts?
   - If unclear, default to: "comprehensive overview with temporal and group comparisons"

5. **Classify the topic** into one or more research lenses (used to trigger automatic dimensions in Phase 3):
   - **Population lens:** Studying a group of people → triggers demographics, health, economic, social dimensions
   - **Behavior lens:** Studying a behavior/trend → triggers prevalence, taxonomy, participant demographics, outcomes
   - **Industry lens:** Studying a market/industry → triggers market size, revenue, worker conditions, career outcomes
   - **Culture lens:** Studying cultural phenomena → triggers generational shifts, media representation, public opinion
   - Most topics are 2-3 of these combined.

### Output of Phase 1:
- Topic, populations, time scope, intent, applicable research lenses
- NO user interaction needed — proceed directly to Phase 2

---

## Phase 2: SURVEY — Broad Landscape Scan

**Goal:** Understand the research landscape before diving deep. What major studies exist? What dimensions do researchers measure? What's the shape of this field?

### Steps:

1. **Conduct 3-5 broad searches:**
   - "[topic] research overview"
   - "[topic] major studies statistics"
   - "[topic] trends data [time scope]"
   - "[population] demographics research"
   - "[topic] systematic review OR meta-analysis"

2. **From results, identify:**
   - **Major studies and datasets** that exist for this topic (e.g., GSS, NHANES, Pornhub Insights)
   - **Commonly measured dimensions** — what do researchers in this field actually measure?
   - **Known subgroups** — do existing studies break the population into subgroups?
   - **Temporal inflection points** — are there known turning points? (e.g., internet era, COVID, policy changes)
   - **Data availability signals** — where is data rich vs sparse?

3. **Determine temporal segmentation.** Based on the topic, decide the best time axis:
   - **Generations** — best for social/cultural/behavioral topics spanning 50+ years
   - **Decades** — best for economic/industry topics or shorter spans
   - **Policy eras** — best for topics driven by regulation (e.g., pre/post legalization)
   - **Technology eras** — best for topics driven by tech (e.g., pre/post internet, pre/post smartphone)
   - Map the user's natural language time scope to the chosen segmentation

### Output of Phase 2:
- List of major data sources and studies
- Preliminary dimension list
- Chosen temporal segmentation with justification
- Proceed directly to Phase 3

---

## Phase 3: DISCOVER — Autonomous Dimension Discovery

**Goal:** Identify the specific subgroups, metrics, and taxonomies that matter for this topic. This is where the skill becomes intelligent — discovering what the user would have had to specify manually.

### 3A: Subgroup Discovery Protocol

**Purpose:** Find meaningful subpopulations that tell different stories when separated.

1. Start with the broadest grouping from Phase 1 (e.g., "adult entertainment workers")
2. Search for: "types of [group]" OR "[group] subcategories" OR "[group] classification"
3. For each candidate subgroup found:
   - Search for data comparing the subgroup to the parent group on 2-3 key metrics
   - **Split test:** If the subgroup differs by >20% on any key metric, it's a meaningful split
   - **Merge test:** If <20% difference across all metrics, keep merged
4. **Max depth: 2 levels** of splitting (prevents infinite subdivision)
5. **Max subgroups: 5** per population (prevents over-fragmentation)

**Example:** "adult entertainment workers" →
- Search finds: pornstars, cam performers, OnlyFans creators, strippers, phone sex operators
- Data shows pornstars and cam performers have very different career lengths, revenue models, and health outcomes (>20% differences)
- Strippers have limited research data available
- Decision: Split into pornstars + cam performers. Note strippers as data-limited.

### 3B: Core Metric Identification

**Purpose:** Determine the obvious metrics for this domain without user specification.

Apply the **Standard Research Dimensions Framework** based on the research lenses identified in Phase 1:

**Universal dimensions (ALWAYS included for any topic):**
- Temporal trends — how has X changed over time?
- Demographic breakdown — who does X? (age, gender, geography)
- Comparison to baseline — how does the studied group compare to the general population?

**Population lens dimensions (when studying people):**
- Population size and growth over time
- Age distribution, gender split
- Career/lifecycle metrics (entry age, duration, exit age) if applicable
- Health outcomes (physical and mental)
- Economic outcomes (income, financial stability)
- Social outcomes (relationships, family, community)
- Mortality/longevity if data exists

**Behavior lens dimensions (when studying behaviors/trends):**
- Prevalence rates by group and over time
- Taxonomy of subtypes (discovered in 3C below)
- Frequency and intensity measures
- Motivations and drivers
- Outcomes and correlations

**Industry lens dimensions (when studying markets):**
- Market size and growth
- Revenue distribution (look for inequality patterns)
- Worker demographics and conditions
- Career outcomes and transitions
- Regulatory landscape

**Culture lens dimensions (when studying cultural phenomena):**
- Generational attitude shifts
- Media representation changes
- Public opinion polling data
- Regional/geographic variation

### 3C: Taxonomy Discovery Protocol

**Purpose:** Find the domain-specific category lists that the user couldn't possibly know to specify.

For each dimension that has a categorical taxonomy (e.g., "types of sexual trends," "health conditions associated with X"):

1. **Search for existing taxonomies:**
   - "[dimension] categories list"
   - "[dimension] classification [field]"
   - "[dimension] types prevalence study"
2. **Search for industry/platform categorizations:**
   - Platform category lists (e.g., Pornhub categories, Spotify genres, job classification codes)
   - Industry standard classifications
3. **Cross-reference and compile** a unified list of 25-35 items per taxonomy
4. **Rank by data availability** — prioritize items where prevalence data actually exists
5. **Trim to top 25-30** most researchable items

**Example:** For "sexual trends/kinks":
- Academic sources provide: categories from Lehmiller's "Tell Me What You Want" survey
- Platform data provides: Pornhub's annual category rankings
- Cross-reference produces: ~30 categories with both academic and behavioral data

### 3D: Synthesis Checkpoint

After completing 3A-3C, compile a **Research Plan Summary**:

```
TOPIC: [interpreted topic]
TIME AXIS: [chosen segmentation] — [list of periods]
POPULATIONS: [discovered groups and subgroups]
CORE METRICS: [auto-identified metrics per lens]
TAXONOMIES DISCOVERED:
  - [Category 1]: [N items] (e.g., "Sexual trends: 30 items")
  - [Category 2]: [N items]
PROPOSED DASHBOARD SECTIONS: [~5-8 sections with brief descriptions]
KEY DATA SOURCES: [major studies/datasets identified]
```

**Present this to the user for lightweight approval:**
- "Here's what I found and what I plan to build. Should I proceed, or would you like to adjust anything?"
- User can say "yes," "also add X," "skip Y," or "looks good"
- This is the ONLY required user interaction between the initial prompt and the final dashboard

### Output of Phase 3:
- Complete research plan with all dimensions, groups, metrics, taxonomies
- User approval to proceed

---

## Phase 4: RESEARCH — Deep Data Gathering

**Goal:** Gather the best available data for every cell in the dimension matrix.

### Steps:

1. **For each metric × group × time period**, search for data:
   - "[metric] [group] [time period] study OR survey OR statistics"
   - Fetch and extract key statistics
   - Note: source, sample size, methodology, year, data quality tier

2. **Data quality tiers** (tag every data point):

   | Tier | Label | Description | Example |
   |------|-------|-------------|---------|
   | T1 | Gold | Peer-reviewed, large sample, nationally representative | GSS, Census, CDC NVSS |
   | T2 | Silver | Institutional/industry report, moderate sample | Pew Research, platform reports |
   | T3 | Bronze | Small study, self-selected sample, single source | Academic case study, survey of 200 |
   | T4 | Estimate | Interpolated, proxy-based, or expert judgment | Gap-filling between known data points |

3. **Cross-reference and triangulate:**
   - Try to find 2-3 independent sources per data point
   - When sources conflict, weight by: sample size > recency > methodology rigor
   - Mark single-source data points clearly

4. **Fill gaps with informed estimates** when necessary:
   - Interpolate from adjacent data points
   - Use proxy indicators
   - Mark ALL estimates as T4 with explanation

5. **For each taxonomy** (e.g., 30 sexual trends):
   - Gather prevalence data per group × time period
   - This produces the heatmap matrices
   - Missing cells get null (not 0)

6. **Track all sources** in structured citation list

### Output of Phase 4:
- Raw data organized by dimension
- Source citations with quality tiers
- Gap analysis (where data is strong vs weak)

---

## Phase 5: ANALYZE — Data-Driven Story & Visualization Selection

**Goal:** Look at the collected data and determine the best way to present it. This is where visualization decisions are made — AFTER seeing the data, not before.

### 5A: Key Findings Identification

For each dataset, identify:
- What's the most surprising finding?
- Where are the biggest differences between groups?
- What are the clearest temporal trends?
- Are there any counterintuitive results?

These become the **insight callouts** displayed below each chart group.

### 5B: Visualization Auto-Selection

Map each dataset to the optimal chart type using this deterministic framework:

| Data Shape | Auto-Selected Chart Type |
|---|---|
| Metric × 2-6 discrete groups | Grouped Bar Chart |
| Metric × 2-6 groups × 2 subgroups (e.g., gender) | Grouped Bar with color-coded subgroups |
| Metric over continuous time (>8 points) | Line Chart |
| Metric over time × multiple groups | Multi-line Chart |
| Categorical + trend on same axis | Composed Chart (Bar + Line overlay) |
| Ranked list of items (>8 items) | Horizontal Bar Chart |
| 3+ groups compared on same set of metrics | Horizontal grouped bars |
| Large taxonomy × multiple time periods (>100 cells) | Interactive Heatmap with color scale |
| Heatmap data with clear rankings | Heatmap + Top-N ranked cards per period |
| Small set of stats per group | Info/stat cards in grid |
| Single metric over long time series | Area chart or line chart |

### 5C: Dashboard Structure

Organize sections by narrative flow:
1. **Start broad** — overview metrics, population sizes, temporal context
2. **Go deep on each subgroup** — demographics, career, economics
3. **Compare outcomes** — health, social, economic comparisons across groups
4. **Explore taxonomies** — heatmaps and ranked lists for discovered categories
5. **Contextual data** — related societal metrics (e.g., divorce rates, cultural shifts)
6. **End with sources** — citations, methodology, limitations

Each section gets:
- A title and subtitle with source context
- 1-3 chart cards
- An insight callout box with key findings
- Filter controls where applicable (group toggle, gender toggle, time toggle)

### Output of Phase 5:
- Dashboard section plan with chart types assigned
- Key findings per section
- Filter/interaction plan

---

## Phase 6: BUILD — Scaffold and Implement

**Goal:** Build the complete web application.

### Tech Stack (default):
- **React 18** — component framework
- **Vite 5** — build tool
- **Recharts** — charting library
- **Tailwind CSS 3** — styling (dark theme default)
- **Lucide React** — icons

### Steps:

1. **Create project structure:**
   ```
   <project>/
   ├── package.json
   ├── vite.config.js
   ├── tailwind.config.js
   ├── postcss.config.js
   ├── index.html
   └── src/
       ├── main.jsx
       ├── index.css
       ├── App.jsx
       └── data/
           └── researchData.js
   ```

   For large projects (>6 sections), split into component files:
   ```
   └── src/
       ├── components/
       │   ├── Heatmap.jsx
       │   ├── CustomTooltip.jsx
       │   └── [SectionName].jsx
       └── data/
           ├── [dimension1].js
           └── [dimension2].js
   ```

2. **Write data files** as ES module exports with structured schemas:
   - Bar chart data: `[{ label: string, group1: number, group2: number }, ...]`
   - Heatmap data: `{ rowLabels: [...], colLabels: [...], data: [[...], ...] }`
   - Time series: `[{ year: number, value: number }, ...]`
   - Use `null` for missing data (never 0 for missing)

3. **Build reusable components:**
   - **CustomTooltip** — dark themed, shows all values
   - **Heatmap** — interactive, color-scaled, hover detail panel
   - **InsightCallout** — colored box with key finding text

4. **Build section components** per the Phase 5 plan

5. **Build main App layout:**
   - Sidebar navigation with icons per section
   - Active section state management
   - Filter controls where needed (group, gender, time toggles)

6. **Install and verify:**
   ```bash
   npm install
   npm run dev
   ```

### Design Principles:
- **Dark theme:** bg-gray-950, text-gray-100
- **Consistent color palette:** Define COLORS constant, use everywhere
- **Responsive:** All charts in `<ResponsiveContainer width="100%" height={N}>`
- **Interactive:** Tooltips, hover states, filter toggles
- **Annotated:** Every chart has title, subtitle, and insight callout

### File Writing Note:
If `write_to_file` tool doesn't persist reliably, fall back to shell heredoc:
```bash
cat > /path/to/file.js << 'EOF'
contents
EOF
```
Always verify with `ls -la` after writing.

### Output of Phase 6:
- Running dev server with complete dashboard

---

## Phase 7: PRESENT — Polish, Validate, Deliver

**Goal:** Final quality pass.

### Steps:

1. **Build test:**
   ```bash
   npx vite build
   ```
   Must complete with zero errors.

2. **Visual QA:**
   - Every chart renders with correct data
   - Axis labels not cut off
   - Tooltips show correct values
   - All filter combinations work
   - Heatmap hover details accurate

3. **Content QA:**
   - Key findings match the data
   - Source citations complete
   - Methodological limitations documented
   - All T4 estimates clearly marked

4. **Deliver:**
   - Start dev server + browser preview
   - Summarize all sections and their contents
   - Note data gaps or limitations
   - Offer to deploy if requested

---

## Appendix A: Standard Research Dimensions Framework

This framework ensures consistent, comprehensive coverage without user specification. Apply based on research lenses detected in Phase 1.

### Always Include:
| Dimension | What to Gather |
|---|---|
| Temporal trends | How has the core metric changed over the chosen time axis? |
| Demographics | Age, gender, geography, education, income of relevant populations |
| Baseline comparison | General population numbers for every metric measured in subgroups |

### Population Lens:
| Dimension | What to Gather |
|---|---|
| Population size | How many people, growth/decline over time |
| Career/lifecycle | Entry age, duration, exit age, transitions (if applicable) |
| Health outcomes | Physical and mental health conditions, mortality |
| Economic outcomes | Income, revenue, financial stability, inequality |
| Social outcomes | Relationships, family, community, stigma |

### Behavior Lens:
| Dimension | What to Gather |
|---|---|
| Prevalence | How common, by group, over time |
| Taxonomy | Subcategories/types (discover via Taxonomy Discovery Protocol) |
| Frequency | How often, intensity measures |
| Outcomes | Consequences, correlations, risk factors |

### Industry Lens:
| Dimension | What to Gather |
|---|---|
| Market size | Total revenue, number of workers, growth rate |
| Revenue distribution | By percentile, inequality metrics (Gini, top 1% share) |
| Worker conditions | Safety, regulation, career outcomes |
| Subindustry segments | Meaningful splits within the industry |

### Culture Lens:
| Dimension | What to Gather |
|---|---|
| Generational attitudes | How do different cohorts view this topic? |
| Media representation | How is this portrayed in media over time? |
| Public opinion | Polling data, acceptance/stigma trends |
| Policy/legal | Regulatory changes, legal status over time |

## Appendix B: Visualization Auto-Selection Rules

These rules are DETERMINISTIC — the same data shape always produces the same chart type.

| Data Shape | Chart Type | When to Use |
|---|---|---|
| Metric × 2-6 groups | Grouped Bar | Comparing discrete categories |
| Metric × 2-6 groups × 2 subgroups | Grouped Bar (color-coded) | Adding gender/subgroup dimension |
| Metric × >6 groups | Horizontal Bar | Too many groups for vertical bars |
| Metric over time (>8 points) | Line Chart | Continuous temporal trends |
| Metric over time × groups | Multi-line | Comparing trends across groups |
| Categorical + continuous on same axis | Composed (Bar + Line) | e.g., entry age bars + career length line |
| 3+ groups × same metrics | Horizontal grouped bars | Side-by-side outcome comparison |
| Large taxonomy × periods (>100 cells) | Heatmap + Top-N cards | Trend/category matrices |
| Small stat set per group | Info cards grid | Summary statistics |
| Single long time series | Line or Area chart | Historical trends |
| Part-of-whole | Donut (use sparingly) | Composition breakdowns |

## Appendix C: Color Palette Template

```javascript
const COLORS = {
  // Gender (conventional in research visualization)
  male: '#3b82f6',        // Blue
  female: '#ec4899',      // Pink

  // Groups (assign sequentially as discovered)
  group1: '#6366f1',      // Indigo — general population / baseline
  group2: '#10b981',      // Emerald — subgroup 1
  group3: '#f59e0b',      // Amber — subgroup 2
  group4: '#ef4444',      // Red — subgroup 3

  // Accents
  accent1: '#8b5cf6',     // Purple
  accent2: '#06b6d4',     // Cyan
  accent3: '#f43f5e',     // Rose
  accent4: '#84cc16',     // Lime
};
```

## Appendix D: Subgroup Split Decision Matrix

Use this to decide whether to split a population into subgroups:

| Signal | Action |
|---|---|
| >20% difference on 2+ key metrics between subgroups | SPLIT — they tell different stories |
| >20% difference on 1 metric only | SPLIT if the metric is central to the topic; otherwise MERGE |
| <20% difference across all metrics | MERGE — splitting adds noise without insight |
| Subgroup has <3 data sources available | NOTE as data-limited; include if possible, caveat if not |
| >5 potential subgroups | Keep top 3-4 most distinct; merge the rest into "other" |
| Subgroup only exists for part of the time axis | Include with clear notation (e.g., "cam performers: Gen X onward") |

## Appendix E: Taxonomy Discovery Search Templates

Use these search patterns to discover domain-specific category lists:

```
"[topic] categories list"
"[topic] types classification"
"[topic] taxonomy [academic field]"
"most common [topic items] prevalence study"
"[platform] [topic] categories" (e.g., "Pornhub categories", "Spotify genres")
"[topic] survey categories [major study name]"
"top [N] [topic items] by [metric]"
```

Cross-reference 2-3 sources to build a unified list of 25-30 items. Prioritize items with available prevalence data.

## Appendix F: PaperBanana Integration (Optional)

For publication-quality static figures, consider PaperBanana (https://paperbanana.org/) as a complementary last-mile rendering step. It uses Retrieve-Plan-Render-Refine agents for academic-grade illustrations.

Use PaperBanana when: static figures for papers/PDFs, journal style compliance needed.
Use this workflow when: interactive dashboards, research discovery is part of the deliverable, browser-based consumption.
