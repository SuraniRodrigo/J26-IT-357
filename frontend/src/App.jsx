import { useState } from 'react';
import DisruptionInjectorModal from './components/optimizer/DisruptionInjectorModal';
import DisruptionInbox from './components/optimizer/DisruptionInbox';
import LineActionDrawer from './components/optimizer/LineActionDrawer';
import RecoveryPlan from './components/optimizer/RecoveryPlan';
import ScheduleDashboard from './components/optimizer/ScheduleDashboard';
import SimulationDashboard from './components/optimizer/SimulationDashboard';
import { recalculateSchedule } from './services/productionService';
import './styles.css';

const initialLines = [
  { id: 'alpha', name: 'Line Alpha', product: 'Performance Tee · PO-4821', status: 'On Track', output: 92, target: 100, machine: 'Loom 2', elapsed: 0, deficit: 0, color: 'emerald' },
  { id: 'beta', name: 'Line Beta', product: 'Activewear Legging · PO-4798', status: 'Disrupted', output: 54, target: 100, machine: 'Loom 4 Failure', elapsed: 18, deficit: 640, color: 'red', issue: 'Loom 4 Failure' },
  { id: 'gamma', name: 'Line Gamma', product: 'Cotton Polo · PO-4850', status: 'Recovering', output: 76, target: 100, machine: 'Dye lot 7', elapsed: 7, deficit: 210, color: 'amber', issue: 'Dye lot delay' },
];

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

function Sparkline({ type }) {
  if (type === 'line') {
    return <svg className="metric-chart line-chart" viewBox="0 0 150 46" role="img" aria-label="OEE trend is rising">
      <path className="chart-fill" d="M0 38 18 31 34 34 52 20 68 25 86 15 104 21 122 8 150 4v42H0Z" />
      <path className="chart-stroke" d="m0 38 18-7 16 3 18-14 16 5 18-10 18 6 18-13 28-4" />
    </svg>;
  }
  if (type === 'step') {
    return <svg className="metric-chart step-chart" viewBox="0 0 150 46" role="img" aria-label="Production line activity trend">
      <path className="chart-stroke" d="M0 36h25V29h25V31h25V19h25V22h25V9h25" />
      <path className="chart-grid-line" d="M0 43h150" />
    </svg>;
  }
  return <div className="metric-chart bar-chart" role="img" aria-label="Pending production batches by day">
    {[35, 53, 42, 70, 55, 84, 62, 100, 76, 92, 67, 82].map((height, index) => <i key={index} style={{ height: `${height}%` }} />)}
  </div>;
}

function MetricCard({ label, value, status, tone, chart, criticalCount }) {
  return (
    <article className={`metric-card ${tone}`}>
      <div className="metric-copy">
        <span className="metric-label">{label}</span>
        <strong>{value}</strong>
        <span className={`metric-status ${tone}`}>{tone === 'red' && <i />} {status}</span>
      </div>
      {chart && <Sparkline type={chart} />}
      {criticalCount && <div className="critical-count"><span>CRITICAL</span><strong>02</strong><small>Lines require attention</small></div>}
    </article>
  );
}

const detectionRows = [
  { time: '10:42:18', lineId: 'gamma', line: 'Line Gamma', risk: 92, issue: '92% Absenteeism Risk', severity: 'high' },
  { time: '10:39:52', lineId: 'beta', line: 'Line Beta', risk: 87, issue: 'Loom 4 failure · throughput drop', severity: 'high' },
  { time: '10:35:07', lineId: 'gamma', line: 'Line Gamma', risk: 68, issue: 'Dye lot delay · material shortage', severity: 'medium' },
  { time: '10:28:41', lineId: 'alpha', line: 'Line Alpha', risk: 24, issue: 'Minor cycle-time deviation', severity: 'low' },
];

function DetectionLog({ lines, onDiagnose }) {
  return (
    <section className="detection-card">
      <div className="detection-heading">
        <div>
          <span className="section-kicker">STAGE 02 · DETECTION</span>
          <h2>Real-Time Bottleneck Detection Log (LightGBM Monitoring)</h2>
        </div>
        <span className="monitoring-chip"><i /> MONITORING</span>
      </div>
      <div className="table-scroll">
        <table className="detection-table">
          <thead><tr><th>TIME</th><th>LINE ID</th><th>RISK SCORE</th><th>PREDICTED ISSUE</th><th><span className="visually-hidden">Action</span></th></tr></thead>
          <tbody>{detectionRows.map((row) => (
            <tr key={`${row.time}-${row.lineId}`}>
              <td className="detection-time">{row.time}</td>
              <td className="detection-line">{row.line}</td>
              <td><span className={`risk-value ${row.severity}`}><i />{row.risk}%</span></td>
              <td className="detection-issue">{row.issue}</td>
              <td><button type="button" className="diagnose-button" onClick={() => onDiagnose(lines.find((line) => line.id === row.lineId))}>Diagnose Anomaly <Icon name="chevron" size={13} /></button></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      <div className="detection-foot"><span><i className="pulse-dot" /> Telemetry stream active</span><span>Last model inference <b>10:42:18</b></span></div>
    </section>
  );
}

const factoryLines = [
  { id: 'alpha', name: 'Line 01', status: 'Running', order: 'ORD-2041', product: 'Polo Shirts (Export)', target: '1,200 pcs', complete: 72, output: '864 / 1,200', tone: 'running' },
  { id: 'beta', name: 'Line 02', status: 'At risk', order: 'ORD-2048', product: 'T-Shirts (EU)', target: '850 pcs', complete: 38, output: '323 / 850', tone: 'risk' },
  { id: 'gamma', name: 'Line 03', status: 'Running', order: 'ORD-2050', product: 'Activewear (US)', target: '1,100 pcs', complete: 68, output: '748 / 1,100', tone: 'running' },
  { id: 'maintenance', name: 'Line 04', status: 'Maintenance', order: '', product: 'Scheduled maintenance', target: '', complete: 0, output: '10:00 – 14:00', tone: 'maintenance' },
];

function ProductionOverview({ onSelectLine, onViewLines, onViewDisruptions }) {
  return (
    <section className="overview-screen">
      <div className="overview-heading">
        <div><h1>Production overview</h1><p>Live line status and production performance.</p></div>
        <span className="sync-status"><i /> Last synced: 10:42</span>
      </div>
      <div className="overview-kpis">
        <article className="overview-kpi"><span className="kpi-icon blue">◩</span><div><small>Active lines</small><strong>12 of 16</strong><span>75% operational</span></div><b>›</b></article>
        <article className="overview-kpi"><span className="kpi-icon green">▥</span><div><small>Efficiency</small><strong>84%</strong><span>+6% vs. last hour</span></div><b>›</b></article>
        <article className="overview-kpi"><span className="kpi-icon blue">⬡</span><div><small>Output</small><strong>6,240 pcs</strong><span>of 8,000 target</span></div><b>›</b></article>
        <article className="overview-kpi"><span className="kpi-icon orange">▲</span><div><small>At-risk orders</small><strong className="kpi-alert">3</strong><span>require attention</span></div><b>›</b></article>
      </div>
      <div className="factory-line-grid">
        {factoryLines.map((line) => (
          <button key={line.name} type="button" className={`factory-line-card ${line.tone}`} onClick={() => onSelectLine(line.id)}>
            <span className="factory-line-heading"><strong>{line.name}</strong><span className={`line-status ${line.tone}`}>{line.tone === 'risk' && '▲ '}{line.status}</span><b>›</b></span>
            {line.order ? <>
              <span className="factory-order"><i>▣</i><span><strong>{line.order}</strong><small>{line.product}</small></span><span className="target-qty"><strong>{line.target}</strong><small>Target</small></span></span>
              <span className="production-progress"><span><strong>{line.complete}% complete</strong><small>{line.output}</small></span><i><b style={{ width: `${line.complete}%` }} /></i></span>
            </> : <span className="maintenance-info"><i>▣</i><span><strong>No active order</strong><small>{line.product}<br />{line.output}</small></span></span>}
          </button>
        ))}
      </div>
      <div className="overview-bottom-grid">
        <section className="overview-panel output-panel">
          <div className="overview-panel-heading"><h2><span className="heading-icon blue">▥</span> Output trend today</h2><div className="chart-legend"><span><i className="actual-legend" /> Actual output</span><span><i className="target-legend" /> Target output</span></div></div>
          <div className="output-chart-wrap">
            <span className="chart-axis-title">Pieces (pcs)</span>
            <svg className="output-chart" viewBox="0 0 520 198" role="img" aria-label="Actual production output increases throughout the day, below the target line">
              <g className="chart-grid">{[20, 52, 84, 116, 148, 180].map((y) => <path key={`h${y}`} d={`M48 ${y}H510`} />)}{[48, 94, 140, 186, 232, 278, 324, 370, 416, 462, 510].map((x) => <path key={`v${x}`} d={`M${x} 20V180`} />)}</g>
              <g className="chart-labels"><text x="4" y="24">10,000</text><text x="10" y="56">8,000</text><text x="10" y="88">6,000</text><text x="10" y="120">4,000</text><text x="10" y="152">2,000</text><text x="28" y="184">0</text>
                {['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'].map((time, index) => <text key={time} x={48 + index * 46.2} y="197" textAnchor="middle">{time}</text>)}
              </g>
              <path className="actual-area" d="M48 178 L94 168 L140 154 L186 147 L232 141 L278 134 L324 122 L370 113 L416 105 L462 98 L510 92 L510 180 L48 180Z" />
              <path className="target-line" d="M48 178 L94 164 L140 150 L186 138 L232 126 L278 114 L324 102 L370 90 L416 78 L462 66 L510 54" />
              <path className="actual-line" d="M48 178 L94 168 L140 154 L186 147 L232 141 L278 134 L324 122 L370 113 L416 105 L462 98 L510 92" />
              {[['48','178'],['94','168'],['140','154'],['186','147'],['232','141'],['278','134'],['324','122'],['370','113'],['416','105'],['462','98'],['510','92']].map(([x,y]) => <circle className="actual-point" key={`${x}-${y}`} cx={x} cy={y} r="3.7" />)}
            </svg>
          </div>
          <div className="output-summary"><div><span>◉</span><small>Current output</small><strong>6,240 pcs</strong></div><div><small>Target by 18:00</small><strong>8,000 pcs</strong></div><div><small>Variance</small><strong className="variance">-1,760 pcs (-22%)</strong></div></div>
        </section>
        <section className="overview-panel events-panel">
          <div className="overview-panel-heading"><h2><span className="heading-icon">♧</span> Recent events</h2></div>
          <div className="event-list">
            <article className="factory-event"><time>10:28</time><i className="event-dot green" /><div><strong>Line 03 reached 70% target</strong><span>ORD-2050 – Activewear (US)<br />Production is on track.</span></div></article>
            <article className="factory-event"><time>10:15</time><i className="event-dot orange" /><div><strong>Fabric delivery delay predicted for ORD-2048</strong><span>Line 02 – T-Shirts (EU)<br />Model predicts 2–3 hour delay. Alternative plan suggested.</span></div></article>
            <article className="factory-event"><time>09:50</time><i className="event-dot slate" /><div><strong>Line 04 set to maintenance</strong><span>Scheduled maintenance (10:00 – 14:00)<br />No active order.</span></div></article>
          </div>
          <div className="event-actions"><button type="button" onClick={onViewLines}>▥ &nbsp; View all lines</button><button type="button" onClick={onViewDisruptions}>⚠ &nbsp; View disruptions</button></div>
        </section>
      </div>
    </section>
  );
}

export default function App() {
  const [lines, setLines] = useState(initialLines);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedLine, setSelectedLine] = useState(null);
  const [activeTab, setActiveTab] = useState('Overview');
  const [loading, setLoading] = useState(false);
  const [backendError, setBackendError] = useState('');
  const [activeDisruption, setActiveDisruption] = useState({
    line_id: 'Line Beta',
    disruption_type: 'Machine Failure',
    severity_minutes: 46,
  });

  function applyBackendSchedule(result) {
    const statusByApiValue = {
      disruption_detected: { status: 'Disrupted', color: 'red' },
      absorbing_rerouted_work: { status: 'Recovering', color: 'amber' },
      operational: { status: 'On Track', color: 'emerald' },
    };
    setLines((current) => current.map((line) => {
      const sequence = result.updated_sequences.find(
        (item) => item.line_id.toLowerCase() === line.name.toLowerCase(),
      );
      if (!sequence) return line;

      const nextStatus = statusByApiValue[sequence.line_status];
      return {
        ...line,
        ...nextStatus,
        output: sequence.capacity_metrics.available_capacity_percent,
        issue: sequence.line_status === 'disruption_detected'
          ? line.issue || 'Production disruption'
          : sequence.line_status === 'absorbing_rerouted_work'
            ? `Rerouted from ${result.affected_line}`
            : undefined,
      };
    }));
  }

  async function injectDisruption({ lineId, disruptionDescription, severity }) {
    const line = lines.find((item) => item.id === lineId);
    if (!line) return;

    const disruption = {
      line_id: line.name,
      disruption_type: disruptionDescription,
      severity_minutes: Number(severity),
    };
    setLoading(true);
    setBackendError('');
    try {
      const result = await recalculateSchedule(disruption);
      applyBackendSchedule(result);
      setActiveDisruption(disruption);
      setModalOpen(false);
    } catch (error) {
      setBackendError(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function simulateDisruption({ lineId, category, disruptionText, severity }) {
    if (loading) return;
    const disruption = {
      line_id: lineId,
      disruption_type: `${category}: ${disruptionText}`,
      severity_minutes: severity,
    };
    setLoading(true);
    setBackendError('');
    try {
      const result = await recalculateSchedule(disruption);
      applyBackendSchedule(result);
      setActiveDisruption(disruption);
    } catch (error) {
      setBackendError(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function recalculate() {
    if (loading) return;
    setLoading(true);
    setBackendError('');
    try {
      const result = await recalculateSchedule(activeDisruption);
      applyBackendSchedule(result);
    } catch (error) {
      setBackendError(error.message);
    } finally {
      setLoading(false);
    }
  }

  function executeAllocation({ lineId, destination, workers }) {
    setLines((current) => current.map((item) => item.id === lineId
      ? { ...item, status: 'Recovering', color: 'amber', output: Math.min(96, item.output + 12 + workers * 3), issue: `Rerouted to ${destination}`, deficit: Math.max(0, item.deficit - 150) }
      : item));
    setSelectedLine(null);
  }

  function selectFactoryLine(lineId) {
    const line = lines.find((item) => item.id === lineId);
    if (line) setSelectedLine(line);
  }

  function createRecoveryPlan(risk) {
    return simulateDisruption({
      lineId: risk.lineId,
      category: risk.title,
      disruptionText: `${risk.score}% predicted risk. Contributing factors: ${risk.factors.join(', ')}.`,
      severity: risk.severity,
    });
  }

  return (
    <div className="factory-shell">
      <aside className="factory-sidebar">
        <a className="factory-brand" href="#" aria-label="Self-Healing Production Optimizer home"><span className="factory-brand-icon">▥</span><strong>Self-Healing<br />Production Optimizer</strong></a>
        <nav className="factory-nav" aria-label="Main navigation">
          {[['Overview', '⌂'], ['Disruptions', '⚠'], ['Simulation', '▮'], ['Optimize', '⚙'], ['Schedule', '▦']].map(([label, icon]) => (
            <button key={label} type="button" className={activeTab === label ? 'active' : ''} onClick={() => setActiveTab(label)}><span>{icon}</span>{label}</button>
          ))}
        </nav>
        <div className="factory-sidebar-footer"><i /><div><strong>Telemetry connected</strong><span>All systems operational</span></div></div>
      </aside>
      <main className="factory-main">
        <header className="factory-topbar">
          <strong>Self-Healing Production Optimizer</strong>
          <span className="topbar-factory"><b>♙</b> Katunayake Factory / Shift A</span>
          <span className="demo-badge">Demo data</span>
          <button type="button" className="topbar-icon" aria-label="Notifications">♧</button>
          <button type="button" className="profile-button" aria-label="User menu">DM⌄</button>
        </header>
        <div className="factory-content">
          {backendError && <div className="api-error" role="alert">Backend unavailable: {backendError}</div>}
          {activeTab === 'Overview' && <ProductionOverview
            onSelectLine={selectFactoryLine}
            onViewLines={() => setActiveTab('Schedule')}
            onViewDisruptions={() => setActiveTab('Disruptions')}
          />}
          {activeTab === 'Disruptions' && <DisruptionInbox onCreateRecoveryPlan={createRecoveryPlan} isLoading={loading} />}
          {activeTab === 'Simulation' && <SimulationDashboard />}
          {activeTab === 'Optimize' && <RecoveryPlan isApplying={loading} onApply={recalculate} />}
          {activeTab === 'Schedule' && <ScheduleDashboard />}
        </div>
      </main>
      {modalOpen && <DisruptionInjectorModal lines={lines} onClose={() => setModalOpen(false)} onSubmit={injectDisruption} />}
      {selectedLine && <LineActionDrawer line={selectedLine} onClose={() => setSelectedLine(null)} onExecute={executeAllocation} />}
      {loading && <div className="loading-overlay" role="status" aria-live="polite"><div className="loading-card"><span className="loader" /><strong>PPO Reinforcement Learning Engine Executing...</strong><span>Evaluating line constraints and regenerating sequence</span></div></div>}
    </div>
  );
}
