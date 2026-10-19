import { useState } from 'react';

const initialSchedule = [
  {
    line: 'Line 01',
    department: 'Sewing',
    orders: [
      { id: 'ORD-2041', product: 'Style A · 1,200 pcs', start: 4, width: 34 },
      { id: 'ORD-2043', product: 'Style B · 980 pcs', start: 56, width: 35 },
    ],
  },
  {
    line: 'Line 02',
    department: 'Sewing',
    orders: [
      { id: 'ORD-2047', product: 'Style C · 800 pcs', start: 4, width: 25 },
      { id: 'Machine breakdown', start: 29, width: 18, type: 'downtime' },
      { id: 'ORD-2048', product: 'Style D · 1,000 pcs', start: 65, width: 27, type: 'original' },
    ],
  },
  {
    line: 'Line 05',
    department: 'Finishing',
    orders: [
      { id: 'ORD-2048', product: 'Style D · 1,000 pcs', start: 52, width: 31, type: 'moved' },
      { id: 'ORD-2052', product: 'Style E · 750 pcs', start: 84, width: 16 },
    ],
  },
  {
    line: 'Line 06',
    department: 'Packing',
    orders: [
      { id: 'ORD-2050', product: 'Style F · 900 pcs', start: 7, width: 32 },
      { id: 'ORD-2053', product: 'Style G · 1,100 pcs', start: 62, width: 37 },
    ],
  },
];

const timeLabels = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'];

function exportSchedule(schedule) {
  const rows = [['Line', 'Order', 'Description', 'Schedule status']];
  schedule.forEach(({ line, orders }) => {
    orders.forEach((order) => {
      rows.push([line, order.id, order.product || '', order.type || 'scheduled']);
    });
  });
  const csv = rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'production-schedule.csv';
  link.click();
  URL.revokeObjectURL(url);
}

export default function ScheduleDashboard() {
  const [schedule, setSchedule] = useState(initialSchedule);
  const [rolledBack, setRolledBack] = useState(false);
  const [dialog, setDialog] = useState('');

  function rollbackPlan() {
    setSchedule((current) => current.map((row) => ({
      ...row,
      orders: row.orders.flatMap((order) => {
        if (order.id !== 'ORD-2048') return [order];
        if (order.type === 'moved') return [];
        if (order.type === 'original') return [{ ...order, type: undefined }];
        return [order];
      }),
    })));
    setRolledBack(true);
    setDialog('');
  }

  return (
    <section className="schedule-dashboard">
      <div className="schedule-page-heading">
        <div>
          <h1>{rolledBack ? 'Production schedule' : 'Updated production schedule'}</h1>
          <p>Dynamic rerouting and execution tracking</p>
        </div>
        <div className="schedule-page-actions">
          <button type="button" className="schedule-outline-action" onClick={() => setDialog('changes')}>
            <span aria-hidden="true">◴</span> View changes
          </button>
          <button type="button" className="schedule-export-action" onClick={() => exportSchedule(schedule)}>
            <span aria-hidden="true">⇩</span> Export schedule
          </button>
        </div>
      </div>

      <div className={`schedule-success-banner${rolledBack ? ' rolled-back' : ''}`} role="status">
        <span className="schedule-success-icon" aria-hidden="true">{rolledBack ? '↶' : '✓'}</span>
        <div><strong>{rolledBack ? 'Recovery plan rolled back / Schedule v23' : 'Recovery plan applied / Schedule v24'}</strong><span>{rolledBack ? 'Original order assignments have been restored.' : 'Updated assignments published to affected lines.'}</span></div>
      </div>

      <div className="schedule-summary-grid">
        <article className="schedule-summary-card">
          <span className="schedule-summary-icon teal" aria-hidden="true">⟳</span>
          <div><small>Orders rerouted</small><strong>{rolledBack ? '0' : '1'}</strong></div>
        </article>
        <article className="schedule-summary-card">
          <span className="schedule-summary-icon blue" aria-hidden="true">▤</span>
          <div><small>Lines updated</small><strong>{rolledBack ? '0' : '2'}</strong></div>
        </article>
        <article className="schedule-summary-card">
          <span className="schedule-summary-icon navy" aria-hidden="true">◷</span>
          <div><small>Estimated delay recovered</small><strong className="recovered-delay">{rolledBack ? '0 min' : '135 min'}</strong></div>
        </article>
      </div>

      <section className="schedule-timeline-card" aria-label="Production schedule timeline">
        <div className="schedule-timeline">
          <div className="schedule-axis-spacer" />
          <div className="schedule-time-axis">{timeLabels.map((time) => <span key={time}>{time}</span>)}</div>
          {schedule.map((row) => (
            <div className="schedule-timeline-row" key={row.line}>
              <div className="schedule-line-label"><strong>{row.line}</strong><small>{row.department}</small></div>
              <div className="schedule-track">
                {row.orders.map((order, index) => (
                  <div
                    className={`schedule-order ${order.type || 'scheduled'}`}
                    key={`${row.line}-${order.id}-${index}`}
                    style={{ left: `${order.start}%`, width: `${order.width}%` }}
                    title={`${order.id}${order.product ? ` · ${order.product}` : ''}`}
                  >
                    {order.type === 'downtime' ? <><b aria-hidden="true">⚒</b><strong>{order.id}</strong></> : <>
                      <span><strong>{order.id}</strong><small>{order.product}</small></span>
                      {order.type === 'moved' && <em>Moved from Line 02</em>}
                      {order.type === 'original' && <em>Moved</em>}
                    </>}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="schedule-legend">
          <span><i className="legend-scheduled" /> Scheduled</span>
          <span><i className="legend-moved" /> Moved (reassigned)</span>
          <span><i className="legend-downtime" /> Downtime</span>
          <span><i className="legend-original" /> Original slot (pre-optimization)</span>
        </div>
      </section>

      <div className="schedule-detail-grid">
        <section className="schedule-detail-card activity-log-card">
          <h2><span aria-hidden="true">▤</span> Schedule activity log</h2>
          <ol className="schedule-activity-list">
            <li><time>11:04</time><div><strong>Plan approved by Production Manager</strong><span>Recovery plan verified and approved.</span></div></li>
            <li><time>11:05</time><div><strong>Schedule published</strong><span>Updated assignments published to affected lines.</span></div></li>
            <li><time>{rolledBack ? '11:07' : '11:06'}</time><div><strong>{rolledBack ? 'Previous schedule restored' : 'Line 05 acknowledged'}</strong><span>{rolledBack ? 'Order assignments returned to their original slots.' : 'Team notified and new assignment accepted.'}</span></div></li>
          </ol>
        </section>
        <section className="schedule-detail-card execution-status-card">
          <h2><span aria-hidden="true">▥</span> Execution status</h2>
          <div className="execution-status-list">
            <div><strong>Line 02</strong><i className="execution-icon maintenance">⚒</i><span><b>{rolledBack ? 'Maintenance in progress' : 'Maintenance in progress'}</b><small>Expected to restart at 12:30.</small></span></div>
            <div><strong>Line 05</strong><i className={`execution-icon${rolledBack ? ' waiting' : ''}`}>{rolledBack ? '◷' : '✓'}</i><span><b>{rolledBack ? 'Awaiting assignment' : 'Assignment accepted'}</b><small>{rolledBack ? 'No reassigned order is active.' : 'New order ORD-2048 confirmed.'}</small></span></div>
            <div><strong>Operators</strong><i className="execution-icon">✓</i><span><b>{rolledBack ? 'Original allocation restored' : 'Reallocation confirmed'}</b><small>{rolledBack ? 'Previous operator allocation restored.' : 'Required operators assigned to Line 05.'}</small></span></div>
          </div>
        </section>
      </div>

      <div className="schedule-bottom-bar">
        <button type="button" className="schedule-rollback-button" onClick={() => setDialog('rollback')} disabled={rolledBack}>
          <span aria-hidden="true">↶</span> {rolledBack ? 'Plan rolled back' : 'Rollback plan'}
        </button>
        <small>Illustrative schedule. Times and order details are for demonstration purposes only.</small>
      </div>

      {dialog && <div className="schedule-dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setDialog(''); }}>
        <section className="schedule-dialog" role="dialog" aria-modal="true" aria-labelledby="schedule-dialog-title">
          <button type="button" className="schedule-dialog-close" aria-label="Close dialog" onClick={() => setDialog('')}>×</button>
          {dialog === 'changes' ? <>
            <span className="schedule-dialog-kicker">SCHEDULE V24</span>
            <h2 id="schedule-dialog-title">Schedule changes</h2>
            <p>{rolledBack ? 'The plan has been rolled back. The prior assignment is shown below.' : 'The recovery plan moved one order to protect the production target.'}</p>
            <div className="schedule-change-row"><span>ORD-2048 · Style D · 1,000 pcs</span><strong>{rolledBack ? 'Line 02 · 15:30' : 'Line 02 → Line 05'}</strong></div>
            <div className="schedule-change-row"><span>Estimated delay recovered</span><strong>{rolledBack ? '0 minutes' : '135 minutes'}</strong></div>
            <button type="button" className="schedule-export-action dialog-done" onClick={() => setDialog('')}>Done</button>
          </> : <>
            <span className="schedule-dialog-kicker">CONFIRM ACTION</span>
            <h2 id="schedule-dialog-title">Roll back recovery plan?</h2>
            <p>This restores ORD-2048 to its original Line 02 slot and removes the reassignment from Line 05.</p>
            <div className="schedule-dialog-actions">
              <button type="button" className="schedule-outline-action" onClick={() => setDialog('')}>Keep updated schedule</button>
              <button type="button" className="schedule-rollback-confirm" onClick={rollbackPlan}>Roll back plan</button>
            </div>
          </>}
        </section>
      </div>}
    </section>
  );
}
