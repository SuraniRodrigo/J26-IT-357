import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  optimizeInventoryDetailed,
  getInventorySummary,
  getInventoryProducts,
  runScenarioAnalysis,
  getProductionInterface,
  getResearchResults,
  createInventoryProduct,
  updateInventoryProduct,
  deleteInventoryProduct,
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

// ─── Animated counter hook ───────────────────────────────────────────────────
function useAnimatedCounter(target, duration = 1600) {
  const [val, setVal] = useState(0);
  const started = useRef(false);
  useEffect(() => {
    if (started.current || !target) return;
    started.current = true;
    const t0 = performance.now();
    const tick = (now) => {
      const p = Math.min((now - t0) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(eased * target));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target, duration]);
  return val;
}

// ─── SVG Mini Sparkline for Modern KPI Cards ─────────────────────────────────
function MiniSparkline({ data = [20, 24, 22, 28, 30, 38, 45], color = '#10B981', isDark }) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const W = 84, H = 26;
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * W;
      const y = H - ((v - min) / range) * (H - 8) - 4;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  const firstPt = points.split(' ')[0];
  const lastPt = points.split(' ')[points.split(' ').length - 1];
  const areaPath = `M ${firstPt} L ${points} L ${W},${H} L 0,${H} Z`;
  const gradId = `spark-${color.replace(/[^a-zA-Z0-9]/g, '')}`;

  return (
    <svg width={W} height={H} style={{ overflow: 'visible', flexShrink: 0 }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={isDark ? 0.45 : 0.28} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradId})`} />
      <polyline fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={points} />
      <circle cx={W} cy={lastPt.split(',')[1]} r="3" fill={color} />
    </svg>
  );
}

// ─── Material category image thumbnail (High contrast & Light Mode safe) ────
function MaterialThumb({ category, isDark }) {
  const map = {
    'Fabrics': {
      img: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=96&h=96&fit=crop&q=80',
      color: '#2563EB',
      emoji: '🧵',
      label: 'Fabric Roll'
    },
    'Dyes & Chemicals': {
      img: 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=96&h=96&fit=crop&q=80',
      color: '#7C3AED',
      emoji: '🧪',
      label: 'Dye Compound'
    },
    'Trims & Fasteners': {
      img: 'https://images.unsplash.com/photo-1605518216938-7c31b7b14ad0?w=96&h=96&fit=crop&q=80',
      color: '#D97706',
      emoji: '🔩',
      label: 'Fasteners'
    },
    'Yarns & Threads': {
      img: 'https://images.unsplash.com/photo-1564419320461-6870880221ad?w=96&h=96&fit=crop&q=80',
      color: '#059669',
      emoji: '🧶',
      label: 'Spun Yarn'
    },
  };
  const m = map[category] || { img: null, color: '#64748B', emoji: '📦', label: 'Material' };
  const [loaded, setLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  return (
    <div
      style={{
        width: 38,
        height: 38,
        borderRadius: '9px',
        overflow: 'hidden',
        border: `1.5px solid ${isDark ? m.color + '55' : m.color + '60'}`,
        flexShrink: 0,
        background: isDark ? 'rgba(15,23,42,0.85)' : '#FFFFFF',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        boxShadow: isDark ? '0 2px 8px rgba(0,0,0,0.35)' : '0 2px 6px rgba(0,0,0,0.08)',
      }}
      title={`${category} — ${m.label}`}
    >
      {m.img && !hasError && (
        <img
          src={m.img}
          alt={category}
          referrerPolicy="no-referrer"
          loading="eager"
          onLoad={() => setLoaded(true)}
          onError={() => setHasError(true)}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: loaded ? 1 : 0,
            transition: 'opacity .3s ease',
          }}
        />
      )}
      {(!loaded || hasError) && (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: isDark ? `${m.color}20` : `${m.color}15`,
            fontSize: '17px',
          }}
        >
          {m.emoji}
        </div>
      )}
    </div>
  );
}

// ─── Supplier origin world map (High-Contrast Light & Dark Mode) ─────────────
function SupplierWorldMap({ isDark }) {
  const W = 620, H = 275;
  const factory = { x: 315, y: 228 };
  const nodes = [
    { x: 425, y: 88,  label: 'Guangzhou', country: '🇨🇳', sub: 'China',      trust: 72, skus: 3, color: '#D97706' },
    { x: 268, y: 158, label: 'Dhaka',     country: '🇧🇩', sub: 'Bangladesh', trust: 45, skus: 2, color: '#DC2626' },
    { x: 278, y: 185, label: 'Mumbai',    country: '🇮🇳', sub: 'India',       trust: 81, skus: 2, color: '#059669' },
    { x: 450, y: 165, label: 'Ho Chi Minh',country:'🇻🇳', sub: 'Vietnam',    trust: 65, skus: 1, color: '#2563EB' },
  ];

  // Colors tuned for maximum clarity and contrast in both themes
  const tc = isDark ? '#94A3B8' : '#0F172A';
  const subTc = isDark ? '#64748B' : '#475569';
  const landFill = isDark ? 'rgba(30,58,95,0.7)' : '#CBD5E1';
  const landStroke = isDark ? 'rgba(96,165,250,0.5)' : '#2563EB';
  const gridColor = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(100,116,139,0.12)';

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', maxHeight: 275, borderRadius: '12px', overflow: 'hidden', border: `1px solid ${isDark ? 'rgba(59,130,246,0.2)' : '#E2E8F0'}` }}>
        <defs>
          <radialGradient id="factGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#2563EB" stopOpacity="0.6"/>
            <stop offset="100%" stopColor="#2563EB" stopOpacity="0"/>
          </radialGradient>
          <radialGradient id="oceanBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={isDark ? '#060C17' : '#F8FAFC'} />
            <stop offset="100%" stopColor={isDark ? '#0A1628' : '#EEF2F6'} />
          </radialGradient>
        </defs>
        <rect width={W} height={H} fill="url(#oceanBg)" />

        {/* Coordinate Grid */}
        {[1, 2, 3, 4, 5].map(i => <line key={`v${i}`} x1={i * 100} y1={0} x2={i * 100} y2={H} stroke={gridColor} strokeWidth="1" />)}
        {[1, 2, 3].map(i => <line key={`h${i}`} x1={0} y1={i * 70} x2={W} y2={i * 70} stroke={gridColor} strokeWidth="1" />)}

        {/* Land masses (Asia & Indian Subcontinent) */}
        <path d="M238,118 Q260,110 282,128 Q293,155 288,188 Q283,215 315,228 Q318,242 302,248 Q272,242 256,222 Q234,197 238,170 Q232,144 238,118Z" fill={landFill} stroke={landStroke} strokeWidth="1.5" />
        <ellipse cx="315" cy="238" rx="10" ry="12" fill={isDark ? '#1E3A5F' : '#93C5FD'} stroke="#2563EB" strokeWidth="1.5" />
        <path d="M378,116 Q432,98 472,108 Q494,128 482,162 Q462,178 442,172 Q418,167 398,152 Q382,136 378,116Z" fill={landFill} stroke={landStroke} strokeWidth="1.5" />
        <ellipse cx="270" cy="162" rx="18" ry="14" fill={landFill} stroke={landStroke} strokeWidth="1.5" />
        <path d="M318,56 Q402,46 464,68 Q494,88 472,114 Q442,104 390,98 Q348,93 318,78 Q308,68 318,56Z" fill={landFill} stroke={landStroke} strokeWidth="1.5" />

        {/* Animated Freight Routes */}
        {nodes.map((n, i) => (
          <g key={i}>
            <line x1={n.x} y1={n.y} x2={factory.x} y2={factory.y} stroke={n.color} strokeWidth="1.8" strokeDasharray="7 5" opacity="0.65">
              <animate attributeName="stroke-dashoffset" values="0;-24" dur={`${1.8 + i * 0.35}s`} repeatCount="indefinite" />
            </line>
            {/* Moving freight dot */}
            <circle r="3.5" fill={n.color} stroke="#fff" strokeWidth="0.8">
              <animateMotion dur={`${2.5 + i * 0.4}s`} repeatCount="indefinite" path={`M${n.x},${n.y} L${factory.x},${factory.y}`} />
            </circle>
          </g>
        ))}

        {/* Factory Glow & Pulse Ring (Sri Lanka Hub) */}
        <circle cx={factory.x} cy={factory.y} r="28" fill="url(#factGlow)" />
        <circle cx={factory.x} cy={factory.y} r="14" fill="none" stroke="#2563EB" strokeWidth="1.5" opacity="0.6">
          <animate attributeName="r" values="14;24;14" dur="2.5s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.6;0;0.6" dur="2.5s" repeatCount="indefinite" />
        </circle>
        <circle cx={factory.x} cy={factory.y} r="10" fill="#2563EB" stroke="#fff" strokeWidth="2.5" />
        <text x={factory.x} y={factory.y - 18} textAnchor="middle" fontSize="10" fontWeight="900" fill={isDark ? '#60A5FA' : '#1D4ED8'}>🏭 MAS Factory</text>
        <text x={factory.x} y={factory.y - 8} textAnchor="middle" fontSize="8" fontWeight="700" fill={tc}>Colombo, Sri Lanka</text>

        {/* Sourcing Nodes */}
        {nodes.map((n, i) => (
          <g key={i}>
            <circle cx={n.x} cy={n.y} r="18" fill={`${n.color}20`} stroke={n.color} strokeWidth="1.2" opacity="0.7">
              <animate attributeName="r" values="18;23;18" dur={`${2.8 + i * 0.5}s`} repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.7;0.2;0.7" dur={`${2.8 + i * 0.5}s`} repeatCount="indefinite" />
            </circle>
            <circle cx={n.x} cy={n.y} r="7" fill={n.color} stroke="#fff" strokeWidth="1.8" />
            <text x={n.x} y={n.y - 17} textAnchor="middle" fontSize="9.5" fontWeight="800" fill={tc}>{n.country} {n.sub}</text>
            <text x={n.x} y={n.y - 8} textAnchor="middle" fontSize="7.5" fontWeight="600" fill={subTc}>{n.label}</text>
            <text x={n.x} y={n.y + 19} textAnchor="middle" fontSize="7.5" fill={n.color} fontWeight="800">Trust {n.trust}%</text>
          </g>
        ))}

        {/* Telemetry Header */}
        <text x="14" y="20" fontSize="9.5" fontWeight="900" fill={tc} letterSpacing="0.08em">LIVE SUPPLIER ORIGIN NETWORK</text>
        <text x="14" y="32" fontSize="8" fill={subTc}>Animated maritime & air freight routes · MAS Holdings Colombo Hub</text>
      </svg>

      {/* Supplier summary strip with high contrast */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '8px', marginTop: '12px' }}>
        {nodes.map((n, i) => (
          <div key={i} style={{ background: isDark ? 'rgba(255,255,255,0.03)' : '#FFFFFF', border: `1px solid ${isDark ? n.color + '35' : '#E2E8F0'}`, borderRadius: '10px', padding: '10px 12px', textAlign: 'center', boxShadow: isDark ? 'none' : '0 2px 8px rgba(0,0,0,0.04)' }}>
            <div style={{ fontSize: '20px', marginBottom: '3px' }}>{n.country}</div>
            <div style={{ fontSize: '11px', fontWeight: 800, color: n.color }}>{n.label}</div>
            <div style={{ fontSize: '9.5px', color: subTc, margin: '2px 0 6px 0', fontWeight: 600 }}>{n.skus} SKUs · {n.sub}</div>
            <div style={{ height: '5px', borderRadius: '4px', background: isDark ? 'rgba(100,116,139,0.2)' : '#E2E8F0', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${n.trust}%`, background: `linear-gradient(90deg,${n.color},${n.color}DD)`, borderRadius: '4px', transition: 'width 1.2s ease' }} />
            </div>
            <div style={{ fontSize: '9px', color: isDark ? '#7A9EC0' : '#475569', marginTop: '4px', fontWeight: 700 }}>Trust Score: {n.trust}%</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Live activity feed ──────────────────────────────────────────────────────
function ActivityFeed({ productsList, isDark }) {
  const events = useMemo(() => {
    const list = [];
    productsList.forEach(p => {
      if (p.disruption_probability >= 0.7)
        list.push({ icon:'🚨', msg:`${p.product_id} — Critical disruption risk (${Math.round(p.disruption_probability*100)}%)`, color:'#EF4444', time:'2m ago', type:'critical' });
      if (p.current_inventory < p.forecasted_demand * 0.35)
        list.push({ icon:'⚠️', msg:`${p.product_id} — Stock below safety buffer threshold`, color:'#F59E0B', time:'5m ago', type:'warn' });
    });
    list.push({ icon:'🔄', msg:'Inventory optimization cycle completed', color:'#10B981', time:'8m ago', type:'info' });
    list.push({ icon:'📊', msg:'14-day demand forecast model updated', color:'#60A5FA', time:'15m ago', type:'info' });
    list.push({ icon:'📡', msg:'Upstream supplier signals refreshed from mock feed', color:'#A78BFA', time:'22m ago', type:'info' });
    list.push({ icon:'✅', msg:'YRN-018 safety buffer met — reorder cleared', color:'#10B981', time:'1h ago', type:'info' });
    list.push({ icon:'🚢', msg:'Sea freight route SL↔CN operational — 7d ETA normal', color:'#60A5FA', time:'2h ago', type:'info' });
    return list.slice(0, 8);
  }, [productsList]);

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'7px' }}>
      {events.map((ev,i)=>(
        <div key={i} style={{ display:'flex', gap:'10px', alignItems:'flex-start', background:isDark?'rgba(255,255,255,0.025)':'#F8FAFC', borderRadius:'10px', padding:'9px 12px', border:`1px solid ${ev.color}20`, animation:'slide-up .35s ease', animationDelay:`${i*0.06}s`, animationFillMode:'both' }}>
          <span style={{ fontSize:'14px', flexShrink:0, marginTop:'1px' }}>{ev.icon}</span>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:'11px', fontWeight:600, color:isDark?'#E2E8F0':'#1E293B', lineHeight:1.4 }}>{ev.msg}</div>
            <div style={{ fontSize:'9.5px', color:isDark?'#7A9EC0':'#64748B', marginTop:'2px' }}>{ev.time}</div>
          </div>
          <div style={{ width:'6px', height:'6px', borderRadius:'50%', background:ev.color, flexShrink:0, marginTop:'5px', boxShadow:`0 0 8px ${ev.color}80` }}/>
        </div>
      ))}
    </div>
  );
}

// ─── Module 4 Production Line Contract Metadata ──────────────────────────────
const LINE_METADATA = {
  'FAB-001': { line: 'Line 01 · T-Shirts & Polos', shortLine: 'Line 01', shift: 'Shift A (06:00)', shiftId: 'Shift A', order: 'WO-MAS-7721', rate: '850 pcs/hr', downtimeCost: 3500, category: 'Fabrics' },
  'DYE-008': { line: 'Dyeing Bay 03 · Continuous Vat', shortLine: 'Bay 03', shift: 'Shift A (06:00)', shiftId: 'Shift A', order: 'WO-MAS-8842', rate: '1,200 kg/hr', downtimeCost: 4200, category: 'Dyes & Chemicals' },
  'TRM-015': { line: 'Line 04 · Outerwear & Zips', shortLine: 'Line 04', shift: 'Shift B (14:00)', shiftId: 'Shift B', order: 'WO-MAS-6910', rate: '420 pcs/hr', downtimeCost: 2800, category: 'Accessories' },
  'YRN-042': { line: 'Knitting Unit 02 · Circular 28G', shortLine: 'Knit 02', shift: 'Shift A (06:00)', shiftId: 'Shift A', order: 'WO-MAS-9934', rate: '940 kg/hr', downtimeCost: 1900, category: 'Fabrics' },
  'FAB-002': { line: 'Line 02 · Sportswear Leggings', shortLine: 'Line 02', shift: 'Shift B (14:00)', shiftId: 'Shift B', order: 'WO-MAS-5541', rate: '680 pcs/hr', downtimeCost: 4800, category: 'Fabrics' },
  'TRM-022': { line: 'Line 05 · Jackets & Hoodies', shortLine: 'Line 05', shift: 'Shift A (06:00)', shiftId: 'Shift A', order: 'WO-MAS-3312', rate: '510 pcs/hr', downtimeCost: 3100, category: 'Accessories' },
  'CHM-005': { line: 'Finishing & Wash Hub 01', shortLine: 'Wash 01', shift: 'Shift C (22:00)', shiftId: 'Shift C', order: 'WO-MAS-2245', rate: '1,500 L/hr', downtimeCost: 2400, category: 'Dyes & Chemicals' },
  'YRN-018': { line: 'Sewing Line 07 · Innerwear Basics', shortLine: 'Line 07', shift: 'Shift B (14:00)', shiftId: 'Shift B', order: 'WO-MAS-1198', rate: '1,100 pcs/hr', downtimeCost: 2600, category: 'Fabrics' },
};

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
  const [availabilityFilter, setAvailabilityFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState('cards'); // 'cards' | 'table'

  // ── Modals & PO ───────────────────────────────────────────────────────────
  const [xaiModalSku, setXaiModalSku] = useState(null);
  const [poModalItem, setPoModalItem] = useState(null);
  const [freightMode, setFreightMode] = useState('sea');
  const [dispatchedPOs, setDispatchedPOs] = useState({});
  const [showPoHistory, setShowPoHistory] = useState(false);
  const [drawerItem, setDrawerItem] = useState(null);
  const [toasts, setToasts] = useState([]);

  // ── Module 4 Readiness & Line Handoff ─────────────────────────────────────
  const [readinessFilter, setReadinessFilter] = useState('ALL');
  const [readinessShift, setReadinessShift] = useState('ALL');
  const [simulateExpeditedArrival, setSimulateExpeditedArrival] = useState(false);
  const [showContractModal, setShowContractModal] = useState(false);
  const [releasedGates, setReleasedGates] = useState({});

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
      if (prodRes?.length) {
        setProductsList(prodRes);
        setSelectedSku(prev => (prodRes.some(p => p.product_id === prev) ? prev : prodRes[0].product_id));
      }
      if (piRes) setProductionInterfaceData(piRes);
      // Fetch persisted POs from SQLite
      fetch('http://localhost:8000/api/inventory/purchase-orders')
        .then(r => r.json())
        .then(data => {
          if (Array.isArray(data) && data.length) {
            const poMap = {};
            data.forEach(po => {
              poMap[po.product_id] = {
                poNum: po.po_number,
                qty: po.quantity,
                cost: po.estimated_cost_usd,
                mode: po.freight_mode,
                at: new Date(po.dispatched_at).toLocaleTimeString(),
                sku: po.product_id,
                name: po.product_name,
              };
            });
            setDispatchedPOs(poMap);
          }
        })
        .catch(() => {});
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
  const handleDispatchPO = async () => {
    if (!poModalItem) return;
    const poNum = `PO-${Math.floor(100000 + Math.random() * 900000)}`;
    const costPerUnit = poModalItem.category === 'Fabrics' ? 8.5 : poModalItem.category === 'Dyes & Chemicals' ? 24.0 : 0.45;
    const totalCost = Math.round(poModalItem.reorder_quantity * costPerUnit * (freightMode === 'air' ? 2.4 : 1.0));

    try {
      await fetch('http://localhost:8000/api/inventory/purchase-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          po_number: poNum,
          product_id: poModalItem.product_id,
          product_name: poModalItem.product_name,
          quantity: poModalItem.reorder_quantity,
          freight_mode: freightMode,
          estimated_cost_usd: totalCost,
        }),
      });
    } catch (e) {
      console.warn('Failed to save PO to SQLite:', e);
    }

    setDispatchedPOs(prev => ({
      ...prev,
      [poModalItem.product_id]: { poNum, qty: poModalItem.reorder_quantity, cost: totalCost, mode: freightMode, at: new Date().toLocaleTimeString(), sku: poModalItem.product_id, name: poModalItem.product_name },
    }));
    showToast(`Purchase Order #${poNum} saved to SQLite & dispatched to ERP ✓`);
    setPoModalItem(null);
  };

  // ── Material CRUD State & Handlers ────────────────────────────────────────
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    product_id: '',
    product_name: '',
    category: 'Fabrics',
    unit: 'kg',
    current_inventory: 1000,
    forecasted_demand: 10000,
    average_lead_time: 7.0,
    lead_time_std_dev: 1.5,
    disruption_probability: 0.35,
    supplier_trust_score: 75.0,
  });
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false);

  const [editModalItem, setEditModalItem] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  const [deleteConfirmItem, setDeleteConfirmItem] = useState(null);
  const [isSubmittingDelete, setIsSubmittingDelete] = useState(false);

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    if (!addForm.product_id.trim() || !addForm.product_name.trim()) {
      showToast('Please provide both Product ID and Material Name.', 'error');
      return;
    }
    try {
      setIsSubmittingAdd(true);
      const created = await createInventoryProduct({
        ...addForm,
        product_id: addForm.product_id.trim().toUpperCase(),
        current_inventory: parseFloat(addForm.current_inventory) || 0,
        forecasted_demand: parseFloat(addForm.forecasted_demand) || 0,
        average_lead_time: parseFloat(addForm.average_lead_time) || 1,
        lead_time_std_dev: parseFloat(addForm.lead_time_std_dev) || 1,
        disruption_probability: parseFloat(addForm.disruption_probability) || 0,
        supplier_trust_score: parseFloat(addForm.supplier_trust_score) || 50,
      });
      showToast(`✓ Material ${created.product_id} added successfully`);
      setIsAddModalOpen(false);
      setAddForm({
        product_id: '',
        product_name: '',
        category: 'Fabrics',
        unit: 'kg',
        current_inventory: 1000,
        forecasted_demand: 10000,
        average_lead_time: 7.0,
        lead_time_std_dev: 1.5,
        disruption_probability: 0.35,
        supplier_trust_score: 75.0,
      });
      await fetchAll();
      setSelectedSku(created.product_id);
    } catch (err) {
      showToast(`Creation failed: ${err.message || 'Error'}`, 'error');
    } finally {
      setIsSubmittingAdd(false);
    }
  };

  const openEditModal = (item) => {
    setEditModalItem(item);
    setEditForm({
      product_name: item.product_name,
      category: item.category,
      unit: item.unit,
      current_inventory: item.current_inventory,
      forecasted_demand: item.forecasted_demand,
      average_lead_time: item.average_lead_time,
      lead_time_std_dev: item.lead_time_std_dev,
      disruption_probability: item.disruption_probability,
      supplier_trust_score: item.supplier_trust_score,
    });
  };

  const handleUpdateProduct = async (e) => {
    e.preventDefault();
    if (!editModalItem) return;
    try {
      setIsSubmittingEdit(true);
      await updateInventoryProduct(editModalItem.product_id, {
        product_name: editForm.product_name,
        category: editForm.category,
        unit: editForm.unit,
        current_inventory: parseFloat(editForm.current_inventory) || 0,
        forecasted_demand: parseFloat(editForm.forecasted_demand) || 0,
        average_lead_time: parseFloat(editForm.average_lead_time) || 1,
        lead_time_std_dev: parseFloat(editForm.lead_time_std_dev) || 1,
        disruption_probability: parseFloat(editForm.disruption_probability) || 0,
        supplier_trust_score: parseFloat(editForm.supplier_trust_score) || 50,
      });
      showToast(`✓ Material ${editModalItem.product_id} updated`);
      setEditModalItem(null);
      await fetchAll();
    } catch (err) {
      showToast(`Update failed: ${err.message || 'Error'}`, 'error');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleDeleteProduct = async () => {
    if (!deleteConfirmItem) return;
    try {
      setIsSubmittingDelete(true);
      await deleteInventoryProduct(deleteConfirmItem.product_id);
      showToast(`✓ Material ${deleteConfirmItem.product_id} deleted`);
      setDeleteConfirmItem(null);
      await fetchAll();
      if (selectedSku === deleteConfirmItem.product_id) {
        setSelectedSku('FAB-001');
      }
    } catch (err) {
      showToast(`Delete failed: ${err.message || 'Error'}`, 'error');
    } finally {
      setIsSubmittingDelete(false);
    }
  };

  // ── ERP Export: CSV ───────────────────────────────────────────────────────
  const handleExportCSV = useCallback(() => {
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    const headers = [
      'SKU_ID','Material_Name','Category','Unit',
      'Current_Stock','14D_Forecast_Demand','Disruption_Risk_Pct',
      'Safety_Stock_Recommended','Safety_Stock_CI_Low','Safety_Stock_CI_High',
      'Reorder_Point','Recommended_ROQ',
      'Suggested_Freight_Mode','ERP_Procurement_Directive',
    ];
    const rows = productsList.map(p => {
      const r = calc(p, disruptionProb, leadTimeVar, demandSurge, serviceLevel);
      const freight = r.roq > p.forecasted_demand * 5 ? 'Air Express (Priority)' : 'Sea Freight (Standard)';
      let directive = 'MONITOR';
      if (r.risk === 'CRITICAL') directive = 'IMMEDIATE REPLENISHMENT — ESCALATE TO PROCUREMENT';
      else if (r.risk === 'HIGH')   directive = 'EXPEDITE REORDER — RAISE PO WITHIN 24H';
      else if (r.risk === 'MEDIUM') directive = 'SCHEDULE REORDER — STANDARD LEAD TIME';
      const esc = (v) => `"${String(v).replace(/"/g, '""')}"`;
      return [
        esc(p.product_id), esc(p.product_name), esc(p.category), esc(p.unit),
        p.current_inventory, Math.round(r.demand),
        `${Math.round(disruptionProb * 100)}%`,
        r.ss, r.ssLo, r.ssHi,
        r.rop, r.roq,
        esc(freight), esc(directive),
      ].join(',');
    });
    const csv = [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `OPTICHAIN_ERP_Replenishment_Schedule_${dateStr}.csv`;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
    showToast('✓ ERP Replenishment CSV exported successfully');
  }, [productsList, calc, disruptionProb, leadTimeVar, demandSurge, serviceLevel, showToast]);

  // ── Module 4 Integration Contract CSV Export ─────────────────────────────
  const downloadReadinessCSV = useCallback(() => {
    if (!productionInterfaceData || !productionInterfaceData.length) {
      showToast('No production readiness records to export.', 'error');
      return;
    }
    const headers = [
      'Product_SKU', 'Material_Name', 'Work_Order', 'Target_Line', 'Assigned_Shift',
      'Required_Units', 'Available_Units', 'Shortage_Units', 'Fulfillment_Pct',
      'Readiness_Flag', 'Line_Idle_Risk_USD_Hr', 'Recommended_Action'
    ];
    const rows = productionInterfaceData.map(item => {
      const isSim = simulateExpeditedArrival || Boolean(releasedGates[item.product_id]);
      const isReady = isSim ? true : Boolean(item.material_availability_flag);
      const req = item.material_requirement || 0;
      const avail = isSim ? Math.max(req, item.available_inventory || 0) : (item.available_inventory || 0);
      const shortage = isSim ? 0 : (item.material_shortage || 0);
      const pct = Math.min(100, Math.round((avail / Math.max(1, req)) * 100));
      const meta = LINE_METADATA[item.product_id] || { line: 'Line 01', shift: 'Shift A', order: 'WO-MAS-001', downtimeCost: 3000 };
      const esc = (v) => `"${String(v).replace(/"/g, '""')}"`;
      return [
        esc(item.product_id), esc(item.product_name || ''), esc(meta.order), esc(meta.line), esc(meta.shift),
        req, avail, shortage, `${pct}%`,
        isReady ? 'PRODUCTION_READY' : 'GATED_SHORTAGE',
        meta.downtimeCost,
        esc(isReady ? 'Ready for line allocation' : 'Trigger expedited dispatch / Reschedule line')
      ].join(',');
    });
    const csv = [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Inventory_to_Production_Scheduling_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('✓ Inventory_to_Production_Scheduling.csv exported successfully');
  }, [productionInterfaceData, simulateExpeditedArrival, releasedGates, showToast]);

  // ── ERP Export: PDF Executive Summary ────────────────────────────────────
  const handlePrintPDF = useCallback(() => {
    const now = new Date();
    const ts = now.toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' });
    const critCount = productsList.filter(p => p.disruption_probability >= 0.7 && p.current_inventory < p.forecasted_demand * 0.35).length;
    const totalStock = productsList.reduce((s, p) => s + p.current_inventory, 0);
    const avgRisk = productsList.length ? (productsList.reduce((s,p) => s + p.disruption_probability, 0) / productsList.length * 100).toFixed(1) : '—';
    const readyCount = productsList.filter(p => p.current_inventory >= p.forecasted_demand * 0.35).length;

    const tableRows = productsList.map(p => {
      const r = calc(p, disruptionProb, leadTimeVar, demandSurge, serviceLevel);
      const freight = r.roq > p.forecasted_demand * 5 ? '✈ Air Express' : '🚢 Sea Freight';
      const riskColors = { CRITICAL: '#DC2626', HIGH: '#D97706', MEDIUM: '#3B82F6', LOW: '#059669' };
      const riskBg    = { CRITICAL: '#FEF2F2', HIGH: '#FFFBEB', MEDIUM: '#EFF6FF', LOW: '#F0FDF4' };
      return `
        <tr>
          <td><strong>${p.product_id}</strong></td>
          <td>${p.product_name}</td>
          <td>${p.category}</td>
          <td style="text-align:right">${p.current_inventory.toLocaleString()}</td>
          <td style="text-align:right">${Math.round(r.demand).toLocaleString()}</td>
          <td style="text-align:right"><strong>${r.ss.toLocaleString()}</strong></td>
          <td style="text-align:right">${r.rop.toLocaleString()}</td>
          <td style="text-align:right"><strong>${r.roq.toLocaleString()}</strong></td>
          <td style="text-align:center">${freight}</td>
          <td style="text-align:center;background:${riskBg[r.risk]};color:${riskColors[r.risk]};font-weight:700;border-radius:4px">
            ${r.risk}
          </td>
        </tr>`;
    }).join('');

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"/>
<title>OPTICHAIN ERP Executive Summary</title>
<style>
  @page { margin: 16mm 14mm; size: A4 landscape; }
  * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; }
  body { background: #fff; color: #1E293B; font-size: 11px; }
  .header { background: linear-gradient(135deg,#0D1B2E 0%,#1E3A5F 60%,#2563EB 100%); color:#fff; padding:16px 22px; display:flex; justify-content:space-between; align-items:center; }
  .logo { font-size:20px; font-weight:900; letter-spacing:2px; }
  .logo span { color:#60A5FA; }
  .section-title { font-size:11.5px; font-weight:800; color:#0D1B2E; text-transform:uppercase; letter-spacing:1px; margin:14px 0 8px; border-left:4px solid #2563EB; padding-left:10px; }
  .kpi-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; margin-bottom:14px; }
  .kpi { border:1px solid #E2E8F0; border-radius:8px; padding:10px 14px; background:#F8FAFC; }
  .kpi-label { font-size:9px; color:#64748B; text-transform:uppercase; letter-spacing:.5px; margin-bottom:4px; }
  .kpi-value { font-size:20px; font-weight:900; color:#0D1B2E; }
  .kpi-value.red { color:#DC2626; } .kpi-value.green { color:#059669; } .kpi-value.amber { color:#D97706; }
  table { width:100%; border-collapse:collapse; font-size:10px; }
  th { background:#0D1B2E; color:#fff; padding:7px 9px; font-size:9px; text-transform:uppercase; letter-spacing:.4px; font-weight:700; text-align:left; }
  td { padding:5px 9px; border-bottom:1px solid #F1F5F9; vertical-align:middle; }
  tr:nth-child(even) td { background:#F8FAFC; }
  .footer { margin-top:14px; padding-top:8px; border-top:1px solid #E2E8F0; font-size:9px; color:#94A3B8; display:flex; justify-content:space-between; }
  .alert-box { background:#FEF2F2; border:1px solid #FECACA; border-left:4px solid #DC2626; border-radius:6px; padding:9px 13px; margin-bottom:12px; font-size:10px; color:#7F1D1D; }
  @media print { body { -webkit-print-color-adjust:exact; print-color-adjust:exact; } }
</style>
</head><body>
<div class="header">
  <div>
    <div class="logo">OPTI<span>CHAIN</span></div>
    <div style="font-size:10.5px;opacity:.75;margin-top:3px">AI-Driven Supply Chain Intelligence Platform</div>
    <div style="font-size:9.5px;opacity:.6;margin-top:2px">Factory Node: MAS Holdings — Colombo Hub · Sri Lanka</div>
  </div>
  <div style="text-align:right;font-size:10px;line-height:1.75;opacity:.85">
    <div><strong>ERP Procurement Executive Summary</strong></div>
    <div>Generated: ${ts}</div>
    <div>Service Level Target: ${Math.round(serviceLevel * 100)}% · Disruption Risk: ${Math.round(disruptionProb * 100)}%</div>
    <div>Lead Time Variance: ±${leadTimeVar}d · Demand Surge: +${demandSurge}%</div>
  </div>
</div>

<div style="padding:0 2px">
  <div class="section-title">Executive KPI Dashboard</div>
  <div class="kpi-grid">
    <div class="kpi"><div class="kpi-label">Total SKUs Monitored</div><div class="kpi-value">${productsList.length}</div></div>
    <div class="kpi"><div class="kpi-label">Critical Shortage SKUs</div><div class="kpi-value ${critCount > 0 ? 'red' : 'green'}">${critCount}</div></div>
    <div class="kpi"><div class="kpi-label">Total Inventory Units</div><div class="kpi-value">${totalStock.toLocaleString()}</div></div>
    <div class="kpi"><div class="kpi-label">Avg Portfolio Risk</div><div class="kpi-value amber">${avgRisk}%</div></div>
  </div>

  ${critCount > 0 ? `<div class="alert-box">⚠ PROCUREMENT ALERT: ${critCount} SKU${critCount > 1 ? 's' : ''} flagged CRITICAL — immediate replenishment action required. Production continuity is at risk.</div>` : `<div style="background:#F0FDF4;border:1px solid #BBF7D0;border-left:4px solid #10B981;border-radius:6px;padding:9px 13px;margin-bottom:12px;font-size:10px;color:#14532D">✓ OPERATIONAL STATUS: All SKUs within acceptable risk thresholds. Production continuity confirmed.</div>`}

  <div class="section-title">Full Replenishment Schedule — ${productsList.length} SKUs</div>
  <table>
    <thead><tr>
      <th>SKU ID</th><th>Material Name</th><th>Category</th>
      <th style="text-align:right">Current Stock</th><th style="text-align:right">14D Forecast</th>
      <th style="text-align:right">Safety Stock</th><th style="text-align:right">Reorder Point</th>
      <th style="text-align:right">Rec. ROQ</th><th style="text-align:center">Freight Mode</th>
      <th style="text-align:center">Risk Level</th>
    </tr></thead>
    <tbody>${tableRows}</tbody>
  </table>

  <div class="footer">
    <div>OPTICHAIN v2.0 · Project J26-IT-357 · Confidential — Internal ERP Use Only</div>
    <div>Production Readiness: ${readyCount}/${productsList.length} SKUs (${Math.round(readyCount/Math.max(1,productsList.length)*100)}% available)</div>
  </div>
</div>
</body></html>`;

    const win = window.open('', '_blank', 'width=1280,height=820');
    if (!win) { showToast('Pop-up blocked — please allow pop-ups for this site', 'error'); return; }
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 700);
    showToast('✓ PDF Executive Summary ready — save as PDF from the print dialog');
  }, [productsList, calc, disruptionProb, leadTimeVar, demandSurge, serviceLevel, showToast]);

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
      const hasShortage = item.current_inventory < item.forecasted_demand;
      const availOk = availabilityFilter === 'ALL'
        || (availabilityFilter === 'SHORTAGE' && hasShortage)
        || (availabilityFilter === 'READY' && !hasShortage);
      return catOk && srchOk && availOk;
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
  }, [productsList, selectedCategory, searchQuery, sortCol, sortDir, availabilityFilter]);

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

  // ── Direct API Tester handler ─────────────────────────────────────────────
  const [directApiError, setDirectApiError] = useState(null);
  const [directApiMs, setDirectApiMs]       = useState(null);
  const [directRawJson, setDirectRawJson]   = useState('');
  const [directEndpoint, setDirectEndpoint] = useState('/api/inventory/optimize');
  const [directMethod, setDirectMethod]     = useState('POST');

  const DIRECT_PRESETS = {
    optimize_fab001: {
      label: 'Optimize FAB-001 (Port Crisis)',
      endpoint: '/api/inventory/optimize',
      method: 'POST',
      body: {
        product_id: 'FAB-001', current_inventory: 3400, forecasted_demand: 15200,
        demand_std_dev: 2280, average_lead_time: 7.0, lead_time_std_dev: 3.2,
        disruption_probability: 0.85, supplier_trust_score: 42.0,
        service_level: 0.95, replenishment_cycle_days: 7,
      },
    },
    optimize_low_risk: {
      label: 'Optimize YRN-018 (Low Risk)',
      endpoint: '/api/inventory/optimize',
      method: 'POST',
      body: {
        product_id: 'YRN-018', current_inventory: 18000, forecasted_demand: 9800,
        demand_std_dev: 980, average_lead_time: 5.0, lead_time_std_dev: 1.0,
        disruption_probability: 0.12, supplier_trust_score: 88.0,
        service_level: 0.99, replenishment_cycle_days: 7,
      },
    },
    detailed_optimize: {
      label: 'Detailed Optimize (full policy)',
      endpoint: '/api/inventory/optimize/detailed',
      method: 'POST',
      body: {
        product_id: 'DYE-008', current_inventory: 820, forecasted_demand: 3400,
        demand_std_dev: 510, average_lead_time: 14.0, lead_time_std_dev: 4.5,
        disruption_probability: 0.72, supplier_trust_score: 31.0,
        service_level: 0.95, replenishment_cycle_days: 7,
      },
    },
    get_products: {
      label: 'GET /products catalog',
      endpoint: '/api/inventory/products',
      method: 'GET',
      body: null,
    },
    get_summary: {
      label: 'GET /summary KPIs',
      endpoint: '/api/inventory/summary',
      method: 'GET',
      body: null,
    },
    get_health: {
      label: 'GET /health check',
      endpoint: '/api/inventory/health',
      method: 'GET',
      body: null,
    },
    scenario: {
      label: 'Scenario: Force Majeure',
      endpoint: '/api/inventory/scenario',
      method: 'POST',
      body: {
        product_id: 'FAB-001', current_inventory: 3400, forecasted_demand: 15200,
        base_disruption_prob: 0.95, average_lead_time: 7.0,
        lead_time_std_dev: 5.0, demand_std_dev: 2280, service_level: 0.99,
      },
    },
  };

  const handleDirectApiCall = useCallback(async () => {
    setIsExecutingDirectApi(true);
    setDirectApiResult(null);
    setDirectApiError(null);
    setDirectApiMs(null);
    const base = 'http://localhost:8000';
    const t0 = performance.now();
    try {
      const opts = { method: directMethod, headers: { 'Content-Type': 'application/json' } };
      if (directMethod !== 'GET' && directRawJson.trim()) opts.body = directRawJson;
      const res = await fetch(`${base}${directEndpoint}`, opts);
      const ms = Math.round(performance.now() - t0);
      setDirectApiMs(ms);
      const data = await res.json();
      setDirectApiResult({ status: res.status, ok: res.ok, data });
      showToast(res.ok ? `✓ ${res.status} OK — ${ms}ms` : `✗ ${res.status} Error — ${ms}ms`, res.ok ? 'success' : 'error');
    } catch (err) {
      setDirectApiError(err.message);
      showToast(`Connection failed: ${err.message}`, 'error');
    } finally {
      setIsExecutingDirectApi(false);
    }
  }, [directEndpoint, directMethod, directRawJson, showToast]);

  const applyDirectPreset = useCallback((key) => {
    const p = DIRECT_PRESETS[key];
    if (!p) return;
    setDirectEndpoint(p.endpoint);
    setDirectMethod(p.method);
    setDirectRawJson(p.body ? JSON.stringify(p.body, null, 2) : '');
    setDirectApiResult(null);
    setDirectApiError(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        @keyframes slide-drawer { from{transform:translateX(100%)} to{transform:translateX(0)} }
        @keyframes fade-backdrop { from{opacity:0} to{opacity:1} }
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
          {/* Left: Brand Identity & Subtitle */}
          <div style={{ display:'flex', alignItems:'center', gap:'16px', flex:'1 1 500px', minWidth:'320px' }}>
            <div style={styles.headerIconBox}><span style={{ fontSize:'28px' }}>🛡️</span></div>
            <div>
              <div style={styles.moduleBadge}>
                <span style={styles.liveDot} />
                OPTICHAIN AI · MODULE 3 · DISRUPTION-AWARE ADAPTIVE INVENTORY GUARDIAN
              </div>
              <h1 style={styles.headerTitle}>Inventory Guardian</h1>
              <p style={styles.headerSubtitle}>
                Dynamically calibrating safety stock buffers and reorder thresholds by coupling upstream stochastic
                demand volatility with real-time supplier disruption signals for export garment factories.
              </p>
              <div style={{ display:'flex', gap:'8px', alignItems:'center', marginTop:'10px', flexWrap:'wrap' }}>
                <span style={styles.demoModeBadge}>⚠️ DEMO MODE (Upstream: Simulated)</span>
                <span style={styles.statusBadge}><span style={{ color:'#10B981', animation:'pulse-dot 2s infinite', fontSize:'8px' }}>●</span> inventory-policy-v1.0</span>
                <span style={styles.statusBadge}><span style={{ color:'#818CF8', animation:'pulse-dot 2.4s infinite', fontSize:'8px' }}>●</span> backorder-xgb-v1.0</span>
              </div>
            </div>
          </div>

          {/* Right: Factory Showcase Card + Theme Toggle */}
          <div style={{ display:'flex', flexDirection:'column', gap:'10px', alignItems:'flex-end', flexShrink:0 }}>
            {/* Theme Toggle Button */}
            <button className="btn-hover" onClick={() => { const n = isDark?'light':'dark'; setTheme(n); try{localStorage.setItem('optichain_inventory_theme',n);}catch(e){} }} style={styles.themeToggleBtn}>
              {isDark ? '☀️ Switch to Light Mode' : '🌙 Switch to Dark Mode'}
            </button>

            {/* Smart Factory Node Live Terminal Card (Always 100% visible in Light & Dark Mode) */}
            <div style={{
              display:'flex', alignItems:'center', gap:'12px',
              background: isDark ? 'rgba(15,23,42,0.85)' : '#FFFFFF',
              border: `1.5px solid ${isDark ? 'rgba(59,130,246,0.3)' : '#CBD5E1'}`,
              borderRadius:'14px', padding:'10px 14px',
              boxShadow: isDark ? '0 8px 24px rgba(0,0,0,0.45)' : '0 4px 18px rgba(15,23,42,0.08)',
              maxWidth:'420px', position:'relative',
            }}>
              {/* Photo with live badge */}
              <div style={{ width:'78px', height:'58px', borderRadius:'9px', overflow:'hidden', position:'relative', flexShrink:0, border:`1px solid ${isDark ? 'rgba(255,255,255,0.15)' : '#E2E8F0'}` }}>
                <img
                  src="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=240&h=180&fit=crop&q=80"
                  alt="Factory Floor"
                  referrerPolicy="no-referrer"
                  style={{ width:'100%', height:'100%', objectFit:'cover' }}
                />
                <div style={{ position:'absolute', bottom:'2px', left:'3px', background:'rgba(0,0,0,0.7)', borderRadius:'4px', padding:'1px 5px', fontSize:'7.5px', color:'#34D399', fontWeight:900, letterSpacing:'.04em' }}>
                  ● LIVE
                </div>
              </div>

              {/* Node description */}
              <div style={{ minWidth:0 }}>
                <div style={{ fontSize:'9px', fontWeight:900, color:'#2563EB', letterSpacing:'.08em', textTransform:'uppercase' }}>
                  🏭 FACTORY HUB: MAS HOLDINGS
                </div>
                <div style={{ fontSize:'12px', fontWeight:800, color:c.title, marginTop:'2px', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                  Colombo Manufacturing Hub Line 04
                </div>
                <div style={{ display:'flex', gap:'8px', alignItems:'center', marginTop:'4px', fontSize:'10.5px', color:c.sub }}>
                  <span style={{ color:'#10B981', fontWeight:700 }}>99.95% SL</span>
                  <span>•</span>
                  <span>4 Lines Active</span>
                  <span>•</span>
                  <span style={{ color:'#60A5FA', fontWeight:600 }}>Sri Lanka</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══ STANDALONE FLOATING BENTO KPI GRID ═════════════════════════════ */}
      <div style={styles.kpiGrid}>
        {[
          { label:'TARGET SERVICE LEVEL', val:`${summaryData?.average_service_level||99.95}%`, trend:'↑ +0.49pp vs baseline', icon:'📈', accent:'#10B981', spark:[98.2, 98.6, 99.1, 99.4, 99.2, 99.8, 99.95], bg: isDark?'linear-gradient(145deg,rgba(16,185,129,0.12),rgba(16,185,129,0.03))':'#FFFFFF', bdr: isDark?'rgba(16,185,129,0.35)':'#E2E8F0', tag:'OPTIMAL' },
          { label:'STOCKOUT MITIGATION',  val:`${summaryData?.stockout_mitigation_pct||91.95}%`, trend:'−91.95% stockout units', icon:'✅', accent:'#2563EB', spark:[40, 55, 68, 74, 82, 88, 91.95], bg: isDark?'linear-gradient(145deg,rgba(37,99,235,0.12),rgba(37,99,235,0.03))':'#FFFFFF', bdr: isDark?'rgba(37,99,235,0.35)':'#E2E8F0', tag:'SECURED' },
          { label:'MONITORED RAW MATERIALS', val:`${summaryData?.total_materials_monitored||productsList.length||8} SKUs`, trend:'Active supply portfolio', icon:'📦', accent:'#8B5CF6', spark:[5, 6, 6, 7, 7, 8, 8], bg: isDark?'linear-gradient(145deg,rgba(139,92,246,0.12),rgba(139,92,246,0.03))':'#FFFFFF', bdr: isDark?'rgba(139,92,246,0.35)':'#E2E8F0', tag:'PORTFOLIO' },
          { label:'CRITICAL ALERTS & REORDERS', val:`${summaryData?.critical_shortages_count||7} Shortage`, trend:`${summaryData?.reorder_required_count||8} POs triggered`, icon:'🚨', accent:'#EF4444', spark:[9, 8, 8, 7, 8, 7, 7], bg: isDark?'linear-gradient(145deg,rgba(239,68,68,0.12),rgba(239,68,68,0.03))':'#FFFFFF', bdr: isDark?'rgba(239,68,68,0.35)':'#E2E8F0', tag:'ACTION REQ' },
        ].map((k,i) => (
          <div key={i} className="kpi-hover" style={{ ...styles.kpiCard, background:k.bg, border:`1px solid ${k.bdr}`, boxShadow: isDark?'0 6px 24px rgba(0,0,0,0.35)':'0 4px 18px rgba(15,23,42,0.05)', transition:'all .25s ease' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'12px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:'7px' }}>
                <span style={{ fontSize:'16px' }}>{k.icon}</span>
                <div style={{ fontSize:'10.5px', fontWeight:800, letterSpacing:'.06em', color:c.sub }}>{k.label}</div>
              </div>
              <span style={{ fontSize:'9px', fontWeight:800, color:k.accent, background:`${k.accent}16`, padding:'2px 8px', borderRadius:'12px', border:`1px solid ${k.accent}35` }}>
                {k.tag}
              </span>
            </div>

            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end' }}>
              <div>
                <div style={{ fontSize:'28px', fontWeight:900, color:k.accent, letterSpacing:'-0.025em', lineHeight:1.1 }}>
                  {k.val}
                </div>
                <div style={{ fontSize:'11px', color:c.sub, display:'flex', alignItems:'center', gap:'5px', marginTop:'6px' }}>
                  <span style={{ color:k.accent, fontWeight:800 }}>{i===3?'⚠':'↑'}</span> {k.trend}
                </div>
              </div>
              <MiniSparkline data={k.spark} color={k.accent} isDark={isDark} />
            </div>
          </div>
        ))}
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
          { id:'apitester',  icon:'🔌', label:'FastAPI Live Tester',         desc:'Viva defence · Direct API calls' },
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
                  <MaterialThumb category={currentProduct.category} isDark={isDark} />
                  <div>
                    <span style={{ fontSize:'9.5px', color:c.sub, display:'block', fontWeight:800, letterSpacing:'.04em' }}>ACTIVE MATERIAL</span>
                    <span style={{ color: isDark ? '#93C5FD' : '#1D4ED8', fontWeight:800, fontSize:'12.5px' }}>{activeOpt.product_id||currentProduct.product_id}</span>
                    <span style={{ marginLeft:'6px', color:c.title, fontWeight:600, fontSize:'12px' }}>{currentProduct.product_name}</span>
                  </div>
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

          {/* ── Global Supply Network + Activity Feed ── */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 380px', gap:'16px', alignItems:'start' }}>

            {/* Supplier Map Card */}
            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                  <div style={styles.cardIconBadge}>🌏</div>
                  <div>
                    <div style={styles.cardTitle}>Global Supplier Origin Network</div>
                    <div style={styles.cardSub}>Live animated freight routes · 4 sourcing hubs · MAS Holdings Colombo Factory</div>
                  </div>
                </div>
                <div style={{ display:'flex', gap:'8px' }}>
                  {[{c:'#F59E0B',l:'🇨🇳 CN'},{c:'#EF4444',l:'🇧🇩 BD'},{c:'#10B981',l:'🇮🇳 IN'},{c:'#60A5FA',l:'🇻🇳 VN'}].map((x,i)=>(
                    <span key={i} style={{ fontSize:'10.5px', fontWeight:700, color:x.c, background:`${x.c}18`, border:`1px solid ${x.c}40`, padding:'3px 8px', borderRadius:'20px' }}>{x.l}</span>
                  ))}
                </div>
              </div>
              <SupplierWorldMap isDark={isDark}/>
            </div>

            {/* Activity Feed Card */}
            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                  <div style={styles.cardIconBadge}>📡</div>
                  <div>
                    <div style={styles.cardTitle}>Live Event Stream</div>
                    <div style={styles.cardSub}>Real-time supply chain alerts</div>
                  </div>
                </div>
                <span style={{ padding:'3px 10px', borderRadius:'20px', fontSize:'10px', fontWeight:700, background:'rgba(16,185,129,0.15)', color:'#34D399', border:'1px solid rgba(16,185,129,0.3)' }}>
                  <span style={{ animation:'pulse-dot 1.5s infinite', display:'inline-block', marginRight:'4px' }}>●</span>LIVE
                </span>
              </div>
              <ActivityFeed productsList={productsList} isDark={isDark}/>
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
                {/* Add Material Button */}
                <button className="btn-hover" onClick={()=>setIsAddModalOpen(true)} style={styles.addBtn}>
                  <span style={{ fontSize:'14px' }}>＋</span> Add Raw Material
                </button>
                {/* Export CSV */}
                <button className="btn-hover" onClick={handleExportCSV} style={{
                  display:'flex', alignItems:'center', gap:'6px', padding:'7px 13px',
                  borderRadius:'8px', border:'1px solid rgba(16,185,129,0.5)',
                  background:'linear-gradient(135deg,rgba(16,185,129,0.15),rgba(5,150,105,0.1))',
                  color:'#34D399', fontWeight:700, fontSize:'12px', cursor:'pointer',
                  whiteSpace:'nowrap',
                }}>
                  <span style={{ fontSize:'13px' }}>📥</span> Export ERP CSV
                </button>
                {/* Print PDF */}
                <button className="btn-hover" onClick={handlePrintPDF} style={{
                  display:'flex', alignItems:'center', gap:'6px', padding:'7px 13px',
                  borderRadius:'8px', border:'1px solid rgba(139,92,246,0.5)',
                  background:'linear-gradient(135deg,rgba(139,92,246,0.15),rgba(109,40,217,0.1))',
                  color:'#A78BFA', fontWeight:700, fontSize:'12px', cursor:'pointer',
                  whiteSpace:'nowrap',
                }}>
                  <span style={{ fontSize:'13px' }}>📄</span> PDF Summary
                </button>
                {/* PO history badge */}
                {dispatchedList.length > 0 && (
                  <button className="btn-hover" onClick={()=>setShowPoHistory(v=>!v)} style={{ ...styles.pillBtn, background:'rgba(16,185,129,0.15)', borderColor:'rgba(16,185,129,0.4)', color:'#34D399' }}>
                    📦 {dispatchedList.length} PO{dispatchedList.length>1?'s':''} Dispatched
                  </button>
                )}
              </div>
            </div>

            {/* Filter ribbons: Categories & Availability Quick-Toggle */}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'12px', marginBottom:'16px' }}>
              <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
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
              </div>

              {/* Availability Filter Chips */}
              <div style={{ display:'flex', gap:'6px', alignItems:'center', background: isDark?'rgba(0,0,0,0.25)':'#F1F5F9', padding:'4px 10px', borderRadius:'14px', border:`1px solid ${c.tagBorder}` }}>
                <span style={{ fontSize:'10.5px', fontWeight:700, color:c.sub, marginRight:'2px' }}>Filter Availability:</span>
                {[
                  { id: 'ALL', label: 'All SKUs', color: '#60A5FA' },
                  { id: 'SHORTAGE', label: '⚠ Shortages', color: '#EF4444' },
                  { id: 'READY', label: '✓ In Stock', color: '#10B981' },
                ].map(af => (
                  <button
                    key={af.id}
                    onClick={() => setAvailabilityFilter(af.id)}
                    style={{
                      padding:'3px 10px',
                      borderRadius:'10px',
                      fontSize:'11px',
                      fontWeight: availabilityFilter===af.id ? 800 : 600,
                      cursor:'pointer',
                      background: availabilityFilter===af.id ? (isDark?'#1E293B':'#FFFFFF') : 'transparent',
                      color: availabilityFilter===af.id ? af.color : c.sub,
                      border: availabilityFilter===af.id ? `1px solid ${af.color}60` : '1px solid transparent',
                      boxShadow: availabilityFilter===af.id ? `0 2px 6px ${af.color}25` : 'none',
                      transition:'all .15s ease',
                    }}
                  >
                    {af.label}
                  </button>
                ))}
                <span style={{ marginLeft:'8px', fontSize:'10.5px', color:c.sub, borderLeft:`1px solid ${c.tagBorder}`, paddingLeft:'8px' }}>
                  {filteredProducts.length} shown
                </span>
              </div>

              {/* View Switcher: Cards vs Table */}
              <div style={{ display:'flex', background: isDark?'rgba(0,0,0,0.3)':'#F1F5F9', padding:'3px', borderRadius:'10px', border:`1px solid ${c.tagBorder}` }}>
                <button
                  onClick={() => setViewMode('cards')}
                  style={{
                    padding:'5px 12px',
                    borderRadius:'8px',
                    fontSize:'11.5px',
                    fontWeight: viewMode==='cards' ? 800 : 600,
                    cursor:'pointer',
                    background: viewMode==='cards' ? '#2563EB' : 'transparent',
                    color: viewMode==='cards' ? '#FFFFFF' : c.sub,
                    border:'none',
                    display:'flex',
                    alignItems:'center',
                    gap:'5px',
                    boxShadow: viewMode==='cards' ? '0 2px 8px rgba(37,99,235,0.4)' : 'none',
                    transition:'all .15s ease',
                  }}
                  title="Card Grid layout with zero overlaps"
                >
                  <span>⊞</span> Bento Cards
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  style={{
                    padding:'5px 12px',
                    borderRadius:'8px',
                    fontSize:'11.5px',
                    fontWeight: viewMode==='table' ? 800 : 600,
                    cursor:'pointer',
                    background: viewMode==='table' ? '#2563EB' : 'transparent',
                    color: viewMode==='table' ? '#FFFFFF' : c.sub,
                    border:'none',
                    display:'flex',
                    alignItems:'center',
                    gap:'5px',
                    boxShadow: viewMode==='table' ? '0 2px 8px rgba(37,99,235,0.4)' : 'none',
                    transition:'all .15s ease',
                  }}
                  title="Dense tabular spreadsheet view"
                >
                  <span>☰</span> Dense Table
                </button>
              </div>
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

            {/* View Mode 1: Modern Bento Cards View (Zero Overlaps, Responsive) */}
            {viewMode === 'cards' ? (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
                gap: '16px',
              }}>
                {filteredProducts.map((item) => {
                  const isSelected = item.product_id === selectedSku;
                  const hasShortage = item.current_inventory < item.forecasted_demand;
                  const isDispatched = !!dispatchedPOs[item.product_id];
                  const rp = item.disruption_probability;
                  const skuSS = Math.round(item.forecasted_demand * 0.35);
                  const healthPct = Math.min(1, item.current_inventory / Math.max(1, skuSS));
                  const healthColor = healthPct < 0.5 ? '#EF4444' : healthPct < 0.8 ? '#F59E0B' : '#10B981';
                  const roq = Math.round(item.forecasted_demand * 7 * (1 + item.disruption_probability));

                  const binLoc = item.product_id.startsWith('FAB') ? 'MAS Colombo · Bay 02 · Rack 14'
                    : item.product_id.startsWith('DYE') ? 'MAS Colombo · Chemical Safe Vault 08'
                    : item.product_id.startsWith('PKG') ? 'MAS Logistics Center · High-Bay 21'
                    : 'MAS Trim Stores · Drawer Shelf 05';

                  return (
                    <div
                      key={item.product_id}
                      className="kpi-hover"
                      onClick={() => { setSelectedSku(item.product_id); setDrawerItem(item); }}
                      style={{
                        background: isDark
                          ? (isSelected ? 'linear-gradient(145deg, #13233D, #0D1B2E)' : '#0D1B2E')
                          : (isSelected ? '#F0F7FF' : '#FFFFFF'),
                        border: `1.5px solid ${isSelected ? '#3B82F6' : (hasShortage ? (isDark ? 'rgba(239,68,68,0.35)' : '#FECACA') : c.cardBorder)}`,
                        borderRadius: '16px',
                        padding: '18px 20px',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: '14px',
                        boxShadow: isSelected
                          ? (isDark ? '0 0 24px rgba(59,130,246,0.25)' : '0 8px 24px rgba(37,99,235,0.12)')
                          : (isDark ? '0 4px 16px rgba(0,0,0,0.2)' : '0 2px 10px rgba(15,23,42,0.04)'),
                        transition: 'all .2s ease',
                        position: 'relative',
                        overflow: 'hidden',
                      }}
                    >
                      {/* Top Status Accent Line */}
                      <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '3px',
                        background: hasShortage
                          ? 'linear-gradient(to right, #EF4444, #F59E0B)'
                          : 'linear-gradient(to right, #10B981, #059669)',
                      }} />

                      {/* Header: Thumbnail + SKU + Category */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', marginBottom: '10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <MaterialThumb category={item.category} isDark={isDark} />
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ fontWeight: 800, color: isDark ? '#60A5FA' : '#2563EB', fontSize: '14px', letterSpacing: '.02em' }}>
                                  {item.product_id}
                                </span>
                                <span style={{ fontSize: '9.5px', color: c.sub, background: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9', border: `1px solid ${c.tagBorder}`, padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                                  Inspect ↗
                                </span>
                              </div>
                              <div style={{ fontSize: '13px', fontWeight: 700, color: c.title, marginTop: '2px', lineHeight: 1.3 }}>
                                {item.product_name}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Category & MAS Location */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10.5px', color: c.sub, marginBottom: '12px' }}>
                          <span style={styles.categoryChip}>{item.category}</span>
                          <span style={{ fontSize: '10px', color: c.sub }}>📍 {binLoc}</span>
                        </div>

                        {/* Availability & Deficit Banner */}
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '8px 12px',
                          borderRadius: '10px',
                          background: hasShortage
                            ? (isDark ? 'rgba(239,68,68,0.14)' : '#FEF2F2')
                            : (isDark ? 'rgba(16,185,129,0.14)' : '#F0FDF4'),
                          border: `1px solid ${hasShortage
                            ? (isDark ? 'rgba(239,68,68,0.3)' : '#FECACA')
                            : (isDark ? 'rgba(16,185,129,0.3)' : '#BBF7D0')}`,
                          marginBottom: '12px',
                        }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            fontWeight: 800,
                            fontSize: '11px',
                            color: hasShortage ? (isDark ? '#FCA5A5' : '#B91C1C') : (isDark ? '#6EE7B7' : '#15803D'),
                          }}>
                            <span style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              background: hasShortage ? '#EF4444' : '#10B981',
                              animation: hasShortage ? 'pulse-dot 1.8s infinite' : 'none',
                            }} />
                            {hasShortage ? '⚠ Shortage Alert' : '✓ Buffer Ready'}
                          </span>
                          <span style={{
                            fontSize: '10.5px',
                            fontWeight: 700,
                            color: hasShortage ? (isDark ? '#F87171' : '#DC2626') : (isDark ? '#34D399' : '#16A34A'),
                          }}>
                            {hasShortage
                              ? `-${(item.forecasted_demand - item.current_inventory).toLocaleString()} ${item.unit} gap`
                              : `+${(item.current_inventory - skuSS).toLocaleString()} ${item.unit} buffer`}
                          </span>
                        </div>

                        {/* Stock Runway Progress Bar */}
                        <div style={{ background: isDark ? 'rgba(0,0,0,0.25)' : '#F8FAFC', padding: '10px 12px', borderRadius: '10px', border: `1px solid ${c.tableBorder}`, marginBottom: '12px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
                            <span style={{ fontSize: '10px', fontWeight: 700, color: c.sub, textTransform: 'uppercase', letterSpacing: '.04em' }}>PHYSICAL STOCK</span>
                            <div>
                              <strong style={{ fontSize: '16px', color: c.title }}>{item.current_inventory.toLocaleString()}</strong>
                              <span style={{ fontSize: '10.5px', color: c.sub, marginLeft: '3px' }}>{item.unit}</span>
                            </div>
                          </div>
                          <div style={{ height: '6px', background: isDark ? '#1E293B' : '#E2E8F0', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${Math.min(100, healthPct * 100)}%`, background: healthColor, borderRadius: '3px', transition: 'width .6s ease' }} />
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9.5px', color: c.sub, marginTop: '4px' }}>
                            <span style={{ color: healthColor, fontWeight: 700 }}>{Math.round(healthPct * 100)}% of SS target</span>
                            <span>Target: {skuSS.toLocaleString()} {item.unit}</span>
                          </div>
                        </div>

                        {/* Mini Telemetry Grid (3 Bento Tiles) */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', textAlign: 'center' }}>
                          <div style={{ background: isDark ? 'rgba(0,0,0,0.2)' : '#F1F5F9', padding: '8px 6px', borderRadius: '8px', border: `1px solid ${c.tableBorder}` }}>
                            <div style={{ fontSize: '9px', fontWeight: 700, color: c.sub }}>14D DEMAND</div>
                            <div style={{ fontSize: '13px', fontWeight: 800, color: c.title, marginTop: '2px' }}>
                              {item.forecasted_demand.toLocaleString()}
                            </div>
                            <div style={{ fontSize: '8.5px', color: c.sub }}>{item.unit}</div>
                          </div>

                          <div style={{ background: isDark ? 'rgba(0,0,0,0.2)' : '#F1F5F9', padding: '8px 6px', borderRadius: '8px', border: `1px solid ${c.tableBorder}` }}>
                            <div style={{ fontSize: '9px', fontWeight: 700, color: c.sub }}>DISRUPTION RISK</div>
                            <div style={{ fontSize: '13px', fontWeight: 800, color: rp >= 0.7 ? '#EF4444' : rp >= 0.35 ? '#F59E0B' : '#10B981', marginTop: '2px' }}>
                              {(rp * 100).toFixed(0)}%
                            </div>
                            <div style={{ fontSize: '8.5px', color: rp >= 0.7 ? '#F87171' : c.sub }}>{rp >= 0.7 ? 'Critical' : 'Nominal'}</div>
                          </div>

                          <div style={{ background: isDark ? 'rgba(0,0,0,0.2)' : '#F1F5F9', padding: '8px 6px', borderRadius: '8px', border: `1px solid ${c.tableBorder}` }}>
                            <div style={{ fontSize: '9px', fontWeight: 700, color: c.sub }}>OPT. ROQ</div>
                            <div style={{ fontSize: '13px', fontWeight: 800, color: '#10B981', marginTop: '2px' }}>
                              {roq.toLocaleString()}
                            </div>
                            <div style={{ fontSize: '8.5px', color: c.sub }}>{item.unit}</div>
                          </div>
                        </div>
                      </div>

                      {/* Action Footer Toolbar */}
                      <div style={{
                        display: 'flex',
                        gap: '6px',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        paddingTop: '10px',
                        borderTop: `1px solid ${c.tableBorder}`,
                      }} onClick={e => e.stopPropagation()}>
                        <button
                          className="btn-hover"
                          onClick={() => {
                            setPoModalItem({ ...item, reorder_quantity: roq });
                          }}
                          style={{
                            flex: 1,
                            background: isDispatched ? '#059669' : (isDark ? 'linear-gradient(135deg,#1E40AF,#2563EB)' : 'linear-gradient(135deg,#2563EB,#1D4ED8)'),
                            color: '#fff',
                            border: 'none',
                            padding: '7px 10px',
                            borderRadius: '8px',
                            fontSize: '11.5px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '5px',
                            boxShadow: '0 2px 8px rgba(37,99,235,0.3)',
                          }}
                        >
                          {isDispatched ? '✓ PO Sent' : '⚡ Quick PO'}
                        </button>
                        <button
                          className="btn-hover"
                          onClick={() => openEditModal(item)}
                          style={{ ...styles.editBtn, padding: '7px 9px', borderRadius: '8px' }}
                          title="Edit Material in SQLite"
                        >
                          ✏️
                        </button>
                        <button
                          className="btn-hover"
                          onClick={() => setXaiModalSku(item)}
                          style={{ ...styles.xaiBtn, padding: '7px 9px', borderRadius: '8px' }}
                          title="XAI Formula Inspector"
                        >
                          📐
                        </button>
                        <button
                          className="btn-hover"
                          onClick={() => setDeleteConfirmItem(item)}
                          style={{ ...styles.deleteBtn, padding: '7px 9px', borderRadius: '8px' }}
                          title="Delete / Archive Material"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* View Mode 2: Dense Table View (Natural non-sticky Actions to eliminate overlaps) */
              <div style={styles.tableWrapper}>
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.theadRow}>
                      <th style={styles.th}>SKU & Name</th>
                      <th style={styles.th}>Category</th>
                      <th className="th-sort" style={styles.thRight} onClick={()=>handleSort('current_inventory')}>Current Stock <SortIcon col="current_inventory"/></th>
                      <th style={{ ...styles.thCenter, minWidth:'150px' }}>Availability & Buffer</th>
                      <th style={styles.thRight}>14d Forecast</th>
                      <th className="th-sort" style={styles.thCenter} onClick={()=>handleSort('disruption_probability')}>Risk <SortIcon col="disruption_probability"/></th>
                      <th className="th-sort" style={styles.thRight} onClick={()=>handleSort('safety_stock')}>Safety Stock <SortIcon col="safety_stock"/></th>
                      <th style={styles.thRight}>ROP</th>
                      <th className="th-sort" style={styles.thRight} onClick={()=>handleSort('roq')}>ROQ <SortIcon col="roq"/></th>
                      <th style={{ ...styles.thCenter, minWidth:'150px' }}>Actions</th>
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
                        <tr
                          key={item.product_id}
                          className="row-hover"
                          onClick={() => { setSelectedSku(item.product_id); setDrawerItem(item); }}
                          title="Click to view material deep-dive inspector & live actions"
                          style={{ ...styles.tr, backgroundColor:rowBg, borderLeft: isSelected?'3px solid #3B82F6':'3px solid transparent', cursor:'pointer' }}
                        >
                          <td style={styles.td}>
                            <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                              <MaterialThumb category={item.category} isDark={isDark}/>
                              <div>
                                <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                                  <span style={{ fontWeight:800, color: isDark ? '#60A5FA' : '#2563EB', fontSize:'13px', letterSpacing:'.01em' }}>
                                    {item.product_id}
                                  </span>
                                  <span style={{ fontSize:'9.5px', color:c.sub, background: isDark?'rgba(255,255,255,0.06)':'#F1F5F9', border:`1px solid ${c.tagBorder}`, padding:'1px 5px', borderRadius:'4px', fontWeight:600 }}>
                                    Inspect ↗
                                  </span>
                                </div>
                                <div style={{ fontSize:'11px', color:c.sub, marginTop:'2px' }}>{item.product_name}</div>
                              </div>
                            </div>
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

                          {/* Availability & Buffer Health Dual-Tier Telemetry Widget */}
                          <td style={{ ...styles.tdCenter, minWidth:'150px' }}>
                            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'3px' }}>
                              <span style={{
                                display:'inline-flex',
                                alignItems:'center',
                                gap:'5px',
                                padding:'4px 11px',
                                borderRadius:'20px',
                                fontWeight:800,
                                fontSize:'11px',
                                letterSpacing:'.02em',
                                whiteSpace:'nowrap',
                                background: hasShortage?(isDark?'rgba(239,68,68,.22)':'#FEE2E2'):(isDark?'rgba(16,185,129,.22)':'#DCFCE7'),
                                color: hasShortage?(isDark?'#FCA5A5':'#991B1B'):(isDark?'#6EE7B7':'#166534'),
                                border:`1px solid ${hasShortage?(isDark?'rgba(239,68,68,.45)':'#FCA5A5'):(isDark?'rgba(16,185,129,.45)':'#86EFAC')}`,
                                boxShadow: hasShortage?'0 0 10px rgba(239,68,68,.2)':'0 0 10px rgba(16,185,129,.2)'
                              }}>
                                <span style={{ width:'6px', height:'6px', borderRadius:'50%', background: hasShortage?'#EF4444':'#10B981', animation: hasShortage?'pulse-dot 1.8s infinite':'none' }}/>
                                {hasShortage ? '⚠ Shortage' : '✓ Stock Ready'}
                              </span>
                              <span style={{ fontSize:'10px', fontWeight:700, color: hasShortage?(isDark?'#F87171':'#DC2626'):(isDark?'#34D399':'#059669') }}>
                                {hasShortage ? `-${(item.forecasted_demand - item.current_inventory).toLocaleString()} ${item.unit} gap` : `+${(item.current_inventory - skuSS).toLocaleString()} ${item.unit} buffer`}
                              </span>
                            </div>
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
                          <td style={{ ...styles.tdCenter, minWidth:'150px' }}>
                            <div style={{ display:'flex', gap:'5px', justifyContent:'center', alignItems:'center' }}>
                              <button className="btn-hover" onClick={e=>{e.stopPropagation();setXaiModalSku(item);}} style={styles.xaiBtn} title="XAI Formula Inspector">📐</button>
                              <button className="btn-hover" onClick={e=>{e.stopPropagation();openEditModal(item);}} style={styles.editBtn} title="Edit Material">✏️</button>
                              <button className="btn-hover" onClick={e=>{e.stopPropagation();setDeleteConfirmItem(item);}} style={styles.deleteBtn} title="Archive / Delete Material">🗑️</button>
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
            )}
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

      {/* ═══ TAB 3: PRODUCTION READINESS & MODULE 4 HANDOFF ═══════════════ */}
      {activeTab === 'readiness' && (() => {
        // Enrich data with factory lines, shifts, and simulation overrides
        const enrichedList = (productionInterfaceData || []).map(item => {
          const isSim = simulateExpeditedArrival || Boolean(releasedGates[item.product_id]);
          const meta = LINE_METADATA[item.product_id] || {
            line: `Line ${Math.abs(item.product_id.charCodeAt(0) % 8) + 1} · Assembly`,
            shortLine: `Line 0${Math.abs(item.product_id.charCodeAt(0) % 8) + 1}`,
            shift: 'Shift A (06:00)',
            shiftId: 'Shift A',
            order: `WO-MAS-${item.product_id.replace(/[^a-zA-Z0-9]/g, '')}`,
            rate: '750 pcs/hr',
            downtimeCost: 3000,
            category: 'Fabrics',
          };
          const req = item.material_requirement || 0;
          const avail = isSim ? Math.max(req, item.available_inventory || 0) : (item.available_inventory || 0);
          const shortage = isSim ? 0 : (item.material_shortage || 0);
          const isReady = isSim ? true : Boolean(item.material_availability_flag);
          const fulfillmentPct = Math.min(100, Math.round((avail / Math.max(1, req)) * 100));

          return {
            ...item,
            meta,
            req,
            avail,
            shortage,
            isReady,
            isSim,
            fulfillmentPct,
          };
        });

        // Filtering
        const filteredList = enrichedList.filter(item => {
          const statusOk = readinessFilter === 'ALL'
            || (readinessFilter === 'GATED' && !item.isReady)
            || (readinessFilter === 'READY' && item.isReady);
          const shiftOk = readinessShift === 'ALL' || item.meta.shiftId === readinessShift;
          return statusOk && shiftOk;
        });

        const totalItems = enrichedList.length;
        const readyCount = enrichedList.filter(d => d.isReady).length;
        const gatedCount = totalItems - readyCount;
        const readinessPct = totalItems ? Math.round((readyCount / totalItems) * 100) : 0;
        const totalShortage = enrichedList.reduce((acc, d) => acc + d.shortage, 0);
        const totalDowntimeRisk = enrichedList.filter(d => !d.isReady).reduce((acc, d) => acc + d.meta.downtimeCost, 0);

        return (
          <div style={styles.tabContent}>
            {/* 1. Module 3 -> Module 4 Handoff Architecture Ribbon */}
            <div style={{
              background: isDark ? 'linear-gradient(135deg,rgba(37,99,235,0.14),rgba(124,58,237,0.08))' : 'linear-gradient(135deg,#EFF6FF,#F5F3FF)',
              border: `1px solid ${isDark ? 'rgba(59,130,246,0.3)' : '#BFDBFE'}`,
              borderRadius: '16px',
              padding: '16px 22px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '14px',
              boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.3)' : '0 2px 10px rgba(37,99,235,0.06)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'linear-gradient(135deg,#1E40AF,#2563EB)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '13px', boxShadow: '0 4px 12px rgba(37,99,235,0.35)' }}>
                    M3
                  </div>
                  <div>
                    <div style={{ fontSize: '12.5px', fontWeight: 800, color: c.title }}>Module 3: Inventory Guardian</div>
                    <div style={{ fontSize: '10.5px', color: c.sub }}>Adaptive Buffers & Upstream Disruption Telemetry</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '7px', color: '#60A5FA', fontSize: '11px', fontWeight: 700, background: isDark ? 'rgba(0,0,0,0.3)' : '#FFFFFF', padding: '6px 14px', borderRadius: '20px', border: `1px solid ${c.tagBorder}` }}>
                  <span style={{ animation: 'pulse-dot 2s infinite', color: '#10B981', fontSize: '9px' }}>●</span>
                  <span>Integration Event Bus (REST / JSON Contract)</span>
                  <span>➔</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'linear-gradient(135deg,#7C3AED,#6D28D9)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '13px', boxShadow: '0 4px 12px rgba(124,58,237,0.35)' }}>
                    M4
                  </div>
                  <div>
                    <div style={{ fontSize: '12.5px', fontWeight: 800, color: c.title }}>Module 4: Production Line Optimizer</div>
                    <div style={{ fontSize: '10.5px', color: c.sub }}>MAS Holdings Colombo Hub · Dynamic Line Scheduler</div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '9px', alignItems: 'center' }}>
                <button
                  onClick={() => setShowContractModal(true)}
                  className="btn-hover"
                  style={{
                    background: isDark ? '#1E293B' : '#FFFFFF',
                    color: isDark ? '#E2E8F0' : '#1E293B',
                    border: `1px solid ${c.cardBorder}`,
                    padding: '8px 13px',
                    borderRadius: '8px',
                    fontSize: '11.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                  title="View live REST contract JSON payload"
                >
                  <span>🔍 View JSON Contract</span>
                </button>
                <button
                  onClick={downloadReadinessCSV}
                  className="btn-hover"
                  style={{
                    background: isDark ? 'linear-gradient(135deg,#1E40AF,#2563EB)' : 'linear-gradient(135deg,#2563EB,#1D4ED8)',
                    color: '#fff',
                    border: 'none',
                    padding: '8px 15px',
                    borderRadius: '8px',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 8px rgba(37,99,235,0.3)',
                  }}
                  title="Export live integration contract to CSV"
                >
                  <span>📄 Download CSV Handoff</span>
                </button>
              </div>
            </div>

            {/* 2. Executive Readiness KPI Strip (4 Bento Cards) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
              {/* KPI 1 */}
              <div style={{ ...styles.subCard, padding: '16px 18px', borderLeft: `4px solid ${readinessPct >= 50 ? '#10B981' : '#EF4444'}` }}>
                <div style={{ fontSize: '10px', fontWeight: 800, color: c.sub, letterSpacing: '.06em' }}>OVERALL LINE CLEARANCE</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '4px' }}>
                  <span style={{ fontSize: '26px', fontWeight: 900, color: readinessPct >= 50 ? '#10B981' : '#EF4444' }}>
                    {readyCount} / {totalItems}
                  </span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: c.sub }}>({readinessPct}%)</span>
                </div>
                <div style={{ marginTop: '8px', height: '5px', background: isDark ? '#1E293B' : '#E2E8F0', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${readinessPct}%`, background: readinessPct >= 50 ? '#10B981' : '#EF4444', transition: 'width .6s ease' }} />
                </div>
                <div style={{ fontSize: '10px', color: c.sub, marginTop: '6px' }}>
                  {readyCount} Work Order{readyCount !== 1 ? 's' : ''} cleared for immediate loading
                </div>
              </div>

              {/* KPI 2 */}
              <div style={{ ...styles.subCard, padding: '16px 18px', borderLeft: '4px solid #EF4444' }}>
                <div style={{ fontSize: '10px', fontWeight: 800, color: c.sub, letterSpacing: '.06em' }}>GATED / STARVED WORK ORDERS</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '4px' }}>
                  <span style={{ fontSize: '26px', fontWeight: 900, color: gatedCount > 0 ? '#EF4444' : '#10B981' }}>
                    {gatedCount}
                  </span>
                  <span style={{ fontSize: '12px', color: c.sub }}>Lines Blocked</span>
                </div>
                <div style={{ fontSize: '10.5px', color: gatedCount > 0 ? '#F87171' : '#34D399', marginTop: '6px', fontWeight: 600 }}>
                  {gatedCount > 0 ? '⚠ Immediate procurement action required' : '✓ All line gates cleared'}
                </div>
              </div>

              {/* KPI 3 */}
              <div style={{ ...styles.subCard, padding: '16px 18px', borderLeft: '4px solid #F59E0B' }}>
                <div style={{ fontSize: '10px', fontWeight: 800, color: c.sub, letterSpacing: '.06em' }}>CUMULATIVE SHORTAGE DEFICIT</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '4px' }}>
                  <span style={{ fontSize: '26px', fontWeight: 900, color: totalShortage > 0 ? '#F59E0B' : '#10B981' }}>
                    {totalShortage.toLocaleString()}
                  </span>
                  <span style={{ fontSize: '12px', color: c.sub }}>units needed</span>
                </div>
                <div style={{ fontSize: '10.5px', color: c.sub, marginTop: '6px' }}>
                  Physical stock gap across factory
                </div>
              </div>

              {/* KPI 4 */}
              <div style={{ ...styles.subCard, padding: '16px 18px', borderLeft: '4px solid #8B5CF6' }}>
                <div style={{ fontSize: '10px', fontWeight: 800, color: c.sub, letterSpacing: '.06em' }}>EST. LINE IDLE RISK EXPOSURE</div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '4px' }}>
                  <span style={{ fontSize: '26px', fontWeight: 900, color: '#A78BFA' }}>
                    ${totalDowntimeRisk.toLocaleString()}
                  </span>
                  <span style={{ fontSize: '12px', color: c.sub }}>/ hour</span>
                </div>
                <div style={{ fontSize: '10.5px', color: c.sub, marginTop: '6px' }}>
                  Labor & fixed manufacturing overhead
                </div>
              </div>
            </div>

            {/* 3. Main Data Card with Interactive Filters & Simulator Switch */}
            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={styles.cardIconBadge}>📋</div>
                  <div>
                    <div style={styles.cardTitle}>Live Material Handoff Matrix</div>
                    <div style={styles.cardSub}>Direct telemetry feed consumed by MAS Line Optimizer for real-time shift scheduling</div>
                  </div>
                </div>

                {/* Simulation toggle */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  background: simulateExpeditedArrival ? (isDark ? 'rgba(16,185,129,0.18)' : '#DCFCE7') : (isDark ? 'rgba(255,255,255,0.04)' : '#F1F5F9'),
                  padding: '7px 14px',
                  borderRadius: '10px',
                  border: `1px solid ${simulateExpeditedArrival ? '#10B981' : c.tagBorder}`,
                  transition: 'all .2s ease',
                }}>
                  <input
                    type="checkbox"
                    id="sim-air-toggle"
                    checked={simulateExpeditedArrival}
                    onChange={e => {
                      setSimulateExpeditedArrival(e.target.checked);
                      if (e.target.checked) {
                        showToast('🚀 Air express freight simulated — all line gates cleared for production!');
                      } else {
                        showToast('Reverted to physical on-hand warehouse stock levels.');
                      }
                    }}
                    style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: '#10B981' }}
                  />
                  <label htmlFor="sim-air-toggle" style={{ fontSize: '11.5px', fontWeight: 700, color: simulateExpeditedArrival ? (isDark ? '#6EE7B7' : '#166534') : c.title, cursor: 'pointer', userSelect: 'none' }}>
                    ✈️ Simulate Expedited Air Arrival (Test Gate Release)
                  </label>
                </div>
              </div>

              {/* Filter Ribbon */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '12px',
                flexWrap: 'wrap',
                marginBottom: '16px',
                padding: '10px 14px',
                background: isDark ? 'rgba(0,0,0,0.2)' : '#F8FAFC',
                borderRadius: '10px',
                border: `1px solid ${c.tableBorder}`,
              }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: c.sub, marginRight: '4px' }}>Readiness Filter:</span>
                  {[
                    { id: 'ALL', label: `All Materials (${totalItems})` },
                    { id: 'GATED', label: `🔴 Gated Shortages (${gatedCount})` },
                    { id: 'READY', label: `🟢 Cleared (${readyCount})` },
                  ].map(f => (
                    <button
                      key={f.id}
                      onClick={() => setReadinessFilter(f.id)}
                      style={{
                        padding: '5px 12px',
                        borderRadius: '8px',
                        fontSize: '11.5px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        background: readinessFilter === f.id ? (isDark ? '#2563EB' : '#1E40AF') : (isDark ? '#1E293B' : '#FFFFFF'),
                        color: readinessFilter === f.id ? '#FFFFFF' : c.sub,
                        border: `1px solid ${readinessFilter === f.id ? '#3B82F6' : c.tagBorder}`,
                        transition: 'all .15s ease',
                      }}
                    >
                      {f.label}
                    </button>
                  ))}

                  <div style={{ height: '18px', width: '1px', background: c.tableBorder, margin: '0 6px' }} />
                  <span style={{ fontSize: '11px', fontWeight: 700, color: c.sub }}>Filter Shift:</span>
                  {['ALL', 'Shift A', 'Shift B', 'Shift C'].map(sh => (
                    <button
                      key={sh}
                      onClick={() => setReadinessShift(sh)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        cursor: 'pointer',
                        background: readinessShift === sh ? (isDark ? 'rgba(255,255,255,0.12)' : '#E2E8F0') : 'transparent',
                        color: readinessShift === sh ? c.title : c.sub,
                        border: 'none',
                        fontWeight: readinessShift === sh ? 700 : 500,
                      }}
                    >
                      {sh}
                    </button>
                  ))}
                </div>

                <div style={{ fontSize: '11px', color: c.sub }}>
                  Showing <strong>{filteredList.length}</strong> of {totalItems} items
                </div>
              </div>

              {/* Table */}
              {filteredList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '50px 20px' }}>
                  <div style={{ fontSize: '36px', marginBottom: '10px' }}>🔍</div>
                  <div style={{ fontWeight: 700, fontSize: '14px', color: c.title, marginBottom: '4px' }}>No Materials Match Selected Filters</div>
                  <div style={{ fontSize: '12px', color: c.sub, marginBottom: '16px' }}>Try switching the readiness or shift filters above.</div>
                  <button onClick={() => { setReadinessFilter('ALL'); setReadinessShift('ALL'); }} className="btn-hover" style={styles.execBtn}>Reset Filters</button>
                </div>
              ) : (
                <div style={styles.tableWrapper}>
                  <table style={styles.table}>
                    <thead>
                      <tr style={styles.theadRow}>
                        <th style={styles.th}>Material & Work Order</th>
                        <th style={styles.th}>Target Factory Line</th>
                        <th style={styles.thRight}>Required</th>
                        <th style={styles.thRight}>Available On-Hand</th>
                        <th style={{ ...styles.th, minWidth: '160px' }}>Fulfillment Ratio</th>
                        <th style={styles.thRight}>Shortage</th>
                        <th style={styles.thCenter}>Readiness Gate</th>
                        <th style={{ ...styles.thCenter, minWidth: '170px' }}>Recommended Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredList.map((item, idx) => {
                        const targetProd = productsList.find(p => p.product_id === item.product_id) || item;
                        const isDispatched = Boolean(dispatchedPOs[item.product_id]);
                        const barColor = item.fulfillmentPct >= 100 ? '#10B981' : item.fulfillmentPct >= 50 ? '#F59E0B' : '#EF4444';

                        return (
                          <tr
                            key={item.product_id}
                            className="row-hover"
                            onClick={() => { setSelectedSku(item.product_id); setDrawerItem(targetProd); }}
                            title="Click to view material deep-dive inspector"
                            style={{
                              ...styles.tr,
                              cursor: 'pointer',
                              backgroundColor: isDark ? (idx % 2 === 0 ? '#0F172A' : '#0B1526') : (idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC'),
                            }}
                          >
                            {/* SKU + Name + Work Order */}
                            <td style={styles.td}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <MaterialThumb category={item.meta.category} isDark={isDark} />
                                <div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <strong style={{ color: isDark ? '#60A5FA' : '#2563EB', fontSize: '13px' }}>{item.product_id}</strong>
                                    <span style={{ fontSize: '9.5px', color: c.sub, background: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9', border: `1px solid ${c.tagBorder}`, padding: '1px 5px', borderRadius: '4px', fontWeight: 600 }}>
                                      {item.meta.order}
                                    </span>
                                  </div>
                                  <div style={{ fontSize: '11px', color: c.sub, marginTop: '2px' }}>{item.product_name}</div>
                                </div>
                              </div>
                            </td>

                            {/* Target Line & Shift */}
                            <td style={styles.td}>
                              <div style={{ fontWeight: 600, color: c.title, fontSize: '12px' }}>{item.meta.line}</div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
                                <span style={{ fontSize: '9.5px', color: '#60A5FA', background: isDark ? 'rgba(37,99,235,0.15)' : '#EFF6FF', border: `1px solid ${isDark ? 'rgba(37,99,235,0.3)' : '#BFDBFE'}`, padding: '1px 6px', borderRadius: '4px', fontWeight: 700 }}>
                                  {item.meta.shift}
                                </span>
                                <span style={{ fontSize: '10px', color: c.sub }}>({item.meta.rate})</span>
                              </div>
                            </td>

                            {/* Required */}
                            <td style={styles.tdRight}>
                              <span style={{ color: c.title, fontWeight: 700, fontSize: '12.5px' }}>{item.req.toLocaleString()}</span>
                            </td>

                            {/* Available */}
                            <td style={styles.tdRight}>
                              <strong style={{ color: item.avail >= item.req ? '#10B981' : '#F59E0B', fontSize: '12.5px' }}>
                                {item.avail.toLocaleString()}
                              </strong>
                              {item.isSim && (
                                <div style={{ fontSize: '9px', color: '#34D399', fontWeight: 700 }}>Air Simulated</div>
                              )}
                            </td>

                            {/* Fulfillment Progress Bar */}
                            <td style={styles.td}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', fontWeight: 700, marginBottom: '3px' }}>
                                <span style={{ color: barColor }}>{item.fulfillmentPct}% Filled</span>
                                <span style={{ color: c.sub }}>Target: {item.req.toLocaleString()}</span>
                              </div>
                              <div style={{ height: '6px', background: isDark ? '#1E293B' : '#E2E8F0', borderRadius: '3px', overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${item.fulfillmentPct}%`, background: barColor, borderRadius: '3px', transition: 'width .5s ease' }} />
                              </div>
                            </td>

                            {/* Shortage */}
                            <td style={styles.tdRight}>
                              <strong style={{ color: item.shortage > 0 ? '#EF4444' : '#10B981', fontSize: '12.5px' }}>
                                {item.shortage > 0 ? `-${item.shortage.toLocaleString()}` : '0 (None)'}
                              </strong>
                              {item.shortage > 0 && (
                                <div style={{ fontSize: '9px', color: '#F87171' }}>Line Blocked</div>
                              )}
                            </td>

                            {/* Readiness Gate Flag */}
                            <td style={styles.tdCenter}>
                              <span style={{
                                ...styles.badge,
                                padding: '5px 12px',
                                fontWeight: 800,
                                fontSize: '11px',
                                letterSpacing: '.03em',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                background: item.isReady ? (isDark ? 'rgba(16,185,129,.2)' : '#DCFCE7') : (isDark ? 'rgba(239,68,68,.2)' : '#FEE2E2'),
                                color: item.isReady ? (isDark ? '#6EE7B7' : '#166534') : (isDark ? '#FCA5A5' : '#991B1B'),
                                border: `1px solid ${item.isReady ? (isDark ? 'rgba(16,185,129,.5)' : '#86EFAC') : (isDark ? 'rgba(239,68,68,.5)' : '#FCA5A5')}`,
                              }}>
                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: item.isReady ? '#10B981' : '#EF4444', animation: item.isReady ? 'none' : 'pulse-dot 1.8s infinite' }} />
                                {item.isReady ? '✓ PRODUCTION READY' : '⛔ SHORTAGE / GATE'}
                              </span>
                            </td>

                            {/* Action Buttons */}
                            <td style={styles.tdCenter} onClick={e => e.stopPropagation()}>
                              <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', alignItems: 'center' }}>
                                {!item.isReady ? (
                                  <>
                                    <button
                                      className="btn-hover"
                                      onClick={() => {
                                        setPoModalItem({
                                          ...targetProd,
                                          reorder_quantity: item.shortage || Math.round(targetProd.forecasted_demand * 0.35),
                                        });
                                        setFreightMode('air');
                                      }}
                                      style={{
                                        background: isDispatched ? '#059669' : (isDark ? '#DC2626' : '#EF4444'),
                                        color: '#fff',
                                        border: 'none',
                                        padding: '5px 10px',
                                        borderRadius: '6px',
                                        fontSize: '11px',
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        boxShadow: '0 2px 6px rgba(239,68,68,0.35)',
                                      }}
                                      title="Dispatch emergency air freight purchase order"
                                    >
                                      {isDispatched ? '✓ Air PO Sent' : '⚡ Expedite Air PO'}
                                    </button>
                                    <button
                                      className="btn-hover"
                                      onClick={() => {
                                        setReleasedGates(prev => ({ ...prev, [item.product_id]: true }));
                                        showToast(`Work order ${item.meta.order} rescheduled to Shift C — line gate temporarily released.`);
                                      }}
                                      style={{
                                        background: isDark ? '#1E293B' : '#E2E8F0',
                                        color: isDark ? '#E2E8F0' : '#1E293B',
                                        border: `1px solid ${c.cardBorder}`,
                                        padding: '5px 8px',
                                        borderRadius: '6px',
                                        fontSize: '11px',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                      }}
                                      title="Reschedule shift to postpone material demand"
                                    >
                                      🔄 Reschedule
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    className="btn-hover"
                                    onClick={() => showToast(`✓ Material ${item.product_id} officially released to ${item.meta.line} floor`)}
                                    style={{
                                      background: isDark ? 'rgba(16,185,129,0.18)' : '#DCFCE7',
                                      color: isDark ? '#6EE7B7' : '#166534',
                                      border: `1px solid ${isDark ? 'rgba(16,185,129,0.4)' : '#86EFAC'}`,
                                      padding: '5px 12px',
                                      borderRadius: '6px',
                                      fontSize: '11px',
                                      fontWeight: 700,
                                      cursor: 'pointer',
                                    }}
                                  >
                                    ✓ Floor Cleared
                                  </button>
                                )}
                                <button
                                  className="btn-hover"
                                  onClick={() => { setSelectedSku(item.product_id); setDrawerItem(targetProd); }}
                                  style={{
                                    background: 'transparent',
                                    border: `1px solid ${c.tagBorder}`,
                                    color: c.sub,
                                    padding: '5px 8px',
                                    borderRadius: '6px',
                                    fontSize: '11px',
                                    cursor: 'pointer',
                                  }}
                                  title="Inspect full SKU parameters"
                                >
                                  📋
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* 4. MAS Colombo Manufacturing Lines Scheduling Board */}
            <div style={{ ...styles.card, marginTop: '20px' }}>
              <div style={styles.cardHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={styles.cardIconBadge}>🏭</div>
                  <div>
                    <div style={styles.cardTitle}>MAS Holdings Colombo Hub — Factory Line Operations Cockpit</div>
                    <div style={styles.cardSub}>Visual status of all 8 production line bays mapped to material feed availability</div>
                  </div>
                </div>
                <span style={{ fontSize: '11px', color: '#10B981', fontWeight: 700, background: isDark ? 'rgba(16,185,129,0.15)' : '#DCFCE7', padding: '4px 10px', borderRadius: '6px', border: '1px solid rgba(16,185,129,0.4)' }}>
                  ● Shopfloor Telemetry Active
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '14px' }}>
                {enrichedList.map(item => {
                  const targetProd = productsList.find(p => p.product_id === item.product_id) || item;
                  return (
                    <div
                      key={item.product_id}
                      onClick={() => { setSelectedSku(item.product_id); setDrawerItem(targetProd); }}
                      className="kpi-hover"
                      style={{
                        ...styles.subCard,
                        padding: '16px',
                        cursor: 'pointer',
                        border: `1px solid ${item.isReady ? (isDark ? 'rgba(16,185,129,0.4)' : '#86EFAC') : (isDark ? 'rgba(239,68,68,0.4)' : '#FECACA')}`,
                        background: item.isReady ? (isDark ? 'rgba(16,185,129,0.04)' : '#F0FDF4') : (isDark ? 'rgba(239,68,68,0.04)' : '#FEF2F2'),
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                          <div>
                            <div style={{ fontWeight: 800, fontSize: '13px', color: c.title }}>{item.meta.shortLine}</div>
                            <div style={{ fontSize: '10.5px', color: c.sub, marginTop: '1px' }}>{item.meta.line}</div>
                          </div>
                          <span style={{
                            fontSize: '10px',
                            fontWeight: 800,
                            padding: '3px 8px',
                            borderRadius: '5px',
                            background: item.isReady ? '#10B981' : '#EF4444',
                            color: '#FFFFFF',
                          }}>
                            {item.isReady ? '🟢 ACTIVE' : '⛔ GATED'}
                          </span>
                        </div>

                        <div style={{ background: isDark ? 'rgba(0,0,0,0.25)' : '#FFFFFF', padding: '10px', borderRadius: '8px', border: `1px solid ${c.tableBorder}`, marginBottom: '10px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: c.sub }}>
                            <span>Job Order:</span>
                            <strong style={{ color: c.title }}>{item.meta.order}</strong>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: c.sub, marginTop: '3px' }}>
                            <span>Material Feed:</span>
                            <span style={{ color: isDark ? '#60A5FA' : '#2563EB', fontWeight: 700 }}>{item.product_id}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: c.sub, marginTop: '3px' }}>
                            <span>Planned Shift:</span>
                            <span style={{ color: c.title }}>{item.meta.shift}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: c.sub, marginTop: '3px' }}>
                            <span>Output Velocity:</span>
                            <span style={{ color: '#10B981', fontWeight: 700 }}>{item.isReady ? item.meta.rate : '0 pcs/hr (Idle)'}</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        {/* Progress */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: c.sub, marginBottom: '4px' }}>
                          <span>Material Staging:</span>
                          <strong style={{ color: item.fulfillmentPct >= 100 ? '#10B981' : '#EF4444' }}>{item.fulfillmentPct}%</strong>
                        </div>
                        <div style={{ height: '4px', background: isDark ? '#1E293B' : '#E2E8F0', borderRadius: '2px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${item.fulfillmentPct}%`, background: item.fulfillmentPct >= 100 ? '#10B981' : '#EF4444', transition: 'width .6s ease' }} />
                        </div>
                        {!item.isReady && (
                          <div style={{ fontSize: '9.5px', color: '#EF4444', fontWeight: 600, marginTop: '6px' }}>
                            Starved: Need {item.shortage.toLocaleString()} units · Idle Penalty: ${item.meta.downtimeCost}/hr
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 5. JSON Contract Inspection Modal */}
            {showContractModal && (
              <div
                style={{
                  position: 'fixed',
                  inset: 0,
                  background: 'rgba(0,0,0,0.65)',
                  backdropFilter: 'blur(5px)',
                  zIndex: 2600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '20px',
                  animation: 'fade-backdrop .2s ease',
                }}
                onClick={() => setShowContractModal(false)}
              >
                <div
                  style={{
                    background: isDark ? '#0D1B2E' : '#FFFFFF',
                    border: `1px solid ${c.cardBorder}`,
                    borderRadius: '16px',
                    width: 'min(780px, 95vw)',
                    maxHeight: '85vh',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                    overflow: 'hidden',
                  }}
                  onClick={e => e.stopPropagation()}
                >
                  <div style={{ padding: '18px 24px', borderBottom: `1px solid ${c.cardBorder}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: c.title, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>🔌</span> Module 4 REST / JSON Integration Contract Schema
                      </h3>
                      <div style={{ fontSize: '11px', color: c.sub, marginTop: '3px' }}>
                        Delivered from <code>GET /api/inventory/production-interface</code> to the MAS Line Scheduler
                      </div>
                    </div>
                    <button onClick={() => setShowContractModal(false)} style={styles.closeBtn}>✕</button>
                  </div>

                  <div style={{ flex: 1, overflowY: 'auto', padding: '20px', background: isDark ? '#070E18' : '#F8FAFC' }}>
                    <div style={{ fontSize: '11px', color: c.sub, marginBottom: '8px', fontWeight: 600 }}>SAMPLE PAYLOAD PAYLOAD DELIVERED TO MODULE 4:</div>
                    <pre style={{
                      background: isDark ? '#0A1424' : '#0F172A',
                      color: '#6EE7B7',
                      padding: '16px',
                      borderRadius: '10px',
                      fontSize: '11.5px',
                      fontFamily: "'Fira Code', 'Consolas', monospace",
                      lineHeight: 1.5,
                      overflowX: 'auto',
                      margin: 0,
                      border: '1px solid rgba(255,255,255,0.08)',
                    }}>
{JSON.stringify({
  contract_version: "1.0.0",
  source_module: "Module 3: Disruption-Aware Adaptive Inventory Guardian",
  target_module: "Module 4: Dynamic Production Line Scheduling (MAS Holdings)",
  factory_node: "MAS Holdings Colombo Hub · Sri Lanka",
  handshake_timestamp: new Date().toISOString(),
  total_skus: totalItems,
  cleared_skus: readyCount,
  gated_skus: gatedCount,
  contract_items: enrichedList.slice(0, 3).map(i => ({
    product_id: i.product_id,
    material_name: i.product_name,
    work_order: i.meta.order,
    target_line: i.meta.line,
    assigned_shift: i.meta.shift,
    material_requirement: i.req,
    available_inventory: i.avail,
    material_shortage: i.shortage,
    readiness_flag: i.isReady,
    line_idle_risk_penalty_usd_hr: i.meta.downtimeCost,
    recommended_action: i.isReady ? 'ALLOCATE_TO_LINE' : 'TRIGGER_EXPEDITED_AIR_FREIGHT'
  }))
}, null, 2)}
                    </pre>

                    <div style={{ marginTop: '16px', padding: '12px 14px', background: isDark ? 'rgba(59,130,246,0.1)' : '#EFF6FF', borderRadius: '10px', border: `1px solid ${isDark ? 'rgba(59,130,246,0.3)' : '#BFDBFE'}`, fontSize: '11.5px', color: c.title, lineHeight: 1.6 }}>
                      <strong style={{ color: '#3B82F6' }}>Integration Contract Principle:</strong> Module 4 queries this endpoint before generating daily cutting & sewing schedules. When <code>readiness_flag == false</code>, Module 4 automatically gates the line and pushes the job order to an alternate shift, preventing assembly line starvation and costly factory floor work-in-progress pileups.
                    </div>
                  </div>

                  <div style={{ padding: '14px 20px', borderTop: `1px solid ${c.cardBorder}`, display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(JSON.stringify(enrichedList, null, 2));
                        showToast('✓ Full JSON contract copied to clipboard');
                      }}
                      className="btn-hover"
                      style={{
                        background: isDark ? '#1E293B' : '#FFFFFF',
                        color: isDark ? '#E2E8F0' : '#1E293B',
                        border: `1px solid ${c.cardBorder}`,
                        padding: '8px 14px',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      📋 Copy Full JSON Payload
                    </button>
                    <button
                      onClick={() => setShowContractModal(false)}
                      className="btn-hover"
                      style={{
                        background: '#2563EB',
                        color: '#fff',
                        border: 'none',
                        padding: '8px 16px',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      Done
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })()}

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

      {/* ═══ TAB 5: FASTAPI LIVE TESTER ══════════════════════════════════════ */}
      {activeTab === 'apitester' && (() => {
        const methodColor = { GET:'#34D399', POST:'#60A5FA', PUT:'#FBBF24', DELETE:'#F87171' };
        const mc = methodColor[directMethod] || '#94A3B8';
        const resultStr = directApiResult ? JSON.stringify(directApiResult.data, null, 2) : '';

        // Syntax-highlight JSON for display
        const highlight = (json) => {
          if (!json) return '';
          return json
            .replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?)/g, (m) => {
              const cls = /:$/.test(m) ? '#93C5FD' : '#86EFAC';
              return `<span style="color:${cls}">${m}</span>`;
            })
            .replace(/\b(true|false)\b/g, '<span style="color:#FDE68A">$1</span>')
            .replace(/\b(null)\b/g,        '<span style="color:#FDA4AF">$1</span>')
            .replace(/(-?\d+\.?\d*)/g,     '<span style="color:#C4B5FD">$1</span>');
        };

        return (
          <div style={styles.tabContent}>

            {/* Header card */}
            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                  <div style={styles.cardIconBadge}>🔌</div>
                  <div>
                    <div style={styles.cardTitle}>FastAPI Live Tester — Direct Backend API Console</div>
                    <div style={styles.cardSub}>Hit the real FastAPI endpoints · Inspect raw JSON · Demonstrate backend intelligence during viva</div>
                  </div>
                </div>
                <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
                  <span style={{ padding:'4px 12px', borderRadius:'20px', fontSize:'10.5px', fontWeight:700, background:'rgba(16,185,129,0.15)', color:'#34D399', border:'1px solid rgba(16,185,129,0.3)' }}>
                    <span style={{ animation:'pulse-dot 2s infinite', display:'inline-block', marginRight:'5px' }}>●</span>
                    http://localhost:8000
                  </span>
                  <span style={{ padding:'4px 12px', borderRadius:'20px', fontSize:'10.5px', fontWeight:700, background:'rgba(37,99,235,0.15)', color:'#60A5FA', border:'1px solid rgba(37,99,235,0.3)' }}>
                    FastAPI · Python 3.x
                  </span>
                </div>
              </div>

              {/* Preset buttons */}
              <div style={{ marginBottom:'18px' }}>
                <div style={{ fontSize:'11px', fontWeight:700, color:c.sub, letterSpacing:'.06em', textTransform:'uppercase', marginBottom:'10px' }}>
                  Quick Presets — click to load
                </div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:'8px' }}>
                  {Object.entries(DIRECT_PRESETS).map(([key, p]) => (
                    <button key={key} className="btn-hover chip-hover" onClick={() => applyDirectPreset(key)} style={{
                      padding:'6px 14px', borderRadius:'8px', fontSize:'11.5px', fontWeight:700, cursor:'pointer',
                      border:`1px solid ${methodColor[p.method] || '#94A3B8'}40`,
                      background: isDark ? `${methodColor[p.method] || '#94A3B8'}15` : `${methodColor[p.method] || '#94A3B8'}20`,
                      color: methodColor[p.method] || '#94A3B8',
                    }}>
                      <span style={{ fontSize:'10px', fontWeight:900, marginRight:'5px' }}>{p.method}</span>
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Method + Endpoint bar */}
              <div style={{ display:'flex', gap:'10px', alignItems:'center', marginBottom:'14px', flexWrap:'wrap' }}>
                <select
                  value={directMethod}
                  onChange={e => setDirectMethod(e.target.value)}
                  style={{
                    padding:'8px 12px', borderRadius:'8px', fontWeight:800, fontSize:'12px',
                    border:`2px solid ${mc}60`, background: isDark ? '#0D1B2E' : '#F8FAFC',
                    color: mc, cursor:'pointer', minWidth:'90px',
                  }}
                >
                  {['GET','POST','PUT','DELETE'].map(m => <option key={m} value={m}>{m}</option>)}
                </select>

                <div style={{ flex:1, display:'flex', alignItems:'center', background: isDark?'rgba(255,255,255,0.04)':'#F8FAFC', border:`1px solid ${c.tableBorder}`, borderRadius:'8px', padding:'0 12px', minWidth:'240px' }}>
                  <span style={{ fontSize:'11px', color:c.sub, whiteSpace:'nowrap', marginRight:'6px' }}>localhost:8000</span>
                  <input
                    className="input-focus"
                    value={directEndpoint}
                    onChange={e => setDirectEndpoint(e.target.value)}
                    style={{ flex:1, background:'transparent', border:'none', outline:'none', fontSize:'13px', fontWeight:600, color:c.title, padding:'10px 0', fontFamily:'monospace' }}
                    placeholder="/api/inventory/optimize"
                  />
                </div>

                <button className="btn-hover" onClick={handleDirectApiCall} disabled={isExecutingDirectApi} style={{
                  padding:'9px 22px', borderRadius:'8px', fontWeight:800, fontSize:'13px', cursor:'pointer', border:'none',
                  background: isExecutingDirectApi ? '#374151' : `linear-gradient(135deg,${mc},${mc}CC)`,
                  color:'#fff', display:'flex', alignItems:'center', gap:'8px', whiteSpace:'nowrap',
                  boxShadow: isExecutingDirectApi ? 'none' : `0 4px 16px ${mc}40`,
                  transition:'all .2s',
                }}>
                  {isExecutingDirectApi
                    ? <><span style={{ animation:'pulse-dot 1s infinite', fontSize:'12px' }}>●</span> Executing...</>
                    : <><span style={{ fontSize:'15px' }}>▶</span> Execute</>
                  }
                </button>

                {directApiMs !== null && (
                  <span style={{ fontSize:'12px', fontWeight:700, color: directApiMs < 100 ? '#34D399' : directApiMs < 300 ? '#FBBF24' : '#F87171', background: isDark?'rgba(0,0,0,0.3)':'#F1F5F9', padding:'6px 12px', borderRadius:'8px', border:`1px solid ${c.tableBorder}` }}>
                    ⏱ {directApiMs}ms
                  </span>
                )}
              </div>

              {/* Two-column layout: request + response */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px', alignItems:'start' }}>

                {/* LEFT: Request body editor */}
                <div>
                  <div style={{ fontSize:'11px', fontWeight:700, color:c.sub, letterSpacing:'.06em', textTransform:'uppercase', marginBottom:'8px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <span>Request Body (JSON)</span>
                    {directMethod === 'GET' && <span style={{ color:'#64748B', fontStyle:'italic', fontSize:'10px', textTransform:'none' }}>GET requests have no body</span>}
                  </div>
                  <textarea
                    className="input-focus"
                    value={directRawJson}
                    onChange={e => setDirectRawJson(e.target.value)}
                    disabled={directMethod === 'GET'}
                    rows={20}
                    spellCheck={false}
                    style={{
                      width:'100%', boxSizing:'border-box',
                      background: isDark ? '#0A1628' : '#F8FAFC',
                      border:`1px solid ${c.tableBorder}`,
                      borderRadius:'10px', padding:'14px', resize:'vertical',
                      fontFamily:'JetBrains Mono, Cascadia Code, Consolas, monospace',
                      fontSize:'12px', lineHeight:1.6, color: isDark?'#E2E8F0':'#1E293B',
                      outline:'none', opacity: directMethod === 'GET' ? 0.4 : 1,
                    }}
                    placeholder={'{\n  "product_id": "FAB-001",\n  "disruption_probability": 0.85,\n  ...\n}'}
                  />
                </div>

                {/* RIGHT: Response panel */}
                <div>
                  <div style={{ fontSize:'11px', fontWeight:700, color:c.sub, letterSpacing:'.06em', textTransform:'uppercase', marginBottom:'8px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <span>Response</span>
                    {directApiResult && (
                      <span style={{
                        padding:'3px 10px', borderRadius:'20px', fontSize:'10.5px', fontWeight:800,
                        background: directApiResult.ok ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                        color: directApiResult.ok ? '#34D399' : '#F87171',
                        border: `1px solid ${directApiResult.ok ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.4)'}`,
                      }}>
                        {directApiResult.status} {directApiResult.ok ? 'OK' : 'Error'}
                      </span>
                    )}
                  </div>

                  {/* Idle state */}
                  {!directApiResult && !directApiError && !isExecutingDirectApi && (
                    <div style={{ background: isDark?'#0A1628':'#F8FAFC', border:`1px dashed ${c.tableBorder}`, borderRadius:'10px', padding:'40px 20px', textAlign:'center', minHeight:'300px', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'10px' }}>
                      <span style={{ fontSize:'36px', opacity:.3 }}>🔌</span>
                      <div style={{ fontSize:'13px', color:c.sub, opacity:.6 }}>Select a preset or type a request,<br/>then click Execute</div>
                    </div>
                  )}

                  {/* Loading */}
                  {isExecutingDirectApi && (
                    <div style={{ background: isDark?'#0A1628':'#F8FAFC', border:`1px solid ${c.tableBorder}`, borderRadius:'10px', padding:'40px 20px', textAlign:'center', minHeight:'300px', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'14px' }}>
                      <span style={{ fontSize:'28px', animation:'pulse-dot 1s infinite' }}>⚡</span>
                      <div style={{ fontSize:'13px', color:c.sub }}>Calling FastAPI backend...</div>
                    </div>
                  )}

                  {/* Error */}
                  {directApiError && (
                    <div style={{ background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.4)', borderRadius:'10px', padding:'20px', minHeight:'300px' }}>
                      <div style={{ fontWeight:800, color:'#F87171', fontSize:'13px', marginBottom:'10px' }}>❌ Connection Error</div>
                      <div style={{ fontFamily:'monospace', fontSize:'12px', color:'#FCA5A5', lineHeight:1.6, whiteSpace:'pre-wrap', wordBreak:'break-all' }}>{directApiError}</div>
                      <div style={{ marginTop:'14px', fontSize:'11px', color:'#94A3B8' }}>Ensure the backend is running: <code style={{ color:'#60A5FA' }}>uvicorn app.main:app --port 8000</code></div>
                    </div>
                  )}

                  {/* Success response */}
                  {directApiResult && (
                    <div style={{ background: isDark?'#0A1628':'#F8FAFC', border:`1px solid ${directApiResult.ok ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.4)'}`, borderRadius:'10px', overflow:'hidden' }}>
                      {/* response meta bar */}
                      <div style={{ padding:'8px 14px', background: directApiResult.ok ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom:`1px solid ${c.tableBorder}` }}>
                        <span style={{ fontFamily:'monospace', fontSize:'11px', color:c.sub }}>
                          {directMethod} {directEndpoint}
                        </span>
                        <div style={{ display:'flex', gap:'8px' }}>
                          <button className="btn-hover" onClick={() => navigator.clipboard.writeText(resultStr).then(() => showToast('✓ Copied to clipboard'))} style={{ padding:'3px 10px', borderRadius:'6px', fontSize:'10px', fontWeight:700, border:`1px solid ${c.tableBorder}`, background:'transparent', color:c.sub, cursor:'pointer' }}>
                            📋 Copy
                          </button>
                        </div>
                      </div>
                      {/* highlighted JSON */}
                      <pre style={{ margin:0, padding:'14px', fontFamily:'JetBrains Mono, Cascadia Code, Consolas, monospace', fontSize:'11.5px', lineHeight:1.65, color: isDark?'#E2E8F0':'#1E293B', overflowX:'auto', maxHeight:'420px', overflowY:'auto', whiteSpace:'pre-wrap', wordBreak:'break-word' }}
                        dangerouslySetInnerHTML={{ __html: highlight(resultStr) }}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Endpoint reference card */}
            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                  <div style={styles.cardIconBadge}>📚</div>
                  <div>
                    <div style={styles.cardTitle}>Endpoint Reference — Inventory Guardian API</div>
                    <div style={styles.cardSub}>All routes prefixed with /api/inventory · FastAPI auto-docs at /docs</div>
                  </div>
                </div>
                <a href="http://localhost:8000/docs" target="_blank" rel="noreferrer" style={{ padding:'6px 14px', borderRadius:'8px', fontSize:'11.5px', fontWeight:700, background:'rgba(37,99,235,0.15)', color:'#60A5FA', border:'1px solid rgba(37,99,235,0.3)', textDecoration:'none' }}>
                  Open Swagger UI ↗
                </a>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))', gap:'12px' }}>
                {[
                  { method:'GET',  path:'/api/inventory/health',              desc:'Module health, version, upstream mode' },
                  { method:'GET',  path:'/api/inventory/products',             desc:'Full monitored SKU catalog with demand & risk feeds' },
                  { method:'POST', path:'/api/inventory/products',             desc:'Create new raw material SKU (CRUD)' },
                  { method:'PUT',  path:'/api/inventory/products/{id}',        desc:'Update existing SKU parameters (CRUD)' },
                  { method:'DELETE',path:'/api/inventory/products/{id}',       desc:'Remove SKU from monitoring (CRUD)' },
                  { method:'GET',  path:'/api/inventory/summary',              desc:'Executive KPI summary (service level, shortages)' },
                  { method:'POST', path:'/api/inventory/optimize',             desc:'Run disruption-aware inventory optimization' },
                  { method:'POST', path:'/api/inventory/optimize/detailed',    desc:'Full policy metadata: SS, ROP, ROQ, risk level' },
                  { method:'POST', path:'/api/inventory/scenario',             desc:'Stress-test across Normal / Moderate / Severe scenarios' },
                  { method:'GET',  path:'/api/inventory/production-interface', desc:'Module 4 (Line Optimizer) handoff contract records' },
                  { method:'GET',  path:'/api/inventory/research-results',     desc:'Benchmark metrics: 3-policy comparison, XGBoost scores' },
                ].map((ep, i) => (
                  <div key={i} style={{ background:c.subCard, border:`1px solid ${c.subCardBorder}`, borderRadius:'10px', padding:'12px 14px', display:'flex', gap:'10px', alignItems:'flex-start', cursor:'pointer' }}
                    onClick={() => { setDirectEndpoint(ep.path.replace(/{id}/g, 'FAB-001')); setDirectMethod(ep.method); setDirectRawJson(''); setDirectApiResult(null); }}
                  >
                    <span style={{ padding:'3px 8px', borderRadius:'5px', fontSize:'9.5px', fontWeight:900, background:`${methodColor[ep.method]}20`, color:methodColor[ep.method] || '#94A3B8', border:`1px solid ${methodColor[ep.method] || '#94A3B8'}40`, flexShrink:0, marginTop:'1px' }}>
                      {ep.method}
                    </span>
                    <div>
                      <div style={{ fontFamily:'monospace', fontSize:'11.5px', fontWeight:700, color:c.title, marginBottom:'3px' }}>{ep.path}</div>
                      <div style={{ fontSize:'10.5px', color:c.sub }}>{ep.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        );
      })()}

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

      {/* ═══ ADD RAW MATERIAL MODAL ══════════════════════════════════════════ */}
      {isAddModalOpen && (
        <div style={styles.modalOverlay} onClick={()=>setIsAddModalOpen(false)}>
          <div style={styles.modalBox} onClick={e=>e.stopPropagation()}>
            <div style={styles.modalHead}>
              <h3 style={{ fontSize:'16px', fontWeight:800, color:c.title, display:'flex', alignItems:'center', gap:'8px' }}>
                <span>📦</span> Add New Raw Material SKU
              </h3>
              <button onClick={()=>setIsAddModalOpen(false)} style={styles.closeBtn}>✕</button>
            </div>
            <form onSubmit={handleCreateProduct} style={{ display:'flex', flexDirection:'column', gap:'14px', marginTop:'16px' }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
                <div style={styles.inputField}>
                  <label style={styles.inputLabel}>Product SKU ID *</label>
                  <input
                    type="text"
                    placeholder="e.g. FAB-009"
                    required
                    value={addForm.product_id}
                    onChange={e=>setAddForm(f=>({...f, product_id:e.target.value}))}
                    className="input-focus"
                    style={styles.textInput}
                  />
                </div>
                <div style={styles.inputField}>
                  <label style={styles.inputLabel}>Material Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Heavy Duty Indigo Denim"
                    required
                    value={addForm.product_name}
                    onChange={e=>setAddForm(f=>({...f, product_name:e.target.value}))}
                    className="input-focus"
                    style={styles.textInput}
                  />
                </div>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
                <div style={styles.inputField}>
                  <label style={styles.inputLabel}>Category</label>
                  <select
                    value={addForm.category}
                    onChange={e=>setAddForm(f=>({...f, category:e.target.value}))}
                    className="input-focus"
                    style={{ ...styles.textInput, cursor:'pointer' }}
                  >
                    <option value="Fabrics">Fabrics</option>
                    <option value="Dyes & Chemicals">Dyes & Chemicals</option>
                    <option value="Trims & Fasteners">Trims & Fasteners</option>
                    <option value="Yarns & Threads">Yarns & Threads</option>
                  </select>
                </div>
                <div style={styles.inputField}>
                  <label style={styles.inputLabel}>Unit of Measure</label>
                  <input
                    type="text"
                    placeholder="kg, meters, pcs, cones"
                    value={addForm.unit}
                    onChange={e=>setAddForm(f=>({...f, unit:e.target.value}))}
                    className="input-focus"
                    style={styles.textInput}
                  />
                </div>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
                <div style={styles.inputField}>
                  <label style={styles.inputLabel}>Current On-Hand Stock</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={addForm.current_inventory}
                    onChange={e=>setAddForm(f=>({...f, current_inventory:e.target.value}))}
                    className="input-focus"
                    style={styles.textInput}
                  />
                </div>
                <div style={styles.inputField}>
                  <label style={styles.inputLabel}>14-Day Forecast Demand</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={addForm.forecasted_demand}
                    onChange={e=>setAddForm(f=>({...f, forecasted_demand:e.target.value}))}
                    className="input-focus"
                    style={styles.textInput}
                  />
                </div>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'12px' }}>
                <div style={styles.inputField}>
                  <label style={styles.inputLabel}>Avg Lead Time (d)</label>
                  <input
                    type="number"
                    min="1"
                    step="0.1"
                    required
                    value={addForm.average_lead_time}
                    onChange={e=>setAddForm(f=>({...f, average_lead_time:e.target.value}))}
                    className="input-focus"
                    style={styles.textInput}
                  />
                </div>
                <div style={styles.inputField}>
                  <label style={styles.inputLabel}>P(disrupt) [0-1]</label>
                  <input
                    type="number"
                    min="0"
                    max="1"
                    step="0.05"
                    required
                    value={addForm.disruption_probability}
                    onChange={e=>setAddForm(f=>({...f, disruption_probability:e.target.value}))}
                    className="input-focus"
                    style={styles.textInput}
                  />
                </div>
                <div style={styles.inputField}>
                  <label style={styles.inputLabel}>Trust Score [0-100]</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={addForm.supplier_trust_score}
                    onChange={e=>setAddForm(f=>({...f, supplier_trust_score:e.target.value}))}
                    className="input-focus"
                    style={styles.textInput}
                  />
                </div>
              </div>

              <div style={{ display:'flex', justifyContent:'flex-end', gap:'10px', marginTop:'16px' }}>
                <button type="button" onClick={()=>setIsAddModalOpen(false)} style={styles.cancelBtn}>Cancel</button>
                <button type="submit" disabled={isSubmittingAdd} className="btn-hover" style={styles.confirmBtn}>
                  {isSubmittingAdd ? 'Saving...' : '✓ Add SKU to Monitoring'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══ EDIT MATERIAL MODAL ═════════════════════════════════════════════ */}
      {editModalItem && (
        <div style={styles.modalOverlay} onClick={()=>setEditModalItem(null)}>
          <div style={styles.modalBox} onClick={e=>e.stopPropagation()}>
            <div style={styles.modalHead}>
              <h3 style={{ fontSize:'16px', fontWeight:800, color:c.title, display:'flex', alignItems:'center', gap:'8px' }}>
                <span>✏️</span> Edit Material — <span style={{ color:'#60A5FA' }}>{editModalItem.product_id}</span>
              </h3>
              <button onClick={()=>setEditModalItem(null)} style={styles.closeBtn}>✕</button>
            </div>
            <form onSubmit={handleUpdateProduct} style={{ display:'flex', flexDirection:'column', gap:'14px', marginTop:'16px' }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
                <div style={styles.inputField}>
                  <label style={styles.inputLabel}>Material Name</label>
                  <input
                    type="text"
                    required
                    value={editForm.product_name || ''}
                    onChange={e=>setEditForm(f=>({...f, product_name:e.target.value}))}
                    className="input-focus"
                    style={styles.textInput}
                  />
                </div>
                <div style={styles.inputField}>
                  <label style={styles.inputLabel}>Category</label>
                  <select
                    value={editForm.category || 'Fabrics'}
                    onChange={e=>setEditForm(f=>({...f, category:e.target.value}))}
                    className="input-focus"
                    style={{ ...styles.textInput, cursor:'pointer' }}
                  >
                    <option value="Fabrics">Fabrics</option>
                    <option value="Dyes & Chemicals">Dyes & Chemicals</option>
                    <option value="Trims & Fasteners">Trims & Fasteners</option>
                    <option value="Yarns & Threads">Yarns & Threads</option>
                  </select>
                </div>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
                <div style={styles.inputField}>
                  <label style={styles.inputLabel}>Current On-Hand Stock ({editForm.unit || 'units'})</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={editForm.current_inventory ?? 0}
                    onChange={e=>setEditForm(f=>({...f, current_inventory:e.target.value}))}
                    className="input-focus"
                    style={{ ...styles.textInput, fontWeight:700, color:'#34D399' }}
                  />
                </div>
                <div style={styles.inputField}>
                  <label style={styles.inputLabel}>14-Day Forecast Demand ({editForm.unit || 'units'})</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={editForm.forecasted_demand ?? 0}
                    onChange={e=>setEditForm(f=>({...f, forecasted_demand:e.target.value}))}
                    className="input-focus"
                    style={styles.textInput}
                  />
                </div>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'12px' }}>
                <div style={styles.inputField}>
                  <label style={styles.inputLabel}>Avg Lead Time (d)</label>
                  <input
                    type="number"
                    min="1"
                    step="0.1"
                    required
                    value={editForm.average_lead_time ?? 1}
                    onChange={e=>setEditForm(f=>({...f, average_lead_time:e.target.value}))}
                    className="input-focus"
                    style={styles.textInput}
                  />
                </div>
                <div style={styles.inputField}>
                  <label style={styles.inputLabel}>P(disrupt) [0-1]</label>
                  <input
                    type="number"
                    min="0"
                    max="1"
                    step="0.05"
                    required
                    value={editForm.disruption_probability ?? 0}
                    onChange={e=>setEditForm(f=>({...f, disruption_probability:e.target.value}))}
                    className="input-focus"
                    style={{ ...styles.textInput, fontWeight:700, color: (editForm.disruption_probability >= 0.7) ? '#F87171' : '#FBBF24' }}
                  />
                </div>
                <div style={styles.inputField}>
                  <label style={styles.inputLabel}>Trust Score [0-100]</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={editForm.supplier_trust_score ?? 50}
                    onChange={e=>setEditForm(f=>({...f, supplier_trust_score:e.target.value}))}
                    className="input-focus"
                    style={styles.textInput}
                  />
                </div>
              </div>

              <div style={{ display:'flex', justifyContent:'flex-end', gap:'10px', marginTop:'16px' }}>
                <button type="button" onClick={()=>setEditModalItem(null)} style={styles.cancelBtn}>Cancel</button>
                <button type="submit" disabled={isSubmittingEdit} className="btn-hover" style={styles.confirmBtn}>
                  {isSubmittingEdit ? 'Saving...' : '✓ Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══ DELETE CONFIRMATION MODAL ═══════════════════════════════════════ */}
      {deleteConfirmItem && (
        <div style={styles.modalOverlay} onClick={()=>setDeleteConfirmItem(null)}>
          <div style={{ ...styles.modalBox, maxWidth:'460px' }} onClick={e=>e.stopPropagation()}>
            <div style={styles.modalHead}>
              <h3 style={{ fontSize:'16px', fontWeight:800, color:'#F87171', display:'flex', alignItems:'center', gap:'8px' }}>
                <span>🗑️</span> Remove SKU from Monitoring
              </h3>
              <button onClick={()=>setDeleteConfirmItem(null)} style={styles.closeBtn}>✕</button>
            </div>
            <div style={{ marginTop:'16px', fontSize:'13px', color:c.title, lineHeight:1.6 }}>
              Are you sure you want to remove <strong style={{ color:'#60A5FA' }}>{deleteConfirmItem.product_id}</strong> ({deleteConfirmItem.product_name}) from active inventory monitoring?
              <div style={{ marginTop:'10px', fontSize:'11.5px', color:c.sub, background: isDark?'rgba(239,68,68,.1)':'#FEE2E2', padding:'10px 12px', borderRadius:'8px', border:'1px solid rgba(239,68,68,.3)' }}>
                ⚠️ This will remove the material from real-time disruption monitoring and production line handoff.
              </div>
            </div>
            <div style={{ display:'flex', justifyContent:'flex-end', gap:'10px', marginTop:'20px' }}>
              <button onClick={()=>setDeleteConfirmItem(null)} style={styles.cancelBtn}>Cancel</button>
              <button
                disabled={isSubmittingDelete}
                onClick={handleDeleteProduct}
                className="btn-hover"
                style={{ ...styles.confirmBtn, background:'linear-gradient(135deg,#DC2626,#EF4444)' }}
              >
                {isSubmittingDelete ? 'Deleting...' : '🗑️ Yes, Delete SKU'}
              </button>
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

      {/* ═══ SLIDE-OVER MATERIAL DETAIL DRAWER (SIDE SHEET) ════════════════ */}
      {drawerItem && (() => {
        const item = productsList.find(p => p.product_id === drawerItem.product_id) || drawerItem;
        const rp = item.disruption_probability;
        const skuSS = Math.round(item.forecasted_demand * 0.35 * (1 + rp));
        const rop = Math.round(item.forecasted_demand * (item.average_lead_time * (1 + rp))) + skuSS;
        const roq = Math.round(item.forecasted_demand * 7 * (1 + rp));
        const shortage = Math.max(0, Math.round(item.forecasted_demand * 0.35 - item.current_inventory));
        const hasShortage = shortage > 0;
        const healthPct = Math.min(1, item.current_inventory / Math.max(1, skuSS));
        const healthColor = healthPct < 0.5 ? '#EF4444' : healthPct < 0.8 ? '#F59E0B' : '#10B981';
        const isDispatched = Boolean(dispatchedPOs[item.product_id]);

        const coverImg = item.category === 'Fabrics'
          ? 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=800&auto=format&fit=crop&q=80'
          : item.category === 'Dyes & Chemicals'
          ? 'https://images.unsplash.com/photo-1581093458791-9f3c3900df4b?w=800&auto=format&fit=crop&q=80'
          : item.category === 'Packaging'
          ? 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&auto=format&fit=crop&q=80'
          : 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800&auto=format&fit=crop&q=80';

        const binLoc = item.product_id.startsWith('FAB') ? 'MAS Colombo · Bay 02 · Rack 14'
          : item.product_id.startsWith('DYE') ? 'MAS Colombo · Chemical Safe Vault 08'
          : item.product_id.startsWith('PKG') ? 'MAS Logistics Center · High-Bay 21'
          : 'MAS Trim Stores · Drawer Shelf 05';

        return (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.65)',
              backdropFilter: 'blur(5px)',
              zIndex: 2500,
              display: 'flex',
              justifyContent: 'flex-end',
              animation: 'fade-backdrop .2s ease',
            }}
            onClick={() => setDrawerItem(null)}
          >
            <div
              style={{
                width: 'min(620px, 94vw)',
                height: '100%',
                background: isDark ? '#0A1424' : '#FFFFFF',
                borderLeft: `1px solid ${c.cardBorder}`,
                boxShadow: '-16px 0 48px rgba(0,0,0,0.4)',
                display: 'flex',
                flexDirection: 'column',
                animation: 'slide-drawer .28s cubic-bezier(0.16, 1, 0.3, 1)',
                overflow: 'hidden',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Cover Image & Top Navigation Bar */}
              <div style={{ position: 'relative', height: '180px', flexShrink: 0, overflow: 'hidden' }}>
                <img
                  src={coverImg}
                  alt={item.product_name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: isDark
                      ? 'linear-gradient(to bottom, rgba(10,20,36,0.3) 0%, rgba(10,20,36,0.95) 100%)'
                      : 'linear-gradient(to bottom, rgba(15,23,42,0.2) 0%, rgba(15,23,42,0.85) 100%)',
                  }}
                />

                {/* Top Floating Badges & Close Button */}
                <div style={{ position: 'absolute', top: '16px', left: '20px', right: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '.06em', color: '#FFFFFF', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)', padding: '4px 10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.2)' }}>
                      MAS ERP MASTER
                    </span>
                    <span style={{ fontSize: '10px', fontWeight: 700, color: '#34D399', background: 'rgba(16,185,129,0.2)', padding: '4px 8px', borderRadius: '6px', border: '1px solid rgba(16,185,129,0.4)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#34D399' }} />
                      SQLite DB Persisted
                    </span>
                  </div>
                  <button
                    onClick={() => setDrawerItem(null)}
                    style={{
                      background: 'rgba(0,0,0,0.5)',
                      border: '1px solid rgba(255,255,255,0.25)',
                      color: '#FFFFFF',
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '14px',
                      backdropFilter: 'blur(6px)',
                      transition: 'all .2s ease',
                    }}
                    title="Close Inspector"
                  >
                    ✕
                  </button>
                </div>

                {/* Title and Identification inside Banner */}
                <div style={{ position: 'absolute', bottom: '16px', left: '22px', right: '22px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 900, fontSize: '15px', color: '#60A5FA', letterSpacing: '.04em', background: 'rgba(30,58,138,0.7)', padding: '2px 8px', borderRadius: '6px', border: '1px solid rgba(96,165,250,0.5)' }}>
                      {item.product_id}
                    </span>
                    <span style={{ fontSize: '11px', color: '#E2E8F0', background: 'rgba(255,255,255,0.15)', padding: '2px 8px', borderRadius: '6px', fontWeight: 600 }}>
                      {item.category}
                    </span>
                    <span style={{
                      fontSize: '10.5px',
                      fontWeight: 800,
                      padding: '2px 8px',
                      borderRadius: '6px',
                      background: rp >= 0.7 ? '#EF4444' : rp >= 0.35 ? '#F59E0B' : '#10B981',
                      color: '#FFFFFF',
                    }}>
                      {rp >= 0.7 ? 'CRITICAL RISK' : rp >= 0.35 ? 'ELEVATED RISK' : 'LOW RISK'}
                    </span>
                  </div>
                  <h2 style={{ margin: 0, fontSize: '19px', fontWeight: 800, color: '#FFFFFF', textShadow: '0 2px 8px rgba(0,0,0,0.6)' }}>
                    {item.product_name}
                  </h2>
                  <div style={{ fontSize: '11px', color: '#CBD5E1', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>📍 {binLoc}</span>
                  </div>
                </div>
              </div>

              {/* Action Toolbar */}
              <div style={{
                padding: '12px 22px',
                background: isDark ? '#0D1B2E' : '#F1F5F9',
                borderBottom: `1px solid ${c.cardBorder}`,
                display: 'flex',
                gap: '8px',
                alignItems: 'center',
                flexWrap: 'wrap',
              }}>
                <button
                  className="btn-hover"
                  onClick={() => { openEditModal(item); setDrawerItem(null); }}
                  style={{
                    background: isDark ? 'linear-gradient(135deg,#2563EB,#1D4ED8)' : 'linear-gradient(135deg,#2563EB,#1E40AF)',
                    color: '#fff',
                    border: 'none',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 8px rgba(37,99,235,0.3)',
                  }}
                >
                  ✏️ Edit SKU Details
                </button>
                <button
                  className="btn-hover"
                  onClick={() => {
                    setPoModalItem({ ...item, reorder_quantity: roq });
                    setDrawerItem(null);
                  }}
                  style={{
                    background: isDispatched ? '#059669' : (isDark ? '#059669' : '#047857'),
                    color: '#fff',
                    border: 'none',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 8px rgba(5,150,105,0.3)',
                  }}
                >
                  {isDispatched ? '✓ PO Dispatched' : '⚡ Dispatch Quick PO'}
                </button>
                <button
                  className="btn-hover"
                  onClick={() => { setXaiModalSku(item); }}
                  style={{
                    background: isDark ? '#1E293B' : '#FFFFFF',
                    color: isDark ? '#E2E8F0' : '#1E293B',
                    border: `1px solid ${c.cardBorder}`,
                    padding: '8px 12px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                  }}
                  title="Inspect mathematical derivation and safety stock proof"
                >
                  📐 XAI Proof
                </button>
                <button
                  className="btn-hover"
                  onClick={() => { setDeleteConfirmItem(item); setDrawerItem(null); }}
                  style={{
                    background: isDark ? 'rgba(239,68,68,0.15)' : '#FEE2E2',
                    color: isDark ? '#FCA5A5' : '#B91C1C',
                    border: isDark ? '1px solid rgba(239,68,68,0.3)' : '1px solid #FCA5A5',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    marginLeft: 'auto',
                  }}
                  title="Archive or delete SKU from database"
                >
                  🗑️ Delete
                </button>
              </div>

              {/* Scrollable Content Body */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '22px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
                {/* 1. Inventory Status & Health Gauge */}
                <div style={{
                  background: isDark ? 'rgba(255,255,255,0.03)' : '#F8FAFC',
                  border: `1px solid ${c.cardBorder}`,
                  borderRadius: '14px',
                  padding: '16px 18px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <div>
                      <div style={{ fontSize: '11px', color: c.sub, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em' }}>
                        Physical Stock Level
                      </div>
                      <div style={{ fontSize: '24px', fontWeight: 900, color: c.title, marginTop: '2px' }}>
                        {item.current_inventory.toLocaleString()} <span style={{ fontSize: '13px', fontWeight: 500, color: c.sub }}>{item.unit}</span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 700,
                        background: hasShortage ? (isDark ? 'rgba(239,68,68,0.2)' : '#FEE2E2') : (isDark ? 'rgba(16,185,129,0.2)' : '#DCFCE7'),
                        color: hasShortage ? (isDark ? '#FCA5A5' : '#991B1B') : (isDark ? '#6EE7B7' : '#166534'),
                        border: `1px solid ${hasShortage ? '#EF4444' : '#10B981'}`,
                      }}>
                        {hasShortage ? `⚠ Shortage: -${shortage.toLocaleString()} ${item.unit}` : '✓ Stock Ready'}
                      </span>
                      <div style={{ fontSize: '10.5px', color: c.sub, marginTop: '4px' }}>
                        Target Safety Buffer: {skuSS.toLocaleString()} {item.unit}
                      </div>
                    </div>
                  </div>

                  {/* Stock health progress bar */}
                  <div style={{ height: '8px', background: isDark ? '#1E293B' : '#E2E8F0', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${Math.min(100, healthPct * 100)}%`, background: healthColor, borderRadius: '4px', transition: 'width .6s ease' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: c.sub, marginTop: '6px' }}>
                    <span>0 {item.unit}</span>
                    <span style={{ color: healthColor, fontWeight: 700 }}>{Math.round(healthPct * 100)}% of Adaptive Safety Buffer</span>
                    <span>Target: {skuSS.toLocaleString()} {item.unit}</span>
                  </div>
                </div>

                {/* 2. Stochastic Supply Chain Telemetry (4 Bento Mini-Tiles) */}
                <div>
                  <div style={{ fontSize: '11.5px', fontWeight: 700, color: c.sub, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: '10px' }}>
                    Upstream Stochastic Telemetry
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                    {/* Tile 1: Demand */}
                    <div style={{ background: isDark ? '#0D1B2E' : '#F8FAFC', border: `1px solid ${c.cardBorder}`, borderRadius: '12px', padding: '12px 14px' }}>
                      <div style={{ fontSize: '10.5px', color: c.sub, fontWeight: 600 }}>14-DAY FORECAST</div>
                      <div style={{ fontSize: '18px', fontWeight: 800, color: c.title, marginTop: '4px' }}>
                        {item.forecasted_demand.toLocaleString()} <span style={{ fontSize: '11px', fontWeight: 500, color: c.sub }}>{item.unit}</span>
                      </div>
                      <div style={{ fontSize: '10px', color: '#60A5FA', marginTop: '3px' }}>
                        Std Dev: ±{item.demand_std_dev.toLocaleString()} {item.unit}
                      </div>
                    </div>

                    {/* Tile 2: Lead Time */}
                    <div style={{ background: isDark ? '#0D1B2E' : '#F8FAFC', border: `1px solid ${c.cardBorder}`, borderRadius: '12px', padding: '12px 14px' }}>
                      <div style={{ fontSize: '10.5px', color: c.sub, fontWeight: 600 }}>AVERAGE LEAD TIME</div>
                      <div style={{ fontSize: '18px', fontWeight: 800, color: c.title, marginTop: '4px' }}>
                        {item.average_lead_time} <span style={{ fontSize: '11px', fontWeight: 500, color: c.sub }}>days</span>
                      </div>
                      <div style={{ fontSize: '10px', color: c.sub, marginTop: '3px' }}>
                        Jitter: ±{item.lead_time_std_dev} days variance
                      </div>
                    </div>

                    {/* Tile 3: Disruption Probability */}
                    <div style={{ background: isDark ? '#0D1B2E' : '#F8FAFC', border: `1px solid ${c.cardBorder}`, borderRadius: '12px', padding: '12px 14px' }}>
                      <div style={{ fontSize: '10.5px', color: c.sub, fontWeight: 600 }}>DISRUPTION RISK</div>
                      <div style={{ fontSize: '18px', fontWeight: 800, color: rp >= 0.7 ? '#EF4444' : rp >= 0.35 ? '#F59E0B' : '#10B981', marginTop: '4px' }}>
                        {(rp * 100).toFixed(0)}%
                      </div>
                      <div style={{ fontSize: '10px', color: c.sub, marginTop: '3px' }}>
                        {rp >= 0.7 ? 'Port / Canal Severe Delay' : rp >= 0.35 ? 'Moderate Vessel Congestion' : 'Normal Transit Status'}
                      </div>
                    </div>

                    {/* Tile 4: Supplier Trust */}
                    <div style={{ background: isDark ? '#0D1B2E' : '#F8FAFC', border: `1px solid ${c.cardBorder}`, borderRadius: '12px', padding: '12px 14px' }}>
                      <div style={{ fontSize: '10.5px', color: c.sub, fontWeight: 600 }}>SUPPLIER TRUST SCORE</div>
                      <div style={{ fontSize: '18px', fontWeight: 800, color: item.supplier_trust_score >= 70 ? '#10B981' : item.supplier_trust_score >= 40 ? '#F59E0B' : '#EF4444', marginTop: '4px' }}>
                        {item.supplier_trust_score.toFixed(1)} / 100
                      </div>
                      <div style={{ fontSize: '10px', color: c.sub, marginTop: '3px' }}>
                        {item.supplier_trust_score >= 70 ? 'Tier-1 Certified Supplier' : 'Requires Dual-Sourcing'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. OPTICHAIN Adaptive Engine Directives */}
                <div style={{
                  background: isDark ? 'linear-gradient(135deg,rgba(37,99,235,0.1),rgba(124,58,237,0.08))' : 'linear-gradient(135deg,#EFF6FF,#F5F3FF)',
                  border: `1px solid ${isDark ? 'rgba(59,130,246,0.3)' : '#BFDBFE'}`,
                  borderRadius: '14px',
                  padding: '16px 18px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <span style={{ fontSize: '16px' }}>⚙️</span>
                    <span style={{ fontWeight: 800, fontSize: '13px', color: isDark ? '#93C5FD' : '#1D4ED8' }}>
                      AI Optimization Engine Recommendations
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', textAlign: 'center' }}>
                    <div style={{ background: isDark ? 'rgba(0,0,0,0.3)' : '#FFFFFF', padding: '10px', borderRadius: '10px', border: `1px solid ${c.cardBorder}` }}>
                      <div style={{ fontSize: '10px', color: c.sub, fontWeight: 700 }}>SAFETY BUFFER</div>
                      <div style={{ fontSize: '16px', fontWeight: 900, color: '#3B82F6', marginTop: '3px' }}>{skuSS.toLocaleString()}</div>
                      <div style={{ fontSize: '9px', color: c.sub }}>{item.unit}</div>
                    </div>
                    <div style={{ background: isDark ? 'rgba(0,0,0,0.3)' : '#FFFFFF', padding: '10px', borderRadius: '10px', border: `1px solid ${c.cardBorder}` }}>
                      <div style={{ fontSize: '10px', color: c.sub, fontWeight: 700 }}>REORDER POINT (ROP)</div>
                      <div style={{ fontSize: '16px', fontWeight: 900, color: c.title, marginTop: '3px' }}>{rop.toLocaleString()}</div>
                      <div style={{ fontSize: '9px', color: c.sub }}>Trigger Level</div>
                    </div>
                    <div style={{ background: isDark ? 'rgba(0,0,0,0.3)' : '#FFFFFF', padding: '10px', borderRadius: '10px', border: `1px solid ${c.cardBorder}` }}>
                      <div style={{ fontSize: '10px', color: c.sub, fontWeight: 700 }}>RECOMMENDED ROQ</div>
                      <div style={{ fontSize: '16px', fontWeight: 900, color: '#10B981', marginTop: '3px' }}>{roq.toLocaleString()}</div>
                      <div style={{ fontSize: '9px', color: c.sub }}>Batch Size</div>
                    </div>
                  </div>

                  <div style={{ marginTop: '12px', padding: '10px 12px', background: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.7)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px' }}>
                    <span style={{ color: c.sub }}>Recommended Logistics Dispatch:</span>
                    <span style={{ fontWeight: 700, color: rp >= 0.7 ? '#F59E0B' : '#60A5FA' }}>
                      {rp >= 0.7 ? '✈️ Expedited Air Freight (2d ETA)' : '🚢 Standard Sea Freight (7d ETA)'}
                    </span>
                  </div>
                </div>

                {/* 4. Action Shortcuts & What-If Simulator Jump */}
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    className="btn-hover"
                    onClick={() => {
                      setSelectedSku(item.product_id);
                      setActiveTab('simulator');
                      setDrawerItem(null);
                    }}
                    style={{
                      flex: 1,
                      background: isDark ? '#1E293B' : '#E2E8F0',
                      color: isDark ? '#E2E8F0' : '#1E293B',
                      border: `1px solid ${c.cardBorder}`,
                      padding: '11px',
                      borderRadius: '10px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                    }}
                  >
                    🧪 Launch in What-If Simulator ↗
                  </button>
                  <button
                    className="btn-hover"
                    onClick={() => {
                      setSelectedSku(item.product_id);
                      setActiveTab('apiTester');
                      setDrawerItem(null);
                    }}
                    style={{
                      flex: 1,
                      background: isDark ? '#1E293B' : '#E2E8F0',
                      color: isDark ? '#E2E8F0' : '#1E293B',
                      border: `1px solid ${c.cardBorder}`,
                      padding: '11px',
                      borderRadius: '10px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                    }}
                  >
                    ⚡ Test in Live API Studio ↗
                  </button>
                </div>

                {/* 5. Database & Audit Traceability */}
                <div style={{
                  padding: '12px 14px',
                  background: isDark ? 'rgba(0,0,0,0.2)' : '#F1F5F9',
                  borderRadius: '10px',
                  border: `1px dashed ${c.tagBorder}`,
                  fontSize: '10.5px',
                  color: c.sub,
                  lineHeight: 1.6,
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                    <span>Persistent Table:</span>
                    <span style={{ color: isDark ? '#93C5FD' : '#2563EB', fontFamily: 'monospace' }}>inventory_products</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Storage Engine:</span>
                    <span>SQLite (backend/optichain_inventory.db)</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>MAS ERP Sync:</span>
                    <span style={{ color: '#10B981', fontWeight: 700 }}>● Active Real-time</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

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
      background: c.isDark
        ? 'linear-gradient(135deg,#0D1B2E 0%,#091526 60%,#0F243E 100%)'
        : 'linear-gradient(135deg,#FFFFFF 0%,#F8FAFC 100%)',
      border:`1px solid ${c.cardBorder}`, borderRadius:'20px', padding:'22px 26px',
      boxShadow: c.isDark ? '0 8px 32px rgba(0,0,0,.45),inset 0 1px 0 rgba(255,255,255,.05)' : '0 4px 20px rgba(15,23,42,.06)',
      position:'relative', overflow:'hidden',
    },
    orbBlue:   { position:'absolute', top:'-50px', right:'8%',  width:'220px', height:'220px', background:'radial-gradient(circle,rgba(37,99,235,.12) 0%,transparent 70%)', borderRadius:'50%', pointerEvents:'none' },
    orbPurple: { position:'absolute', bottom:'-60px', right:'35%', width:'240px', height:'240px', background:'radial-gradient(circle,rgba(139,92,246,.08) 0%,transparent 70%)', borderRadius:'50%', pointerEvents:'none' },
    headerTopRow: { display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'18px', position:'relative' },
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
    activeSkuChip: {
      background: c.isDark ? 'rgba(37,99,235,.15)' : '#FFFFFF',
      border:`1.5px solid ${c.isDark ? 'rgba(59,130,246,.35)' : '#CBD5E1'}`,
      color: c.isDark ? '#93C5FD' : '#1E40AF', fontSize:'12px', padding:'6px 14px', borderRadius:'12px',
      display:'inline-flex', alignItems:'center', gap:'10px',
      boxShadow: c.isDark ? 'none' : '0 2px 8px rgba(15,23,42,0.06)'
    },
    pillBtn: { display:'inline-flex', alignItems:'center', gap:'6px', padding:'6px 14px', borderRadius:'20px', border:'1px solid', fontSize:'11.5px', fontWeight:700, cursor:'pointer', transition:'all .2s' },
    // Table
    searchInput: { padding:'9px 12px', borderRadius:'10px', border:`1.5px solid ${c.inputBorder}`, fontSize:'12.5px', backgroundColor:c.inputBg, color:c.inputText, outline:'none', transition:'all .2s' },
    tableWrapper: { overflowX:'auto', borderRadius:'12px', border:`1px solid ${c.tableBorder}`, position:'relative' },
    table: { width:'100%', minWidth:'1320px', borderCollapse:'collapse', fontSize:'12.5px' },
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
    addBtn: { background:'linear-gradient(135deg,#1E40AF,#2563EB)', border:'none', color:'#FFFFFF', borderRadius:'10px', padding:'9px 16px', fontSize:'12px', fontWeight:800, cursor:'pointer', display:'inline-flex', alignItems:'center', gap:'6px', boxShadow:'0 4px 14px rgba(37,99,235,.35)', whiteSpace:'nowrap' },
    editBtn: { background: c.isDark?'rgba(59,130,246,.12)':'#EFF6FF', border:`1px solid ${c.isDark?'rgba(59,130,246,.3)':'#BFDBFE'}`, color: c.isDark?'#93C5FD':'#1E40AF', borderRadius:'8px', padding:'6px 9px', fontSize:'12px', fontWeight:600, cursor:'pointer', transition:'all .2s' },
    deleteBtn: { background: c.isDark?'rgba(239,68,68,.12)':'#FEE2E2', border:`1px solid ${c.isDark?'rgba(239,68,68,.3)':'#FECACA'}`, color: c.isDark?'#FCA5A5':'#DC2626', borderRadius:'8px', padding:'6px 9px', fontSize:'12px', fontWeight:600, cursor:'pointer', transition:'all .2s' },
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
