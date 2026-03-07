import React, { useState, useEffect, Suspense } from 'react';
import {
  Search, ChevronLeft, ChevronRight, ArrowLeft, Home, Menu, X,
  Microscope, FlaskConical, Library, Sparkles,
} from 'lucide-react';
import { projectRegistry, projectComponents } from './projects';
import HubHome from './components/HubHome';

// Import local-only projects (gitignored) — fails gracefully if directory doesn't exist yet
let localProjectRegistry = [];
let localProjectComponents = {};
try {
  const localLib = await import('./local-projects');
  localProjectRegistry = localLib.projectRegistry || [];
  localProjectComponents = localLib.projectComponents || {};
} catch (e) {
  // No local-only projects yet — that's fine
}

// Import public library projects via Vite alias — resolves to the public library's src/projects
let publicProjectRegistry = [];
let publicProjectComponents = {};
try {
  const publicLib = await import('@public-library/projects');
  publicProjectRegistry = publicLib.projectRegistry || [];
  publicProjectComponents = publicLib.projectComponents || {};
} catch (e) {
  // Public library not configured or not available — show personal projects only
}

// Merge personal + local registries into one "all my projects" list
const allMyProjects = [
  ...projectRegistry.map(p => ({ ...p, visibility: p.visibility || 'personal' })),
  ...localProjectRegistry.map(p => ({ ...p, visibility: 'local' })),
];
const allMyComponents = { ...projectComponents, ...localProjectComponents };

// Read gitUsername from hub-config for dedup matching
const hubConfigGitUsername = (() => {
  try {
    const libs = JSON.parse(document.querySelector('meta[name="hub-libraries"]')?.content || '[]');
    return libs[0]?.gitUsername || null;
  } catch { return null; }
})();

// Dedup: remove user's own projects from public library
const dedupPublicProjects = publicProjectRegistry.filter(libProject => {
  // Deterministic match: library slug ends with -<gitUsername>
  if (hubConfigGitUsername) {
    const suffix = `-${hubConfigGitUsername}`;
    if (libProject.slug.endsWith(suffix)) return false; // it's ours, exclude
  }
  // Fuzzy fallback: exact match on title + createdAt
  return !allMyProjects.some(
    myP => myP.title === libProject.title && myP.createdAt === libProject.createdAt
  );
});

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

  const sortedProjects = [...allMyProjects].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );

  const sortedPublicProjects = [...dedupPublicProjects].sort(
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

  // Resolve the active component from personal, local, or public library
  const ActiveProjectComponent = activeProject
    ? activeSource === 'library'
      ? publicProjectComponents[activeProject]
      : allMyComponents[activeProject]
    : null;

  const activeProjectMeta = activeProject
    ? (activeSource === 'library' ? publicProjectRegistry : allMyProjects).find(p => p.slug === activeProject)
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
                  {allMyProjects.length} project{allMyProjects.length !== 1 ? 's' : ''}{hasPublicLibrary ? ` · ${dedupPublicProjects.length} shared` : ''}
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

          {/* ── My Research Section (all tiers: local + personal + public) ── */}
          {sidebarOpen && (
            <div className="px-4 pt-4 pb-1 flex-shrink-0">
              <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3 h-3" />
                My Research
              </span>
            </div>
          )}

          {/* My Research search */}
          {sidebarOpen && (
            <div className="px-3 pt-2 pb-1 flex-shrink-0">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search my research..."
                  value={personalSearch}
                  onChange={(e) => setPersonalSearch(e.target.value)}
                  className="w-full bg-gray-800/50 border border-gray-700/50 rounded-lg pl-8 pr-3 py-1.5 text-xs text-gray-300 placeholder-gray-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-colors"
                />
              </div>
            </div>
          )}

          {/* My Research project list */}
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

          {/* ── Public Library Section (deduped — only other people's contributions) ── */}
          {hasPublicLibrary && dedupPublicProjects.length > 0 && (
            <>
              {sidebarOpen && (
                <div className="px-4 pt-4 pb-1 flex-shrink-0 border-t border-gray-800/50 mt-2">
                  <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Library className="w-3 h-3" />
                    Public Library
                  </span>
                </div>
              )}

              {/* Library search */}
              {sidebarOpen && (
                <div className="px-3 pt-2 pb-1 flex-shrink-0">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                    <input
                      type="text"
                      placeholder="Search library..."
                      value={sharedSearch}
                      onChange={(e) => setSharedSearch(e.target.value)}
                      className="w-full bg-gray-800/50 border border-gray-700/50 rounded-lg pl-8 pr-3 py-1.5 text-xs text-gray-300 placeholder-gray-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-colors"
                    />
                  </div>
                </div>
              )}

              {/* Library project list */}
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
            publicProjects={dedupPublicProjects}
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
