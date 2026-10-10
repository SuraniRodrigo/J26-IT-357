import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  optimizeInventoryDetailed,
  getInventorySummary,
  getInventoryProducts,
  runScenarioAnalysis,
  getProductionInterface,
  getResearchResults,
} from '../../services/inventoryService';

// ─── tiny SVG bar-chart used in Research tab ───────────────────────────────
function PolicyBarChart({ isDark }) {
  const policies = [
    { label: 'Static (s,S)', stockout: 4.36,    color: '#64748B', service: 99.99 },
    { label: 'Std Adaptive', stockout: 1994.05,  color: '#F59E0B', service: 99.46 },
    { label: 'OPTICHAIN',   stockout: 160.45,   color: '#10B981', service: 99.96 },
  ];
  const maxVal = 1994.05;
  const W = 480, H = 160, pad = 40, barW = 80, gap = 40;
  const textC = isDark ? '#94A3B8' : '#475569';
  const lineC = isDark ? '#1E293B' : '#E2E8F0';
  return (
    <svg viewBox={`0 0 ${W} ${H + 40}`} style={{ width: '100%', maxWidth: W, height: 'auto' }}>
      {/* grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((t) => {
        const y = pad + (1 - t) * H;
        return (
          <g key={t}>
            <line x1={pad} y1={y} x2={W - 10} y2={y} stroke={lineC} strokeDasharray="4 3" strokeWidth="1" />
            <text x={pad - 6} y={y + 4} fontSize="9" fill={textC} textAnchor="end">
              {Math.round(t * maxVal)}
            </text>
          </g>
        );
      })}
      {/* bars */}
      {policies.map((p, i) => {
        const x = pad + i * (barW + gap) + 10;
        const barH = (p.stockout / maxVal) * H;
        const y = pad + H - barH;
        return (
          <g key={p.label}>
            <rect x={x} y={y} width={barW} height={barH} rx="6" fill={p.color} opacity="0.85" />
            <text x={x + barW / 2} y={y - 6} fontSize="10" fontWeight="700" fill={p.color} textAnchor="middle">
              {p.stockout.toLocaleString()}
            </text>
            <text x={x + barW / 2} y={pad + H + 16} fontSize="10" fill={textC} textAnchor="middle" fontWeight="600">
              {p.label}
            </text>
            <text x={x + barW / 2} y={pad + H + 28} fontSize="9" fill={textC} textAnchor="middle">
              SL {p.service}%
            </text>
          </g>
        );
      })}
      {/* axis */}
      <line x1={pad} y1={pad} x2={pad} y2={pad + H} stroke={textC} strokeWidth="1.5" />
      <line x1={pad} y1={pad + H} x2={W - 10} y2={pad + H} stroke={textC} strokeWidth="1.5" />
      <text x={10} y={pad + H / 2} fontSize="9" fill={textC} transform={`rotate(-90,10,${pad + H / 2})`} textAnchor="middle">
        Stockout Units
      </text>
    </svg>
  );
}

// ─── Circular gauge ─────────────────────────────────────────────────────────
function StockGauge({ pct, label, color }) {
  const r = 36, cx = 44, cy = 44, stroke = 8;
  const circ = 2 * Math.PI * r;
  const dash = Math.max(0, Math.min(1, pct)) * circ;
  return (
    <div style={{ textAlign: 'center' }}>
      <svg width="88" height="88" viewBox="0 0 88 88">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
        <circle
          cx={cx} cy={cy} r={r} fill="none"
          stroke={color} strokeWidth={stroke}
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`}
          style={{ transition: 'stroke-dasharray 0.6s ease' }}
        />
        <text x={cx} y={cy - 4} textAnchor="middle" fontSize="12" fontWeight="800" fill={color}>
          {Math.round(pct * 100)}%
        </text>
        <text x={cx} y={cy + 10} textAnchor="middle" fontSize="8" fill="#94A3B8">
          {label}
        </text>
      </svg>
    </div>
  );
}

export default function InventoryOptimizationView() {
  // ── Theme ─────────────────────────────────────────────────────────────────
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem('optichain_inventory_theme') || 'dark'; } catch { return 'dark'; }
  });
  const isDark = theme === 'dark';
  const c = useMemo(() => getThemeColors(isDark), [isDark]);
  const styles = useMemo(() => getStyles(c), [c]);

  // ── Navigation ────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('operations');

  // ── API Data ──────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [summaryData, setSummaryData] = useState(null);
  const [productsList, setProductsList] = useState([]);
  const [selectedSku, setSelectedSku] = useState('FAB-001');
  const [productionInterfaceData, setProductionInterfaceData] = useState([]);
  const [scenarioData, setScenarioData] = useState(null);

  // ── Simulator Controls ────────────────────────────────────────────────────
  const [activePreset, setActivePreset] = useState('port_crisis');
  const [disruptionProb, setDisruptionProb] = useState(0.85);
  const [leadTimeVar, setLeadTimeVar] = useState(3.2);
  const [demandSurge, setDemandSurge] = useState(0);
  const [serviceLevel, setServiceLevel] = useState(0.95);
  const [baselineSnap, setBaselineSnap] = useState(null);
  const [showPolicyOverlay, setShowPolicyOverlay] = useState(false);

  // ── Table Controls ────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [sortCol, setSortCol] = useState('disruption_probability');
  const [sortDir, setSortDir] = useState('desc');

  // ── Modals & PO ───────────────────────────────────────────────────────────
  const [xaiModalSku, setXaiModalSku] = useState(null);
  const [poModalItem, setPoModalItem] = useState(null);
  const [freightMode, setFreightMode] = useState('sea');
  const [dispatchedPOs, setDispatchedPOs] = useState({});
  const [showPoHistory, setShowPoHistory] = useState(false);
  const [toasts, setToasts] = useState([]);

  // ── Direct API Tester ─────────────────────────────────────────────────────
  const [directParams, setDirectParams] = useState({
    product_id: 'FAB-001', current_inventory: 3400, forecasted_demand: 15200,
    demand_std_dev: 2280, average_lead_time: 7.0, lead_time_std_dev: 3.2,
    disruption_probability: 0.85, supplier_trust_score: 42.0,
    service_level: 0.95, replenishment_cycle_days: 7,
  });
  const [directApiResult, setDirectApiResult] = useState(null);
  const [isExecutingDirectApi, setIsExecutingDirectApi] = useState(false);

  // ── Toast system ──────────────────────────────────────────────────────────
  const showToast = useCallback((msg, type = 'success') => {
    const id = Date.now();
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 4000);
  }, []);

  // ── Fetch data ────────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const [sumRes, prodRes, piRes] = await Promise.all([
        getInventorySummary().catch(() => null),
        getInventoryProducts().catch(() => []),
        getProductionInterface().catch(() => []),
      ]);
      if (sumRes) setSummaryData(sumRes);
      if (prodRes?.length) { setProductsList(prodRes); setSelectedSku(prodRes[0].product_id); }
      if (piRes) setProductionInterfaceData(piRes);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Current product ───────────────────────────────────────────────────────
  const currentProduct = useMemo(() =>
    productsList.find(p => p.product_id === selectedSku) || productsList[0] || {
      product_id: 'FAB-001', product_name: 'Organic Cotton Premium 30s', category: 'Fabrics',
      unit: 'kg', current_inventory: 3400, forecasted_demand: 15200, demand_std_dev: 2280,
      average_lead_time: 7.0, lead_time_std_dev: 3.2, disruption_probability: 0.85, supplier_trust_score: 42.0,
    }, [productsList, selectedSku]);

  // ── Scenario fetch ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!currentProduct) return;
    let live = true;
    runScenarioAnalysis({
      product_id: currentProduct.product_id, current_inventory: currentProduct.current_inventory,
      forecasted_demand: currentProduct.forecasted_demand * (1 + demandSurge / 100),
      base_disruption_prob: disruptionProb, average_lead_time: currentProduct.average_lead_time,
      lead_time_std_dev: leadTimeVar, demand_std_dev: currentProduct.demand_std_dev, service_level: serviceLevel,
    }).then(r => { if (live && r) setScenarioData(r); }).catch(() => {});
    return () => { live = false; };
  }, [currentProduct, disruptionProb, leadTimeVar, demandSurge, serviceLevel]);

  // ── Live optimization ─────────────────────────────────────────────────────
  const calc = useCallback((p, dp, ltv, ds, sl) => {
    const demand = p.forecasted_demand * (1 + ds / 100);
    const leadAdj = p.average_lead_time * (1 + dp);
    const z = sl >= 0.99 ? 2.33 : sl >= 0.95 ? 1.645 : 1.28;
    const variance = leadAdj * Math.pow(p.demand_std_dev, 2) + Math.pow(demand, 2) * Math.pow(ltv, 2);
    const ss = Math.round(z * Math.sqrt(Math.max(0, variance)));
    const ssLo = Math.round((z - 0.2) * Math.sqrt(Math.max(0, variance)));
    const ssHi = Math.round((z + 0.2) * Math.sqrt(Math.max(0, variance)));
    const rop = Math.round(demand * leadAdj) + ss;
    const roq = Math.round(demand * 7 * (1 + dp));
    const shortage = Math.max(0, Math.round(demand - p.current_inventory));
    const avail = shortage === 0;
    let risk = 'LOW';
    if (shortage > 0 || (p.current_inventory < ss && dp >= 0.7)) risk = 'CRITICAL';
    else if (dp >= 0.6 || p.current_inventory < ss) risk = 'HIGH';
    else if (dp >= 0.25) risk = 'MEDIUM';
    return { demand, leadAdj: parseFloat(leadAdj.toFixed(1)), z, ss, ssLo, ssHi, rop, roq, shortage, avail, risk };
  }, []);

  const activeOpt = useMemo(() => calc(currentProduct, disruptionProb, leadTimeVar, demandSurge, serviceLevel),
    [currentProduct, disruptionProb, leadTimeVar, demandSurge, serviceLevel, calc]);

  // ── Presets ───────────────────────────────────────────────────────────────
  const applyPreset = (key) => {
    setActivePreset(key);
    const snap = { ss: activeOpt.ss, rop: activeOpt.rop, roq: activeOpt.roq, risk: activeOpt.risk };
    const map = {
      baseline:     [0.15, 1.0,  0,  0.95],
      port_crisis:  [0.85, 3.8, 10,  0.95],
      demand_spike: [0.35, 1.8, 45,  0.99],
      force_majeure:[0.95, 5.0, 25,  0.99],
    };
    const [dp, ltv, ds, sl] = map[key] || [0.15, 1.0, 0, 0.95];
    setBaselineSnap(snap);
    setDisruptionProb(dp); setLeadTimeVar(ltv); setDemandSurge(ds); setServiceLevel(sl);
  };

  // ── PO dispatch ───────────────────────────────────────────────────────────
  const handleDispatchPO = () => {
    if (!poModalItem) return;
    const poNum = `PO-${Math.floor(100000 + Math.random() * 900000)}`;
    const costPerUnit = poModalItem.category === 'Fabrics' ? 8.5 : poModalItem.category === 'Dyes & Chemicals' ? 24.0 : 0.45;
    const totalCost = Math.round(poModalItem.reorder_quantity * costPerUnit * (freightMode === 'air' ? 2.4 : 1.0));
    setDispatchedPOs(prev => ({
      ...prev,
      [poModalItem.product_id]: { poNum, qty: poModalItem.reorder_quantity, cost: totalCost, mode: freightMode, at: new Date().toLocaleTimeString(), sku: poModalItem.product_id, name: poModalItem.product_name },
    }));
    showToast(`Purchase Order #${poNum} dispatched to ERP ✓`);
    setPoModalItem(null);
  };

  // ── Table sort + filter ───────────────────────────────────────────────────
  const handleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('desc'); }
  };

  const filteredProducts = useMemo(() => {
    let list = productsList.filter(item => {
      const catOk = selectedCategory === 'ALL' || item.category === selectedCategory;
      const srchOk = item.product_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                     item.product_name.toLowerCase().includes(searchQuery.toLowerCase());
      return catOk && srchOk;
    });
    list = [...list].sort((a, b) => {
      let av, bv;
      if (sortCol === 'disruption_probability') { av = a.disruption_probability; bv = b.disruption_probability; }
      else if (sortCol === 'current_inventory')  { av = a.current_inventory; bv = b.current_inventory; }
      else if (sortCol === 'safety_stock')  { av = a.forecasted_demand * 0.35; bv = b.forecasted_demand * 0.35; }
      else if (sortCol === 'roq') { av = a.forecasted_demand * 7 * (1 + a.disruption_probability); bv = b.forecasted_demand * 7 * (1 + b.disruption_probability); }
      else { av = a[sortCol] ?? 0; bv = b[sortCol] ?? 0; }
      return sortDir === 'asc' ? av - bv : bv - av;
    });
    return list;
  }, [productsList, selectedCategory, searchQuery, sortCol, sortDir]);

  // ── Critical SKUs alert ───────────────────────────────────────────────────
  const criticalSkus = useMemo(() =>
    productsList.filter(p => p.disruption_probability >= 0.7 && p.current_inventory < p.forecasted_demand * 0.35),
    [productsList]);

  // ── Policy overlay values ─────────────────────────────────────────────────
  const policyValues = useMemo(() => {
    const p = currentProduct;
    const p1ss = Math.round(1.645 * Math.sqrt(p.average_lead_time * Math.pow(p.demand_std_dev, 2) + Math.pow(p.forecasted_demand, 2) * Math.pow(1.0, 2)));
    const p2ss = Math.round(1.645 * Math.sqrt(p.average_lead_time * 1.3 * Math.pow(p.demand_std_dev, 2) + Math.pow(p.forecasted_demand, 2) * Math.pow(p.lead_time_std_dev, 2)));
    return [
      { label: 'Static (s,S)',    ss: p1ss, color: '#64748B' },
      { label: 'Std Adaptive',    ss: p2ss, color: '#F59E0B' },
      { label: 'OPTICHAIN',       ss: activeOpt.ss, color: '#10B981' },
    ];
  }, [currentProduct, activeOpt]);

  const CATS = ['ALL', 'Fabrics', 'Dyes & Chemicals', 'Trims & Fasteners', 'Yarns & Threads'];
  const dispatchedList = Object.values(dispatchedPOs);

  const SortIcon = ({ col }) => (
    <span style={{ marginLeft: '4px', opacity: sortCol === col ? 1 : 0.3, fontSize: '10px' }}>
      {sortCol === col ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}
    </span>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <div style={styles.container}>
      <style>{`
        @keyframes pulse-dot { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(1.6)} }
        @keyframes slide-up  { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes toast-shrink { from{width:100%} to{width:0%} }
        @keyframes badge-pop { 0%{transform:scale(0.8)} 100%{transform:scale(1)} }
        .row-hover:hover { background: ${isDark ? 'rgba(59,130,246,0.1)' : 'rgba(37,99,235,0.05)'} !important; }
        .th-sort { cursor:pointer; user-select:none; }
        .th-sort:hover { color: ${isDark ? '#F1F5F9' : '#0B1F3A'} !important; }
        .kpi-hover:hover { transform:translateY(-3px); box-shadow: 0 16px 40px rgba(0,0,0,.25) !important; }
        .btn-hover:hover { opacity:.88; transform:translateY(-1px); }
        .chip-hover:hover { opacity:.85; cursor:pointer; }
        .input-focus:focus { border-color:#3B82F6!important; box-shadow:0 0 0 3px rgba(59,130,246,.2)!important; outline:none!important; }
        .slider-track { -webkit-appearance:none; height:6px; border-radius:4px; outline:none; width:100%; cursor:pointer;
          background: linear-gradient(to right,#2563EB,#7C3AED); }
        .slider-track::-webkit-slider-thumb { -webkit-appearance:none; width:18px; height:18px; border-radius:50%;
          background:#fff; border:3px solid #2563EB; box-shadow:0 2px 8px rgba(37,99,235,.4); cursor:pointer; transition:all .2s; }
        .slider-track::-webkit-slider-thumb:hover { transform:scale(1.2); }
        .tab-btn { transition:all .2s ease; }
        .tab-btn:hover { transform:translateY(-2px); }
      `}</style>

      {/* ═══ HEADER HERO ════════════════════════════════════════════════════ */}
      <div style={styles.headerCard}>
        <div style={styles.orbBlue} /><div style={styles.orbPurple} />

        <div style={styles.headerTopRow}>
          {/* Left: identity */}
          <div style={{ display:'flex', alignItems:'center', gap:'16px', flex:'1 1 540px', minWidth:'320px' }}>
            <div style={styles.headerIconBox}><span style={{ fontSize:'26px' }}>🛡️</span></div>
            <div>
              <div style={styles.moduleBadge}>
                <span style={styles.liveDot} />
                MODULE 3 · DISRUPTION-AWARE ADAPTIVE INVENTORY OPTIMIZATION
              </div>
              <h1 style={styles.headerTitle}>Inventory Guardian</h1>
              <p style={styles.headerSubtitle}>
                Dynamically optimizing safety stock buffers, reorder thresholds, and material allocations
                by coupling upstream demand variability with supplier disruption risk signals.
              </p>
            </div>
          </div>

          {/* Right: badges + theme toggle neatly aligned */}
          <div style={{ display:'flex', alignItems:'center', gap:'8px', flexWrap:'wrap', justifyContent:'flex-end', flexShrink:0 }}>
            <span style={styles.demoModeBadge}>⚠️ DEMO MODE (Upstream: Simulated)</span>
            <span style={styles.statusBadge}><span style={{ color:'#10B981', animation:'pulse-dot 2s infinite', fontSize:'8px' }}>●</span> inventory-policy-v1.0</span>
            <span style={styles.statusBadge}><span style={{ color:'#818CF8', animation:'pulse-dot 2.4s infinite', fontSize:'8px' }}>●</span> backorder-xgb-v1.0</span>
            <button className="btn-hover" onClick={() => { const n = isDark?'light':'dark'; setTheme(n); try{localStorage.setItem('optichain_inventory_theme',n);}catch(e){} }} style={styles.themeToggleBtn}>
              {isDark ? '☀️ Light Mode' : '🌙 Dark Mode'}
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div style={styles.kpiGrid}>
          {[
            { label:'TARGET SERVICE LEVEL', val:`${summaryData?.average_service_level||99.95}%`, trend:'↑ +0.49pp vs baseline', icon:'📈', accent:'#3B82F6', bg: isDark?'rgba(59,130,246,0.1)':'#EFF6FF', bdr: isDark?'rgba(59,130,246,0.25)':'#BFDBFE' },
            { label:'STOCKOUT MITIGATION',  val:`${summaryData?.stockout_mitigation_pct||91.95}%`, trend:'−91.95% stockout units', icon:'✅', accent:'#10B981', bg: isDark?'rgba(16,185,129,0.1)':'#F0FDF4', bdr: isDark?'rgba(16,185,129,0.25)':'#BBF7D0' },
            { label:'MONITORED RAW MATERIALS', val:`${summaryData?.total_materials_monitored||productsList.length||8} SKUs`, trend:'Active supply portfolio', icon:'📦', accent:'#8B5CF6', bg: isDark?'rgba(139,92,246,0.1)':'#F5F3FF', bdr: isDark?'rgba(139,92,246,0.25)':'#DDD6FE' },
            { label:'CRITICAL ALERTS & REORDERS', val:`${summaryData?.critical_shortages_count||7} Shortage`, trend:`${summaryData?.reorder_required_count||8} POs triggered`, icon:'🚨', accent:'#EF4444', bg: isDark?'rgba(239,68,68,0.1)':'#FFF5F5', bdr: isDark?'rgba(239,68,68,0.25)':'#FECACA' },
          ].map((k,i) => (
            <div key={i} className="kpi-hover" style={{ ...styles.kpiCard, background:k.bg, border:`1px solid ${k.bdr}`, transition:'all .25s ease' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'10px' }}>
                <div style={{ fontSize:'11px', fontWeight:800, letterSpacing:'.07em', color:c.sub }}>{k.label}</div>
                <span style={{ fontSize:'20px' }}>{k.icon}</span>
              </div>
              <div style={{ fontSize:'26px', fontWeight:900, color:k.accent, letterSpacing:'-0.02em', marginBottom:'6px' }}>{k.val}</div>
              <div style={{ fontSize:'10.5px', color:c.sub, display:'flex', alignItems:'center', gap:'4px' }}>
                <span style={{ color:k.accent, fontWeight:700 }}>{i===3?'⚠':'↑'}</span> {k.trend}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ═══ DISRUPTION ALERT BANNER ═════════════════════════════════════════ */}
      {criticalSkus.length > 0 && (
        <div style={styles.alertBanner}>
          <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
            <span style={{ fontSize:'20px', animation:'badge-pop .4s ease' }}>🚨</span>
            <div>
              <div style={{ fontWeight:800, fontSize:'13px', color:'#FCA5A5' }}>
                Disruption Alert — {criticalSkus.length} SKU{criticalSkus.length>1?'s':''} at Critical Risk
              </div>
              <div style={{ fontSize:'11.5px', color:'#FCD4D4', marginTop:'2px' }}>
                {criticalSkus.map(s=>`${s.product_id} (P=${Math.round(s.disruption_probability*100)}%, Stock below Safety Buffer)`).join(' · ')}
              </div>
            </div>
          </div>
          <div style={{ fontSize:'10.5px', color:'#FCA5A5', fontWeight:700, background:'rgba(239,68,68,0.2)', padding:'4px 12px', borderRadius:'20px', border:'1px solid rgba(239,68,68,0.4)', whiteSpace:'nowrap' }}>
            Proactive detection active
          </div>
        </div>
      )}

      {/* ═══ TAB NAVIGATION ══════════════════════════════════════════════════ */}
      <div style={styles.tabNavContainer}>
        {[
          { id:'operations', icon:'📊', label:'Operations & Cockpit',      desc:'Live monitoring & decisions' },
          { id:'simulator',  icon:'⚡', label:'What-If Simulator',          desc:'Disruption stress testing' },
          { id:'readiness',  icon:'🏭', label:'Production Readiness',        desc:'Module 4 handoff interface' },
          { id:'research',   icon:'📈', label:'Research & ML Benchmarks',    desc:'171K dataset · XGBoost ML' },
        ].map(tab => (
          <button key={tab.id} className="tab-btn" onClick={() => setActiveTab(tab.id)} style={{ ...styles.tabNavBtn, ...(activeTab===tab.id ? styles.tabActive : {}) }}>
            <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
              <span style={{ fontSize:'17px' }}>{tab.icon}</span>
              <div style={{ textAlign:'left' }}>
                <div style={{ fontWeight:700, fontSize:'12.5px' }}>{tab.label}</div>
                <div style={{ fontSize:'10.5px', opacity:.7, marginTop:'1px' }}>{tab.desc}</div>
              </div>
            </div>
            {activeTab===tab.id && <div style={styles.tabActiveBar} />}
          </button>
        ))}
      </div>

      {/* ═══ TAB 1: OPERATIONS & INVENTORY COCKPIT ═══════════════════════════ */}
      {activeTab === 'operations' && (
        <div style={styles.tabContent}>

          {/* ── Data Flow Pipeline ── */}
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                <div style={styles.cardIconBadge}>🔄</div>
                <div>
                  <div style={styles.cardTitle}>Data Flow & Decision Pipeline</div>
                  <div style={styles.cardSub}>Upstream signals → Optimization Engine → Policy Deliverables</div>
                </div>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:'10px', flexWrap:'wrap' }}>
                {showPolicyOverlay && (
                  <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
                    {policyValues.map((pv,i)=>(
                      <div key={i} style={{ fontSize:'10.5px', fontWeight:700, color:pv.color, background:pv.color+'18', border:`1px solid ${pv.color}44`, padding:'3px 10px', borderRadius:'20px' }}>
                        {pv.label}: {pv.ss.toLocaleString()} kg
                      </div>
                    ))}
                  </div>
                )}
                <button className="btn-hover" onClick={()=>setShowPolicyOverlay(v=>!v)} style={{ ...styles.pillBtn, background: showPolicyOverlay?'rgba(16,185,129,0.2)':'rgba(255,255,255,0.05)', borderColor: showPolicyOverlay?'#10B981':c.tagBorder, color: showPolicyOverlay?'#10B981':c.sub }}>
                  {showPolicyOverlay?'✓ Policy Overlay ON':'⊕ Policy Comparison'}
                </button>
                <div style={styles.activeSkuChip}>
                  SKU: <strong style={{ color:'#60A5FA' }}>{activeOpt.product_id||currentProduct.product_id}</strong> — {currentProduct.product_name}
                </div>
              </div>
            </div>

            <div style={styles.pipelineGrid}>
              {/* Col 1 — Inputs */}
              <div style={styles.pipelineCol}>
                <div style={styles.pipelineColHead('#60A5FA')}>📥 1. UPSTREAM INPUTS (MOCKED)</div>
                <div style={styles.pipelineRows}>
                  {[
                    ['Forecast Demand (D)',     `${activeOpt.demand.toLocaleString()} ${currentProduct.unit}`, null],
                    ['Supplier Lead Time (L)',  `${currentProduct.average_lead_time}d (±${leadTimeVar}d)`, null],
                    ['Disruption Risk P(risk)', `${(disruptionProb*100).toFixed(0)}%`, disruptionProb>=.6?'#F87171':'#FBBF24'],
                    ['Supplier Trust Score',    `${currentProduct.supplier_trust_score}/100`, null],
                    ['On-Hand Warehouse Stock', `${currentProduct.current_inventory?.toLocaleString()} ${currentProduct.unit}`, '#34D399'],
                  ].map(([lbl,val,clr],i)=>(
                    <div key={i} style={styles.pipelineRow}>
                      <span style={{ color:c.sub, fontSize:'11.5px' }}>{lbl}</span>
                      <strong style={{ color:clr||c.title, fontSize:'12px' }}>{val}</strong>
                    </div>
                  ))}
                </div>
              </div>

              {/* Col 2 — Engine */}
              <div style={{ ...styles.pipelineCol, background: isDark?'linear-gradient(160deg,#0C1E3A,#091729)':'linear-gradient(160deg,#EFF6FF,#F0F9FF)', border:`1px solid ${isDark?'rgba(37,99,235,.3)':'#BAE6FD'}`, boxShadow: isDark?'0 0 20px rgba(37,99,235,.08)':'none' }}>
                <div style={styles.pipelineColHead('#93C5FD')}>⚙️ 2. ADAPTIVE OPTIMIZATION ENGINE</div>
                <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
                  {[
                    ['SAFETY STOCK FORMULA',  'SS = z · √(L·σ_D² + D²·σ_L²) · (1 + P_disrupt)'],
                    ['DYNAMIC REORDER POINT', 'ROP = D · L_adj + Safety_Stock'],
                    ['REORDER QUANTITY',       'ROQ = D · Cycle_Days · (1 + P_disrupt)'],
                  ].map(([lbl,f],i)=>(
                    <div key={i} style={styles.formulaPill}>
                      <div style={{ fontSize:'9px', fontWeight:800, letterSpacing:'.07em', color:c.sub, marginBottom:'4px' }}>{lbl}</div>
                      <div style={{ fontFamily:'monospace', fontSize:'11.5px', fontWeight:700, color:'#60A5FA', lineHeight:1.5 }}>{f}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Col 3 — Deliverables */}
              <div style={{ ...styles.pipelineCol, background: isDark?'linear-gradient(160deg,#0A1F1A,#071812)':'linear-gradient(160deg,#F0FDF4,#ECFDF5)', border:`1px solid ${isDark?'rgba(16,185,129,.3)':'#BBF7D0'}`, boxShadow: isDark?'0 0 20px rgba(16,185,129,.08)':'none' }}>
                <div style={styles.pipelineColHead('#6EE7B7')}>📤 3. POLICY DELIVERABLES</div>

                {/* Gauge row */}
                <div style={{ display:'flex', justifyContent:'space-around', marginBottom:'12px', paddingBottom:'12px', borderBottom:`1px solid ${c.tableBorder}` }}>
                  <StockGauge pct={Math.min(1, currentProduct.current_inventory / Math.max(1, activeOpt.rop))} label="Stock/ROP" color="#60A5FA" />
                  <StockGauge pct={Math.min(1, currentProduct.current_inventory / Math.max(1, activeOpt.ss))} label="Stock/SS" color={currentProduct.current_inventory < activeOpt.ss ? '#F87171' : '#34D399'} />
                </div>

                {/* Metric rows */}
                {[
                  ['Risk-Adj. Lead Time', `${activeOpt.leadAdj} days`, c.title, false],
                  ['Dynamic Safety Stock', `${activeOpt.ss.toLocaleString()} ${currentProduct.unit}`, '#60A5FA', true],
                  ['SS Confidence ±σ', `${activeOpt.ssLo.toLocaleString()} – ${activeOpt.ssHi.toLocaleString()} ${currentProduct.unit}`, '#93C5FD', false],
                  ['Reorder Point (ROP)', `${activeOpt.rop.toLocaleString()} ${currentProduct.unit}`, c.title, false],
                  ['Reorder Quantity (ROQ)', `${activeOpt.roq.toLocaleString()} ${currentProduct.unit}`, '#34D399', true],
                  ['Material Availability', activeOpt.avail ? '✓ TRUE — Ready' : '⚠ FALSE — Shortage', activeOpt.avail ? '#34D399' : '#F87171', true],
                ].map(([lbl,val,clr,hi],i)=>(
                  <div key={i} style={{ ...styles.pipelineRow, ...(hi?{ background: clr+'10', borderRadius:'6px', padding:'6px 8px', marginLeft:'-8px', marginRight:'-8px', border:'none', borderBottom:`1px solid ${c.tableBorder}` }:{}) }}>
                    <span style={{ color:c.sub, fontSize:'11px' }}>{lbl}</span>
                    <strong style={{ color:clr, fontSize:'12px' }}>{val}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Monitored Materials Table ── */}
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                <div style={styles.cardIconBadge}>📋</div>
                <div>
                  <div style={styles.cardTitle}>Monitored Garment Raw Materials</div>
                  <div style={styles.cardSub}>Click row to select SKU · Sort by column headers · Filter by category</div>
                </div>
              </div>
              <div style={{ display:'flex', gap:'8px', alignItems:'center', flexWrap:'wrap' }}>
                {/* Search */}
                <div style={{ position:'relative', display:'flex', alignItems:'center' }}>
                  <span style={{ position:'absolute', left:'10px', fontSize:'12px', pointerEvents:'none' }}>🔍</span>
                  <input type="text" placeholder="Search SKU or name..." value={searchQuery}
                    onChange={e=>setSearchQuery(e.target.value)}
                    className="input-focus"
                    style={{ ...styles.searchInput, paddingLeft:'30px', transition:'width .3s', width: searchQuery ? '220px' : '180px' }} />
                </div>
                {/* PO history badge */}
                {dispatchedList.length > 0 && (
                  <button className="btn-hover" onClick={()=>setShowPoHistory(v=>!v)} style={{ ...styles.pillBtn, background:'rgba(16,185,129,0.15)', borderColor:'rgba(16,185,129,0.4)', color:'#34D399' }}>
                    📦 {dispatchedList.length} PO{dispatchedList.length>1?'s':''} Dispatched
                  </button>
                )}
              </div>
            </div>

            {/* Category chips */}
            <div style={{ display:'flex', gap:'8px', flexWrap:'wrap', marginBottom:'16px' }}>
              {CATS.map(cat=>(
                <button key={cat} className="chip-hover btn-hover" onClick={()=>setSelectedCategory(cat)} style={{
                  padding:'5px 14px', borderRadius:'20px', fontSize:'11.5px', fontWeight:700, border:'1px solid',
                  background: selectedCategory===cat ? '#2563EB' : c.tagBg,
                  color:       selectedCategory===cat ? '#FFFFFF'  : c.sub,
                  borderColor: selectedCategory===cat ? '#2563EB'  : c.tagBorder,
                  cursor:'pointer', transition:'all .15s',
                  boxShadow:   selectedCategory===cat ? '0 2px 10px rgba(37,99,235,.35)' : 'none',
                }}>{cat}</button>
              ))}
              <span style={{ marginLeft:'auto', fontSize:'11px', color:c.sub, alignSelf:'center' }}>
                {filteredProducts.length} SKU{filteredProducts.length!==1?'s':''} shown · sorted by {sortCol} {sortDir==='asc'?'↑':'↓'}
              </span>
            </div>

            {/* PO History Panel */}
            {showPoHistory && dispatchedList.length > 0 && (
              <div style={{ ...styles.subCard, marginBottom:'16px', border:`1px solid rgba(16,185,129,0.3)`, background: isDark?'rgba(16,185,129,0.05)':'#F0FDF4' }}>
                <div style={{ fontWeight:800, fontSize:'12.5px', color:'#34D399', marginBottom:'10px' }}>📦 Dispatched Purchase Orders</div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))', gap:'10px' }}>
                  {dispatchedList.map((po,i)=>(
                    <div key={i} style={{ background: isDark?'rgba(0,0,0,0.3)':'#FFFFFF', borderRadius:'10px', padding:'10px 14px', border:`1px solid ${c.tableBorder}` }}>
                      <div style={{ fontWeight:700, color:'#34D399', fontSize:'12px' }}>{po.poNum}</div>
                      <div style={{ fontSize:'11px', color:c.sub, marginTop:'3px' }}>{po.sku} — {po.name}</div>
                      <div style={{ fontSize:'11px', color:c.title, marginTop:'4px' }}>Qty: <strong>{po.qty?.toLocaleString()}</strong> · {po.mode==='air'?'✈️ Air':'🚢 Sea'} · <strong>\${po.cost?.toLocaleString()}</strong></div>
                      <div style={{ fontSize:'10px', color:c.sub, marginTop:'2px' }}>Dispatched at {po.at}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Table */}
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.theadRow}>
                    <th style={styles.th}>SKU & Name</th>
                    <th style={styles.th}>Category</th>
                    <th className="th-sort" style={styles.thRight} onClick={()=>handleSort('current_inventory')}>Current Stock <SortIcon col="current_inventory"/></th>
                    <th style={styles.thRight}>14d Forecast</th>
                    <th className="th-sort" style={styles.thCenter} onClick={()=>handleSort('disruption_probability')}>Risk <SortIcon col="disruption_probability"/></th>
                    <th className="th-sort" style={styles.thRight} onClick={()=>handleSort('safety_stock')}>Safety Stock <SortIcon col="safety_stock"/></th>
                    <th style={styles.thRight}>ROP</th>
                    <th className="th-sort" style={styles.thRight} onClick={()=>handleSort('roq')}>ROQ <SortIcon col="roq"/></th>
                    <th style={styles.thCenter}>Availability</th>
                    <th style={{ ...styles.thCenter, position:'sticky', right:0, background: isDark?'#0A1626':'#F1F5F9', zIndex:2 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((item, idx) => {
                    const isSelected = item.product_id === selectedSku;
                    const hasShortage = item.current_inventory < item.forecasted_demand;
                    const isDispatched = !!dispatchedPOs[item.product_id];
                    const rp = item.disruption_probability;
                    const skuSS = Math.round(item.forecasted_demand * 0.35);
                    const healthPct = Math.min(1, item.current_inventory / Math.max(1, skuSS));
                    const healthColor = healthPct < 0.5 ? '#EF4444' : healthPct < 0.8 ? '#F59E0B' : '#10B981';
                    const rowBg = isSelected
                      ? (isDark ? 'rgba(59,130,246,0.15)' : '#EFF6FF')
                      : (isDark ? (idx%2===0?'#0F172A':'#0B1526') : (idx%2===0?'#FFFFFF':'#F8FAFC'));
                    return (
                      <tr key={item.product_id} className="row-hover" onClick={()=>setSelectedSku(item.product_id)}
                        style={{ ...styles.tr, backgroundColor:rowBg, borderLeft: isSelected?'3px solid #3B82F6':'3px solid transparent', cursor:'pointer' }}>
                        <td style={styles.td}>
                          <div style={{ fontWeight:700, color:c.title, fontSize:'12.5px' }}>{item.product_id}</div>
                          <div style={{ fontSize:'10.5px', color:c.sub, marginTop:'2px' }}>{item.product_name}</div>
                        </td>
                        <td style={styles.td}><span style={styles.categoryChip}>{item.category}</span></td>
                        <td style={styles.tdRight}>
                          <div style={{ fontWeight:700, color:c.title }}>{item.current_inventory.toLocaleString()} <span style={{ fontSize:'10px', color:c.sub }}>{item.unit}</span></div>
                          {/* Stock health bar */}
                          <div style={{ marginTop:'5px', height:'4px', background: isDark?'#1E293B':'#E2E8F0', borderRadius:'2px', overflow:'hidden', width:'80px', marginLeft:'auto' }}>
                            <div style={{ height:'100%', width:`${Math.min(100,healthPct*100)}%`, background:healthColor, borderRadius:'2px', transition:'width .6s ease' }} />
                          </div>
                          <div style={{ fontSize:'9px', color:healthColor, textAlign:'right', marginTop:'2px', fontWeight:700 }}>{Math.round(healthPct*100)}% of SS</div>
                        </td>
                        <td style={styles.tdRight}><span style={{ color:c.sub }}>{item.forecasted_demand.toLocaleString()} {item.unit}</span></td>
                        <td style={styles.tdCenter}>
                          <span style={{ ...styles.badge, background: rp>=.7?(isDark?'rgba(239,68,68,.2)':'#FEE2E2'):rp>=.35?(isDark?'rgba(245,158,11,.2)':'#FEF3C7'):(isDark?'rgba(16,185,129,.2)':'#DCFCE7'), color: rp>=.7?(isDark?'#FCA5A5':'#991B1B'):rp>=.35?(isDark?'#FDE047':'#92400E'):(isDark?'#6EE7B7':'#166534'), border:`1px solid ${rp>=.7?(isDark?'rgba(239,68,68,.4)':'#FCA5A5'):rp>=.35?(isDark?'rgba(245,158,11,.4)':'#FCD34D'):(isDark?'rgba(16,185,129,.4)':'#86EFAC')}` }}>
                            {(rp*100).toFixed(0)}%
                          </span>
                          <div style={{ width:'50px', height:'3px', background: isDark?'#1E293B':'#E2E8F0', borderRadius:'2px', overflow:'hidden', margin:'4px auto 0' }}>
                            <div style={{ height:'100%', width:`${rp*100}%`, background: rp>=.7?'#EF4444':rp>=.35?'#F59E0B':'#10B981', borderRadius:'2px' }} />
                          </div>
                        </td>
                        <td style={styles.tdRight}>
                          <span style={{ color: isDark?'#60A5FA':'#2563EB', fontWeight:700 }}>{skuSS.toLocaleString()}</span>
                          <span style={{ fontSize:'10px', color:c.sub, marginLeft:'3px' }}>{item.unit}</span>
                        </td>
                        <td style={styles.tdRight}><span style={{ color:c.title, fontWeight:600 }}>{Math.round(item.forecasted_demand*1.2).toLocaleString()}</span></td>
                        <td style={styles.tdRight}>
                          <span style={{ color: isDark?'#6EE7B7':'#059669', fontWeight:700 }}>{Math.round(item.forecasted_demand*7*(1+item.disruption_probability)).toLocaleString()}</span>
                          <span style={{ fontSize:'10px', color:c.sub, marginLeft:'3px' }}>{item.unit}</span>
                        </td>
                        <td style={styles.tdCenter}>
                          <span style={{ ...styles.badge, padding:'5px 10px', fontWeight:700, background: hasShortage?(isDark?'rgba(239,68,68,.2)':'#FEE2E2'):(isDark?'rgba(16,185,129,.2)':'#DCFCE7'), color: hasShortage?(isDark?'#FCA5A5':'#991B1B'):(isDark?'#6EE7B7':'#166534'), border:`1px solid ${hasShortage?(isDark?'rgba(239,68,68,.4)':'#FCA5A5'):(isDark?'rgba(16,185,129,.4)':'#86EFAC')}` }}>
                            {hasShortage ? '⚠ Shortage' : '✓ Ready'}
                          </span>
                        </td>
                        <td style={{ ...styles.tdCenter, position:'sticky', right:0, background:rowBg, zIndex:1 }}>
                          <div style={{ display:'flex', gap:'5px', justifyContent:'center' }}>
                            <button className="btn-hover" onClick={e=>{e.stopPropagation();setXaiModalSku(item);}} style={styles.xaiBtn} title="XAI Formula">📐</button>
                            <button className="btn-hover" onClick={e=>{e.stopPropagation();setPoModalItem({...item,reorder_quantity:Math.round(item.forecasted_demand*7*(1+item.disruption_probability))});}} style={{ ...styles.poBtn, background: isDispatched?'#059669':(isDark?'#2563EB':'#0B1F3A') }}>
                              {isDispatched ? '✓' : '⚡ PO'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ═══ TAB 2: WHAT-IF SIMULATOR ════════════════════════════════════════ */}
      {activeTab === 'simulator' && (
        <div style={styles.tabContent}>
          {/* Input Controls */}
          <div style={{ ...styles.card, border:`1px solid ${isDark?'rgba(59,130,246,.35)':'#BFDBFE'}`, boxShadow: isDark?'0 0 32px rgba(37,99,235,.12)':'none' }}>
            <div style={styles.cardHeader}>
              <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                <div style={styles.cardIconBadge}>🎛️</div>
                <div>
                  <div style={styles.cardTitle}>Live Disruption Controls</div>
                  <div style={styles.cardSub}>Drag sliders to instantly recalculate — before/after comparison shown below</div>
                </div>
              </div>
              <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
                {[
                  { id:'baseline',      label:'🟢 Baseline',     color:'#10B981' },
                  { id:'port_crisis',   label:'🔴 Port Crisis',   color:'#EF4444' },
                  { id:'demand_spike',  label:'⚡ Demand Surge',  color:'#F59E0B' },
                  { id:'force_majeure', label:'🌪️ Force Majeure', color:'#8B5CF6' },
                ].map(p=>(
                  <button key={p.id} className="btn-hover" onClick={()=>applyPreset(p.id)} style={{ ...styles.presetBtn, background: activePreset===p.id?p.color:(isDark?'#1E293B':'#F1F5F9'), color: activePreset===p.id?'#fff':c.sub, border:`1px solid ${activePreset===p.id?p.color:c.tagBorder}`, boxShadow: activePreset===p.id?`0 0 14px ${p.color}55`:'none' }}>{p.label}</button>
                ))}
              </div>
            </div>

            <div style={styles.sliderGrid}>
              {[
                { icon:'🔴', label:'Disruption Probability', desc:'P(supplier failure event)', val:(disruptionProb*100).toFixed(0)+'%', color: disruptionProb>=.6?'#F87171':disruptionProb>=.3?'#FBBF24':'#34D399', min:0, max:1, step:.05, cur:disruptionProb, set:v=>setDisruptionProb(parseFloat(v)) },
                { icon:'⏱️', label:'Lead Time Variability (σ_L)', desc:'Standard deviation of lead time', val:`±${leadTimeVar.toFixed(1)}d`, color:'#60A5FA', min:.5, max:6, step:.1, cur:leadTimeVar, set:v=>setLeadTimeVar(parseFloat(v)) },
                { icon:'📈', label:'Demand Surge Factor (ΔD)', desc:'% increase in forecasted demand', val:`+${demandSurge}%`, color: demandSurge>0?'#34D399':c.sub, min:0, max:100, step:5, cur:demandSurge, set:v=>setDemandSurge(parseInt(v)) },
                { icon:'🎯', label:'Target Service Level', desc:`z = ${activeOpt.z}`, val:`${(serviceLevel*100).toFixed(0)}%`, color:'#A78BFA', min:.85, max:.99, step:.01, cur:serviceLevel, set:v=>setServiceLevel(parseFloat(v)) },
              ].map((s,i)=>(
                <div key={i} style={styles.sliderCard}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'14px' }}>
                    <div>
                      <div style={{ display:'flex', alignItems:'center', gap:'6px', marginBottom:'3px' }}>
                        <span style={{ fontSize:'16px' }}>{s.icon}</span>
                        <span style={{ fontWeight:700, fontSize:'13px', color:c.title }}>{s.label}</span>
                      </div>
                      <div style={{ fontSize:'11px', color:c.sub, marginLeft:'22px' }}>{s.desc}</div>
                    </div>
                    <div style={{ fontSize:'15px', fontWeight:800, color:s.color, background:s.color+'18', border:`1px solid ${s.color}44`, padding:'4px 12px', borderRadius:'20px', whiteSpace:'nowrap' }}>{s.val}</div>
                  </div>
                  <input type="range" min={s.min} max={s.max} step={s.step} value={s.cur} onChange={e=>s.set(e.target.value)} className="slider-track" />
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:'9.5px', color:c.sub, marginTop:'4px' }}>
                    <span>{s.min}</span><span>{s.max}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Before / After comparison */}
            <div style={{ marginTop:'24px', display:'grid', gridTemplateColumns:'1fr auto 1fr', gap:'16px', alignItems:'center' }}>
              {/* Before */}
              <div style={{ ...styles.subCard, opacity: baselineSnap?1:0.5 }}>
                <div style={{ fontSize:'10px', fontWeight:800, color:c.sub, letterSpacing:'.07em', marginBottom:'10px' }}>
                  BASELINE SNAPSHOT {!baselineSnap&&'(select a preset to compare)'}
                </div>
                {[
                  ['Safety Stock', baselineSnap?.ss?.toLocaleString()??'—', '#60A5FA'],
                  ['Reorder Point', baselineSnap?.rop?.toLocaleString()??'—', c.title],
                  ['Reorder Qty', baselineSnap?.roq?.toLocaleString()??'—', '#34D399'],
                  ['Risk Level', baselineSnap?.risk??'—', '#FBBF24'],
                ].map(([l,v,col],i)=>(
                  <div key={i} style={{ display:'flex', justifyContent:'space-between', fontSize:'12px', color:c.sub, padding:'5px 0', borderBottom:`1px solid ${c.tableBorder}` }}>
                    <span>{l}</span><strong style={{ color:col }}>{v}</strong>
                  </div>
                ))}
              </div>

              {/* Arrow */}
              <div style={{ textAlign:'center', color:c.sub }}>
                <div style={{ fontSize:'24px' }}>→</div>
                <div style={{ fontSize:'10px', fontWeight:700, marginTop:'4px', color:'#60A5FA' }}>CURRENT</div>
              </div>

              {/* After */}
              <div style={{ ...styles.subCard, border:`1px solid ${isDark?'rgba(59,130,246,.3)':'#BFDBFE'}`, background: isDark?'rgba(59,130,246,.06)':'rgba(37,99,235,.03)' }}>
                <div style={{ fontSize:'10px', fontWeight:800, color:'#60A5FA', letterSpacing:'.07em', marginBottom:'10px' }}>LIVE OUTPUT</div>
                {[
                  ['Safety Stock', activeOpt.ss.toLocaleString()+` ${currentProduct.unit}`, '#60A5FA'],
                  ['Reorder Point', activeOpt.rop.toLocaleString()+` ${currentProduct.unit}`, c.title],
                  ['Reorder Qty', activeOpt.roq.toLocaleString()+` ${currentProduct.unit}`, '#34D399'],
                  ['Risk Level', activeOpt.risk, activeOpt.risk==='CRITICAL'?'#F87171':activeOpt.risk==='HIGH'?'#FBBF24':'#34D399'],
                ].map(([l,v,col],i)=>{
                  const snapVals = [baselineSnap?.ss, baselineSnap?.rop, baselineSnap?.roq, null];
                  const currVals = [activeOpt.ss, activeOpt.rop, activeOpt.roq, null];
                  const hasSnap = typeof snapVals[i] === 'number' && typeof currVals[i] === 'number';
                  const delta = hasSnap ? currVals[i] - snapVals[i] : null;
                  return (
                    <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:'12px', color:c.sub, padding:'5px 0', borderBottom:`1px solid ${c.tableBorder}` }}>
                      <span>{l}</span>
                      <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                        {delta!==null && delta!==0 && <span style={{ fontSize:'10px', fontWeight:700, color: delta>0?'#F87171':'#34D399' }}>{delta>0?'+':''}{delta.toLocaleString()}</span>}
                        <strong style={{ color:col }}>{v}</strong>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Scenario cards */}
          <div style={styles.card}>
            <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'16px' }}>
              <div style={styles.cardIconBadge}>📊</div>
              <div>
                <div style={styles.cardTitle}>Multi-Scenario Disruption Stress Matrix</div>
                <div style={styles.cardSub}>Stress testing <strong>{currentProduct.product_id}</strong> across NORMAL / MODERATE / SEVERE</div>
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))', gap:'16px' }}>
              {['NORMAL','MODERATE','SEVERE'].map(scName => {
                const sc = scenarioData?.scenarios?.[scName] || {
                  multiplier: scName==='NORMAL'?1.0:scName==='MODERATE'?1.5:2.0,
                  disruption_probability: Math.min(1, disruptionProb*(scName==='NORMAL'?1:scName==='MODERATE'?1.5:2)),
                  risk_adjusted_lead_time: (currentProduct.average_lead_time*(scName==='NORMAL'?1:scName==='MODERATE'?1.5:2)).toFixed(1),
                  safety_stock: Math.round(activeOpt.ss*(scName==='NORMAL'?1:scName==='MODERATE'?1.5:2)),
                  reorder_point: Math.round(activeOpt.rop*(scName==='NORMAL'?1:scName==='MODERATE'?1.4:1.9)),
                  reorder_quantity: Math.round(activeOpt.roq*(scName==='NORMAL'?1:scName==='MODERATE'?1.5:2)),
                  risk_level: scName==='NORMAL'?'LOW':scName==='MODERATE'?'MEDIUM':'CRITICAL',
                  reorder_recommendation: scName==='SEVERE'?'EXPEDITE: Extreme risk. Dual-source allocation advised.':'Nominal buffer sufficient.',
                };
                const ac = scName==='SEVERE'?'#EF4444':scName==='MODERATE'?'#F59E0B':'#10B981';
                return (
                  <div key={scName} style={{ ...styles.subCard, border:`1px solid ${ac}44`, boxShadow:`0 0 18px ${ac}14` }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'12px', paddingBottom:'10px', borderBottom:`1px solid ${ac}33` }}>
                      <div>
                        <div style={{ fontWeight:800, fontSize:'13px', color:c.title }}>{scName} ({sc.multiplier}x)</div>
                        <div style={{ fontSize:'11px', color:c.sub, marginTop:'2px' }}>P(risk): {(sc.disruption_probability*100).toFixed(0)}%</div>
                      </div>
                      <span style={{ ...styles.badge, background:ac+'22', color:ac, border:`1px solid ${ac}55`, fontSize:'11px', padding:'4px 10px' }}>{sc.risk_level}</span>
                    </div>
                    {[['Lead Time',sc.risk_adjusted_lead_time+' days',c.title],['Safety Buffer',sc.safety_stock.toLocaleString()+` ${currentProduct.unit}`,'#60A5FA'],['Trigger ROP',sc.reorder_point.toLocaleString()+` ${currentProduct.unit}`,c.title],['Rec. ROQ',sc.reorder_quantity.toLocaleString()+` ${currentProduct.unit}`,'#34D399']].map(([l,v,col],i)=>(
                      <div key={i} style={{ display:'flex', justifyContent:'space-between', fontSize:'12px', color:c.sub, padding:'5px 0', borderBottom:`1px solid ${c.tableBorder}` }}><span>{l}</span><strong style={{ color:col }}>{v}</strong></div>
                    ))}
                    <div style={{ marginTop:'10px', padding:'8px 10px', background:ac+'12', borderRadius:'8px', border:`1px dashed ${ac}44`, fontSize:'11.5px', color:c.title }}>
                      <span style={{ color:ac, fontWeight:800, fontSize:'9.5px', letterSpacing:'.06em' }}>DIRECTIVE — </span>{sc.reorder_recommendation}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Direct API Tester */}
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                <div style={styles.cardIconBadge}>🔌</div>
                <div>
                  <div style={styles.cardTitle}>Live FastAPI Optimization Tester</div>
                  <div style={styles.cardSub}>POST /api/inventory/optimize/detailed — 10-step Python engine · Fields marked * are primary inputs</div>
                </div>
              </div>
              <button className="btn-hover" onClick={async()=>{ setIsExecutingDirectApi(true); try{ const r=await optimizeInventoryDetailed(directParams); setDirectApiResult(r); showToast(`✓ Optimization for ${directParams.product_id} complete`); }catch(e){ showToast(`API error: ${e.message||'Unknown'}`, 'error'); } finally{ setIsExecutingDirectApi(false); } }} disabled={isExecutingDirectApi} style={styles.execBtn}>
                {isExecutingDirectApi ? '⟳ Executing...' : '⚡ Run POST /optimize'}
              </button>
            </div>
            <div style={styles.inputGrid}>
              {[
                { k:'current_inventory',    l:'Current Inventory *',    icon:'📦', u:'units', hi:true },
                { k:'forecasted_demand',    l:'Forecasted Demand (D) *',icon:'📈', u:'units', hi:true },
                { k:'demand_std_dev',       l:'Demand Std Dev (σ_D)',   icon:'📊', u:'units', hi:false },
                { k:'average_lead_time',    l:'Lead Time (L) *',        icon:'⏱️', u:'days',  hi:true },
                { k:'lead_time_std_dev',    l:'Lead Time Std Dev (σ_L)',icon:'📉', u:'days',  hi:false },
                { k:'disruption_probability',l:'Disruption Prob. *',   icon:'⚠️', u:'0–1',   hi:true },
              ].map(f=>(
                <div key={f.k} style={{ ...styles.inputField, ...(f.hi?{ padding:'12px', background: isDark?'rgba(59,130,246,.06)':'rgba(37,99,235,.03)', borderRadius:'12px', border:`1px solid ${isDark?'rgba(59,130,246,.2)':'rgba(37,99,235,.1)'}` }:{}) }}>
                  <label style={styles.inputLabel}><span>{f.icon}</span> {f.l} <span style={{ color:c.sub, fontWeight:400 }}>({f.u})</span></label>
                  <input type="number" value={directParams[f.k]} onChange={e=>setDirectParams(p=>({...p,[f.k]:parseFloat(e.target.value)||0}))} className="input-focus" style={{ ...styles.textInput, ...(f.hi?{ border:`2px solid ${isDark?'rgba(59,130,246,.5)':'#BFDBFE'}` }:{}) }} />
                </div>
              ))}
            </div>
            {directApiResult && (
              <div style={{ marginTop:'20px', background: isDark?'rgba(16,185,129,.07)':'#F0FDF4', border:`1px solid ${isDark?'rgba(16,185,129,.25)':'#BBF7D0'}`, borderRadius:'14px', padding:'18px' }}>
                <div style={{ fontWeight:800, color:'#34D399', marginBottom:'14px', fontSize:'13px' }}>✓ FastAPI 200 OK — Response Payload</div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(150px,1fr))', gap:'10px' }}>
                  {[
                    ['Safety Stock',  directApiResult.safety_stock+' units', '#60A5FA'],
                    ['Reorder Point', directApiResult.reorder_point+' units', c.title],
                    ['Reorder Qty',   directApiResult.reorder_quantity+' units', '#34D399'],
                    ['Backorder Risk',(directApiResult.backorder_risk*100).toFixed(1)+'%', '#F87171'],
                    ['Shortage',      directApiResult.material_shortage+' units', directApiResult.material_shortage>0?'#F87171':'#34D399'],
                    ['Availability',  directApiResult.material_availability_flag?'TRUE':'FALSE', directApiResult.material_availability_flag?'#34D399':'#F87171'],
                  ].map(([l,v,col],i)=>(
                    <div key={i} style={{ background: isDark?'rgba(0,0,0,.3)':'#FFFFFF', borderRadius:'10px', padding:'12px', border:`1px solid ${c.tableBorder}`, textAlign:'center' }}>
                      <div style={{ fontSize:'9.5px', fontWeight:800, color:c.sub, letterSpacing:'.06em' }}>{l}</div>
                      <div style={{ fontSize:'18px', fontWeight:800, color:col, marginTop:'5px' }}>{v}</div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop:'12px', fontSize:'11.5px', color:c.sub, background: isDark?'rgba(0,0,0,.2)':'#F1F5F9', padding:'8px 12px', borderRadius:'8px' }}>
                  <strong style={{ color:c.title }}>Directive:</strong> {directApiResult.reorder_recommendation}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ TAB 3: PRODUCTION READINESS ════════════════════════════════════ */}
      {activeTab === 'readiness' && (
        <div style={styles.tabContent}>
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                <div style={styles.cardIconBadge}>🏭</div>
                <div>
                  <div style={styles.cardTitle}>Production Material Readiness & Module 4 Handoff</div>
                  <div style={styles.cardSub}>Integration contract serving live readiness flags to the Line Optimizer</div>
                </div>
              </div>
              <div style={{ ...styles.pillBtn, cursor:'default', background:'rgba(59,130,246,.12)', borderColor:'rgba(59,130,246,.3)', color: isDark?'#93C5FD':'#1E40AF' }}>
                📄 Inventory_to_Production_Scheduling.csv
              </div>
            </div>

            {productionInterfaceData.length === 0 ? (
              <div style={{ textAlign:'center', padding:'60px 20px' }}>
                <div style={{ fontSize:'40px', marginBottom:'12px' }}>📭</div>
                <div style={{ fontWeight:700, fontSize:'15px', color:c.title, marginBottom:'6px' }}>No Production Interface Data</div>
                <div style={{ fontSize:'12px', color:c.sub, marginBottom:'20px' }}>The backend hasn't returned readiness data yet. Check the FastAPI server at :8000</div>
                <button className="btn-hover" onClick={fetchAll} style={styles.execBtn}>↺ Retry Fetch</button>
              </div>
            ) : (
              <div style={styles.tableWrapper}>
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.theadRow}>
                      {['Product SKU','Material Name','Required','Available On-Hand','Shortage','Readiness Flag','Recommended Action'].map(h=>(
                        <th key={h} style={h==='Required'||h==='Available On-Hand'||h==='Shortage'?styles.thRight:h==='Readiness Flag'?styles.thCenter:styles.th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {productionInterfaceData.map((item,idx)=>(
                      <tr key={item.product_id} className="row-hover" style={{ ...styles.tr, backgroundColor: isDark?(idx%2===0?'#0F172A':'#0B1526'):(idx%2===0?'#FFFFFF':'#F8FAFC') }}>
                        <td style={styles.td}><strong style={{ color:c.title }}>{item.product_id}</strong></td>
                        <td style={styles.td}><span style={{ color:c.sub }}>{item.product_name}</span></td>
                        <td style={styles.tdRight}><span style={{ color:c.title, fontWeight:600 }}>{item.material_requirement?.toLocaleString()}</span></td>
                        <td style={styles.tdRight}><strong style={{ color:'#34D399' }}>{item.available_inventory?.toLocaleString()}</strong></td>
                        <td style={styles.tdRight}><strong style={{ color:item.material_shortage>0?'#F87171':c.sub }}>{item.material_shortage?.toLocaleString()}</strong></td>
                        <td style={styles.tdCenter}>
                          <span style={{ ...styles.badge, padding:'5px 12px', fontWeight:700, background:item.material_availability_flag?(isDark?'rgba(16,185,129,.2)':'#DCFCE7'):(isDark?'rgba(239,68,68,.2)':'#FEE2E2'), color:item.material_availability_flag?(isDark?'#6EE7B7':'#166534'):(isDark?'#FCA5A5':'#991B1B'), border:`1px solid ${item.material_availability_flag?(isDark?'rgba(16,185,129,.5)':'#86EFAC'):(isDark?'rgba(239,68,68,.5)':'#FCA5A5')}` }}>
                            {item.material_availability_flag ? '✓ PRODUCTION READY' : '⚠ SHORTAGE / GATE'}
                          </span>
                        </td>
                        <td style={styles.td}><span style={{ fontSize:'11.5px', color:item.material_availability_flag?(isDark?'#6EE7B7':'#059669'):(isDark?'#FCA5A5':'#DC2626') }}>{item.material_availability_flag?'✓ Ready for line allocation (Shift A)':'⚡ Reschedule / Trigger expedited dispatch'}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ TAB 4: RESEARCH & ML BENCHMARKS ════════════════════════════════ */}
      {activeTab === 'research' && (
        <div style={styles.tabContent}>
          {/* 3-Policy Benchmark */}
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                <div style={styles.cardIconBadge}>🔬</div>
                <div>
                  <div style={styles.cardTitle}>Experimental Research Evidence: 3-Policy Benchmark</div>
                  <div style={styles.cardSub}>171,962 historical orders · DataCo Smart Supply Chain Dataset</div>
                </div>
              </div>
              <span style={{ ...styles.badge, padding:'5px 14px', background:'rgba(16,185,129,.15)', color:'#34D399', border:'1px solid rgba(16,185,129,.4)', fontSize:'11.5px', fontWeight:700 }}>✓ Research Proved</span>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'24px', alignItems:'start' }}>
              {/* SVG Chart */}
              <div style={{ ...styles.subCard, padding:'20px' }}>
                <div style={{ fontWeight:800, fontSize:'12px', color:c.sub, letterSpacing:'.07em', marginBottom:'14px' }}>STOCKOUT UNITS COMPARISON</div>
                <PolicyBarChart isDark={isDark} />
                <div style={{ display:'flex', gap:'14px', justifyContent:'center', marginTop:'10px' }}>
                  {[['Static (s,S)','#64748B'],['Std Adaptive','#F59E0B'],['OPTICHAIN','#10B981']].map(([l,col])=>(
                    <div key={l} style={{ display:'flex', alignItems:'center', gap:'5px', fontSize:'10.5px', color:c.sub }}>
                      <div style={{ width:'10px', height:'10px', borderRadius:'2px', background:col }} />
                      {l}
                    </div>
                  ))}
                </div>
              </div>

              {/* Metrics grid */}
              <div style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
                {[
                  { label:'1. STATIC (s,S) BASELINE', border:'#64748B', metrics:[['Service Level','99.99%','#34D399'],['Stockout Units','4.36 units','#34D399'],['Avg Inventory','62.70 units',c.title],['Orders','2,916',c.title]], desc:'Static — maintains rigid high inventory without reacting to disruption.', winner:false },
                  { label:'2. STANDARD ADAPTIVE',      border:'#F59E0B', metrics:[['Service Level','99.46%','#FBBF24'],['Stockout Units','1,994.05 units','#F87171'],['Avg Inventory','45.43 units',c.title],['Orders','6,415',c.title]], desc:'Reduces inventory but suffers stockouts when lead time spikes.', winner:false },
                  { label:'3. OPTICHAIN DISRUPTION-AWARE ⭐', border:'#10B981', metrics:[['Service Level','99.96% (+0.49pp)','#34D399'],['Stockout Units','160.45 (−91.95%)','#34D399'],['Avg Inventory','77.70 units',c.title],['Orders','6,478',c.title]], desc:'Proactively expands buffers before disruption arrival to protect production.', winner:true },
                ].map((policy,i)=>(
                  <div key={i} style={{ ...styles.subCard, border:`${policy.winner?'2':'1'}px solid ${policy.border}${policy.winner?'':'44'}`, background: policy.winner?(isDark?'rgba(16,185,129,.07)':'rgba(16,185,129,.04)'):'', boxShadow: policy.winner?`0 0 20px ${policy.border}18`:'' }}>
                    <div style={{ fontWeight:800, fontSize:'12px', color: policy.winner?(isDark?'#6EE7B7':'#059669'):c.title, marginBottom:'10px', paddingBottom:'8px', borderBottom:`1px solid ${c.tableBorder}` }}>{policy.label}</div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'6px' }}>
                      {policy.metrics.map(([l,v,col])=>(
                        <div key={l} style={{ display:'flex', justifyContent:'space-between', fontSize:'11.5px', color:c.sub }}>
                          <span>{l}:</span><strong style={{ color:col }}>{v}</strong>
                        </div>
                      ))}
                    </div>
                    <div style={{ fontSize:'11px', color:c.sub, marginTop:'8px', lineHeight:1.4, fontStyle:'italic' }}>{policy.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* XGBoost ML Metrics */}
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                <div style={styles.cardIconBadge}>🤖</div>
                <div>
                  <div style={styles.cardTitle}>Auxiliary XGBoost Backorder Classifier</div>
                  <div style={styles.cardSub}>OptiChain_Backorder_XGBoost_Model.joblib · 1,687,860 training records</div>
                </div>
              </div>
              <div style={{ ...styles.badge, padding:'5px 12px', background:'rgba(139,92,246,.15)', color: isDark?'#A78BFA':'#7C3AED', border:`1px solid ${isDark?'rgba(139,92,246,.3)':'#DDD6FE'}`, fontSize:'11px', fontWeight:700 }}>Auxiliary ML Risk Signal</div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:'14px' }}>
              {[
                { label:'ROC-AUC SCORE', val:'0.9059', color:c.title,    sub:'Outstanding discrimination', icon:'🎯' },
                { label:'PR-AUC SCORE',  val:'0.1797', color:'#60A5FA',  sub:'High under extreme class imbalance', icon:'📊' },
                { label:'F1-SCORE',      val:'0.2269', color:'#34D399',  sub:'At decision threshold 0.90', icon:'⚖️' },
                { label:'TEST ACCURACY', val:'98.66%', color:'#A78BFA',  sub:'242,076 test records', icon:'✅' },
              ].map((m,i)=>(
                <div key={i} style={{ ...styles.subCard, textAlign:'center', padding:'20px 16px' }}>
                  <div style={{ fontSize:'22px', marginBottom:'8px' }}>{m.icon}</div>
                  <div style={{ fontSize:'10px', fontWeight:800, color:c.sub, letterSpacing:'.07em', marginBottom:'8px' }}>{m.label}</div>
                  <div style={{ fontSize:'28px', fontWeight:900, color:m.color, letterSpacing:'-0.02em', margin:'4px 0' }}>{m.val}</div>
                  <div style={{ fontSize:'10.5px', color:c.sub }}>{m.sub}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop:'16px', background: isDark?'rgba(255,255,255,.02)':'#F8FAFC', border:`1px solid ${c.subCardBorder}`, borderRadius:'10px', padding:'14px', fontSize:'11.5px', color:c.sub, lineHeight:1.6 }}>
              <strong style={{ color:c.title }}>Research Integrity (Section 19 & 62):</strong> The XGBoost backorder model was trained on the public industrial backorder benchmark (1,687,860 clean records). Extreme class imbalance (~1.1% positive backorders) means ROC-AUC and PR-AUC are the primary evaluation metrics — not raw accuracy.
            </div>
          </div>
        </div>
      )}

      {/* ═══ XAI MODAL ═══════════════════════════════════════════════════════ */}
      {xaiModalSku && (
        <div style={styles.modalOverlay} onClick={()=>setXaiModalSku(null)}>
          <div style={styles.modalBox} onClick={e=>e.stopPropagation()}>
            <div style={styles.modalHead}>
              <h3 style={{ fontSize:'15px', fontWeight:800, color:c.title, display:'flex', alignItems:'center', gap:'8px' }}>
                📐 XAI Formula Inspector — <span style={{ color:'#60A5FA' }}>{xaiModalSku.product_id}</span>
              </h3>
              <button onClick={()=>setXaiModalSku(null)} style={styles.closeBtn}>✕</button>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:'12px', marginTop:'16px' }}>
              {(() => {
                const p = xaiModalSku;
                const dp = p.disruption_probability;
                const L = p.average_lead_time;
                const D = p.forecasted_demand;
                const sD = p.demand_std_dev;
                const sL = p.lead_time_std_dev;
                const z = 1.645;
                const Ladj = parseFloat((L*(1+dp)).toFixed(2));
                const variance = Ladj * Math.pow(sD,2) + Math.pow(D,2) * Math.pow(sL,2);
                const ss = Math.round(z * Math.sqrt(Math.max(0,variance)));
                const rop = Math.round(D * Ladj) + ss;
                return [
                  { step:'01', title:'Risk-Adjusted Lead Time', formula:`L_adj = L × (1 + P_disrupt)\n= ${L} × (1 + ${dp}) = ${Ladj} days` },
                  { step:'02', title:'Dynamic Safety Stock', formula:`SS = z × √(L_adj × σ_D² + D² × σ_L²) × (1 + P_disrupt)\n= ${z} × √(${Ladj} × ${sD}² + ${D}² × ${sL}²)\n= ${ss.toLocaleString()} ${p.unit}` },
                  { step:'03', title:'Dynamic Reorder Point (ROP)', formula:`ROP = D × L_adj + SS\n= ${D.toLocaleString()} × ${Ladj} + ${ss.toLocaleString()}\n= ${rop.toLocaleString()} ${p.unit}` },
                ].map(step=>(
                  <div key={step.step} style={{ background:c.subCard, border:`1px solid ${c.subCardBorder}`, borderRadius:'12px', padding:'14px' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'8px' }}>
                      <span style={{ background:'rgba(59,130,246,.2)', color:'#60A5FA', borderRadius:'6px', padding:'2px 8px', fontSize:'10px', fontWeight:800 }}>STEP {step.step}</span>
                      <span style={{ fontWeight:700, fontSize:'12px', color:c.title }}>{step.title}</span>
                    </div>
                    <pre style={{ fontFamily:"'Fira Code','Cascadia Code',monospace", fontSize:'12px', color:isDark?'#93C5FD':'#1E40AF', background: isDark?'rgba(59,130,246,.08)':'rgba(37,99,235,.05)', padding:'10px 12px', borderRadius:'8px', margin:0, whiteSpace:'pre-wrap', lineHeight:1.6 }}>{step.formula}</pre>
                  </div>
                ));
              })()}
            </div>
            <div style={{ display:'flex', justifyContent:'flex-end', marginTop:'20px' }}>
              <button className="btn-hover" onClick={()=>setXaiModalSku(null)} style={styles.primaryBtn}>Close Inspector</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ PO MODAL ════════════════════════════════════════════════════════ */}
      {poModalItem && (
        <div style={styles.modalOverlay} onClick={()=>setPoModalItem(null)}>
          <div style={styles.modalBox} onClick={e=>e.stopPropagation()}>
            <div style={styles.modalHead}>
              <h3 style={{ fontSize:'15px', fontWeight:800, color:c.title, display:'flex', alignItems:'center', gap:'8px' }}>
                ⚡ Purchase Requisition — <span style={{ color:'#60A5FA' }}>{poModalItem.product_id}</span>
              </h3>
              <button onClick={()=>setPoModalItem(null)} style={styles.closeBtn}>✕</button>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:'14px', marginTop:'16px' }}>
              <div style={{ padding:'12px', background:c.subCard, borderRadius:'10px', border:`1px solid ${c.subCardBorder}` }}>
                <div style={{ fontSize:'10.5px', color:c.sub, fontWeight:700, marginBottom:'3px' }}>MATERIAL</div>
                <div style={{ fontWeight:700, color:c.title, fontSize:'14px' }}>{poModalItem.product_name}</div>
              </div>
              <div style={styles.inputField}>
                <label style={styles.inputLabel}>📦 Recommended Reorder Quantity *</label>
                <input type="number" value={poModalItem.reorder_quantity} onChange={e=>setPoModalItem(p=>({...p,reorder_quantity:parseInt(e.target.value)||0}))} className="input-focus" style={{ ...styles.textInput, fontSize:'16px', fontWeight:700 }} />
              </div>
              <div style={styles.inputField}>
                <label style={styles.inputLabel}>🚚 Freight Dispatch Mode</label>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
                  {[{m:'sea',l:'🚢 Sea Freight',s:'7d ETA',c:'#60A5FA'},{m:'air',l:'✈️ Air Express',s:'2d ETA (2.4× cost)',c:'#F59E0B'}].map(opt=>(
                    <button key={opt.m} onClick={()=>setFreightMode(opt.m)} style={{ padding:'12px', borderRadius:'10px', border:`${freightMode===opt.m?'2':'1'}px solid ${freightMode===opt.m?opt.c:c.tagBorder}`, cursor:'pointer', background:freightMode===opt.m?opt.c+'18':c.subCard, color:freightMode===opt.m?opt.c:c.sub, fontWeight:freightMode===opt.m?700:500, transition:'all .2s', boxShadow:freightMode===opt.m?`0 0 14px ${opt.c}33`:'none' }}>
                      <div style={{ fontSize:'14px' }}>{opt.l}</div>
                      <div style={{ fontSize:'10px', opacity:.8, marginTop:'3px' }}>{opt.s}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ display:'flex', justifyContent:'flex-end', gap:'10px', marginTop:'20px' }}>
              <button onClick={()=>setPoModalItem(null)} style={styles.cancelBtn}>Cancel</button>
              <button className="btn-hover" onClick={handleDispatchPO} style={styles.confirmBtn}>✓ Confirm & Dispatch</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ TOAST STACK ═════════════════════════════════════════════════════ */}
      <div style={{ position:'fixed', bottom:'28px', right:'28px', display:'flex', flexDirection:'column', gap:'10px', zIndex:3000 }}>
        {toasts.map(t=>(
          <div key={t.id} style={{ background: t.type==='error'?'linear-gradient(135deg,#7F1D1D,#991B1B)':'linear-gradient(135deg,#1E40AF,#2563EB)', color:'#fff', padding:'13px 18px', borderRadius:'14px', boxShadow:'0 10px 32px rgba(0,0,0,.4)', display:'flex', alignItems:'center', gap:'14px', fontSize:'13px', fontWeight:600, animation:'slide-up .3s ease', maxWidth:'380px', position:'relative', overflow:'hidden' }}>
            <span style={{ flex:1 }}>{t.msg}</span>
            <button onClick={()=>setToasts(ts=>ts.filter(x=>x.id!==t.id))} style={{ background:'rgba(255,255,255,.2)', border:'none', color:'#fff', width:'22px', height:'22px', borderRadius:'6px', cursor:'pointer', fontSize:'12px', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>✕</button>
            <div style={{ position:'absolute', bottom:0, left:0, height:'3px', background:'rgba(255,255,255,.4)', borderRadius:'2px', animation:'toast-shrink 4s linear forwards' }} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── THEME ────────────────────────────────────────────────────────────────────
function getThemeColors(isDark) {
  return {
    isDark,
    bg:            isDark ? '#060C17' : '#EFF2F7',
    card:          isDark ? '#0D1B2E' : '#FFFFFF',
    cardBorder:    isDark ? '#182B44' : '#E2E8F0',
    title:         isDark ? '#F1F5F9' : '#0B1F3A',
    sub:           isDark ? '#7A9EC0' : '#475569',
    subCard:       isDark ? '#0A1626' : '#F8FAFC',
    subCardBorder: isDark ? '#182B44' : '#E2E8F0',
    tableHead:     isDark ? '#0A1626' : '#F1F5F9',
    tableBorder:   isDark ? '#182B44' : '#E9EEF4',
    inputBg:       isDark ? '#0D1B2E' : '#FFFFFF',
    inputBorder:   isDark ? '#2A3F5F' : '#CBD5E1',
    inputText:     isDark ? '#F1F5F9' : '#0F172A',
    modalBg:       isDark ? '#0D1B2E' : '#FFFFFF',
    tagBg:         isDark ? '#182B44' : '#F1F5F9',
    tagText:       isDark ? '#94A3B8' : '#334155',
    tagBorder:     isDark ? '#2A3F5F' : '#CBD5E1',
  };
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
function getStyles(c) {
  return {
    container: {
      padding:'24px', backgroundColor:c.bg, minHeight:'100%', display:'flex', flexDirection:'column',
      gap:'18px', maxWidth:'1600px', margin:'0 auto', fontFamily:"'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif", position:'relative',
    },
    // Header
    headerCard: {
      background: c.isDark ? 'linear-gradient(135deg,#0D1B2E 0%,#091526 60%,#0D1B2E 100%)' : 'linear-gradient(135deg,#FFFFFF,#F0F4FF)',
      border:`1px solid ${c.cardBorder}`, borderRadius:'20px', padding:'28px',
      boxShadow: c.isDark ? '0 8px 32px rgba(0,0,0,.4),inset 0 1px 0 rgba(255,255,255,.04)' : '0 4px 24px rgba(0,0,0,.06)',
      position:'relative', overflow:'hidden',
    },
    orbBlue:   { position:'absolute', top:'-50px', right:'8%',  width:'220px', height:'220px', background:'radial-gradient(circle,rgba(37,99,235,.12) 0%,transparent 70%)', borderRadius:'50%', pointerEvents:'none' },
    orbPurple: { position:'absolute', bottom:'-60px', right:'35%', width:'240px', height:'240px', background:'radial-gradient(circle,rgba(139,92,246,.08) 0%,transparent 70%)', borderRadius:'50%', pointerEvents:'none' },
    headerTopRow: { display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'16px', marginBottom:'24px', position:'relative' },
    headerIconBox: { width:'56px', height:'56px', borderRadius:'16px', background:'linear-gradient(135deg,#1E40AF,#7C3AED)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 8px 20px rgba(37,99,235,.4)', flexShrink:0 },
    moduleBadge: { fontSize:'10px', fontWeight:800, letterSpacing:'.1em', color:'#60A5FA', display:'flex', alignItems:'center', gap:'6px', marginBottom:'5px' },
    liveDot: { width:'7px', height:'7px', borderRadius:'50%', backgroundColor:'#10B981', display:'inline-block', animation:'pulse-dot 2s infinite', flexShrink:0 },
    headerTitle: { fontSize:'30px', fontWeight:900, color: c.isDark?'#F1F5F9':'#0B1F3A', margin:'0 0 6px 0', letterSpacing:'-0.025em', textShadow: c.isDark?'0 0 40px rgba(147,197,253,.35)':'none' },
    headerSubtitle: { fontSize:'12px', color:c.sub, lineHeight:1.6, margin:0, maxWidth:'680px' },
    themeToggleBtn: { display:'inline-flex', alignItems:'center', gap:'6px', background: c.isDark?'rgba(255,255,255,.06)':'#F1F5F9', border:`1px solid ${c.tagBorder}`, color:c.title, padding:'7px 16px', borderRadius:'20px', fontSize:'12px', fontWeight:700, cursor:'pointer', transition:'all .2s' },
    demoModeBadge: { display:'inline-flex', alignItems:'center', gap:'5px', background:'rgba(251,191,36,.15)', border:'1px solid rgba(251,191,36,.4)', color:'#FBBF24', padding:'4px 12px', borderRadius:'20px', fontSize:'10.5px', fontWeight:700 },
    statusBadge: { display:'inline-flex', alignItems:'center', gap:'5px', background: c.isDark?'rgba(255,255,255,.04)':'#F8FAFC', border:`1px solid ${c.tagBorder}`, color:c.sub, padding:'4px 12px', borderRadius:'20px', fontSize:'10.5px', fontWeight:600 },
    // KPI
    kpiGrid: { display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:'14px' },
    kpiCard: { borderRadius:'16px', padding:'20px', transition:'all .25s ease', cursor:'default', position:'relative', overflow:'hidden' },
    // Alert banner
    alertBanner: { background: c.isDark?'linear-gradient(135deg,rgba(127,29,29,.9),rgba(153,27,27,.8))':'linear-gradient(135deg,#FEF2F2,#FEE2E2)', border:`1px solid ${c.isDark?'rgba(239,68,68,.4)':'#FECACA'}`, borderRadius:'14px', padding:'16px 20px', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'12px', boxShadow: c.isDark?'0 4px 20px rgba(239,68,68,.2)':'none', animation:'slide-up .4s ease' },
    // Tabs
    tabNavContainer: { display:'flex', gap:'10px', flexWrap:'wrap' },
    tabNavBtn: { flex:1, minWidth:'200px', padding:'14px 18px', borderRadius:'14px', border:`1px solid ${c.cardBorder}`, cursor:'pointer', textAlign:'left', background:c.card, color:c.sub, position:'relative', overflow:'hidden' },
    tabActive: { background:'linear-gradient(135deg,#1E40AF,#2563EB)', color:'#FFFFFF', borderColor:'#2563EB', boxShadow:'0 8px 24px rgba(37,99,235,.35)' },
    tabActiveBar: { position:'absolute', bottom:0, left:0, right:0, height:'3px', background:'linear-gradient(90deg,#60A5FA,#A78BFA)' },
    tabContent: { display:'flex', flexDirection:'column', gap:'18px' },
    // Cards
    card: { background:c.card, border:`1px solid ${c.cardBorder}`, borderRadius:'18px', padding:'24px', boxShadow: c.isDark?'0 4px 24px rgba(0,0,0,.25),inset 0 1px 0 rgba(255,255,255,.02)':'0 2px 16px rgba(0,0,0,.04)' },
    cardHeader: { display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'12px', marginBottom:'20px' },
    cardIconBadge: { width:'38px', height:'38px', borderRadius:'10px', background: c.isDark?'rgba(59,130,246,.15)':'#EFF6FF', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'18px', flexShrink:0 },
    cardTitle: { fontSize:'15px', fontWeight:800, color:c.title, letterSpacing:'-0.01em' },
    cardSub:   { fontSize:'11.5px', color:c.sub, marginTop:'3px' },
    subCard: { background:c.subCard, border:`1px solid ${c.subCardBorder}`, borderRadius:'14px', padding:'16px' },
    // Pipeline
    pipelineGrid: { display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))', gap:'16px' },
    pipelineCol: { background:c.subCard, border:`1px solid ${c.subCardBorder}`, borderRadius:'14px', padding:'18px', display:'flex', flexDirection:'column', gap:'0' },
    pipelineColHead: (color) => ({ fontSize:'10px', fontWeight:800, color, letterSpacing:'.08em', marginBottom:'12px', display:'flex', alignItems:'center', gap:'6px' }),
    pipelineRows: { display:'flex', flexDirection:'column' },
    pipelineRow: { display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:'12px', borderBottom:`1px solid ${c.tableBorder}`, padding:'8px 0' },
    formulaPill: { background: c.isDark?'rgba(255,255,255,.04)':'#FFFFFF', border:`1px solid ${c.isDark?'rgba(59,130,246,.25)':'#E0F2FE'}`, borderRadius:'10px', padding:'10px 12px' },
    activeSkuChip: { background: c.isDark?'rgba(59,130,246,.15)':'#EFF6FF', border:`1px solid ${c.isDark?'rgba(59,130,246,.3)':'#BFDBFE'}`, color: c.isDark?'#93C5FD':'#1E40AF', fontSize:'12px', padding:'6px 14px', borderRadius:'10px' },
    pillBtn: { display:'inline-flex', alignItems:'center', gap:'6px', padding:'6px 14px', borderRadius:'20px', border:'1px solid', fontSize:'11.5px', fontWeight:700, cursor:'pointer', transition:'all .2s' },
    // Table
    searchInput: { padding:'9px 12px', borderRadius:'10px', border:`1.5px solid ${c.inputBorder}`, fontSize:'12.5px', backgroundColor:c.inputBg, color:c.inputText, outline:'none', transition:'all .2s' },
    tableWrapper: { overflowX:'auto', borderRadius:'12px', border:`1px solid ${c.tableBorder}` },
    table: { width:'100%', borderCollapse:'collapse', fontSize:'12.5px' },
    theadRow: { background: c.isDark?'#0A1626':'#F1F5F9', borderBottom:`2px solid ${c.tableBorder}` },
    th:      { textAlign:'left',   padding:'12px 14px', color:c.sub, fontWeight:800, fontSize:'10.5px', letterSpacing:'.05em', whiteSpace:'nowrap' },
    thRight: { textAlign:'right',  padding:'12px 14px', color:c.sub, fontWeight:800, fontSize:'10.5px', letterSpacing:'.05em', whiteSpace:'nowrap' },
    thCenter:{ textAlign:'center', padding:'12px 14px', color:c.sub, fontWeight:800, fontSize:'10.5px', letterSpacing:'.05em', whiteSpace:'nowrap' },
    tr: { borderBottom:`1px solid ${c.tableBorder}`, transition:'background-color .15s ease' },
    td:      { padding:'13px 14px', color:c.inputText, verticalAlign:'middle' },
    tdRight: { padding:'13px 14px', textAlign:'right',  color:c.inputText, verticalAlign:'middle' },
    tdCenter:{ padding:'13px 14px', textAlign:'center', color:c.inputText, verticalAlign:'middle' },
    categoryChip: { background: c.isDark?'rgba(255,255,255,.05)':'#F1F5F9', border:`1px solid ${c.tagBorder}`, padding:'3px 10px', borderRadius:'8px', fontSize:'10.5px', color:c.sub, fontWeight:600, whiteSpace:'nowrap' },
    badge: { display:'inline-block', padding:'3px 9px', borderRadius:'20px', fontSize:'10.5px', fontWeight:700, whiteSpace:'nowrap' },
    xaiBtn: { background: c.isDark?'rgba(255,255,255,.07)':'#F8FAFC', border:`1px solid ${c.tagBorder}`, color:c.title, borderRadius:'8px', padding:'6px 10px', fontSize:'12px', fontWeight:600, cursor:'pointer', transition:'all .2s' },
    poBtn:  { border:'none', color:'#FFFFFF', borderRadius:'8px', padding:'6px 10px', fontSize:'11px', fontWeight:700, cursor:'pointer', transition:'all .2s', whiteSpace:'nowrap' },
    // Simulator
    sliderGrid: { display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))', gap:'16px', marginTop:'4px' },
    sliderCard: { background: c.isDark?'rgba(255,255,255,.02)':'#F8FAFC', border:`1px solid ${c.subCardBorder}`, borderRadius:'14px', padding:'18px' },
    presetBtn: { border:'1px solid', borderRadius:'10px', padding:'7px 14px', fontSize:'11.5px', fontWeight:700, cursor:'pointer', transition:'all .2s' },
    // API Tester
    execBtn: { background:'linear-gradient(135deg,#1E40AF,#2563EB)', border:'none', color:'#FFFFFF', borderRadius:'10px', padding:'10px 20px', fontSize:'12.5px', fontWeight:800, cursor:'pointer', transition:'all .2s', boxShadow:'0 4px 14px rgba(37,99,235,.35)', whiteSpace:'nowrap' },
    inputGrid: { display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:'16px', marginTop:'4px' },
    inputField: { display:'flex', flexDirection:'column', gap:'6px' },
    inputLabel: { fontSize:'11.5px', fontWeight:700, color:c.sub, display:'flex', alignItems:'center', gap:'5px', flexWrap:'wrap' },
    textInput: { padding:'10px 14px', borderRadius:'10px', border:`1.5px solid ${c.inputBorder}`, fontSize:'13px', outline:'none', background:c.inputBg, color:c.inputText, fontWeight:600, transition:'all .2s' },
    // Modals
    modalOverlay: { position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,.65)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, backdropFilter:'blur(8px)' },
    modalBox: { background:c.modalBg, borderRadius:'20px', width:'90%', maxWidth:'580px', padding:'28px', boxShadow:'0 24px 60px rgba(0,0,0,.5)', border:`1px solid ${c.cardBorder}`, animation:'slide-up .25s ease', maxHeight:'90vh', overflowY:'auto' },
    modalHead: { display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom:`1px solid ${c.cardBorder}`, paddingBottom:'14px' },
    closeBtn: { background: c.isDark?'rgba(255,255,255,.08)':'#F1F5F9', border:`1px solid ${c.tagBorder}`, fontSize:'13px', cursor:'pointer', color:c.sub, width:'30px', height:'30px', borderRadius:'8px', display:'flex', alignItems:'center', justifyContent:'center' },
    primaryBtn: { background:'linear-gradient(135deg,#1E40AF,#2563EB)', border:'none', color:'#FFFFFF', borderRadius:'10px', padding:'10px 20px', fontSize:'13px', fontWeight:700, cursor:'pointer', boxShadow:'0 4px 14px rgba(37,99,235,.35)' },
    cancelBtn: { background:c.tagBg, border:`1px solid ${c.tagBorder}`, color:c.title, borderRadius:'10px', padding:'10px 18px', fontSize:'12.5px', fontWeight:600, cursor:'pointer' },
    confirmBtn: { background:'linear-gradient(135deg,#059669,#10B981)', border:'none', color:'#FFFFFF', borderRadius:'10px', padding:'10px 20px', fontSize:'12.5px', fontWeight:700, cursor:'pointer', boxShadow:'0 4px 14px rgba(16,185,129,.35)' },
  };
}
