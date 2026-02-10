# Subgroup Discovery & Taxonomy Protocols

## Subgroup Split Decision Matrix

Use this to decide whether to split a population into subgroups:

| Signal | Action |
|---|---|
| >20% difference on 2+ key metrics between subgroups | SPLIT — they tell different stories |
| >20% difference on 1 metric only | SPLIT if the metric is central to the topic; otherwise MERGE |
| <20% difference across all metrics | MERGE — splitting adds noise without insight |
| Subgroup has <3 data sources available | NOTE as data-limited; include if possible, caveat if not |
| >5 potential subgroups | Keep top 3-4 most distinct; merge the rest into "other" |
| Subgroup only exists for part of the time axis | Include with clear notation (e.g., "streaming services: 2007 onward", "e-commerce retailers: 1990s onward") |

## Taxonomy Discovery Search Templates

Use these search patterns to discover domain-specific category lists:

```
"[topic] categories list"
"[topic] types classification"
"[topic] taxonomy [academic field]"
"most common [topic items] prevalence study"
"[platform] [topic] categories" (e.g., "Spotify genres", "Steam game tags", "USDA food categories")
"[topic] survey categories [major study name]"
"top [N] [topic items] by [metric]"
```

Cross-reference 2-3 sources to build a unified list of 25-30 items. Prioritize items with available prevalence data.

## Data Quality Tiers

Tag every data point with a confidence tier:

| Tier | Label | Description | Example |
|------|-------|-------------|---------|
| T1 | Gold | Peer-reviewed, large sample, nationally representative | GSS, Census, CDC NVSS |
| T2 | Silver | Institutional/industry report, moderate sample | Pew Research, platform reports |
| T3 | Bronze | Small study, self-selected sample, single source | Academic case study, survey of 200 |
| T4 | Estimate | Interpolated, proxy-based, or expert judgment | Gap-filling between known data points |

Always disclose tier in the Sources and Methods section.
