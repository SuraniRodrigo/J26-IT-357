import React, { useState } from 'react';

export default function SupplyDisruptionView() {
  const [filterMode, setFilterMode] = useState('all'); // 'all' or 'highRisk'
  const [selectedNode, setSelectedNode] = useState(null);

  const nodes = [
    { id: 1, name: 'Batu Badinding', risk: 'normal', score: 91, delay: '0h', x: 38, y: 25 },
    { id: 2, name: 'Air terjun Sidandu', risk: 'high', score: 58, delay: '54h', x: 55, y: 38 },
    { id: 3, name: 'Balai Adat Dayak', risk: 'normal', score: 87, delay: '4h', x: 32, y: 40 },
    { id: 4, name: 'Roemping', risk: 'high', score: 49, delay: '72h', x: 72, y: 38 },
    { id: 5, name: 'Toko Ipan', risk: 'moderate', score: 74, delay: '18h', x: 48, y: 62 },
    { id: 6, name: 'Pasar Halong', risk: 'high', score: 42, delay: '66h', x: 42, y: 70 },
  ];

  const filteredNodes = filterMode === 'highRisk' 
    ? nodes.filter(n => n.risk === 'high') 
    : nodes;

  return (
    <div style={styles.container} className="animate-fade-in">
      {/* Title & Header */}
      <div style={styles.headerRow}>
        <div>
          <h1 style={styles.pageTitle}>Supply Disruption Predictor</h1>
          <p style={styles.pageSubtitle}>
            Continuous evaluation of supplier reliability to predict potential supply disruptions before they affect production planning.
          </p>
        </div>
        <div style={styles.activeAlertsBadge}>
          <span style={styles.redDot} className="pulse-dot-red" />
          <span>3 ACTIVE ALERTS</span>
        </div>
      </div>

      {/* Main Grid: Left Radar Map, Right Anomalies + Warnings */}
      <div style={styles.topGrid}>
        {/* Radar / Geospatial Map Card */}
        <div style={styles.radarCard}>
          <div style={styles.cardHeader}>
            <div style={styles.cardTitle}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2" style={{ marginRight: '8px' }}>
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="2" y1="12" x2="22" y2="12"></line>
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
              </svg>
              Global Supply Network Status
            </div>
            <div style={styles.pillGroup}>
              <button
                onClick={() => setFilterMode('all')}
                style={{
                  ...styles.pillBtn,
                  background: filterMode === 'all' ? '#1e293b' : 'transparent',
                  color: filterMode === 'all' ? '#f1f5f9' : '#64748b',
                }}
              >
                All Nodes
              </button>
              <button
                onClick={() => setFilterMode('highRisk')}
                style={{
                  ...styles.pillBtn,
                  background: filterMode === 'highRisk' ? '#3b82f6' : 'transparent',
                  color: filterMode === 'highRisk' ? '#ffffff' : '#64748b',
                }}
              >
                High Risk Only
              </button>
            </div>
          </div>

          {/* Interactive Radar Visualizer */}
          <div style={styles.radarViewport}>
            <div style={styles.radarRings}>
              <div style={{ ...styles.ring, width: '90%', height: '90%' }} />
              <div style={{ ...styles.ring, width: '65%', height: '65%' }} />
              <div style={{ ...styles.ring, width: '40%', height: '40%' }} />
              <div style={{ ...styles.ring, width: '15%', height: '15%' }} />
              <div style={styles.crosshairH} />
              <div style={styles.crosshairV} />
              {/* Radar sweep beam */}
              <div style={styles.sweepLine} className="radar-sweep" />
            </div>

            {/* Nodes on Radar */}
            {filteredNodes.map((node) => {
              const isHigh = node.risk === 'high';
              const isMod = node.risk === 'moderate';
              const color = isHigh ? '#ef4444' : isMod ? '#f59e0b' : '#10b981';

              return (
                <div
                  key={node.id}
                  onClick={() => setSelectedNode(node)}
                  style={{
                    ...styles.nodePoint,
                    left: `${node.x}%`,
                    top: `${node.y}%`,
                  }}
                  title={`${node.name} (Risk: ${node.risk}, Delay: ${node.delay})`}
                >
                  <span
                    style={{
                      ...styles.nodeDot,
                      backgroundColor: color,
                      boxShadow: `0 0 12px ${color}`,
                    }}
                    className={isHigh ? 'pulse-dot-red' : ''}
                  />
                  <span style={styles.nodeLabel}>{node.name}</span>
                </div>
              );
            })}

            {/* Bottom Floating Metric Chips */}
            <div style={styles.bottomChips}>
              <div style={styles.chip}>
                <span style={{ color: '#ef4444', marginRight: '6px' }}>▲</span>
                <div>
                  <div style={styles.chipLabel}>HIGH RISK NODES</div>
                  <div style={styles.chipValue}>4</div>
                </div>
              </div>

              <div style={styles.chip}>
                <span style={{ color: '#f59e0b', marginRight: '6px' }}>◷</span>
                <div>
                  <div style={styles.chipLabel}>AVG DELAY PREDICTED</div>
                  <div style={styles.chipValue}>48 <span style={{ fontSize: '11px', fontWeight: 400 }}>hrs</span></div>
                </div>
              </div>

              <div style={styles.chip}>
                <span style={{ color: '#38bdf8', marginRight: '6px' }}>🛡</span>
                <div>
                  <div style={styles.chipLabel}>OVERALL TRUST SCORE</div>
                  <div style={styles.chipValue}>82 <span style={{ fontSize: '11px', fontWeight: 400 }}>/100</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Anomaly Detection + Early Warnings */}
        <div style={styles.rightColumn}>
          {/* Anomaly Detection Card */}
          <div style={styles.subCard}>
            <div style={styles.cardHeader}>
              <div style={styles.cardTitle}>Anomaly Detection</div>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
              </svg>
            </div>
            <div style={styles.bigStatRow}>
              <span style={styles.bigStatNum}>12</span>
              <span style={styles.bigStatDesc}>Deviations<br />Detected</span>
            </div>
            {/* Sparkline curve */}
            <div style={styles.sparklineContainer}>
              <svg width="100%" height="54" viewBox="0 0 300 60" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="anomGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <path
                  d="M0 45 Q 30 50, 60 30 T 120 40 T 180 15 T 240 38 T 300 20 L 300 60 L 0 60 Z"
                  fill="url(#anomGrad)"
                />
                <path
                  d="M0 45 Q 30 50, 60 30 T 120 40 T 180 15 T 240 38 T 300 20"
                  fill="none"
                  stroke="#60a5fa"
                  strokeWidth="2.5"
                />
              </svg>
            </div>
            <div style={styles.sparklineFooter}>
              <span>Last 7 Days</span>
              <span style={{ color: '#f59e0b', fontWeight: 600 }}>+3 vs prev. period</span>
            </div>
          </div>

          {/* Early Warnings Card */}
          <div style={styles.subCard}>
            <div style={styles.cardHeader}>
              <div style={styles.cardTitle}>Early Warnings</div>
              <span style={styles.urgentBadge}>Urgent</span>
            </div>
            <div style={styles.warningList}>
              <div style={styles.warningItem}>
                <div style={{ ...styles.alertDot, backgroundColor: '#ef4444' }} />
                <div>
                  <div style={styles.warningTitle}>Typhoon Yagi Impact Prediction</div>
                  <div style={styles.warningMeta}>SUP_REG_A · ETA DELAY: 72H</div>
                  <div style={styles.warningDesc}>
                    Raw material shipment from Shanghai port expected to face severe delays due to typhoon rerouting.
                  </div>
                </div>
              </div>

              <div style={styles.warningItem}>
                <div style={{ ...styles.alertDot, backgroundColor: '#f59e0b' }} />
                <div>
                  <div style={styles.warningTitle}>Supplier Consistency Drop</div>
                  <div style={styles.warningMeta}>VEND_442 · TRUST SCORE: -5%</div>
                  <div style={styles.warningDesc}>
                    Recent deliveries show increasing variance in lead times. Assessment of buffer stock suggested.
                  </div>
                </div>
              </div>

              <div style={styles.warningItem}>
                <div style={{ ...styles.alertDot, backgroundColor: '#f59e0b' }} />
                <div>
                  <div style={styles.warningTitle}>Customs Clearance Bottleneck</div>
                  <div style={styles.warningMeta}>PORT_EU_W · DELAY: 24H</div>
                  <div style={styles.warningDesc}>
                    New regulatory checks causing congestion at primary entry node. Factory transit adjusted.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section: Supplier Risk Profiling Framework */}
      <div style={styles.frameworkCard}>
        <div style={styles.frameworkHeader}>
          <div>
            <h2 style={styles.frameworkTitle}>Supplier Risk Profiling Framework</h2>
            <p style={styles.frameworkSubtitle}>Continuous evaluation matrix for key vendor reliability metrics.</p>
          </div>
          <button style={styles.exportBtn}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            Export Report
          </button>
        </div>

        <div style={styles.frameworkGrid}>
          {/* Module Owner */}
          <div style={styles.frameworkCol}>
            <div style={styles.colHeader}>MODULE OWNER</div>
            <div style={styles.ownerName}>Herath H.M.C.P</div>
            <div style={styles.ownerId}>IT23186538</div>
          </div>

          {/* Objective & Focus */}
          <div style={styles.frameworkCol}>
            <div style={styles.colHeader}>OBJECTIVE & FOCUS</div>
            <div style={styles.focusTitle}>Supplier Risk Profiling & Supply Disruption Predictor</div>
            <div style={styles.subObjHeader}>SUB OBJECTIVE:</div>
            <div style={styles.colText}>
              To develop a supplier risk profiling framework that evaluates supplier reliability and predicts future supply disruptions before they impact production.
            </div>
          </div>

          {/* Core Methodologies */}
          <div style={styles.frameworkCol}>
            <div style={styles.colHeader}>CORE METHODOLOGIES</div>
            <ul style={styles.methodologyList}>
              <li>Collect supplier and delivery performance data.</li>
              <li>Analyze historical delays and delivery deviations.</li>
              <li>Assess supplier consistency and reliability.</li>
              <li>Generate supplier trust scores.</li>
              <li>Predict disruption risks and provide early warning.</li>
            </ul>
          </div>

          {/* System Differentiation */}
          <div style={styles.frameworkCol}>
            <div style={styles.colHeader}>SYSTEM DIFFERENTIATION</div>
            <div style={styles.differentiationBox}>
              Unlike traditional supply chain monitoring systems that identify delays after they occur, this module develops a supplier risk profiling framework that continuously evaluates supplier reliability and predicts potential supply disruptions before they affect production planning.
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
    maxWidth: '750px',
  },
  activeAlertsBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: 'rgba(239, 68, 68, 0.12)',
    border: '1px solid rgba(239, 68, 68, 0.35)',
    borderRadius: '8px',
    padding: '8px 14px',
    color: '#f87171',
    fontSize: '12px',
    fontWeight: 700,
    letterSpacing: '0.08em',
  },
  redDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#ef4444',
  },
  topGrid: {
    display: 'grid',
    gridTemplateColumns: '1.45fr 1fr',
    gap: '20px',
  },
  radarCard: {
    background: '#0d1322',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '16px',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    overflow: 'hidden',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '16px',
  },
  cardTitle: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#f1f5f9',
    display: 'flex',
    alignItems: 'center',
  },
  pillGroup: {
    display: 'flex',
    gap: '6px',
    background: '#0a0e17',
    padding: '3px',
    borderRadius: '8px',
    border: '1px solid rgba(255, 255, 255, 0.06)',
  },
  pillBtn: {
    border: 'none',
    padding: '5px 12px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  radarViewport: {
    height: '380px',
    background: 'radial-gradient(circle at center, #111d33 0%, #090e1a 100%)',
    borderRadius: '12px',
    position: 'relative',
    overflow: 'hidden',
    border: '1px solid rgba(255, 255, 255, 0.05)',
  },
  radarRings: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
  },
  ring: {
    position: 'absolute',
    borderRadius: '50%',
    border: '1px dashed rgba(56, 189, 248, 0.18)',
  },
  crosshairH: {
    position: 'absolute',
    width: '100%',
    height: '1px',
    background: 'rgba(56, 189, 248, 0.12)',
  },
  crosshairV: {
    position: 'absolute',
    height: '100%',
    width: '1px',
    background: 'rgba(56, 189, 248, 0.12)',
  },
  sweepLine: {
    position: 'absolute',
    width: '50%',
    height: '2px',
    background: 'linear-gradient(90deg, transparent 0%, #38bdf8 100%)',
    boxShadow: '0 0 15px #38bdf8',
    top: '50%',
    left: '50%',
  },
  nodePoint: {
    position: 'absolute',
    transform: 'translate(-50%, -50%)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    cursor: 'pointer',
    zIndex: 10,
  },
  nodeDot: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    border: '2px solid #ffffff',
  },
  nodeLabel: {
    marginTop: '4px',
    fontSize: '10px',
    fontWeight: 600,
    color: '#cbd5e1',
    textShadow: '0 1px 4px rgba(0, 0, 0, 0.9)',
    whiteSpace: 'nowrap',
  },
  bottomChips: {
    position: 'absolute',
    bottom: '12px',
    left: '12px',
    right: '12px',
    display: 'flex',
    gap: '10px',
    zIndex: 20,
  },
  chip: {
    flex: 1,
    background: 'rgba(15, 23, 42, 0.85)',
    backdropFilter: 'blur(8px)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '8px',
    padding: '8px 12px',
    display: 'flex',
    alignItems: 'center',
  },
  chipLabel: {
    fontSize: '9px',
    fontWeight: 700,
    letterSpacing: '0.06em',
    color: '#94a3b8',
  },
  chipValue: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#ffffff',
  },
  rightColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  subCard: {
    background: '#0d1322',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '16px',
    padding: '18px 20px',
  },
  bigStatRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '10px',
  },
  bigStatNum: {
    fontSize: '36px',
    fontWeight: 800,
    fontFamily: 'Outfit, sans-serif',
    color: '#ffffff',
  },
  bigStatDesc: {
    fontSize: '11px',
    color: '#94a3b8',
    lineHeight: 1.3,
  },
  sparklineContainer: {
    width: '100%',
    overflow: 'hidden',
  },
  sparklineFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '11px',
    color: '#64748b',
    marginTop: '6px',
  },
  urgentBadge: {
    background: 'rgba(239, 68, 68, 0.15)',
    color: '#f87171',
    borderRadius: '6px',
    padding: '3px 8px',
    fontSize: '10px',
    fontWeight: 700,
    textTransform: 'uppercase',
  },
  warningList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  warningItem: {
    display: 'flex',
    gap: '10px',
    padding: '10px',
    background: 'rgba(15, 22, 38, 0.6)',
    borderRadius: '8px',
    border: '1px solid rgba(255, 255, 255, 0.04)',
  },
  alertDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    marginTop: '5px',
    flexShrink: 0,
  },
  warningTitle: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#f1f5f9',
  },
  warningMeta: {
    fontSize: '10px',
    fontFamily: 'monospace',
    color: '#94a3b8',
    margin: '2px 0 4px',
  },
  warningDesc: {
    fontSize: '11px',
    color: '#64748b',
    lineHeight: 1.4,
  },
  frameworkCard: {
    background: '#0d1322',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '16px',
    padding: '24px',
  },
  frameworkHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: '16px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
    marginBottom: '18px',
  },
  frameworkTitle: {
    fontSize: '18px',
    fontWeight: 700,
    fontFamily: 'Outfit, sans-serif',
    color: '#ffffff',
  },
  frameworkSubtitle: {
    fontSize: '12px',
    color: '#94a3b8',
    marginTop: '3px',
  },
  exportBtn: {
    background: '#1e293b',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '8px',
    color: '#e2e8f0',
    padding: '8px 16px',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    transition: 'background 0.2s',
  },
  frameworkGrid: {
    display: 'grid',
    gridTemplateColumns: '0.8fr 1.3fr 1.3fr 1.6fr',
    gap: '24px',
  },
  frameworkCol: {
    display: 'flex',
    flexDirection: 'column',
  },
  colHeader: {
    fontSize: '10px',
    fontWeight: 700,
    letterSpacing: '0.08em',
    color: '#64748b',
    marginBottom: '10px',
    textTransform: 'uppercase',
  },
  ownerName: {
    fontSize: '14px',
    fontWeight: 700,
    color: '#f8fafc',
  },
  ownerId: {
    fontSize: '11px',
    fontFamily: 'monospace',
    color: '#38bdf8',
    marginTop: '2px',
  },
  focusTitle: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#e2e8f0',
    marginBottom: '6px',
  },
  subObjHeader: {
    fontSize: '10px',
    fontWeight: 700,
    color: '#94a3b8',
    marginTop: '4px',
  },
  colText: {
    fontSize: '11px',
    color: '#94a3b8',
    lineHeight: 1.5,
    marginTop: '2px',
  },
  methodologyList: {
    paddingLeft: '16px',
    fontSize: '11px',
    color: '#cbd5e1',
    lineHeight: 1.7,
  },
  differentiationBox: {
    background: 'rgba(15, 23, 42, 0.7)',
    borderLeft: '3px solid #3b82f6',
    borderRadius: '0 8px 8px 0',
    padding: '12px 14px',
    fontSize: '11px',
    color: '#cbd5e1',
    lineHeight: 1.6,
  },
};
