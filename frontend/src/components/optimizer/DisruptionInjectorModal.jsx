import { useState } from 'react';

const categories = [
  { value: 'Operator Absenteeism', description: 'Unplanned staffing shortage' },
  { value: 'Machine Failure / Loom Breakage', description: 'Equipment downtime or failure' },
  { value: 'Material Shortage / Dyeing Delay', description: 'Late or unavailable materials' },
];

export default function DisruptionInjectorModal({ lines, onClose, onSubmit }) {
  const [lineId, setLineId] = useState('beta');
  const [category, setCategory] = useState(categories[1].value);
  const [severity, setSeverity] = useState(46);

  function submit(event) {
    event.preventDefault();
    onSubmit({ lineId, category, severity });
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="dialog glass-card" role="dialog" aria-modal="true" aria-labelledby="inject-title">
        <div className="dialog-heading">
          <span className="dialog-icon red"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10.3 3.9 2.8 17a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4m0 4h.01" /></svg></span>
          <div><span className="section-kicker">SIMULATION CONTROL</span><h2 id="inject-title">Inject Disruption</h2><p>Simulate a shop-floor event and let the AI respond.</p></div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close dialog"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m18 6-12 12M6 6l12 12" /></svg></button>
        </div>
        <form onSubmit={submit}>
          <label className="field-label" htmlFor="production-line">Production line</label>
          <select id="production-line" value={lineId} onChange={(event) => setLineId(event.target.value)}>
            {lines.map((line) => <option key={line.id} value={line.id}>{line.name}</option>)}
          </select>
          <fieldset className="category-field">
            <legend className="field-label">Disruption category</legend>
            <div className="category-options">{categories.map((item) => (
              <label key={item.value} className={`category-option ${category === item.value ? 'selected' : ''}`}>
                <input type="radio" name="disruption-category" value={item.value} checked={category === item.value} onChange={() => setCategory(item.value)} />
                <span className="radio-indicator" /><span className="category-copy"><strong>{item.value}</strong><small>{item.description}</small></span>
              </label>
            ))}</div>
          </fieldset>
          <div className="range-heading"><label className="field-label" htmlFor="severity">Impact severity</label><strong>{severity}%</strong></div>
          <input id="severity" className="severity-range" type="range" min="10" max="100" step="1" value={severity} onChange={(event) => setSeverity(Number(event.target.value))} />
          <div className="range-labels"><span>10% · Low impact</span><span>100% · Line stoppage</span></div>
          <div className="simulation-note"><span>ⓘ</span> Simulation updates the active schedule and detection log locally.</div>
          <div className="dialog-actions"><button type="button" className="button button-muted" onClick={onClose}>Cancel</button><button type="submit" className="button button-danger"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10.3 3.9 2.8 17a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4m0 4h.01" /></svg> Trigger AI Self-Healing</button></div>
        </form>
      </section>
    </div>
  );
}
