import { useState } from 'react';

const objectives = [
  { id: 'balanced', title: 'Balanced', recommended: true, summary: '45 min delay  |  Good output  |  Moderate overtime', delay: '45 min', utilization: '86%', output: '6,400 pcs' },
  { id: 'delay', title: 'Minimize delay', recommended: false, summary: '30 min delay  |  Higher overtime  |  Maximum output', delay: '30 min', utilization: '92%', output: '6,650 pcs' },
  { id: 'overtime', title: 'Minimize overtime', recommended: false, summary: '70 min delay  |  No extra overtime  |  Lower risk', delay: '70 min', utilization: '80%', output: '6,050 pcs' },
];

const actions = [
  { title: 'Move ORD-2048 sewing to Line 05', detail: 'Transfer remaining quantity (3,200 pcs) to available Line 05.' },
  { title: 'Resequence ORD-2051 after priority order', detail: 'Adjust Line 05 sequence to accommodate priority order and maintain due dates.' },
  { title: 'Allocate 2 qualified operators from Line 06', detail: 'Move 2 multi-skilled operators to Line 05 for the remaining shift.' },
];

const checks = [
  { title: 'Skills verified', detail: 'Required operator skills available' },
  { title: 'Capacity checked', detail: 'Line 05 has sufficient capacity' },
  { title: 'Material available', detail: 'Fabric and trims confirmed in stock' },
  { title: 'Shift limits respected', detail: 'Within working hour and overtime limits' },
];

export default function RecoveryPlan({ isApplying, onApply }) {
  const [objective, setObjective] = useState('balanced');
  const [constraintsOpen, setConstraintsOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [includeOvertime, setIncludeOvertime] = useState(true);
  const [protectPriorityOrders, setProtectPriorityOrders] = useState(true);
  const activeObjective = objectives.find((item) => item.id === objective);

  return (
    <section className="recovery-page">
      <header className="recovery-page-heading">
        <div>
          <span className="recovery-kicker">OPTIMIZATION ENGINE</span>
          <h1>Review recovery plan</h1>
          <p>Machine breakdown / Line 02 / ORD-2048</p>
        </div>
        <div className="plan-state"><span className="feasible-state"><i>✓</i> Feasible plan found</span><span className="approval-state"><i>◷</i> Awaiting approval</span></div>
      </header>

      <div className="recovery-layout">
        <div className="recovery-main-column">
          <section className="plan-comparison" aria-label="Compare production plans">
            <article className="comparison-card disrupted-plan">
              <header><span>⚠</span><div><h2>Disrupted plan</h2><p>Current plan with machine breakdown</p></div></header>
              <dl><div><dt>Estimated delay</dt><dd>180 min</dd></div><div><dt>Line utilization</dt><dd>72%</dd></div><div><dt>Projected output</dt><dd>5,800 pcs</dd></div></dl>
            </article>
            <span className="plan-arrow" aria-hidden="true">→</span>
            <article className="comparison-card proposed-plan">
              <header><span>✓</span><div><h2>Proposed recovery</h2><p>AI-optimized feasible plan</p></div></header>
              <dl><div><dt>Estimated delay</dt><dd>{activeObjective.delay}</dd></div><div><dt>Line utilization</dt><dd>{activeObjective.utilization}</dd></div><div><dt>Projected output</dt><dd>{activeObjective.output}</dd></div></dl>
            </article>
          </section>

          <div className="recovery-detail-grid">
            <section className="recovery-panel proposed-actions">
              <h2>Proposed actions</h2>
              <ol>{actions.map((action, index) => <li key={action.title}><i>{index + 1}</i><div><strong>{action.title}</strong><span>{action.detail}</span></div></li>)}</ol>
            </section>
            <section className="recovery-panel constraint-checks">
              <h2>Constraint checks</h2>
              <ul>{checks.map((check) => <li key={check.title}><i>✓</i><div><strong>{check.title}</strong><span>{check.detail}</span></div></li>)}</ul>
            </section>
          </div>
        </div>

        <aside className="recovery-side-panel">
          <section className="objective-section">
            <h2>Optimization objective</h2>
            <p>Select the primary objective for the recovery plan.</p>
            <div className="objective-options" role="radiogroup" aria-label="Optimization objective">
              {objectives.map((item) => (
                <label key={item.id} className={`objective-option ${objective === item.id ? 'selected' : ''}`}>
                  <input type="radio" name="recovery-objective" value={item.id} checked={objective === item.id} onChange={() => setObjective(item.id)} />
                  <i className="objective-radio" />
                  <span><strong>{item.title} {item.recommended && <em>(recommended)</em>}</strong><small>{item.summary}</small></span>
                </label>
              ))}
            </div>
          </section>
          <section className="plan-information">
            <h2>Plan information</h2>
            <div><i>♙</i><span><strong>Plan generated by PPO agent</strong><small>Using disruption, capacity and skill data</small></span></div>
            <div><i>◷</i><span><strong>Recalculated just now</strong><small>Oct 15, 2024&nbsp; 10:32 AM</small></span></div>
          </section>
        </aside>
      </div>

      {detailsOpen && <section className="plan-details-panel">
        <button type="button" aria-label="Close plan details" onClick={() => setDetailsOpen(false)}>×</button>
        <h2>Recovery plan details</h2>
        <p>Objective: <strong>{activeObjective.title}</strong>. The optimizer proposes moving ORD-2048 to Line 05, resequencing ORD-2051, and reallocating two qualified operators from Line 06.</p>
        <p>Projected output is {activeObjective.output}, with estimated delay of {activeObjective.delay} and line utilization of {activeObjective.utilization}.</p>
      </section>}

      <footer className="recovery-action-bar">
        <div className="recovery-actions">
          <button type="button" className="apply-plan-button" onClick={onApply} disabled={isApplying}><span>✓</span>{isApplying ? 'Applying recovery plan…' : 'Apply recovery plan'}</button>
          <button type="button" className="adjust-constraints-button" onClick={() => setConstraintsOpen(true)}><span>☷</span>Adjust constraints</button>
          <button type="button" className="view-plan-details" onClick={() => setDetailsOpen((open) => !open)}>View plan details <span>→</span></button>
        </div>
        <p className="plan-disclaimer"><i>ⓘ</i> Projected results based on current production data.<br />Actual results may vary based on real-time conditions.</p>
      </footer>

      {constraintsOpen && <div className="constraints-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setConstraintsOpen(false)}>
        <section className="constraints-dialog" role="dialog" aria-modal="true" aria-labelledby="constraints-title">
          <button type="button" className="constraints-close" aria-label="Close constraints" onClick={() => setConstraintsOpen(false)}>×</button>
          <span className="recovery-kicker">RECOVERY PLAN SETTINGS</span>
          <h2 id="constraints-title">Adjust constraints</h2>
          <p>Choose which production limits the optimizer should prioritize for this recovery plan.</p>
          <label><input type="checkbox" checked={includeOvertime} onChange={(event) => setIncludeOvertime(event.target.checked)} /><span><strong>Allow limited overtime</strong><small>Permit a maximum of 2 additional hours per operator.</small></span></label>
          <label><input type="checkbox" checked={protectPriorityOrders} onChange={(event) => setProtectPriorityOrders(event.target.checked)} /><span><strong>Protect priority orders</strong><small>Keep high-priority orders ahead of standard work.</small></span></label>
          <div className="constraints-actions"><button type="button" onClick={() => setConstraintsOpen(false)}>Cancel</button><button type="button" onClick={() => setConstraintsOpen(false)}>Save constraints</button></div>
        </section>
      </div>}
    </section>
  );
}
