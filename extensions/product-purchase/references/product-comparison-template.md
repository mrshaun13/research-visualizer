# Product Comparison Template

When the **Product/Purchase lens** is detected in Phase 1, this template drives the entire dashboard scaffolding. It ensures that even a minimal user prompt like "I'm looking to buy an SUV" produces a comprehensive, data-driven product comparison dashboard.

---

## Phase 1B: Product Classification

After detecting the Product/Purchase lens, classify the product before proceeding.

### Lifecycle Tier

| Tier | Lifespan | Examples | Key Implications |
|------|----------|----------|-----------------|
| **Durable / Investment** | 5+ years | Vehicles, appliances, HVAC, furniture, boats, pro-grade tools, musical instruments | Include TCO, Features Matrix, Avoid List, Derived Metrics, long-term maintenance analysis |
| **Semi-Durable** | 1–5 years | Phones, laptops, cameras, mid-range power tools, small appliances, gaming consoles | Include partial TCO (2-3 year), Ecosystem analysis, Use Case Matrix |
| **Consumable / Short-Life** | <1 year | Accessories, cables, consumables, budget tools, phone cases | Skip TCO entirely, focus on Use Case Fit, Purchase Links, immediate value |

### Product Characteristic Flags

Detect these during classification — each triggers specific sections:

| Flag | Detection Signal | Triggers |
|------|-----------------|----------|
| **Ecosystem Dependency** | Product requires batteries, subscriptions, platforms, or proprietary accessories | Ecosystem Comparison section |
| **Multi-Use-Case** | Product serves 3+ distinct scenarios (e.g., commuting + road trips + off-road for vehicles; home + travel + office for electronics) | Use Case Matrix + Radar Chart |
| **High Feature Density** | 6+ boolean yes/no features that differentiate products (e.g., wireless charging, water resistance, USB-C for electronics; heated seats, backup camera, AWD for vehicles) | Features Matrix section |
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

If the user provides almost nothing (e.g., "I want to buy a laptop"), make reasonable assumptions based on the most common buyer profile for that product and state them in the Overview InsightCallout. The user can correct at the checkpoint.

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
| **Cost Analysis / TCO** | Lifecycle = Durable or Semi-Durable | 5-year stacked bar: purchase + energy/fuel + maintenance + consumables |
| **[Primary Metric] Deep Dive** | Always if 2+ important performance metrics exist | "Performance & Speed" for laptops, "Fuel Economy" for vehicles, "Brew Quality" for espresso machines |
| **[Secondary Metric] Analysis** | When a second important dimension exists | "Portability & Weight" for laptops, "Comfort & Noise" for vehicles, "Ease of Use" for appliances |
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
    variantType: 'Type A / Type B / Type C', // [conditional] product variant axis (e.g., gas/battery/corded, manual/automatic, wired/wireless)
    
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
- **Primary scatter plot**: The two most important competing metrics (price vs performance, weight vs battery life, etc.)
- **Secondary insight**: Key takeaway from the data

**Optionally includes:**
- Radar chart (when Multi-Use-Case)
- Pie/bar for category distribution
- Variant type comparison (when relevant — e.g., manual vs automatic, wired vs wireless, gas vs electric)

### 3. Comparison Table

**Always includes:**
- Sortable column headers (click to sort asc/desc)
- Filter controls (by tier, brand, category, variant type — whichever are relevant)
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
- **info** (blue): Explanatory context, definitions, "here's what [key spec] vs [key spec] means for your decision"
- **warning** (amber): Important caveats, "the cheapest option to BUY is often the most expensive to OWN"
- **recommendation** (emerald/green): Direct advice, "your ideal setup is..."
- **critical** (red): The #1 metric or most important finding
- **highlight** (purple): Surprising or counterintuitive findings

---

## Conditional Section Patterns

### Cost Analysis / TCO (Durable + Semi-Durable only)

- **Price comparison bar chart**: All products sorted by price, color-coded by brand
- **Value scatter**: Price vs primary performance metric (dots in upper-left = best value)
- **Price per [key metric]**: Derived value metric bar chart
- **5-Year TCO stacked bar** (Durable only): Purchase + energy/fuel + maintenance + consumables
  - Include assumptions footnote (usage frequency, energy/fuel costs, etc.)
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
| Two competing specs | Scatter plot | Price vs performance, weight vs battery life, speed vs capacity |
| Derived value metric | Horizontal bar (sorted, color = quality indicator) | Price per performance unit (color = quality tier or material class) |
| TCO breakdown | Stacked horizontal bar | Purchase + fuel + maintenance + consumables |
| Category/tier distribution | Vertical bar or pie | Models by tier, models by brand |
| Use case fit across products | Heatmap-style grid or rated dots | 1-5 rating per use case |
| Top contenders across dimensions | Radar chart | 4-5 products × 4 use cases |
| Boolean features | Checklist matrix table | Features × products with check/X |
| Price distribution by type | Grouped vertical bar | Price brackets by variant type (e.g., manual vs automatic, wired vs wireless) |
| Two metrics quick comparison | Side-by-side stat cards | Avg weight by variant type, avg price by tier |

---

## Phase-Specific Product Additions

These sections describe how the Product/Purchase lens modifies each phase of the standard pipeline. They are referenced from SKILL.md via pointers.

### Phase 2 Additions: Product Survey

When the Product/Purchase lens is active, replace or augment the standard searches with:

1. **Conduct 3-5 product-focused searches:**
   - "best [product type] [current year]"
   - "[product type] comparison review [current year]"
   - "[product type] buyer's guide"
   - "[product type] reddit recommendations"
   - "[brand] [product type] specs"

2. **Identify from results:**
   - Major brands and their market positioning
   - Key differentiating specs for this product type
   - Price tiers and value breakpoints
   - Expert review sources and independent testing labs
   - Common complaints and praise patterns
   - Ecosystem dependencies (batteries, platforms, accessories)

3. **Determine product segmentation:**
   - **Market tiers** — entry/mid/pro, economy/mid/luxury, budget/mainstream/premium
   - **Power types** — gas/battery/corded, manual/electric, etc.
   - **Use case categories** — if products serve different scenarios

### Phase 4 Additions: Product Data Gathering

When the Product/Purchase lens is active, the research phase focuses on per-product data gathering:

1. **For each product on the shortlist**, gather the complete data object per the Standardized Product Data Schema above:
   - All numeric specs (8-15 per product)
   - Pre-calculate derived metrics
   - Boolean features (if Features Matrix flagged)
   - Use case ratings 1-5 (if Multi-Use-Case flagged)
   - Qualitative data: bestFor, prosText, consText, verdict, highlights
   - Sources list per product

2. **Build the productDetails data** (separate file) for each product:
   - Full manufacturer spec sheet (key-value pairs)
   - Purchase links with retailer, URL, price, stock status (2-3 retailers per product)
   - Ratings with source, stars, review count, URL (2-3 sources per product)
   - Pros and cons extracted from actual user reviews (not just spec-derived)

3. **Gather ecosystem data** (if Ecosystem Dependency flagged):
   - Tool count per ecosystem, voltage, battery range, average battery price, retailer availability

4. **Gather TCO components** (if Durable/Semi-Durable lifecycle):
   - Annual fuel/energy cost, annual maintenance cost, consumable costs, expected lifespan
   - Assumptions clearly documented

5. **Track all sources** — manufacturer sites, retailer listings, review sites, community forums, expert reviews

### Phase 5 Additions: Product Analysis

When the Product/Purchase lens is active, replace the standard narrative flow with product-specific analysis:

**5A-P: Product Key Findings**
- **Best value discovery** — which product gives the most for the money?
- **The "value paradox"** — is the cheapest to buy also the cheapest to own? (often not)
- **Hidden gems** — products that experts love but casual buyers overlook
- **Anti-recommendations** — products that look good on paper but have hidden downsides (Durable lifecycle only)
- **Tradeoff identification** — the two most important competing metrics (these become the primary scatter plot)

**5B-P: Product Visualization Selection**
Use the Chart Selection for Product Comparisons table below. Key mappings:
- Products ranked by one spec → Horizontal bar (sorted)
- Two competing specs → Scatter plot (this is the hero chart)
- Derived value metric → Horizontal bar with quality-indicator coloring
- TCO breakdown → Stacked horizontal bar
- Use case fit → Heatmap-style grid or rated dots
- Top contenders across dimensions → Radar chart
- Boolean features → Checklist matrix table

**5C-P: Product Dashboard Structure**
Organize by the Section Selection Decision Tree:
1. **Overview** — stat cards, user profile insight, primary scatter plot, category distribution
2. **Spec Comparison** — sortable table, bar charts for top 3-4 specs
3. **[Primary Metric] Deep Dive** — derived metrics, value analysis charts
4. **[Conditional sections]** — TCO, Features Matrix, Use Case Fit, Ecosystem, secondary metrics
5. **Recommendations** — award cards, quick decision guide, multi-tier purchase options, avoid list
6. **Sources** — methodology, pricing notes, disclaimers

**5D-P: Recommendation Engine**
Build curated picks with these award categories (select 5-7 that fit):
- **Best Overall Value** — best bang for the buck
- **Best Premium / No Compromises** — money is secondary to quality
- **Best Budget** — cheapest viable option
- **Best "Buy It For Life"** — longest-lasting, most durable (Durable lifecycle)
- **Best for [Primary Use Case]** — tailored to user's main need
- **Best for [Secondary Use Case]** — if Multi-Use-Case
- **Hidden Gem** — underrated product experts love
- **Most Comfortable / Ergonomic** — if comfort is a differentiator
- **Best Using Your [Ecosystem]** — if user has existing ecosystem

Also build **multi-tier purchase options** (2-4 strategies at different price points). Adapt the framing to the product type — not every product involves buying multiples:
- **Option A** — Premium / No Compromises (~$X) — the best available, cost secondary
- **Option B** — Best Value (~$X) — strong performance without overpaying
- **Option C** — Budget-Smart (~$X) — meets core needs at the lowest reasonable cost
- **Option D** — [Context-specific] (~$X) — adapt to the product (e.g., "Best for Your Ecosystem" if batteries matter, "Best Starter Setup" for hobby gear, "Best Combo" if buying two products makes sense)

### Phase 6 Additions: Product Build

When the Product/Purchase lens is active, use the product-specific component patterns from the Universal Component Patterns section above.

**Product Comparison File Structure (within the hub):**

```
<hubPath>/src/projects/<slug>/
├── App.jsx                    # Sidebar nav + section routing + product detail routing
├── components/
│   ├── CustomTooltip.jsx
│   ├── InsightCallout.jsx
│   ├── ComparisonTable.jsx    # Sortable/filterable table with expandable rows
│   ├── ProductDetail.jsx      # Full product deep-dive page
│   ├── RecommendationCards.jsx
│   ├── [MetricDeepDive].jsx   # e.g., PowerPerformance, AirflowAnalysis
│   ├── [ConditionalSection].jsx # TCO, FeaturesMatrix, UseCaseMatrix, Ecosystem
│   └── Sources.jsx
└── data/
    ├── products.js            # Product array + constants
    └── productDetails.js      # Deep per-product info
```

**Product Comparison Build Order:**

1. **Data files first** — `products.js` with the standardized product schema, `productDetails.js` with deep per-product info including `getAggregateRating()` helper
2. **Reusable components** — CustomTooltip, InsightCallout (with variant support: info/warning/recommendation/critical/highlight)
3. **ComparisonTable** — sortable columns, category/tier/brand filters, expandable rows, link to ProductDetail
4. **ProductDetail** — full page with specs table, purchase links, aggregate ratings, retailer rating breakdown, pros/cons from reviews, use case fit bars, highlights, back button
5. **Overview section** — stat cards, primary scatter plot, key insights, category distribution charts
6. **Metric deep-dive sections** — bar charts for key specs, derived metric charts, scatter plots
7. **Conditional sections** — build only those flagged in Phase 1B (TCO, Features Matrix, Use Case Fit, Ecosystem)
8. **Recommendations** — award cards, quick decision guide, multi-tier purchase options, avoid list (if Durable)
9. **Sources** — methodology notes, pricing disclaimers, safety warnings (if applicable)
10. **App.jsx** — project-level sidebar nav with icons, section routing, ProductDetail routing, mobile responsive

### Phase 7 Additions: Product QA

**Product QA (additional checks):**
- Every product in the comparison table expands correctly with detail
- ProductDetail pages render for all products with purchase links, ratings, and specs
- All purchase links are valid URLs (not placeholder text)
- Aggregate ratings calculate correctly from source ratings
- Recommendation cards reference real products in the data
- Quick decision guide answers map to actual products with correct prices
- Multi-tier purchase options have accurate total costs
- Filters (tier, brand, category) work correctly and show accurate counts
- Scatter plot axes are labeled and tooltips show product names
- Brand colors are consistent across all charts

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
