# Hub Scaffold Templates

These are the **exact files** the agent must produce when scaffolding a new Research Hub during Phase 0B-SCAFFOLD. Copy them verbatim, adjusting only the values marked with `<placeholder>`.

## src/App.jsx

The hub shell with:
- **Two-section sidebar**: "Personal Research" (local projects) + "Shared Research" (public library, hidden when no library configured)
- **Independent search** per section
- **Back navigation**: back button bar at top of main content + sidebar header click + direct project switching
- **Public library import** via Vite alias `@public-library` — fails gracefully if not configured
- **Community badge** on shared research projects when viewed

```jsx
import React, { useState, useEffect, Suspense } from 'react';
import {
  Search, ChevronLeft, ChevronRight, ArrowLeft, Home, Menu, X,
  Microscope, FlaskConical, Library, Sparkles,
} from 'lucide-react';
import { projectRegistry, projectComponents } from './projects';
import HubHome from './components/HubHome';

// Import public library projects via Vite alias — resolves to the public library's src/projects
let publicProjectRegistry = [];
let publicProjectComponents = {};
try {
  const publicLib = await import('@public-library/projects');
  publicProjectRegistry = publicLib.projectRegistry || [];
  publicProjectComponents = publicLib.projectComponents || {};
} catch (e) {
  // Public library not configured or not available — show local projects only
}

const hasPublicLibrary = publicProjectRegistry.length > 0;

function ProjectIcon({ iconName, className }) {
  const icons = {
    Building2: (props) => (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/>
      </svg>
    ),
    Axe: (props) => (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="m14 12-8.5 8.5a2.12 2.12 0 1 1-3-3L11 9"/><path d="M15 13 9 7l4-4 6 6h3a8 8 0 0 1-7 7z"/>
      </svg>
    ),
    Globe: (props) => (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>
      </svg>
    ),
    Zap: (props) => (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/>
      </svg>
    ),
    GraduationCap: (props) => (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"/><path d="M22 10v6"/><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/>
      </svg>
    ),
    Coffee: (props) => (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M10 2v2"/><path d="M14 2v2"/><path d="M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a2 2 0 1 1 0 4h-1"/><path d="M6 2v2"/>
      </svg>
    ),
  };
  const Icon = icons[iconName] || FlaskConical;
  return <Icon className={className} />;
}

const ACCENT_COLORS = {
  cyan: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500', ring: 'ring-cyan-500/20' },
  orange: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'border-orange-500', ring: 'ring-orange-500/20' },
  violet: { bg: 'bg-violet-500/10', text: 'text-violet-400', border: 'border-violet-500', ring: 'ring-violet-500/20' },
  emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500', ring: 'ring-emerald-500/20' },
  rose: { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500', ring: 'ring-rose-500/20' },
  blue: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500', ring: 'ring-blue-500/20' },
  amber: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500', ring: 'ring-amber-500/20' },
};

function getAccent(color) {
  return ACCENT_COLORS[color] || ACCENT_COLORS.cyan;
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function SidebarProjectList({ projects, searchQuery, activeProject, activeSource, source, onProjectClick, sidebarOpen }) {
  const filtered = searchQuery
    ? projects.filter(
        p =>
          p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.subtitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (p.query && p.query.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : projects;

  if (filtered.length === 0 && sidebarOpen) {
    return (
      <div className="px-3 py-3 text-center text-xs text-gray-600">
        {searchQuery ? 'No matches' : source === 'local' ? 'No personal projects yet' : 'No shared projects'}
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      {filtered.map((project) => {
        const isActive = activeProject === project.slug && activeSource === source;
        const accent = getAccent(project.accentColor);
        return (
          <button
            key={project.slug}
            onClick={() => onProjectClick(project.slug, source)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150 group ${
              isActive
                ? `${accent.bg} ${accent.text}`
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
            }`}
            title={project.title}
          >
            <div className={`flex-shrink-0 ${isActive ? accent.text : 'text-gray-500 group-hover:text-gray-400'}`}>
              <ProjectIcon iconName={project.icon} className="w-4 h-4" />
            </div>
            {sidebarOpen && (
              <div className="min-w-0 text-left">
                <div className="truncate font-medium text-[13px] leading-tight">
                  {project.title}
                </div>
                <div className="truncate text-[10px] text-gray-500 mt-0.5">
                  {formatDate(project.createdAt)}
                </div>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default function App() {
  const [activeProject, setActiveProject] = useState(null);
  const [activeSource, setActiveSource] = useState(null); // 'local' or 'library'
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [personalSearch, setPersonalSearch] = useState('');
  const [sharedSearch, setSharedSearch] = useState('');

  const sortedProjects = [...projectRegistry].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );

  const sortedPublicProjects = [...publicProjectRegistry].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );

  const handleProjectClick = (slug, source = 'local') => {
    setActiveProject(slug);
    setActiveSource(source);
    setMobileMenuOpen(false);
  };

  const handleBack = () => {
    setActiveProject(null);
    setActiveSource(null);
    setMobileMenuOpen(false);
  };

  // Resolve the active component from either local or public library
  const ActiveProjectComponent = activeProject
    ? activeSource === 'library'
      ? publicProjectComponents[activeProject]
      : projectComponents[activeProject]
    : null;

  const activeProjectMeta = activeProject
    ? (activeSource === 'library' ? publicProjectRegistry : projectRegistry).find(p => p.slug === activeProject)
    : null;

  return (
    <div className="flex h-screen overflow-hidden bg-gray-950">
      {/* Mobile menu button */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 bg-gray-800/90 backdrop-blur p-2 rounded-lg border border-gray-700 shadow-lg"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
      >
        {mobileMenuOpen ? (
          <X className="w-5 h-5 text-gray-300" />
        ) : (
          <Menu className="w-5 h-5 text-gray-300" />
        )}
      </button>

      {/* Sidebar */}
      <aside
        className={`
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
          ${sidebarOpen ? 'w-72' : 'w-16'}
          fixed lg:static inset-y-0 left-0 z-40
          bg-gray-900/95 backdrop-blur-sm border-r border-gray-800
          flex flex-col transition-all duration-300
        `}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-800 flex-shrink-0">
          {sidebarOpen ? (
            <button onClick={handleBack} className="flex items-center gap-3 w-full text-left group">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                <Microscope className="w-4.5 h-4.5 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-sm font-bold text-white tracking-tight truncate group-hover:text-indigo-300 transition-colors">
                  Research Hub
                </h1>
                <p className="text-[10px] text-gray-500 truncate">
                  {projectRegistry.length} personal{hasPublicLibrary ? ` · ${publicProjectRegistry.length} shared` : ''}
                </p>
              </div>
            </button>
          ) : (
            <button onClick={handleBack} className="flex justify-center w-full group">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center group-hover:shadow-lg group-hover:shadow-indigo-500/20 transition-shadow">
                <Microscope className="w-4.5 h-4.5 text-white" />
              </div>
            </button>
          )}
        </div>

        {/* Scrollable sidebar content */}
        <div className="flex-1 overflow-y-auto">

          {/* ── Personal Research Section ── */}
          {sidebarOpen && (
            <div className="px-4 pt-4 pb-1 flex-shrink-0">
              <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3 h-3" />
                Personal Research
              </span>
            </div>
          )}

          {/* Personal search */}
          {sidebarOpen && (
            <div className="px-3 pt-2 pb-1 flex-shrink-0">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search personal..."
                  value={personalSearch}
                  onChange={(e) => setPersonalSearch(e.target.value)}
                  className="w-full bg-gray-800/50 border border-gray-700/50 rounded-lg pl-8 pr-3 py-1.5 text-xs text-gray-300 placeholder-gray-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-colors"
                />
              </div>
            </div>
          )}

          {/* Personal project list */}
          <nav className="px-2 py-1">
            <SidebarProjectList
              projects={sortedProjects}
              searchQuery={personalSearch}
              activeProject={activeProject}
              activeSource={activeSource}
              source="local"
              onProjectClick={handleProjectClick}
              sidebarOpen={sidebarOpen}
            />
          </nav>

          {/* ── Shared Research Section (only when public library exists) ── */}
          {hasPublicLibrary && (
            <>
              {sidebarOpen && (
                <div className="px-4 pt-4 pb-1 flex-shrink-0 border-t border-gray-800/50 mt-2">
                  <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Library className="w-3 h-3" />
                    Shared Research
                  </span>
                </div>
              )}

              {/* Shared search */}
              {sidebarOpen && (
                <div className="px-3 pt-2 pb-1 flex-shrink-0">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                    <input
                      type="text"
                      placeholder="Search shared..."
                      value={sharedSearch}
                      onChange={(e) => setSharedSearch(e.target.value)}
                      className="w-full bg-gray-800/50 border border-gray-700/50 rounded-lg pl-8 pr-3 py-1.5 text-xs text-gray-300 placeholder-gray-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-colors"
                    />
                  </div>
                </div>
              )}

              {/* Shared project list */}
              <nav className="px-2 py-1">
                <SidebarProjectList
                  projects={sortedPublicProjects}
                  searchQuery={sharedSearch}
                  activeProject={activeProject}
                  activeSource={activeSource}
                  source="library"
                  onProjectClick={handleProjectClick}
                  sidebarOpen={sidebarOpen}
                />
              </nav>
            </>
          )}
        </div>

        {/* Collapse toggle */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="hidden lg:flex p-3 border-t border-gray-800 text-gray-500 hover:text-gray-300 transition-colors items-center justify-center flex-shrink-0"
        >
          {sidebarOpen ? (
            <ChevronLeft className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>
      </aside>

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 z-30 bg-black/60 backdrop-blur-sm"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Main content */}
      <main className={`flex-1 flex flex-col ${activeProject ? 'overflow-hidden' : 'overflow-y-auto'}`}>
        {activeProject && ActiveProjectComponent ? (
          <>
            {/* Back bar */}
            <div className={`flex-shrink-0 border-b px-4 py-2 flex items-center gap-3 ${
              activeSource === 'library'
                ? 'bg-indigo-500/10 border-indigo-500/20'
                : 'bg-gray-900/50 border-gray-800'
            }`}>
              <button
                onClick={handleBack}
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
              <span className="text-gray-700">|</span>
              <span className="text-xs text-gray-400 truncate">{activeProjectMeta?.title}</span>
              {activeSource === 'library' && (
                <>
                  <span className="text-gray-700">·</span>
                  <span className="inline-flex items-center gap-1 text-xs text-indigo-400">
                    <Library className="w-3 h-3" />
                    Community — read-only
                  </span>
                </>
              )}
            </div>
            <div className="flex-1 overflow-hidden">
              <Suspense
                fallback={
                  <div className="flex items-center justify-center h-full">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                      <p className="text-sm text-gray-500">Loading {activeProjectMeta?.title || 'project'}...</p>
                    </div>
                  </div>
                }
              >
                <ActiveProjectComponent />
              </Suspense>
            </div>
          </>
        ) : (
          <HubHome
            projects={sortedProjects}
            publicProjects={publicProjectRegistry}
            onProjectClick={handleProjectClick}
            getAccent={getAccent}
            formatDate={formatDate}
            ProjectIcon={ProjectIcon}
          />
        )}
      </main>
    </div>
  );
}
```

## src/components/HubHome.jsx

Landing page with two browsable areas: "My Research" (personal project cards) and "Public Library" (community project cards with search). Shows aggregate telemetry stats, lens badges, community badges, hours-saved highlights, and readability/Bloom's metrics.

```jsx
import React, { useState } from 'react';
import {
  FlaskConical, ArrowRight, Sparkles, Clock, Search, BarChart3,
  FileText, Database, Package, Timer, BookOpen, Zap, GraduationCap, Brain, Eye,
  Library, Users,
} from 'lucide-react';

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

function ProjectCard({ project, onProjectClick, getAccent, formatDate, ProjectIcon, source = 'local' }) {
  const accent = getAccent(project.accentColor);
  const t = project.telemetry;
  const isLibrary = source === 'library';

  return (
    <button
      onClick={() => onProjectClick(project.slug, source)}
      className="group relative text-left p-5 rounded-xl border border-gray-800/80 bg-gray-900/50 hover:bg-gray-800/50 hover:border-gray-700 transition-all duration-200 hover:shadow-lg hover:shadow-black/20"
    >
      {/* Accent top border */}
      <div className={`absolute top-0 left-4 right-4 h-px ${accent.border} opacity-50 group-hover:opacity-100 transition-opacity`} />

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
            <TelemetryStat icon={Timer} value={formatDuration(t.durationMinutes)} label="AI build time" />
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
          <span className="text-[10px] text-gray-600">
            {formatDate(project.createdAt)}
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
        <ArrowRight className="w-3.5 h-3.5 text-gray-600 group-hover:text-gray-400 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
      </div>
    </button>
  );
}

export default function HubHome({ projects, publicProjects = [], onProjectClick, getAccent, formatDate, ProjectIcon }) {
  const [librarySearch, setLibrarySearch] = useState('');

  const sortedPublicProjects = [...publicProjects].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );

  const filteredPublicProjects = librarySearch
    ? sortedPublicProjects.filter(
        p =>
          p.title.toLowerCase().includes(librarySearch.toLowerCase()) ||
          p.subtitle.toLowerCase().includes(librarySearch.toLowerCase()) ||
          (p.query && p.query.toLowerCase().includes(librarySearch.toLowerCase()))
      )
    : sortedPublicProjects;

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
            <h3 className="text-sm font-medium text-gray-400 mb-1">No personal research yet</h3>
            <p className="text-xs text-gray-600 max-w-sm mx-auto">
              Start a new research project by asking your AI assistant to research any topic.
              It will appear here as an interactive dashboard.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {projects.map((project) => (
              <ProjectCard
                key={project.slug}
                project={project}
                onProjectClick={onProjectClick}
                getAccent={getAccent}
                formatDate={formatDate}
                ProjectIcon={ProjectIcon}
                source="local"
              />
            ))}
          </div>
        )}
      </div>

      {/* Public Library Section */}
      {publicProjects.length > 0 && (
        <div className="max-w-6xl mx-auto px-6 py-8 border-t border-gray-800/50">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Library className="w-5 h-5 text-indigo-400" />
              Public Library
              <span className="text-xs font-normal text-gray-500 ml-1">
                {publicProjects.length} community project{publicProjects.length !== 1 ? 's' : ''}
              </span>
            </h2>
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
          <p className="text-xs text-gray-500 mb-5">
            Community-contributed research dashboards. Browse and explore — read-only.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredPublicProjects.map((project) => (
              <ProjectCard
                key={`lib-${project.slug}`}
                project={project}
                onProjectClick={onProjectClick}
                getAccent={getAccent}
                formatDate={formatDate}
                ProjectIcon={ProjectIcon}
                source="library"
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
    </div>
  );
}
```

## Other Scaffold Files (unchanged — copy verbatim)

### src/projects/index.js
```js
import { lazy } from 'react';

export const projectRegistry = [];

export const projectComponents = {};
```

### src/main.jsx
```jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

### src/index.css
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    @apply bg-gray-950 text-gray-100 antialiased;
  }

  ::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }
  ::-webkit-scrollbar-track {
    @apply bg-transparent;
  }
  ::-webkit-scrollbar-thumb {
    @apply bg-gray-700 rounded-full;
  }
  ::-webkit-scrollbar-thumb:hover {
    @apply bg-gray-600;
  }
}
```

### vite.config.js

**Note:** The `@public-library` alias is only added during Phase 0B-LIBRARY. During initial scaffold (Phase 0B-SCAFFOLD), omit the alias. Phase 0B-LIBRARY adds it.

**Initial scaffold (no library yet):**
```js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5180,
    host: true,
  },
});
```

**After Phase 0B-LIBRARY adds the alias:**
```js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5180,
    host: true,
  },
  resolve: {
    alias: {
      '@public-library': path.resolve('<publicLibrary.path>', 'src'),
    },
  },
});
```

### tailwind.config.js

**Note:** When the public library is configured, add its `src/` to the content array so Tailwind scans library component classes.

**Initial scaffold:**
```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
};
```

**After Phase 0B-LIBRARY:**
```js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    '<publicLibrary.path>/src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
```

### postcss.config.js
```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

### index.html
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🔬</text></svg>" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Research Hub</title>
  </head>
  <body class="bg-gray-950">
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

### .gitignore
```
node_modules/
dist/
.DS_Store
*.local
```

### package.json
```json
{
  "name": "<hub-name>",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "lucide-react": "^0.344.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "recharts": "^2.12.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.56",
    "@types/react-dom": "^18.2.19",
    "@vitejs/plugin-react": "^4.2.1",
    "autoprefixer": "^10.4.17",
    "postcss": "^8.4.35",
    "tailwindcss": "^3.4.1",
    "vite": "^5.1.4"
  }
}
```
