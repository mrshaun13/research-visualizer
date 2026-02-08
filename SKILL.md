---
description: Deep research on any topic and build an interactive statistical visualization dashboard from the findings
---

# Deep Research → Interactive Dashboard Pipeline

A repeatable agentic workflow for conducting deep research on any topic, compiling structured datasets from findings, and producing a polished interactive web dashboard with statistical visualizations.

## Overview

This skill follows a 6-phase pipeline inspired by agentic research frameworks:

```
DEFINE → RESEARCH → COMPILE → STRUCTURE → VISUALIZE → PRESENT
```

Each phase has clear inputs, outputs, and quality gates.

---

## Phase 1: DEFINE — Scope the Research

**Goal:** Turn a vague topic into a structured research plan with measurable dimensions.

### Steps:

1. **Clarify the research question** with the user. Ask:
   - What is the core topic?
   - What populations/groups should be compared?
   - What time periods or generational cohorts matter?
   - What specific metrics or dimensions are they hoping to find?
   - Are there any known data sources they want included?

2. **Identify comparison axes.** Every good research dashboard needs at least 2-3 axes of comparison. Common patterns:
   - **Time/Generation axis:** How has X changed over time?
   - **Group axis:** How does X differ between populations (gender, occupation, age, geography)?
   - **Metric axis:** What different measurements of X exist (counts, rates, percentages, averages)?

3. **Define the dimension matrix.** Create a structured outline like:
   ```
   Topic: [TOPIC]
   Groups: [GROUP_A, GROUP_B, GROUP_C, ...]
   Time Axis: [PERIOD_1, PERIOD_2, ..., PERIOD_N]
   Metrics:
     - Metric 1: [description] by [group] by [time]
     - Metric 2: [description] by [group] by [time]
     ...
   Trend Categories:
     - Category 1: [list of ~25-30 items to track prevalence of]
     - Category 2: [list of ~25-30 items to track prevalence of]
   ```

4. **Identify chart types needed.** Map each metric to a visualization:
   - **Bar charts:** Comparing discrete groups (e.g., avg X by generation by gender)
   - **Grouped/stacked bars:** Multi-dimensional comparisons
   - **Line charts:** Trends over continuous time
   - **Heatmaps:** Large matrices (e.g., 30 trends x 6 generations x 3 groups)
   - **Horizontal bar charts:** Ranked lists, prevalence comparisons
   - **Composed charts:** Overlaying bars + lines (e.g., entry age bars + career length line)
   - **Radar charts:** Multi-dimensional profiles

### Output of Phase 1:
- A written research plan with all dimensions, groups, metrics, and chart types
- User approval before proceeding

---

## Phase 2: RESEARCH — Deep Information Gathering

**Goal:** Gather the best available data from multiple source types.

### Steps:

1. **Identify source categories** for the topic:
   - **Academic/peer-reviewed:** Google Scholar, PubMed, JSTOR, specific journals
   - **Government/institutional:** Census, CDC, WHO, BLS, survey datasets (GSS, NHANES, etc.)
   - **Industry reports:** Trade publications, annual reports, market research
   - **Large-scale surveys:** Pew Research, Gallup, specialized surveys
   - **Platform/behavioral data:** Usage statistics, search trends, platform reports
   - **Meta-analyses:** Systematic reviews that aggregate multiple studies

2. **Use web search and fetch tools** to gather data. For each dimension in the research plan:
   - Search for "[metric] by [group] [time period] study OR survey OR data"
   - Fetch and extract key statistics from found sources
   - Note the source, sample size, methodology, and year for each data point
   - Flag data quality: peer-reviewed > institutional > industry > self-reported

3. **Cross-reference and triangulate.** For each data point:
   - Try to find 2-3 independent sources
   - Note where sources agree vs. disagree
   - When sources conflict, weight by: sample size, recency, methodology rigor
   - Clearly mark single-source estimates vs. well-corroborated figures

4. **Fill gaps with informed estimates.** When data does not exist for a specific cell:
   - Interpolate from adjacent data points (e.g., if you have Gen X and Millennial data, estimate Silent Gen from trends)
   - Use proxy indicators (e.g., search trend data as proxy for behavior prevalence)
   - Mark all estimates clearly with confidence levels

5. **Track all sources** in a structured citation list with:
   - Author(s), title, publication, year
   - What specific data points came from each source
   - Any methodological limitations noted

### Output of Phase 2:
- Raw data points organized by dimension
- Source citation list
- Data quality/confidence notes

---

## Phase 3: COMPILE — Structure Raw Data into Datasets

**Goal:** Transform raw research findings into clean, structured JavaScript data objects.

### Steps:

1. **Design the data schema.** For each visualization, define the exact data shape:
   ```javascript
   // Bar chart data shape
   [{ generation: 'Label', male: number, female: number }, ...]

   // Heatmap data shape (2D array + labels)
   {
     rowLabels: ['Gen 1', 'Gen 2', ...],
     colLabels: ['Trend A', 'Trend B', ...],
     data: [[val, val, ...], [val, val, ...], ...]
   }

   // Time series data shape
   [{ year: number, rate: number }, ...]
   ```

2. **Populate datasets** from research findings. Rules:
   - Use consistent units within each dataset (all percentages, all counts, etc.)
   - Round appropriately (1 decimal for averages, integers for percentages)
   - Use null for genuinely missing data (not 0 — zero means measured and zero)
   - Keep generation/group labels consistent across all datasets

3. **Create the data file(s).** Write as ES module exports:
   ```javascript
   // src/data/researchData.js
   export const GROUPS = [...];
   export const metricOneData = [...];
   export const metricTwoData = [...];
   export const TREND_LABELS = [...];
   export const trendMatrix = { group1: { subgroup: [...] }, ... };
   export const sources = [...];
   ```

4. **Validate data integrity:**
   - All arrays in a heatmap row must be the same length as the column labels
   - All bar chart entries must have the same keys
   - No NaN or undefined values (use null explicitly)
   - Spot-check: do the numbers make intuitive sense?

### Output of Phase 3:
- One or more structured data files ready for import

---

## Phase 4: STRUCTURE — Build the Application Skeleton

**Goal:** Set up the web application with all dependencies and configuration.

### Tech Stack (default — adjust per project needs):
- **React 18** — component framework
- **Vite 5** — build tool (fast dev server, instant HMR)
- **Recharts** — charting library (bar, line, area, composed, radar, pie)
- **Tailwind CSS 3** — utility-first styling
- **Lucide React** — icon library

### Steps:

1. **Create project directory** and initialize:
   ```
   mkdir -p <project>/src/data
   ```

2. **Write configuration files:**
   - package.json — dependencies and scripts
   - vite.config.js — Vite configuration
   - tailwind.config.js — Tailwind content paths
   - postcss.config.js — PostCSS plugins
   - index.html — entry HTML with font imports

3. **Write entry files:**
   - src/main.jsx — React DOM render
   - src/index.css — Tailwind directives + custom styles

4. **Install dependencies:**
   ```bash
   npm install
   ```

5. **Verify clean start:**
   ```bash
   npm run dev
   ```

### Important Note on File Writing:
When writing files to disk, if the write_to_file tool does not persist files reliably, fall back to writing files via shell commands using heredoc syntax:
```bash
cat > /path/to/file.js << 'ENDOFFILE'
file contents here
ENDOFFILE
```
Always verify files exist after writing with `ls -la` or `find`.

### Output of Phase 4:
- Running dev server with empty app shell

---

## Phase 5: VISUALIZE — Build Chart Components

**Goal:** Create all visualization components and wire them to data.

### Design Principles:
- **Dark theme** by default (bg-gray-950, text-gray-100) — data viz pops on dark backgrounds
- **Consistent color palette** — define COLORS constant, use consistently across all charts
- **Gender coding:** Blue (#3b82f6) for male, Pink (#ec4899) for female (conventional in research viz)
- **Group coding:** Assign distinct colors per occupation/population group
- **Responsive:** All charts in ResponsiveContainer width="100%" height={N}
- **Interactive:** Custom tooltips, hover states, filter toggles
- **Annotated:** Every chart needs a title, subtitle with source context, and key findings callout

### Component Patterns:

1. **Reusable CustomTooltip** — dark themed, shows all payload values
2. **Reusable Heatmap** — for any 2D matrix with row/col labels, color scaling, hover detail
3. **Section components** — one per dashboard tab, containing related charts + insights
4. **Filter controls** — toggle buttons for group/gender/time selection
5. **Insight callouts** — colored boxes with key findings below each chart group

### Steps:

1. **Build reusable components first:**
   - CustomTooltip — shared across all Recharts charts
   - Heatmap — for trend matrices (takes data, rowLabels, colLabels props)

2. **Build section components** — one per tab/page:
   - Each section = div with spacing containing:
     - Section title + subtitle with source attribution
     - 1-3 chart cards in grid layout
     - Key findings callout box
   - Chart cards contain:
     - Chart title + description
     - ResponsiveContainer wrapping the Recharts component
     - Configured axes, tooltips, legends

3. **Build the main App layout:**
   - Sidebar navigation with section links + icons
   - Main content area rendering the active section
   - useState for active section toggle

4. **For heatmap + ranked list sections** (trend analysis):
   - Add group toggle (e.g., General Pop / Cam / Pornstar)
   - Add gender toggle (Male / Female)
   - Heatmap renders the selected slice
   - Below heatmap: grid of Top N ranked cards per generation
   - Each card shows sorted trends with mini progress bars

### Output of Phase 5:
- Fully functional interactive dashboard with all charts rendering

---

## Phase 6: PRESENT — Polish, Validate, and Deliver

**Goal:** Final quality pass and delivery.

### Steps:

1. **Visual QA:**
   - Check every chart renders with correct data
   - Verify axis labels are not cut off (adjust angle, height, width)
   - Confirm tooltips show correct values
   - Test all toggle/filter combinations
   - Check responsive behavior at different widths

2. **Content QA:**
   - Verify key findings text is accurate to the data shown
   - Check source citations are complete
   - Add methodological limitations section
   - Ensure all estimates are clearly marked as such

3. **Build test:**
   ```bash
   npx vite build
   ```
   - Must complete with zero errors
   - Note any chunk size warnings (acceptable, not blocking)

4. **Deliver to user:**
   - Start dev server and provide browser preview
   - Summarize all sections and what data they contain
   - Note any data gaps or limitations
   - Offer to deploy if requested

---

## Appendix A: Chart Type Decision Guide

| Data Shape | Best Chart Type |
|---|---|
| X by Group (2-6 groups) | Grouped Bar Chart |
| X by Group by Subgroup | Grouped Bar with color coding |
| X over continuous time | Line Chart |
| X over time + by group | Multi-line Chart |
| Bars + trend overlay | Composed Chart (Bar + Line) |
| Ranked list of items | Horizontal Bar Chart |
| 3-group comparison on same metrics | Horizontal grouped bars |
| Large matrix (N trends x M groups) | Heatmap with color scale |
| Distribution/profile | Radar Chart |
| Part-of-whole | Pie/Donut (use sparingly) |

## Appendix B: Color Palette Template

```javascript
const COLORS = {
  // Gender
  male: '#3b82f6',        // Blue
  female: '#ec4899',      // Pink

  // Groups (assign as needed)
  group1: '#6366f1',      // Indigo
  group2: '#10b981',      // Emerald
  group3: '#f59e0b',      // Amber

  // Accents
  accent1: '#8b5cf6',     // Purple
  accent2: '#06b6d4',     // Cyan
  accent3: '#f43f5e',     // Rose
  accent4: '#84cc16',     // Lime
};
```

## Appendix C: Data Quality Tiers

When compiling data, tag each data point with a confidence tier:

| Tier | Description | Example |
|---|---|---|
| **T1 — Gold** | Peer-reviewed, large sample, nationally representative | GSS, Census, CDC NVSS |
| **T2 — Silver** | Institutional/industry report, moderate sample | Pew Research, platform reports |
| **T3 — Bronze** | Small study, self-selected sample, single source | Academic case study, survey of 200 |
| **T4 — Estimate** | Interpolated, proxy-based, or expert judgment | Gap-filling between known data points |

Always disclose tier in the Sources and Methods section.

## Appendix D: File Structure Template

```
<project>/
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── index.html
├── src/
│   ├── main.jsx
│   ├── index.css
│   ├── App.jsx
│   └── data/
│       └── researchData.js
```

For very large projects, split into multiple data files and component files:

```
├── src/
│   ├── data/
│   │   ├── demographics.js
│   │   ├── trends.js
│   │   ├── health.js
│   │   └── sources.js
│   ├── components/
│   │   ├── Heatmap.jsx
│   │   ├── CustomTooltip.jsx
│   │   ├── SectionOne.jsx
│   │   └── SectionTwo.jsx
│   └── App.jsx
```

## Appendix E: PaperBanana Integration (Optional)

For publication-quality static figures (e.g., for embedding in papers/PDFs), consider using PaperBanana (https://paperbanana.org/) as a complementary rendering step. PaperBanana uses a Retrieve-Plan-Render-Refine agent pipeline to produce academic-grade illustrations from text descriptions. It handles the last-mile figure polishing, while this workflow handles the full research-to-dashboard pipeline.

Use PaperBanana when:
- You need static publication-ready figures for a paper or PDF report
- You want methodology diagrams or flowcharts alongside data viz
- The output needs to match specific journal/conference style guides

Use this workflow when:
- You need an interactive, explorable dashboard
- The research phase is part of the deliverable
- You want filterable, multi-dimensional data exploration
- The audience will consume it in a browser
