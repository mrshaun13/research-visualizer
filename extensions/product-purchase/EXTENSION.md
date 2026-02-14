---
name: Product/Purchase Comparison
slug: product-purchase
version: "1.0"
output_mode: bespoke
triggers:
  explicit: ["buy", "purchase", "looking for", "which should I get", "help me choose", "best * for"]
  implicit: ["brands", "models", "price range", "product categories", "compare [products]"]
  context: "any request where the end goal is selecting a product to acquire"
data_source: internet
pipeline_hooks: ["1B", "2", "3", "4", "5", "6", "7"]
custom_checkpoint: true
custom_viz_template: true
---

# Product/Purchase Comparison Extension

When the user's intent is to compare products or make a purchase decision, this extension activates a product-specific pipeline with standardized sections for specs, pricing, cost analysis, recommendations, purchase links, and data-driven analysis.

## Trigger Detection

**Explicit signals** in the user's prompt:
- "buy", "purchase", "looking for", "which should I get", "help me choose", "best [product] for"

**Implicit signals:**
- Mentions of brands, models, price ranges, product categories, "compare [products]"

**Context:**
- Any request where the end goal is selecting a product to acquire

**Example prompts:**
- "I'm looking to buy a boat for weekend fishing"
- "Help me pick a good laptop for software development"
- "What's the best SUV for a family of 5?"

---

## Phase 1B: PRODUCT CLASSIFY (inject)

When the Product/Purchase lens is detected in Phase 1, classify the product BEFORE surveying. This classification drives which sections get built and how deep the analysis goes.

See [product-comparison-template.md](references/product-comparison-template.md) for the complete classification framework.

### Steps:

1. **Classify lifecycle tier:**
   - **Durable / Investment** (5+ years): vehicles, pro tools, appliances, HVAC, furniture, instruments
   - **Semi-Durable** (1–5 years): phones, laptops, cameras, mid-range tools, gaming consoles
   - **Consumable / Short-Life** (<1 year): compact tools, accessories, cables, budget items

2. **Set product characteristic flags:**
   - **Ecosystem Dependency** — requires batteries, subscriptions, or proprietary accessories?
   - **Multi-Use-Case** — serves 3+ distinct scenarios?
   - **High Feature Density** — 6+ boolean features differentiate products?
   - **Clear Market Tiers** — products span obvious quality/price tiers?
   - **Derived Metric Opportunity** — two specs combine into a meaningful ratio?
   - **Existing User Ecosystem** — user already owns compatible batteries/tools/platform?

3. **Extract user profile** (from prompt or reasonable inference):
   - Budget range, use intensity, experience level, key constraints, primary use case
   - If the user provides minimal info, assume the most common buyer profile and state assumptions in the Overview. The user can correct at the checkpoint.

4. **Pre-select dashboard sections** using the Section Selection Decision Tree in [product-comparison-template.md](references/product-comparison-template.md):
   - Universal sections (always): Overview, Spec Comparison, Recommendations, Sources
   - Conditional sections (based on flags): Cost Analysis/TCO, Features Matrix, Use Case Fit, Ecosystem Comparison, metric deep-dives
   - Target: 5–8 sections total

**Output:** Lifecycle tier, flags, user profile, pre-selected sections. Proceed to Phase 2.

---

## Phase 2: SURVEY (augment)

In addition to the standard survey searches, conduct product-specific searches. See [product-comparison-template.md](references/product-comparison-template.md#phase-2-additions-product-survey) for product-specific search patterns and segmentation.

---

## Phase 3: DISCOVER (override — 3C-P replaces 3A-3C)

When this extension is active, replace or augment the standard 3A-3C discovery with product-specific discovery. The key steps:

1. **Discover product tiers/categories** — research how the market actually segments this product type (don't assume tiers)
2. **Discover 5-8 key differentiating specs** and **1-2 derived metrics** (ratios that combine specs into value insights)
3. **Discover brands**, use cases, ecosystem constraints, and price/value breakpoints
4. **Build product shortlist** — 8-20 products across the full price range (popular choices + hidden gems, 3+ brands, all tiers)
5. **Gather per-product data** — manufacturer specs, street prices with purchase URLs, review aggregates, expert reviews, community sentiment

See [product-comparison-template.md](references/product-comparison-template.md#phase-3-product-discovery) for the full 9-step discovery process with examples for each product category.

### Phase 3D: Product Checkpoint Format

Present this checkpoint format instead of the standard research checkpoint:

```
PRODUCT TYPE: [interpreted product]
LIFECYCLE: [Durable / Semi-Durable / Consumable]
YOUR PROFILE: [inferred user profile — budget, use case, experience]
PRODUCTS: [N] models across [N] brands
TIERS: [discovered tiers]
KEY SPECS: [5-8 differentiating specs identified]
DERIVED METRICS: [1-2 calculated ratios]
FLAGS: [Ecosystem ✓/✗] [Multi-Use ✓/✗] [Features Matrix ✓/✗] [TCO ✓/✗]
PROPOSED SECTIONS: [5-8 sections with names]
DATA SOURCES: [review sites, manufacturer sites, community sources]
```

---

## Phase 4: RESEARCH (augment)

See [product-comparison-template.md](references/product-comparison-template.md#phase-4-additions-product-data-gathering) for per-product data gathering, ecosystem data, and TCO components.

---

## Phase 5: ANALYZE (augment)

See [product-comparison-template.md](references/product-comparison-template.md#phase-5-additions-product-analysis) for product key findings, visualization selection, dashboard structure, and recommendation engine.

---

## Phase 6: BUILD (augment)

See [product-comparison-template.md](references/product-comparison-template.md#phase-6-additions-product-build) for product file structure, component patterns, and build order.

---

## Phase 7: PRESENT (augment)

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
