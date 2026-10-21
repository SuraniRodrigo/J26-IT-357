import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { downloadSupplyRiskReport, getWeatherRouteRisk, predictSupplyRisk } from '../../services/supplyService';

export default function SupplyDisruptionView() {
  const [filterMode, setFilterMode] = useState('all'); // 'all' or 'highRisk'
  const [selectedNode, setSelectedNode] = useState(null);
  const [predictionInput, setPredictionInput] = useState({
    product_name: 'Organic Cotton Denim Fabric',
    category_name: 'Knitted Fabric',
    supplier_name: 'TexLanka Mills',
    year: '2026',
    month: '5',
    expected_delay_days: '0',
    shipping_mode: 'Standard Class',
    order_region: 'Western Europe',
  });
  const [prediction, setPrediction] = useState(null);
  const [isPredicting, setIsPredicting] = useState(false);
  const [predictionError, setPredictionError] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState('');
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState('pdf');
  const [weatherRisk, setWeatherRisk] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [weatherError, setWeatherError] = useState('');

  useEffect(() => {
    async function fetchWeather() {
      setWeatherLoading(true);
      setWeatherError('');
      try {
        const data = await getWeatherRouteRisk();
        setWeatherRisk(data);
      } catch (err) {
        setWeatherError('Unable to load weather telemetry. Backend may be offline.');
      } finally {
        setWeatherLoading(false);
      }
    }
    fetchWeather();
    const interval = setInterval(fetchWeather, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    document.body.style.overflow = isExportModalOpen ? 'hidden' : 'unset';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isExportModalOpen]);

  function handleExportReport() {
    setIsExportModalOpen(true);
  }

  async function handleModalDownload() {
    setIsExportModalOpen(false);
    setIsExporting(true);
    setExportStatus('');
    try {
      await downloadSupplyRiskReport(exportFormat);
      setExportStatus(`${exportFormat.toUpperCase()} report downloaded successfully`);
      setTimeout(() => setExportStatus(''), 4000);
    } catch (error) {
      setExportStatus(
        error instanceof Error ? `Export failed: ${error.message}` : 'Export failed'
      );
    } finally {
      setIsExporting(false);
    }
  }

  async function handlePredictionSubmit(event) {
    event.preventDefault();
    setIsPredicting(true);
    setPredictionError('');

    try {
      const result = await predictSupplyRisk({
        product_name: predictionInput.product_name,
        category_name: predictionInput.category_name,
        supplier_name: predictionInput.supplier_name,
        year: parseInt(predictionInput.year, 10) || 2026,
        month: parseInt(predictionInput.month, 10) || 5,
        scheduled_shipping_days: 4,
        expected_delay_days: parseInt(predictionInput.expected_delay_days, 10) || 0,
        shipping_mode: predictionInput.shipping_mode,
        order_region: predictionInput.order_region,
      });
      setPrediction(result);
    } catch (error) {
      setPrediction(null);
      setPredictionError(
        error instanceof Error
          ? `Prediction unavailable: ${error.message}`
          : 'Prediction unavailable. Check the backend connection and try again.',
      );
    } finally {
      setIsPredicting(false);
    }
  }

  function updatePredictionInput(event) {
    const { name, value } = event.target;
    setPredictionInput((current) => ({ ...current, [name]: value }));
    setPrediction(null);
    setPredictionError('');
  }

  function applyPreset(preset) {
    setPredictionInput(preset);
    setPrediction(null);
    setPredictionError('');
  }

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
        <div style={{
          ...styles.activeAlertsBadge,
          ...(prediction && !prediction.early_warning_alert ? styles.clearAlertsBadge : {}),
        }}>
          <span
            style={{
              ...styles.redDot,
              ...(prediction && !prediction.early_warning_alert ? styles.greenDot : {}),
            }}
            className={prediction?.early_warning_alert ? 'pulse-dot-red' : ''}
          />
          <span>
            {prediction
              ? prediction.early_warning_alert ? 'EARLY WARNING ACTIVE' : 'NO EARLY WARNING'
              : 'AWAITING PREDICTION'}
          </span>
        </div>
      </div>

      <section style={styles.predictionPanel} aria-busy={isPredicting}>
        <div style={styles.predictionPanelHeader}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '18px' }}>🎯</span>
              <h2 style={styles.predictionTitle}>Product-Wise &amp; Period-Wise Shipment Risk Predictor</h2>
            </div>
            <p style={styles.predictionSubtitle}>
              Continuous evaluation of supplier reliability, transit variances, and seasonal weather disruptions.
            </p>
          </div>
          {prediction && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {prediction.seasonal_risk_applied && (
                <span style={styles.monsoonBadge}>
                  🌧️ Monsoon Multiplier Active
                </span>
              )}
              <span style={{ ...styles.riskBadge, ...styles[`risk${prediction.risk_level}`] }}>
                {prediction.risk_level.toUpperCase()} RISK
              </span>
            </div>
          )}
        </div>

        {/* Quick Presets for Demo */}
        <div style={styles.presetsBar}>
          <span style={styles.presetsLabel}>QUICK SCENARIOS:</span>
          <button
            type="button"
            onClick={() => applyPreset({
              product_name: 'Organic Cotton Denim Fabric',
              category_name: 'Knitted Fabric',
              supplier_name: 'TexLanka Mills',
              year: '2026',
              month: '2',
              expected_delay_days: '0',
              shipping_mode: 'Standard Class',
              order_region: 'Western Europe',
            })}
            style={styles.presetChip}
          >
            🌱 On-Time Denim (Feb / Low Risk)
          </button>
          <button
            type="button"
            onClick={() => applyPreset({
              product_name: 'Organic Cotton Denim Fabric',
              category_name: 'Knitted Fabric',
              supplier_name: 'TexLanka Mills',
              year: '2026',
              month: '5',
              expected_delay_days: '3',
              shipping_mode: 'Standard Class',
              order_region: 'Western Europe',
            })}
            style={styles.presetChip}
          >
            🌧️ Monsoon Delay (May / 3d Delay)
          </button>
          <button
            type="button"
            onClick={() => applyPreset({
              product_name: 'Blended Knit Fabric',
              category_name: 'Woven Fabric',
              supplier_name: 'South Asia Textiles',
              year: '2026',
              month: '11',
              expected_delay_days: '6',
              shipping_mode: 'Second Class',
              order_region: 'South Asia',
            })}
            style={styles.presetChip}
          >
            ⚠️ High-Risk Peak (Nov / 6d Delay)
          </button>
        </div>

        <form onSubmit={handlePredictionSubmit} style={styles.predictionFormContainer}>
          {/* Row 1: Product Name, Category Name, Supplier Name, Year */}
          <div style={styles.formRow1}>
            <label style={styles.fieldLabel}>
              <span>Product Name <span style={styles.requiredStar}>*</span></span>
              <select
                name="product_name"
                required
                disabled={isPredicting}
                value={predictionInput.product_name}
                onChange={updatePredictionInput}
                style={styles.fieldSelect}
              >
                <option value="Organic Cotton Denim Fabric">Organic Cotton Denim Fabric</option>
                <option value="Recycled Polyester Yarn">Recycled Polyester Yarn</option>
                <option value="Blended Knit Fabric">Blended Knit Fabric</option>
                <option value="Heavyweight Canvas">Heavyweight Canvas</option>
              </select>
            </label>

            <label style={styles.fieldLabel}>
              <span>Category Name <span style={styles.requiredStar}>*</span></span>
              <select
                name="category_name"
                required
                disabled={isPredicting}
                value={predictionInput.category_name}
                onChange={updatePredictionInput}
                style={styles.fieldSelect}
              >
                <option value="Knitted Fabric">Knitted Fabric</option>
                <option value="Woven Fabric">Woven Fabric</option>
                <option value="Trims & Accessories">Trims &amp; Accessories</option>
                <option value="Yarn & Fibers">Yarn &amp; Fibers</option>
              </select>
            </label>

            <label style={styles.fieldLabel}>
              <span>Supplier Name <span style={styles.requiredStar}>*</span></span>
              <select
                name="supplier_name"
                required
                disabled={isPredicting}
                value={predictionInput.supplier_name}
                onChange={updatePredictionInput}
                style={styles.fieldSelect}
              >
                <option value="TexLanka Mills">TexLanka Mills</option>
                <option value="Pacific Denim Co">Pacific Denim Co</option>
                <option value="South Asia Textiles">South Asia Textiles</option>
                <option value="Global Trims Ltd">Global Trims Ltd</option>
              </select>
            </label>

            <label style={styles.fieldLabel}>
              <span>Year <span style={styles.requiredStar}>*</span></span>
              <input
                name="year"
                type="number"
                min="2020"
                max="2035"
                required
                disabled={isPredicting}
                value={predictionInput.year}
                onChange={updatePredictionInput}
                placeholder="2026"
                style={styles.fieldInput}
              />
            </label>
          </div>

          {/* Row 2: Est. Delivery Month, Shipping Mode, Order Region, Expected Delay */}
          <div style={styles.formRow2}>
            <label style={styles.fieldLabel}>
              <span>Est. Delivery Month <span style={styles.requiredStar}>*</span></span>
              <select
                name="month"
                required
                disabled={isPredicting}
                value={predictionInput.month}
                onChange={updatePredictionInput}
                style={styles.fieldSelect}
              >
                <option value="1">01 - January</option>
                <option value="2">02 - February</option>
                <option value="3">03 - March</option>
                <option value="4">04 - April</option>
                <option value="5">05 - May (Monsoon Peak 🌧️)</option>
                <option value="6">06 - June (Monsoon Season 🌧️)</option>
                <option value="7">07 - July</option>
                <option value="8">08 - August</option>
                <option value="9">09 - September</option>
                <option value="10">10 - October (Monsoon Season 🌧️)</option>
                <option value="11">11 - November (Monsoon Peak 🌧️)</option>
                <option value="12">12 - December</option>
              </select>
            </label>

            <label style={styles.fieldLabel}>
              <span>Shipping Mode <span style={styles.requiredStar}>*</span></span>
              <select
                name="shipping_mode"
                required
                disabled={isPredicting}
                value={predictionInput.shipping_mode}
                onChange={updatePredictionInput}
                style={styles.fieldSelect}
              >
                <option value="Standard Class">Standard Class</option>
                <option value="Second Class">Second Class</option>
                <option value="First Class">First Class</option>
                <option value="Same Day">Same Day</option>
              </select>
            </label>

            <label style={styles.fieldLabel}>
              <span>Order Region <span style={styles.requiredStar}>*</span></span>
              <select
                name="order_region"
                required
                disabled={isPredicting}
                value={predictionInput.order_region}
                onChange={updatePredictionInput}
                style={styles.fieldSelect}
              >
                <option value="Western Europe">Western Europe</option>
                <option value="South Asia">South Asia</option>
                <option value="Southeast Asia">Southeast Asia</option>
                <option value="Eastern Asia">Eastern Asia</option>
                <option value="Central America">Central America</option>
                <option value="South America">South America</option>
                <option value="North Africa">North Africa</option>
                <option value="East of USA">East of USA</option>
                <option value="US Center ">US Center</option>
                <option value="West of USA ">West of USA</option>
                <option value="Southern Europe">Southern Europe</option>
                <option value="Northern Europe">Northern Europe</option>
                <option value="Eastern Europe">Eastern Europe</option>
              </select>
            </label>

            <label style={styles.fieldLabel}>
              <span>Expected Delay (Days) <span style={styles.requiredStar}>*</span></span>
              <input
                name="expected_delay_days"
                type="number"
                min="0"
                max="30"
                step="1"
                required
                disabled={isPredicting}
                value={predictionInput.expected_delay_days}
                onChange={updatePredictionInput}
                placeholder="0 = on-time"
                style={styles.fieldInput}
              />
            </label>
          </div>

          <div style={styles.formActionsRow}>
            <span style={styles.formHint}>
              Scheduled: 4 days · Real transit = {4 + Number(predictionInput.expected_delay_days || 0)} days
              {Number(predictionInput.expected_delay_days) > 0 ? ` (+${predictionInput.expected_delay_days}d delay penalty)` : ' (On-schedule)'}
              {[5, 6, 10, 11].includes(Number(predictionInput.month)) ? ' · 🌧️ Monsoon multiplier active' : ''}
            </span>
            <button type="submit" style={styles.predictButton} disabled={isPredicting}>
              {isPredicting ? (
                <>
                  <span style={styles.spinnerIcon} /> Scoring Shipment Risk…
                </>
              ) : (
                <>⚡ Evaluate Product &amp; Period Risk</>
              )}
            </button>
          </div>
        </form>

        {predictionError && (
          <div role="alert" style={styles.predictionError}>
            {predictionError}
          </div>
        )}

        {/* Prediction Results Banner & Key Metrics */}
        {prediction && (
          <div style={styles.resultsContainer} aria-live="polite">
            {/* Identity Banner */}
            <div style={{
              ...styles.predictionSummaryBanner,
              borderLeftColor: prediction.risk_level === 'high' ? '#ef4444' : prediction.risk_level === 'medium' ? '#f59e0b' : '#10b981',
            }}>
              <div style={styles.summaryBannerLeft}>
                <div style={styles.summaryProductTitle}>
                  📦 <span style={{ fontWeight: 800 }}>{prediction.product_name}</span>
                  <span style={styles.categoryBadge}>{prediction.category_name || predictionInput.category_name}</span>
                </div>
                <div style={styles.summarySupplierText}>
                  🏭 Supplier: <strong style={{ color: 'var(--text-main)' }}>{prediction.supplier_name}</strong>
                  <span style={styles.summarySeparator}>•</span>
                  <span>Period: <strong>{new Date(prediction.year || 2026, (prediction.month || 1) - 1).toLocaleString('default', { month: 'long' })} {prediction.year}</strong></span>
                  <span style={styles.summarySeparator}>•</span>
                  <span>Mode: <strong>{predictionInput.shipping_mode} ({predictionInput.order_region})</strong></span>
                </div>
              </div>
              <div style={styles.summaryBannerRight}>
                {prediction.seasonal_risk_applied ? (
                  <span style={styles.monsoonAlertBadge}>
                    🌧️ Monsoon Season Trade Lane Multiplier Applied (+25%)
                  </span>
                ) : (
                  <span style={styles.calmSeasonBadge}>
                    🌤️ Standard Seasonal Weather Conditions
                  </span>
                )}
              </div>
            </div>

            {/* 4 Cards Grid */}
            <div style={styles.predictionResults}>
              {/* Card 1: Risk Score */}
              <div style={styles.predictionMetricCard}>
                <div style={styles.metricCardHeader}>
                  <span style={styles.predictionMetricLabel}>DISRUPTION RISK SCORE</span>
                  <span style={{
                    ...styles.metricLevelBadge,
                    backgroundColor: prediction.risk_level === 'high' ? 'rgba(239, 68, 68, 0.2)' : prediction.risk_level === 'medium' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                    color: prediction.risk_level === 'high' ? '#f87171' : prediction.risk_level === 'medium' ? '#fbbf24' : '#34d399',
                  }}>
                    {prediction.risk_level.toUpperCase()}
                  </span>
                </div>
                <div style={{
                  ...styles.predictionMetricValue,
                  color: prediction.risk_level === 'high' ? '#f87171' : prediction.risk_level === 'medium' ? '#fbbf24' : '#34d399',
                }}>
                  {(prediction.risk_score ?? prediction.disruption_probability_percent).toFixed(1)}%
                </div>
                <div style={styles.metricProgressBarTrack}>
                  <div style={{
                    ...styles.metricProgressBarFill,
                    width: `${Math.min(100, Math.max(0, prediction.risk_score ?? prediction.disruption_probability_percent))}%`,
                    background: prediction.risk_level === 'high'
                      ? 'linear-gradient(90deg, #f59e0b, #ef4444)'
                      : prediction.risk_level === 'medium'
                      ? 'linear-gradient(90deg, #10b981, #f59e0b)'
                      : 'linear-gradient(90deg, #059669, #10b981)',
                  }} />
                </div>
                <div style={styles.metricCardFooter}>
                  XGBoost probability adjusted for transit delay and seasonality
                </div>
              </div>

              {/* Card 2: Trust Score */}
              <div style={styles.predictionMetricCard}>
                <div style={styles.metricCardHeader}>
                  <span style={styles.predictionMetricLabel}>SUPPLIER TRUST SCORE</span>
                  <span style={styles.inverseFormulaTag}>100 - Risk Score</span>
                </div>
                <div style={{
                  ...styles.predictionMetricValue,
                  color: (prediction.trust_score ?? prediction.supplier_trust_score) >= 65 ? '#34d399' : (prediction.trust_score ?? prediction.supplier_trust_score) >= 35 ? '#fbbf24' : '#f87171',
                }}>
                  {(prediction.trust_score ?? prediction.supplier_trust_score).toFixed(1)}
                  <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-dim)' }}> / 100</span>
                </div>
                <div style={styles.metricProgressBarTrack}>
                  <div style={{
                    ...styles.metricProgressBarFill,
                    width: `${Math.min(100, Math.max(0, prediction.trust_score ?? prediction.supplier_trust_score))}%`,
                    background: (prediction.trust_score ?? prediction.supplier_trust_score) >= 65
                      ? 'linear-gradient(90deg, #059669, #10b981)'
                      : (prediction.trust_score ?? prediction.supplier_trust_score) >= 35
                      ? 'linear-gradient(90deg, #f59e0b, #eab308)'
                      : 'linear-gradient(90deg, #ef4444, #f87171)',
                  }} />
                </div>
                <div style={styles.metricCardFooter}>
                  Strict inverse relationship: higher risk reduces trust score
                </div>
              </div>

              {/* Card 3: Delay Impact */}
              <div style={styles.predictionMetricCard}>
                <div style={styles.metricCardHeader}>
                  <span style={styles.predictionMetricLabel}>TRANSIT &amp; DELAY IMPACT</span>
                  <span style={{
                    ...styles.metricLevelBadge,
                    background: (prediction.expected_delay_days || 0) > 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                    color: (prediction.expected_delay_days || 0) > 0 ? '#f87171' : '#34d399',
                  }}>
                    {(prediction.expected_delay_days || 0) > 0 ? `+${prediction.expected_delay_days}d DELAY` : 'ON-TIME'}
                  </span>
                </div>
                <div style={styles.transitTimelineRow}>
                  <div style={styles.transitCol}>
                    <span style={styles.transitSubLabel}>SCHEDULED</span>
                    <strong style={styles.transitNum}>{prediction.scheduled_shipping_days ?? predictionInput.scheduled_shipping_days}d</strong>
                  </div>
                  <div style={styles.transitArrow}>➜</div>
                  <div style={styles.transitCol}>
                    <span style={styles.transitSubLabel}>EXPECTED DELAY</span>
                    <strong style={{ ...styles.transitNum, color: (prediction.expected_delay_days || 0) > 0 ? '#f87171' : '#34d399' }}>
                      +{(prediction.expected_delay_days ?? prediction.shipping_variance)}d
                    </strong>
                  </div>
                  <div style={styles.transitArrow}>=</div>
                  <div style={styles.transitCol}>
                    <span style={styles.transitSubLabel}>TOTAL TRANSIT</span>
                    <strong style={styles.transitNum}>{prediction.actual_shipping_days ?? (Number(predictionInput.scheduled_shipping_days) + Number(predictionInput.expected_delay_days))}d</strong>
                  </div>
                </div>
                <div style={styles.metricCardFooter}>
                  {prediction.delay_impact_description || `${prediction.expected_delay_days || 0} days expected delay applied to model input.`}
                </div>
              </div>

              {/* Card 4: Early Warning Alert */}
              <div style={styles.predictionMetricCard}>
                <div style={styles.metricCardHeader}>
                  <span style={styles.predictionMetricLabel}>EARLY WARNING STATUS</span>
                  <span style={{
                    ...styles.metricLevelBadge,
                    background: prediction.early_warning_alert ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                    color: prediction.early_warning_alert ? '#f87171' : '#34d399',
                  }}>
                    {prediction.early_warning_alert ? 'TRIGGERED' : 'CLEAR'}
                  </span>
                </div>
                <div style={{
                  ...styles.predictionMetricValue,
                  fontSize: '20px',
                  color: prediction.early_warning_alert ? '#f87171' : '#34d399',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}>
                  <span style={{
                    ...styles.alertPillIndicator,
                    background: prediction.early_warning_alert ? '#ef4444' : '#10b981',
                  }} className={prediction.early_warning_alert ? 'pulse-dot-red' : ''} />
                  {prediction.early_warning_alert ? 'ACTION REQUIRED' : 'NORMAL PRODUCTION'}
                </div>
                <div style={{ ...styles.metricProgressBarTrack, height: '4px', background: 'transparent' }} />
                <div style={styles.metricCardFooter}>
                  {prediction.early_warning_alert
                    ? 'Disruption probability exceeds 50% threshold. Alert sent to Inventory Guardian.'
                    : 'Shipment risk within standard operating limits. No line stoppage expected.'}
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

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
                  background: filterMode === 'all' ? 'var(--bg-card-hover)' : 'transparent',
                  color: filterMode === 'all' ? 'var(--text-main)' : 'var(--text-dim)',
                }}
              >
                All Nodes
              </button>
              <button
                onClick={() => setFilterMode('highRisk')}
                style={{
                  ...styles.pillBtn,
                  background: filterMode === 'highRisk' ? '#3b82f6' : 'transparent',
                  color: filterMode === 'highRisk' ? '#ffffff' : 'var(--text-dim)',
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
                  <div style={styles.chipValue}>
                    {prediction ? (prediction.trust_score ?? prediction.supplier_trust_score).toFixed(1) : '--'}
                    <span style={{ fontSize: '11px', fontWeight: 400 }}> /100</span>
                  </div>
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
              <span style={prediction?.early_warning_alert ? styles.urgentBadge : styles.clearBadge}>
                {prediction
                  ? prediction.early_warning_alert ? 'Alert' : 'Clear'
                  : 'No prediction'}
              </span>
            </div>
            <div style={styles.warningList}>
                <div style={styles.warningItem}>
                  <div style={{
                    ...styles.alertDot,
                    backgroundColor: prediction?.early_warning_alert ? '#ef4444' : '#64748b',
                  }} />
                  <div>
                    <div style={styles.warningTitle}>
                      {prediction
                        ? prediction.early_warning_alert
                          ? 'Disruption risk requires attention'
                          : 'No disruption warning detected'
                        : 'Run a shipment prediction'}
                    </div>
                    <div style={styles.warningMeta}>
                      {prediction
                        ? `RISK: ${prediction.risk_level.toUpperCase()} · PROBABILITY: ${(prediction.risk_score ?? prediction.disruption_probability_percent).toFixed(1)}%`
                        : 'PREDICTION STATUS: NOT RUN'}
                    </div>
                    <div style={styles.warningDesc}>
                      {prediction
                        ? `Product: ${prediction.product_name} · Supplier trust score: ${(prediction.trust_score ?? prediction.supplier_trust_score).toFixed(1)} / 100.`
                        : 'Submit shipment details above to retrieve the current model assessment.'}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {exportStatus && (
              <span style={{ fontSize: '11px', color: exportStatus.includes('failed') ? '#f87171' : '#34d399' }}>
                {exportStatus}
              </span>
            )}
            <button
              onClick={handleExportReport}
              disabled={isExporting}
              style={{
                ...styles.exportBtn,
                opacity: isExporting ? 0.7 : 1,
                cursor: isExporting ? 'wait' : 'pointer',
              }}
              title="Download supplier risk audit report (PDF or CSV)"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              {isExporting ? 'Exporting…' : 'Export Report'}
            </button>
          </div>
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

      {/* Weather & Port Risk Telemetry Widget */}
      <div style={styles.weatherCard}>
        <div style={styles.weatherCardHeader}>
          <div>
            <div style={styles.weatherCardTitle}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2" style={{ marginRight: '8px', flexShrink: 0 }}>
                <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9z" />
              </svg>
              Shipping Route &amp; Port Weather Risk Telemetry
            </div>
            <div style={styles.weatherCardSubtitle}>
              Real-time risk telemetry for key apparel trade lanes — updates every hour.
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {weatherRisk && (
              <span style={{
                ...styles.weatherOverallBadge,
                ...(weatherRisk.overall_risk_level === 'HIGH'
                  ? styles.weatherBadgeHigh
                  : weatherRisk.overall_risk_level === 'MEDIUM'
                  ? styles.weatherBadgeMedium
                  : styles.weatherBadgeLow),
              }}>
                OVERALL: {weatherRisk.overall_risk_level}
              </span>
            )}
            {weatherLoading && (
              <span style={{ fontSize: '11px', color: '#64748b' }}>Refreshing…</span>
            )}
          </div>
        </div>

        {weatherError && (
          <div role="alert" style={styles.weatherErrorBanner}>{weatherError}</div>
        )}

        {!weatherError && (
          <div style={styles.weatherPortGrid}>
            {weatherLoading && !weatherRisk
              ? [1, 2, 3, 4].map((n) => (
                  <div key={n} style={styles.weatherPortCard}>
                    <div style={styles.weatherPortSkeleton} />
                  </div>
                ))
              : (weatherRisk?.ports ?? []).map((port) => {
                  const isHigh = port.status_badge === 'DISRUPTED';
                  const isWatch = port.status_badge === 'WATCH';
                  const accentColor = isHigh ? '#ef4444' : isWatch ? '#f59e0b' : '#10b981';
                  return (
                    <div key={port.port_name} style={{
                      ...styles.weatherPortCard,
                      borderTopColor: accentColor,
                    }}>
                      <div style={styles.weatherPortTop}>
                        <div>
                          <div style={styles.weatherPortName}>{port.port_name}</div>
                          <div style={styles.weatherPortCountry}>{port.country}</div>
                        </div>
                        <span style={{
                          ...styles.weatherStatusBadge,
                          background: isHigh ? 'rgba(239,68,68,0.14)' : isWatch ? 'rgba(245,158,11,0.14)' : 'rgba(16,185,129,0.14)',
                          color: accentColor,
                          borderColor: `${accentColor}55`,
                        }}>
                          {port.status_badge}
                        </span>
                      </div>

                      <div style={styles.weatherConditionRow}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
                          <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9z" />
                        </svg>
                        <span style={styles.weatherConditionText}>{port.weather_condition}</span>
                      </div>

                      <div style={styles.weatherMetricGrid}>
                        <div style={styles.weatherMetric}>
                          <div style={styles.weatherMetricLabel}>TYPHOON / MONSOON RISK</div>
                          <div style={{ ...styles.weatherMetricValue, color: accentColor }}>
                            {port.typhoon_monsoon_risk_score}
                            <span style={{ fontSize: '10px', fontWeight: 400, color: '#64748b' }}>&nbsp;/ 100</span>
                          </div>
                        </div>
                        <div style={styles.weatherMetric}>
                          <div style={styles.weatherMetricLabel}>PORT CONGESTION</div>
                          <div style={styles.weatherMetricValue}>{port.port_congestion_level}</div>
                        </div>
                        <div style={styles.weatherMetric}>
                          <div style={styles.weatherMetricLabel}>EST. DELAY</div>
                          <div style={styles.weatherMetricValue}>
                            {port.estimated_delay_hours}
                            <span style={{ fontSize: '10px', fontWeight: 400, color: '#64748b' }}>&nbsp;hrs</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
            }
          </div>
        )}

        {weatherRisk && (
          <div style={styles.weatherFooter}>
            Last refreshed: {new Date(weatherRisk.generated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} UTC
          </div>
        )}
      </div>

      {/* ── Export Format Selection Modal ── */}
      {isExportModalOpen &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="export-modal-title"
            style={styles.modalOverlay}
            onClick={(e) => { if (e.target === e.currentTarget) setIsExportModalOpen(false); }}
          >
            <div style={styles.modalPanel}>
              {/* Modal Header */}
              <div style={styles.modalHeader}>
                <div>
                  <div style={styles.modalTitle} id="export-modal-title">
                    📤 Export Supplier Risk Report
                  </div>
                  <div style={styles.modalSubtitle}>
                    Select your preferred export format below
                  </div>
                </div>
                <button
                  aria-label="Close export modal"
                  onClick={() => setIsExportModalOpen(false)}
                  style={styles.modalClose}
                >
                  ✕
                </button>
              </div>

              {/* Format Cards */}
              <div style={styles.formatCardGrid}>
                {/* PDF Card */}
                <button
                  id="export-format-pdf"
                  type="button"
                  onClick={() => setExportFormat('pdf')}
                  style={{
                    ...styles.formatCard,
                    ...(exportFormat === 'pdf' ? styles.formatCardActive : {}),
                  }}
                >
                  <div style={styles.formatIcon}>📄</div>
                  <div style={styles.formatLabel}>PDF Format</div>
                  <div style={styles.formatDesc}>
                    Formatted Executive Summary Report with branded header, metric cards, and styled data table.
                  </div>
                  <div style={{
                    ...styles.formatRadioDot,
                    ...(exportFormat === 'pdf' ? styles.formatRadioDotActive : {}),
                  }} />
                </button>

                {/* CSV Card */}
                <button
                  id="export-format-csv"
                  type="button"
                  onClick={() => setExportFormat('csv')}
                  style={{
                    ...styles.formatCard,
                    ...(exportFormat === 'csv' ? styles.formatCardActive : {}),
                  }}
                >
                  <div style={styles.formatIcon}>📊</div>
                  <div style={styles.formatLabel}>CSV Format</div>
                  <div style={styles.formatDesc}>
                    Raw Data Matrix for Analytics — import into Excel, Google Sheets, or BI tools.
                  </div>
                  <div style={{
                    ...styles.formatRadioDot,
                    ...(exportFormat === 'csv' ? styles.formatRadioDotActive : {}),
                  }} />
                </button>
              </div>

              {/* Selected format info pill */}
              <div style={styles.selectedFormatPill}>
                <span style={styles.selectedFormatPillLabel}>Selected:</span>&nbsp;
                <strong style={styles.selectedFormatPillValue}>
                  {exportFormat === 'pdf' ? '📄 PDF — Executive Summary' : '📊 CSV — Raw Data Matrix'}
                </strong>
              </div>

              {/* Actions */}
              <div style={styles.modalActions}>
                <button
                  id="export-cancel-btn"
                  type="button"
                  onClick={() => setIsExportModalOpen(false)}
                  style={styles.modalCancelBtn}
                >
                  Cancel
                </button>
                <button
                  id="export-download-btn"
                  type="button"
                  onClick={handleModalDownload}
                  style={styles.modalDownloadBtn}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}>
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  Download {exportFormat.toUpperCase()} Report
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
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
    color: 'var(--text-main)',
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
    color: 'var(--text-main)',
    letterSpacing: '-0.02em',
  },
  pageSubtitle: {
    fontSize: '13px',
    color: 'var(--text-muted)',
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
  clearAlertsBadge: {
    background: 'rgba(16, 185, 129, 0.12)',
    borderColor: 'rgba(16, 185, 129, 0.35)',
    color: '#34d399',
  },
  greenDot: {
    backgroundColor: '#10b981',
  },
  predictionPanel: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-subtle)',
    borderRadius: '16px',
    padding: '24px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
  },
  predictionPanelHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    marginBottom: '16px',
    flexWrap: 'wrap',
  },
  predictionTitle: {
    margin: 0,
    fontSize: '17px',
    fontWeight: 700,
    color: 'var(--text-main)',
    fontFamily: 'Outfit, sans-serif',
    letterSpacing: '-0.01em',
  },
  predictionSubtitle: {
    margin: '4px 0 0',
    fontSize: '12px',
    color: 'var(--text-muted)',
  },
  presetsBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
    marginBottom: '18px',
    padding: '8px 12px',
    background: 'rgba(255, 255, 255, 0.02)',
    borderRadius: '8px',
    border: '1px dashed var(--border-subtle)',
  },
  presetsLabel: {
    fontSize: '10px',
    fontWeight: 700,
    letterSpacing: '0.06em',
    color: 'var(--text-dim)',
  },
  presetChip: {
    background: 'var(--bg-card-hover)',
    border: '1px solid var(--border-subtle)',
    borderRadius: '6px',
    padding: '4px 10px',
    fontSize: '11px',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  predictionFormContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  formRow1: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
    gap: '12px',
  },
  formRow2: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
    gap: '12px',
  },
  fieldLabel: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    color: 'var(--text-muted)',
    fontSize: '11px',
    fontWeight: 600,
  },
  requiredStar: {
    color: '#ef4444',
    marginLeft: '2px',
  },
  fieldInput: {
    width: '100%',
    boxSizing: 'border-box',
    minHeight: '38px',
    padding: '8px 12px',
    border: '1px solid var(--border-subtle)',
    borderRadius: '8px',
    background: 'var(--bg-card-hover)',
    color: 'var(--text-main)',
    font: 'inherit',
    fontSize: '12px',
  },
  fieldSelect: {
    width: '100%',
    boxSizing: 'border-box',
    minHeight: '38px',
    padding: '8px 12px',
    border: '1px solid var(--border-subtle)',
    borderRadius: '8px',
    background: 'var(--bg-card-hover)',
    color: 'var(--text-main)',
    font: 'inherit',
    fontSize: '12px',
    cursor: 'pointer',
  },
  formActionsRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '12px',
    marginTop: '6px',
    paddingTop: '12px',
    borderTop: '1px solid var(--border-subtle)',
  },
  formHint: {
    fontSize: '11px',
    color: 'var(--text-dim)',
  },
  predictButton: {
    minHeight: '40px',
    padding: '10px 22px',
    border: '1px solid #0284c7',
    borderRadius: '8px',
    background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
    color: '#ffffff',
    fontSize: '12px',
    fontWeight: 700,
    letterSpacing: '0.02em',
    cursor: 'pointer',
    boxShadow: '0 2px 10px rgba(2, 132, 199, 0.3)',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.2s ease',
  },
  spinnerIcon: {
    width: '12px',
    height: '12px',
    border: '2px solid rgba(255, 255, 255, 0.3)',
    borderTopColor: '#ffffff',
    borderRadius: '50%',
    display: 'inline-block',
    animation: 'spin 0.8s linear infinite',
  },
  predictionError: {
    marginTop: '14px',
    padding: '10px 14px',
    border: '1px solid rgba(248, 113, 113, 0.35)',
    borderRadius: '8px',
    background: 'rgba(127, 29, 29, 0.2)',
    color: '#fca5a5',
    fontSize: '12px',
  },
  resultsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    marginTop: '20px',
  },
  predictionSummaryBanner: {
    background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.85) 100%)',
    border: '1px solid var(--border-subtle)',
    borderLeftWidth: '4px',
    borderRadius: '10px',
    padding: '14px 18px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: '12px',
  },
  summaryBannerLeft: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  summaryProductTitle: {
    fontSize: '15px',
    color: 'var(--text-main)',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  categoryBadge: {
    fontSize: '10px',
    fontWeight: 700,
    padding: '2px 8px',
    borderRadius: '4px',
    background: 'rgba(56, 189, 248, 0.15)',
    color: '#38bdf8',
    border: '1px solid rgba(56, 189, 248, 0.3)',
  },
  summarySupplierText: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '6px',
  },
  summarySeparator: {
    color: 'var(--text-dim)',
  },
  summaryBannerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  monsoonAlertBadge: {
    fontSize: '10px',
    fontWeight: 700,
    padding: '4px 10px',
    borderRadius: '6px',
    background: 'rgba(239, 68, 68, 0.14)',
    color: '#f87171',
    border: '1px solid rgba(239, 68, 68, 0.35)',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  calmSeasonBadge: {
    fontSize: '10px',
    fontWeight: 700,
    padding: '4px 10px',
    borderRadius: '6px',
    background: 'rgba(16, 185, 129, 0.14)',
    color: '#34d399',
    border: '1px solid rgba(16, 185, 129, 0.35)',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  monsoonBadge: {
    fontSize: '10px',
    fontWeight: 700,
    padding: '4px 8px',
    borderRadius: '6px',
    background: 'rgba(239, 68, 68, 0.15)',
    color: '#fca5a5',
    border: '1px solid rgba(239, 68, 68, 0.3)',
  },
  predictionResults: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '12px',
  },
  predictionMetricCard: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    gap: '6px',
    padding: '16px',
    border: '1px solid var(--border-subtle)',
    borderRadius: '10px',
    background: 'var(--bg-card-subtle)',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.12)',
  },
  metricCardHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '6px',
  },
  predictionMetricLabel: {
    color: 'var(--text-dim)',
    fontSize: '9px',
    fontWeight: 700,
    letterSpacing: '0.06em',
  },
  metricLevelBadge: {
    borderRadius: '4px',
    padding: '2px 7px',
    fontSize: '9px',
    fontWeight: 800,
    letterSpacing: '0.04em',
  },
  inverseFormulaTag: {
    fontSize: '9px',
    fontStyle: 'italic',
    color: 'var(--text-dim)',
  },
  predictionMetricValue: {
    fontSize: '26px',
    fontWeight: 800,
    fontFamily: 'Outfit, sans-serif',
    marginTop: '2px',
  },
  metricProgressBarTrack: {
    width: '100%',
    height: '6px',
    borderRadius: '3px',
    background: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
    margin: '4px 0 2px',
  },
  metricProgressBarFill: {
    height: '100%',
    borderRadius: '3px',
    transition: 'width 0.4s ease',
  },
  metricCardFooter: {
    fontSize: '10px',
    color: 'var(--text-muted)',
    lineHeight: 1.4,
  },
  transitTimelineRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 0',
  },
  transitCol: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  transitSubLabel: {
    fontSize: '8px',
    fontWeight: 700,
    color: 'var(--text-dim)',
    letterSpacing: '0.04em',
  },
  transitNum: {
    fontSize: '15px',
    fontWeight: 700,
    color: 'var(--text-main)',
  },
  transitArrow: {
    fontSize: '12px',
    color: 'var(--text-dim)',
  },
  alertPillIndicator: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    flexShrink: 0,
  },
  riskBadge: {
    borderRadius: '6px',
    padding: '5px 9px',
    fontSize: '10px',
    fontWeight: 700,
  },
  risklow: {
    background: 'rgba(16, 185, 129, 0.14)',
    color: '#34d399',
  },
  riskmedium: {
    background: 'rgba(245, 158, 11, 0.14)',
    color: '#fbbf24',
  },
  riskhigh: {
    background: 'rgba(239, 68, 68, 0.14)',
    color: '#f87171',
  },
  clearBadge: {
    borderRadius: '6px',
    padding: '3px 8px',
    background: 'rgba(16, 185, 129, 0.14)',
    color: '#34d399',
    fontSize: '10px',
    fontWeight: 700,
    textTransform: 'uppercase',
  },
  topGrid: {
    display: 'grid',
    gridTemplateColumns: '1.45fr 1fr',
    gap: '20px',
  },
  radarCard: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-subtle)',
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
    color: 'var(--text-main)',
    display: 'flex',
    alignItems: 'center',
  },
  pillGroup: {
    display: 'flex',
    gap: '6px',
    background: 'var(--bg-main)',
    padding: '3px',
    borderRadius: '8px',
    border: '1px solid var(--border-subtle)',
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
    background: 'radial-gradient(circle at center, var(--bg-card-hover) 0%, var(--bg-main) 100%)',
    borderRadius: '12px',
    position: 'relative',
    overflow: 'hidden',
    border: '1px solid var(--border-subtle)',
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
    border: '1px dashed rgba(56, 189, 248, 0.35)',
  },
  crosshairH: {
    position: 'absolute',
    width: '100%',
    height: '1px',
    background: 'rgba(56, 189, 248, 0.25)',
  },
  crosshairV: {
    position: 'absolute',
    height: '100%',
    width: '1px',
    background: 'rgba(56, 189, 248, 0.25)',
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
    border: '2px solid var(--bg-card)',
  },
  nodeLabel: {
    marginTop: '4px',
    fontSize: '10px',
    fontWeight: 600,
    color: 'var(--text-main)',
    background: 'var(--bg-card-subtle)',
    padding: '2px 6px',
    borderRadius: '4px',
    border: '1px solid var(--border-subtle)',
    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.15)',
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
    background: 'var(--bg-card-subtle)',
    backdropFilter: 'blur(8px)',
    border: '1px solid var(--border-subtle)',
    borderRadius: '8px',
    padding: '8px 12px',
    display: 'flex',
    alignItems: 'center',
  },
  chipLabel: {
    fontSize: '9px',
    fontWeight: 700,
    letterSpacing: '0.06em',
    color: 'var(--text-muted)',
  },
  chipValue: {
    fontSize: '18px',
    fontWeight: 700,
    color: 'var(--text-main)',
  },
  rightColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  subCard: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-subtle)',
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
    color: 'var(--text-main)',
  },
  bigStatDesc: {
    fontSize: '11px',
    color: 'var(--text-muted)',
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
    color: 'var(--text-dim)',
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
    background: 'var(--bg-card-hover)',
    borderRadius: '8px',
    border: '1px solid var(--border-subtle)',
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
    color: 'var(--text-main)',
  },
  warningMeta: {
    fontSize: '10px',
    fontFamily: 'monospace',
    color: 'var(--text-dim)',
    margin: '2px 0 4px',
  },
  warningDesc: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    lineHeight: 1.4,
  },
  frameworkCard: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-subtle)',
    borderRadius: '16px',
    padding: '24px',
  },
  frameworkHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: '16px',
    borderBottom: '1px solid var(--border-subtle)',
    marginBottom: '18px',
  },
  frameworkTitle: {
    fontSize: '18px',
    fontWeight: 700,
    fontFamily: 'Outfit, sans-serif',
    color: 'var(--text-main)',
  },
  frameworkSubtitle: {
    fontSize: '12px',
    color: 'var(--text-muted)',
    marginTop: '3px',
  },
  exportBtn: {
    background: 'var(--bg-card-hover)',
    border: '1px solid var(--border-subtle)',
    borderRadius: '8px',
    color: 'var(--text-main)',
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
    color: 'var(--text-dim)',
    marginBottom: '10px',
    textTransform: 'uppercase',
  },
  ownerName: {
    fontSize: '14px',
    fontWeight: 700,
    color: 'var(--text-main)',
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
    color: 'var(--text-main)',
    marginBottom: '6px',
  },
  subObjHeader: {
    fontSize: '10px',
    fontWeight: 700,
    color: 'var(--text-muted)',
    marginTop: '4px',
  },
  colText: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    lineHeight: 1.5,
    marginTop: '2px',
  },
  methodologyList: {
    paddingLeft: '16px',
    fontSize: '11px',
    color: 'var(--text-muted)',
    lineHeight: 1.7,
  },
  differentiationBox: {
    background: 'var(--bg-card-hover)',
    borderLeft: '3px solid #3b82f6',
    borderRadius: '0 8px 8px 0',
    padding: '12px 14px',
    fontSize: '11px',
    color: 'var(--text-main)',
    lineHeight: 1.6,
  },

  // ── Weather & Port Risk Telemetry Widget ───────────────────────────────────
  weatherCard: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border-subtle)',
    borderRadius: '16px',
    padding: '24px',
  },
  weatherCardHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '16px',
    flexWrap: 'wrap',
    paddingBottom: '16px',
    borderBottom: '1px solid var(--border-subtle)',
    marginBottom: '20px',
  },
  weatherCardTitle: {
    fontSize: '16px',
    fontWeight: 700,
    fontFamily: 'Outfit, sans-serif',
    color: 'var(--text-main)',
    display: 'flex',
    alignItems: 'center',
  },
  weatherCardSubtitle: {
    fontSize: '12px',
    color: 'var(--text-muted)',
    marginTop: '4px',
  },
  weatherOverallBadge: {
    borderRadius: '6px',
    padding: '5px 10px',
    fontSize: '10px',
    fontWeight: 700,
    letterSpacing: '0.06em',
    border: '1px solid transparent',
  },
  weatherBadgeHigh: {
    background: 'rgba(239, 68, 68, 0.14)',
    color: '#f87171',
    borderColor: 'rgba(239, 68, 68, 0.35)',
  },
  weatherBadgeMedium: {
    background: 'rgba(245, 158, 11, 0.14)',
    color: '#fbbf24',
    borderColor: 'rgba(245, 158, 11, 0.35)',
  },
  weatherBadgeLow: {
    background: 'rgba(16, 185, 129, 0.14)',
    color: '#34d399',
    borderColor: 'rgba(16, 185, 129, 0.35)',
  },
  weatherErrorBanner: {
    padding: '10px 14px',
    background: 'rgba(127, 29, 29, 0.2)',
    border: '1px solid rgba(248, 113, 113, 0.3)',
    borderRadius: '8px',
    color: '#fca5a5',
    fontSize: '12px',
    marginBottom: '16px',
  },
  weatherPortGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '16px',
  },
  weatherPortCard: {
    background: 'var(--bg-card-hover)',
    border: '1px solid var(--border-subtle)',
    borderTop: '3px solid #38bdf8',
    borderRadius: '10px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  weatherPortSkeleton: {
    height: '120px',
    borderRadius: '6px',
    background: 'linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.4s infinite',
  },
  weatherPortTop: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '8px',
  },
  weatherPortName: {
    fontSize: '13px',
    fontWeight: 700,
    color: 'var(--text-main)',
  },
  weatherPortCountry: {
    fontSize: '10px',
    color: 'var(--text-dim)',
    marginTop: '2px',
  },
  weatherStatusBadge: {
    borderRadius: '5px',
    padding: '3px 7px',
    fontSize: '9px',
    fontWeight: 800,
    letterSpacing: '0.06em',
    border: '1px solid transparent',
    flexShrink: 0,
  },
  weatherConditionRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    background: 'var(--bg-card)',
    border: '1px solid var(--border-subtle)',
    borderRadius: '6px',
    padding: '6px 8px',
  },
  weatherConditionText: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    fontStyle: 'italic',
  },
  weatherMetricGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '6px',
  },
  weatherMetric: {
    display: 'flex',
    flexDirection: 'column',
    gap: '3px',
    padding: '8px 6px',
    background: 'var(--bg-card)',
    borderRadius: '6px',
    textAlign: 'center',
  },
  weatherMetricLabel: {
    fontSize: '8px',
    fontWeight: 700,
    letterSpacing: '0.04em',
    color: 'var(--text-dim)',
    textTransform: 'uppercase',
  },
  weatherMetricValue: {
    fontSize: '16px',
    fontWeight: 700,
    color: 'var(--text-main)',
  },
  weatherFooter: {
    marginTop: '14px',
    fontSize: '10px',
    color: 'var(--text-dim)',
    textAlign: 'right',
  },

  // ── Export Modal ─────────────────────────────────────────────────────
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100vw',
    height: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 99999,
    background: 'rgba(5, 8, 15, 0.8)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
  },
  modalPanel: {
    background: 'linear-gradient(135deg, rgba(15,23,42,0.98) 0%, rgba(30,27,75,0.96) 100%)',
    border: '1px solid rgba(99,102,241,0.3)',
    borderRadius: '20px',
    padding: '28px',
    width: '100%',
    maxWidth: '560px',
    boxShadow: '0 25px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(99,102,241,0.1) inset',
    animation: 'fadeInScale 0.2s ease',
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: '22px',
  },
  modalTitle: {
    fontSize: '18px',
    fontWeight: 800,
    fontFamily: 'Outfit, sans-serif',
    color: 'var(--text-main)',
    letterSpacing: '-0.01em',
  },
  modalSubtitle: {
    fontSize: '12px',
    color: 'var(--text-muted)',
    marginTop: '4px',
  },
  modalClose: {
    background: 'none',
    border: '1px solid var(--border-subtle)',
    borderRadius: '8px',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    fontSize: '14px',
    padding: '4px 8px',
    lineHeight: 1,
    transition: 'background 0.15s',
  },
  formatCardGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '14px',
    marginBottom: '18px',
  },
  formatCard: {
    background: 'rgba(255,255,255,0.04)',
    border: '1.5px solid rgba(255,255,255,0.1)',
    borderRadius: '14px',
    padding: '18px 16px',
    cursor: 'pointer',
    textAlign: 'left',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    transition: 'border-color 0.2s, background 0.2s, transform 0.15s',
    position: 'relative',
  },
  formatCardActive: {
    background: 'rgba(99,102,241,0.12)',
    borderColor: '#6366f1',
    boxShadow: '0 0 0 3px rgba(99,102,241,0.15)',
    transform: 'translateY(-1px)',
  },
  formatIcon: {
    fontSize: '28px',
    lineHeight: 1,
    marginBottom: '4px',
  },
  formatLabel: {
    fontSize: '14px',
    fontWeight: 700,
    color: 'var(--text-main)',
    fontFamily: 'Outfit, sans-serif',
  },
  formatDesc: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    lineHeight: 1.5,
  },
  formatRadioDot: {
    position: 'absolute',
    top: '14px',
    right: '14px',
    width: '14px',
    height: '14px',
    borderRadius: '50%',
    border: '2px solid rgba(255,255,255,0.25)',
    background: 'transparent',
    transition: 'border-color 0.2s, background 0.2s',
  },
  formatRadioDotActive: {
    borderColor: '#6366f1',
    background: '#6366f1',
    boxShadow: '0 0 0 3px rgba(99,102,241,0.25)',
  },
  selectedFormatPill: {
    display: 'flex',
    alignItems: 'center',
    background: 'rgba(99,102,241,0.08)',
    border: '1px solid rgba(99,102,241,0.2)',
    borderRadius: '8px',
    padding: '8px 14px',
    marginBottom: '20px',
    fontSize: '12px',
    color: 'var(--text-muted)',
  },
  selectedFormatPillLabel: {
    fontWeight: 600,
    color: 'var(--text-dim)',
  },
  selectedFormatPillValue: {
    color: '#a5b4fc',
    fontWeight: 700,
  },
  modalActions: {
    display: 'flex',
    gap: '10px',
    justifyContent: 'flex-end',
  },
  modalCancelBtn: {
    background: 'none',
    border: '1px solid var(--border-subtle)',
    borderRadius: '10px',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 600,
    padding: '10px 20px',
    transition: 'background 0.15s',
  },
  modalDownloadBtn: {
    background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
    border: 'none',
    borderRadius: '10px',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 700,
    padding: '10px 22px',
    display: 'flex',
    alignItems: 'center',
    boxShadow: '0 4px 14px rgba(99,102,241,0.35)',
    transition: 'opacity 0.15s, transform 0.15s',
  },
};
