# Build Templates & File Structure

## Default Tech Stack

- **React 18** — component framework
- **Vite 5** — build tool (fast dev server, instant HMR)
- **Recharts** — charting library (bar, line, area, composed, radar, pie)
- **Tailwind CSS 3** — utility-first styling (dark theme default)
- **Lucide React** — icon library

## File Structure: Standard (<6 sections)

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

## File Structure: Large (>6 sections)

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
    ├── components/
    │   ├── Heatmap.jsx
    │   ├── CustomTooltip.jsx
    │   ├── InsightCallout.jsx
    │   └── [SectionName].jsx
    └── data/
        ├── [dimension1].js
        ├── [dimension2].js
        └── sources.js
```

## Data Schema Templates

### Bar chart data
```javascript
[{ label: 'Group A', metric1: number, metric2: number }, ...]
```

### Heatmap data
```javascript
{ rowLabels: ['Period 1', ...], colLabels: ['Item A', ...], data: [[val, ...], ...] }
```

### Time series data
```javascript
[{ year: number, value: number }, ...]
```

Use `null` for missing data (never 0 for missing).

## Reusable Components

1. **CustomTooltip** — dark themed, shows all payload values
2. **Heatmap** — interactive, color-scaled, hover detail panel
3. **InsightCallout** — colored box with key finding text
4. **GlossaryTerm** — inline term with dotted underline, click-to-open flyout with definition + research prompt

### GlossaryTerm Component

Renders an inline term with a subtle dotted underline. On click, opens a flyout card with a plain-language definition and a copy-paste research prompt.

**Props:**
- `term` (string) — the glossary key to look up in `glossaryTerms` data
- `children` (ReactNode) — the inline display text (usually the term itself)
- `accentColor` (string, optional) — Tailwind color name, defaults to project accent

**Flyout card contents:**
- Term name (bold)
- Definition (1-2 sentences, plain language)
- "Research this →" button — copies `researchPrompt` to clipboard, shows "Copied!" for 2s

**Styling:**
- Idle: `border-b border-dotted` at 40% accent opacity, `cursor-pointer`
- Hover: solid underline, subtle background highlight (`bg-{accent}-500/10`)
- Flyout: `absolute z-50`, dark card (`bg-gray-800 border border-gray-700 rounded-lg shadow-xl`), max-width 320px, `p-4`
- Auto-position: flip above term if flyout would overflow viewport bottom
- Dismiss: click outside (use `useEffect` with document click listener), Escape key, or click another term

**Data file (`data/glossaryTerms.js`):**
```javascript
export const glossaryTerms = {
  "TERM": {
    definition: "Plain-language explanation in 1-2 sentences.",
    researchPrompt: "Research [topic]: [expanded framing for a rich dashboard]"
  }
};
```

**Usage in section components:**
```jsx
import { GlossaryTerm } from './GlossaryTerm';
import { glossaryTerms } from '../data/glossaryTerms';

// In JSX:
<p>The platform provides an <GlossaryTerm term="SDK">SDK</GlossaryTerm> for developers.</p>
```

## App Layout Pattern

- Sidebar navigation with icons per section
- Active section state management via `useState`
- Filter controls where needed (group, gender, time toggles)
- Each section: title + subtitle + 1-3 chart cards + insight callout

## File Writing Fallback

If `write_to_file` tool doesn't persist reliably, use shell heredoc:
```bash
cat > /path/to/file.js << 'ENDOFFILE'
contents
ENDOFFILE
```
Always verify with `ls -la` after writing.
