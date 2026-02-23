#!/usr/bin/env node
/**
 * Research Hub Generator — deterministic file generation tool
 *
 * Generates structural hub files from hub-config.json (source of truth).
 * AI writes creative content (section components, data files).
 * This script writes everything else.
 *
 * Usage:
 *   node scripts/hub-gen.mjs <hub-root> sync-registry          # Regenerate index.js from hub-config.json
 *   node scripts/hub-gen.mjs <hub-root> add-project <json>     # Add project: generate shell + update registry + config
 *   node scripts/hub-gen.mjs <hub-root> write-meta <slug> <json> # Write validated meta.json
 *   node scripts/hub-gen.mjs <hub-root> install-components     # Install shared components to src/components/
 *   node scripts/hub-gen.mjs <hub-root> scaffold               # Generate all Phase 0B scaffold files
 *   node scripts/hub-gen.mjs <hub-root> doctor                 # Run hub-doctor checks (detect + fix)
 *
 * Options:
 *   --dry-run    Show what would change without writing files
 *   --verbose    Show detailed output
 *   --json       Output results as JSON (for programmatic consumption)
 */

import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync, statSync, copyFileSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ═══════════════════════════════════════════════════
//  CLI PARSING
// ═══════════════════════════════════════════════════

const args = process.argv.slice(2);
const flags = args.filter(a => a.startsWith('--'));
const positional = args.filter(a => !a.startsWith('--'));

const dryRun = flags.includes('--dry-run');
const verbose = flags.includes('--verbose');
const jsonOutput = flags.includes('--json');

const COMMANDS = ['sync-registry', 'add-project', 'write-meta', 'install-components', 'scaffold', 'doctor'];

if (positional.length < 2 || !COMMANDS.includes(positional[1])) {
  console.error('Usage: node hub-gen.mjs <hub-root> <command> [args...]');
  console.error('');
  console.error('Commands:');
  console.error('  sync-registry              Regenerate src/projects/index.js from hub-config.json');
  console.error('  add-project <json>         Add a new project (JSON string or @file.json)');
  console.error('  write-meta <slug> <json>   Write validated meta.json for a project');
  console.error('  install-components         Install shared components to src/components/');
  console.error('  scaffold                   Generate all Phase 0B scaffold files');
  console.error('  doctor                     Run hub-doctor checks');
  console.error('');
  console.error('Options:');
  console.error('  --dry-run    Show changes without writing');
  console.error('  --verbose    Detailed output');
  console.error('  --json       JSON output for programmatic use');
  process.exit(2);
}

const HUB = resolve(positional[0]);
const command = positional[1];
const commandArgs = positional.slice(2);

if (!existsSync(HUB)) {
  console.error(`Hub root not found: ${HUB}`);
  process.exit(2);
}

// ═══════════════════════════════════════════════════
//  PATHS
// ═══════════════════════════════════════════════════

const PATHS = {
  hubConfig: join(HUB, 'hub-config.json'),
  localConfig: join(HUB, '.local-config.json'),
  projectsDir: join(HUB, 'src/projects'),
  localProjectsDir: join(HUB, 'src/local-projects'),
  registryFile: join(HUB, 'src/projects/index.js'),
  localRegistryFile: join(HUB, 'src/local-projects/index.js'),
  componentsDir: join(HUB, 'src/components'),
  srcDir: join(HUB, 'src'),
};

// ═══════════════════════════════════════════════════
//  LOGGING
// ═══════════════════════════════════════════════════

const results = { command, hubRoot: HUB, dryRun, actions: [], errors: [], warnings: [] };

function log(msg) { if (!jsonOutput) console.log(msg); }
function logAction(action, detail) {
  results.actions.push({ action, detail });
  if (!jsonOutput) log(`  ✅ ${action}: ${detail}`);
}
function logError(action, detail) {
  results.errors.push({ action, detail });
  if (!jsonOutput) log(`  ❌ ${action}: ${detail}`);
}
function logWarn(action, detail) {
  results.warnings.push({ action, detail });
  if (!jsonOutput) log(`  ⚠️  ${action}: ${detail}`);
}
function logVerbose(msg) { if (verbose && !jsonOutput) log(`  · ${msg}`); }

function finish() {
  if (jsonOutput) {
    console.log(JSON.stringify(results, null, 2));
  } else {
    const total = results.actions.length;
    const errs = results.errors.length;
    const warns = results.warnings.length;
    log('');
    if (errs > 0) log(`Done: ${total} actions, ${errs} errors, ${warns} warnings`);
    else if (warns > 0) log(`Done: ${total} actions, ${warns} warnings`);
    else log(`Done: ${total} actions`);
  }
  process.exit(results.errors.length > 0 ? 1 : 0);
}

// ═══════════════════════════════════════════════════
//  CONFIG LOADING
// ═══════════════════════════════════════════════════

function loadHubConfig() {
  if (!existsSync(PATHS.hubConfig)) {
    logError('config', `hub-config.json not found at ${PATHS.hubConfig}`);
    finish();
  }
  try {
    return JSON.parse(readFileSync(PATHS.hubConfig, 'utf-8'));
  } catch (e) {
    logError('config', `Failed to parse hub-config.json: ${e.message}`);
    finish();
  }
}

function loadLocalConfig() {
  if (!existsSync(PATHS.localConfig)) return null;
  try {
    return JSON.parse(readFileSync(PATHS.localConfig, 'utf-8'));
  } catch { return null; }
}

function writeFile(filePath, content) {
  if (dryRun) {
    logAction('would-write', filePath);
    return;
  }
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, content);
  logAction('write', filePath);
}

// ═══════════════════════════════════════════════════
//  REGISTRY SCHEMA (hardcoded core defaults)
// ═══════════════════════════════════════════════════

const REGISTRY_FIELDS = [
  'slug', 'title', 'subtitle', 'query', 'lens', 'icon',
  'accentColor', 'visibility', 'createdAt', 'updatedAt',
];

// ═══════════════════════════════════════════════════
//  COMMAND: sync-registry
// ═══════════════════════════════════════════════════

function syncRegistry() {
  log('\n── sync-registry ──');
  const config = loadHubConfig();
  const projects = config.projects || [];

  if (projects.length === 0) {
    logWarn('sync-registry', 'No projects found in hub-config.json');
  }

  // Validate each project has required fields
  for (const p of projects) {
    if (!p.slug) {
      logError('sync-registry', `Project missing required field: slug`);
      continue;
    }
    for (const field of ['title', 'createdAt']) {
      if (!p[field]) logWarn('sync-registry', `Project "${p.slug}" missing field: ${field}`);
    }
  }

  // Detect project directories that exist on disk but aren't in config
  if (existsSync(PATHS.projectsDir)) {
    const diskSlugs = readdirSync(PATHS.projectsDir).filter(d => {
      const full = join(PATHS.projectsDir, d);
      return statSync(full).isDirectory() && !d.startsWith('.') && d !== 'node_modules';
    });
    const configSlugs = new Set(projects.map(p => p.slug));
    for (const slug of diskSlugs) {
      if (!configSlugs.has(slug)) {
        logWarn('sync-registry', `Directory "src/projects/${slug}" exists on disk but not in hub-config.json`);
      }
    }
  }

  // Generate index.js
  const indexContent = generateRegistryFile(projects, './');
  writeFile(PATHS.registryFile, indexContent);

  // Also sync local-projects if .local-config.json has localProjects
  const localConfig = loadLocalConfig();
  if (localConfig && localConfig.localProjects && localConfig.localProjects.length > 0) {
    const localContent = generateRegistryFile(localConfig.localProjects, './');
    writeFile(PATHS.localRegistryFile, localContent);
  }

  logVerbose(`Generated registry with ${projects.length} projects`);
}

function generateRegistryFile(projects, importPrefix) {
  const lines = [];
  lines.push("import { lazy } from 'react';");
  lines.push('');
  lines.push('export const projectRegistry = [');

  for (const project of projects) {
    lines.push('  {');
    for (const field of REGISTRY_FIELDS) {
      if (project[field] !== undefined && project[field] !== null) {
        const value = typeof project[field] === 'string'
          ? `'${escapeJs(project[field])}'`
          : JSON.stringify(project[field]);
        lines.push(`    ${field}: ${value},`);
      }
    }
    lines.push('  },');
  }

  lines.push('];');
  lines.push('');
  lines.push('export const projectComponents = {');

  // Sort alphabetically for stable output
  const sorted = [...projects].sort((a, b) => a.slug.localeCompare(b.slug));
  for (const project of sorted) {
    if (!project.slug) continue;
    lines.push(`  '${escapeJs(project.slug)}': lazy(() => import('${importPrefix}${escapeJs(project.slug)}/App')),`);
  }

  lines.push('};');
  lines.push('');

  return lines.join('\n');
}

function escapeJs(str) {
  return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

// ═══════════════════════════════════════════════════
//  COMMAND: add-project
// ═══════════════════════════════════════════════════

function addProject() {
  log('\n── add-project ──');

  if (commandArgs.length === 0) {
    logError('add-project', 'Missing project JSON argument. Usage: add-project <json|@file.json>');
    finish();
  }

  let projectData;
  const arg = commandArgs[0];
  try {
    if (arg.startsWith('@')) {
      const filePath = resolve(arg.slice(1));
      projectData = JSON.parse(readFileSync(filePath, 'utf-8'));
    } else {
      projectData = JSON.parse(arg);
    }
  } catch (e) {
    logError('add-project', `Failed to parse project JSON: ${e.message}`);
    finish();
  }

  // Validate required fields
  if (!projectData.slug) {
    logError('add-project', 'Project JSON missing required field: slug');
    finish();
  }
  if (!projectData.title) {
    logError('add-project', 'Project JSON missing required field: title');
    finish();
  }

  const slug = projectData.slug;

  // Apply defaults
  if (!projectData.lens) projectData.lens = 'standard';
  if (!projectData.icon) projectData.icon = 'FileText';
  if (!projectData.accentColor) projectData.accentColor = 'cyan';
  if (!projectData.visibility) projectData.visibility = 'personal';
  if (!projectData.createdAt) projectData.createdAt = new Date().toISOString();

  // 1. Add to hub-config.json
  const config = loadHubConfig();
  const existingIdx = (config.projects || []).findIndex(p => p.slug === slug);
  if (existingIdx >= 0) {
    logWarn('add-project', `Project "${slug}" already exists in hub-config.json — updating entry`);
    config.projects[existingIdx] = projectData;
  } else {
    if (!config.projects) config.projects = [];
    // Insert at the beginning (newest first)
    config.projects.unshift(projectData);
  }
  writeFile(PATHS.hubConfig, JSON.stringify(config, null, 2) + '\n');

  // 2. Create project directory
  const projectDir = join(PATHS.projectsDir, slug);
  const componentsDir = join(projectDir, 'components');
  const dataDir = join(projectDir, 'data');

  if (!existsSync(projectDir)) {
    if (!dryRun) {
      mkdirSync(componentsDir, { recursive: true });
      mkdirSync(dataDir, { recursive: true });
    }
    logAction('mkdir', `src/projects/${slug}/{components,data}`);
  }

  // 3. Generate project App.jsx shell
  const sections = projectData.sections || ['Overview', 'Sources'];
  const appContent = generateProjectApp(slug, projectData, sections);
  writeFile(join(projectDir, 'App.jsx'), appContent);

  // 4. Regenerate registry
  syncRegistry();

  logVerbose(`Added project "${slug}" with ${sections.length} sections`);
}

function generateProjectApp(slug, project, sections) {
  const accentColor = project.accentColor || 'cyan';
  const iconImports = new Set(['ChevronRight']);
  const sectionIcons = {
    'Overview': 'BarChart3',
    'Sources': 'Globe',
    'Methodology': 'FlaskConical',
    'Analysis': 'TrendingUp',
    'Recommendations': 'Lightbulb',
    'Timeline': 'Clock',
    'Comparison': 'GitCompare',
    'Details': 'FileText',
  };

  for (const s of sections) {
    const icon = sectionIcons[s] || 'FileText';
    iconImports.add(icon);
  }

  const lines = [];

  // Imports
  lines.push("import React, { useState } from 'react';");
  lines.push(`import { ${[...iconImports].sort().join(', ')} } from 'lucide-react';`);
  lines.push('');

  // Section component imports (lazy placeholders — AI will fill these)
  for (const s of sections) {
    const componentName = s.replace(/[^a-zA-Z0-9]/g, '');
    lines.push(`import ${componentName} from './components/${componentName}';`);
  }

  lines.push('');
  lines.push(`const SECTIONS = [`);
  for (const s of sections) {
    const componentName = s.replace(/[^a-zA-Z0-9]/g, '');
    const icon = sectionIcons[s] || 'FileText';
    lines.push(`  { key: '${escapeJs(s.toLowerCase().replace(/\s+/g, '-'))}', label: '${escapeJs(s)}', icon: ${icon}, component: ${componentName} },`);
  }
  lines.push('];');

  lines.push('');
  lines.push(`export default function App() {`);
  lines.push(`  const [activeSection, setActiveSection] = useState(SECTIONS[0].key);`);
  lines.push(`  const ActiveComponent = SECTIONS.find(s => s.key === activeSection)?.component || SECTIONS[0].component;`);
  lines.push('');
  lines.push('  return (');
  lines.push(`    <div className="flex h-full bg-gray-950 text-white">`);
  lines.push('      {/* Sidebar */}');
  lines.push(`      <nav className="w-56 flex-shrink-0 border-r border-gray-800 bg-gray-950/50 overflow-y-auto">`);
  lines.push(`        <div className="p-4">`);
  lines.push(`          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Sections</h2>`);
  lines.push('          <ul className="space-y-1">');
  lines.push('            {SECTIONS.map(s => {');
  lines.push('              const Icon = s.icon;');
  lines.push('              return (');
  lines.push(`                <li key={s.key}>`);
  lines.push(`                  <button`);
  lines.push(`                    onClick={() => setActiveSection(s.key)}`);
  lines.push(`                    className={\`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer \${`);
  lines.push(`                      activeSection === s.key`);
  lines.push(`                        ? 'bg-${accentColor}-500/20 text-${accentColor}-300'`);
  lines.push(`                        : 'text-gray-400 hover:text-white hover:bg-gray-800/50'`);
  lines.push('                    }`}');
  lines.push('                  >');
  lines.push('                    <Icon className="w-4 h-4" />');
  lines.push('                    {s.label}');
  lines.push('                    {activeSection === s.key && <ChevronRight className="w-3 h-3 ml-auto" />}');
  lines.push('                  </button>');
  lines.push('                </li>');
  lines.push('              );');
  lines.push('            })}');
  lines.push('          </ul>');
  lines.push('        </div>');
  lines.push('      </nav>');
  lines.push('');
  lines.push('      {/* Main content */}');
  lines.push(`      <main className="flex-1 overflow-y-auto">`);
  lines.push(`        <div className="max-w-5xl mx-auto px-6 py-8">`);
  lines.push('          <ActiveComponent />');
  lines.push('        </div>');
  lines.push('      </main>');
  lines.push('    </div>');
  lines.push('  );');
  lines.push('}');
  lines.push('');

  return lines.join('\n');
}

// ═══════════════════════════════════════════════════
//  COMMAND: write-meta
// ═══════════════════════════════════════════════════

const REQUIRED_META_FIELDS = [
  'runStartedAt', 'runCompletedAt', 'durationMinutes', 'includedSetup',
  'skillVersion', 'userPrompt', 'researchPlan', 'checkpointModified',
  'searchesPerformed', 'sourcesCount', 'sectionsBuilt', 'chartsBuilt',
  'filesGenerated', 'dataPointsCollected',
];

const REQUIRED_META_BLOCKS = {
  phaseTiming: ['environment', 'interpret', 'survey', 'discover', 'research', 'analyze', 'build', 'enrich', 'present'],
  glossary: ['enabled', 'termsIdentified', 'termsRendered'],
  contentAnalysis: ['fleschKincaidGrade', 'fleschKincaidLabel', 'bloomsLevel', 'bloomsLabel', 'bloomsRange', 'totalWords', 'totalSentences', 'readabilityNote'],
  hoursSaved: ['researchHours', 'totalHoursSaved', 'equivalentLabel'],
  consumptionTime: ['estimatedMinutes', 'estimatedLabel'],
};

function writeMeta() {
  log('\n── write-meta ──');

  if (commandArgs.length < 2) {
    logError('write-meta', 'Usage: write-meta <slug> <json|@file.json>');
    finish();
  }

  const slug = commandArgs[0];
  let metaData;
  const arg = commandArgs[1];
  try {
    if (arg.startsWith('@')) {
      metaData = JSON.parse(readFileSync(resolve(arg.slice(1)), 'utf-8'));
    } else {
      metaData = JSON.parse(arg);
    }
  } catch (e) {
    logError('write-meta', `Failed to parse meta JSON: ${e.message}`);
    finish();
  }

  // Unwrap telemetry wrapper if present (common AI bug)
  if (metaData.telemetry && typeof metaData.telemetry === 'object' && !metaData.durationMinutes) {
    metaData = metaData.telemetry;
    logWarn('write-meta', 'Unwrapped telemetry wrapper — AI should provide flat object');
  }

  // Validate required fields
  for (const field of REQUIRED_META_FIELDS) {
    if (metaData[field] === undefined || metaData[field] === null) {
      logWarn('write-meta', `Missing required field: ${field} — will write anyway`);
    }
  }

  // Validate required blocks
  for (const [block, children] of Object.entries(REQUIRED_META_BLOCKS)) {
    if (!metaData[block] || typeof metaData[block] !== 'object') {
      logWarn('write-meta', `Missing required block: ${block}`);
    } else {
      for (const child of children) {
        if (metaData[block][child] === undefined || metaData[block][child] === null) {
          logWarn('write-meta', `Missing ${block}.${child}`);
        }
      }
    }
  }

  // Compute derived fields if missing
  if (metaData.hoursSaved && !metaData.hoursSaved.productionHours && metaData.sectionsBuilt) {
    metaData.hoursSaved.productionHours = {
      'interactive-dashboard': (metaData.sectionsBuilt * 6) + ((metaData.chartsBuilt || 0) * 3) + ((metaData.filesGenerated || 0) * 0.5),
      'white-paper': (metaData.sectionsBuilt * 4) + ((metaData.sourcesCount || 0) * 0.5) + ((metaData.dataPointsCollected || 0) * 0.01),
      'blog-post': (metaData.sectionsBuilt * 2.5) + ((metaData.chartsBuilt || 0) * 1),
      'technical-doc': (metaData.sectionsBuilt * 3) + ((metaData.sourcesCount || 0) * 0.3),
      'presentation': (metaData.sectionsBuilt * 1.5) + ((metaData.chartsBuilt || 0) * 0.5),
      'github-repo': (metaData.sectionsBuilt * 3) + ((metaData.chartsBuilt || 0) * 2) + ((metaData.filesGenerated || 0) * 0.5),
    };
    logAction('compute', 'Calculated productionHours from build metrics');
  }

  // Write meta.json
  const projectDir = join(PATHS.projectsDir, slug);
  if (!existsSync(projectDir)) {
    logError('write-meta', `Project directory not found: src/projects/${slug}`);
    finish();
  }

  writeFile(join(projectDir, 'meta.json'), JSON.stringify(metaData, null, 2) + '\n');
  logVerbose(`Wrote meta.json for "${slug}" with ${Object.keys(metaData).length} top-level fields`);
}

// ═══════════════════════════════════════════════════
//  COMMAND: install-components
// ═══════════════════════════════════════════════════

function installComponents() {
  log('\n── install-components ──');

  if (!existsSync(PATHS.componentsDir)) {
    if (!dryRun) mkdirSync(PATHS.componentsDir, { recursive: true });
  }

  // GlossaryTerm.jsx — shared component
  const glossaryTermContent = generateGlossaryTerm();
  writeFile(join(PATHS.componentsDir, 'GlossaryTerm.jsx'), glossaryTermContent);

  // CustomTooltip.jsx — shared component
  const customTooltipContent = generateCustomTooltip();
  writeFile(join(PATHS.componentsDir, 'CustomTooltip.jsx'), customTooltipContent);

  // InsightCallout.jsx — shared component
  const insightCalloutContent = generateInsightCallout();
  writeFile(join(PATHS.componentsDir, 'InsightCallout.jsx'), insightCalloutContent);

  logVerbose('Installed 3 shared components to src/components/');
}

function generateGlossaryTerm() {
  return `import React, { useState, useRef, useEffect } from 'react';
import { Copy, Check } from 'lucide-react';

/**
 * Shared GlossaryTerm component — used by all projects.
 * Generated by hub-gen.mjs install-components. Do not edit manually.
 *
 * Usage in project components:
 *   import { GlossaryTerm } from '../../components/GlossaryTerm';
 *   <GlossaryTerm term="MCP" glossary={glossaryTerms}>Model Context Protocol</GlossaryTerm>
 *
 * The \`glossary\` prop is a map of term → { definition, researchPrompt }.
 * Each project passes its own glossaryTerms data.
 */
export function GlossaryTerm({ term, children, glossary, accentColor = 'indigo' }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [flipUp, setFlipUp] = useState(false);
  const ref = useRef(null);
  const flyoutRef = useRef(null);

  const data = glossary?.[term];

  useEffect(() => {
    if (!open) return;
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const handleKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  useEffect(() => {
    if (open && flyoutRef.current) {
      const rect = flyoutRef.current.getBoundingClientRect();
      setFlipUp(rect.bottom > window.innerHeight);
    }
  }, [open]);

  if (!data) return <>{children}</>;

  const handleCopy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(data.researchPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <span ref={ref} className="relative inline">
      <span
        onClick={() => setOpen(!open)}
        className={\`border-b border-dotted border-\${accentColor}-500/40 cursor-pointer hover:border-solid hover:bg-\${accentColor}-500/10 transition-colors\`}
      >
        {children}
      </span>
      {open && (
        <div
          ref={flyoutRef}
          className={\`absolute z-50 \${flipUp ? 'bottom-full mb-2' : 'top-full mt-2'} left-0 bg-gray-800 border border-gray-700 rounded-lg shadow-xl p-4 w-[360px]\`}
        >
          <p className="text-sm font-bold text-white mb-1.5">{term}</p>
          <p className="text-xs text-gray-300 leading-relaxed mb-3">{data.definition}</p>
          <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Deep dive with Research Visualizer:</p>
          <div className="bg-gray-950 border border-gray-700 rounded-lg px-3 py-2 flex items-start gap-2">
            <p className="font-mono text-[11px] text-gray-300 leading-relaxed flex-1">{data.researchPrompt}</p>
            <button onClick={handleCopy} className="text-gray-500 hover:text-white cursor-pointer flex-shrink-0 mt-0.5">
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>
      )}
    </span>
  );
}
`;
}

function generateCustomTooltip() {
  return `import React from 'react';

/**
 * Shared CustomTooltip for Recharts — used by all projects.
 * Generated by hub-gen.mjs install-components. Do not edit manually.
 *
 * Usage in project components:
 *   import CustomTooltip from '../../components/CustomTooltip';
 *   <Tooltip content={<CustomTooltip />} />
 */
export default function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 shadow-xl text-xs">
      <p className="text-gray-300 font-medium mb-1">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} style={{ color: entry.color || entry.fill }} className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: entry.color || entry.fill }} />
          <span className="text-gray-400">{entry.name}:</span>
          <span className="font-medium">{typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}{entry.unit || ''}</span>
        </p>
      ))}
    </div>
  );
}
`;
}

function generateInsightCallout() {
  return `import React from 'react';
import { Lightbulb } from 'lucide-react';

/**
 * Shared InsightCallout component — used by all projects.
 * Generated by hub-gen.mjs install-components. Do not edit manually.
 *
 * Usage in project components:
 *   import InsightCallout from '../../components/InsightCallout';
 *   <InsightCallout color="emerald">Key insight here</InsightCallout>
 */
export default function InsightCallout({ children, color = 'violet' }) {
  const colorMap = {
    violet: 'border-violet-500/30 bg-violet-500/5 text-violet-300',
    amber: 'border-amber-500/30 bg-amber-500/5 text-amber-300',
    emerald: 'border-emerald-500/30 bg-emerald-500/5 text-emerald-300',
    blue: 'border-blue-500/30 bg-blue-500/5 text-blue-300',
    red: 'border-red-500/30 bg-red-500/5 text-red-300',
    cyan: 'border-cyan-500/30 bg-cyan-500/5 text-cyan-300',
    orange: 'border-orange-500/30 bg-orange-500/5 text-orange-300',
    indigo: 'border-indigo-500/30 bg-indigo-500/5 text-indigo-300',
    rose: 'border-rose-500/30 bg-rose-500/5 text-rose-300',
    teal: 'border-teal-500/30 bg-teal-500/5 text-teal-300',
    purple: 'border-purple-500/30 bg-purple-500/5 text-purple-300',
  };
  return (
    <div className={\`border rounded-lg px-4 py-3 text-sm flex items-start gap-3 \${colorMap[color] || colorMap.violet}\`}>
      <Lightbulb className="w-4 h-4 flex-shrink-0 mt-0.5 opacity-70" />
      <div>{children}</div>
    </div>
  );
}
`;
}

// ═══════════════════════════════════════════════════
//  COMMAND: scaffold (Phase 0B)
// ═══════════════════════════════════════════════════

function scaffold() {
  log('\n── scaffold ──');
  log('  Scaffold command generates hub structure files.');
  log('  For full scaffold, see hub-scaffold-templates.md.');
  log('  This command ensures directory structure and shared components exist.');

  // Ensure directories
  const dirs = [
    PATHS.srcDir,
    PATHS.projectsDir,
    PATHS.componentsDir,
  ];
  for (const dir of dirs) {
    if (!existsSync(dir)) {
      if (!dryRun) mkdirSync(dir, { recursive: true });
      logAction('mkdir', dir);
    }
  }

  // Install shared components
  installComponents();

  // Generate registry from config (if config exists)
  if (existsSync(PATHS.hubConfig)) {
    syncRegistry();
  } else {
    logWarn('scaffold', 'hub-config.json not found — skipping registry generation');
  }

  logVerbose('Scaffold complete');
}

// ═══════════════════════════════════════════════════
//  COMMAND: doctor (delegate to hub-doctor.mjs)
// ═══════════════════════════════════════════════════

function doctor() {
  log('\n── doctor ──');
  const doctorPath = join(__dirname, 'hub-doctor.mjs');
  if (!existsSync(doctorPath)) {
    logError('doctor', `hub-doctor.mjs not found at ${doctorPath}`);
    finish();
  }

  // Delegate to hub-doctor
  const doctorArgs = [doctorPath, HUB, ...flags].join(' ');
  try {
    const output = execSync(`node ${doctorArgs}`, { encoding: 'utf-8', stdio: 'pipe' });
    log(output);
    logAction('doctor', 'Hub doctor completed');
  } catch (e) {
    log(e.stdout || '');
    log(e.stderr || '');
    logError('doctor', `Hub doctor exited with code ${e.status}`);
  }
}

// ═══════════════════════════════════════════════════
//  DISPATCH
// ═══════════════════════════════════════════════════

log(`\n══════════════════════════════════════════════════`);
log(`  HUB-GEN${dryRun ? ' (DRY RUN)' : ''}`);
log(`  Hub:     ${HUB}`);
log(`  Command: ${command}`);
log(`══════════════════════════════════════════════════`);

switch (command) {
  case 'sync-registry':
    syncRegistry();
    break;
  case 'add-project':
    addProject();
    break;
  case 'write-meta':
    writeMeta();
    break;
  case 'install-components':
    installComponents();
    break;
  case 'scaffold':
    scaffold();
    break;
  case 'doctor':
    doctor();
    break;
  default:
    logError('dispatch', `Unknown command: ${command}`);
}

finish();
