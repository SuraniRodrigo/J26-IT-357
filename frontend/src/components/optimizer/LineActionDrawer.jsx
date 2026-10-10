import { useState } from 'react';

export default function LineActionDrawer({ line, onClose, onExecute }) {
  const [destination, setDestination] = useState(line.id === 'alpha' ? 'beta' : 'alpha');
  const [workers, setWorkers] = useState(2);
  const availableDestinations = ['alpha', 'beta', 'gamma'].filter((id) => id !== line.id);
  const names = { alpha: 'Line Alpha', beta: 'Line Beta', gamma: 'Line Gamma' };

  return (
    <div className="drawer-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <aside className="action-drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title">
        <div className="drawer-topline"><span className="section-kicker">LINE ACTION CENTER</span><button type="button" className="icon-button" onClick={onClose} aria-label="Close line actions"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m18 6-12 12M6 6l12 12" /></svg></button></div>
        <div className="drawer-title"><span className={`line-status-icon ${line.color}`}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v18m-9-9h18M5.6 5.6l12.8 12.8m0-12.8L5.6 18.4" /></svg></span><div><h2 id="drawer-title">{line.name}</h2><span>{line.product}</span></div></div>
        <div className="drawer-status"><i className={`legend-dot ${line.color}`} /> {line.status.toUpperCase()} <span>·</span> OUTPUT AT <b>{line.output}%</b></div>
        <div className="drawer-section">
          <h3>Failure diagnostic summary</h3>
          <div className="diagnostic-grid"><div><span>Machine / issue</span><strong>{line.issue || line.machine}</strong></div><div><span>Elapsed down time</span><strong>{line.elapsed} min</strong></div><div><span>Predicted output deficit</span><strong className="text-red">{line.deficit.toLocaleString()} units</strong></div></div>
        </div>
        <div className="drawer-section">
          <label className="field-label" htmlFor="destination-line">Target rerouting</label>
          <select id="destination-line" value={destination} onChange={(event) => setDestination(event.target.value)}>{availableDestinations.map((id) => <option key={id} value={id}>{names[id]} · AI recommended</option>)}</select>
          <p className="field-hint"><span className="sparkle">✦</span> AI recommends {names[destination]} based on available capacity.</p>
        </div>
        <div className="drawer-section worker-section">
          <div><span className="field-label">Buffer worker allocation</span><p className="field-hint">Floating operators from finishing buffer</p></div>
          <div className="stepper"><button type="button" onClick={() => setWorkers((value) => Math.max(0, value - 1))} aria-label="Remove one operator">−</button><strong>{workers}</strong><button type="button" onClick={() => setWorkers((value) => Math.min(12, value + 1))} aria-label="Add one operator">+</button></div>
        </div>
        <div className="drawer-bottom"><div className="recovery-preview"><span>Projected recovery</span><strong>~{Math.max(6, line.elapsed + 8)} min <small>· +{12 + workers * 3}% output</small></strong></div><button className="button button-primary full-width" onClick={() => onExecute({ lineId: line.id, destination: names[destination], workers })}>Execute Re-allocation Sequence <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14m-7-7 7 7-7 7" /></svg></button></div>
      </aside>
    </div>
  );
}
