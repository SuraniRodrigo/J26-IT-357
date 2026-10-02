import React, { useState } from 'react';

export default function DemandForecastingView() {
  const [skuSearch, setSkuSearch] = useState('');
  const [isRecalculating, setIsRecalculating] = useState(false);

  const skuData = [
    {
      sku: 'AW-CORE-TCH-01',
      name: 'Technical Outerwear Shell',
      season: 'Q3-Q4 \'25',
      colorName: 'Industrial Slate',
      colorDot: '#64748b',
      vol: '145,000',
      yoy: '+28.4%',
      yoyUp: true,
      status: 'High Confidence',
      statusColor: '#10b981',
    },
    {
      sku: 'LW-ESS-KN-04',
      name: 'Essential Lounge Knit',
      season: 'All Seasons',
      colorName: 'Bio-Sage',
      colorDot: '#10b981',
      vol: '89,100',
      yoy: '-2.1%',
      yoyUp: false,
      status: 'Stable',
      statusColor: '#60a5fa',
    },
    {
      sku: 'AC-PERF-LG-02',
      name: 'Performance Legging',
      season: 'Q1-Q2 \'26',
      colorName: 'Solar Amber',
      colorDot: '#f59e0b',
      vol: '210,000',
      yoy: '+31.5%',
      yoyUp: true,
      status: 'Trending',
      statusColor: '#f59e0b',
    },
    {
      sku: 'AC-BASE-LY-01',
      name: 'Thermal Base Layer',
      season: 'Q4 \'25',
      colorName: 'Obsidian Core',
      colorDot: '#475569',
      vol: '65,000',
      yoy: '-0.8%',
      yoyUp: false,
      status: 'Stable',
      statusColor: '#60a5fa',
    },
  ];

  const filteredSkus = skuData.filter(
    (item) =>
      item.sku.toLowerCase().includes(skuSearch.toLowerCase()) ||
      item.name.toLowerCase().includes(skuSearch.toLowerCase())
  );

  const handleRecalculate = () => {
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
          <div style={styles.eyebrow}>
            <span style={{ color: '#38bdf8' }}>↗</span> OPTICHAIN AI ENGINE
          </div>
          <h1 style={styles.pageTitle}>Demand Forecasting</h1>
          <p style={styles.pageSubtitle}>
            Predictive modeling for upcoming seasons, leveraging global market signals and historical purchasing patterns.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button style={styles.secondaryBtn}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            Export Report
          </button>
          <button
            onClick={handleRecalculate}
            style={styles.primaryBtn}
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
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"></path>
            </svg>
            {isRecalculating ? 'Recalculating...' : 'Run Recalculation'}
          </button>
        </div>
      </div>

      {/* 4 Top KPI Cards */}
      <div style={styles.kpiGrid}>
        {/* KPI 1 */}
        <div style={styles.kpiCard}>
          <div style={styles.kpiLabel}>OVERALL FORECAST ACCURACY</div>
          <div style={styles.kpiMainRow}>
            <span style={styles.kpiVal}>94.8%</span>
            <span style={styles.greenBadge}>↑ +3.2%</span>
          </div>
          <div style={styles.kpiSub}>Based on back-tested seasonal runs</div>
        </div>

        {/* KPI 2 */}
        <div style={styles.kpiCard}>
          <div style={styles.kpiLabel}>PROJECTED VOL (Q3-Q4)</div>
          <div style={styles.kpiMainRow}>
            <span style={styles.kpiVal}>2.4M</span>
            <span style={styles.unitLabel}>Units</span>
          </div>
          <div style={styles.kpiSub}>Peak expected Week 38</div>
        </div>

        {/* KPI 3 */}
        <div style={styles.kpiCard}>
          <div style={styles.kpiLabel}>VOLATILITY INDEX</div>
          <div style={styles.kpiMainRow}>
            <span style={{ ...styles.kpiVal, color: '#f59e0b' }}>Medium</span>
          </div>
          <div style={styles.kpiSub}>Driven by raw material fluctuations</div>
        </div>

        {/* KPI 4 */}
        <div style={styles.kpiCard}>
          <div style={styles.kpiLabel}>AI CONFIDENCE SCORE</div>
          <div style={styles.kpiMainRow}>
            <span style={styles.kpiVal}>High</span>
            <span style={styles.unitLabel}>0.89 / 1.0</span>
          </div>
          <div style={styles.kpiSub}>Based on 4.2B data points</div>
        </div>
      </div>

      {/* Middle Grid: Category Demand Trajectory vs Hierarchical Anomalies */}
      <div style={styles.trajectoryGrid}>
        {/* Left: Category Demand Trajectory */}
        <div style={styles.trajectoryCard}>
          <div style={styles.cardHeader}>
            <div>
              <div style={styles.cardTitle}>Category Demand Trajectory</div>
              <div style={styles.cardSubtitle}>Projected vs Historical Volume (Indexed)</div>
            </div>
            <div style={styles.timePills}>
              <span style={styles.timePill}>30D</span>
              <span style={styles.timePill}>90D</span>
              <span style={{ ...styles.timePill, background: '#1e293b', color: '#f1f5f9' }}>365D</span>
            </div>
          </div>

          {/* SVG Multi-Line Chart */}
          <div style={styles.chartViewport}>
            <svg width="100%" height="220" viewBox="0 0 600 220" preserveAspectRatio="none">
              <defs>
                <linearGradient id="activeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              <line x1="40" y1="40" x2="580" y2="40" stroke="rgba(255,255,255,0.05)" strokeDasharray="4" />
              <line x1="40" y1="90" x2="580" y2="90" stroke="rgba(255,255,255,0.05)" strokeDasharray="4" />
              <line x1="40" y1="140" x2="580" y2="140" stroke="rgba(255,255,255,0.05)" strokeDasharray="4" />
              <line x1="40" y1="180" x2="580" y2="180" stroke="rgba(255,255,255,0.08)" />

              {/* Curve 1: Activewear (High Growth Cyan) */}
              <path
                d="M40 160 C 140 150, 240 120, 340 70 S 480 30, 580 20 L 580 180 L 40 180 Z"
                fill="url(#activeGrad)"
              />
              <path
                d="M40 160 C 140 150, 240 120, 340 70 S 480 30, 580 20"
                fill="none"
                stroke="#38bdf8"
                strokeWidth="3"
              />

              {/* Curve 2: Loungewear (Amber Moderate) */}
              <path
                d="M40 170 C 140 165, 260 155, 360 140 S 480 110, 580 100"
                fill="none"
                stroke="#f59e0b"
                strokeWidth="2.2"
                strokeDasharray="5,3"
              />

              {/* Curve 3: Tech-Outerwear (Green Stable) */}
              <path
                d="M40 175 C 160 172, 280 165, 380 155 S 490 145, 580 135"
                fill="none"
                stroke="#10b981"
                strokeWidth="2"
              />

              {/* X Axis Labels */}
              <text x="60" y="200" fill="#64748b" fontSize="10">Q1 '25</text>
              <text x="210" y="200" fill="#64748b" fontSize="10">Q3 '25</text>
              <text x="360" y="200" fill="#64748b" fontSize="10">Q1 '26</text>
              <text x="520" y="200" fill="#64748b" fontSize="10">Q3 '26 (Pred)</text>
            </svg>
          </div>

          {/* Chart Legend */}
          <div style={styles.trajectoryLegend}>
            <div style={styles.legendPill}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#38bdf8' }} />
              <span>Activewear</span>
              <strong style={{ color: '#38bdf8', marginLeft: '4px' }}>+34%</strong>
            </div>
            <div style={styles.legendPill}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b' }} />
              <span>Loungewear</span>
              <strong style={{ color: '#f59e0b', marginLeft: '4px' }}>+18%</strong>
            </div>
            <div style={styles.legendPill}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
              <span>Tech-Outerwear</span>
              <strong style={{ color: '#10b981', marginLeft: '4px' }}>+12%</strong>
            </div>
          </div>
        </div>

        {/* Right: Hierarchical Anomalies */}
        <div style={styles.anomaliesCard}>
          <div style={styles.cardHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: '#ef4444' }}>❖</span>
              <span style={styles.cardTitle}>Hierarchical Anomalies</span>
            </div>
            <span style={styles.priorityBadge}>HIGH PRIORITY</span>
          </div>

          <div style={styles.anomalyList}>
            {/* Anomaly 1 */}
            <div style={styles.anomalyItem}>
              <div style={styles.anomalyTop}>
                <span style={styles.anomalyHeading}>Style-Color Divergence</span>
                <span style={styles.iconSmall}>📈</span>
              </div>
              <div style={styles.anomalyDesc}>
                Solar Amber demand up <strong>24%</strong> in Activewear specifically for Q3 '25. Adjust cross-category distribution.
              </div>
            </div>

            {/* Anomaly 2 */}
            <div style={styles.anomalyItem}>
              <div style={styles.anomalyTop}>
                <span style={styles.anomalyHeading}>Regional Volatility Alert</span>
                <span style={styles.iconSmall}>⚡</span>
              </div>
              <div style={styles.anomalyDesc}>
                Loungewear showing high variance due to early buyer behavioral shifts in regional export markets.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sentiment & Color Intelligence Grid */}
      <div style={styles.intelGrid}>
        {/* Global Sentiment Analysis */}
        <div style={styles.intelCard}>
          <div style={styles.cardTitle}>Global Sentiment Analysis</div>
          <div style={styles.cardSubtitle}>Real-time market perception across key regions.</div>

          <div style={styles.sentimentCircleRow}>
            {/* Circular Gauge */}
            <div style={styles.circleContainer}>
              <svg width="84" height="84" viewBox="0 0 84 84">
                <circle cx="42" cy="42" r="34" stroke="#1e293b" strokeWidth="7" fill="none" />
                <circle
                  cx="42"
                  cy="42"
                  r="34"
                  stroke="#10b981"
                  strokeWidth="7"
                  strokeDasharray="213"
                  strokeDashoffset="46"
                  strokeLinecap="round"
                  fill="none"
                />
              </svg>
              <div style={styles.circleText}>78%</div>
            </div>
            <div>
              <div style={{ fontWeight: 600, color: '#f1f5f9', fontSize: '13px' }}>Positive Sentiment</div>
              <div style={{ fontSize: '11px', color: '#64748b' }}>Aggregated from 12M+ social signals</div>
            </div>
          </div>

          <div style={styles.tagWrap}>
            <span style={styles.driverTag}>#Sustainable Tech</span>
            <span style={styles.driverTag}>#Modular Utility</span>
            <span style={styles.driverTag}>#Monochromatic</span>
            <span style={styles.driverTag}>#Circular Fabrics</span>
          </div>

          <div style={styles.regionalSection}>
            <div style={styles.subLabel}>REGIONAL DISTRIBUTION</div>
            <div style={styles.regRow}><span>North America</span> <strong>42% ↗</strong></div>
            <div style={styles.regRow}><span>EU Cluster</span> <strong>35% →</strong></div>
            <div style={styles.regRow}><span>Asia Pacific</span> <strong>23% ↘</strong></div>
          </div>
        </div>

        {/* Color Intelligence '26 */}
        <div style={styles.intelCard}>
          <div style={styles.cardTitle}>Color Intelligence '26</div>
          <div style={styles.cardSubtitle}>AI-predicted dominant hues based on social sentiment & runway analysis.</div>

          <div style={styles.colorCardsList}>
            {/* Color 1 */}
            <div style={styles.colorItem}>
              <div style={{ ...styles.swatch, background: 'linear-gradient(135deg, #d97706 0%, #78350f 100%)' }} />
              <div style={{ flex: 1 }}>
                <div style={styles.swatchSeason}>SS26 / CORE TREND</div>
                <div style={styles.swatchName}>Solar Amber</div>
              </div>
              <div style={styles.swatchIndex}>Idx: 142</div>
            </div>

            {/* Color 2 */}
            <div style={styles.colorItem}>
              <div style={{ ...styles.swatch, background: 'linear-gradient(135deg, #475569 0%, #1e293b 100%)' }} />
              <div style={{ flex: 1 }}>
                <div style={styles.swatchSeason}>SS26 / NEUTRAL</div>
                <div style={styles.swatchName}>Industrial Slate</div>
              </div>
              <div style={styles.swatchIndex}>Idx: 130</div>
            </div>

            {/* Color 3 */}
            <div style={styles.colorItem}>
              <div style={{ ...styles.swatch, background: 'linear-gradient(135deg, #059669 0%, #064e3b 100%)' }} />
              <div style={{ flex: 1 }}>
                <div style={styles.swatchSeason}>SS26 / EARTH</div>
                <div style={styles.swatchName}>Bio-Sage</div>
              </div>
              <div style={styles.swatchIndex}>Idx: 95</div>
            </div>
          </div>
        </div>

        {/* Trend Sentiment Analysis */}
        <div style={styles.intelCard}>
          <div style={styles.cardHeader}>
            <div style={styles.cardTitle}>Trend Sentiment Analysis</div>
            <span style={styles.posScaleBadge}>POSITIVE SCALE</span>
          </div>
          <div style={styles.cardSubtitle}>Intersection of market signals for predicted palettes.</div>

          <div style={styles.aiInsightBox}>
            <span style={{ color: '#38bdf8' }}>✦</span>
            <span>
              A breakthrough high convergence between social buzz and runway presence indicates strong market readiness for current palettes. Recommend immediate production scaling.
            </span>
          </div>

          <div style={{ marginTop: '14px' }}>
            <div style={styles.presenceRow}>
              <span>Social Sentiment:</span>
              <strong style={{ color: '#10b981' }}>Accelerating Traction (+22%)</strong>
            </div>
            <div style={styles.presenceRow}>
              <span>Runway Presence:</span>
              <strong style={{ color: '#f59e0b' }}>Global Peak Exposure</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Predicted Order Volumes Table */}
      <div style={styles.tableCard}>
        <div style={styles.cardHeader}>
          <div>
            <div style={styles.cardTitle}>Predicted Order Volumes</div>
            <div style={styles.cardSubtitle}>Detailed SKU-level forecast for upcoming production cycles.</div>
          </div>
          <div style={styles.searchMini}>
            <input
              type="text"
              placeholder="Filter SKUs..."
              value={skuSearch}
              onChange={(e) => setSkuSearch(e.target.value)}
              style={styles.searchInputMini}
            />
          </div>
        </div>

        <table style={styles.table}>
          <thead>
            <tr style={styles.thRow}>
              <th style={styles.th}>SKU / PRODUCT DETAILS</th>
              <th style={styles.th}>PRIMARY SEASON</th>
              <th style={styles.th}>DOMINANT COLOR</th>
              <th style={styles.th}>PROJECTED VOL</th>
              <th style={styles.th}>YOY VARIANCE</th>
              <th style={styles.th}>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {filteredSkus.map((item) => (
              <tr key={item.sku} style={styles.tr}>
                <td style={styles.td}>
                  <div style={{ fontWeight: 600, color: '#f1f5f9', fontSize: '13px' }}>{item.sku}</div>
                  <div style={{ fontSize: '11px', color: '#94a3b8' }}>{item.name}</div>
                </td>
                <td style={styles.td}>
                  <span style={{ fontSize: '12px', color: '#cbd5e1' }}>{item.season}</span>
                </td>
                <td style={styles.td}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: item.colorDot }} />
                    <span style={{ fontSize: '12px', color: '#cbd5e1' }}>{item.colorName}</span>
                  </div>
                </td>
                <td style={styles.td}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff' }}>{item.vol}</span>
                </td>
                <td style={styles.td}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: item.yoyUp ? '#10b981' : '#f87171' }}>
                    {item.yoy}
                  </span>
                </td>
                <td style={styles.td}>
                  <span style={{ ...styles.statusPill, borderColor: item.statusColor, color: item.statusColor }}>
                    {item.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
  eyebrow: {
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
    maxWidth: '750px',
  },
  secondaryBtn: {
    background: '#1e293b',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '8px',
    color: '#e2e8f0',
    padding: '9px 16px',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
  },
  primaryBtn: {
    background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
    border: 'none',
    borderRadius: '8px',
    color: '#ffffff',
    padding: '9px 18px',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)',
  },
  kpiGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '16px',
  },
  kpiCard: {
    background: '#0d1322',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '14px',
    padding: '18px 20px',
  },
  kpiLabel: {
    fontSize: '10px',
    fontWeight: 700,
    letterSpacing: '0.06em',
    color: '#64748b',
  },
  kpiMainRow: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '8px',
    margin: '8px 0 4px',
  },
  kpiVal: {
    fontSize: '26px',
    fontWeight: 800,
    fontFamily: 'Outfit, sans-serif',
    color: '#ffffff',
  },
  unitLabel: {
    fontSize: '12px',
    color: '#94a3b8',
  },
  greenBadge: {
    fontSize: '10px',
    fontWeight: 600,
    color: '#34d399',
    background: 'rgba(16, 185, 129, 0.12)',
    padding: '2px 6px',
    borderRadius: '4px',
  },
  kpiSub: {
    fontSize: '11px',
    color: '#64748b',
  },
  trajectoryGrid: {
    display: 'grid',
    gridTemplateColumns: '1.6fr 1fr',
    gap: '20px',
  },
  trajectoryCard: {
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
  },
  cardSubtitle: {
    fontSize: '12px',
    color: '#94a3b8',
    marginTop: '2px',
  },
  timePills: {
    display: 'flex',
    gap: '4px',
    background: '#0a0e17',
    padding: '3px',
    borderRadius: '6px',
  },
  timePill: {
    padding: '3px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 600,
    color: '#64748b',
    cursor: 'pointer',
  },
  chartViewport: {
    width: '100%',
    marginTop: '8px',
  },
  trajectoryLegend: {
    display: 'flex',
    gap: '16px',
    marginTop: '12px',
    paddingTop: '12px',
    borderTop: '1px solid rgba(255, 255, 255, 0.04)',
  },
  legendPill: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '11px',
    color: '#94a3b8',
    background: 'rgba(15, 22, 38, 0.6)',
    padding: '4px 10px',
    borderRadius: '20px',
  },
  anomaliesCard: {
    background: '#0d1322',
    border: '1px solid rgba(239, 68, 68, 0.2)',
    borderRadius: '16px',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
  },
  priorityBadge: {
    background: 'rgba(239, 68, 68, 0.15)',
    color: '#f87171',
    borderRadius: '6px',
    padding: '2px 8px',
    fontSize: '10px',
    fontWeight: 700,
  },
  anomalyList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    marginTop: '6px',
  },
  anomalyItem: {
    background: '#090e1a',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    borderRadius: '10px',
    padding: '14px',
  },
  anomalyTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '6px',
  },
  anomalyHeading: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#f1f5f9',
  },
  iconSmall: {
    fontSize: '13px',
  },
  anomalyDesc: {
    fontSize: '11px',
    color: '#94a3b8',
    lineHeight: 1.5,
  },
  intelGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '20px',
  },
  intelCard: {
    background: '#0d1322',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '16px',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
  },
  sentimentCircleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    margin: '16px 0',
  },
  circleContainer: {
    position: 'relative',
    width: '84px',
    height: '84px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleText: {
    position: 'absolute',
    fontSize: '16px',
    fontWeight: 700,
    fontFamily: 'Outfit, sans-serif',
    color: '#ffffff',
  },
  tagWrap: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
    marginBottom: '16px',
  },
  driverTag: {
    background: '#1e293b',
    color: '#94a3b8',
    borderRadius: '4px',
    padding: '3px 8px',
    fontSize: '10px',
    fontWeight: 500,
  },
  regionalSection: {
    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
    paddingTop: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  subLabel: {
    fontSize: '9px',
    fontWeight: 700,
    letterSpacing: '0.08em',
    color: '#64748b',
    marginBottom: '4px',
  },
  regRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '11px',
    color: '#cbd5e1',
  },
  colorCardsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginTop: '16px',
  },
  colorItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    background: '#090e1a',
    borderRadius: '8px',
    padding: '10px 12px',
    border: '1px solid rgba(255, 255, 255, 0.04)',
  },
  swatch: {
    width: '36px',
    height: '36px',
    borderRadius: '6px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.4)',
  },
  swatchSeason: {
    fontSize: '9px',
    fontWeight: 700,
    letterSpacing: '0.06em',
    color: '#94a3b8',
  },
  swatchName: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#f1f5f9',
  },
  swatchIndex: {
    fontSize: '10px',
    fontFamily: 'monospace',
    color: '#38bdf8',
  },
  posScaleBadge: {
    background: 'rgba(16, 185, 129, 0.15)',
    color: '#34d399',
    borderRadius: '4px',
    padding: '2px 8px',
    fontSize: '9px',
    fontWeight: 700,
  },
  aiInsightBox: {
    background: '#090e1a',
    border: '1px solid rgba(56, 189, 248, 0.15)',
    borderRadius: '8px',
    padding: '12px',
    fontSize: '11px',
    color: '#cbd5e1',
    lineHeight: 1.5,
    marginTop: '12px',
    display: 'flex',
    gap: '8px',
  },
  presenceRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '11px',
    color: '#94a3b8',
    marginBottom: '6px',
  },
  tableCard: {
    background: '#0d1322',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '16px',
    padding: '20px',
  },
  searchMini: {
    width: '220px',
  },
  searchInputMini: {
    background: '#0a0e17',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '6px',
    padding: '6px 12px',
    color: '#ffffff',
    fontSize: '12px',
    width: '100%',
    outline: 'none',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: '10px',
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
  statusPill: {
    border: '1px solid',
    borderRadius: '4px',
    padding: '2px 8px',
    fontSize: '10px',
    fontWeight: 700,
  },
};
