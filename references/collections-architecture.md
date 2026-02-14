# Collections Architecture (Template Mode)

Collections are the output format for **template-mode extensions**. Instead of producing a unique React component tree per run (bespoke mode), template-mode extensions produce JSON data files that feed into a shared React template component. The template is installed once; subsequent runs only add new data files.

## When to Use Template Mode

Template mode is designed for **high-volume, identically structured outputs**:
- Incident reviews (INC-0012345, INC-0012346, ...)
- Sprint analyses (Sprint 47, Sprint 48, ...)
- Log pattern reports, ticket summaries, audit reports
- Any workflow where every output has the same shape but different data

**Rule of thumb:** If you'd produce 10+ items with the same dashboard layout, use template mode. If each output is structurally unique, use bespoke mode.

## Collection Directory Structure

```
<hubPath>/src/collections/<extension-slug>/
├── Template.jsx              # Shared React component (copied from extension)
├── manifest.json             # Lightweight registry of all items
├── schema.json               # Data contract (copied from extension)
└── items/
    ├── inc-0012345.json      # Item data files
    ├── inc-0012346.json
    └── ...                   # Scales to 1000+
```

## manifest.json

The manifest is the lightweight registry for a collection — analogous to `projects/index.js` for bespoke projects. It contains only the metadata needed for sidebar listing, search, and table rendering.

```json
{
  "extension": "incident-review",
  "extensionVersion": "1.0",
  "collectionName": "Incident Reviews",
  "collectionIcon": "AlertTriangle",
  "collectionAccent": "red",
  "itemCount": 347,
  "items": [
    {
      "slug": "inc-0012345",
      "title": "CDN Cache Purge Failure — US-East",
      "subtitle": "P1 · 47min TTR · 2026-02-10",
      "createdAt": "2026-02-10T14:30:00Z",
      "tags": ["cdn", "cache", "us-east"],
      "searchText": "CDN cache purge failure US-East P1 resolved infrastructure"
    }
  ]
}
```

### Required Item Fields

| Field | Type | Description |
|---|---|---|
| `slug` | string | URL-safe identifier for the item (kebab-case) |
| `title` | string | Display title for sidebar and table |
| `subtitle` | string | Short description (shown under title) |
| `createdAt` | ISO 8601 | When the item was created |
| `searchText` | string | Concatenated searchable text for Fuse.js indexing |

Extensions may add custom fields (e.g., `severity`, `status`, `ttr`, `team`) documented in their `EXTENSION.md`. These custom fields can be used for table columns and filter presets defined in `schema.json`.

### Scale Characteristics

| Items | Manifest Size | Load Time | Notes |
|---|---|---|---|
| 100 | ~5 KB | Instant | No optimization needed |
| 1,000 | ~50 KB | Instant | Fuse.js index builds in <100ms |
| 5,000 | ~250 KB | <500ms | Consider virtual scrolling in sidebar |
| 10,000+ | ~500 KB+ | ~1s | Split manifest into chunks or paginate API |

## schema.json (Sole Data Contract)

The schema defines the structure of item JSON files and how the hub should render collection views. This is the **single source of truth** for the data contract — `EXTENSION.md` describes pipeline behavior only, never data shape.

```json
{
  "version": "1.0",
  "requiredSections": [
    "summary",
    "timeline",
    "rootCause",
    "impact",
    "remediation",
    "telemetry"
  ],
  "columns": [
    { "key": "title", "label": "Incident", "sortable": true, "width": "flex" },
    { "key": "severity", "label": "Severity", "sortable": true, "filterable": true, "width": "80px" },
    { "key": "ttr", "label": "TTR", "sortable": true, "width": "80px", "format": "duration" },
    { "key": "team", "label": "Team", "sortable": true, "filterable": true, "width": "120px" },
    { "key": "createdAt", "label": "Date", "sortable": true, "width": "120px", "format": "date" }
  ],
  "filterPresets": [
    { "name": "P1 Only", "filters": { "severity": "P1" } },
    { "name": "This Month", "filters": { "createdAt": { "gte": "startOfMonth" } } },
    { "name": "My Team", "filters": { "team": "platform-sre" } }
  ]
}
```

### Schema Fields

| Field | Type | Description |
|---|---|---|
| `version` | string | Schema version |
| `requiredSections` | string[] | Top-level keys every item JSON must have |
| `columns` | object[] | Fields to display in the hub's collection table view |
| `columns[].key` | string | Field path in item JSON (or manifest item) |
| `columns[].label` | string | Display header |
| `columns[].sortable` | boolean | Whether the column is sortable |
| `columns[].filterable` | boolean | Whether the column appears in filter dropdowns |
| `columns[].width` | string | CSS width (e.g., "80px", "flex") |
| `columns[].format` | string | Optional display format: "date", "duration", "number" |
| `filterPresets` | object[] | Named filter configurations for quick access |

## Template.jsx

The shared React component that renders individual items. Lives at `extensions/<slug>/Template.jsx` in the skill repo and is **copied verbatim** to `src/collections/<slug>/Template.jsx` in the hub during first-run collection setup.

### Contract

```jsx
export default function Template({ data }) {
  // `data` is the full parsed item JSON file
  // Use the same tech stack: React, Recharts, Tailwind, Lucide
  return (
    <div className="...">
      {/* Render the item */}
    </div>
  );
}
```

### Rules

- **Deterministic:** The template is copied verbatim — no agent generation, no variance between runs.
- **Self-contained:** No imports from the extension directory at runtime. All dependencies must be available in the hub's `package.json` (React, Recharts, Tailwind, Lucide).
- **Responsive:** Must work at all viewport sizes (the hub shell handles the sidebar; the template fills the main content area).
- **Dark theme:** Consistent with the hub's `bg-gray-950` dark theme.

## Hub Config Changes

Collections are registered in `hub-config.json` alongside projects:

```json
{
  "version": "3.0",
  "projects": [ ... ],
  "collections": [
    {
      "extensionSlug": "incident-review",
      "collectionName": "Incident Reviews",
      "icon": "AlertTriangle",
      "accentColor": "red",
      "itemCount": 347,
      "installedAt": "2026-02-10T14:00:00Z",
      "lastUpdated": "2026-02-12T16:12:00Z",
      "visibility": "personal"
    }
  ]
}
```

### Collection Config Fields

| Field | Type | Description |
|---|---|---|
| `extensionSlug` | string | Matches the extension's `slug` and the directory name under `src/collections/` |
| `collectionName` | string | Display name for the collection in the hub |
| `icon` | string | Lucide icon name |
| `accentColor` | string | Tailwind color name |
| `itemCount` | number | Current number of items in the collection |
| `installedAt` | ISO 8601 | When the collection was first set up |
| `lastUpdated` | ISO 8601 | When the last item was added or updated |
| `visibility` | string | Same three tiers as projects: `"local"`, `"personal"`, `"public"` |

## Hub Rendering

### Sidebar

Collections appear as **collapsible groups** below bespoke projects in the sidebar:

```
── My Research ──────────────
  🧠 AI Developer Tooling Adoption
  📱 Pixel 9 Pro Upgrade Analysis
  🧭 Career Pivot Explorer
  ...

── Incident Reviews (347) ──
  [Search incidents...]
  ⚠️ CDN Cache Purge Failure
  ⚠️ Auth Service Timeout
  ⚠️ DB Replication Lag
  ... (paginated, 20/page)

── Sprint Analyses (24) ────
  [Search sprints...]
  📊 Sprint 48 Review
  📊 Sprint 47 Review
  ...
```

- **Collapsed by default** — shows collection name + item count
- **Expanded** — shows internal search bar (Fuse.js on `searchText`) + paginated item list (20 items/page, sorted by `createdAt` desc)
- **Active indicator** — same highlight style as bespoke projects

### Home Page

Collections section appears below "My Research" on the hub home page:

- **Collection cards** — compact cards showing collection name, icon, item count, last updated, accent color
- **Click → collection list view** — sortable/filterable table with columns from `schema.json`
- **Click item in table → item detail view** — Template.jsx loaded once, item JSON fetched on demand

### Routing

The hub maintains `activeCollection` and `activeItem` state alongside the existing `activeProject`:

```
/                                    → Hub home
/<project-slug>                      → Bespoke project view
/collections/<ext-slug>              → Collection list/table view
/collections/<ext-slug>/<item-slug>  → Item detail view (Template + data)
```

When viewing an item:
1. Load `Template.jsx` once (React lazy import)
2. Fetch item JSON via dynamic `import()` or `fetch()`
3. Pass parsed JSON as `data` prop to Template

### Search

- **No separate search-index.json** — Fuse.js builds its index in-memory from `manifest.json` `items[].searchText` at collection load time
- At 1000 items (~50KB manifest), index build is <100ms
- Search input in the sidebar filters the item list in real-time
- Collection table view has its own search bar + column filters from `schema.json`

## First-Run Collection Setup

When the agent runs a template-mode extension for the first time:

1. **Copy `Template.jsx`** from `extensions/<slug>/Template.jsx` → `src/collections/<slug>/Template.jsx`
2. **Copy `schema.json`** from `extensions/<slug>/schema.json` → `src/collections/<slug>/schema.json`
3. **Create `manifest.json`** with extension metadata and empty `items` array
4. **Create `items/` directory**
5. **Add collection entry** to `hub-config.json` `collections` array
6. **Proceed to write first item** (Phase 6 template-mode steps 3-7)

## Adding Items (Subsequent Runs)

After the collection is installed, each run:

1. **Generate item slug** from the item identifier
2. **Write item JSON** to `items/<slug>.json`
3. **Append item entry** to `manifest.json` `items` array
4. **Increment `itemCount`** and update `lastUpdated` in `hub-config.json`

## Library Contribution (Template Mode)

Template-mode collections can be shared to libraries using the same GitHub API flow as bespoke projects. The entire collection directory is pushed:

- `Template.jsx`, `schema.json`, `manifest.json`, and all `items/*.json`
- Library slug: `<ext-slug>-<gitUsername>` (e.g., `incident-review-mrshaun13`)

For incremental updates (adding new items to an already-shared collection), only the new item files and updated manifest need to be pushed.

## Visibility

Collection-level visibility (not per-item). Same three tiers as bespoke projects:

| Tier | Files location |
|---|---|
| **Local** | `src/local-collections/<ext-slug>/` (gitignored) |
| **Personal** | `src/collections/<ext-slug>/` (committed) |
| **Public** | `src/collections/<ext-slug>/` (committed + shared) |

See [hub-visibility.md](hub-visibility.md) for the full visibility system.

## Edge Cases

| Situation | How to Handle |
|---|---|
| Collection directory exists but manifest is corrupted | Rebuild manifest from item files in `items/` directory |
| Item slug already exists in collection | Overwrite the existing item JSON, update manifest entry |
| Template.jsx in extension is updated (new version) | On next run, compare extension version in manifest vs extension. If different, copy new Template.jsx and note the update. |
| Collection has 10,000+ items | Consider manifest splitting: `manifest-0.json`, `manifest-1.json` (1000 items each). Hub loads manifests on demand as user scrolls. |
| User deletes items manually | Rebuild manifest from remaining item files on next agent run |
| Hub has no collections configured | Collections section in sidebar and home page simply doesn't render (empty array, hidden section) — same graceful degradation as libraries |
