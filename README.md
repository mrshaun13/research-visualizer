# Research Visualizer

An agentic AI skill for conducting deep research on any topic and producing interactive statistical visualization dashboards from the findings.

## What This Is

A repeatable 6-phase workflow (`SKILL.md`) that guides an AI coding agent through the full pipeline of:

```
DEFINE → RESEARCH → COMPILE → STRUCTURE → VISUALIZE → PRESENT
```

**Input:** A research topic + dimensions to explore  
**Output:** A fully interactive React web dashboard with charts, heatmaps, filters, and source citations

## How It Works

| Phase | Name | Description |
|-------|------|-------------|
| 1 | **DEFINE** | Scope the research question, identify comparison axes, map metrics to chart types |
| 2 | **RESEARCH** | Deep web search across academic, institutional, and industry sources; triangulate data |
| 3 | **COMPILE** | Transform raw findings into structured JS datasets with data quality tiers |
| 4 | **STRUCTURE** | Scaffold a React + Vite + Tailwind + Recharts project |
| 5 | **VISUALIZE** | Build all chart components — bar charts, heatmaps, line charts, filters, insight callouts |
| 6 | **PRESENT** | QA, build test, deliver browser preview |

## Tech Stack (Default)

- **React 18** — UI framework
- **Vite 5** — Build tool
- **Recharts** — Charting (bar, line, area, composed, radar, pie)
- **Tailwind CSS 3** — Styling (dark theme by default)
- **Lucide React** — Icons

## Visualization Types Supported

- Grouped & stacked bar charts
- Horizontal bar charts (ranked comparisons)
- Line charts (time series)
- Composed charts (bar + line overlay)
- Interactive heatmaps (large trend matrices)
- Radar charts (multi-dimensional profiles)
- Top-N ranked lists with progress bars

## Data Quality Framework

All data points are tagged with confidence tiers:

| Tier | Label | Description |
|------|-------|-------------|
| T1 | Gold | Peer-reviewed, large sample, nationally representative |
| T2 | Silver | Institutional/industry report, moderate sample |
| T3 | Bronze | Small study, self-selected sample, single source |
| T4 | Estimate | Interpolated, proxy-based, or expert judgment |

## Usage

### As a Windsurf Skill

This repo lives at `.windsurf/skills/research-visualizer/`. The `SKILL.md` file is automatically available to Cascade as an agent skill. When a user requests deep research + visualization, Cascade follows the 6-phase pipeline defined in the skill.

### Invoking the Workflow

Ask Cascade something like:

> "Do deep research on [TOPIC] and build an interactive dashboard visualizing [DIMENSIONS]"

The skill guides the agent through scoping, researching, data compilation, app scaffolding, visualization, and delivery.

## Example Output

The first dashboard built with this skill was a **Sexual Trends Research Dashboard** covering:

- Average sexual partners by generation × gender (excl/incl adult industry)
- Pornstar demographics (counts, career length, age ranges by generation)
- Cam performer demographics (counts, revenue by percentile, career stats)
- Health outcomes (mental, physical, long-term — 3-group comparison)
- Sexual trends/kinks heatmaps (30 trends × 6 generations × 3 groups × 2 genders)
- Appearance/accessory trends heatmaps (30 items × same dimensions)
- Divorce rates (by generation, occupation group, gender, over time)
- Sources & methodology (19 academic citations + limitations)

## Complementary Tools

- **[PaperBanana](https://paperbanana.org/)** — For publication-quality static academic figures. Handles last-mile figure rendering (text → polished diagram). Complementary to this workflow which handles the full research-to-dashboard pipeline. See Appendix E in `SKILL.md`.

## License

MIT
