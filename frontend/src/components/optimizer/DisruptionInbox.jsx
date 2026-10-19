import { useState } from 'react';

const risks = [
  {
    id: 'fabric',
    title: 'Fabric delivery delay',
    order: 'ORD-2048',
    line: 'Line 02',
    lineId: 'Line Beta',
    score: 82,
    level: 'High',
    icon: '▰',
    forecast: 'Next 4 hours',
    delay: '3 hours',
    factors: ['Supplier delivery behind schedule', 'Low fabric stock', 'Order deadline approaching'],
    product: 'Export T-shirts',
    quantity: '850 pcs',
    material: 'Cotton jersey',
    severity: 60,
  },
  {
    id: 'machine',
    title: 'Machine downtime',
    order: '',
    line: 'Line 04',
    lineId: 'Line Gamma',
    score: 67,
    level: 'Medium',
    icon: '⚙',
    forecast: 'Next 2 hours',
    delay: '1.5 hours',
    factors: ['Machine vibration above threshold', 'Maintenance interval exceeded', 'Backup loom available'],
    product: 'Activewear (US)',
    quantity: '420 pcs',
    material: 'Polyester knit',
    severity: 45,
  },
  {
    id: 'workforce',
    title: 'Operator shortage',
    order: '',
    line: 'Line 06',
    lineId: 'Line Gamma',
    score: 54,
    level: 'Medium',
    icon: '♟',
    forecast: 'Next shift',
    delay: '45 minutes',
    factors: ['Three operators marked absent', 'Skill coverage below target', 'Cross-trained operators available'],
    product: 'Polo Shirts (Export)',
    quantity: '310 pcs',
    material: 'Cotton pique',
    severity: 30,
  },
];

const resolvedRisk = {
  ...risks[1],
  id: 'resolved-machine',
  title: 'Loom vibration warning',
  score: 31,
  level: 'Resolved',
  forecast: 'Resolved at 09:32',
  delay: 'No production delay',
  factors: ['Preventive maintenance completed', 'Vibration returned to normal', 'Line operating within target'],
};

const filters = [
  { id: 'All risks', label: 'All risks', icon: '', count: '3' },
  { id: 'High', label: 'High', icon: '!', count: '1' },
  { id: 'Medium', label: 'Medium', icon: '!', count: '2' },
  { id: 'Resolved', label: 'Resolved', icon: '✓', count: '' },
];

function RiskBadges({ risk }) {
  return <span className="risk-badges"><span className={`risk-badge predicted ${risk.level === 'Resolved' ? 'resolved' : ''}`}>{risk.level === 'Resolved' ? 'Resolved' : 'Predicted'}</span>{risk.level !== 'Resolved' && <span className={`risk-badge ${risk.level.toLowerCase()}`}>{risk.level} risk</span>}</span>;
}

export default function DisruptionInbox({ onCreateRecoveryPlan, isLoading }) {
  const [activeFilter, setActiveFilter] = useState('All risks');
  const [selectedId, setSelectedId] = useState('fabric');
  const [reviewOpen, setReviewOpen] = useState(false);
  const visibleRisks = activeFilter === 'Resolved'
    ? [resolvedRisk]
    : risks.filter((risk) => activeFilter === 'All risks' || risk.level === activeFilter);
  const selectedRisk = visibleRisks.find((risk) => risk.id === selectedId) || visibleRisks[0];

  function selectFilter(filter) {
    setActiveFilter(filter);
    const nextRisks = filter === 'Resolved'
      ? [resolvedRisk]
      : risks.filter((risk) => filter === 'All risks' || risk.level === filter);
    setSelectedId(nextRisks[0]?.id || '');
  }

  return (
    <section className="disruption-inbox">
      <div className="overview-heading">
        <div><h1>Disruption risk inbox</h1><p>Review predicted risks before they affect production.</p></div>
      </div>
      <div className="risk-inbox-grid">
        <div className="risk-list-column">
          <div className="risk-filters" role="tablist" aria-label="Filter risks">
            {filters.map((filter) => (
              <button key={filter.id} type="button" role="tab" aria-selected={activeFilter === filter.id} className={activeFilter === filter.id ? 'active' : ''} onClick={() => selectFilter(filter.id)}>
                {filter.icon && <i className={`filter-icon ${filter.id.toLowerCase()}`}>{filter.icon}</i>}
                {filter.label}{filter.count && <span>({filter.count})</span>}
              </button>
            ))}
          </div>
          <div className="risk-cards">
            {visibleRisks.map((risk) => (
              <button key={risk.id} type="button" className={`risk-card ${selectedRisk.id === risk.id ? 'selected' : ''}`} onClick={() => setSelectedId(risk.id)}>
                <span className={`risk-icon ${risk.level.toLowerCase()}`}>{risk.icon}</span>
                <span className="risk-card-copy">
                  <strong>{risk.title}</strong>
                  <span className="risk-card-meta">{risk.order && <span className="risk-order">{risk.order}</span>}<span>{risk.line}</span></span>
                </span>
                <span className="risk-card-score"><small>Risk score</small><strong>{risk.score}%</strong></span>
                <span className="risk-card-chevron">›</span>
              </button>
            ))}
            {visibleRisks.length === 0 && <p className="risk-empty">No risks in this category.</p>}
          </div>
        </div>
        {selectedRisk && <article className="risk-detail-card">
          <div className="risk-detail-heading">
            <span className={`risk-icon large ${selectedRisk.level.toLowerCase()}`}>{selectedRisk.icon}</span>
            <div className="risk-detail-title">
              <h2>{selectedRisk.title}</h2>
              <span>{selectedRisk.order && <>{selectedRisk.order} &nbsp;/&nbsp; </>}{selectedRisk.line}</span>
            </div>
            <RiskBadges risk={selectedRisk} />
          </div>
          <div className="risk-metrics">
            <div><small>Risk score</small><strong className={selectedRisk.level === 'High' ? 'high-score' : ''}>{selectedRisk.score}%</strong></div>
            <div><small>Forecast window</small><strong>{selectedRisk.forecast}</strong></div>
            <div><small>Estimated production delay</small><strong className="delay-estimate">{selectedRisk.delay}</strong></div>
          </div>
          <div className="risk-detail-columns">
            <section className="contributing-factors">
              <h3>Contributing factors <span aria-label="Model-generated factors">ⓘ</span></h3>
              <ol>{selectedRisk.factors.map((factor, index) => <li key={factor}><i>{index + 1}</i>{factor}</li>)}</ol>
            </section>
            <section className="impact-assessment">
              <h3>Impact assessment</h3>
              <dl>
                <div><dt>Affected order</dt><dd>{selectedRisk.order || '—'}</dd></div>
                <div><dt>Product</dt><dd>{selectedRisk.product}</dd></div>
                <div><dt>At-risk quantity</dt><dd>{selectedRisk.quantity}</dd></div>
                <div><dt>Current line</dt><dd>{selectedRisk.line}</dd></div>
                <div><dt>Required material</dt><dd>{selectedRisk.material}</dd></div>
              </dl>
              <p>Prediction source: LightGBM, updated 10:42</p>
            </section>
          </div>
          <div className="risk-detail-actions">
            <button type="button" className="recovery-plan-button" disabled={isLoading || selectedRisk.level === 'Resolved'} onClick={() => onCreateRecoveryPlan(selectedRisk)}>
              <span>♧</span>{isLoading ? 'Creating recovery plan…' : 'Create recovery plan'}
            </button>
            <button type="button" className="review-impact-button" onClick={() => setReviewOpen(true)}><span>▤</span>Review impact</button>
          </div>
        </article>}
      </div>
      <div className="risk-disclaimer"><i>i</i> Predictions indicate risk, not confirmed disruptions.</div>
      {reviewOpen && selectedRisk && <div className="review-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setReviewOpen(false)}>
        <section className="review-dialog" role="dialog" aria-modal="true" aria-labelledby="review-impact-title">
          <button type="button" className="review-close" aria-label="Close impact review" onClick={() => setReviewOpen(false)}>×</button>
          <span className="section-kicker">PREDICTED PRODUCTION IMPACT</span>
          <h2 id="review-impact-title">{selectedRisk.title}</h2>
          <p>{selectedRisk.line}{selectedRisk.order && ` · ${selectedRisk.order}`} has a {selectedRisk.score}% predicted risk over {selectedRisk.forecast.toLowerCase()}.</p>
          <dl><div><dt>Estimated delay</dt><dd>{selectedRisk.delay}</dd></div><div><dt>At-risk quantity</dt><dd>{selectedRisk.quantity}</dd></div><div><dt>Product</dt><dd>{selectedRisk.product}</dd></div></dl>
          <button type="button" className="recovery-plan-button" onClick={() => setReviewOpen(false)}>Close impact review</button>
        </section>
      </div>}
    </section>
  );
}
