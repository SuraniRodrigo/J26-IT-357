import React from 'react';

export default function InventoryOptimizationView() {
  const stockDays = [
    { day: 'D1', val: 78, safe: 45 },
    { day: 'D2', val: 74, safe: 45 },
    { day: 'D3', val: 68, safe: 45 },
    { day: 'D4', val: 60, safe: 45 },
    { day: 'D5', val: 52, safe: 45 },
    { day: 'D6', val: 47, safe: 45 },
    { day: 'D7', val: 38, safe: 45, alert: true },
    { day: 'D8', val: 32, safe: 45, alert: true },
    { day: 'D9', val: 85, safe: 45 }, // replenishment arrives
    { day: 'D10', val: 79, safe: 45 },
    { day: 'D11', val: 72, safe: 45 },
    { day: 'D12', val: 65, safe: 45 },
    { day: 'D13', val: 58, safe: 45 },
    { day: 'D14', val: 51, safe: 45 },
  ];

  const reorderPlan = [
    {
      sku: 'ORG-COT-001',
      name: 'Organic Cotton Premium',
      pct: 30,
      curr: '3.4k kg',
      riskLevel: 'CRITICAL',
      riskScore: '0.85',
      riskTone: '#ef4444',
      recom: '15,200 kg',
    },
    {
      sku: 'DYE-IND-008',
      name: 'Indigo Dye Base',
      pct: 15,
      curr: '450 L',
      riskLevel: 'ELEVATED',
      riskScore: '0.68',
      riskTone: '#f97316',
      recom: '3,500 L',
    },
    {
      sku: 'TRM-BTN-015',
      name: 'Alloy Buttons 15mm',
      pct: 60,
      curr: '15k pcs',
      riskLevel: 'MODERATE',
      riskScore: '0.45',
      riskTone: '#f59e0b',
      recom: '5,000 pcs',
    },
    {
      sku: 'SYN-POLY-042',
      name: 'Polyester Thread',
      pct: 85,
      curr: '28.1k kg',
      riskLevel: 'LOW',
      riskScore: '0.12',
      riskTone: '#10b981',
      recom: '2,500 kg',
    },
  ];

  return (
    <div style={styles.container} className="animate-fade-in">
      {/* Top Banner: Module Active: Adaptive Optimization */}
      <div style={styles.heroCard}>
        <div style={styles.heroBadge}>
          <span style={styles.activeDot} />
          MODULE ACTIVE: ADAPTIVE OPTIMIZATION
        </div>
        <h1 style={styles.heroTitle}>Disruption-Aware Inventory Intelligence</h1>
        <p style={styles.heroSubtitle}>
          Dynamically determining reorder quantities and safety stock levels by jointly considering demand uncertainty, supplier reliability, lead-time variability, and predicted supply disruptions to minimize dead stock and stock-out risks.
        </p>

        {/* 4 KPI Grid inside hero */}
        <div style={styles.kpiGrid}>
          <div style={styles.kpiItem}>
            <div style={styles.kpiLabel}>DEAD STOCK REDUCTION</div>
            <div style={styles.kpiValRow}>
              <span style={styles.kpiValue}>24.5%</span>
              <span style={styles.kpiTagGreen}>vs base</span>
            </div>
          </div>

          <div style={styles.kpiItem}>
            <div style={styles.kpiLabel}>STOCK-OUT MITIGATION</div>
            <div style={styles.kpiValRow}>
              <span style={styles.kpiValue}>98.2%</span>
              <span style={styles.kpiTagGreen}>🛡 Safe</span>
            </div>
          </div>

          <div style={styles.kpiItem}>
            <div style={styles.kpiLabel}>LEAD TIME VAR.</div>
            <div style={styles.kpiValRow}>
              <span style={styles.kpiValue}>±2.4d</span>
              <span style={styles.kpiTagAmber}>↑ 0.5d</span>
            </div>
          </div>

          <div style={{ ...styles.kpiItem, borderLeft: '3px solid #ef4444' }}>
            <div style={styles.kpiLabel}>ACTIVE ALERTS</div>
            <div style={styles.kpiValRow}>
              <span style={{ ...styles.kpiValue, color: '#f87171' }}>03</span>
              <span style={styles.kpiTagRed}>critical</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Bar Chart vs Critical Alerts */}
      <div style={styles.middleGrid}>
        {/* Left: Projected Stock vs Safety Threshold */}
        <div style={styles.chartCard}>
          <div style={styles.cardHeader}>
            <div>
              <div style={styles.cardTitle}>Projected Stock vs. Safety Threshold (Next 14 Days)</div>
            </div>
            <div style={styles.legendRow}>
              <div style={styles.legendItem}>
                <span style={{ width: '10px', height: '10px', background: '#3b82f6', borderRadius: '2px' }} />
                <span>Projected Stock</span>
              </div>
              <div style={styles.legendItem}>
                <span style={{ width: '14px', height: '2px', background: '#f59e0b', borderTop: '2px dashed #f59e0b' }} />
                <span>Dynamic Safety</span>
              </div>
            </div>
          </div>

          {/* SVG Bar Chart */}
          <div style={styles.barChartContainer}>
            <svg width="100%" height="240" viewBox="0 0 600 240" preserveAspectRatio="none">
              {/* Dynamic Safety Threshold Line */}
              <line x1="20" y1="120" x2="580" y2="120" stroke="#f59e0b" strokeWidth="2" strokeDasharray="6,4" />
              <text x="525" y="114" fill="#f59e0b" fontSize="10" fontWeight="600">Dynamic Threshold</text>

              {/* Bars */}
              {stockDays.map((d, idx) => {
                const barWidth = 24;
                const spacing = 40;
                const x = 30 + idx * spacing;
                const maxVal = 100;
                const barHeight = (d.val / maxVal) * 180;
                const y = 200 - barHeight;
                const isAlert = d.alert;

                return (
                  <g key={d.day}>
                    <rect
                      x={x}
                      y={y}
                      width={barWidth}
                      height={barHeight}
                      rx="4"
                      fill={isAlert ? '#ef4444' : '#334155'}
                      opacity={isAlert ? 0.9 : 0.8}
                    />
                    <text x={x + barWidth / 2} y="222" fill="#94a3b8" fontSize="10" textAnchor="middle">
                      {d.day}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Right: Critical Alerts */}
        <div style={styles.alertsCard}>
          <div style={styles.cardHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#ef4444' }}>⚠</span>
              <span style={styles.cardTitle}>Critical Alerts</span>
            </div>
            <span style={styles.alertCountBadge}>3 Active</span>
          </div>

          <div style={styles.alertsList}>
            {/* Alert 1 */}
            <div style={styles.alertBox}>
              <div style={styles.alertTop}>
                <span style={styles.alertTagRed}>STOCK-OUT IMMINENT</span>
                <span style={styles.alertTime}>Just now</span>
              </div>
              <p style={styles.alertText}>
                Organic Cotton (<strong>ORG-COT-001</strong>) projected to deplete in <strong>48 hours</strong> based on current production rates and delayed shipment.
              </p>
              <div style={styles.alertAction}>↳ Line A-1 Impacted</div>
            </div>

            {/* Alert 2 */}
            <div style={styles.alertBox}>
              <div style={styles.alertTop}>
                <span style={styles.alertTagAmber}>LEAD TIME VARIANCE</span>
                <span style={styles.alertTime}>2h ago</span>
              </div>
              <p style={styles.alertText}>
                Supplier 'GlobalDyes Inc.' showing increased lead time variability (<strong>+3.2 days</strong>) for Indigo Dye (DYE-IND-008).
              </p>
              <div style={styles.alertAction}>↳ Route: Sea Freight</div>
            </div>

            {/* Alert 3 */}
            <div style={styles.alertBox}>
              <div style={styles.alertTop}>
                <span style={styles.alertTagAmber}>DEMAND SPIKE</span>
                <span style={styles.alertTime}>5h ago</span>
              </div>
              <p style={styles.alertText}>
                Unforecasted 15% increase in demand for SKU 'WIN-JKT-22'. Requires safety stock recalculation.
              </p>
              <div style={styles.alertAction}>↳ Source: Retail API</div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Grid: Reorder Plan Table + Inventory Health */}
      <div style={styles.bottomGrid}>
        {/* Reorder Plan Table */}
        <div style={styles.tableCard}>
          <div style={styles.cardHeader}>
            <div style={styles.cardTitle}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '8px' }}>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
              </svg>
              High-Priority Reorder Plan
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button style={styles.iconButton}>▼</button>
              <button style={styles.iconButton}>⬇</button>
            </div>
          </div>

          <table style={styles.table}>
            <thead>
              <tr style={styles.thRow}>
                <th style={styles.th}>MATERIAL / SKU</th>
                <th style={styles.th}>CURRENT LVL</th>
                <th style={styles.th}>AI RISK LEVEL</th>
                <th style={styles.th}>AI RECOMMENDATION</th>
              </tr>
            </thead>
            <tbody>
              {reorderPlan.map((item) => (
                <tr key={item.sku} style={styles.tr}>
                  <td style={styles.td}>
                    <div style={{ fontWeight: 600, color: '#f1f5f9', fontSize: '13px' }}>{item.sku}</div>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>{item.name}</div>
                  </td>
                  <td style={styles.td}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '11px', color: '#94a3b8', width: '32px' }}>{item.pct}%</span>
                      <div style={styles.progressBarBg}>
                        <div style={{ ...styles.progressBarFill, width: `${item.pct}%`, backgroundColor: item.riskTone }} />
                      </div>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: '#e2e8f0' }}>{item.curr}</span>
                    </div>
                  </td>
                  <td style={styles.td}>
                    <span style={{ ...styles.riskBadge, borderColor: item.riskTone, color: item.riskTone, background: `${item.riskTone}18` }}>
                      {item.riskLevel} ({item.riskScore})
                    </span>
                  </td>
                  <td style={styles.td}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#38bdf8' }}>{item.recom}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Inventory Health Distribution */}
        <div style={styles.healthCard}>
          <div style={styles.cardHeader}>
            <div style={styles.cardTitle}>Inventory Health Distribution</div>
          </div>

          <div style={styles.healthBars}>
            <div style={styles.healthItem}>
              <div style={styles.healthTop}>
                <span>OPTIMAL</span>
                <strong style={{ color: '#10b981' }}>68%</strong>
              </div>
              <div style={styles.healthBarBg}>
                <div style={{ ...styles.healthBarFill, width: '68%', background: '#10b981' }} />
              </div>
            </div>

            <div style={styles.healthItem}>
              <div style={styles.healthTop}>
                <span>REVIEW NEEDED</span>
                <strong style={{ color: '#f59e0b' }}>22%</strong>
              </div>
              <div style={styles.healthBarBg}>
                <div style={{ ...styles.healthBarFill, width: '22%', background: '#f59e0b' }} />
              </div>
            </div>

            <div style={styles.healthItem}>
              <div style={styles.healthTop}>
                <span>CRITICAL LEVEL</span>
                <strong style={{ color: '#ef4444' }}>10%</strong>
              </div>
              <div style={styles.healthBarBg}>
                <div style={{ ...styles.healthBarFill, width: '10%', background: '#ef4444' }} />
              </div>
            </div>
          </div>

          <div style={styles.aiAdvisorBox}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2" style={{ flexShrink: 0 }}>
              <path d="M12 2a10 10 0 1 0 10 10H12V2z"></path>
              <path d="M12 2a10 10 0 0 1 10 10h-10V2z"></path>
              <path d="M12 12L2.1 12a10 10 0 0 0 9.9 9.9V12z"></path>
            </svg>
            <div style={{ fontSize: '11px', color: '#94a3b8', lineHeight: 1.5 }}>
              AI logic actively suppresses dead stock while dynamically buffering for supplier variability.
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
  heroCard: {
    background: 'linear-gradient(180deg, #10192e 0%, #0c1220 100%)',
    border: '1px solid rgba(59, 130, 246, 0.25)',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.4)',
  },
  heroBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    background: 'rgba(59, 130, 246, 0.15)',
    color: '#60a5fa',
    borderRadius: '30px',
    padding: '4px 12px',
    fontSize: '11px',
    fontWeight: 700,
    letterSpacing: '0.08em',
    marginBottom: '12px',
  },
  activeDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    backgroundColor: '#3b82f6',
  },
  heroTitle: {
    fontSize: '24px',
    fontWeight: 700,
    fontFamily: 'Outfit, sans-serif',
    color: '#ffffff',
  },
  heroSubtitle: {
    fontSize: '12px',
    color: '#94a3b8',
    marginTop: '6px',
    maxWidth: '900px',
    lineHeight: 1.6,
  },
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '16px',
    marginTop: '20px',
  },
  kpiItem: {
    background: '#090e1a',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: '10px',
    padding: '14px 16px',
  },
  kpiLabel: {
    fontSize: '10px',
    fontWeight: 700,
    letterSpacing: '0.06em',
    color: '#64748b',
  },
  kpiValRow: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '10px',
    marginTop: '6px',
  },
  kpiValue: {
    fontSize: '24px',
    fontWeight: 800,
    fontFamily: 'Outfit, sans-serif',
    color: '#ffffff',
  },
  kpiTagGreen: {
    fontSize: '10px',
    fontWeight: 600,
    color: '#34d399',
    background: 'rgba(16, 185, 129, 0.12)',
    padding: '2px 6px',
    borderRadius: '4px',
  },
  kpiTagAmber: {
    fontSize: '10px',
    fontWeight: 600,
    color: '#fbbf24',
    background: 'rgba(245, 158, 11, 0.12)',
    padding: '2px 6px',
    borderRadius: '4px',
  },
  kpiTagRed: {
    fontSize: '10px',
    fontWeight: 700,
    color: '#f87171',
    background: 'rgba(239, 68, 68, 0.15)',
    padding: '2px 6px',
    borderRadius: '4px',
    textTransform: 'uppercase',
  },
  middleGrid: {
    display: 'grid',
    gridTemplateColumns: '1.6fr 1fr',
    gap: '20px',
  },
  chartCard: {
    background: '#0d1322',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '16px',
    padding: '20px',
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
  barChartContainer: {
    width: '100%',
    marginTop: '10px',
  },
  alertsCard: {
    background: '#0d1322',
    border: '1px solid rgba(239, 68, 68, 0.25)',
    borderRadius: '16px',
    padding: '20px',
  },
  alertCountBadge: {
    background: 'rgba(239, 68, 68, 0.15)',
    color: '#f87171',
    borderRadius: '6px',
    padding: '2px 8px',
    fontSize: '11px',
    fontWeight: 700,
  },
  alertsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  alertBox: {
    background: '#090e1a',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    borderRadius: '10px',
    padding: '12px 14px',
  },
  alertTop: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '6px',
  },
  alertTagRed: {
    fontSize: '10px',
    fontWeight: 700,
    color: '#ef4444',
    letterSpacing: '0.06em',
  },
  alertTagAmber: {
    fontSize: '10px',
    fontWeight: 700,
    color: '#f59e0b',
    letterSpacing: '0.06em',
  },
  alertTime: {
    fontSize: '10px',
    color: '#64748b',
  },
  alertText: {
    fontSize: '11px',
    color: '#cbd5e1',
    lineHeight: 1.5,
  },
  alertAction: {
    fontSize: '10px',
    color: '#38bdf8',
    marginTop: '6px',
    fontWeight: 500,
  },
  bottomGrid: {
    display: 'grid',
    gridTemplateColumns: '1.8fr 1fr',
    gap: '20px',
  },
  tableCard: {
    background: '#0d1322',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '16px',
    padding: '20px',
  },
  iconButton: {
    background: '#1e293b',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '6px',
    color: '#cbd5e1',
    padding: '4px 8px',
    fontSize: '11px',
    cursor: 'pointer',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: '8px',
  },
  thRow: {
    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
  },
  th: {
    textAlign: 'left',
    fontSize: '10px',
    fontWeight: 700,
    letterSpacing: '0.06em',
    color: '#64748b',
    padding: '10px 8px',
  },
  tr: {
    borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
  },
  td: {
    padding: '12px 8px',
    verticalAlign: 'middle',
  },
  progressBarBg: {
    width: '70px',
    height: '6px',
    background: '#1e293b',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: '4px',
  },
  riskBadge: {
    display: 'inline-block',
    border: '1px solid',
    borderRadius: '4px',
    padding: '2px 8px',
    fontSize: '10px',
    fontWeight: 700,
  },
  healthCard: {
    background: '#0d1322',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '16px',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  healthBars: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    margin: '12px 0',
  },
  healthItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  healthTop: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '11px',
    fontWeight: 600,
    color: '#cbd5e1',
  },
  healthBarBg: {
    height: '7px',
    background: '#1e293b',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  healthBarFill: {
    height: '100%',
    borderRadius: '4px',
  },
  aiAdvisorBox: {
    background: '#090e1a',
    border: '1px solid rgba(56, 189, 248, 0.15)',
    borderRadius: '10px',
    padding: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginTop: '10px',
  },
};
