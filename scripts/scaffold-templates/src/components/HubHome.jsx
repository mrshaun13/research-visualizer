import React, { useState } from 'react';
import {
  FlaskConical, Sparkles, Clock, Search, BarChart3, CheckCircle,
  FileText, Database, Package, Timer, BookOpen, Zap, GraduationCap, Brain, Eye,
  Library, Users, HardDrive, GitBranch, Globe, ChevronRight,
} from 'lucide-react';
import ProjectDetailFlyout from './ProjectDetailFlyout';
import CompareView from './CompareView';

const _telemetryModules = import.meta.glob('/src/projects/*/meta.json', { eager: true });
// Public library meta.json files — resolved via @public-library Vite alias
const _publicTelemetryModules = import.meta.glob('/@public-library/projects/*/meta.json', { eager: true });
const TELEMETRY_CACHE = Object.fromEntries([
  ...Object.entries(_telemetryModules).map(([path, mod]) => {
    const slug = path.split('/')[3];
    return [slug, mod.default ?? mod];
  }),
  ...Object.entries(_publicTelemetryModules).map(([path, mod]) => {
    const parts = path.split('/');
    const projIdx = parts.indexOf('projects');
    const slug = projIdx >= 0 ? parts[projIdx + 1] : parts[parts.length - 2];
    return [slug, mod.default ?? mod];
  }),
]);

const LENS_BADGES = {
  standard: { label: 'Research', bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
  product: { label: 'Product Compare', bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
  population: { label: 'Population', bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  behavior: { label: 'Behavior', bg: 'bg-violet-500/10', text: 'text-violet-400', border: 'border-violet-500/20' },
  industry: { label: 'Industry', bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/20' },
  culture: { label: 'Culture', bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/20' },
};

function LensBadge({ lens }) {
  const badge = LENS_BADGES[lens] || LENS_BADGES.standard;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${badge.bg} ${badge.text} ${badge.border}`}>
      {badge.label}
    </span>
  );
}

function CommunityBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border bg-indigo-500/10 text-indigo-400 border-indigo-500/20">
      <Users className="w-2.5 h-2.5" />
      Community
    </span>
  );
}

function formatDuration(minutes) {
  if (!minutes) return '—';
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function TelemetryStat({ icon: Icon, value, label, className = '' }) {
  if (value === null || value === undefined) return null;
  return (
    <div className={`flex items-center gap-1.5 ${className}`} title={label}>
      <Icon className="w-3 h-3 text-gray-600 flex-shrink-0" />
      <span className="text-[10px] text-gray-500">{value}</span>
    </div>
  );
}

function TimingBadge({ timingSource }) {
  const isVerified = timingSource === 'verified';
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[9px] font-medium ${isVerified ? 'text-emerald-400' : 'text-gray-500'}`}
      title={isVerified ? 'Timing verified by build log' : 'Timing is an AI estimate'}
    >
      {isVerified
        ? <CheckCircle className="w-2.5 h-2.5" />
        : <span className="text-[10px] leading-none">~</span>
      }
    </span>
  );
}

const BLOOMS_COLORS = {
  1: 'text-gray-400', 2: 'text-blue-400', 3: 'text-green-400',
  4: 'text-yellow-400', 5: 'text-orange-400', 6: 'text-red-400',
};

function formatHours(hours) {
  if (!hours) return '—';
  if (hours < 1) return '<1h';
  return hours >= 10 ? `${Math.round(hours)}h` : `${hours.toFixed(1)}h`;
}

function AggregateStats({ projects }) {
  const withTelemetry = projects.filter(p => p.telemetry);
  if (withTelemetry.length === 0) return null;

  const totalMinutes = withTelemetry.reduce((sum, p) => sum + (p.telemetry.durationMinutes || 0), 0);
  const totalSearches = withTelemetry.reduce((sum, p) => sum + (p.telemetry.searchesPerformed || 0), 0);
  const totalSources = withTelemetry.reduce((sum, p) => sum + (p.telemetry.sourcesCount || 0), 0);
  const totalCharts = withTelemetry.reduce((sum, p) => sum + (p.telemetry.chartsBuilt || 0), 0);
  const totalDataPoints = withTelemetry.reduce((sum, p) => sum + (p.telemetry.dataPointsCollected || 0), 0);
  const totalProducts = withTelemetry.reduce((sum, p) => sum + (p.telemetry.productsCompared || 0), 0);
  const totalHoursSaved = withTelemetry.reduce((sum, p) => sum + (p.telemetry.hoursSaved?.totalHoursSaved || 0), 0);

  const stats = [
    { icon: Sparkles, value: projects.length, label: `project${projects.length !== 1 ? 's' : ''}` },
    { icon: Zap, value: formatHours(totalHoursSaved), label: 'hours saved', highlight: true },
    { icon: Clock, value: formatDuration(totalMinutes), label: 'AI build time' },
    { icon: Search, value: totalSearches, label: 'web searches' },
    { icon: BookOpen, value: totalSources, label: 'sources cited' },
    { icon: BarChart3, value: totalCharts, label: 'charts built' },
    { icon: Database, value: totalDataPoints.toLocaleString(), label: 'data points' },
  ];
  if (totalProducts > 0) {
    stats.push({ icon: Package, value: totalProducts, label: 'products compared' });
  }

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-6">
      {stats.map((stat, i) => (
        <span key={i} className={`flex items-center gap-1.5 text-xs ${stat.highlight ? 'text-emerald-500' : 'text-gray-500'}`} title={stat.label}>
          <stat.icon className={`w-3.5 h-3.5 ${stat.highlight ? 'text-emerald-400' : 'text-indigo-400/70'}`} />
          <span className={`font-medium ${stat.highlight ? 'text-emerald-400' : 'text-gray-400'}`}>{stat.value}</span>
          <span>{stat.label}</span>
        </span>
      ))}
    </div>
  );
}

const VISIBILITY_CONFIG = {
  local: { icon: HardDrive, label: 'Local', bg: 'bg-gray-800/50', text: 'text-gray-400', border: 'border-gray-700/50' },
  personal: { icon: GitBranch, label: 'Synced', bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
  public: { icon: Globe, label: 'Public', bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
};

function VisibilityBadge({ visibility = 'personal' }) {
  const config = VISIBILITY_CONFIG[visibility] || VISIBILITY_CONFIG.personal;
  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border ${config.bg} ${config.text} ${config.border}`}
      title={`Visibility: ${config.label}`}>
      <Icon className="w-2.5 h-2.5" />
      {config.label}
    </span>
  );
}

function ProjectCard({ project, onProjectClick, getAccent, formatDate, ProjectIcon, source = 'local', telemetry, onDetailClick, compareSelected, onCompareToggle }) {
  const accent = getAccent(project.accentColor);
  const t = telemetry || project.telemetry;
  const isLibrary = source === 'library';

  return (
    <div
      onClick={() => onProjectClick(project.slug, source)}
      role="button"
      tabIndex={0}
      className={`group relative text-left p-5 rounded-xl border bg-gray-900/50 hover:bg-gray-800/50 hover:border-gray-700 transition-all duration-200 hover:shadow-lg hover:shadow-black/20 cursor-pointer ${compareSelected ? 'border-indigo-500/60 ring-1 ring-indigo-500/20' : 'border-gray-800/80'}`}
    >
      {/* Accent top border */}
      <div className={`absolute top-0 left-4 right-4 h-px ${accent.border} opacity-50 group-hover:opacity-100 transition-opacity`} />

      {/* Compare checkbox — top-right, hidden until hover */}
      {onCompareToggle && (
        <label
          className={`absolute top-2.5 right-2.5 z-10 flex items-center justify-center w-5 h-5 rounded transition-opacity cursor-pointer ${compareSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
          onClick={(e) => e.stopPropagation()}
          title="Select for comparison"
        >
          <input
            type="checkbox"
            checked={!!compareSelected}
            onChange={() => onCompareToggle(project.slug)}
            className="w-3.5 h-3.5 rounded border-gray-600 bg-gray-800 text-indigo-500 focus:ring-indigo-500/20 focus:ring-offset-0 cursor-pointer"
          />
        </label>
      )}

      <div className="flex items-start gap-3.5">
        <div className={`w-9 h-9 rounded-lg ${accent.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
          <ProjectIcon iconName={project.icon} className={`w-4.5 h-4.5 ${accent.text}`} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-gray-100 text-sm leading-tight group-hover:text-white transition-colors truncate">
            {project.title}
          </h3>
          <p className="text-xs text-gray-500 mt-1 line-clamp-1">
            {project.subtitle}
          </p>
        </div>
      </div>

      {/* Query preview */}
      {project.query && (
        <p className="text-[11px] text-gray-600 mt-3 line-clamp-2 leading-relaxed italic">
          "{project.query}"
        </p>
      )}

      {/* Telemetry: Hours saved + key stats */}
      {t && (
        <div className="mt-3 space-y-2">
          {/* Hours saved highlight */}
          {t.hoursSaved && (
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
              <Zap className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
              <span className="text-[11px] font-semibold text-emerald-400">
                {formatHours(t.hoursSaved.totalHoursSaved)} saved
              </span>
              <span className="text-[10px] text-emerald-600">
                ({t.hoursSaved.equivalentLabel})
              </span>
            </div>
          )}
          {/* Readability + Bloom's + Consumption */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {t.contentAnalysis && (
              <>
                <TelemetryStat icon={GraduationCap} value={t.contentAnalysis.fleschKincaidLabel} label={`Flesch-Kincaid: Grade ${t.contentAnalysis.fleschKincaidGrade}`} />
                <div className="flex items-center gap-1.5" title={`Bloom's Taxonomy: ${t.contentAnalysis.bloomsLabel} (${t.contentAnalysis.bloomsRange})`}>
                  <Brain className={`w-3 h-3 flex-shrink-0 ${BLOOMS_COLORS[t.contentAnalysis.bloomsLevel] || 'text-gray-500'}`} />
                  <span className={`text-[10px] ${BLOOMS_COLORS[t.contentAnalysis.bloomsLevel] || 'text-gray-500'}`}>{t.contentAnalysis.bloomsLabel}</span>
                </div>
              </>
            )}
            {t.consumptionTime && (
              <TelemetryStat icon={Eye} value={t.consumptionTime.estimatedLabel} label="Estimated time to consume all content" />
            )}
          </div>
          {/* Build stats */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <div className="flex items-center gap-1" title={t.timingSource === 'verified' ? 'Build time verified by build log' : 'Build time is an AI estimate'}>
              <Timer className="w-3 h-3 text-gray-600 flex-shrink-0" />
              <span className="text-[10px] text-gray-500">{formatDuration(t.durationMinutes)}</span>
              <TimingBadge timingSource={t.timingSource} />
            </div>
            <TelemetryStat icon={Search} value={t.searchesPerformed} label="Web searches" />
            <TelemetryStat icon={BookOpen} value={t.sourcesCount} label="Sources cited" />
            <TelemetryStat icon={BarChart3} value={t.chartsBuilt} label="Charts built" />
            <TelemetryStat icon={FileText} value={`${t.sectionsBuilt}s`} label="Sections" />
            {t.productsCompared && (
              <TelemetryStat icon={Package} value={t.productsCompared} label="Products compared" />
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-800/50">
        <div className="flex items-center gap-2">
          <LensBadge lens={project.lens} />
          {isLibrary && <CommunityBadge />}
          {!isLibrary && <VisibilityBadge visibility={project.visibility || 'personal'} />}
          <span className="text-[10px] text-gray-600">
            {formatDate((t && t.runStartedAt) || project.createdAt)}
          </span>
          {t && (
            <>
              <span className="text-[10px] text-gray-700">·</span>
              <span className="text-[10px] text-gray-600" title="Skill version">
                v{t.skillVersion}
              </span>
              {t.includedSetup && (
                <span className="inline-flex items-center px-1.5 py-0 rounded text-[9px] font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20" title="Hub was set up during this run">
                  setup
                </span>
              )}
              {t.model && (
                <>
                  <span className="text-[10px] text-gray-700">·</span>
                  <span className="text-[10px] text-gray-600 truncate max-w-[80px]" title={`Model: ${t.model}`}>
                    {t.model.split('/').pop().split('-').slice(0, 2).join('-')}
                  </span>
                </>
              )}
            </>
          )}
        </div>
        {onDetailClick && (
          <div
            onClick={(e) => { e.stopPropagation(); onDetailClick(project.slug, source); }}
            role="button"
            className="p-1 rounded hover:bg-gray-700/50 text-gray-500 hover:text-indigo-400 transition-colors cursor-pointer"
            title="Extended telemetry"
          >
            <ChevronRight className="w-4 h-4" />
          </div>
        )}
      </div>
    </div>
  );
}

export default function HubHome({ projects, publicProjects = [], onProjectClick, getAccent, formatDate, ProjectIcon }) {
  const [librarySearch, setLibrarySearch] = useState('');
  const [includeMyResearch, setIncludeMyResearch] = useState(false);
  const [detailProject, setDetailProject] = useState(null);
  const [compareSelection, setCompareSelection] = useState({});
  const [showCompare, setShowCompare] = useState(false);

  // Telemetry is pre-loaded at module level via import.meta.glob
  const telemetryCache = TELEMETRY_CACHE;

  const handleDetailClick = (slug, source) => {
    const allProjects = [...projects, ...publicProjects];
    const project = allProjects.find(p => p.slug === slug);
    if (project) {
      setDetailProject({ ...project, telemetry: telemetryCache[slug] || project.telemetry, _source: source });
    }
  };

  const handleCompareToggle = (slug) => {
    setCompareSelection(prev => {
      const next = { ...prev };
      if (next[slug]) delete next[slug];
      else next[slug] = true;
      return next;
    });
  };

  const compareCount = Object.keys(compareSelection).length;
  const allProjectsWithTelemetry = [...projects, ...publicProjects].map(p => ({
    ...p, telemetry: telemetryCache[p.slug] || p.telemetry,
  }));
  const compareProjects = allProjectsWithTelemetry.filter(p => compareSelection[p.slug]);

  // Merge live visibility overrides into project data
  const projectsWithVisibility = projects.map(p => ({
    ...p,
    visibility: p.visibility || 'personal',
  }));

  const sortedPublicProjects = [...publicProjects].sort((a, b) => {
    const aDate = (telemetryCache[a.slug]?.runStartedAt) || a.telemetry?.runStartedAt || a.createdAt || '';
    const bDate = (telemetryCache[b.slug]?.runStartedAt) || b.telemetry?.runStartedAt || b.createdAt || '';
    return new Date(bDate) - new Date(aDate);
  });

  // When "Include my research" is on, add user's public projects back into library results
  const myPublicProjects = includeMyResearch
    ? projectsWithVisibility.filter(p => p.visibility === 'public')
    : [];
  const libraryWithOptionalMine = [...sortedPublicProjects, ...myPublicProjects];

  const filteredPublicProjects = librarySearch
    ? libraryWithOptionalMine.filter(
        p =>
          p.title.toLowerCase().includes(librarySearch.toLowerCase()) ||
          p.subtitle.toLowerCase().includes(librarySearch.toLowerCase()) ||
          (p.query && p.query.toLowerCase().includes(librarySearch.toLowerCase()))
      )
    : libraryWithOptionalMine;

  return (
    <div className="min-h-full">
      {/* Hero */}
      <div className="border-b border-gray-800/50 bg-gradient-to-b from-gray-900/50 to-transparent">
        <div className="max-w-6xl mx-auto px-6 py-12 lg:py-16">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <FlaskConical className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
                Research Hub
              </h1>
            </div>
          </div>
          <p className="text-gray-400 text-sm lg:text-base max-w-2xl leading-relaxed">
            Your collection of AI-powered research dashboards. Each project is an interactive
            visualization built from deep research on a topic you explored.
          </p>
          <AggregateStats projects={projects} />
        </div>
      </div>

      {/* My Research Section */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-indigo-400" />
          My Research
        </h2>
        {projects.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-gray-800 rounded-xl">
            <FlaskConical className="w-10 h-10 text-gray-700 mx-auto mb-3" />
            <h3 className="text-sm font-medium text-gray-400 mb-1">No research yet</h3>
            <p className="text-xs text-gray-600 max-w-sm mx-auto">
              Start a new research project by asking your AI assistant to research any topic.
              It will appear here as an interactive dashboard.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {projectsWithVisibility.map((project) => (
              <ProjectCard
                key={project.slug}
                project={project}
                onProjectClick={onProjectClick}
                getAccent={getAccent}
                formatDate={formatDate}
                ProjectIcon={ProjectIcon}
                source="local"
                telemetry={telemetryCache[project.slug]}
                onDetailClick={handleDetailClick}
                compareSelected={compareSelection[project.slug]}
                onCompareToggle={handleCompareToggle}
              />
            ))}
          </div>
        )}
      </div>

      {/* Public Library Section */}
      {(publicProjects.length > 0 || myPublicProjects.length > 0) && (
        <div className="max-w-6xl mx-auto px-6 py-8 border-t border-gray-800/50">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Library className="w-5 h-5 text-indigo-400" />
              Public Library
              <span className="text-xs font-normal text-gray-500 ml-1">
                {sortedPublicProjects.length} community project{sortedPublicProjects.length !== 1 ? 's' : ''}
              </span>
            </h2>
            <div className="flex items-center gap-3">
              {/* Include my research toggle */}
              <label className="flex items-center gap-1.5 cursor-pointer select-none" title="Include your own public projects in library results">
                <input
                  type="checkbox"
                  checked={includeMyResearch}
                  onChange={(e) => setIncludeMyResearch(e.target.checked)}
                  className="w-3 h-3 rounded border-gray-600 bg-gray-800 text-indigo-500 focus:ring-indigo-500/20 focus:ring-offset-0"
                />
                <span className="text-[10px] text-gray-500">Include my research</span>
              </label>
              <div className="relative w-56">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search library..."
                  value={librarySearch}
                  onChange={(e) => setLibrarySearch(e.target.value)}
                  className="w-full bg-gray-800/50 border border-gray-700/50 rounded-lg pl-8 pr-3 py-1.5 text-xs text-gray-300 placeholder-gray-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-colors"
                />
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-500 mb-3">
            Community-contributed research dashboards. Browse and explore — read-only.
          </p>
          <AggregateStats projects={sortedPublicProjects} />
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mt-5">
            {filteredPublicProjects.map((project) => (
              <ProjectCard
                key={`lib-${project.slug}`}
                project={project}
                onProjectClick={onProjectClick}
                getAccent={getAccent}
                formatDate={formatDate}
                ProjectIcon={ProjectIcon}
                source="library"
                telemetry={telemetryCache[project.slug]}
                onDetailClick={handleDetailClick}
                compareSelected={compareSelection[project.slug]}
                onCompareToggle={handleCompareToggle}
              />
            ))}
            {filteredPublicProjects.length === 0 && (
              <div className="col-span-full text-center py-8 text-xs text-gray-600">
                No library projects match your search
              </div>
            )}
          </div>
        </div>
      )}
      {/* Floating compare button */}
      {compareCount >= 2 && (
        <button
          onClick={() => setShowCompare(true)}
          className="fixed bottom-6 right-6 z-30 flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-xl shadow-lg shadow-indigo-500/30 transition-all"
        >
          Compare {compareCount} projects
        </button>
      )}

      {/* Extended telemetry flyout */}
      {detailProject && (
        <ProjectDetailFlyout
          project={detailProject}
          allProjects={allProjectsWithTelemetry}
          onClose={() => setDetailProject(null)}
        />
      )}

      {/* Compare view overlay */}
      {showCompare && compareProjects.length >= 2 && (
        <CompareView
          projects={compareProjects}
          allProjects={allProjectsWithTelemetry}
          onClose={() => setShowCompare(false)}
        />
      )}
    </div>
  );
}
