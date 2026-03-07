// Derived telemetry metrics — computed client-side from existing telemetry data.
// Used by ProjectDetailFlyout and CompareView.

const PHASE_ORDER = ['environment', 'interpret', 'survey', 'discover', 'research', 'analyze', 'build', 'present'];
const PHASE_LABELS = { environment: 'ENV', interpret: 'INT', survey: 'SRV', discover: 'DSC', research: 'RSH', analyze: 'ANL', build: 'BLD', present: 'PRS' };
const PHASE_NAMES = { environment: 'Environment Setup', interpret: 'Interpret Prompt', survey: 'Survey Landscape', discover: 'Discover Sources', research: 'Deep Research', analyze: 'Analyze Findings', build: 'Build Dashboard', present: 'Present & Validate' };
const PHASE_DESCRIPTIONS = {
  environment: 'Configure the hub, install dependencies, and prepare the workspace',
  interpret: 'Parse the user prompt, detect lens type, and plan the research approach',
  survey: 'Quick scan of the topic to identify key areas and gaps',
  discover: 'Find and evaluate primary sources, articles, and datasets',
  research: 'Deep-dive into sources, extract data points, and cross-reference findings',
  analyze: 'Synthesize findings into insights, compute comparisons, and identify patterns',
  build: 'Generate React components, charts, data files, and the interactive dashboard',
  present: 'Validate the build, run QA checks, and deliver the finished project',
};
const PHASE_COLORS = { environment: '#6366f1', interpret: '#8b5cf6', survey: '#a78bfa', discover: '#c084fc', research: '#e879f9', analyze: '#f472b6', build: '#fb923c', present: '#22c55e' };

export { PHASE_ORDER, PHASE_LABELS, PHASE_NAMES, PHASE_DESCRIPTIONS, PHASE_COLORS };

export function computeDerivedMetrics(telemetry) {
  if (!telemetry) return null;
  const t = telemetry;
  const pt = t.phaseTiming || {};
  const ca = t.contentAnalysis || {};
  const hs = t.hoursSaved || {};

  const buildMinutes = pt.build || 1;
  const maxPhase = Math.max(...PHASE_ORDER.map(p => pt[p] || 0));

  return {
    buildEfficiency: +((( t.chartsBuilt || 0) + (t.sectionsBuilt || 0)) / buildMinutes).toFixed(2),
    researchDensity: t.searchesPerformed ? +((t.dataPointsCollected || 0) / t.searchesPerformed).toFixed(1) : null,
    sourceEfficiency: t.searchesPerformed ? +((t.sourcesCount || 0) / t.searchesPerformed).toFixed(2) : null,
    valuePerMinute: t.durationMinutes ? +((hs.totalHoursSaved || 0) / t.durationMinutes).toFixed(2) : null,
    textToVisualRatio: t.chartsBuilt ? +((ca.totalWords || 0) / t.chartsBuilt).toFixed(0) : null,
    phaseConcentration: t.durationMinutes ? +(maxPhase / t.durationMinutes).toFixed(2) : null,
  };
}

export const DERIVED_METRIC_META = [
  { key: 'buildEfficiency', label: 'Build Efficiency', unit: 'outputs/min', description: 'Charts + sections per minute of build time', higherIsBetter: true },
  { key: 'researchDensity', label: 'Research Density', unit: 'pts/search', description: 'Data points gathered per web search', higherIsBetter: true },
  { key: 'sourceEfficiency', label: 'Source Efficiency', unit: 'sources/search', description: 'Usable sources found per web search', higherIsBetter: true },
  { key: 'valuePerMinute', label: 'Value / Minute', unit: 'hrs saved/min', description: 'Hours of manual work saved per minute of AI time', higherIsBetter: true },
  { key: 'textToVisualRatio', label: 'Text:Visual Ratio', unit: 'words/chart', description: 'Words of content per visualization', higherIsBetter: null },
  { key: 'phaseConcentration', label: 'Phase Concentration', unit: 'ratio', description: 'Fraction of total time spent in the longest phase', higherIsBetter: null },
];

export function getPhaseTimingData(phaseTiming) {
  if (!phaseTiming) return [];
  return PHASE_ORDER.map(phase => ({
    phase,
    label: PHASE_LABELS[phase],
    name: PHASE_NAMES[phase],
    description: PHASE_DESCRIPTIONS[phase],
    minutes: phaseTiming[phase] || 0,
    color: PHASE_COLORS[phase],
  }));
}

export function getProductionHoursData(hoursSaved) {
  if (!hoursSaved?.productionHours) return [];
  const ph = hoursSaved.productionHours;
  const labels = {
    'interactive-dashboard': 'Interactive Dashboard',
    'white-paper': 'White Paper',
    'blog-post': 'Blog Post',
    'technical-doc': 'Technical Doc',
    'presentation': 'Presentation',
    'github-repo': 'GitHub Repo',
  };
  return Object.entries(ph).map(([key, value]) => ({
    key,
    label: labels[key] || key,
    hours: value,
  })).sort((a, b) => b.hours - a.hours);
}

export function getConsumptionData(consumptionTime) {
  if (!consumptionTime) return [];
  const ct = consumptionTime;
  const parts = [];
  if (ct.readingMinutes) parts.push({ key: 'reading', label: 'Reading', minutes: ct.readingMinutes, color: '#6366f1' });
  if (ct.chartExplorationMinutes) parts.push({ key: 'charts', label: 'Chart Exploration', minutes: ct.chartExplorationMinutes, color: '#fb923c' });
  if (ct.interactiveOverheadMinutes) parts.push({ key: 'interactive', label: 'Interactive', minutes: ct.interactiveOverheadMinutes, color: '#22c55e' });
  if (parts.length === 0 && ct.estimatedMinutes) {
    parts.push({ key: 'total', label: 'Estimated Total', minutes: ct.estimatedMinutes, color: '#6366f1' });
  }
  return parts;
}

export function getBuildProfileData(telemetry, allProjects) {
  if (!telemetry) return [];
  const metrics = [
    { key: 'searchesPerformed', label: 'Searches' },
    { key: 'sourcesCount', label: 'Sources' },
    { key: 'sectionsBuilt', label: 'Sections' },
    { key: 'chartsBuilt', label: 'Charts' },
    { key: 'filesGenerated', label: 'Files' },
    { key: 'dataPointsCollected', label: 'Data Pts' },
  ];
  const maxVals = {};
  metrics.forEach(m => {
    maxVals[m.key] = Math.max(...allProjects.filter(p => p.telemetry).map(p => p.telemetry[m.key] || 0), 1);
  });
  return metrics.map(m => ({
    metric: m.label,
    value: Math.round(((telemetry[m.key] || 0) / maxVals[m.key]) * 100),
    raw: telemetry[m.key] || 0,
  }));
}

const BLOOMS_LABELS = { 1: 'Remember', 2: 'Understand', 3: 'Apply', 4: 'Analyze', 5: 'Evaluate', 6: 'Create' };
const BLOOMS_COLORS = { 1: '#9ca3af', 2: '#60a5fa', 3: '#34d399', 4: '#fbbf24', 5: '#fb923c', 6: '#ef4444' };

export { BLOOMS_LABELS, BLOOMS_COLORS };

export function formatDuration(minutes) {
  if (!minutes) return '—';
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function formatHours(hours) {
  if (!hours && hours !== 0) return '—';
  if (hours < 1) return '<1h';
  return hours >= 10 ? `${Math.round(hours)}h` : `${hours.toFixed(1)}h`;
}

// Compare helpers
export function computeCompareRows(projects) {
  const rows = [];
  const tList = projects.map(p => p.telemetry).filter(Boolean);
  if (tList.length === 0) return rows;

  const addRow = (category, label, getter, opts = {}) => {
    const values = tList.map(getter);
    const numericValues = values.filter(v => typeof v === 'number' && !isNaN(v));
    let best = null;
    if (opts.lowerIsBetter && numericValues.length > 1) best = Math.min(...numericValues);
    else if (opts.higherIsBetter && numericValues.length > 1) best = Math.max(...numericValues);
    rows.push({ category, label, values, best, ...opts });
  };

  // Timing
  addRow('Timing', 'Total Duration', t => t.durationMinutes, { lowerIsBetter: true, format: formatDuration });
  PHASE_ORDER.forEach(p => {
    addRow('Timing', `Phase: ${PHASE_LABELS[p]}`, t => t.phaseTiming?.[p], { lowerIsBetter: true, format: v => v != null ? `${v}m` : '—' });
  });

  // Build Output
  addRow('Build Output', 'Searches', t => t.searchesPerformed, { higherIsBetter: true });
  addRow('Build Output', 'Sources', t => t.sourcesCount, { higherIsBetter: true });
  addRow('Build Output', 'Sections', t => t.sectionsBuilt, { higherIsBetter: true });
  addRow('Build Output', 'Charts', t => t.chartsBuilt, { higherIsBetter: true });
  addRow('Build Output', 'Files', t => t.filesGenerated, { higherIsBetter: true });
  addRow('Build Output', 'Data Points', t => t.dataPointsCollected, { higherIsBetter: true });
  addRow('Build Output', 'Products Compared', t => t.productsCompared);

  // Content
  addRow('Content', 'FK Grade', t => t.contentAnalysis?.fleschKincaidGrade);
  addRow('Content', 'FK Label', t => t.contentAnalysis?.fleschKincaidLabel);
  addRow('Content', "Bloom's Level", t => t.contentAnalysis?.bloomsLevel, { higherIsBetter: true });
  addRow('Content', "Bloom's Label", t => t.contentAnalysis?.bloomsLabel);
  addRow('Content', 'Total Words', t => t.contentAnalysis?.totalWords, { higherIsBetter: true });

  // Efficiency (derived)
  const derivedList = projects.map(p => computeDerivedMetrics(p.telemetry));
  DERIVED_METRIC_META.forEach(m => {
    addRow('Efficiency', m.label, (_, i) => derivedList[i]?.[m.key], {
      higherIsBetter: m.higherIsBetter === true,
      lowerIsBetter: m.higherIsBetter === false,
      format: v => v != null ? `${v} ${m.unit}` : '—',
    });
  });
  // Fix: the getter above uses index, need to adjust
  // Re-do efficiency rows with index-aware approach
  rows.splice(rows.findIndex(r => r.category === 'Efficiency'), DERIVED_METRIC_META.length);
  DERIVED_METRIC_META.forEach(m => {
    const values = derivedList.map(d => d?.[m.key] ?? null);
    const numericValues = values.filter(v => typeof v === 'number');
    let best = null;
    if (m.higherIsBetter === true && numericValues.length > 1) best = Math.max(...numericValues);
    else if (m.higherIsBetter === false && numericValues.length > 1) best = Math.min(...numericValues);
    rows.push({ category: 'Efficiency', label: m.label, values, best, format: v => v != null ? `${v}` : '—' });
  });

  // Hours Saved
  addRow('Hours Saved', 'Research Hours', t => t.hoursSaved?.researchHours, { higherIsBetter: false, format: v => v != null ? `${v}h` : '—' });
  addRow('Hours Saved', 'Total Hours Saved', t => t.hoursSaved?.totalHoursSaved, { higherIsBetter: true, format: v => v != null ? `${v}h` : '—' });
  const prodKeys = ['interactive-dashboard', 'white-paper', 'blog-post', 'technical-doc', 'presentation', 'github-repo'];
  const prodLabels = { 'interactive-dashboard': 'Dashboard', 'white-paper': 'White Paper', 'blog-post': 'Blog Post', 'technical-doc': 'Tech Doc', 'presentation': 'Presentation', 'github-repo': 'GitHub Repo' };
  prodKeys.forEach(k => {
    addRow('Hours Saved', prodLabels[k], t => t.hoursSaved?.productionHours?.[k], { higherIsBetter: true, format: v => v != null ? `${v}h` : '—' });
  });

  // Consumption
  addRow('Consumption', 'Total', t => t.consumptionTime?.estimatedMinutes, { format: formatDuration });
  addRow('Consumption', 'Reading', t => t.consumptionTime?.readingMinutes, { format: v => v != null ? `${v.toFixed(1)}m` : '—' });
  addRow('Consumption', 'Chart Exploration', t => t.consumptionTime?.chartExplorationMinutes, { format: v => v != null ? `${v}m` : '—' });
  addRow('Consumption', 'Interactive', t => t.consumptionTime?.interactiveOverheadMinutes, { format: v => v != null ? `${v}m` : '—' });

  // Quality (new fields — gracefully handle missing)
  addRow('Quality', 'Source Diversity', t => t.sourceDiversityScore, { higherIsBetter: true, format: v => v != null ? `${(v * 100).toFixed(0)}%` : '—' });
  addRow('Quality', 'T1 (Gold)', t => t.dataQualityDistribution?.t1, { higherIsBetter: true });
  addRow('Quality', 'T2 (Silver)', t => t.dataQualityDistribution?.t2);
  addRow('Quality', 'T3 (Bronze)', t => t.dataQualityDistribution?.t3);
  addRow('Quality', 'T4 (Estimate)', t => t.dataQualityDistribution?.t4, { lowerIsBetter: true });

  // Context
  addRow('Context', 'Skill Version', t => t.skillVersion);
  addRow('Context', 'Model', t => t.model || '—');
  addRow('Context', 'Included Setup', t => t.includedSetup ? 'Yes' : 'No');
  addRow('Context', 'Checkpoint Modified', t => t.checkpointModified ? 'Yes' : 'No');

  return rows;
}
