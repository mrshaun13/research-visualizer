import React, { useState, useEffect } from 'react';
import {
  X, ChevronDown, ChevronUp, CheckCircle,
} from 'lucide-react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip,
} from 'recharts';
import {
  computeCompareRows,
  PHASE_ORDER, PHASE_LABELS, PHASE_COLORS, formatDuration,
} from './telemetryUtils';

const PROJECT_COLORS = ['#06b6d4', '#8b5cf6', '#f59e0b', '#ef4444', '#22c55e'];

function CompareRadar({ projects, allProjects }) {
  const metrics = ['Searches', 'Sources', 'Sections', 'Charts', 'Files', 'Data Pts'];
  const keys = ['searchesPerformed', 'sourcesCount', 'sectionsBuilt', 'chartsBuilt', 'filesGenerated', 'dataPointsCollected'];

  const maxVals = {};
  keys.forEach(k => {
    maxVals[k] = Math.max(...allProjects.filter(p => p.telemetry).map(p => p.telemetry[k] || 0), 1);
  });

  const data = metrics.map((label, i) => {
    const row = { metric: label };
    projects.forEach((p, pi) => {
      row[`p${pi}`] = p.telemetry ? Math.round(((p.telemetry[keys[i]] || 0) / maxVals[keys[i]]) * 100) : 0;
    });
    return row;
  });

  return (
    <div className="p-4 rounded-xl border border-gray-700/50 bg-gray-800/20">
      <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Build Profile Overlay</h4>
      <ResponsiveContainer width="100%" height={280}>
        <RadarChart data={data}>
          <PolarGrid stroke="#374151" />
          <PolarAngleAxis dataKey="metric" tick={{ fill: '#9ca3af', fontSize: 10 }} />
          <PolarRadiusAxis tick={false} axisLine={false} domain={[0, 100]} />
          {projects.map((p, i) => (
            <Radar
              key={p.slug}
              name={p.title}
              dataKey={`p${i}`}
              stroke={PROJECT_COLORS[i % PROJECT_COLORS.length]}
              fill={PROJECT_COLORS[i % PROJECT_COLORS.length]}
              fillOpacity={0.08}
              strokeWidth={2}
            />
          ))}
          <Tooltip />
        </RadarChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap gap-3 justify-center mt-1">
        {projects.map((p, i) => (
          <div key={p.slug} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PROJECT_COLORS[i % PROJECT_COLORS.length] }} />
            <span className="text-[10px] text-gray-500">{p.title}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function PhaseCompare({ projects }) {
  const maxTotal = Math.max(...projects.map(p => p.telemetry?.durationMinutes || 0));

  return (
    <div className="p-4 rounded-xl border border-gray-700/50 bg-gray-800/20 space-y-3">
      <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Phase Timeline Comparison</h4>
      {projects.map((p, pi) => {
        const pt = p.telemetry?.phaseTiming;
        if (!pt) return null;
        const total = p.telemetry?.durationMinutes || Object.values(pt).reduce((s, v) => s + v, 0);
        const isVerified = p.telemetry?.timingSource === 'verified';
        return (
          <div key={p.slug} className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: PROJECT_COLORS[pi % PROJECT_COLORS.length] }} />
              <span className={`text-[11px] truncate flex-1 ${isVerified ? 'text-gray-400' : 'text-gray-600'}`}>{p.title}</span>
              <span className="text-[10px] text-gray-600 flex items-center gap-0.5">
                {formatDuration(total)}
                {isVerified
                  ? <CheckCircle className="w-2.5 h-2.5 text-emerald-400 ml-0.5" />
                  : <span className="text-gray-600 ml-0.5">~</span>
                }
              </span>
            </div>
            <div className={`flex h-5 rounded overflow-hidden ${!isVerified ? 'opacity-50' : ''}`} style={{ width: maxTotal > 0 ? `${(total / maxTotal) * 100}%` : '100%', minWidth: '60px' }}>
              {PHASE_ORDER.map(phase => {
                const mins = pt[phase] || 0;
                const pct = total > 0 ? (mins / total) * 100 : 0;
                if (pct < 1) return null;
                return (
                  <div
                    key={phase}
                    className="flex items-center justify-center text-[8px] font-bold text-white/70"
                    style={{ width: `${pct}%`, backgroundColor: PHASE_COLORS[phase], minWidth: pct > 5 ? undefined : '4px' }}
                    title={`${PHASE_LABELS[phase]}: ${mins}m`}
                  >
                    {pct > 10 && PHASE_LABELS[phase]}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
      <div className="flex flex-wrap gap-x-3 gap-y-1 pt-1">
        {PHASE_ORDER.map(phase => (
          <div key={phase} className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: PHASE_COLORS[phase] }} />
            <span className="text-[9px] text-gray-600">{PHASE_LABELS[phase]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DeltaIndicator({ values }) {
  if (values.length < 2) return null;
  const numericVals = values.filter(v => typeof v === 'number');
  if (numericVals.length < 2) return null;
  const min = Math.min(...numericVals);
  const max = Math.max(...numericVals);
  const delta = max - min;
  if (delta === 0) return <span className="text-[10px] text-gray-700">—</span>;

  const pctDiff = min > 0 ? ((delta / min) * 100).toFixed(0) : '∞';
  return (
    <span className="text-[10px] text-gray-500">
      Δ {typeof values[0] === 'number' && values[0] % 1 !== 0 ? delta.toFixed(1) : Math.round(delta)}
      {pctDiff !== '∞' && <span className="text-gray-600 ml-1">({pctDiff}%)</span>}
    </span>
  );
}

function CompareTable({ projects }) {
  const rows = computeCompareRows(projects);
  const [collapsedCategories, setCollapsedCategories] = useState({});

  const categories = [...new Set(rows.map(r => r.category))];

  const toggleCategory = (cat) => {
    setCollapsedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-gray-800">
            <th className="py-2 px-3 text-[10px] text-gray-600 uppercase tracking-wider font-medium sticky left-0 bg-gray-950 z-10 min-w-[140px]">Metric</th>
            {projects.map((p, i) => {
              const isVerified = p.telemetry?.timingSource === 'verified';
              return (
                <th key={p.slug} className="py-2 px-3 text-[10px] uppercase tracking-wider font-medium min-w-[120px]" style={{ color: PROJECT_COLORS[i % PROJECT_COLORS.length] }}>
                  <span className="flex items-center gap-1">
                    {p.title.length > 20 ? p.title.slice(0, 18) + '…' : p.title}
                    {isVerified
                      ? <CheckCircle className="w-2.5 h-2.5 text-emerald-400 flex-shrink-0" title="Verified timing" />
                      : <span className="text-gray-600 flex-shrink-0" title="Estimated timing">~</span>
                    }
                  </span>
                </th>
              );
            })}
            {projects.length === 2 && (
              <th className="py-2 px-3 text-[10px] text-gray-600 uppercase tracking-wider font-medium min-w-[80px]">Delta</th>
            )}
          </tr>
        </thead>
        <tbody>
          {categories.map(cat => {
            const catRows = rows.filter(r => r.category === cat);
            const isCollapsed = collapsedCategories[cat];
            return (
              <React.Fragment key={cat}>
                <tr
                  className="border-b border-gray-800/50 cursor-pointer hover:bg-gray-900/50"
                  onClick={() => toggleCategory(cat)}
                >
                  <td colSpan={projects.length + (projects.length === 2 ? 2 : 1)} className="py-2 px-3">
                    <div className="flex items-center gap-2">
                      {isCollapsed ? <ChevronDown className="w-3 h-3 text-gray-600" /> : <ChevronUp className="w-3 h-3 text-gray-600" />}
                      <span className="text-[11px] font-semibold text-indigo-400 uppercase tracking-wider">{cat}</span>
                      <span className="text-[9px] text-gray-700">{catRows.length} fields</span>
                    </div>
                  </td>
                </tr>
                {!isCollapsed && catRows.map((row, ri) => {
                  const isTimingRow = cat === 'Timing';
                  return (
                  <tr key={`${cat}-${ri}`} className="border-b border-gray-800/30 hover:bg-gray-900/30">
                    <td className="py-1.5 px-3 text-[11px] text-gray-500 sticky left-0 bg-gray-950 z-10">{row.label}</td>
                    {row.values.map((val, vi) => {
                      const formatted = row.format ? row.format(val) : (val != null ? String(val) : '—');
                      const isBest = row.best != null && val === row.best;
                      const isEstimated = isTimingRow && projects[vi]?.telemetry?.timingSource !== 'verified';
                      return (
                        <td key={vi} className={`py-1.5 px-3 text-[11px] ${isBest ? 'text-emerald-400 font-semibold' : isEstimated ? 'text-gray-600' : 'text-gray-400'}`}>
                          {isEstimated && val != null ? `~${formatted}` : formatted}
                          {isBest && <span className="ml-1 text-[8px] text-emerald-600">★</span>}
                        </td>
                      );
                    })}
                    {projects.length === 2 && (
                      <td className="py-1.5 px-3">
                        <DeltaIndicator values={row.values} best={row.best} higherIsBetter={row.higherIsBetter} lowerIsBetter={row.lowerIsBetter} />
                      </td>
                    )}
                  </tr>
                  );
                })}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function CompareView({ projects, allProjects, onClose }) {
  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  if (!projects || projects.length < 2) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Full-width overlay */}
      <div className="fixed inset-4 z-50 bg-gray-950 border border-gray-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-white">Compare Projects</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {projects.length} projects selected — all metrics computed from telemetry data
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              {projects.map((p, i) => (
                <div key={p.slug} className="flex items-center gap-1.5 px-2 py-1 rounded-full border border-gray-700/50 bg-gray-800/30">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: PROJECT_COLORS[i % PROJECT_COLORS.length] }} />
                  <span className="text-[10px] text-gray-400 max-w-[100px] truncate">{p.title}</span>
                </div>
              ))}
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-500 hover:text-gray-300 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Visual comparisons */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PhaseCompare projects={projects} />
            <CompareRadar projects={projects} allProjects={allProjects} />
          </div>

          {/* Comparison table */}
          <div className="rounded-xl border border-gray-700/50 bg-gray-800/10">
            <CompareTable projects={projects} allProjects={allProjects} />
          </div>
        </div>
      </div>
    </>
  );
}
