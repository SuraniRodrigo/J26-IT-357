import React, { useState } from 'react';

export default function ProductionOptimizationView() {
  const [isRecalculating, setIsRecalculating] = useState(false);

  const handleForceRecalc = () => {
    setIsRecalculating(true);
    setTimeout(() => {
      setIsRecalculating(false);
    }, 1200);
  };

  return (
    <div style={styles.container} className="animate-fade-in">
      {/* Header Row */}
      <div style={styles.headerRow}>
        <div>
          <div style={styles.subsystemId}>| LIVE OPTIMIZATION SUBSYSTEM &nbsp; ID: IT23174726</div>
          <h1 style={styles.pageTitle}>Self-Healing Production Schedule</h1>
          <p style={styles.pageSubtitle}>
            Autonomous framework actively monitoring for machine failures, operator absenteeism, and material shortages. Dynamically regenerating and optimizing production sequences in real-time.
          </p>
        </div>

        {/* System Status Box & Force Recalculation Button */}
        <div style={styles.statusBox}>
          <div>
            <div style={styles.statusLabel}>SYSTEM STATUS</div>
            <div style={styles.statusValueRow}>
              <span style={styles.healingDot} className="pulse-dot" />
              <span style={styles.healingText}>Actively Healing</span>
            </div>
          </div>
          <button
            onClick={handleForceRecalc}
            style={styles.recalcBtn}
            disabled={isRecalculating}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className={isRecalculating ? 'spin-active' : ''}
              style={{ marginRight: '6px' }}
            >
              <polyline points="23 4 23 10 17 10"></polyline>
              <polyline points="1 20 1 14 7 14"></polyline>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
            </svg>
            {isRecalculating ? 'Optimizing...' : 'Force Recalculation'}
          </button>
        </div>
      </div>

      {/* Top Grid: Timeline / Work Sequences vs Constraints & AI Impact */}
      <div style={styles.mainGrid}>
        {/* Left: Active Work Sequences Gantt / Timeline */}
        <div style={styles.timelineCard}>
          <div style={styles.timelineHeader}>
            <div>
              <div style={styles.cardTitle}>Active Work Sequences</div>
              <div style={styles.cardSubtitle}>Autonomous recovery mapping and real-time schedule optimization.</div>
            </div>
            {/* Legend */}
            <div style={styles.legendRow}>
              <div style={styles.legendItem}>
                <span style={{ ...styles.legendDot, backgroundColor: '#10b981' }} />
                <span>On-Track</span>
              </div>
              <div style={styles.legendItem}>
                <span style={{ ...styles.legendDot, backgroundColor: '#ef4444' }} />
                <span>Disrupted</span>
              </div>
              <div style={styles.legendItem}>
                <span style={{ ...styles.legendDot, backgroundColor: '#f59e0b' }} />
                <span>Self-Healed</span>
              </div>
            </div>
          </div>

          {/* Timeline Grid */}
          <div style={styles.ganttContainer}>
            {/* Time markers */}
            <div style={styles.timeAxis}>
              <div style={{ width: '130px', flexShrink: 0 }}>PRODUCTION UNIT</div>
              <div style={styles.timeMarkers}>
                <span>08:00</span>
                <span>10:00</span>
                <span>12:00</span>
                <span>14:00</span>
              </div>
            </div>

            {/* Line Alpha */}
            <div style={styles.ganttRow}>
              <div style={styles.unitName}>Line Alpha</div>
              <div style={styles.unitTrack}>
                <div style={{ ...styles.batchPill, width: '42%', left: '0%', background: '#10b981' }}>
                  Batch 409A
                </div>
                <div style={{ ...styles.batchPill, width: '38%', left: '46%', background: '#f59e0b', color: '#111827', border: '1px solid #fbbf24' }}>
                  ✎ Batch 410B (Recovered)
                </div>
              </div>
            </div>

            {/* Line Beta */}
            <div style={styles.ganttRow}>
              <div style={styles.unitName}>Line Beta</div>
              <div style={styles.unitTrack}>
                <div style={{ ...styles.disruptedBox, width: '22%', left: '8%' }}>
                  <span style={styles.pulsingRedDot} className="pulse-dot-red" />
                  Loom 4 Failure
                </div>
                <div style={{ ...styles.suspendedPill, width: '44%', left: '34%' }}>
                  Sequence Suspended
                </div>
              </div>
            </div>

            {/* Line Gamma */}
            <div style={styles.ganttRow}>
              <div style={styles.unitName}>Line Gamma</div>
              <div style={styles.unitTrack}>
                <div style={{ ...styles.batchPill, width: '68%', left: '18%', background: '#10b981' }}>
                  Continuous Run - Batch 501
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Constraint Monitor & AI Impact Metrics */}
        <div style={styles.rightCol}>
          {/* Constraint Monitor */}
          <div style={styles.subCard}>
            <div style={styles.cardHeader}>
              <div style={styles.cardTitle}>Constraint Monitor</div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                <line x1="8" y1="21" x2="16" y2="21"></line>
                <line x1="12" y1="17" x2="12" y2="21"></line>
              </svg>
            </div>

            <div style={styles.constraintList}>
              {/* Machine Health */}
              <div style={styles.constraintItem}>
                <div style={styles.constraintTop}>
                  <div style={styles.constraintLabel}>
                    <span>⚙</span> MACHINE HEALTH
                  </div>
                  <span style={styles.badgeIssue}>1 Issue Active</span>
                </div>
                <div style={styles.progressBar}>
                  <div style={{ ...styles.progressFill, width: '85%', background: 'linear-gradient(90deg, #10b981 70%, #ef4444 100%)' }} />
                </div>
              </div>

              {/* Workforce Avail */}
              <div style={styles.constraintItem}>
                <div style={styles.constraintTop}>
                  <div style={styles.constraintLabel}>
                    <span>👥</span> WORKFORCE AVAIL
                  </div>
                  <span style={styles.badgeCapacity}>92% Capacity</span>
                </div>
                <div style={styles.progressBar}>
                  <div style={{ ...styles.progressFill, width: '92%', background: '#10b981' }} />
                </div>
              </div>

              {/* Raw Materials */}
              <div style={styles.constraintItem}>
                <div style={styles.constraintTop}>
                  <div style={styles.constraintLabel}>
                    <span>📦</span> RAW MATERIALS
                  </div>
                  <span style={styles.badgeStable}>Stable</span>
                </div>
              </div>
            </div>
          </div>

          {/* AI Impact Metrics */}
          <div style={styles.subCard}>
            <div style={styles.cardTitle}>AI Impact Metrics</div>
            <div style={styles.cardSubtitle}>Performance of self-healing algorithms.</div>

            <div style={styles.impactGrid}>
              <div style={styles.impactBox}>
                <div style={styles.impactNumber}>14 <span style={{ fontSize: '14px' }}>S</span></div>
                <div style={styles.impactDesc}>AVG RECOVERY TIME</div>
              </div>

              <div style={styles.impactBox}>
                <div style={styles.impactNumber}>96 <span style={{ fontSize: '14px' }}>%</span></div>
                <div style={styles.impactDesc}>OEE MAINTAINED</div>
              </div>
            </div>

            <div style={styles.executedRow}>
              <span style={{ color: '#94a3b8', fontSize: '11px' }}>Recommended Optimal Plans Executed:</span>
              <span style={styles.execCount}>12 Today</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section: Real-Time Detection Log */}
      <div style={styles.logCard}>
        <div style={styles.cardHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#38bdf8' }}>◎</span>
            <span style={styles.cardTitle}>Real-Time Detection Log</span>
          </div>
          <span style={styles.timeframeBadge}>Last 4 Hours</span>
        </div>

        <div style={styles.logList}>
          {/* Item 1 */}
          <div style={{ ...styles.logItem, borderLeftColor: '#f59e0b' }}>
            <div style={styles.logIcon}>
              <span style={{ color: '#f59e0b' }}>⚡</span>
            </div>
            <div style={{ flex: 1 }}>
              <div style={styles.logTopRow}>
                <span style={styles.logTitle}>Operator Absenteeism Detected</span>
                <span style={styles.tagOptimized}>OPTIMIZED</span>
              </div>
              <div style={styles.logMeta}>10:14 AM · 14 mins ago</div>
              <div style={styles.logText}>
                Shift B lead absent. Generated alternative work sequence reducing Line Beta throughput by 12% to maintain quality.
              </div>
            </div>
          </div>

          {/* Item 2 */}
          <div style={{ ...styles.logItem, borderLeftColor: '#ef4444' }}>
            <div style={styles.logIcon}>
              <span style={{ color: '#ef4444' }}>⚙</span>
            </div>
            <div style={{ flex: 1 }}>
              <div style={styles.logTopRow}>
                <span style={styles.logTitle}>Machine Failure: Loom 4</span>
                <span style={styles.tagRerouted}>REROUTED</span>
              </div>
              <div style={styles.logMeta}>09:02 AM · 1h 26m ago</div>
              <div style={styles.logText}>
                Unexpected motor halt. Automatically regenerated production schedules; rerouted priority batch to Line Alpha.
              </div>
            </div>
          </div>

          {/* Item 3 */}
          <div style={{ ...styles.logItem, borderLeftColor: '#3b82f6' }}>
            <div style={styles.logIcon}>
              <span style={{ color: '#3b82f6' }}>📋</span>
            </div>
            <div style={{ flex: 1 }}>
              <div style={styles.logTopRow}>
                <span style={styles.logTitle}>Material Shortage Warning</span>
                <span style={styles.tagQueued}>QUEUED</span>
              </div>
              <div style={styles.logMeta}>08:45 AM · 1h 43m ago</div>
              <div style={styles.logText}>
                Dye lot 409 running 5% below required volume. Reconfigured production queue to prioritize dry assembly batches.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: '28px',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
    maxWidth: '1600px',
    margin: '0 auto',
  },
  headerRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '16px',
  },
  subsystemId: {
    fontSize: '11px',
    fontFamily: 'monospace',
    color: '#38bdf8',
    letterSpacing: '0.08em',
    marginBottom: '4px',
    fontWeight: 600,
  },
  pageTitle: {
    fontSize: '28px',
    fontWeight: 700,
    fontFamily: 'Outfit, sans-serif',
    color: '#ffffff',
    letterSpacing: '-0.02em',
  },
  pageSubtitle: {
    fontSize: '13px',
    color: '#94a3b8',
    marginTop: '4px',
    maxWidth: '780px',
  },
  statusBox: {
    background: '#0d1322',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '12px',
    padding: '12px 18px',
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
  },
  statusLabel: {
    fontSize: '9px',
    fontWeight: 700,
    letterSpacing: '0.08em',
    color: '#64748b',
  },
  statusValueRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: '4px',
  },
  healingDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#10b981',
  },
  healingText: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#34d399',
  },
  recalcBtn: {
    background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
    border: '1px solid rgba(59, 130, 246, 0.3)',
    borderRadius: '8px',
    color: '#e2e8f0',
    padding: '10px 16px',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    transition: 'all 0.2s',
  },
  mainGrid: {
    display: 'grid',
    gridTemplateColumns: '1.7fr 1fr',
    gap: '20px',
  },
  timelineCard: {
    background: '#0d1322',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '16px',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
  },
  timelineHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '24px',
  },
  cardTitle: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#f1f5f9',
  },
  cardSubtitle: {
    fontSize: '12px',
    color: '#94a3b8',
    marginTop: '2px',
  },
  legendRow: {
    display: 'flex',
    gap: '14px',
    fontSize: '11px',
    color: '#94a3b8',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  legendDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
  },
  ganttContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  timeAxis: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '10px',
    fontWeight: 700,
    letterSpacing: '0.06em',
    color: '#64748b',
    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
    paddingBottom: '8px',
  },
  timeMarkers: {
    display: 'flex',
    justifyContent: 'space-between',
    flex: 1,
    paddingLeft: '16px',
  },
  ganttRow: {
    display: 'flex',
    alignItems: 'center',
    height: '48px',
  },
  unitName: {
    width: '130px',
    fontSize: '12px',
    fontWeight: 600,
    color: '#cbd5e1',
    flexShrink: 0,
  },
  unitTrack: {
    flex: 1,
    height: '100%',
    background: '#090e1a',
    borderRadius: '8px',
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    border: '1px solid rgba(255, 255, 255, 0.04)',
    overflow: 'hidden',
  },
  batchPill: {
    position: 'absolute',
    height: '32px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '11px',
    fontWeight: 600,
    color: '#ffffff',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
  },
  disruptedBox: {
    position: 'absolute',
    height: '32px',
    borderRadius: '6px',
    border: '1px dashed #ef4444',
    background: 'rgba(239, 68, 68, 0.15)',
    color: '#f87171',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '11px',
    fontWeight: 600,
    gap: '6px',
  },
  pulsingRedDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    backgroundColor: '#ef4444',
  },
  suspendedPill: {
    position: 'absolute',
    height: '32px',
    borderRadius: '6px',
    background: '#1e293b',
    color: '#64748b',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '11px',
    fontWeight: 500,
  },
  rightCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  subCard: {
    background: '#0d1322',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '16px',
    padding: '20px',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '14px',
  },
  constraintList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  constraintItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  constraintTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  constraintLabel: {
    fontSize: '11px',
    fontWeight: 700,
    letterSpacing: '0.06em',
    color: '#94a3b8',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  badgeIssue: {
    fontSize: '10px',
    fontWeight: 700,
    color: '#f87171',
    background: 'rgba(239, 68, 68, 0.15)',
    padding: '2px 8px',
    borderRadius: '4px',
  },
  badgeCapacity: {
    fontSize: '10px',
    fontWeight: 700,
    color: '#fbbf24',
    background: 'rgba(245, 158, 11, 0.15)',
    padding: '2px 8px',
    borderRadius: '4px',
  },
  badgeStable: {
    fontSize: '10px',
    fontWeight: 700,
    color: '#34d399',
    background: 'rgba(16, 185, 129, 0.15)',
    padding: '2px 8px',
    borderRadius: '4px',
  },
  progressBar: {
    height: '6px',
    background: '#1e293b',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: '4px',
  },
  impactGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
    marginTop: '12px',
  },
  impactBox: {
    background: '#090e1a',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    borderRadius: '8px',
    padding: '12px',
  },
  impactNumber: {
    fontSize: '24px',
    fontWeight: 800,
    fontFamily: 'Outfit, sans-serif',
    color: '#38bdf8',
  },
  impactDesc: {
    fontSize: '9px',
    fontWeight: 700,
    color: '#64748b',
    letterSpacing: '0.05em',
    marginTop: '4px',
  },
  executedRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '14px',
    paddingTop: '10px',
    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
  },
  execCount: {
    fontSize: '11px',
    fontWeight: 700,
    color: '#f1f5f9',
    background: '#1e293b',
    padding: '3px 8px',
    borderRadius: '4px',
  },
  logCard: {
    background: '#0d1322',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '16px',
    padding: '20px',
  },
  timeframeBadge: {
    background: '#1e293b',
    color: '#94a3b8',
    padding: '4px 10px',
    borderRadius: '6px',
    fontSize: '11px',
    fontWeight: 500,
  },
  logList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginTop: '8px',
  },
  logItem: {
    background: '#090e1a',
    border: '1px solid rgba(255, 255, 255, 0.04)',
    borderLeftWidth: '4px',
    borderRadius: '8px',
    padding: '12px 16px',
    display: 'flex',
    gap: '14px',
  },
  logIcon: {
    fontSize: '16px',
    paddingTop: '2px',
  },
  logTopRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logTitle: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#f1f5f9',
  },
  logMeta: {
    fontSize: '10px',
    color: '#64748b',
    margin: '2px 0 6px',
  },
  logText: {
    fontSize: '11px',
    color: '#94a3b8',
    lineHeight: 1.5,
  },
  tagOptimized: {
    fontSize: '10px',
    fontWeight: 700,
    color: '#fbbf24',
    background: 'rgba(245, 158, 11, 0.15)',
    padding: '2px 8px',
    borderRadius: '4px',
  },
  tagRerouted: {
    fontSize: '10px',
    fontWeight: 700,
    color: '#f87171',
    background: 'rgba(239, 68, 68, 0.15)',
    padding: '2px 8px',
    borderRadius: '4px',
  },
  tagQueued: {
    fontSize: '10px',
    fontWeight: 700,
    color: '#60a5fa',
    background: 'rgba(59, 130, 246, 0.15)',
    padding: '2px 8px',
    borderRadius: '4px',
  },
};
