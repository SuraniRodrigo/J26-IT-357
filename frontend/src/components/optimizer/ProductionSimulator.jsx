import { useState } from 'react';

const lines = ['Line Alpha', 'Line Beta', 'Line Gamma'];

export default function ProductionSimulator({ isSimulating, onSubmit }) {
  const [disruptionText, setDisruptionText] = useState('');
  const [disruptionCategory, setDisruptionCategory] = useState('');
  const [lineId, setLineId] = useState('Line Beta');
  const [severity, setSeverity] = useState(45);

  function handleSubmit(event) {
    event.preventDefault();
    onSubmit({
      lineId,
      category: disruptionCategory.trim(),
      disruptionText: disruptionText.trim(),
      severity,
    });
  }

  return (
    <section className="simulator-view" aria-labelledby="simulator-title">
      <div className="simulator-panel">
        <div className="simulator-panel-heading">
          <div>
            <span className="section-kicker">DISRUPTION INJECTION</span>
            <h2 id="simulator-title">Disruption Injection &amp; Simulator</h2>
          </div>
          <span className="simulator-mode"><i /> SELF-HEALING ENABLED</span>
        </div>
        <form className="simulator-form" onSubmit={handleSubmit}>
          <div className="simulator-field disruption-description">
            <label htmlFor="disruption-description">Describe or type disruption event</label>
            <input
              id="disruption-description"
              type="text"
              value={disruptionText}
              onChange={(event) => setDisruptionText(event.target.value)}
              placeholder="e.g., Loom #4 needle breakage on Line Beta, or sudden operator shortage..."
              required
            />
          </div>
          <div className="simulator-field">
            <label htmlFor="disruption-category">Disruption category</label>
            <input
              id="disruption-category"
              type="text"
              value={disruptionCategory}
              onChange={(event) => setDisruptionCategory(event.target.value)}
              placeholder="e.g., Machine Breakdown"
              required
            />
          </div>
          <div className="simulator-field">
            <label htmlFor="target-production-line">Target production line</label>
            <select id="target-production-line" value={lineId} onChange={(event) => setLineId(event.target.value)}>
              {lines.map((line) => <option key={line} value={line}>{line}</option>)}
            </select>
          </div>
          <div className="simulator-submit-row">
            <label className="severity-control" htmlFor="simulator-severity">
              <span>Severity impact <b>{severity} mins</b></span>
              <input
                id="simulator-severity"
                type="range"
                min="10"
                max="180"
                value={severity}
                onChange={(event) => setSeverity(Number(event.target.value))}
              />
              <span className="severity-range-labels"><span>10 mins</span><span>180 mins</span></span>
            </label>
            <button className="button simulator-submit" type="submit" disabled={isSimulating}>
              {isSimulating ? 'Optimizing Schedule...' : '⚡ Simulate & Trigger Self-Healing'}
            </button>
          </div>
        </form>
      </div>

      <div className="simulator-analytics">
        <article className="analytics-card">
          <div className="analytics-card-heading"><h3>Machine Analytics</h3><span className="analytics-tag blue">IoT Live</span></div>
          <strong className="analytics-value">89.2% <small className="positive">+1.4% OEE</small></strong>
          <p>12 Active Sewing Lines Monitored. 1 Loom flagged for high vibration.</p>
        </article>
        <article className="analytics-card">
          <div className="analytics-card-heading"><h3>Workforce Capacity</h3><span className="analytics-tag amber">Shift A</span></div>
          <strong className="analytics-value">94.1% <small className="caution">3 Operators Absent</small></strong>
          <p>Skill matrix balanced across auxiliary lines automatically.</p>
        </article>
        <article className="analytics-card">
          <div className="analytics-card-heading"><h3>Production Output</h3><span className="analytics-tag green">Target Met</span></div>
          <strong className="analytics-value">4,250 <small>Units/hr</small></strong>
          <p>Estimated recovery window: 14 seconds post-disruption.</p>
        </article>
      </div>
    </section>
  );
}
