# Research Visualizer

An intelligent agentic AI skill that takes a simple research topic and autonomously discovers dimensions, metrics, subgroups, and taxonomies — then produces a polished interactive web dashboard with statistical visualizations.

Supports a **pluggable extension system** with two output modes: **bespoke** (unique React dashboards) and **template** (shared component + JSON data for high-volume structured reports). Extensions auto-detect from user prompts and augment the pipeline with domain-specific logic. The first extension — **Product/Purchase Comparison** — auto-detects purchase intent and scaffolds comprehensive product comparison dashboards.

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
ENVIRONMENT CHECK → INTERPRET → SURVEY → DISCOVER → RESEARCH → ANALYZE → BUILD → PRESENT
       ↓                ↓                               ↓
  Hub exists?       Extension?                   User Checkpoint
    ↓ no               ↓ yes                    (lightweight approval)
  FIRST-TIME SETUP  Extension Phase 1B
                      (inject: classify, scope, configure)
```

| Phase | What Happens | User Effort |
|-------|-------------|-------------|
| **ENVIRONMENT CHECK** | Detects existing Research Hub install or walks through first-time setup | None (or pick install location once) |
| **INTERPRET** | Parses natural language into topic, populations, time scope, research lenses. Scans for extension triggers. | None |
| **SURVEY** | Broad literature scan — finds major studies, datasets, known dimensions | None |
| **DISCOVER** | Finds meaningful subgroups, core metrics, domain taxonomies (25-30 items per category) | None |
| *Checkpoint* | *Agent presents: "Here's what I found. Here's my plan. Proceed?"* | *"Yes" or adjust* |
| **RESEARCH** | Deep data gathering with source triangulation and quality tiers | None |
| **ANALYZE** | Identifies key findings, auto-selects chart types from data shape | None |
| **BUILD** | Builds project into the Research Hub — no new servers, no new installs | None |
| **PRESENT** | QA, build test, refresh browser or start hub server | Review |

## Example

### General Research

**What you type:**
> Research the rise and fall of shopping malls in America

**What the agent discovers on its own:**
- Subgroups: enclosed malls vs strip malls vs outlet centers (>20% difference on vacancy rates → meaningful split)
- Time axis: inflection-point eras (suburban boom, peak mall era, e-commerce disruption, COVID acceleration)
- Core metrics: total count, vacancy rates, revenue per sq ft, foot traffic, anchor tenant occupancy
- Taxonomies: 15 retail categories, 10 anchor store chains, regional distribution patterns
- Visualization types: bar charts, heatmaps, composed charts, horizontal bars, line charts

**What you get:**
An 8-section interactive dashboard with ~20 charts, heatmaps, filters, insight callouts, and full source citations.

### Product Comparison

**What you type:**
> I'm looking to buy an espresso machine for home use

**What the agent discovers on its own:**
- Lifecycle: Semi-Durable (1–5 years) → triggers partial TCO, Ecosystem analysis
- Market tiers: Manual, Semi-Automatic, Super-Automatic (discovered from buyer's guides)
- Key specs: boiler type, brew pressure, grinder type, water reservoir, steam wand, dimensions, weight
- Derived metrics: cost per cup over 3 years, brew time per shot
- 14 models across 5 brands with full specs, pros/cons, verdicts
- Purchase links, retailer ratings, community sentiment

**What you get:**
An 8-section dashboard with sortable comparison table, scatter plots, cost analysis with 3-year TCO, features matrix, curated recommendations with award categories, and per-product detail pages with purchase links.

## Research Hub — Multi-Project Management

Every research dashboard you create lives in a single **Research Hub** — one web app, one server, one port. No more juggling multiple dev servers or reinstalling dependencies for each topic.

### How It Works

- **First run**: The skill detects it's your first time, asks where to install the hub (default: `~/git/personal-research-hub/`), scaffolds the app, and installs dependencies once.
- **Every run after**: The skill finds your existing hub in under 2 seconds, builds the new research directly into it, and tells you to refresh your browser. That's it.

### Public Library & Architecture Docs

Once you set up your personal hub, the skill can connect you to the **[Community Research Hub](https://github.com/mrshaun13/research-hub)** — a public library of community-contributed research dashboards. After pulling the public library:

- **Browse shared research** — explore dashboards built by other users, read-only
- **Contribute your own** — share any of your projects to the library with a single visibility change
- **Learn how the skill works** — the public library repository includes the complete **Research Visualizer v7 architecture documentation**, covering the extension system, pipeline phases, hub config schema, telemetry format, visibility tiers, contribution flow, and collections architecture. If you want to understand how the skill builds dashboards or how to create your own extensions, it's all there.

### The Experience

The hub provides a **ChatGPT-style interface**:

- **Collapsible sidebar** on the left lists all your research projects, sorted newest-first
- **Search** across project titles and original queries
- **Home page** shows all projects as cards with title, description, research lens badge, and the original query you asked
- **Click any project** to dive into its full interactive dashboard — each project retains its own internal navigation, charts, and filters
- **One port (5180)** — bookmark it, it never changes

### Dive Deeper with Your AI Agent

The hub isn't just a viewer — it's a launchpad. Since every project's data and components live in a structured directory under the hub, you can ask your AI agent to:

- **Add sections** to an existing research project ("Add a noise-level comparison to my espresso machine dashboard")
- **Update data** when new information is available ("Update the pricing in my laptop comparison")
- **Cross-reference** between projects ("How does the Cisco acquisition timeline compare to...")
- **Extend analysis** with new dimensions you didn't think of initially

The agent knows where everything lives because the hub's `hub-config.json` tracks every project with its slug, path, original query, and research lens.

### Config & Detection (Two-Layer)

| File | Location | Purpose |
|------|----------|--------|
| `config.json` | `~/.codeium/windsurf/skills/research-visualizer/config.json` | Machine-local pointer — contains only `personalHubPath` |
| `hub-config.json` | `<personalHubPath>/hub-config.json` | Portable config (git-synced) — port, libraries, projects, collections |
| `.local-config.json` | `<personalHubPath>/.local-config.json` | Machine-local (gitignored) — library paths for Vite aliases |
| `projects/index.js` | `<personalHubPath>/src/projects/index.js` | Runtime registry — lightweight metadata + lazy imports (no telemetry) |
| `<slug>/meta.json` | `<personalHubPath>/src/projects/<slug>/meta.json` | Per-project telemetry (lazy-loaded by hub UI on demand) |
| Project files | `<personalHubPath>/src/projects/<slug>/` | Each project's App.jsx, components/, data/, and meta.json |
| Collection files | `<personalHubPath>/src/collections/<ext-slug>/` | Template mode: Template.jsx, manifest.json, schema.json, items/ |

### Project Telemetry

Every research project automatically captures telemetry about its creation — not about the research content, but about the research *process*. This metadata is displayed on the hub home page so you can see at a glance how each project was built.

**Per-project stats shown on cards:**

*Impact & Accessibility:*
- **Hours saved** (highlighted) — estimated manual effort to produce the same research + dashboard, with human-readable equivalent (e.g., "~3 weeks full-time"). Includes breakdowns for alternative output formats (white paper, blog post, RFC, presentation, GitHub repo)
- **Flesch-Kincaid grade level** — readability score for all dashboard text content (e.g., "9th Grade", "College")
- **Bloom's Taxonomy level** — cognitive depth of the content (Remember → Understand → Apply → Analyze → Evaluate → Create), color-coded by level
- **Time to consume** — estimated reading time for a human to fully absorb all content, adjusted for readability level and chart exploration time

*Build metrics:*
- **AI build time** — how long the full pipeline took from prompt to dashboard
- **Web searches** — total searches performed across all phases
- **Sources cited** — unique sources referenced in the final dashboard
- **Charts built** — number of individual visualizations
- **Sections** — dashboard sections created
- **Products compared** — product count (Product lens only)
- **Skill version** — which version of the skill produced this research
- **Setup badge** — whether the hub was first installed during this run
- **LLM model** — which model powered the research (when detectable)

**Aggregate stats in the hero section:**
- Total hours saved across all projects (highlighted in green)
- Total AI build time, web searches, sources, charts, data points, and products compared

**Also captured in meta.json (not displayed on cards):**
- **Original prompt** — the exact text you typed to trigger the skill
- **Research plan** — the full checkpoint text you approved before the build
- **Checkpoint modified** — whether you requested changes at the checkpoint
- **Phase timing breakdown** — per-phase duration (environment, interpret, survey, discover, research, analyze, build, present)
- **Data points collected** — approximate count of individual data values gathered
- **Files generated** — total files written to the project directory
- **Token usage** — approximate tokens consumed (when available from runtime)
- **Hours saved by format** — estimated production hours for each alternative output format (white paper, blog post, technical doc, presentation, GitHub repo)
- **Consumption time breakdown** — reading minutes, chart exploration minutes, interactive overhead minutes
- **Content analysis details** — total words, total sentences, Bloom's range, readability note

## Key Intelligence Features

### Subgroup Discovery
The agent doesn't require you to know that "enclosed malls" and "strip malls" tell fundamentally different stories. It discovers this during research by checking if subgroups differ by >20% on key metrics. If they do, it splits them. If not, it keeps them merged.

### Taxonomy Discovery
You don't need to list 15 retail categories or 10 anchor store chains. The agent searches for existing academic taxonomies, industry classifications, and survey instruments, then cross-references them into a unified list of 25-30 items per category.

### Standard Research Dimensions
Built-in methodology frameworks automatically include the right dimensions based on topic type:
- **Population studies** → demographics, health, economic, social outcomes
- **Behavior studies** → prevalence, taxonomy, frequency, outcomes
- **Industry studies** → market size, revenue distribution, worker conditions
- **Culture studies** → shifting attitudes across eras, media representation, public opinion
### Extension System

Specialized workflows are handled by pluggable extensions that auto-detect from user prompts:

- **Bespoke mode** (default) — each run produces a unique React component tree (full project with App.jsx, components/, data/, meta.json)
- **Template mode** — each run produces a JSON data file that feeds into a shared React template component, scaling to 10,000+ items per collection

Extensions hook into pipeline phases with three strategies: **augment** (add alongside standard behavior), **override** (replace standard behavior), or **inject** (add new phases like 1B).

**Installed extensions:**
- **Product/Purchase Comparison** (bespoke) — auto-detects purchase intent, classifies product lifecycle, and scaffolds comparison dashboards with specs, pricing, recommendations, and purchase links

**Example future extensions:**
- **Incident Review Analyzer** (template) — analyzes service incidents from ServiceNow/Splunk/PCC into structured review dashboards
- **Sprint Analyzer** (template) — generates sprint analysis reports from Jira data

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
├── SKILL.md                              # Core pipeline instructions (v7.0)
├── README.md                             # This file
├── config.json                           # Machine-local pointer (personalHubPath only, created on first run)
├── extensions/                           # Pluggable specializations
│   ├── registry.md                       # Extension catalog + builder guide
│   └── product-purchase/                 # First extension (bespoke mode)
│       ├── EXTENSION.md                  # Product-specific pipeline logic
│       └── references/
│           └── product-comparison-template.md
└── references/                           # Core reference files
    ├── hub-architecture.md               # Core config schema, directory structure, project registry
    ├── hub-contribution.md               # Library contribution flow, GitHub API, security model
    ├── hub-visibility.md                 # Visibility tiers, set-visibility API, UI badges
    ├── collections-architecture.md       # Template mode: collections, manifest, schema, rendering
    ├── hub-scaffold-templates.md         # Hub React component templates
    ├── research-dimensions.md            # Standard Research Dimensions Framework
    ├── visualization-rules.md            # Chart type auto-selection rules + color palette
    ├── subgroup-discovery.md             # Split decision matrix + taxonomy search templates + data quality tiers
    └── build-templates.md                # Tech stack, file structures, data schemas, component patterns
```

Follows the [agentskills.io specification](https://agentskills.io/specification):
- SKILL.md under 500 lines with progressive disclosure via reference files
- Reference files loaded on-demand, not at activation
- Extensions loaded only when trigger patterns match
- Frontmatter includes `name`, `description`, `compatibility`, and `metadata`

## License

MIT
