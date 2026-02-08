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
