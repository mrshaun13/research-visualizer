# Extension Registry

Extensions are pluggable specializations that augment the core research-visualizer pipeline. Each extension activates when trigger patterns match the user's prompt, then provides phase-specific instructions that override or augment the standard pipeline behavior.

## Installed Extensions

| Extension | Slug | Mode | Triggers | Data Source |
|---|---|---|---|---|
| [Product/Purchase Comparison](product-purchase/EXTENSION.md) | `product-purchase` | bespoke | buy, purchase, compare products, best X for | internet |

---

## Two Output Modes

Extensions declare one of two output modes that determine how results are built into the Research Hub:

### Bespoke Mode (`output_mode: bespoke`)

Each run produces a **unique React component tree** — a full project with its own `App.jsx`, `components/`, `data/`, and `meta.json`. This is the default mode and matches the standard research pipeline output.

- **Best for:** Diverse research topics, product comparisons, exploratory analysis — anything where each output is structurally unique.
- **Scale:** ~50-100 projects (practical limit for a single hub).
- **Hub display:** Individual entries in the sidebar "My Research" list, full project cards on the home page.

### Template Mode (`output_mode: template`)

Each run produces a **single JSON data file** that feeds into a shared React template component. The template is installed once; subsequent runs only add new data files.

- **Best for:** Structured reports at volume — incident reviews, sprint analyses, log pattern reports, ticket summaries. Anything where every output has the same shape.
- **Scale:** 10,000+ items per collection.
- **Hub display:** Collapsible collection groups in the sidebar, sortable/filterable table views on the home page.

See [collections-architecture.md](../references/collections-architecture.md) for the full template-mode specification.

---

## Extension Manifest Format

Every extension has an `EXTENSION.md` file with YAML frontmatter:

```yaml
---
name: Human-Readable Extension Name
slug: kebab-case-directory-name
version: "1.0"
output_mode: bespoke                    # "bespoke" (default) or "template"
triggers:
  explicit: ["keyword1", "keyword2"]    # Direct intent signals in the user's prompt
  implicit: ["term1", "term2"]          # Indirect signals (mentions of related concepts)
  context: "One-sentence description of when this extension should activate"
data_source: internet                   # Where the extension gets its data (see below)
pipeline_hooks: ["1B", "2", "3", "4", "5", "6", "7"]  # Which phases it modifies
custom_checkpoint: true                 # Whether it provides a custom Phase 3D checkpoint format
custom_viz_template: true               # Bespoke: custom build patterns | Template: ships Template.jsx
---
```

### Template-Mode Additional Fields

Template-mode extensions include extra frontmatter fields:

```yaml
template_component: Template.jsx        # Filename of the shared React component (in extension dir)
data_schema: schema.json                # Filename of the data contract (in extension dir)
collection_name: Incident Reviews       # Display name for the collection in the hub
collection_icon: AlertTriangle          # Lucide icon name
collection_accent: red                  # Tailwind color name
```

### Data Source Types

| Value | Description | Example |
|---|---|---|
| `internet` | Web search + URL fetching (default research pipeline) | Product comparisons, general research |
| `mcp-<name>` | Data from an MCP server (comma-separate multiple) | `mcp-servicenow, mcp-splunk` |
| `api` | Direct API calls (extension provides endpoints/auth) | Internal dashboards, SaaS integrations |
| `local` | Local files or databases | Log files, CSV imports |
| Mixed | Combine any of the above | `internet, mcp-confluence` |

---

## Pipeline Hooks

Extensions modify the standard pipeline by hooking into specific phases. Three hook types:

### Augment
Add instructions **alongside** the standard phase behavior. The standard steps still run; the extension adds more.

**Example:** A product extension augments Phase 2 SURVEY with product-specific search patterns while the standard broad searches still execute.

### Override
**Replace** the standard phase behavior entirely. The standard steps do NOT run for that phase.

**Example:** A template-mode extension overrides Phase 6 BUILD to output JSON data files instead of React components.

### Inject
Add an **entirely new phase** that doesn't exist in the standard pipeline.

**Example:** Phase 1B PRODUCT CLASSIFY is injected by the product-purchase extension — it runs between Phase 1 and Phase 2 and doesn't exist for standard research.

Extensions declare their hook type per phase in the body of `EXTENSION.md` using section headers like:

```markdown
## Phase 2: SURVEY (augment)
## Phase 6: BUILD (override)
## Phase 1B: PRODUCT CLASSIFY (inject)
```

---

## Creating an Extension

### Step 1: Create the Extension Directory

```
extensions/
└── your-extension/
    ├── EXTENSION.md              # Required: manifest + phase instructions
    ├── Template.jsx              # Template mode only: shared React component
    ├── schema.json               # Template mode only: data contract
    └── references/               # Optional: additional reference files
        └── your-reference.md
```

### Step 2: Write the Manifest

Fill in the YAML frontmatter in `EXTENSION.md` with your extension's metadata, triggers, data source, and pipeline hooks.

### Step 3: Write Phase Instructions

For each phase your extension hooks into, write a section in `EXTENSION.md` with the hook type and specific instructions:

```markdown
## Phase 1B: YOUR CLASSIFY STEP (inject)

When this extension is detected, run this classification step before Phase 2...

### Steps:
1. ...
2. ...

## Phase 2: SURVEY (augment)

In addition to the standard survey searches, also search for:
- "[your domain] specific query"
- ...

## Phase 6: BUILD (override)

Instead of the standard bespoke build, output a JSON data file...
```

### Step 4: Define the Data Contract (Template Mode Only)

Create `schema.json` defining:
- `requiredSections` — top-level keys every item JSON must have
- `columns` — fields to display in the hub's collection table view (with sortable/filterable flags)
- `filterPresets` — named filter configurations for quick access

### Step 5: Build the Template Component (Template Mode Only)

Create `Template.jsx` — a React component that receives `{ data }` as a prop (the full item JSON) and renders the visualization. Use the same tech stack as the hub (React, Recharts, Tailwind, Lucide).

The template is copied verbatim to the hub during first-run collection setup. It must be self-contained — no imports from the extension directory at runtime.

### Step 6: Register the Extension

Add an entry to the table at the top of this file (`registry.md`).

### Step 7: Test

1. Invoke the skill with a prompt that matches your trigger patterns
2. Verify the extension activates in Phase 1 INTERPRET
3. Verify each hooked phase executes your instructions
4. Verify the output renders correctly in the hub

---

## Extension Examples

### Bespoke Mode: Product/Purchase Comparison (installed)

```yaml
---
name: Product/Purchase Comparison
slug: product-purchase
version: "1.0"
output_mode: bespoke
triggers:
  explicit: ["buy", "purchase", "looking for", "which should I get", "help me choose", "best * for"]
  implicit: ["brands", "models", "price range", "compare [products]"]
  context: "any request where the end goal is selecting a product to acquire"
data_source: internet
pipeline_hooks: ["1B", "2", "3", "4", "5", "6", "7"]
custom_checkpoint: true
custom_viz_template: true
---
```

### Template Mode: Incident Review Analyzer (example — not installed)

```yaml
---
name: Incident Review Analyzer
slug: incident-review
version: "1.0"
output_mode: template
template_component: Template.jsx
data_schema: schema.json
collection_name: Incident Reviews
collection_icon: AlertTriangle
collection_accent: red
triggers:
  explicit: ["analyze incident", "INC review", "incident summary", "post-incident"]
  implicit: ["INC", "incident", "outage", "root cause"]
  context: "any request to analyze, summarize, or review a service incident"
data_source: mcp-servicenow, mcp-splunk, pcc-analyst, webex-messaging
pipeline_hooks: ["1B", "2", "3", "4", "5", "6", "7"]
custom_checkpoint: true
custom_viz_template: true
---
```

### Template Mode: Jira Sprint Analyzer (example — not installed)

```yaml
---
name: Jira Sprint Analyzer
slug: sprint-analyzer
version: "1.0"
output_mode: template
template_component: Template.jsx
data_schema: schema.json
collection_name: Sprint Analyses
collection_icon: BarChart3
collection_accent: blue
triggers:
  explicit: ["analyze sprint", "sprint report", "sprint review"]
  implicit: ["sprint", "velocity", "burndown", "carry-over"]
  context: "any request to analyze or report on a Jira sprint"
data_source: mcp-atlassian
pipeline_hooks: ["1B", "2", "3", "4", "5", "6", "7"]
custom_checkpoint: true
custom_viz_template: true
---
```
