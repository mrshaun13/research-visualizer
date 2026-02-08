# Research Visualizer

An intelligent agentic AI skill that takes a simple research topic and autonomously discovers dimensions, metrics, subgroups, and taxonomies — then produces a polished interactive web dashboard with statistical visualizations.

## The Problem This Solves

Traditional research visualization requires the user to already know:
- What subgroups exist within a population
- What metrics matter for the domain
- What domain-specific categories to track (health conditions, trend types, etc.)
- What chart types best represent their data

**That's asking the user to do the research before doing the research.**

This skill flips that. You give it a topic in plain English. It figures out the rest.

## How It Works

```
INTERPRET → SURVEY → DISCOVER → RESEARCH → ANALYZE → BUILD → PRESENT
                                    ↓
                            User Checkpoint
                       (lightweight approval)
```

| Phase | What Happens | User Effort |
|-------|-------------|-------------|
| **INTERPRET** | Parses natural language into topic, populations, time scope, research lenses | None |
| **SURVEY** | Broad literature scan — finds major studies, datasets, known dimensions | None |
| **DISCOVER** | Finds meaningful subgroups, core metrics, domain taxonomies (25-30 items per category) | None |
| *Checkpoint* | *Agent presents: "Here's what I found. Here's my plan. Proceed?"* | *"Yes" or adjust* |
| **RESEARCH** | Deep data gathering with source triangulation and quality tiers | None |
| **ANALYZE** | Identifies key findings, auto-selects chart types from data shape | None |
| **BUILD** | Scaffolds React app, builds all components, wires data | None |
| **PRESENT** | QA, build test, browser preview delivery | Review |

## Example

**What you type:**
> Research sexual behavior trends and the adult entertainment industry across American generations

**What the agent discovers on its own:**
- Subgroups: pornstars vs cam performers (>20% difference on key metrics → meaningful split)
- Time axis: generational cohorts (Silent Gen through Gen Z)
- Core metrics: sexual partners, career demographics, health outcomes, revenue
- Taxonomies: 30 sexual trends, 30 appearance/accessory items, 10+ health conditions
- Visualization types: bar charts, heatmaps, composed charts, horizontal bars, line charts

**What you get:**
An 8-section interactive dashboard with ~20 charts, heatmaps, filters, insight callouts, and full source citations.

## Key Intelligence Features

### Subgroup Discovery
The agent doesn't require you to know that "cam performers" and "pornstars" are meaningfully different. It discovers this during research by checking if subgroups differ by >20% on key metrics. If they do, it splits them. If not, it keeps them merged.

### Taxonomy Discovery
You don't need to list 30 sexual trends or 30 health conditions. The agent searches for existing academic taxonomies, platform categorizations, and survey instruments, then cross-references them into a unified list of 25-30 items per category.

### Standard Research Dimensions
Built-in methodology frameworks automatically include the right dimensions based on topic type:
- **Population studies** → demographics, health, economic, social outcomes
- **Behavior studies** → prevalence, taxonomy, frequency, outcomes
- **Industry studies** → market size, revenue distribution, worker conditions
- **Culture studies** → generational attitudes, media representation, public opinion

### Data-Driven Visualization
Chart types are selected AFTER data collection based on data shape — not prescribed by the user beforehand. The same data shape always produces the same chart type (deterministic, not random).

## Tech Stack

- **React 18** + **Vite 5** — app framework
- **Recharts** — charts (bar, line, area, composed, radar, pie)
- **Tailwind CSS 3** — dark theme styling
- **Lucide React** — icons

## Anti-Randomness Guardrails

The skill prevents inconsistent output through:
1. **Standard Research Dimensions Framework** — established methodology ensures consistent coverage
2. **Deterministic chart selection** — data shape → chart type mapping is fixed
3. **Bounded discovery** — max 3 iterations, max 5 subgroups, max 30 taxonomy items
4. **User checkpoint** — lightweight approval after discovery, before full build
5. **Narrative structure** — sections always flow: broad overview → subgroup deep-dives → comparisons → taxonomies → context → sources

## Repository Structure

```
research-visualizer/
├── SKILL.md                              # Core skill instructions (218 lines)
├── README.md                             # This file
└── references/
    ├── research-dimensions.md            # Standard Research Dimensions Framework
    ├── visualization-rules.md            # Chart type auto-selection rules + color palette
    ├── subgroup-discovery.md             # Split decision matrix + taxonomy search templates + data quality tiers
    └── build-templates.md                # Tech stack, file structures, data schemas, component patterns
```

Follows the [agentskills.io specification](https://agentskills.io/specification):
- SKILL.md < 500 lines with progressive disclosure
- Reference files loaded on-demand, not at activation
- Frontmatter includes `name`, `description`, `compatibility`, and `metadata`

## License

MIT
