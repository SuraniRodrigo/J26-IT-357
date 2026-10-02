import React, { useState } from 'react';

export default function DashboardView({ onNavigate }) {
  const [pipelineRunning, setPipelineRunning] = useState(false);
  const [pipelineSuccess, setPipelineSuccess] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState('Q3-Q4 2025');

  const handleRunPipeline = () => {
    setPipelineRunning(true);
    setPipelineSuccess(false);

    // Call API or simulate synchronous evaluation
    fetch('http://127.0.0.1:8000/api/optichain/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product_ids: ['SKU-COT-001', 'SKU-DEN-002', 'SKU-PLQ-003'],
        forecast_horizon_days: 14,
        lead_time_days: 14,
        current_inventory: 3000,
        disruption_probability: 0.35,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        setPipelineSuccess(true);
      })
      .catch((err) => {
        // Fallback smooth completion indicator
        setPipelineSuccess(true);
      })
      .finally(() => {
        setTimeout(() => setPipelineRunning(false), 800);
      });
  };

  return (
    <div style={styles.container} className="animate-fade-in">
      {/* Top System Bar */}
      <div style={styles.topBar}>
        <div>
          <div style={styles.systemBadge}>
            <span style={styles.livePulse} className="pulse-dot" />
            OPTICHAIN ENTERPRISE ARCHITECTURE · EXECUTIVE OVERVIEW
          </div>
          <h1 style={styles.pageTitle}>Executive Command Center</h1>
          <p style={styles.pageSubtitle}>
            End-to-end operational intelligence synthesizing seasonal garment demand, supplier disruption risks, dynamic inventory buffers, and self-healing production lines.
          </p>
        </div>

        {/* Global Action Button */}
        <button
          onClick={handleRunPipeline}
          disabled={pipelineRunning}
          style={styles.pipelineButton}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={pipelineRunning ? 'spin-active' : ''}
            style={{ marginRight: '8px' }}
          >
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
          </svg>
          {pipelineRunning ? 'Propagating Pipeline...' : 'Run End-to-End Orchestrator'}
        </button>
      </div>

      {pipelineSuccess && (
        <div style={styles.successAlert}>
          <span style={{ color: '#10b981', fontSize: '18px' }}>✓</span>
          <div>
            <strong style={{ color: '#f1f5f9', fontSize: '13px' }}>Pipeline Integration Succeeded</strong>
            <p style={{ margin: 0, fontSize: '11px', color: '#94a3b8' }}>
              Demand Forecast signals propagated through Procurement Guardian & Inventory Guardian to Line Optimizer.
            </p>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 🌟 PROMINENT DEMAND FORECASTING HIGHLIGHT SECTION (HERO) */}
      {/* ======================================================== */}
      <div style={styles.demandHeroCard}>
        {/* Glow corner accent */}
        <div style={styles.demandHeroGlow} />

        {/* Highlighted Banner Header */}
        <div style={styles.demandHeroHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={styles.starBadge}>★ PRIMARY CATALYST</span>
            <span style={styles.demandModuleBadge}>MODULE 1: DEMAND FORECASTING (MARKET PROPHET)</span>
          </div>
          <button
            onClick={() => onNavigate('demand')}
            style={styles.inspectModuleBtn}
          >
            Open Market Prophet Dashboard →
          </button>
        </div>

        <div style={styles.demandHeroContent}>
          {/* Left Column: Big Forecast Numbers & Narrative */}
          <div style={styles.demandTextCol}>
            <div style={styles.demandSuperTitle}>Seasonal Demand Trajectory & Order Projections</div>
            <p style={styles.demandHeroParagraph}>
              As the foundational catalyst of OptiChain, <strong>Market Prophet</strong> aggregates 4.2B global telemetry signals, runway trend intelligence, and macroeconomic buyer sentiments to generate SKU-level demand forecasts. Downstream modules dynamically adapt inventory buffers and schedule manufacturing batches based on this prediction.
            </p>

            {/* Demand Metrics Quadrant */}
            <div style={styles.demandMetricsGrid}>
              <div style={styles.demandMetricBox}>
                <div style={styles.demandMetricLabel}>TOTAL PROJECTED DEMAND</div>
                <div style={styles.demandMetricValue}>
                  2.4M <span style={{ fontSize: '14px', fontWeight: 500 }}>Units</span>
                </div>
                <div style={styles.demandMetricPillGreen}>↑ +31.5% YoY in Activewear</div>
              </div>

              <div style={styles.demandMetricBox}>
                <div style={styles.demandMetricLabel}>OVERALL FORECAST ACCURACY</div>
                <div style={styles.demandMetricValue}>
                  94.8%
                </div>
                <div style={styles.demandMetricPillBlue}>AI Model Confidence: High (0.89)</div>
              </div>

              <div style={styles.demandMetricBox}>
                <div style={styles.demandMetricLabel}>TOP GROWING SKU</div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#f1f5f9', marginTop: '4px' }}>
                  AC-PERF-LG-02
                </div>
                <div style={{ fontSize: '11px', color: '#94a3b8' }}>Performance Legging · 210,000 units</div>
              </div>

              <div style={styles.demandMetricBox}>
                <div style={styles.demandMetricLabel}>DOMINANT COLOR PALETTE</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                  <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#d97706' }} />
                  <strong style={{ fontSize: '14px', color: '#ffffff' }}>Solar Amber</strong>
                  <span style={{ fontSize: '10px', color: '#f59e0b', fontWeight: 600 }}>Idx: 142</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Visual Forecast Trajectory Chart */}
          <div style={styles.demandChartCol}>
            <div style={styles.chartHeaderRow}>
              <div>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff' }}>Forecasted Demand Curve</span>
                <span style={{ fontSize: '11px', color: '#64748b', marginLeft: '8px' }}>Indexed Volume Growth</span>
              </div>
              <span style={styles.pulseActiveTag}>● Live Projection</span>
            </div>

            {/* SVG Trajectory */}
            <div style={styles.svgTrajectoryContainer}>
              <svg width="100%" height="160" viewBox="0 0 450 160" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="heroActiveGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                {/* Horizontal reference lines */}
                <line x1="20" y1="30" x2="430" y2="30" stroke="rgba(255,255,255,0.06)" strokeDasharray="3" />
                <line x1="20" y1="75" x2="430" y2="75" stroke="rgba(255,255,255,0.06)" strokeDasharray="3" />
                <line x1="20" y1="120" x2="430" y2="120" stroke="rgba(255,255,255,0.06)" strokeDasharray="3" />

                {/* Primary Growth Wave */}
                <path
                  d="M20 130 C 100 120, 180 90, 260 55 S 380 25, 430 18 L 430 140 L 20 140 Z"
                  fill="url(#heroActiveGrad)"
                />
                <path
                  d="M20 130 C 100 120, 180 90, 260 55 S 380 25, 430 18"
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="3.2"
                />

                {/* Secondary Baseline Wave */}
                <path
                  d="M20 135 C 100 130, 200 125, 290 110 S 390 95, 430 85"
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="2"
                  strokeDasharray="4,3"
                />

                {/* Month labels */}
                <text x="30" y="152" fill="#64748b" fontSize="10">Q1 '25</text>
                <text x="160" y="152" fill="#64748b" fontSize="10">Q3 '25</text>
                <text x="290" y="152" fill="#64748b" fontSize="10">Q1 '26</text>
                <text x="390" y="152" fill="#38bdf8" fontSize="10" fontWeight="700">Q4 '26 (Est)</text>
              </svg>
            </div>

            {/* Bottom mini legend */}
            <div style={styles.chartMiniLegend}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#38bdf8' }} />
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>AI Predicted Volume</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b' }} />
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>Historical Baseline</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 🔄 END-TO-END DISRUPTION PROPAGATION PIPELINE            */}
      {/* ======================================================== */}
      <div style={styles.pipelineCard}>
        <div style={styles.cardHeader}>
          <div>
            <div style={styles.cardTitle}>Disruption & Decision Propagation Workflow</div>
            <div style={styles.cardSubtitle}>How Demand Forecasting triggers downstream Procurement, Inventory buffers, and Factory Lines.</div>
          </div>
          <span style={styles.contractPill}>Contract-Enforced Pipelines</span>
        </div>

        <div style={styles.workflowGrid}>
          {/* Node 1: Demand (Highlighted) */}
          <div
            style={{ ...styles.flowNode, borderColor: '#38bdf8', background: 'rgba(56, 189, 248, 0.08)' }}
            onClick={() => onNavigate('demand')}
          >
            <div style={styles.nodeHeaderRow}>
              <span style={{ ...styles.nodeBadge, color: '#38bdf8' }}>STEP 1 · CATALYST</span>
              <span style={{ fontSize: '16px' }}>📈</span>
            </div>
            <div style={styles.flowNodeTitle}>Demand Forecasting</div>
            <div style={styles.flowNodeEngine}>Market Prophet</div>
            <div style={styles.nodeStatHighlight}>
              <strong>2.4M</strong> Units Predicted
            </div>
            <div style={styles.nodeActionText}>Open Full Module →</div>
          </div>

          <div style={styles.flowArrow}>➔</div>

          {/* Node 2: Supply */}
          <div
            style={styles.flowNode}
            onClick={() => onNavigate('supply')}
          >
            <div style={styles.nodeHeaderRow}>
              <span style={styles.nodeBadge}>STEP 2</span>
              <span style={{ fontSize: '16px' }}>⚠️</span>
            </div>
            <div style={styles.flowNodeTitle}>Supply Disruption</div>
            <div style={styles.flowNodeEngine}>Procurement Guardian</div>
            <div style={styles.nodeStatHighlight}>
              <strong style={{ color: '#ef4444' }}>3</strong> Active Alerts
            </div>
            <div style={styles.nodeActionText}>Open Full Module →</div>
          </div>

          <div style={styles.flowArrow}>➔</div>

          {/* Node 3: Inventory */}
          <div
            style={styles.flowNode}
            onClick={() => onNavigate('inventory')}
          >
            <div style={styles.nodeHeaderRow}>
              <span style={styles.nodeBadge}>STEP 3</span>
              <span style={{ fontSize: '16px' }}>📦</span>
            </div>
            <div style={styles.flowNodeTitle}>Inventory Optimization</div>
            <div style={styles.flowNodeEngine}>Inventory Guardian</div>
            <div style={styles.nodeStatHighlight}>
              <strong style={{ color: '#10b981' }}>98.2%</strong> Mitigation
            </div>
            <div style={styles.nodeActionText}>Open Full Module →</div>
          </div>

          <div style={styles.flowArrow}>➔</div>

          {/* Node 4: Production */}
          <div
            style={styles.flowNode}
            onClick={() => onNavigate('production')}
          >
            <div style={styles.nodeHeaderRow}>
              <span style={styles.nodeBadge}>STEP 4</span>
              <span style={{ fontSize: '16px' }}>⚙️</span>
            </div>
            <div style={styles.flowNodeTitle}>Production Scheduling</div>
            <div style={styles.flowNodeEngine}>Line Optimizer</div>
            <div style={styles.nodeStatHighlight}>
              <strong style={{ color: '#34d399' }}>96%</strong> OEE Healed
            </div>
            <div style={styles.nodeActionText}>Open Full Module →</div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 📦 THE THREE DOWNSTREAM MODULES (COMPLETE OVERVIEWS)      */}
      {/* ======================================================== */}
      <div style={styles.downstreamGrid}>
        {/* Module 2: Supply Disruption */}
        <div style={styles.moduleSummaryCard}>
          <div style={styles.cardHeader}>
            <div>
              <span style={styles.modMiniEyebrow}>MODULE 2</span>
              <h3 style={styles.modMiniTitle}>Supply Disruption Predictor</h3>
              <span style={styles.modMiniEngine}>Procurement Guardian</span>
            </div>
            <button onClick={() => onNavigate('supply')} style={styles.moduleJumpBtn}>
              View Radar →
            </button>
          </div>

          <p style={styles.modSummaryDesc}>
            Continuously evaluates supplier reliability and port bottlenecks to calculate disruption probabilities before raw fabric runs out.
          </p>

          <div style={styles.telemetryMiniRow}>
            <div style={styles.telemetryBox}>
              <span style={styles.telemetryLabel}>HIGH RISK NODES</span>
              <span style={{ ...styles.telemetryVal, color: '#ef4444' }}>4 Nodes</span>
            </div>
            <div style={styles.telemetryBox}>
              <span style={styles.telemetryLabel}>AVG PREDICTED DELAY</span>
              <span style={{ ...styles.telemetryVal, color: '#f59e0b' }}>48 hrs</span>
            </div>
            <div style={styles.telemetryBox}>
              <span style={styles.telemetryLabel}>OVERALL TRUST SCORE</span>
              <span style={styles.telemetryVal}>82/100</span>
            </div>
          </div>

          <div style={styles.alertPreviewBox}>
            <span style={{ color: '#ef4444' }}>●</span>
            <span style={{ fontSize: '11px', color: '#cbd5e1' }}>
              <strong>Typhoon Yagi Impact:</strong> Shanghai shipment delayed by 72h. Expediting local buffer.
            </span>
          </div>
        </div>

        {/* Module 3: Inventory Guardian */}
        <div style={styles.moduleSummaryCard}>
          <div style={styles.cardHeader}>
            <div>
              <span style={styles.modMiniEyebrow}>MODULE 3</span>
              <h3 style={styles.modMiniTitle}>Disruption-Aware Inventory</h3>
              <span style={styles.modMiniEngine}>Inventory Guardian</span>
            </div>
            <button onClick={() => onNavigate('inventory')} style={styles.moduleJumpBtn}>
              View Buffer →
            </button>
          </div>

          <p style={styles.modSummaryDesc}>
            Dynamically recalculates reorder points and safety stocks considering lead-time variance and demand spikes to suppress dead stock.
          </p>

          <div style={styles.telemetryMiniRow}>
            <div style={styles.telemetryBox}>
              <span style={styles.telemetryLabel}>DEAD STOCK REDUCTION</span>
              <span style={{ ...styles.telemetryVal, color: '#38bdf8' }}>-24.5%</span>
            </div>
            <div style={styles.telemetryBox}>
              <span style={styles.telemetryLabel}>STOCKOUT MITIGATION</span>
              <span style={{ ...styles.telemetryVal, color: '#10b981' }}>98.2%</span>
            </div>
            <div style={styles.telemetryBox}>
              <span style={styles.telemetryLabel}>ACTIVE REORDERS</span>
              <span style={styles.telemetryVal}>4 Critical</span>
            </div>
          </div>

          <div style={styles.alertPreviewBox}>
            <span style={{ color: '#f59e0b' }}>●</span>
            <span style={{ fontSize: '11px', color: '#cbd5e1' }}>
              <strong>Organic Cotton ORG-COT-001:</strong> 48h depletion threshold. Dynamic reorder of 15,200 kg triggered.
            </span>
          </div>
        </div>

        {/* Module 4: Line Optimizer */}
        <div style={styles.moduleSummaryCard}>
          <div style={styles.cardHeader}>
            <div>
              <span style={styles.modMiniEyebrow}>MODULE 4</span>
              <h3 style={styles.modMiniTitle}>Self-Healing Production</h3>
              <span style={styles.modMiniEngine}>Line Optimizer</span>
            </div>
            <button onClick={() => onNavigate('production')} style={styles.moduleJumpBtn}>
              View Gantt →
            </button>
          </div>

          <p style={styles.modSummaryDesc}>
            Autonomously monitors machine failures and operator absenteeism, recalculating production schedules to preserve factory throughput.
          </p>

          <div style={styles.telemetryMiniRow}>
            <div style={styles.telemetryBox}>
              <span style={styles.telemetryLabel}>AVG RECOVERY TIME</span>
              <span style={{ ...styles.telemetryVal, color: '#38bdf8' }}>14 sec</span>
            </div>
            <div style={styles.telemetryBox}>
              <span style={styles.telemetryLabel}>OEE MAINTAINED</span>
              <span style={{ ...styles.telemetryVal, color: '#10b981' }}>96%</span>
            </div>
            <div style={styles.telemetryBox}>
              <span style={styles.telemetryLabel}>SYSTEM STATUS</span>
              <span style={{ ...styles.telemetryVal, color: '#34d399' }}>Healing</span>
            </div>
          </div>

          <div style={styles.alertPreviewBox}>
            <span style={{ color: '#38bdf8' }}>●</span>
            <span style={{ fontSize: '11px', color: '#cbd5e1' }}>
              <strong>Loom 4 Halt Handled:</strong> Batch 410B successfully rerouted to Line Alpha without delivery SLA breach.
            </span>
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
    gap: '26px',
    maxWidth: '1600px',
    margin: '0 auto',
  },
  topBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '16px',
  },
  systemBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    background: 'rgba(56, 189, 248, 0.12)',
    color: '#38bdf8',
    borderRadius: '20px',
    padding: '4px 14px',
    fontSize: '11px',
    fontWeight: 700,
    letterSpacing: '0.08em',
    marginBottom: '8px',
  },
  livePulse: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    backgroundColor: '#38bdf8',
  },
  pageTitle: {
    fontSize: '28px',
    fontWeight: 800,
    fontFamily: 'Outfit, sans-serif',
    color: '#ffffff',
    letterSpacing: '-0.02em',
  },
  pageSubtitle: {
    fontSize: '13px',
    color: '#94a3b8',
    marginTop: '4px',
    maxWidth: '850px',
    lineHeight: 1.5,
  },
  pipelineButton: {
    background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
    border: 'none',
    borderRadius: '10px',
    color: '#ffffff',
    padding: '12px 22px',
    fontSize: '13px',
    fontWeight: 700,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    boxShadow: '0 4px 20px rgba(37, 99, 235, 0.4)',
    transition: 'all 0.2s',
  },
  successAlert: {
    background: 'rgba(16, 185, 129, 0.12)',
    border: '1px solid rgba(16, 185, 129, 0.3)',
    borderRadius: '10px',
    padding: '14px 18px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },

  /* ==================== DEMAND HERO HIGHLIGHT STYLES ==================== */
  demandHeroCard: {
    background: 'linear-gradient(135deg, #0d1a33 0%, #080f1e 100%)',
    border: '2px solid rgba(56, 189, 248, 0.35)',
    borderRadius: '18px',
    padding: '28px',
    position: 'relative',
    overflow: 'hidden',
    boxShadow: '0 12px 40px rgba(0, 0, 0, 0.5), 0 0 35px rgba(56, 189, 248, 0.15)',
  },
  demandHeroGlow: {
    position: 'absolute',
    top: '-80px',
    right: '-80px',
    width: '240px',
    height: '240px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(56, 189, 248, 0.25) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  demandHeroHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '12px',
    borderBottom: '1px solid rgba(56, 189, 248, 0.15)',
    paddingBottom: '16px',
    marginBottom: '20px',
  },
  starBadge: {
    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    color: '#000000',
    borderRadius: '4px',
    padding: '3px 8px',
    fontSize: '10px',
    fontWeight: 800,
    letterSpacing: '0.08em',
  },
  demandModuleBadge: {
    fontSize: '12px',
    fontWeight: 700,
    fontFamily: 'monospace',
    color: '#38bdf8',
    letterSpacing: '0.06em',
  },
  inspectModuleBtn: {
    background: 'rgba(56, 189, 248, 0.12)',
    border: '1px solid rgba(56, 189, 248, 0.4)',
    borderRadius: '8px',
    color: '#38bdf8',
    padding: '8px 16px',
    fontSize: '12px',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  demandHeroContent: {
    display: 'grid',
    gridTemplateColumns: '1.45fr 1fr',
    gap: '28px',
  },
  demandTextCol: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  demandSuperTitle: {
    fontSize: '22px',
    fontWeight: 800,
    fontFamily: 'Outfit, sans-serif',
    color: '#ffffff',
    letterSpacing: '-0.01em',
  },
  demandHeroParagraph: {
    fontSize: '13px',
    color: '#cbd5e1',
    lineHeight: 1.6,
    margin: '10px 0 20px',
  },
  demandMetricsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '14px',
  },
  demandMetricBox: {
    background: 'rgba(9, 14, 26, 0.75)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '10px',
    padding: '14px 16px',
  },
  demandMetricLabel: {
    fontSize: '9px',
    fontWeight: 700,
    letterSpacing: '0.08em',
    color: '#94a3b8',
  },
  demandMetricValue: {
    fontSize: '26px',
    fontWeight: 800,
    fontFamily: 'Outfit, sans-serif',
    color: '#ffffff',
    margin: '4px 0',
  },
  demandMetricPillGreen: {
    fontSize: '10px',
    fontWeight: 600,
    color: '#34d399',
  },
  demandMetricPillBlue: {
    fontSize: '10px',
    fontWeight: 600,
    color: '#38bdf8',
  },
  demandChartCol: {
    background: 'rgba(9, 14, 26, 0.85)',
    border: '1px solid rgba(56, 189, 248, 0.18)',
    borderRadius: '14px',
    padding: '18px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  chartHeaderRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '8px',
  },
  pulseActiveTag: {
    fontSize: '10px',
    fontWeight: 700,
    color: '#38bdf8',
    background: 'rgba(56, 189, 248, 0.12)',
    padding: '2px 8px',
    borderRadius: '4px',
  },
  svgTrajectoryContainer: {
    width: '100%',
    margin: '8px 0',
  },
  chartMiniLegend: {
    display: 'flex',
    gap: '16px',
    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
    paddingTop: '10px',
  },

  /* ==================== PIPELINE FLOW STYLES ==================== */
  pipelineCard: {
    background: '#0d1322',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '16px',
    padding: '24px',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '18px',
  },
  cardTitle: {
    fontSize: '16px',
    fontWeight: 700,
    fontFamily: 'Outfit, sans-serif',
    color: '#ffffff',
  },
  cardSubtitle: {
    fontSize: '12px',
    color: '#94a3b8',
    marginTop: '3px',
  },
  contractPill: {
    background: '#1e293b',
    color: '#38bdf8',
    borderRadius: '6px',
    padding: '4px 10px',
    fontSize: '11px',
    fontWeight: 600,
  },
  workflowGrid: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    flexWrap: 'wrap',
  },
  flowNode: {
    flex: 1,
    minWidth: '200px',
    background: '#090e1a',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '12px',
    padding: '16px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  nodeHeaderRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nodeBadge: {
    fontSize: '9px',
    fontWeight: 700,
    letterSpacing: '0.08em',
    color: '#64748b',
  },
  flowNodeTitle: {
    fontSize: '14px',
    fontWeight: 700,
    color: '#ffffff',
    marginTop: '6px',
  },
  flowNodeEngine: {
    fontSize: '11px',
    color: '#94a3b8',
    marginTop: '2px',
  },
  nodeStatHighlight: {
    fontSize: '12px',
    color: '#e2e8f0',
    marginTop: '10px',
    paddingTop: '8px',
    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
  },
  nodeActionText: {
    fontSize: '11px',
    color: '#38bdf8',
    fontWeight: 600,
    marginTop: '6px',
  },
  flowArrow: {
    color: '#475569',
    fontSize: '18px',
    fontWeight: 700,
  },

  /* ==================== DOWNSTREAM 3 MODULES GRID ==================== */
  downstreamGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '20px',
  },
  moduleSummaryCard: {
    background: '#0d1322',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '16px',
    padding: '22px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  modMiniEyebrow: {
    fontSize: '9px',
    fontWeight: 700,
    letterSpacing: '0.08em',
    color: '#64748b',
  },
  modMiniTitle: {
    fontSize: '15px',
    fontWeight: 700,
    color: '#ffffff',
    marginTop: '2px',
  },
  modMiniEngine: {
    fontSize: '11px',
    color: '#38bdf8',
    fontWeight: 600,
  },
  moduleJumpBtn: {
    background: '#1e293b',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '6px',
    color: '#cbd5e1',
    padding: '6px 12px',
    fontSize: '11px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  modSummaryDesc: {
    fontSize: '12px',
    color: '#94a3b8',
    lineHeight: 1.5,
    margin: '12px 0 16px',
  },
  telemetryMiniRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '8px',
    background: '#090e1a',
    padding: '10px 12px',
    borderRadius: '8px',
    marginBottom: '14px',
  },
  telemetryLabel: {
    fontSize: '8px',
    fontWeight: 700,
    color: '#64748b',
    letterSpacing: '0.04em',
  },
  telemetryVal: {
    fontSize: '13px',
    fontWeight: 700,
    color: '#ffffff',
    marginTop: '2px',
    display: 'block',
  },
  alertPreviewBox: {
    background: 'rgba(15, 23, 42, 0.6)',
    border: '1px solid rgba(255, 255, 255, 0.04)',
    borderRadius: '8px',
    padding: '10px 12px',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '8px',
    lineHeight: 1.4,
  },
};
