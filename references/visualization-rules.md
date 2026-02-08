# Visualization Auto-Selection Rules

These rules are DETERMINISTIC — the same data shape always produces the same chart type.

## Data Shape → Chart Type Mapping

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

## Color Palette Template

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

## Design Principles

- **Dark theme:** bg-gray-950, text-gray-100
- **Consistent color palette:** Define COLORS constant, use everywhere
- **Responsive:** All charts in `<ResponsiveContainer width="100%" height={N}>`
- **Interactive:** Tooltips, hover states, filter toggles
- **Annotated:** Every chart has title, subtitle, and insight callout
