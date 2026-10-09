import { useMemo, useState } from 'react';
import DisruptionInjectorModal from './components/optimizer/DisruptionInjectorModal';
import DetectionLogHeader from './components/optimizer/DetectionLogHeader';
import LineActionDrawer from './components/optimizer/LineActionDrawer';
import './styles.css';

const initialLines = [
  { id: 'alpha', name: 'Line Alpha', product: 'Performance Tee · PO-4821', status: 'On Track', output: 92, target: 100, machine: 'Loom 2', elapsed: 0, deficit: 0, color: 'emerald' },
  { id: 'beta', name: 'Line Beta', product: 'Activewear Legging · PO-4798', status: 'Disrupted', output: 54, target: 100, machine: 'Loom 4 Failure', elapsed: 18, deficit: 640, color: 'red', issue: 'Loom 4 Failure' },
  { id: 'gamma', name: 'Line Gamma', product: 'Cotton Polo · PO-4850', status: 'Recovering', output: 76, target: 100, machine: 'Dye lot 7', elapsed: 7, deficit: 210, color: 'amber', issue: 'Dye lot delay' },
];

const initialLogs = [
  { id: 1, time: '10:42:18', category: 'Critical', line: 'Line Beta', message: 'Loom 4 Failure detected · 46% throughput reduction', tone: 'red' },
  { id: 2, time: '10:39:52', category: 'Rerouted', line: 'Line Gamma', message: 'Dye lot delay rerouted to reserve inventory', tone: 'amber' },
  { id: 3, time: '10:35:07', category: 'Optimized', line: 'Line Alpha', message: 'Shift B sequence optimized · +8.4% output', tone: 'emerald' },
  { id: 4, time: '10:28:41', category: 'Queued', line: 'Line Beta', message: 'Recovery sequence queued for operator allocation', tone: 'cyan' },
];

const filters = ['All Logs', 'Optimized', 'Rerouted', 'Queued', 'Critical'];

function Icon({ name, size = 18 }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true };
  const paths = {
    alert: <><path d="M10.3 3.9 2.8 17a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4m0 4h.01" /></>,
    refresh: <><path d="M20 7v5h-5M4 17v-5h5" /><path d="M5.6 9a7 7 0 0 1 11.6-2L20 12M4 12l2.8 5a7 7 0 0 0 11.6-2" /></>,
    close: <><path d="m18 6-12 12M6 6l12 12" /></>,
    chevron: <path d="m9 18 6-6-6-6" />,
    activity: <><path d="M3 12h4l3-8 4 16 3-8h4" /></>,
  };
  return <svg {...common}>{paths[name]}</svg>;
}

function Header({ onInject, onRecalculate, loading }) {
  return (
    <header className="topbar">
      <div>
        <div className="breadcrumb">OPTICHAIN <span>/</span> PRODUCTION</div>
        <h1>Production Optimizer</h1>
        <p className="page-subtitle">AI-powered production control &amp; schedule recovery</p>
      </div>
      <div className="topbar-right">
        <div className="system-indicator"><span className="pulse-dot" /> SYSTEM ACTIVE <span className="divider">|</span> Subsystem ID: IT232174726</div>
        <div className="actions">
          <button className="button button-outline" onClick={onInject}><Icon name="alert" size={16} /> Inject Disruption</button>
          <button className="button button-primary" onClick={onRecalculate} disabled={loading}><Icon name="refresh" size={16} /> {loading ? 'Recalculating…' : 'Force Recalculation'}</button>
        </div>
      </div>
    </header>
  );
}

function MetricCard({ label, value, detail, tone, icon }) {
  return (
    <article className="metric-card glass-card">
      <div className={`metric-icon ${tone}`}><Icon name={icon} size={18} /></div>
      <div className="metric-copy"><span className="metric-label">{label}</span><strong>{value}</strong><span className="metric-detail">{detail}</span></div>
      <span className={`metric-trend ${tone}`}>{tone === 'emerald' ? '↑' : tone === 'amber' ? '↗' : '●'}</span>
    </article>
  );
}

function SectionTitle({ kicker, title, trailing }) {
  return <div className="section-heading"><div><span className="section-kicker">{kicker}</span><h2>{title}</h2></div>{trailing}</div>;
}

function ActiveSequences({ lines, onSelect }) {
  return (
    <section className="panel glass-card sequences-panel">
      <SectionTitle kicker="LIVE SCHEDULE" title="Active Work Sequences" trailing={<span className="live-tag"><span className="pulse-dot" /> LIVE</span>} />
      <div className="sequence-legend"><span><i className="legend-dot emerald" /> On track</span><span><i className="legend-dot red" /> Disrupted</span><span><i className="legend-dot amber" /> Recovering</span></div>
      <div className="timeline">
        <div className="timeline-axis"><span>08:00</span><span>10:00</span><span>12:00</span><span>14:00</span><span>16:00</span></div>
        {lines.map((line, index) => (
          <button className={`line-row line-${line.color}`} key={line.id} onClick={() => onSelect(line)}>
            <span className="line-name">{line.name}<small>{line.product}</small></span>
            <span className="track"><span className={`sequence-bar ${line.color}`} style={{ left: `${index * 3}%`, width: `${line.output}%` }}><span>{line.status}</span></span>
              {line.issue && <span className={`issue-badge ${line.color}`} style={{ left: `${Math.min(line.output + index * 3 + 2, 85)}%` }}><Icon name="alert" size={12} /> {line.issue}</span>}
            </span>
            <span className="line-output">{line.output}<small>%</small></span>
            <Icon name="chevron" size={16} />
          </button>
        ))}
      </div>
      <div className="schedule-footnote"><span><span className="pulse-dot" /> Schedule synced just now</span><span>Click a line to inspect actions <Icon name="chevron" size={13} /></span></div>
    </section>
  );
}

function DetectionLog({ logs }) {
  const [filter, setFilter] = useState('All Logs');
  const [query, setQuery] = useState('');
  const filteredLogs = useMemo(() => logs.filter((log) => {
    const categoryMatches = filter === 'All Logs' || log.category === filter;
    const queryMatches = `${log.line} ${log.message}`.toLowerCase().includes(query.trim().toLowerCase());
    return categoryMatches && queryMatches;
  }), [logs, filter, query]);

  return (
    <section className="panel glass-card log-panel">
      <SectionTitle kicker="SYSTEM EVENTS" title="Real-Time Detection Log" trailing={<span className="log-count">{filteredLogs.length} EVENTS</span>} />
      <DetectionLogHeader filters={filters} activeFilter={filter} onFilter={setFilter} query={query} onQuery={setQuery} />
      <div className="log-list">
        {filteredLogs.map((log) => (
          <article className="log-entry" key={log.id}>
            <span className={`log-indicator ${log.tone}`} />
            <time>{log.time}</time>
            <span className={`log-category ${log.tone}`}>{log.category}</span>
            <div className="log-message"><strong>{log.line}</strong><span>{log.message}</span></div>
            <span className="log-arrow"><Icon name="chevron" size={16} /></span>
          </article>
        ))}
        {filteredLogs.length === 0 && <div className="empty-state"><Icon name="activity" size={22} /><span>No events match your search.</span></div>}
      </div>
    </section>
  );
}

function ImpactMetrics({ recovery, oee }) {
  return (
    <section className="panel glass-card impact-panel">
      <SectionTitle kicker="SELF-HEALING PERFORMANCE" title="AI Impact Metrics" />
      <div className="impact-stat">
        <div><span>Avg. Recovery Time</span><strong>{recovery}<small> min</small></strong></div>
        <div className="sparkline" aria-label="Recovery time trend"><i /><i /><i /><i /><i /><i /><i /></div>
      </div>
      <div className="impact-stat">
        <div><span>OEE % Maintained</span><strong>{oee}<small>%</small></strong></div>
        <div className="oee-ring" style={{ '--progress': `${oee}%` }}><span>{oee}%</span></div>
      </div>
      <div className="impact-footer"><span className="status-pill emerald">▲ 12.6% vs. baseline</span><span>Last 24 hours</span></div>
    </section>
  );
}

function SystemStatus() {
  return <div className="system-footer"><span><i className="pulse-dot" /> AI SCHEDULER ONLINE</span><span>Reinforcement Learning Engine <b>v2.4.1</b></span><span>Last model sync <b>10:42:18</b></span></div>;
}

export default function App() {
  const [lines, setLines] = useState(initialLines);
  const [logs, setLogs] = useState(initialLogs);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedLine, setSelectedLine] = useState(null);
  const [loading, setLoading] = useState(false);
  const [recovery, setRecovery] = useState(14);
  const [oee, setOee] = useState(94);

  function addLog(category, line, message, tone) {
    setLogs((current) => [{ id: Date.now() + Math.random(), time: new Date().toLocaleTimeString('en-GB', { hour12: false }), category, line, message, tone }, ...current]);
  }

  function injectDisruption({ lineId, category, severity }) {
    const line = lines.find((item) => item.id === lineId);
    const reduction = Number(severity);
    setLines((current) => current.map((item) => item.id === lineId
      ? { ...item, output: Math.max(10, item.output - Math.round(reduction * 0.55)), status: 'Disrupted', color: 'red', elapsed: item.elapsed + 1, deficit: item.deficit + Math.round(reduction * 14), issue: category === 'Machine Failure / Loom Breakage' ? 'Loom failure' : category === 'Material Shortage / Dyeing Delay' ? 'Dye lot delay' : 'Operator shortage' }
      : item));
    addLog('Critical', line.name, `${category} injected · ${reduction}% throughput impact`, 'red');
    addLog('Queued', line.name, 'AI self-healing sequence queued for regeneration', 'cyan');
    setModalOpen(false);
  }

  function recalculate() {
    if (loading) return;
    setLoading(true);
    window.setTimeout(() => {
      setLines((current) => current.map((line) => line.status === 'Disrupted'
        ? { ...line, status: 'Recovering', color: 'amber', output: Math.min(88, line.output + 14) }
        : { ...line, output: Math.min(100, line.output + 3) }));
      setRecovery((value) => Math.max(6, value - 2));
      setOee((value) => Math.min(99, value + 1));
      addLog('Optimized', 'Production schedule', 'Sequence regenerated · throughput and recovery metrics recalculated', 'emerald');
      setLoading(false);
    }, 1500);
  }

  function executeAllocation({ lineId, destination, workers }) {
    const line = lines.find((item) => item.id === lineId);
    setLines((current) => current.map((item) => item.id === lineId
      ? { ...item, status: 'Recovering', color: 'amber', output: Math.min(96, item.output + 12 + workers * 3), issue: `Rerouted to ${destination}`, deficit: Math.max(0, item.deficit - 150) }
      : item));
    addLog('Rerouted', line.name, `Work reallocated to ${destination} · ${workers} floating operator${workers === 1 ? '' : 's'} assigned`, 'amber');
    setSelectedLine(null);
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#" aria-label="OPTICHAIN home"><span className="brand-mark">O</span><span>OPTICHAIN<small>INTELLIGENCE PLATFORM</small></span></a>
        <div className="nav-group"><span className="nav-caption">WORKSPACE</span>
          <a className="nav-link" href="#"><span className="nav-icon">▦</span> Overview</a>
          <a className="nav-link" href="#"><span className="nav-icon">⌁</span> Market Prophet</a>
          <a className="nav-link" href="#"><span className="nav-icon">◇</span> Procurement Guardian</a>
          <a className="nav-link" href="#"><span className="nav-icon">▤</span> Inventory Guardian</a>
          <a className="nav-link active" href="#"><span className="nav-icon">⌘</span> Production Optimizer <i /></a>
        </div>
        <div className="sidebar-bottom"><div className="factory-card"><span className="factory-avatar">SF</span><div><strong>Sri Lanka Factory</strong><small>Colombo · Plant 01</small></div><span className="online-mark" /></div><div className="sidebar-meta">Subsystem ID: IT232174726</div></div>
      </aside>
      <main className="main-content">
        <Header onInject={() => setModalOpen(true)} onRecalculate={recalculate} loading={loading} />
        <div className="content-wrap">
          <div className="metric-grid">
            <MetricCard label="Overall Equipment Effectiveness" value={`${oee}%`} detail="↑ 2.4% vs yesterday" tone="emerald" icon="activity" />
            <MetricCard label="Active Production Lines" value="03 / 03" detail="1 recovering · 1 disrupted" tone="cyan" icon="refresh" />
            <MetricCard label="Today's Planned Output" value="8,420" detail="units across all lines" tone="emerald" icon="activity" />
            <MetricCard label="At-Risk Work Orders" value={String(lines.filter((line) => line.status !== 'On Track').length).padStart(2, '0')} detail="AI recovery available" tone="amber" icon="alert" />
          </div>
          <div className="dashboard-grid">
            <ActiveSequences lines={lines} onSelect={setSelectedLine} />
            <ImpactMetrics recovery={recovery} oee={oee} />
          </div>
          <DetectionLog logs={logs} />
          <SystemStatus />
        </div>
      </main>
      {modalOpen && <DisruptionInjectorModal lines={lines} onClose={() => setModalOpen(false)} onSubmit={injectDisruption} />}
      {selectedLine && <LineActionDrawer line={selectedLine} onClose={() => setSelectedLine(null)} onExecute={executeAllocation} />}
      {loading && <div className="loading-overlay" role="status" aria-live="polite"><div className="loading-card"><span className="loader" /><strong>PPO Reinforcement Learning Engine Executing...</strong><span>Evaluating line constraints and regenerating sequence</span></div></div>}
    </div>
  );
}
