# Product Comparison Template

When the **Product/Purchase lens** is detected in Phase 1, this template drives the entire dashboard scaffolding. It ensures that even a minimal user prompt like "I'm looking to buy an SUV" produces a comprehensive, data-driven product comparison dashboard.

---

## Phase 1B: Product Classification

After detecting the Product/Purchase lens, classify the product before proceeding.

### Lifecycle Tier

| Tier | Lifespan | Examples | Key Implications |
|------|----------|----------|-----------------|
| **Durable / Investment** | 5+ years | Chainsaws, vehicles, appliances, HVAC, furniture, power tools (pro-grade), musical instruments | Include TCO, Features Matrix, Avoid List, Derived Metrics, long-term maintenance analysis |
| **Semi-Durable** | 1–5 years | Phones, laptops, cameras, mid-range power tools, small appliances, gaming consoles | Include partial TCO (2-3 year), Ecosystem analysis, Use Case Matrix |
| **Consumable / Short-Life** | <1 year | Compact blowers, accessories, cables, consumables, budget tools | Skip TCO entirely, focus on Use Case Fit, Purchase Links, immediate value |

### Product Characteristic Flags

Detect these during classification — each triggers specific sections:

| Flag | Detection Signal | Triggers |
|------|-----------------|----------|
| **Ecosystem Dependency** | Product requires batteries, subscriptions, platforms, or proprietary accessories | Ecosystem Comparison section |
| **Multi-Use-Case** | Product serves 3+ distinct scenarios (e.g., PC cleaning + garage + outdoor) | Use Case Matrix + Radar Chart |
| **High Feature Density** | 6+ boolean yes/no features that differentiate products (e.g., anti-vibration, decomp valve, LED) | Features Matrix section |
| **Clear Market Tiers** | Products span obvious quality/price tiers (entry/mid/pro, economy/mid/luxury) | Tier system with badges and tier-filtered views |
| **Derived Metric Opportunity** | Two specs combine into a meaningful ratio (power÷weight, price÷performance, cost÷capacity) | Derived metric charts + scatter plots |
| **Existing User Ecosystem** | User mentions owning batteries, tools, or being in a specific brand ecosystem | Ecosystem section highlighted with "Your System" badge |

### User Profile Extraction

Even from minimal input, extract or infer:
- **Budget range** (explicit or implied by product category)
- **Use intensity** (casual/weekend vs daily/professional)
- **Experience level** (first-time buyer vs upgrading)
- **Key constraints** (weight, noise, size, brand preference, existing ecosystem)
- **Primary use case** (what will they do with it most often)

If the user provides almost nothing (e.g., "I want to buy a chainsaw"), make reasonable assumptions based on the most common buyer profile for that product and state them in the Overview InsightCallout. The user can correct at the checkpoint.

---

## Section Selection Decision Tree

### Universal Sections (ALWAYS build for product comparisons)

1. **Overview** — Market landscape, stat cards, key insight about user's profile, primary scatter plot
2. **Spec Comparison (Head-to-Head)** — Sortable/filterable table with expandable rows, bar charts for top 3-4 specs
3. **Recommendations** — Award cards, quick decision guide, multi-tier purchase options, optionally an "Avoid" list
4. **Sources & Methodology** — Data sourcing, pricing notes, disclaimers

### Conditional Sections (build when flags are set)

| Section | Build When | Example |
|---------|-----------|---------|
| **Cost Analysis / TCO** | Lifecycle = Durable or Semi-Durable | 5-year stacked bar: purchase + fuel + maintenance + consumables |
| **[Primary Metric] Deep Dive** | Always if 2+ important performance metrics exist | "Power & Performance" for chainsaws, "Airflow Analysis" for blowers |
| **[Secondary Metric] Analysis** | When a second important dimension exists | "Weight & Ergonomics" for chainsaws, "Noise Levels" for appliances |
| **Features Matrix** | High Feature Density flag | Boolean checklist table with feature score per product |
| **Use Case Fit** | Multi-Use-Case flag | Rated grid per use case + Radar chart for top contenders |
| **Ecosystem Comparison** | Ecosystem Dependency flag | Ecosystem cards with tool counts, battery ranges, costs, compatibility notes |
| **Product Detail Pages** | Always (navigated from comparison table) | Full specs, purchase links, aggregate ratings, pros/cons from reviews |

### Target: 5–8 sections total. Never fewer than 5, rarely more than 8.

---

## Standardized Product Data Schema

Every product in the data file should follow this shape. Fields marked `[conditional]` are only included when relevant to the product type.

```javascript
export const products = [
  {
    // ── Identity ──
    id: 'brand-model-variant',           // kebab-case unique ID
    name: 'Brand Model Name',            // display name
    brand: 'Brand',
    model: 'Model Name',                 // model without brand prefix
    sku: 'SKU-123',                      // manufacturer SKU if available
    
    // ── Classification ──
    tier: 'Entry / Mid / Pro',           // [conditional] market tier
    category: 'Category Name',           // [conditional] product category
    powerType: 'Gas / Battery / Corded', // [conditional] power source
    
    // ── Pricing ──
    price: 499.99,                       // primary price (MSRP or street)
    priceBare: 329.00,                   // [conditional] bare tool price
    priceKit: 499.00,                    // [conditional] kit price
    
    // ── Key Specs ──
    // Include 8-15 numeric specs relevant to the product type.
    // Name them descriptively: weight_lbs, power_hp, battery_wh, noise_db, etc.
    // Use null for unknown/not-applicable (never 0 for missing).
    
    // ── Derived Metrics ──
    // Pre-calculate 1-2 meaningful ratios:
    // powerToWeight, pricePerUnit, costPerMile, etc.
    
    // ── Boolean Features ──
    // [conditional] Include when Features Matrix is triggered.
    // antiVibration: true, ledLight: false, etc.
    
    // ── Use Case Ratings ──
    // [conditional] Include when Multi-Use-Case flag is set.
    // useCaseRatings: { USE_CASE_1: 4, USE_CASE_2: 2, ... }  // 1-5 scale
    
    // ── Qualitative ──
    bestFor: 'One-line description of ideal buyer/use case',
    prosText: 'Semicolon-separated or sentence-form pros',
    consText: 'Semicolon-separated or sentence-form cons',
    verdict: 'Editorial one-paragraph verdict',
    highlights: ['Bullet point 1', 'Bullet point 2'],  // [conditional]
    
    // ── Sourcing ──
    sources: ['Source 1', 'Source 2'],
    madeIn: 'Country',                  // [conditional]
    warranty_years: 5,                   // [conditional]
  },
];
```

### Product Details Data (separate file for deep per-product info)

```javascript
export const productDetails = {
  'product-id': {
    fullName: 'Full Official Product Name',
    manufacturerUrl: 'https://...',
    manufacturer: 'Parent Company',
    madeIn: 'Country',
    warranty: '3-year limited',
    releaseYear: 2024,
    
    // Full spec sheet (key-value pairs displayed in a table)
    specs: {
      'Spec Label': 'Value with units',
      // ... 10-20 specs
    },
    
    // Where to buy
    purchaseLinks: [
      { retailer: 'Amazon', url: 'https://...', price: 99, inStock: true },
      { retailer: 'Home Depot', url: 'https://...', price: 99, inStock: true },
    ],
    
    // Aggregated ratings
    ratings: [
      { source: 'Amazon', stars: 4.5, reviewCount: 8500, url: 'https://...' },
      { source: 'Home Depot', stars: 4.7, reviewCount: 2100, url: 'https://...' },
    ],
    
    // Community sentiment
    prosFromReviews: ['Pro 1 from actual reviews', 'Pro 2', ...],
    consFromReviews: ['Con 1 from actual reviews', 'Con 2', ...],
  },
};

// Helper: aggregate ratings across sources
export const getAggregateRating = (productId) => {
  const detail = productDetails[productId];
  if (!detail?.ratings) return { avgStars: null, totalReviews: 0, sources: 0 };
  const rated = detail.ratings.filter(r => r.stars);
  if (!rated.length) return { avgStars: null, totalReviews: 0, sources: 0 };
  const totalReviews = rated.reduce((sum, r) => sum + (r.reviewCount || 0), 0);
  const weightedSum = rated.reduce((sum, r) => sum + r.stars * (r.reviewCount || 1), 0);
  const totalWeight = rated.reduce((sum, r) => sum + (r.reviewCount || 1), 0);
  return {
    avgStars: +(weightedSum / totalWeight).toFixed(1),
    totalReviews,
    sources: rated.length,
  };
};
```

---

## Universal Component Patterns

### 1. App Shell

```
┌──────────────────────────────────────────────────┐
│ ┌──────────┐  ┌──────────────────────────────┐   │
│ │ Sidebar   │  │ Main Content                 │   │
│ │           │  │                              │   │
│ │ 🔧 Title  │  │  <ActiveSection />           │   │
│ │ subtitle  │  │                              │   │
│ │           │  │                              │   │
│ │ ● Overview│  │                              │   │
│ │ ○ Specs   │  │                              │   │
│ │ ○ Cost    │  │                              │   │
│ │ ○ Recs    │  │                              │   │
│ │ ○ Sources │  │                              │   │
│ │           │  │                              │   │
│ │ ───────── │  │                              │   │
│ │ N models  │  │                              │   │
│ │ N brands  │  │                              │   │
│ │ Data date │  │                              │   │
│ └──────────┘  └──────────────────────────────┘   │
└──────────────────────────────────────────────────┘
```

- Dark theme: `bg-gray-950` or `bg-slate-900`
- Sidebar: fixed/sticky, 256px wide, collapsible on mobile
- Active section highlighted with accent color + border
- Footer shows product count, brand count, data freshness date
- Mobile: hamburger menu toggle

### 2. Overview Section

**Always includes:**
- **Stat cards** (2x2 or 4-across grid): Products compared, Brands, Price range, one product-specific stat
- **Primary InsightCallout**: User profile summary + where their sweet spot is
- **Primary scatter plot**: The two most important competing metrics (price vs performance, CFM vs MPH, etc.)
- **Secondary insight**: Key takeaway from the data

**Optionally includes:**
- Radar chart (when Multi-Use-Case)
- Pie/bar for category distribution
- Gas vs Battery / Power type comparison (when relevant)

### 3. Comparison Table

**Always includes:**
- Sortable column headers (click to sort asc/desc)
- Filter controls (by tier, brand, category, power type — whichever are relevant)
- Brand color dot per row
- Expandable row detail on click
- 8-12 columns covering: name, brand, tier/category, price, top 4-5 specs, key boolean, warranty

**Expanded row shows:**
- Best For description
- Pros / Cons
- Verdict
- Link to ProductDetail page (if product details data exists)

### 4. ProductDetail Page

**Navigated from comparison table.** Full deep-dive per product:

- **Header**: Brand logo/initial, full product name, manufacturer, made-in, warranty, release year, category badge, SKU
- **Price display**: Large price, bare/kit variants
- **Aggregate rating**: Star display + total review count across sources
- **Specs table**: Two-column key-value grid of all manufacturer specs
- **Ratings breakdown**: Per-retailer star ratings with review counts and external links
- **Pros/Cons from reviews**: Two-column layout with check/X icons
- **Purchase links**: Retailer cards with price, stock status, and external link
- **Use Case Fit**: Progress bars per use case (when Multi-Use-Case)
- **Key Highlights**: Bullet list
- **Back button**: Returns to comparison table

### 5. Recommendations Section

**Always includes:**
- **Award cards** (2-column grid): Each card has icon, award title, product name, key stats, feature badges, reasoning text, pros/cons summary
- **Quick Decision Guide**: Q&A format — "Budget under $X?" → "Product Y ($Z)"
- **Multi-tier purchase options**: 2-4 strategies at different price points:
  - Option A: Best of Both Worlds (premium combo)
  - Option B: Best Value (good-enough combo)
  - Option C: Single Tool (one product does most things)
  - Option D: Ultra-Budget (cheapest viable option)

**Conditionally includes:**
- **"Think Twice" / Avoid list**: Products that look good but have hidden downsides (Durable lifecycle only)
- **Bottom Line callout**: Final editorial recommendation

### 6. InsightCallout Variants

Use throughout all sections. Support these variants:
- **info** (blue): Explanatory context, definitions, "here's what CFM vs MPH means"
- **warning** (amber): Important caveats, "the cheapest saw to BUY is often the most expensive to OWN"
- **recommendation** (emerald/green): Direct advice, "your ideal setup is..."
- **critical** (red): The #1 metric or most important finding
- **highlight** (purple): Surprising or counterintuitive findings

---

## Conditional Section Patterns

### Cost Analysis / TCO (Durable + Semi-Durable only)

- **Price comparison bar chart**: All products sorted by price, color-coded by brand
- **Value scatter**: Price vs primary performance metric (dots in upper-left = best value)
- **Price per [key metric]**: Derived value metric bar chart
- **5-Year TCO stacked bar** (Durable only): Purchase + fuel/energy + maintenance + consumables
  - Include assumptions footnote (usage hours/year, fuel costs, etc.)
- **InsightCallout**: "The value paradox" — cheapest to buy ≠ cheapest to own

### Features Matrix (High Feature Density only)

- **Feature guide**: Grid of feature name + description cards
- **Boolean matrix table**: Products as rows, features as columns, check/X icons
  - Sticky first column (product name)
  - Feature score column (N/total)
  - Color-code scores: green (8+), amber (6-7), gray (<6)
- **Feature score ranking**: Horizontal progress bars per product
- **InsightCallout**: Which features matter most for the user's use case

### Use Case Fit (Multi-Use-Case only)

- **Use case cards**: Per use case — icon, label, description, "what you need"
- **Rated grid**: All products rated 1-5 per use case, color-coded (green/amber/red)
- **Top pick callout** per use case
- **Radar chart**: Top 4-5 contenders plotted across all use cases

### Ecosystem Comparison (Ecosystem Dependency only)

- **Ecosystem cards**: Per ecosystem — name, tool count, voltage, retailer, battery range, price range, notes
- **"Your System" badge**: Highlight user's existing ecosystem
- **Compatible models list** per ecosystem
- **Buy-in cost analysis**: What it costs to enter a new ecosystem

---

## Brand Color System

Define a `BRAND_COLORS` constant mapping brand names to hex colors. Use consistently across ALL charts.

```javascript
export const BRAND_COLORS = {
  // Assign colors that match brand identity where possible
  // Use the visualization-rules.md palette for brands without obvious colors
};
```

Also define category/tier colors:
```javascript
export const TIER_COLORS = {
  entry: '#6b7280',      // Gray
  mid: '#f59e0b',        // Amber
  pro: '#ef4444',        // Red
};
```

---

## Chart Selection for Product Comparisons

| What You're Showing | Chart Type | Example |
|---------------------|-----------|---------|
| Products ranked by one spec | Horizontal bar (sorted) | Weight comparison, price comparison |
| Two competing specs | Scatter plot | Price vs HP, CFM vs MPH |
| Derived value metric | Horizontal bar (sorted, color = quality indicator) | Price per HP (green = magnesium, gray = plastic) |
| TCO breakdown | Stacked horizontal bar | Purchase + fuel + maintenance + consumables |
| Category/tier distribution | Vertical bar or pie | Models by tier, models by brand |
| Use case fit across products | Heatmap-style grid or rated dots | 1-5 rating per use case |
| Top contenders across dimensions | Radar chart | 4-5 products × 4 use cases |
| Boolean features | Checklist matrix table | Features × products with check/X |
| Price distribution by type | Grouped vertical bar | Gas vs Battery price brackets |
| Two metrics quick comparison | Side-by-side stat cards | Gas avg weight vs Battery avg weight |

---

## Research Phase Guidance (Product-Specific)

### What to Search For

```
"best [product type] [year]"
"[product type] comparison review"
"[product type] buyer's guide [year]"
"[brand] [model] review"
"[brand] [model] specs"
"[product type] reddit recommendations"
"[product type] vs [product type]"
"[product type] [key spec] comparison"
"[retailer] [product type] ratings"
```

### Data to Gather Per Product

1. **Manufacturer specs** — official spec sheet
2. **Street price** — check 2-3 retailers for current pricing
3. **Review aggregates** — stars + review count from major retailers
4. **Expert reviews** — 1-2 professional review sources
5. **Community sentiment** — Reddit, forums, YouTube comments for real-world pros/cons
6. **Purchase links** — direct URLs to buy from 2-3 retailers
7. **Warranty info** — duration and type
8. **Made-in country** — if available

### How Many Products to Include

| Product Complexity | Target Count | Reasoning |
|-------------------|-------------|-----------|
| High-spec (vehicles, pro tools) | 12–20 | Many meaningful differentiators |
| Mid-spec (electronics, appliances) | 8–15 | Moderate differentiation |
| Low-spec (accessories, simple tools) | 6–12 | Fewer differentiators, focus on value |

Always include products across the full price range — budget, mid, and premium. Include at least 3 brands. Include the "obvious" popular choices AND 1-2 hidden gems.
