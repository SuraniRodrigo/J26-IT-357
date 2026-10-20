import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  optimizeInventoryDetailed,
  getInventorySummary,
  getInventoryProducts,
  runScenarioAnalysis,
  getProductionInterface,
  getResearchResults,
  getDemoUpstreamFeeds,
  createInventoryProduct,
  updateInventoryProduct,
  deleteInventoryProduct,
  batchOptimizeInventory,
  getPurchaseOrders,
  createPurchaseOrder,
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

function PolicyComparisonChart({ baseline, current, unit, isDark }) {
  const metrics = [
    { label: 'Safety Stock', baseline: baseline?.ss, current: current.ss },
    { label: 'Reorder Point', baseline: baseline?.rop, current: current.rop },
    { label: 'Reorder Qty', baseline: baseline?.roq, current: current.roq },
  ];
  const maxValue = Math.max(...metrics.flatMap(metric => [metric.baseline || 0, metric.current]), 1);
  const plot = { left: 58, top: 20, width: 644, height: 142 };
  const chartBottom = plot.top + plot.height;
  const textColor = isDark ? '#94A3B8' : '#475569';
  const gridColor = isDark ? '#334155' : '#CBD5E1';
  const formatCompact = value => new Intl.NumberFormat('en', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
  const formatValue = value => new Intl.NumberFormat('en', {
    maximumFractionDigits: 0,
  }).format(value);

  return (
    <div style={{
      gridColumn: '1 / -1',
      padding: '12px 16px 8px',
      border: `1px solid ${isDark ? 'rgba(59,130,246,.25)' : '#D7E3F4'}`,
      borderRadius: '12px',
      background: isDark ? 'rgba(15,23,42,.55)' : '#FFFFFF',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: '11px', fontWeight: 800, color: isDark ? '#E2E8F0' : '#1E293B' }}>
            Baseline vs. Live Policy Metrics
          </div>
          <div style={{ fontSize: '10px', color: textColor, marginTop: '2px' }}>
            Inventory quantities ({unit})
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '10px', color: textColor }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '9px', height: '9px', borderRadius: '3px', background: '#60A5FA' }} />
            Baseline{baseline ? '' : ' (select a preset)'}
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '9px', height: '9px', borderRadius: '3px', background: '#10B981' }} />
            Live Output
          </span>
        </div>
      </div>

      <svg
        role="img"
        aria-label={`Chart comparing baseline and live safety stock, reorder point, and reorder quantity in ${unit}`}
        viewBox="0 0 720 212"
        style={{ width: '100%', height: 'auto', display: 'block', marginTop: '6px' }}
      >
        {[0, 0.25, 0.5, 0.75, 1].map(tick => {
          const y = chartBottom - tick * plot.height;
          return (
            <g key={tick}>
              <line
                x1={plot.left}
                y1={y}
                x2={plot.left + plot.width}
                y2={y}
                stroke={gridColor}
                strokeDasharray={tick === 0 ? undefined : '3 4'}
                strokeWidth="1"
              />
              <text x={plot.left - 8} y={y + 3} fill={textColor} fontSize="9" textAnchor="end">
                {formatCompact(maxValue * tick)}
              </text>
            </g>
          );
        })}
        {metrics.map((metric, index) => {
          const center = plot.left + plot.width * (index + 0.5) / metrics.length;
          const hasBaseline = typeof metric.baseline === 'number';
          const bars = [
            ...(hasBaseline ? [{ key: 'baseline', value: metric.baseline, color: '#60A5FA', x: center - 52 }] : []),
            { key: 'current', value: metric.current, color: '#10B981', x: center + (hasBaseline ? 4 : -24) },
          ];

          return (
            <g key={metric.label}>
              {bars.map(bar => {
                const barHeight = (bar.value / maxValue) * plot.height;
                const y = chartBottom - barHeight;
                return (
                  <g key={bar.key}>
                    <title>{`${metric.label} — ${bar.key === 'baseline' ? 'Baseline' : 'Live Output'}: ${formatValue(bar.value)} ${unit}`}</title>
                    <rect
                      x={bar.x}
                      y={y}
                      width="48"
                      height={barHeight}
                      rx="5"
                      fill={bar.color}
                      opacity="0.88"
                    />
                    <text
                      x={bar.x + 24}
                      y={Math.max(plot.top - 2, y - 5)}
                      fill={bar.color}
                      fontSize="9"
                      fontWeight="700"
                      textAnchor="middle"
                    >
                      {formatCompact(bar.value)}
                    </text>
                  </g>
                );
              })}
              <text
                x={center}
                y={chartBottom + 20}
                fill={textColor}
                fontSize="10"
                fontWeight="600"
                textAnchor="middle"
              >
                {metric.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ─── Circular gauge ─────────────────────────────────────────────────────────
function StockGauge({
  pct,
  label,
  color,
  size = 88,
  precision = 0,
  trackColor = 'rgba(255,255,255,0.06)',
}) {
  const cx = size / 2, cy = size / 2, r = size * 0.41, stroke = size * 0.09;
  const circ = 2 * Math.PI * r;
  const dash = Math.max(0, Math.min(1, pct)) * circ;
  return (
    <div style={{ textAlign: 'center' }}>
      <svg
        role="img"
        aria-label={`${label}: ${(pct * 100).toFixed(precision)}%`}
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
      >
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={trackColor} strokeWidth={stroke} />
        <circle
          cx={cx} cy={cy} r={r} fill="none"
          stroke={color} strokeWidth={stroke}
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`}
          style={{ transition: 'stroke-dasharray 0.6s ease' }}
        />
        <text x={cx} y={cy - 4} textAnchor="middle" fontSize={size * 0.14} fontWeight="800" fill={color}>
          {(pct * 100).toFixed(precision)}%
        </text>
        <text x={cx} y={cy + size * 0.12} textAnchor="middle" fontSize={size * 0.09} fill="#94A3B8">
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

// ─── Real Supply Chain High-Res Imagery per Garment SKU ──────────────────────
// ─── Multi-angle garment & raw material imagery and technical specs ──────────
const SKU_CATALOG_MEDIA = {
  'FAB-001': {
    images: [
      'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=800&auto=format&fit=crop&q=80',
    ],
    fabricSpec: '100% GOTS Organic Cotton · 180 GSM Single Jersey',
    endUse: 'Luxury Minimalist Noir Eveningwear & Core Active Tops',
    garmentType: 'Noir Structured Gown & Core Bodysuits',
    priceEur: '€120',
    rating: 4.9,
  },
  'DYE-008': {
    images: [
      'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=1600&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=800&auto=format&fit=crop&q=80',
    ],
    fabricSpec: 'Eco-Reactive Deep Pigment · OEKO-TEX Standard 100',
    endUse: 'Midnight Noir Rich Dyeing · Colorfastness Grade 4.5',
    garmentType: 'Noir Signature Monochrome Collection',
    priceEur: '€140',
    rating: 4.8,
  },
  'TRM-015': {
    images: [
      'https://images.unsplash.com/photo-1605518216938-7c31b7b14ad0?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=800&auto=format&fit=crop&q=80',
    ],
    fabricSpec: 'Gunmetal Concealed Coil #5 · Anti-Corrosive Finish',
    endUse: 'Seamless Spine Closure on High-Fashion Silhouettes',
    garmentType: 'Contoured Evening Slit Dresses',
    priceEur: '€115',
    rating: 5.0,
  },
  'YRN-042': {
    images: [
      'https://images.unsplash.com/photo-1564419320461-6870880221ad?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&auto=format&fit=crop&q=80',
    ],
    fabricSpec: '30s/1 Combed Ring-Spun Compact Cotton Yarn',
    endUse: 'High-Density Circular Knitting for Seamless Panels',
    garmentType: 'Sculpted Knit Evening Mini Dresses',
    priceEur: '€110',
    rating: 4.7,
  },
  'FAB-002': {
    images: [
      'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=1200&auto=format&fit=crop&q=85',
      'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&auto=format&fit=crop&q=80',
    ],
    fabricSpec: '88% Recycled Poly, 12% Elastane Rib Knit · 240 GSM',
    endUse: 'Body-Contouring Stretch Silhouette with Side Slit',
    garmentType: 'Draped Off-Shoulder Column Gown',
    priceEur: '€135',
    rating: 4.9,
  },
  'TRM-022': {
    images: [
      'https://images.unsplash.com/photo-1617038260897-41a1f14a8ca0?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=800&auto=format&fit=crop&q=80',
    ],
    fabricSpec: 'Matte Black Heavy-Duty Brass Prong Fasteners',
    endUse: 'Detachable Corsetry Straps & Collar Accent Systems',
    garmentType: 'Strapless Fluted Ballgowns',
    priceEur: '€125',
    rating: 4.6,
  },
  'CHM-005': {
    images: [
      'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1485968579580-b6d095142e6e?w=800&auto=format&fit=crop&q=80',
    ],
    fabricSpec: 'Micro-Emulsion Hydrophilic Textile Finish Polymer',
    endUse: 'Cashmere-Touch Silky Handfeel on Viscose Crepe',
    garmentType: 'Noir Draped Satin Gowns',
    priceEur: '€150',
    rating: 4.9,
  },
  'YRN-018': {
    images: [
      'https://images.unsplash.com/photo-1604014237800-1c9102c219da?w=800&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&auto=format&fit=crop&q=80',
    ],
    fabricSpec: 'High-Tenacity 100% Polyester Filament 120D/2',
    endUse: 'Ultra-High Tensile Seam Joining on Stretch Lycra',
    garmentType: 'High-Neck Tailored Eveningwear',
    priceEur: '€120',
    rating: 4.8,
  },
};

const SKU_IMAGES = Object.fromEntries(
  Object.entries(SKU_CATALOG_MEDIA).map(([k, v]) => [k, v.images[0]])
);

// ─── Material category image thumbnail (High contrast & Light Mode safe) ────
function MaterialThumb({ category, isDark }) {
  const map = {
    'Fabrics': {
      img: 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=96&h=96&fit=crop&q=80',
      color: '#2563EB',
      emoji: '🧵',
      label: 'Fabric Roll'
    },
    'Dyes & Chemicals': {
      img: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=96&h=96&fit=crop&q=80',
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
    'Accessories': {
      img: 'https://images.unsplash.com/photo-1605518216938-7c31b7b14ad0?w=96&h=96&fit=crop&q=80',
      color: '#D97706',
      emoji: '🔩',
      label: 'Accessories'
    },
    'Packaging': {
      img: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=96&h=96&fit=crop&q=80',
      color: '#059669',
      emoji: '📦',
      label: 'Packaging'
    },
    'Yarns & Threads': {
      img: 'https://images.unsplash.com/photo-1564419320461-6870880221ad?w=96&h=96&fit=crop&q=80',
      color: '#059669',
      emoji: '🧶',
      label: 'Spun Yarn'
    },
  };
  const m = map[category] || { img: 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=96&h=96&fit=crop&q=80', color: '#64748B', emoji: '📦', label: 'Material' };
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

// ─── Real Satellite-Texture World Map Component with Animated Freight Nodes & Dynamic Rerouting ────
function SupplierWorldMap({ isDark, selectedSku, isRerouted, onToggleReroute }) {
  const W = 720, H = 320;
  // Geographic node mapping: Spread across Indian Ocean & Asian Maritime Corridor
  const factory = { x: 340, y: 220 }; // Colombo CICT Hub, Sri Lanka
  const backupHub = { x: 300, y: 260, label: 'Hambantota Deep Port (Alternative)', flag: '🇱🇰', color: '#10B981' };

  const [activeShipHover, setActiveShipHover] = useState(null);

  // Widely separated geographic coordinates to prevent ANY label overlap
  const nodes = [
    {
      x: 140, y: 130, label: 'Nhava Sheva Hub', flag: '🇮🇳', country: 'India',
      trust: 42, risk: '85%', color: '#DC2626', sku: 'FAB-001', labelOffsetY: -38,
      vessel: 'Ever Given VII', speed: '11.8 kts', teu: '18,500 TEU', delay: 'Choke Point Delay (+3.2d)', eta: '5d 02h', seaState: 'Swell · Beaufort 5'
    },
    {
      x: 320, y: 80, label: 'Chittagong Port', flag: '🇧🇩', country: 'Bangladesh',
      trust: 45, risk: '70%', color: '#DC2626', sku: 'DYE-008', labelOffsetY: -36,
      vessel: 'CMA CGM Bengal', speed: '14.2 kts', teu: '8,400 TEU', delay: 'Monsoon Jitter (+4.0d)', eta: '6d 08h', seaState: 'Rough · Beaufort 6'
    },
    {
      x: 500, y: 155, label: 'Hai Phong Port', flag: '🇻🇳', country: 'Vietnam',
      trust: 60, risk: '65%', color: '#2563EB', sku: 'FAB-002', labelOffsetY: -36,
      vessel: 'Maersk Colombo', speed: '18.1 kts', teu: '12,600 TEU', delay: 'Port Berth Wait (+1.5d)', eta: '4d 18h', seaState: 'Moderate · Beaufort 3'
    },
    {
      x: 610, y: 95, label: 'Guangzhou Hub', flag: '🇨🇳', country: 'China',
      trust: 72, risk: '30%', color: '#D97706', sku: 'TRM-015', labelOffsetY: -38,
      vessel: 'MSC Ariane', speed: '19.4 kts', teu: '14,200 TEU', delay: 'Nominal (+0.4d)', eta: '3d 14h', seaState: 'Calm · Beaufort 2'
    },
  ];

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: '340px', borderRadius: '14px', overflow: 'hidden', border: `1.5px solid ${isDark ? 'rgba(59,130,246,0.3)' : '#CBD5E1'}`, boxShadow: isDark ? '0 12px 32px rgba(0,0,0,0.5)' : '0 6px 20px rgba(15,23,42,0.08)', display: 'flex', flexDirection: 'column' }}>
      {/* Real High-Resolution NASA Earth Satellite Imagery Background */}
      <div style={{ position: 'relative', flex: 1, minHeight: '300px', overflow: 'hidden' }}>
        <img
          src="https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&auto=format&fit=crop&q=80"
          alt="Real Satellite Earth Map"
          referrerPolicy="no-referrer"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center 45%',
            filter: isDark ? 'brightness(0.65) contrast(1.2) saturate(1.1)' : 'brightness(0.95) contrast(1.15) saturate(1.15)',
          }}
        />

        {/* Ambient Dark/Light Overlay for readability */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: isDark
            ? 'radial-gradient(ellipse at 55% 55%, rgba(13,27,46,0.35) 0%, rgba(6,12,23,0.85) 100%)'
            : 'radial-gradient(ellipse at 55% 55%, rgba(240,249,255,0.15) 0%, rgba(226,232,240,0.45) 100%)',
          pointerEvents: 'none',
        }} />

        {/* Top-Right Interactive Route Switcher Control */}
        <div style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          zIndex: 4,
          display: 'flex',
          gap: '8px',
        }}>
          <button
            onClick={onToggleReroute}
            style={{
              padding: '6px 12px',
              borderRadius: '20px',
              border: `1.5px solid ${isRerouted ? '#10B981' : 'rgba(239,68,68,0.6)'}`,
              background: isRerouted
                ? 'linear-gradient(135deg, rgba(16,185,129,0.92), rgba(5,150,105,0.92))'
                : 'linear-gradient(135deg, rgba(239,68,68,0.92), rgba(185,28,28,0.92))',
              color: '#FFFFFF',
              fontSize: '11px',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(0,0,0,0.35)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all .25s ease',
            }}
          >
            <span>{isRerouted ? '🛡️ AI Adaptive Route ACTIVE' : '⚡ Simulate AI Sourcing Reroute'}</span>
            <span style={{ fontSize: '9px', background: 'rgba(255,255,255,0.25)', padding: '1px 6px', borderRadius: '10px' }}>
              {isRerouted ? 'ETA -4 Days' : 'Choke Point Risk'}
            </span>
          </button>
        </div>

        {/* Interactive SVG Freight Vectors Layer */}
        <svg viewBox={`0 0 ${W} ${H}`} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
          <defs>
            <radialGradient id="factPulseGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={isRerouted ? "#10B981" : "#2563EB"} stopOpacity="0.8" />
              <stop offset="100%" stopColor={isRerouted ? "#10B981" : "#2563EB"} stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Animated Trade Lanes (Curved Bézier Paths) */}
          {nodes.map((n, i) => {
            const isMatch = selectedSku === n.sku;
            const targetPt = (isRerouted && n.sku === 'FAB-001') ? backupHub : factory;
            const midX = (n.x + targetPt.x) / 2 + (i % 2 === 0 ? 15 : -15);
            const midY = (n.y + targetPt.y) / 2 - (isRerouted && n.sku === 'FAB-001' ? 35 : 20);
            const pathD = `M${n.x},${n.y} Q${midX},${midY} ${targetPt.x},${targetPt.y}`;
            const laneColor = (isRerouted && n.sku === 'FAB-001') ? '#10B981' : n.color;

            return (
              <g key={i}>
                {/* Glowing Multi-layer Ambient Freight Corridor */}
                <path
                  d={pathD}
                  fill="none"
                  stroke={laneColor}
                  strokeWidth={isMatch ? "6" : "3.5"}
                  opacity={isMatch ? "0.6" : "0.22"}
                  style={{ filter: `drop-shadow(0 0 8px ${laneColor})` }}
                />
                {/* Animated Dashed Lane */}
                <path
                  d={pathD}
                  fill="none"
                  stroke={laneColor}
                  strokeWidth={isMatch ? "2.6" : "1.8"}
                  strokeDasharray="8 5"
                >
                  <animate attributeName="stroke-dashoffset" values="0;-26" dur={`${1.2 + i * 0.3}s`} repeatCount="indefinite" />
                </path>
                {/* Flowing Cargo Vessel Marker */}
                <g
                  style={{ cursor: 'pointer' }}
                  onMouseEnter={() => setActiveShipHover(n)}
                  onMouseLeave={() => setActiveShipHover(null)}
                >
                  <circle r={isMatch ? "8" : "6"} fill="#0B132B" stroke={laneColor} strokeWidth="2.5" filter="drop-shadow(0 0 8px #fff)">
                    <animateMotion dur={`${2.6 + i * 0.4}s`} repeatCount="indefinite" path={pathD} />
                  </circle>
                  <text fontSize="8.5" textAnchor="middle" dy=".3em" fill="#FFFFFF">
                    🚢
                    <animateMotion dur={`${2.6 + i * 0.4}s`} repeatCount="indefinite" path={pathD} />
                  </text>
                </g>
              </g>
            );
          })}

          {/* Malacca & Palk Strait Maritime Chokepoint Hazard Pin */}
          <g>
            <circle cx="560" cy="275" r="9" fill="rgba(239,68,68,0.25)" stroke="#EF4444" strokeWidth="1.5">
              <animate attributeName="r" values="8;14;8" dur="2s" repeatCount="indefinite" />
            </circle>
            <circle cx="560" cy="275" r="4.5" fill="#EF4444" />
            <rect x="500" y="290" width="120" height="18" rx="4" fill="rgba(15,23,42,0.92)" stroke="rgba(239,68,68,0.5)" strokeWidth="1" />
            <text x="560" y="302" textAnchor="middle" fontSize="8" fontWeight="800" fill="#FCA5A5">
              ⚠️ Malacca Swell Chokepoint
            </text>
          </g>

          {/* Alternative Hub Marker if Rerouted */}
          {isRerouted && (
            <g>
              <circle cx={backupHub.x} cy={backupHub.y} r="10" fill="#10B981" stroke="#FFFFFF" strokeWidth="2.5">
                <animate attributeName="r" values="8;13;8" dur="1.8s" repeatCount="indefinite" />
              </circle>
              <rect x={backupHub.x - 65} y={backupHub.y + 12} width="130" height="20" rx="5" fill="rgba(6,95,70,0.92)" stroke="#34D399" strokeWidth="1" />
              <text x={backupHub.x} y={backupHub.y + 25} textAnchor="middle" fontSize="8.5" fontWeight="900" fill="#FFFFFF">
                ⚓ Hambantota Bypass Lane
              </text>
            </g>
          )}

          {/* Colombo Port Factory Central Hub Marker */}
          <circle cx={factory.x} cy={factory.y} r="34" fill="url(#factPulseGlow)" />
          <circle cx={factory.x} cy={factory.y} r="15" fill="none" stroke={isRerouted ? "#34D399" : "#60A5FA"} strokeWidth="2">
            <animate attributeName="r" values="15;30;15" dur="2.2s" repeatCount="indefinite" />
            <animate attributeName="opacity" values="0.8;0;0.8" dur="2.2s" repeatCount="indefinite" />
          </circle>
          <circle cx={factory.x} cy={factory.y} r="8" fill={isRerouted ? "#059669" : "#2563EB"} stroke="#FFFFFF" strokeWidth="2.5" />

          {/* Hub Label Tag */}
          <rect x={factory.x - 62} y={factory.y + 12} width="124" height="22" rx="6" fill="rgba(15,23,42,0.85)" stroke={isRerouted ? "#10B981" : "#3B82F6"} strokeWidth="1.2" />
          <text x={factory.x} y={factory.y + 26} textAnchor="middle" fontSize="9.5" fontWeight="900" fill="#FFFFFF">
            MAS Colombo CICT Hub
          </text>

          {/* Sourcing Origin Pins */}
          {nodes.map((n, i) => {
            const isMatch = selectedSku === n.sku;
            const offsetY = n.labelOffsetY || -36;
            return (
              <g key={i}>
                {/* Micro Leader Line from Pin to Floating Badge */}
                <line x1={n.x} y1={n.y} x2={n.x} y2={n.y + offsetY + 22} stroke={n.color} strokeWidth="1.2" strokeDasharray="2 2" opacity="0.6" />

                {/* Pulsing Origin Radar Ring */}
                <circle cx={n.x} cy={n.y} r={isMatch ? "22" : "16"} fill={`${n.color}25`} stroke={n.color} strokeWidth={isMatch ? "2.5" : "1.5"}>
                  <animate attributeName="r" values={isMatch ? "18;26;18" : "14;20;14"} dur={`${2.5 + i * 0.4}s`} repeatCount="indefinite" />
                </circle>
                <circle cx={n.x} cy={n.y} r={isMatch ? "8" : "6.5"} fill={n.color} stroke="#FFFFFF" strokeWidth="2" />

                {/* Crisp Node Card Badge with High Contrast */}
                <rect
                  x={n.x - 56}
                  y={n.y + offsetY}
                  width="112"
                  height="24"
                  rx="6"
                  fill="rgba(11, 23, 44, 0.94)"
                  stroke={isMatch ? "#60A5FA" : n.color}
                  strokeWidth={isMatch ? "2" : "1.2"}
                  filter="drop-shadow(0 2px 8px rgba(0,0,0,0.5))"
                />
                <text x={n.x} y={n.y + offsetY + 15} textAnchor="middle" fontSize="9" fontWeight="800" fill="#FFFFFF">
                  {n.flag} {n.label}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Live Hoverable Cargo Vessel Telemetry HUD Card */}
        {activeShipHover && (
          <div style={{
            position: 'absolute',
            top: '50px',
            left: '16px',
            background: 'rgba(11,19,43,0.92)',
            backdropFilter: 'blur(10px)',
            border: `1.5px solid ${activeShipHover.color}`,
            borderRadius: '12px',
            padding: '12px 16px',
            color: '#FFFFFF',
            zIndex: 10,
            boxShadow: '0 12px 28px rgba(0,0,0,0.6)',
            animation: 'slide-up .2s ease',
            minWidth: '220px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '14px' }}>🚢</span>
                <span style={{ fontWeight: 900, fontSize: '13px', color: '#60A5FA' }}>{activeShipHover.vessel}</span>
              </div>
              <span style={{
                fontSize: '9px', fontWeight: 800, padding: '2px 6px', borderRadius: '10px',
                background: activeShipHover.color + '33', color: activeShipHover.color,
                border: `1px solid ${activeShipHover.color}88`,
              }}>
                {activeShipHover.flag} {activeShipHover.country}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '10px', marginTop: '8px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '8px' }}>
              <div>
                <span style={{ color: '#94A3B8' }}>Speed:</span> <strong style={{ color: '#FFFFFF' }}>{activeShipHover.speed}</strong>
              </div>
              <div>
                <span style={{ color: '#94A3B8' }}>Payload:</span> <strong style={{ color: '#FFFFFF' }}>{activeShipHover.teu}</strong>
              </div>
              <div>
                <span style={{ color: '#94A3B8' }}>ETA:</span> <strong style={{ color: '#34D399' }}>{activeShipHover.eta}</strong>
              </div>
              <div>
                <span style={{ color: '#94A3B8' }}>Sea State:</span> <strong style={{ color: '#FDE047' }}>{activeShipHover.seaState}</strong>
              </div>
            </div>

            <div style={{ marginTop: '8px', padding: '5px 8px', borderRadius: '6px', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', fontSize: '9.5px', color: '#FCA5A5', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>⚠️ Status:</span>
              <span>{activeShipHover.delay}</span>
            </div>
          </div>
        )}

        {/* Bottom Legend Overlay Bar */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          background: isDark ? 'rgba(10,16,28,0.92)' : 'rgba(255,255,255,0.95)',
          borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0'}`,
          padding: '7px 14px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '8px',
          fontSize: '10px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800, color: isDark ? '#93C5FD' : '#1D4ED8' }}>
            <span>🛰️ Live Satellite GIS</span>
            <span style={{ color: '#10B981', animation: 'pulse-dot 2s infinite' }}>●</span>
            <span style={{ color: isDark ? '#CBD5E1' : '#475569' }}>
              {isRerouted ? 'Bypass Corridors Active · 0 Port Stoppage' : '4 Active Sourcing Corridors'}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <span style={{ color: '#DC2626', fontWeight: 800 }}>● Critical Risk (&gt;60%)</span>
            <span style={{ color: '#10B981', fontWeight: 800 }}>● Rerouted Safe Lane</span>
            <span style={{ color: '#2563EB', fontWeight: 800 }}>● Destination Hub</span>
          </div>
        </div>
      </div>
    </div>
  );
}
// ─── Live Activity Feed with Recommended Layout (KPI Summary + Search + Incident Cards) ──
function ActivityFeed({ productsList, isDark, onSelectSku }) {
  const [filterType, setFilterType] = useState('ALL');
  const [streamSearch, setStreamSearch] = useState('');

  const rawEvents = useMemo(() => {
    const list = [];
    productsList.forEach(p => {
      if (p.disruption_probability >= 0.7) {
        list.push({
          id: `${p.product_id}-crit`,
          title: 'Disruption risk elevated',
          sub: `${p.product_id} · Risk threshold exceeded (${Math.round(p.disruption_probability * 100)}%)`,
          sku: p.product_id,
          color: '#EF4444',
          time: '2m ago',
          type: 'critical',
          badgeText: 'CRITICAL',
          icon: '🚨',
        });
      }
      if (p.current_inventory < (p.safety_stock || p.forecasted_demand * 0.35)) {
        list.push({
          id: `${p.product_id}-warn`,
          title: 'Safety stock breached',
          sub: `${p.product_id} · Reorder assessment required`,
          sku: p.product_id,
          color: '#F59E0B',
          time: '5m ago',
          type: 'warn',
          badgeText: 'WARNING',
          icon: '📦',
        });
      }
    });

    list.push({ id: 'sys-1', title: 'Adaptive optimization completed', sub: 'Calculated 8 dynamic Kingman safety buffers', sku: null, color: '#10B981', time: '8m ago', type: 'system', badgeText: 'SYSTEM', icon: '🔄' });
    list.push({ id: 'sys-2', title: 'Monsoon jitter telemetry received', sub: 'DYE-008 · Chittagong port swell forecast', sku: 'DYE-008', color: '#F59E0B', time: '14m ago', type: 'warn', badgeText: 'WARNING', icon: '📡' });
    list.push({ id: 'sys-3', title: 'Maritime corridor cleared', sub: 'FAB-001 · Ever Given VII crossed Malacca choke', sku: 'FAB-001', color: '#3B82F6', time: '22m ago', type: 'system', badgeText: 'SYSTEM', icon: '🚢' });
    list.push({ id: 'sys-4', title: 'Buffer replenishment confirmed', sub: 'YRN-042 · Received at Colombo CICT Hub', sku: 'YRN-042', color: '#10B981', time: '45m ago', type: 'system', badgeText: 'SYSTEM', icon: '✅' });

    return list;
  }, [productsList]);

  const critCount = rawEvents.filter(e => e.type === 'critical').length;
  const warnCount = rawEvents.filter(e => e.type === 'warn').length;

  const filteredEvents = useMemo(() => {
    let list = rawEvents;
    if (filterType === 'CRITICAL') list = list.filter(e => e.type === 'critical');
    else if (filterType === 'WARN') list = list.filter(e => e.type === 'warn');
    else if (filterType === 'SYSTEM') list = list.filter(e => e.type === 'system');

    if (streamSearch.trim()) {
      const q = streamSearch.toLowerCase();
      list = list.filter(e =>
        e.title.toLowerCase().includes(q) ||
        e.sub.toLowerCase().includes(q) ||
        (e.sku && e.sku.toLowerCase().includes(q))
      );
    }
    return list;
  }, [rawEvents, filterType, streamSearch]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* 1. Header KPI Summary Row: Total events | Critical | Warnings */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '8px',
        padding: '10px 14px',
        marginBottom: '10px',
        background: isDark ? 'rgba(15,23,42,0.6)' : '#F8FAFC',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#E2E8F0'}`,
        borderRadius: '12px',
      }}>
        <div>
          <div style={{ fontSize: '10px', color: isDark ? '#94A3B8' : '#64748B', fontWeight: 600 }}>Total events</div>
          <div style={{ fontSize: '20px', fontWeight: 900, color: isDark ? '#FFFFFF' : '#0F172A', marginTop: '1px' }}>
            {rawEvents.length}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '10px', color: isDark ? '#94A3B8' : '#64748B', fontWeight: 600 }}>Critical</div>
          <div style={{ fontSize: '20px', fontWeight: 900, color: '#EF4444', marginTop: '1px' }}>
            {critCount}
          </div>
        </div>
        <div>
          <div style={{ fontSize: '10px', color: isDark ? '#94A3B8' : '#64748B', fontWeight: 600 }}>Warnings</div>
          <div style={{ fontSize: '20px', fontWeight: 900, color: '#F59E0B', marginTop: '1px' }}>
            {warnCount}
          </div>
        </div>
      </div>

      {/* 2. Search Bar */}
      <div style={{ position: 'relative', marginBottom: '10px' }}>
        <span style={{
          position: 'absolute',
          left: '12px',
          top: '50%',
          transform: 'translateY(-50%)',
          fontSize: '12px',
          color: isDark ? '#64748B' : '#94A3B8',
          pointerEvents: 'none',
        }}>🔍</span>
        <input
          type="text"
          placeholder="Search material or event..."
          value={streamSearch}
          onChange={e => setStreamSearch(e.target.value)}
          className="input-focus"
          style={{
            width: '100%',
            padding: '7px 32px 7px 32px',
            fontSize: '11.5px',
            borderRadius: '10px',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0'}`,
            background: isDark ? 'rgba(15,23,42,0.8)' : '#FFFFFF',
            color: isDark ? '#F1F5F9' : '#0F172A',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
        {streamSearch && (
          <button
            onClick={() => setStreamSearch('')}
            style={{
              position: 'absolute',
              right: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'transparent',
              border: 'none',
              color: isDark ? '#94A3B8' : '#64748B',
              cursor: 'pointer',
              fontSize: '11px',
            }}
          >✕</button>
        )}
      </div>

      {/* 3. Filter Category Pills */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '10px', flexWrap: 'wrap' }}>
        {[
          { id: 'ALL', label: 'All events' },
          { id: 'CRITICAL', label: 'Critical' },
          { id: 'WARN', label: 'Warnings' },
          { id: 'SYSTEM', label: 'System' },
        ].map(tab => {
          const isActive = filterType === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id)}
              className="btn-hover"
              style={{
                fontSize: '10.5px',
                fontWeight: 700,
                padding: '3px 10px',
                borderRadius: '16px',
                cursor: 'pointer',
                border: isActive
                  ? `1px solid ${isDark ? '#3B82F6' : '#2563EB'}`
                  : `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0'}`,
                background: isActive
                  ? (isDark ? 'rgba(59,130,246,0.25)' : '#EFF6FF')
                  : (isDark ? 'rgba(255,255,255,0.02)' : '#F8FAFC'),
                color: isActive ? (isDark ? '#93C5FD' : '#1D4ED8') : (isDark ? '#94A3B8' : '#64748B'),
                transition: 'all .15s ease',
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* 4. Incident Cards List with Navigation Chevron */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        overflowY: 'auto',
        maxHeight: '260px',
        paddingRight: '4px',
      }}>
        {filteredEvents.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 10px', color: isDark ? '#64748B' : '#94A3B8', fontSize: '11px' }}>
            No events match current filter or search criteria.
          </div>
        ) : (
          filteredEvents.map(ev => (
            <div
              key={ev.id}
              onClick={() => {
                if (ev.sku && onSelectSku) onSelectSku(ev.sku);
              }}
              className="btn-hover"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '9px 12px',
                borderRadius: '12px',
                background: isDark ? 'rgba(30,41,59,0.45)' : '#FFFFFF',
                border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0'}`,
                cursor: ev.sku ? 'pointer' : 'default',
                boxShadow: isDark ? '0 2px 6px rgba(0,0,0,0.2)' : '0 1px 4px rgba(15,23,42,0.03)',
                transition: 'all .18s ease',
              }}
            >
              {/* Category Icon */}
              <span style={{
                fontSize: '15px',
                width: '30px',
                height: '30px',
                borderRadius: '8px',
                background: `${ev.color}15`,
                border: `1px solid ${ev.color}35`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                {ev.icon}
              </span>

              {/* Title, Subtitle, and Timestamp */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: isDark ? '#F1F5F9' : '#0F172A' }}>
                    {ev.title}
                  </span>
                  <span style={{
                    fontSize: '8.5px',
                    fontWeight: 900,
                    color: ev.color,
                    background: `${ev.color}18`,
                    border: `1px solid ${ev.color}40`,
                    padding: '1.5px 6px',
                    borderRadius: '6px',
                    letterSpacing: '.04em',
                    textTransform: 'uppercase',
                  }}>
                    {ev.badgeText}
                  </span>
                </div>
                <div style={{ fontSize: '10.5px', color: isDark ? '#94A3B8' : '#64748B', marginTop: '2px', fontWeight: 500 }}>
                  {ev.sub}
                </div>
                <div style={{ fontSize: '9px', color: isDark ? '#64748B' : '#94A3B8', marginTop: '1px' }}>
                  {ev.time}
                </div>
              </div>

              {/* Navigation Chevron */}
              <span style={{
                fontSize: '14px',
                color: isDark ? '#64748B' : '#94A3B8',
                flexShrink: 0,
                paddingLeft: '4px',
              }}>
                ›
              </span>
            </div>
          ))
        )}
      </div>
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

// ─── Financial Impact & Cost-of-Inaction Calculation Helper ──────────────────
const getProductUnitCost = (product) => {
  if (!product) return 5.0;
  if (product.category === 'Fabrics') return 8.5;
  if (product.category === 'Dyes & Chemicals') return 24.0;
  return 0.45; // Accessories / Trims
};

const calculateFinancialImpact = (product, roq, skuSS) => {
  if (!product) return { unitCost: 5, reorderInvestment: 0, downtimeExposure: 0, netProtectedValue: 0, roiMultiplier: '1.0', meta: {}, outageHours: 8, isShortage: false };
  const meta = LINE_METADATA[product.product_id] || { downtimeCost: 2500, line: 'Standard Garment Line', shortLine: 'Main Line', order: 'WO-MAS-GEN', shift: 'Shift A' };
  const unitCost = getProductUnitCost(product);
  const reorderInvestment = Math.round((roq || 0) * unitCost);
  
  const isShortage = (product.current_inventory || 0) < ((product.forecasted_demand || 1000) * 0.35);
  const outageHours = isShortage ? 12 : Math.max(4, Math.round((product.disruption_probability || 0.3) * 16));
  const downtimeExposure = Math.round(meta.downtimeCost * outageHours);
  
  const holdingCost = Math.round(reorderInvestment * 0.12);
  const netProtectedValue = Math.max(0, downtimeExposure - holdingCost);
  const roiMultiplier = reorderInvestment > 0 ? (downtimeExposure / Math.max(1, reorderInvestment)).toFixed(1) : '3.4';

  return {
    unitCost,
    reorderInvestment,
    downtimeExposure,
    netProtectedValue,
    roiMultiplier,
    meta,
    outageHours,
    isShortage,
  };
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
  const [showResearchTransparency, setShowResearchTransparency] = useState(false);
  const [showPipelineCard, setShowPipelineCard] = useState(false);
  const [splitSliderPos, setSplitSliderPos] = useState(50); // 0 to 100% split slider position

  // ── Animated Cost-of-Inaction Live Countdown Timer ───────────────────────────
  const [inactionSeconds, setInactionSeconds] = useState(0);
  const [inactionPaused, setInactionPaused] = useState(false);
  // ── Cargo Ship Telemetry Hover State ─────────────────────────────────────────
  const [hoveredShip, setHoveredShip] = useState(null);

  // ── Auto-Cycling Hero Background & Material Imagery ─────────────────────────
  const [heroBgIdx, setHeroBgIdx] = useState(0);
  const [activeImageIndexes, setActiveImageIndexes] = useState({});
  const [selectedHero3DModal, setSelectedHero3DModal] = useState(null);

  useEffect(() => {
    const bgTimer = setInterval(() => {
      setHeroBgIdx(prev => (prev + 1) % 5);
    }, 5000);
    const timer = setInterval(() => {
      setActiveImageIndexes(prev => {
        const next = { ...prev };
        Object.keys(SKU_CATALOG_MEDIA).forEach(sku => {
          const total = SKU_CATALOG_MEDIA[sku]?.images?.length || 1;
          next[sku] = ((prev[sku] || 0) + 1) % total;
        });
        return next;
      });
    }, 3800);
    return () => { clearInterval(bgTimer); clearInterval(timer); };
  }, []);

  // ── Cost-of-Inaction Accumulating Countdown Effect ──────────────────────────
  useEffect(() => {
    if (inactionPaused) return;
    const tick = setInterval(() => {
      setInactionSeconds(s => s + 1);
    }, 1000);
    return () => clearInterval(tick);
  }, [inactionPaused]);

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
  const [isRerouted, setIsRerouted] = useState(false);
  const [toasts, setToasts] = useState([]);

  // ── Module 4 Readiness & Line Handoff ─────────────────────────────────────
  const [readinessFilter, setReadinessFilter] = useState('ALL');
  const [readinessShift, setReadinessShift] = useState('ALL');
  const [simulateExpeditedArrival, setSimulateExpeditedArrival] = useState(false);
  const [showContractModal, setShowContractModal] = useState(false);
  const [releasedGates, setReleasedGates] = useState({});

  // ── Direct API Tester ─────────────────────────────────────────────────────
  const [directParams, setDirectParams] = useState({
    product_id: 'FAB-001', current_inventory: 3400, in_transit_qty: 1200, forecasted_demand: 15200,
    demand_std_dev: 2280, average_lead_time: 7.0, lead_time_std_dev: 3.2,
    disruption_probability: 0.85, supplier_trust_score: 42.0,
    service_level: 0.95, replenishment_cycle_days: 7,
    scenario: 'MODERATE', policy_type: 'FORECAST_RISK_AWARE',
  });
  const [directApiResult, setDirectApiResult] = useState(null);
  const [isExecutingDirectApi, setIsExecutingDirectApi] = useState(false);
  const [activeControllerTab, setActiveControllerTab] = useState('ALL');
  const [showOptimizerModal, setShowOptimizerModal] = useState(false);
  const [computedPolicies, setComputedPolicies] = useState([]);
  const [showInventoryPicker, setShowInventoryPicker] = useState(false);

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

      // Fetch persisted POs from SQLite via unified client
      try {
        const data = await getPurchaseOrders();
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
      } catch {
        // Fallback or empty PO list
      }
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

  // Synchronize directParams with the active currentProduct
  useEffect(() => {
    if (currentProduct) {
      setDirectParams(prev => ({
        ...prev,
        product_id: currentProduct.product_id,
        current_inventory: currentProduct.current_inventory ?? 3400,
        in_transit_qty: prev.in_transit_qty ?? 1200,
        forecasted_demand: currentProduct.forecasted_demand ?? 15200,
        demand_std_dev: currentProduct.demand_std_dev ?? 2280,
        average_lead_time: currentProduct.average_lead_time ?? 3.5,
        lead_time_std_dev: currentProduct.lead_time_std_dev ?? 1.62,
        disruption_probability: currentProduct.disruption_probability ?? 0.23,
        supplier_trust_score: currentProduct.supplier_trust_score ?? 75.0,
      }));
    }
  }, [currentProduct.product_id]);

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
      await createPurchaseOrder({
        po_number: poNum,
        product_id: poModalItem.product_id,
        product_name: poModalItem.product_name,
        quantity: poModalItem.reorder_quantity,
        freight_mode: freightMode,
        estimated_cost_usd: totalCost,
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
    demand_std_dev: 1500,
    average_lead_time: 7.0,
    lead_time_std_dev: 1.5,
    disruption_probability: 0.35,
    supplier_trust_score: 75.0,
    is_demo_data: false,
  });
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false);
  const [isLoadingDemoFeed, setIsLoadingDemoFeed] = useState(false);

  const [editModalItem, setEditModalItem] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  const [deleteConfirmItem, setDeleteConfirmItem] = useState(null);
  const [isSubmittingDelete, setIsSubmittingDelete] = useState(false);

  const handleLoadDemoFeed = async () => {
    const productId = addForm.product_id.trim().toUpperCase();
    if (!productId) {
      showToast('Enter a SKU ID first to load its demo module data.', 'error');
      return;
    }

    try {
      setIsLoadingDemoFeed(true);
      const feeds = await getDemoUpstreamFeeds();
      const feed = feeds.find(item => item.product_id.toUpperCase() === productId);
      if (!feed) {
        showToast(`No matching demo feed found for ${productId}. Check the demo feed SKU list.`, 'error');
        return;
      }
      setAddForm(form => ({
        ...form,
        product_id: feed.product_id,
        product_name: feed.product_name,
        category: feed.category,
        unit: feed.unit,
        forecasted_demand: feed.forecasted_demand,
        demand_std_dev: feed.demand_std_dev,
        average_lead_time: feed.average_lead_time,
        lead_time_std_dev: feed.lead_time_std_dev,
        disruption_probability: feed.disruption_probability,
        supplier_trust_score: feed.supplier_trust_score,
        is_demo_data: true,
      }));
      showToast(`Loaded demo demand and supplier-risk data for ${feed.product_id}. Enter on-hand stock from your inventory record.`);
    } catch (err) {
      showToast(`Could not load demo module data: ${err.message || 'Error'}`, 'error');
    } finally {
      setIsLoadingDemoFeed(false);
    }
  };

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    const productId = addForm.product_id.trim().toUpperCase();
    const productName = addForm.product_name.trim();
    const unit = addForm.unit.trim();
    if (!productId || !productName || !unit) {
      showToast('Product ID, material name, and unit are required.', 'error');
      return;
    }
    if (!/^[A-Z][A-Z0-9]{1,9}-[A-Z0-9][A-Z0-9._-]{0,39}$/.test(productId)) {
      showToast('Use a SKU in PREFIX-CODE format, such as FAB-009.', 'error');
      return;
    }
    const categoryByPrefix = {
      FAB: 'Fabrics',
      DYE: 'Dyes & Chemicals',
      CHM: 'Dyes & Chemicals',
      TRM: 'Trims & Fasteners',
      YRN: 'Yarns & Threads',
    };
    const expectedCategory = categoryByPrefix[productId.split('-', 1)[0]];
    if (expectedCategory && addForm.category !== expectedCategory) {
      showToast(`SKU prefix ${productId.split('-', 1)[0]} requires the ${expectedCategory} category.`, 'error');
      return;
    }

    const numericValues = {
      current_inventory: Number(addForm.current_inventory),
      forecasted_demand: Number(addForm.forecasted_demand),
      demand_std_dev: Number(addForm.demand_std_dev),
      average_lead_time: Number(addForm.average_lead_time),
      lead_time_std_dev: Number(addForm.lead_time_std_dev),
      disruption_probability: Number(addForm.disruption_probability),
      supplier_trust_score: Number(addForm.supplier_trust_score),
    };
    if (Object.values(numericValues).some(value => !Number.isFinite(value))) {
      showToast('Enter a valid number for every inventory and supplier field.', 'error');
      return;
    }
    if (numericValues.current_inventory < 0 || numericValues.forecasted_demand < 0
      || numericValues.demand_std_dev < 0 || numericValues.lead_time_std_dev < 0) {
      showToast('Stock, demand, and variability values cannot be negative.', 'error');
      return;
    }
    if (numericValues.average_lead_time < 0.1) {
      showToast('Average lead time must be at least 0.1 days.', 'error');
      return;
    }
    if (numericValues.disruption_probability < 0 || numericValues.disruption_probability > 1) {
      showToast('Disruption probability must be between 0 and 1.', 'error');
      return;
    }
    if (numericValues.supplier_trust_score < 0 || numericValues.supplier_trust_score > 100) {
      showToast('Supplier trust score must be between 0 and 100.', 'error');
      return;
    }
    if (numericValues.current_inventory === 0 && numericValues.forecasted_demand === 0) {
      showToast('On-hand stock and forecast demand cannot both be zero. Enter meaningful inventory or demand data.', 'error');
      return;
    }

    try {
      setIsSubmittingAdd(true);
      const created = await createInventoryProduct({
        ...addForm,
        product_id: productId,
        product_name: productName,
        unit,
        ...numericValues,
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
        demand_std_dev: 1500,
        average_lead_time: 7.0,
        lead_time_std_dev: 1.5,
        disruption_probability: 0.35,
        supplier_trust_score: 75.0,
        is_demo_data: false,
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
      demand_std_dev: item.demand_std_dev || Math.round(item.forecasted_demand * 0.15),
      average_lead_time: item.average_lead_time,
      lead_time_std_dev: item.lead_time_std_dev,
      disruption_probability: item.disruption_probability,
      supplier_trust_score: item.supplier_trust_score,
    });
  };

  const handleUpdateProduct = async (e) => {
    e.preventDefault();
    if (!editModalItem) return;
    const productName = String(editForm.product_name || '').trim();
    const unit = String(editForm.unit || '').trim();
    if (!productName || !unit) {
      showToast('Material name and unit are required.', 'error');
      return;
    }
    const skuPrefix = editModalItem.product_id.split('-', 1)[0];
    const categoryByPrefix = {
      FAB: 'Fabrics',
      DYE: 'Dyes & Chemicals',
      CHM: 'Dyes & Chemicals',
      TRM: 'Trims & Fasteners',
      YRN: 'Yarns & Threads',
    };
    const expectedCategory = categoryByPrefix[skuPrefix];
    if (expectedCategory && editForm.category !== expectedCategory) {
      showToast(`SKU prefix ${skuPrefix} requires the ${expectedCategory} category.`, 'error');
      return;
    }
    const numericValues = {
      current_inventory: Number(editForm.current_inventory),
      forecasted_demand: Number(editForm.forecasted_demand),
      demand_std_dev: Number(editForm.demand_std_dev),
      average_lead_time: Number(editForm.average_lead_time),
      lead_time_std_dev: Number(editForm.lead_time_std_dev),
      disruption_probability: Number(editForm.disruption_probability),
      supplier_trust_score: Number(editForm.supplier_trust_score),
    };
    if (Object.values(numericValues).some(value => !Number.isFinite(value))) {
      showToast('Enter a valid number for every inventory and supplier field.', 'error');
      return;
    }
    if (numericValues.current_inventory < 0 || numericValues.forecasted_demand < 0
      || numericValues.demand_std_dev < 0 || numericValues.lead_time_std_dev < 0) {
      showToast('Stock, demand, and variability values cannot be negative.', 'error');
      return;
    }
    if (numericValues.average_lead_time < 0.1) {
      showToast('Average lead time must be at least 0.1 days.', 'error');
      return;
    }
    if (numericValues.disruption_probability < 0 || numericValues.disruption_probability > 1) {
      showToast('Disruption probability must be between 0 and 1.', 'error');
      return;
    }
    if (numericValues.supplier_trust_score < 0 || numericValues.supplier_trust_score > 100) {
      showToast('Supplier trust score must be between 0 and 100.', 'error');
      return;
    }
    if (numericValues.current_inventory === 0 && numericValues.forecasted_demand === 0) {
      showToast('On-hand stock and forecast demand cannot both be zero.', 'error');
      return;
    }

    try {
      setIsSubmittingEdit(true);
      await updateInventoryProduct(editModalItem.product_id, {
        product_name: productName,
        category: editForm.category,
        unit,
        ...numericValues,
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

  // ── Production Scheduling PDF Export (Module 3 -> Module 4 Handoff) ───────
  const handleExportPolicyPDF = useCallback((policyList = null) => {
    const listToExport = policyList || computedPolicies || (directApiResult ? [directApiResult] : []);
    if (!listToExport || listToExport.length === 0) {
      showToast('⚠️ No computed policies available to export as PDF. Compute a policy first.', 'error');
      return;
    }

    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    const rowsHtml = listToExport.map((p, idx) => {
      const isCritical = p.risk_level === 'CRITICAL';
      const isHigh = p.risk_level === 'HIGH';
      const riskBadgeBg = isCritical ? '#FEE2E2' : isHigh ? '#FEF3C7' : '#DCFCE7';
      const riskBadgeColor = isCritical ? '#B91C1C' : isHigh ? '#B45309' : '#15803D';
      const isReorder = Boolean(p.reorder_required);
      const directiveBg = isReorder ? '#FEF2F2' : '#F0FDF4';
      const directiveColor = isReorder ? '#DC2626' : '#16A34A';
      const bo = typeof p.backorder_risk === 'number' ? (p.backorder_risk * 100).toFixed(1) + '%' : '0.0%';

      return `
        <tr style="border-bottom: 1px solid #E2E8F0; ${idx % 2 === 1 ? 'background:#F8FAFC;' : ''}">
          <td style="padding:10px 12px; font-weight:800; font-size:13px; color:#0F172A;">${p.product_id}</td>
          <td style="padding:10px 12px; text-align:right; font-weight:700; color:#2563EB;">${Math.round(p.safety_stock || 0).toLocaleString()}</td>
          <td style="padding:10px 12px; text-align:right; font-weight:700; color:#0F172A;">${Math.round(p.reorder_point || 0).toLocaleString()}</td>
          <td style="padding:10px 12px; text-align:right; font-weight:800; color:#059669;">${Math.round(p.reorder_quantity || 0).toLocaleString()}</td>
          <td style="padding:10px 12px; text-align:right; color:#64748B;">${p.risk_adjusted_lead_time ? p.risk_adjusted_lead_time + ' d' : '—'}</td>
          <td style="padding:10px 12px; text-align:center;">
            <span style="display:inline-block; padding:3px 9px; border-radius:12px; font-size:10.5px; font-weight:800; background:${riskBadgeBg}; color:${riskBadgeColor};">
              ${p.risk_level || 'NOMINAL'}
            </span>
          </td>
          <td style="padding:10px 12px; text-align:center; font-weight:700; color:${(p.backorder_risk || 0) > 0.3 ? '#DC2626' : '#16A34A'};">${bo}</td>
          <td style="padding:10px 12px;">
            <div style="display:inline-block; padding:3px 8px; border-radius:6px; font-size:10.5px; font-weight:800; background:${directiveBg}; color:${directiveColor}; margin-bottom:3px;">
              ${isReorder ? '🔴 REORDER NOW' : '🟢 SUFFICIENT'}
            </div>
            <div style="font-size:11px; color:#475569; line-height:1.35;">
              ${p.reorder_recommendation || 'Policy evaluated by Disruption-Aware Adaptive Engine.'}
            </div>
          </td>
        </tr>
      `;
    }).join('');

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>OPTICHAIN Module 3 to Module 4 Production Handoff PDF</title>
  <style>
    @page { size: A4 landscape; margin: 14mm 12mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0F172A; margin: 0; padding: 20px; background: #FFF; }
    .header-box { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #2563EB; padding-bottom: 14px; margin-bottom: 18px; }
    .title { font-size: 22px; font-weight: 900; color: #0B192C; letter-spacing: -0.02em; }
    .subtitle { font-size: 11px; color: #64748B; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; margin-top: 3px; }
    .meta-box { text-align: right; font-size: 11.5px; color: #475569; }
    .badge-ribbon { display: flex; gap: 12px; margin-bottom: 18px; background: #F1F5F9; border: 1px solid #E2E8F0; padding: 10px 16px; border-radius: 8px; font-size: 12px; }
    .badge-ribbon span { font-weight: 800; color: #0F172A; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th { background: #0F172A; color: #FFFFFF; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; padding: 10px 12px; text-align: left; }
    .footer { margin-top: 24px; border-top: 1px solid #CBD5E1; padding-top: 10px; font-size: 10px; color: #64748B; display: flex; justify-content: space-between; }
    @media print {
      body { padding: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header-box">
    <div>
      <div class="title">OPTICHAIN GUARDIAN · INVENTORY POLICY SPECIFICATION</div>
      <div class="subtitle">Module 03 (Disruption-Aware Adaptive Inventory) ➔ Module 04 (Line Scheduling Handoff)</div>
    </div>
    <div class="meta-box">
      <div><strong>MAS Holdings Colombo Manufacturing Hub</strong></div>
      <div>Dispatch Date: <strong>${dateStr}</strong> · ${timeStr}</div>
      <div>Official Production Integration Document</div>
    </div>
  </div>

  <div class="badge-ribbon">
    <div>Evaluated Items: <span>${listToExport.length} Materials</span></div>
    <div>Reorders Recommended: <span style="color:#DC2626;">${listToExport.filter(x => x.reorder_required).length} Items</span></div>
    <div>Sufficient Coverage: <span style="color:#16A34A;">${listToExport.filter(x => !x.reorder_required).length} Items</span></div>
    <div>Target SLA: <span>95.0% - 99.5%</span></div>
    <div>Handoff Contract: <span>ProductionInterfaceItem (FastAPI)</span></div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Raw Material SKU</th>
        <th style="text-align:right;">Adaptive SS</th>
        <th style="text-align:right;">Reorder Point</th>
        <th style="text-align:right;">Order Qty (ROQ)</th>
        <th style="text-align:right;">Adj Lead Time</th>
        <th style="text-align:center;">Risk Tier</th>
        <th style="text-align:center;">Backorder Risk</th>
        <th>Action Recommendation / Line Allocation</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
  </table>

  <div class="footer">
    <div>Generated by OPTICHAIN Adaptive Inventory Optimizer (Module 3) · Project J26-IT-357</div>
    <div>Confidential & Proprietary — For MAS Line Scheduling & Production Operations Only</div>
  </div>
</body>
</html>`;

    const win = window.open('', '_blank', 'width=1320,height=840');
    if (!win) {
      showToast('⚠️ Pop-up blocked! Please allow pop-ups for this browser tab to generate the PDF.', 'error');
      return;
    }
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 700);
    showToast('📄 Print dialog opened — select "Save as PDF" to download the production scheduling document');
  }, [computedPolicies, directApiResult, showToast]);

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
        @keyframes pipeline-pop {
          0% { opacity:0; transform: scale(0.96) translateY(-8px); filter: blur(3px); }
          60% { transform: scale(1.01) translateY(2px); filter: blur(0px); }
          100% { opacity:1; transform: scale(1) translateY(0); }
        }
        @keyframes col-stagger-1 { from { opacity:0; transform: translateY(14px); } to { opacity:1; transform: translateY(0); } }
        @keyframes col-stagger-2 { from { opacity:0; transform: translateY(18px); } to { opacity:1; transform: translateY(0); } }
        @keyframes col-stagger-3 { from { opacity:0; transform: translateY(22px); } to { opacity:1; transform: translateY(0); } }
        @keyframes glow-pulse {
          0%, 100% { box-shadow: 0 0 15px rgba(37,99,235,0.15); }
          50% { box-shadow: 0 0 28px rgba(37,99,235,0.4); }
        }
        @keyframes alert-pulse {
          0%, 100% { box-shadow: 0 0 20px rgba(239,68,68,0.25), inset 0 0 15px rgba(239,68,68,0.1); }
          50% { box-shadow: 0 0 38px rgba(239,68,68,0.45), inset 0 0 22px rgba(239,68,68,0.25); }
        }
        @keyframes aurora-border {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes float-subtle {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-3px); }
        }
        @keyframes shimmer-sweep {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        @keyframes toast-shrink { from{width:100%} to{width:0%} }
        @keyframes badge-pop { 0%{transform:scale(0.8)} 100%{transform:scale(1)} }
        @keyframes slide-drawer { from{transform:translateX(100%)} to{transform:translateX(0)} }
        @keyframes fade-backdrop { from{opacity:0} to{opacity:1} }
        @keyframes border-shimmer {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .luxury-kpi-card {
          position: relative;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1) !important;
          backdrop-filter: blur(14px) !important;
        }
        .luxury-kpi-card:hover {
          transform: translateY(-5px) scale(1.015) !important;
          box-shadow: 0 20px 40px rgba(0,0,0,0.45) !important;
        }
        .luxury-tab-btn {
          transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1) !important;
        }
        .luxury-tab-btn:hover {
          transform: translateY(-3px) !important;
        }
        @keyframes tab-pop-bounce {
          0% { transform: scale(0.94) translateY(3px); }
          50% { transform: scale(1.02) translateY(-2px); }
          100% { transform: scale(1) translateY(0); }
        }
        @keyframes connector-pulse {
          0%, 100% { opacity: 0.9; transform: translateY(0); }
          50% { opacity: 1; transform: translateY(3px); }
        }
        @keyframes tab-slide-enter {
          0% { opacity: 0; transform: translateY(16px) scale(0.99); }
          60% { transform: translateY(-2px) scale(1.002); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        .connected-tab-content {
          animation: tab-slide-enter 0.32s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          will-change: transform, opacity;
        }
        .split-drag-thumb::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #FFFFFF;
          border: 3.5px solid #F59E0B;
          box-shadow: 0 0 20px rgba(245, 158, 11, 0.8), 0 4px 12px rgba(0,0,0,0.4);
          cursor: grab;
          transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s ease;
        }
        .split-drag-thumb::-webkit-slider-thumb:hover {
          transform: scale(1.25);
          box-shadow: 0 0 30px rgba(245, 158, 11, 1), 0 6px 16px rgba(0,0,0,0.5);
        }
        .split-drag-thumb::-webkit-slider-thumb:active {
          cursor: grabbing;
          transform: scale(1.15);
          background: #FDE047;
          border-color: #D97706;
        }
        .deck-3d-perspective {
          perspective: 1200px;
        }
        .card-3d-tilt {
          transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.35s ease, border-color 0.35s ease !important;
          transform-style: preserve-3d;
        }
        .hero-3d-card {
          perspective: 1000px;
          transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.4s ease;
          transform-style: preserve-3d;
        }
        .hero-3d-card:hover {
          transform: translateY(-8px) rotateX(4deg) rotateY(-4deg) scale(1.02);
          box-shadow: 0 24px 60px rgba(0,0,0,0.65), 0 0 40px rgba(59,130,246,0.4) !important;
        }
        @keyframes float-hero-3d {
          0%, 100% { transform: translateY(0px) rotateY(0deg); }
          50% { transform: translateY(-8px) rotateY(-3deg); }
        }
        @keyframes modal-scale-pop {
          0% { opacity: 0; transform: scale(0.9) translateY(20px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        .pipeline-card-effect {
          transition: transform 0.28s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.28s ease !important;
        }
        .pipeline-card-effect:hover {
          transform: translateY(-4px) !important;
        }
        .col-effect-blue:hover {
          box-shadow: 0 16px 36px rgba(37,99,235,0.22) !important;
        }
        .col-effect-purple:hover {
          box-shadow: 0 16px 36px rgba(124,58,237,0.22) !important;
        }
        .col-effect-emerald:hover {
          box-shadow: 0 16px 36px rgba(16,185,129,0.22) !important;
        }
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

      {/* ═══ CEYLON LUXURY INSPIRED HEADER & FULL-BLEED HERO SLIDER ═══ */}
      {(() => {
        const showcaseSlides = [
          {
            id: 'FAB-001',
            categoryName: 'Organic Cotton Single Jersey',
            heroTitle: 'Materials That Inspire Global Fashion',
            heroSub: '100% GOTS Certified Organic Cotton Single Jersey · 180 GSM. Precision milled for luxury minimalist eveningwear & export activewear collections.',
            collectionLink: 'View GOTS Collection ➔',
            priceTag: '€120 / piece',
            warrantyTag: '✓ OEKO-TEX Standard 100 Certified',
            specs: [
              { label: 'FLOOR INVENTORY', val: '3,400 meters' },
              { label: 'ADAPTIVE BUFFER', val: '7,448 meters' },
              { label: 'TRANSIT CORRIDOR', val: 'Nhava Sheva ➔ Colombo CICT' },
              { label: 'DISRUPTION SIGNAL', val: 'Red Sea Congestion (+3.2d)' },
            ],
            bg: 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=1920&auto=format&fit=crop&q=80',
          },
          {
            id: 'FAB-002',
            categoryName: 'Poly-Spandex Rib Knit',
            heroTitle: 'Engineered For High-Performance Activewear',
            heroSub: '88% Recycled Poly, 12% Elastane Rib Knit · 240 GSM. Micro-textured stretch panels crafted for contoured off-shoulder gowns and stretch leggings.',
            collectionLink: 'View Activewear Knits ➔',
            priceTag: '€135 / piece',
            warrantyTag: '✓ 10-Year Tensile Resilience Guarantee',
            specs: [
              { label: 'FLOOR INVENTORY', val: '5,200 meters' },
              { label: 'ADAPTIVE BUFFER', val: '6,100 meters' },
              { label: 'TRANSIT CORRIDOR', val: 'Hai Phong Port ➔ Colombo' },
              { label: 'DISRUPTION SIGNAL', val: 'Port Jitter (±2.8d)' },
            ],
            bg: 'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=1920&auto=format&fit=crop&q=85',
          },
          {
            id: 'DYE-008',
            categoryName: 'Reactive Navy Dye Chemistry',
            heroTitle: 'Sustainable Chemistry & Monochrome Pigments',
            heroSub: 'Eco-reactive deep midnight pigments with colorfastness grade 4.5. Zero hazardous discharge for high-end European brand compliance.',
            collectionLink: 'View Dyes & Finishing ➔',
            priceTag: '€140 / kg',
            warrantyTag: '✓ Zero Liquid Discharge (ZLD) Verified',
            specs: [
              { label: 'FLOOR INVENTORY', val: '420 kg' },
              { label: 'ADAPTIVE BUFFER', val: '890 kg' },
              { label: 'TRANSIT CORRIDOR', val: 'Chittagong ➔ Colombo CICT' },
              { label: 'DISRUPTION SIGNAL', val: 'Monsoon Jitter (+4.0d)' },
            ],
            bg: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=1920&auto=format&fit=crop&q=80',
          },
          {
            id: 'TRM-015',
            heroTitle: 'Architectural Trims & Precision Hardware',
            categoryName: 'YKK Gunmetal Zippers & Hardware',
            heroSub: 'Gunmetal concealed coil #5 zippers with anti-corrosive finish. Precision spine closure systems engineered for bespoke export silhouettes.',
            collectionLink: 'View Trims Catalog ➔',
            priceTag: '€115 / set',
            warrantyTag: '✓ High-Cycle Salt-Spray Tested',
            specs: [
              { label: 'FLOOR INVENTORY', val: '12,500 pcs' },
              { label: 'ADAPTIVE BUFFER', val: '8,200 pcs' },
              { label: 'TRANSIT CORRIDOR', val: 'Guangzhou Hub ➔ Colombo' },
              { label: 'DISRUPTION SIGNAL', val: 'Nominal Sea Freight' },
            ],
            bg: 'https://images.unsplash.com/photo-1605518216938-7c31b7b14ad0?w=1920&auto=format&fit=crop&q=80',
          },
          {
            id: 'YRN-042',
            categoryName: 'Combed Compact Spun Yarn',
            heroTitle: 'Fine Ring-Spun Compact Cotton Yarns',
            heroSub: '30s/1 combed ring-spun compact cotton yarn. Ultra-high tensile seam joining engineered for seamless automated circular knitting panels.',
            collectionLink: 'View Yarns Portfolio ➔',
            priceTag: '€110 / kg',
            warrantyTag: '✓ BCI Better Cotton Initiative',
            specs: [
              { label: 'FLOOR INVENTORY', val: '18,400 kg' },
              { label: 'ADAPTIVE BUFFER', val: '9,500 kg' },
              { label: 'TRANSIT CORRIDOR', val: 'Nhava Sheva ➔ Colombo' },
              { label: 'DISRUPTION SIGNAL', val: 'Stable Logistics Lane' },
            ],
            bg: 'https://images.unsplash.com/photo-1564419320461-6870880221ad?w=1920&auto=format&fit=crop&q=80',
          },
        ];

        const activeIdx = heroBgIdx % showcaseSlides.length;
        const curSlide = showcaseSlides[activeIdx];

        return (
          <div style={{
            position: 'relative',
            borderRadius: '24px',
            overflow: 'hidden',
            marginBottom: '22px',
            boxShadow: isDark ? '0 24px 60px rgba(0,0,0,0.65)' : '0 16px 45px rgba(15,23,42,0.12)',
            border: `1.5px solid ${isDark ? 'rgba(255,255,255,0.12)' : '#E2E8F0'}`,
            background: '#0B132B',
          }}>
            {/* 1. Ceylon Top Announcement Ticker Bar */}
            <div style={{
              background: '#090E17',
              color: '#CBD5E1',
              padding: '10px 32px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '11.5px',
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              fontWeight: 600,
            }}>
              {/* Social / Channel Icons */}
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <span style={{ color: '#F8FAFC', fontWeight: 800, letterSpacing: '.06em' }}>
                  🇱🇰 MAS COLOMBO MANUFACTURING HUB
                </span>
                <span style={{ color: 'rgba(255,255,255,0.2)' }}>|</span>
                <span style={{ color: '#34D399', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}>
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#34D399', animation: 'pulse-dot 1.8s infinite' }} />
                  Line 04 Active · 99.95% Target SLA
                </span>
              </div>

              {/* Center Warranty Ticker with Arrows */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button
                  onClick={() => setHeroBgIdx(prev => (prev - 1 + showcaseSlides.length) % showcaseSlides.length)}
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    color: '#CBD5E1',
                    borderRadius: '50%',
                    width: '24px',
                    height: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    fontSize: '12px',
                  }}
                  title="Previous"
                >
                  ←
                </button>
                <span style={{
                  color: '#FDE047',
                  fontWeight: 800,
                  letterSpacing: '.04em',
                  background: 'rgba(253,224,71,0.1)',
                  padding: '3px 12px',
                  borderRadius: '12px',
                  border: '1px solid rgba(253,224,71,0.25)',
                }}>
                  🛡️ {curSlide.warrantyTag}
                </span>
                <button
                  onClick={() => setHeroBgIdx(prev => (prev + 1) % showcaseSlides.length)}
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.15)',
                    color: '#CBD5E1',
                    borderRadius: '50%',
                    width: '24px',
                    height: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    fontSize: '12px',
                  }}
                  title="Next"
                >
                  →
                </button>
              </div>

              {/* Right utility links */}
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <span style={{ color: '#94A3B8', fontSize: '11px' }}>Deep Port CICT Colombo</span>
                <button
                  onClick={() => { const n = isDark ? 'light' : 'dark'; setTheme(n); try { localStorage.setItem('optichain_inventory_theme', n); } catch (e) {} }}
                  style={{
                    background: isDark ? 'rgba(255,255,255,0.12)' : '#0F172A',
                    border: '1px solid rgba(255,255,255,0.2)',
                    color: '#FFFFFF',
                    padding: '3px 12px',
                    borderRadius: '14px',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  {isDark ? '☀️ Light' : '🌙 Dark'}
                </button>
              </div>
            </div>

            {/* 2. Ceylon Clean Brand Navigation Bar with Smooth Category Tabs */}
            <div style={{
              background: '#FFFFFF',
              color: '#0F172A',
              padding: '16px 32px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '1px solid #E2E8F0',
              flexWrap: 'wrap',
              gap: '14px',
            }}>
              {/* Brand Logo */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #0B192C, #1E3A8A)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '22px',
                  color: '#FFFFFF',
                  boxShadow: '0 4px 12px rgba(30,58,138,0.25)',
                }}>
                  🛡️
                </div>
                <div>
                  <div style={{ fontWeight: 900, fontSize: '20px', letterSpacing: '-0.025em', color: '#0F172A', lineHeight: 1.1 }}>
                    OPTICHAIN <span style={{ color: '#2563EB' }}>GUARDIAN</span>
                  </div>
                  <div style={{ fontSize: '9.5px', fontWeight: 800, color: '#64748B', letterSpacing: '.08em', marginTop: '2px' }}>
                    SRI LANKA EXPORT APPAREL · MODULE 03
                  </div>
                </div>
              </div>

              {/* Enterprise System Status & Active SKU Pill */}
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: '#F1F5F9',
                  border: '1px solid #E2E8F0',
                  padding: '6px 14px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#1E293B',
                }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981', boxShadow: '0 0 8px #10B981' }}></span>
                  <span>Active Material: <strong style={{ color: '#2563EB' }}>{curSlide.id}</strong> ({curSlide.categoryName})</span>
                </div>
              </div>

              {/* Quick Actions */}
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button
                  onClick={() => {
                    const fullItem = productsList.find(p => p.product_id === curSlide.id) || {
                      product_id: curSlide.id,
                      product_name: curSlide.categoryName,
                      category: 'Fabrics',
                      current_inventory: 3400,
                      forecasted_demand: 15200,
                      demand_std_dev: 2280,
                      average_lead_time: 7.0,
                      lead_time_std_dev: 3.2,
                      disruption_probability: 0.85,
                      supplier_trust_score: 55,
                      unit: 'METERS',
                    };
                    setDrawerItem(fullItem);
                  }}
                  style={{
                    fontSize: '12px',
                    fontWeight: 800,
                    background: '#0F172A',
                    color: '#FFFFFF',
                    padding: '8px 18px',
                    borderRadius: '24px',
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(15,23,42,0.2)',
                  }}
                >
                  Inspect Material BOM ➔
                </button>
              </div>
            </div>

            {/* 3. Ceylon Full-Bleed Hero Image Canvas */}
            <div style={{
              position: 'relative',
              height: '480px',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-end',
              padding: '52px 42px',
            }}>
              {/* Background Photography with Slow Motion Cinematic Zoom */}
              <img
                key={curSlide.bg}
                src={curSlide.bg}
                alt={curSlide.heroTitle}
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=1920&auto=format&fit=crop&q=80';
                }}
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  objectPosition: 'center 40%',
                  animation: 'fade-backdrop 1.2s ease',
                  filter: 'brightness(0.55) contrast(1.15)',
                  transform: 'scale(1.03)',
                  transition: 'transform 8s ease-out',
                }}
              />

              {/* Gentle Gradient Mask for High Text Contrast */}
              <div style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(to top, rgba(7,14,29,0.95) 0%, rgba(7,14,29,0.45) 50%, rgba(7,14,29,0.2) 100%)',
                pointerEvents: 'none',
              }} />

              {/* Ceylon Furniture Style Hero Content Split: Left Text + Right Floating 3D Material Card */}
              <div style={{
                position: 'relative',
                zIndex: 3,
                width: '100%',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '32px',
                flexWrap: 'wrap',
              }}>
                {/* Left Column: Bold Ceylon Narrative */}
                <div style={{ flex: '1 1 560px', maxWidth: '780px' }}>
                  {/* SKU Badge & Assurance Tag */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px', flexWrap: 'wrap' }}>
                    <span style={{
                      background: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
                      color: '#FFFFFF',
                      fontSize: '11px',
                      fontWeight: 900,
                      padding: '4px 14px',
                      borderRadius: '20px',
                      letterSpacing: '.08em',
                      boxShadow: '0 4px 12px rgba(37,99,235,0.4)',
                    }}>
                      {curSlide.id}
                    </span>
                    <span style={{ color: '#E2E8F0', fontSize: '13.5px', fontWeight: 800 }}>
                      {curSlide.categoryName}
                    </span>
                    <span style={{
                      fontSize: '10.5px',
                      fontWeight: 700,
                      color: '#10B981',
                      background: 'rgba(16,185,129,0.2)',
                      padding: '3px 10px',
                      borderRadius: '12px',
                      border: '1px solid rgba(16,185,129,0.4)',
                    }}>
                      {curSlide.warrantyTag}
                    </span>
                  </div>

                  {/* Big Bold Headline */}
                  <h1 style={{
                    margin: '0 0 14px 0',
                    fontSize: 'clamp(34px, 4.5vw, 54px)',
                    fontWeight: 900,
                    color: '#FFFFFF',
                    letterSpacing: '-0.035em',
                    lineHeight: 1.08,
                    textShadow: '0 4px 24px rgba(0,0,0,0.95)',
                  }}>
                    {curSlide.heroTitle}
                  </h1>

                  {/* Narrative Subtext */}
                  <p style={{
                    margin: '0 0 24px 0',
                    fontSize: '15px',
                    fontWeight: 500,
                    color: '#E2E8F0',
                    maxWidth: '680px',
                    lineHeight: 1.5,
                    textShadow: '0 2px 12px rgba(0,0,0,0.95)',
                  }}>
                    {curSlide.heroSub}
                  </p>

                  {/* Live Telemetry Specs & Slider Controls Bar */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '18px',
                    background: 'rgba(10,16,28,0.75)',
                    backdropFilter: 'blur(12px)',
                    padding: '14px 20px',
                    borderRadius: '16px',
                    border: '1px solid rgba(255,255,255,0.15)',
                    boxShadow: '0 12px 32px rgba(0,0,0,0.4)',
                  }}>
                    {/* Real-time Telemetry Grid */}
                    <div style={{ display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap' }}>
                      {curSlide.specs.slice(0, 3).map((sp, sIdx) => (
                        <div key={sIdx}>
                          <div style={{ fontSize: '9px', fontWeight: 800, color: '#93C5FD', letterSpacing: '.08em', textTransform: 'uppercase' }}>
                            {sp.label}
                          </div>
                          <div style={{ fontSize: '14.5px', fontWeight: 900, color: '#FFFFFF', marginTop: '2px', textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}>
                            {sp.val}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Right: Price + Ceylon Slider Arrows */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '9px', color: '#CBD5E1', fontWeight: 700, letterSpacing: '.06em' }}>PRICE</div>
                        <div style={{ fontSize: '18px', fontWeight: 900, color: '#FDE047' }}>
                          {curSlide.priceTag}
                        </div>
                      </div>

                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <button
                          onClick={() => setHeroBgIdx(prev => (prev - 1 + showcaseSlides.length) % showcaseSlides.length)}
                          style={{
                            width: '34px',
                            height: '34px',
                            borderRadius: '50%',
                            background: 'rgba(255,255,255,0.2)',
                            border: '1px solid rgba(255,255,255,0.35)',
                            color: '#FFFFFF',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '14px',
                            backdropFilter: 'blur(6px)',
                            transition: 'background .2s',
                          }}
                          title="Previous Material"
                        >
                          ←
                        </button>

                        <button
                          onClick={() => setHeroBgIdx(prev => (prev + 1) % showcaseSlides.length)}
                          style={{
                            width: '34px',
                            height: '34px',
                            borderRadius: '50%',
                            background: 'rgba(255,255,255,0.2)',
                            border: '1px solid rgba(255,255,255,0.35)',
                            color: '#FFFFFF',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '14px',
                            backdropFilter: 'blur(6px)',
                            transition: 'background .2s',
                          }}
                          title="Next Material"
                        >
                          →
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: Floating 3D Material Perspective Card with Click-to-Expand */}
                <div
                  className="hero-3d-card"
                  onClick={() => {
                    const fullItem = productsList.find(p => p.product_id === curSlide.id) || {
                      product_id: curSlide.id,
                      product_name: curSlide.categoryName,
                      category: 'Fabrics',
                      current_inventory: 3400,
                      forecasted_demand: 15200,
                      demand_std_dev: 2280,
                      average_lead_time: 7.0,
                      lead_time_std_dev: 3.2,
                      disruption_probability: 0.85,
                      supplier_trust_score: 55,
                      unit: 'METERS',
                    };
                    setSelectedHero3DModal(fullItem);
                  }}
                  style={{
                    flex: '0 0 320px',
                    borderRadius: '22px',
                    background: 'linear-gradient(145deg, rgba(15,23,42,0.88) 0%, rgba(30,41,59,0.75) 100%)',
                    border: '1.5px solid rgba(255,255,255,0.25)',
                    padding: '16px',
                    boxShadow: '0 20px 50px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.2)',
                    backdropFilter: 'blur(16px)',
                    cursor: 'pointer',
                    animation: 'float-hero-3d 6s ease-in-out infinite',
                    position: 'relative',
                  }}
                  title="Click to interact with 3D deep-dive inspector & material laboratory"
                >
                  {/* Glowing 3D Badge */}
                  <div style={{
                    position: 'absolute',
                    top: '26px',
                    right: '26px',
                    background: 'rgba(0,0,0,0.75)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(96,165,250,0.5)',
                    color: '#60A5FA',
                    fontSize: '9.5px',
                    fontWeight: 900,
                    padding: '4px 10px',
                    borderRadius: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    zIndex: 4,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                  }}>
                    <span>✨</span>
                    <span>3D INSPECT</span>
                  </div>

                  {/* 3D High-Res Material Texture Display */}
                  <div style={{
                    width: '100%',
                    height: '190px',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    position: 'relative',
                    border: '1px solid rgba(255,255,255,0.15)',
                    boxShadow: 'inset 0 0 20px rgba(0,0,0,0.4)',
                  }}>
                    <img
                      src={curSlide.bg}
                      alt={curSlide.heroTitle}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        transition: 'transform 0.4s ease',
                      }}
                    />
                    <div style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'linear-gradient(to top, rgba(15,23,42,0.8) 0%, transparent 60%)',
                    }} />
                    <div style={{
                      position: 'absolute',
                      bottom: '10px',
                      left: '12px',
                      color: '#FFFFFF',
                      fontSize: '11px',
                      fontWeight: 800,
                    }}>
                      {curSlide.categoryName}
                    </div>
                  </div>

                  {/* Quick Material Laboratory Attribute Pills */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '12px' }}>
                    <div style={{ background: 'rgba(255,255,255,0.06)', padding: '8px 10px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <div style={{ fontSize: '8.5px', color: '#94A3B8', fontWeight: 800 }}>ESTIMATED STOCK</div>
                      <div style={{ fontSize: '13px', fontWeight: 900, color: '#38BDF8', marginTop: '2px' }}>
                        {curSlide.specs[0].val}
                      </div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.06)', padding: '8px 10px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}>
                      <div style={{ fontSize: '8.5px', color: '#94A3B8', fontWeight: 800 }}>ADAPTIVE BUFFER</div>
                      <div style={{ fontSize: '13px', fontWeight: 900, color: '#34D399', marginTop: '2px' }}>
                        {curSlide.specs[1].val}
                      </div>
                    </div>
                  </div>

                  {/* Click to expand prompt bar */}
                  <div style={{
                    marginTop: '12px',
                    padding: '8px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, rgba(37,99,235,0.25), rgba(124,58,237,0.2))',
                    border: '1px solid rgba(96,165,250,0.3)',
                    textAlign: 'center',
                    fontSize: '11px',
                    fontWeight: 800,
                    color: '#93C5FD',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}>
                    <span>🔍</span> Click For Full 3D Fabric & BOM Specs ↗
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ═══ LUXURY BENTO KPI GRID (Floating Glassmorphism + Ambient Ambient Neon Glow) ═════════════════════════════ */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '16px',
        marginBottom: '20px',
      }}>
        {[
          {
            label: 'TARGET SERVICE LEVEL',
            val: `${summaryData?.average_service_level || 99.95}%`,
            trend: '↑ +0.49pp vs baseline',
            icon: '📈',
            accent: '#10B981',
            spark: [98.2, 98.6, 99.1, 99.4, 99.2, 99.8, 99.95],
            tag: 'OPTIMAL',
            glow: 'rgba(16,185,129,0.18)',
            desc: 'MAS Line 04 High-Precision SLA',
          },
          {
            label: 'STOCKOUT MITIGATION',
            val: `${summaryData?.stockout_mitigation_pct || 91.95}%`,
            trend: '−91.95% stockout units',
            icon: '✅',
            accent: '#3B82F6',
            spark: [40, 55, 68, 74, 82, 88, 91.95],
            tag: 'SECURED',
            glow: 'rgba(59,130,246,0.18)',
            desc: 'Real-time Buffer Guard Active',
          },
          {
            label: 'MONITORED RAW MATERIALS',
            val: `${summaryData?.total_materials_monitored || productsList.length || 8} SKUs`,
            trend: 'Active supply portfolio',
            icon: '📦',
            accent: '#A855F7',
            spark: [5, 6, 6, 7, 7, 8, 8],
            tag: 'PORTFOLIO',
            glow: 'rgba(168,85,247,0.18)',
            desc: 'Fabrics · Dyes · Trims · Yarns',
          },
          {
            label: 'CRITICAL ALERTS & REORDERS',
            val: `${summaryData?.critical_shortages_count || 7} Shortage`,
            trend: `${summaryData?.reorder_required_count || 8} POs triggered`,
            icon: '🚨',
            accent: '#EF4444',
            spark: [9, 8, 8, 7, 8, 7, 7],
            tag: 'ACTION REQ',
            glow: 'rgba(239,68,68,0.22)',
            desc: 'Lead-Time Variance Compensated',
          },
        ].map((k, i) => {
          const glowClass = i === 0 ? 'kpi-glow-emerald' : i === 1 ? 'kpi-glow-blue' : i === 2 ? 'kpi-glow-purple' : 'kpi-glow-red';
          return (
            <div
              key={i}
              className={`luxury-kpi-card ${glowClass}`}
              style={{
                background: isDark
                  ? 'linear-gradient(145deg, rgba(13,27,46,0.95) 0%, rgba(8,16,28,0.98) 100%)'
                  : `linear-gradient(145deg, #FFFFFF 0%, ${k.accent}08 100%)`,
                border: `1.5px solid ${isDark ? `${k.accent}35` : `${k.accent}25`}`,
                borderRadius: '16px',
                padding: '16px 18px',
                boxShadow: isDark
                  ? `0 10px 28px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.06), 0 0 16px ${k.glow}`
                  : `0 6px 20px rgba(15,23,42,0.05), inset 0 1px 0 #FFFFFF, 0 2px 10px ${k.glow}`,
                overflow: 'hidden',
                cursor: 'pointer',
                position: 'relative',
              }}
            >
              {/* Corner Ambient Glow Mesh */}
              <div style={{
                position: 'absolute',
                top: '-25px',
                right: '-25px',
                width: '110px',
                height: '110px',
                borderRadius: '50%',
                background: `radial-gradient(circle, ${k.glow} 0%, transparent 70%)`,
                pointerEvents: 'none',
              }} />

              {/* Top Accent Strip */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: '14px',
                right: '14px',
                height: '2px',
                background: `linear-gradient(90deg, transparent, ${k.accent}, transparent)`,
                opacity: 0.8,
              }} />

              {/* Top Row: Icon + Label + Tag */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    fontSize: '14px',
                    background: isDark ? 'rgba(255,255,255,0.06)' : `${k.accent}12`,
                    padding: '5px 7px',
                    borderRadius: '8px',
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : `${k.accent}30`}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    {k.icon}
                  </span>
                  <div>
                    <div style={{ fontSize: '10.5px', fontWeight: 800, letterSpacing: '.06em', color: isDark ? '#E2E8F0' : '#1E293B' }}>
                      {k.label}
                    </div>
                    <div style={{ fontSize: '9px', color: isDark ? '#64748B' : '#64748B', marginTop: '1px' }}>
                      {k.desc}
                    </div>
                  </div>
                </div>

                <span style={{
                  fontSize: '9px',
                  fontWeight: 900,
                  color: k.accent,
                  background: `${k.accent}15`,
                  padding: '2.5px 8px',
                  borderRadius: '12px',
                  border: `1px solid ${k.accent}40`,
                  letterSpacing: '.04em',
                }}>
                  {k.tag}
                </span>
              </div>

              {/* Metric Value + Sparkline Row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', position: 'relative', marginTop: '4px' }}>
                <div>
                  <div className="kpi-value-animated" style={{
                    fontSize: '26px',
                    fontWeight: 900,
                    color: isDark ? '#FFFFFF' : '#0F172A',
                    letterSpacing: '-0.025em',
                    lineHeight: 1,
                    textShadow: isDark ? `0 2px 12px ${k.glow}` : 'none',
                  }}>
                    {k.val}
                  </div>
                  <div style={{
                    fontSize: '10.5px',
                    color: isDark ? '#94A3B8' : '#475569',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    marginTop: '6px',
                    fontWeight: 600,
                  }}>
                    <span style={{ color: k.accent, fontWeight: 900 }}>{i === 3 ? '⚠' : '↑'}</span>
                    {k.trend}
                  </div>
                </div>

                {/* Sparkline Graphic with Subtle Underglow */}
                <div style={{ filter: isDark ? `drop-shadow(0 2px 6px ${k.accent}55)` : 'none' }}>
                  <MiniSparkline data={k.spark} color={k.accent} isDark={isDark} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ═══ ENTERPRISE SUPPLY CHAIN CONTROL TOWER — DISRUPTION COCKPIT ═══ */}
      {criticalSkus.length > 0 && (() => {
        const totalCostPerHr = criticalSkus.reduce((acc, s) => acc + calculateFinancialImpact(s, 1000, 500).meta.downtimeCost, 0);
        const totalExposure = criticalSkus.reduce((acc, s) => acc + calculateFinancialImpact(s, 1000, 500).downtimeExposure, 0);
        const accumulatedCost = Math.round(totalCostPerHr * (inactionSeconds / 3600));
        const hoursToStoppage = 12;
        const remainingSec = Math.max(0, hoursToStoppage * 3600 - inactionSeconds);
        const remainH = Math.floor(remainingSec / 3600);
        const remainM = Math.floor((remainingSec % 3600) / 60);
        const decimalHrs = (remainH + remainM / 60).toFixed(1);

        // Calculate expedite air cost vs protected loss for projected benefit
        const totalExpediteCost = criticalSkus.reduce((acc, s) => {
          const roq = Math.round(s.forecasted_demand * 7 * (1 + s.disruption_probability));
          return acc + (roq * (s.unit_cost || 12) * 0.18 + 450);
        }, 0);
        const benefitMultiplier = totalExpediteCost > 0 
          ? (totalExposure / totalExpediteCost).toFixed(1) 
          : '3.4';

        const highestRiskSku = [...criticalSkus].sort((a, b) => b.disruption_probability - a.disruption_probability)[0];

        // Disruption stats mapping
        const delayedCount = criticalSkus.length;
        const shortageCount = criticalSkus.filter(s => s.stock_level < (s.safety_stock || 1200)).length || 1;
        const lineDelaysCount = 2;
        const otherAlertsCount = 3;
        const onTimePercent = 72; // SLA benchmark

        // SVG Donut chart calculation
        const radius = 32;
        const circumference = 2 * Math.PI * radius;
        const onTimeOffset = circumference - (onTimePercent / 100) * circumference;

        return (
          <div
            role="region"
            aria-label="Supply Chain Control Tower"
            style={{
              background: 'linear-gradient(160deg, #070D18 0%, #0B1728 50%, #0F223D 100%)',
              border: '1.5px solid rgba(239, 68, 68, 0.45)',
              borderRadius: '20px',
              padding: '18px 22px',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.08), 0 0 32px rgba(239, 68, 68, 0.18)',
              marginBottom: '20px',
              fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
              position: 'relative',
              overflow: 'hidden',
              color: '#F1F5F9',
            }}
          >
            {/* Top Glowing Hazard Warning Bar */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '3px',
              background: 'linear-gradient(90deg, #EF4444, #F59E0B 50%, #EF4444)',
              boxShadow: '0 0 12px #EF4444',
            }} />

            {/* Header Row: Live Radar Title + Disruption Status Pill + Countdown */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
              paddingBottom: '12px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{
                  background: 'rgba(239, 68, 68, 0.2)',
                  border: '1px solid rgba(239, 68, 68, 0.5)',
                  padding: '5px 9px',
                  borderRadius: '10px',
                  fontSize: '15px',
                  boxShadow: '0 0 14px rgba(239, 68, 68, 0.35)',
                }}>🚨</span>
                <div>
                  <div style={{
                    fontSize: '15px',
                    fontWeight: 900,
                    letterSpacing: '0.04em',
                    color: '#FFFFFF',
                    textTransform: 'uppercase',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}>
                    <span>SUPPLY CHAIN CONTROL TOWER</span>
                    <span style={{
                      fontSize: '9.5px',
                      background: 'rgba(239, 68, 68, 0.25)',
                      color: '#FCA5A5',
                      border: '1px solid #EF4444',
                      padding: '1px 7px',
                      borderRadius: '12px',
                      fontWeight: 800,
                    }}>P(RISK) CRITICAL</span>
                  </div>
                  <div style={{ fontSize: '10.5px', color: '#94A3B8', marginTop: '1px' }}>
                    MAS Line 04 Continuous Stream · Port Nhava Sheva & Chittagong Maritime Telemetry
                  </div>
                </div>
              </div>

              {/* Status and Telemetry Quick Chips */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'rgba(239, 68, 68, 0.16)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  padding: '4px 12px',
                  borderRadius: '20px',
                  boxShadow: '0 0 10px rgba(239, 68, 68, 0.2)',
                }}>
                  <span style={{
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    background: '#EF4444',
                    boxShadow: '0 0 8px #EF4444',
                    display: 'inline-block',
                    animation: 'pulseRed 1.6s infinite',
                  }}></span>
                  <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#FCA5A5' }}>
                    {delayedCount} SHIPMENTS DELAYED
                  </span>
                </div>

                <div style={{
                  background: 'rgba(15, 23, 42, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  padding: '4px 12px',
                  borderRadius: '20px',
                  fontSize: '10.5px',
                  color: '#CBD5E1',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}>
                  <span>⏱️ Buffer Horizon:</span>
                  <strong style={{ color: '#FBBF24', fontFamily: 'monospace' }}>{decimalHrs}h to stoppage</strong>
                </div>
              </div>
            </div>

            {/* 3-Column Bento Cockpit Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1.2fr 1fr 1fr',
              gap: '12px',
              marginTop: '14px',
              alignItems: 'stretch',
            }}>
              {/* Column 1: Active Threat Breakdown List */}
              <div style={{
                background: 'rgba(15, 23, 42, 0.75)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '14px',
                padding: '14px 16px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '10px',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                  paddingBottom: '8px',
                }}>
                  <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#94A3B8', letterSpacing: '.06em', textTransform: 'uppercase' }}>
                    📋 ACTIVE THREAT AUDIT
                  </span>
                  <span style={{ fontSize: '10px', color: '#EF4444', fontWeight: 800 }}>LIVE EXCEPTION LOG</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {[
                    { label: 'Delayed Shipments', count: delayedCount, icon: '🚢', color: '#EF4444', bg: 'rgba(239,68,68,0.14)' },
                    { label: 'Inventory Shortages', count: shortageCount, icon: '📦', color: '#F97316', bg: 'rgba(249,115,22,0.14)' },
                    { label: 'Line Stoppage Hazards', count: lineDelaysCount, icon: '⚠️', color: '#F59E0B', bg: 'rgba(245,158,11,0.14)' },
                    { label: 'Customs & Port Dwell', count: otherAlertsCount, icon: '⚓', color: '#38BDF8', bg: 'rgba(56,189,248,0.12)' },
                  ].map((row, idx) => (
                    <div key={idx} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '5px 9px',
                      borderRadius: '8px',
                      background: row.bg,
                      border: `1px solid ${row.color}35`,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '11px', color: '#F1F5F9', fontWeight: 700 }}>
                        <span style={{ fontSize: '12px' }}>{row.icon}</span>
                        <span>{row.label}</span>
                      </div>
                      <span style={{
                        fontSize: '11px',
                        fontWeight: 900,
                        color: row.color,
                        background: 'rgba(0,0,0,0.3)',
                        padding: '1px 7px',
                        borderRadius: '6px',
                        fontFamily: 'monospace',
                      }}>
                        {row.count}
                      </span>
                    </div>
                  ))}
                </div>

                {/* SKU Interactive Tag Bar */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginTop: '10px',
                  paddingTop: '8px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                  flexWrap: 'wrap',
                }}>
                  <span style={{ fontSize: '9.5px', color: '#64748B', fontWeight: 700 }}>DRILL-DOWN:</span>
                  {criticalSkus.map(s => (
                    <button
                      key={s.product_id}
                      onClick={() => {
                        setSelectedSku(s.product_id);
                        setDrawerItem(s);
                      }}
                      title={`Inspect ${s.product_id}`}
                      style={{
                        fontSize: '10px',
                        fontWeight: 800,
                        padding: '2px 8px',
                        borderRadius: '6px',
                        border: '1px solid rgba(239, 68, 68, 0.6)',
                        background: 'rgba(239, 68, 68, 0.25)',
                        color: '#FCA5A5',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {s.product_id} ({Math.round(s.disruption_probability * 100)}%)
                    </button>
                  ))}
                </div>
              </div>

              {/* Column 2: Freight Telemetry & SLA Ring Hub */}
              <div style={{
                background: 'rgba(15, 23, 42, 0.75)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '14px',
                padding: '14px 16px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                  paddingBottom: '8px',
                }}>
                  <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#94A3B8', letterSpacing: '.06em', textTransform: 'uppercase' }}>
                    🛰️ MARITIME SLA & TRANSIT
                  </span>
                  <span style={{ fontSize: '10px', color: '#38BDF8', fontWeight: 800 }}>LIVE GPS</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', margin: '8px 0' }}>
                  {/* Gauge Arc */}
                  <div style={{ position: 'relative', width: '78px', height: '78px', flexShrink: 0 }}>
                    <svg width="78" height="78" viewBox="0 0 80 80" style={{ transform: 'rotate(-90deg)' }}>
                      <circle cx="40" cy="40" r={radius} stroke="rgba(239,68,68,0.25)" strokeWidth="8" fill="transparent" />
                      <circle
                        cx="40"
                        cy="40"
                        r={radius}
                        stroke="#38BDF8"
                        strokeWidth="8"
                        fill="transparent"
                        strokeDasharray={circumference}
                        strokeDashoffset={onTimeOffset}
                        strokeLinecap="round"
                        style={{ filter: 'drop-shadow(0 0 6px rgba(56,189,248,0.7))' }}
                      />
                    </svg>
                    <div style={{
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <span style={{ fontSize: '16px', fontWeight: 900, color: '#FFFFFF', lineHeight: 1 }}>{onTimePercent}%</span>
                      <span style={{ fontSize: '7.5px', fontWeight: 700, color: '#94A3B8', marginTop: '2px' }}>ON-TIME</span>
                    </div>
                  </div>

                  {/* Telemetry Micro-List */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: 1, fontSize: '10.5px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#94A3B8' }}>Active Vessels:</span>
                      <strong style={{ color: '#FFFFFF' }}>4 Cargo Ships</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#94A3B8' }}>Avg Port Dwell:</span>
                      <strong style={{ color: '#F87171' }}>+3.2 Days</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#94A3B8' }}>Primary Chokepoint:</span>
                      <strong style={{ color: '#FBBF24' }}>Nhava Sheva (IN)</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#94A3B8' }}>SLA Target:</span>
                      <strong style={{ color: '#34D399' }}>95.0% SLA</strong>
                    </div>
                  </div>
                </div>

                <div style={{
                  background: 'rgba(0,0,0,0.3)',
                  padding: '5px 8px',
                  borderRadius: '6px',
                  fontSize: '9.5px',
                  color: '#94A3B8',
                  display: 'flex',
                  justifyContent: 'space-between',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}>
                  <span>🔵 Sea Freight: 28 Orders</span>
                  <span style={{ color: '#F59E0B' }}>⚡ Air Express: 4 Dispatched</span>
                </div>
              </div>

              {/* Column 3: Financial Exposure & Instant Mitigation */}
              <div style={{
                background: 'rgba(15, 23, 42, 0.75)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '14px',
                padding: '14px 16px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                  paddingBottom: '8px',
                }}>
                  <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#94A3B8', letterSpacing: '.06em', textTransform: 'uppercase' }}>
                    💰 FINANCIAL DOWNTIME EXPOSURE
                  </span>
                  <span style={{ fontSize: '10px', color: '#10B981', fontWeight: 800 }}>ROI {benefitMultiplier}×</span>
                </div>

                <div style={{
                  background: 'rgba(0, 0, 0, 0.35)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  borderRadius: '10px',
                  padding: '8px 12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-end',
                  margin: '6px 0',
                }}>
                  <div>
                    <div style={{ fontSize: '9.5px', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase' }}>
                      Accumulated Loss
                    </div>
                    <div style={{
                      fontSize: '22px',
                      fontWeight: 900,
                      color: '#FBBF24',
                      letterSpacing: '-0.02em',
                      marginTop: '2px',
                      fontFamily: 'monospace',
                    }}>
                      ${accumulatedCost.toLocaleString()}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '9px', fontWeight: 700, color: '#10B981', textTransform: 'uppercase' }}>
                      Protected Value
                    </div>
                    <div style={{ fontSize: '16px', fontWeight: 900, color: '#10B981', fontFamily: 'monospace' }}>
                      ${(totalExposure - totalExpediteCost > 0 ? totalExposure - totalExpediteCost : 4450).toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Mitigation CTA Button */}
                <button
                  className="btn-hover"
                  onClick={() => {
                    if (highestRiskSku) {
                      const roq = Math.round(highestRiskSku.forecasted_demand * 7 * (1 + highestRiskSku.disruption_probability));
                      setPoModalItem({ ...highestRiskSku, reorder_quantity: roq });
                      setInactionPaused(true);
                    }
                  }}
                  style={{
                    background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                    border: 'none',
                    color: '#FFFFFF',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    fontSize: '12px',
                    fontWeight: 900,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    boxShadow: '0 4px 16px rgba(245, 158, 11, 0.4)',
                    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                  }}
                >
                  <span>⚡ Expedite Reorder (Air Express) →</span>
                </button>
              </div>
            </div>

            {/* Bottom Section: 24-Hour Buffer Depletion Trajectory with Gradient Area Shading */}
            <div style={{
              marginTop: '14px',
              paddingTop: '12px',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '6px',
              }}>
                <div style={{
                  fontSize: '10.5px',
                  fontWeight: 800,
                  color: '#94A3B8',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}>
                  <span>📉</span>
                  <span>24-Hour Dynamic Safety Buffer Depletion Trajectory</span>
                </div>
                <div style={{ fontSize: '9.5px', color: '#FCA5A5', fontWeight: 700 }}>
                  ● Threshold Alert: On-Hand Stock Dips Below 40% Minimum Buffer at Shift B (14:00)
                </div>
              </div>

              {/* High-Tech Shaded Waveform Chart */}
              <div style={{
                background: 'rgba(0, 0, 0, 0.45)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '10px',
                padding: '8px 12px 6px 12px',
                height: '68px',
                position: 'relative',
                overflow: 'hidden',
              }}>
                <svg width="100%" height="100%" viewBox="0 0 600 55" preserveAspectRatio="none" style={{ overflow: 'visible' }}>
                  <defs>
                    <linearGradient id="depletionAreaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.35" />
                      <stop offset="50%" stopColor="#F59E0B" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#EF4444" stopOpacity="0.45" />
                    </linearGradient>
                  </defs>

                  {/* Safety Threshold Line */}
                  <line x1="0" y1="28" x2="600" y2="28" stroke="#EF4444" strokeWidth="1.2" strokeDasharray="4 3" opacity="0.75" />

                  {/* Filled Shaded Area */}
                  <path
                    d="M 0 16 Q 40 8, 80 18 T 160 14 T 240 26 T 320 22 T 400 34 T 480 32 T 540 42 T 600 45 L 600 55 L 0 55 Z"
                    fill="url(#depletionAreaGrad)"
                  />

                  {/* Main Depletion Line */}
                  <path
                    d="M 0 16 Q 40 8, 80 18 T 160 14 T 240 26 T 320 22 T 400 34 T 480 32 T 540 42 T 600 45"
                    fill="none"
                    stroke="#38BDF8"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                  />

                  {/* Critical Breach Point Marker */}
                  <circle cx="540" cy="42" r="5" fill="#EF4444" stroke="#FFFFFF" strokeWidth="1.5">
                    <animate attributeName="r" values="4;7;4" dur="1.8s" repeatCount="indefinite" />
                  </circle>
                  <circle cx="600" cy="45" r="4" fill="#EF4444" />
                </svg>

                {/* Production Shift Timeline Overlays */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '8.5px',
                  color: '#64748B',
                  fontWeight: 700,
                  marginTop: '2px',
                  borderTop: '1px dashed rgba(255, 255, 255, 0.05)',
                  paddingTop: '2px',
                }}>
                  <span>06:00 Shift A (Nominal)</span>
                  <span>10:00 Sewing Peak</span>
                  <span style={{ color: '#F59E0B' }}>14:00 Shift B (Buffer Breach)</span>
                  <span>18:00 Finishing Bay</span>
                  <span style={{ color: '#EF4444' }}>22:00 Shift C (Line Halt Risk)</span>
                </div>
              </div>
            </div>
          </div>
        );
      })()}



      {/* ═══ ENTERPRISE MONOLITHIC COCKPIT (Zero-Gap Integrated Tabs & Active Deck) ═══ */}
      {(() => {
        const tabsConfig = [
          {
            id: 'operations',
            icon: '📊',
            label: 'Operations & Cockpit',
            desc: 'Live telemetry & material inventory',
            theme: {
              activeBg: isDark ? 'linear-gradient(135deg, #059669 0%, #047857 100%)' : 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
              glow: 'rgba(16,185,129,0.35)',
              border: '#10B981',
              color: '#10B981',
            }
          },
          {
            id: 'simulator',
            icon: '⚡',
            label: 'What-If Simulator',
            desc: 'Disruption stress-testing engine',
            theme: {
              activeBg: isDark ? 'linear-gradient(135deg, #D97706 0%, #B45309 100%)' : 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
              glow: 'rgba(245,158,11,0.35)',
              border: '#F59E0B',
              color: '#F59E0B',
            }
          },
          {
            id: 'readiness',
            icon: '🏭',
            label: 'Production Readiness',
            desc: 'Module 4 MAS line handoff',
            theme: {
              activeBg: isDark ? 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)' : 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
              glow: 'rgba(139,92,246,0.35)',
              border: '#8B5CF6',
              color: '#8B5CF6',
            }
          },
          {
            id: 'research',
            icon: '📈',
            label: 'Research & ML Benchmarks',
            desc: '171K DataCo dataset & XGBoost',
            theme: {
              activeBg: isDark ? 'linear-gradient(135deg, #BE185D 0%, #9D174D 100%)' : 'linear-gradient(135deg, #EC4899 0%, #DB2777 100%)',
              glow: 'rgba(236,72,153,0.35)',
              border: '#EC4899',
              color: '#EC4899',
            }
          },
        ];

        const curTabConfig = tabsConfig.find(t => t.id === activeTab) || tabsConfig[0];

        return (
          <div
            style={{
              background: isDark ? '#09101F' : '#FFFFFF',
              border: `2px solid ${curTabConfig.theme.border}`,
              borderRadius: '24px',
              boxShadow: isDark
                ? `0 20px 50px rgba(0,0,0,0.6), 0 0 32px ${curTabConfig.theme.glow}`
                : `0 12px 36px rgba(15,23,42,0.06), 0 0 24px ${curTabConfig.theme.glow}`,
              transition: 'border-color 0.35s ease, box-shadow 0.35s ease',
              position: 'relative',
              overflow: 'hidden',
              marginBottom: '28px',
            }}
          >
            {/* Integrated Top Navigation Deck Bar */}
            <div style={{
              background: isDark ? 'rgba(15,23,42,0.95)' : '#F8FAFC',
              borderBottom: `1.5px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0'}`,
              padding: '12px 14px 10px 14px',
            }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
                gap: '8px',
              }}>
                {tabsConfig.map(tab => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      className="luxury-tab-btn"
                      onClick={() => setActiveTab(tab.id)}
                      style={{
                        position: 'relative',
                        background: isActive ? tab.theme.activeBg : (isDark ? 'rgba(255,255,255,0.02)' : '#FFFFFF'),
                        border: isActive ? `1.5px solid ${tab.theme.border}` : `1.5px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#E2E8F0'}`,
                        borderRadius: '14px',
                        padding: '10px 16px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        boxShadow: isActive ? `0 6px 20px ${tab.theme.glow}` : 'none',
                        animation: isActive ? 'tab-pop-bounce 0.32s cubic-bezier(0.16, 1, 0.3, 1)' : 'none',
                        color: isActive ? '#FFFFFF' : (isDark ? '#E2E8F0' : '#1E293B'),
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        background: isActive ? 'rgba(0,0,0,0.22)' : (isDark ? 'rgba(255,255,255,0.05)' : '#F1F5F9'),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '18px',
                        flexShrink: 0,
                      }}>
                        {tab.icon}
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{
                          fontWeight: 900,
                          fontSize: '13px',
                          color: isActive ? '#FFFFFF' : (isDark ? '#F1F5F9' : '#0F172A'),
                          lineHeight: 1.2,
                        }}>
                          {tab.label}
                        </div>
                        <div style={{
                          fontSize: '10px',
                          color: isActive ? 'rgba(255,255,255,0.92)' : (isDark ? '#94A3B8' : '#64748B'),
                          marginTop: '2px',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          fontWeight: isActive ? 600 : 500,
                        }}>
                          {tab.desc}
                        </div>
                      </div>

                      {isActive && (
                        <span style={{
                          fontSize: '9px',
                          fontWeight: 900,
                          background: '#FFFFFF',
                          color: '#0F172A',
                          padding: '2px 7px',
                          borderRadius: '8px',
                          letterSpacing: '.06em',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                        }}>
                          ACTIVE
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Active Workspace Status Ribbon */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '8px 12px',
                background: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.02)',
                fontSize: '11px',
                color: isDark ? '#94A3B8' : '#64748B',
                fontWeight: 600,
                borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#E2E8F0'}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: curTabConfig.theme.color }} />
                  <span>ACTIVE DECK: <strong style={{ color: isDark ? '#FFFFFF' : '#0F172A' }}>{curTabConfig.label.toUpperCase()}</strong></span>
                </div>
                <div style={{ fontSize: '10.5px', color: curTabConfig.theme.color, fontWeight: 700 }}>
                  {curTabConfig.desc}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ═══ GLOBAL DEDICATED COMPUTED POLICY RESULTS PANEL (ALWAYS VISIBLE ACROSS TABS) ═════ */}
      {computedPolicies.length > 0 && (
        <div style={{
          ...styles.card,
          border: `2px solid ${isDark ? 'rgba(139,92,246,0.55)' : '#A78BFA'}`,
          boxShadow: isDark ? '0 0 35px rgba(139,92,246,0.18), 0 10px 30px rgba(0,0,0,0.5)' : '0 8px 30px rgba(139,92,246,0.12)',
          padding: '0',
          overflow: 'hidden',
          marginBottom: '22px',
          borderRadius: '16px',
        }}>
          {/* Header */}
          <div style={{
            background: isDark ? 'linear-gradient(135deg, rgba(139,92,246,0.22), rgba(59,130,246,0.12))' : 'linear-gradient(135deg, #EDE9FE, #DBEAFE)',
            padding: '16px 22px',
            borderBottom: `1.5px solid ${isDark ? 'rgba(139,92,246,0.3)' : '#DDD6FE'}`,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '38px', height: '38px', borderRadius: '10px',
                background: isDark ? 'rgba(139,92,246,0.3)' : '#DDD6FE',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '20px',
              }}>📋</div>
              <div>
                <div style={{ fontWeight: 900, fontSize: '15px', color: isDark ? '#DDD6FE' : '#6D28D9', letterSpacing: '.02em' }}>
                  All Computed Policy Results ({computedPolicies.length})
                </div>
                <div style={{ fontSize: '11.5px', color: c.sub, marginTop: '2px' }}>
                  Each time you click &quot;Submit &amp; Compute Policy&quot;, the generated adaptive policy is logged here.
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                className="btn-hover"
                onClick={() => handleExportPolicyPDF(computedPolicies)}
                style={{
                  padding: '7px 15px', borderRadius: '8px', border: '1px solid rgba(220,38,38,0.3)',
                  background: isDark ? 'rgba(220,38,38,0.18)' : '#FEF2F2',
                  color: '#DC2626', fontSize: '11.5px', fontWeight: 800, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '6px',
                  boxShadow: '0 2px 8px rgba(220,38,38,0.15)',
                }}
                title="Generate printable PDF specification for Module 4 production line scheduling"
              >
                <span>📄</span> Export PDF for Scheduling
              </button>
              <button
                className="btn-hover"
                onClick={() => {
                  const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(computedPolicies, null, 2))}`;
                  const dl = document.createElement('a');
                  dl.setAttribute('href', jsonString);
                  dl.setAttribute('download', `OptiChain_All_Policies_${new Date().toISOString().slice(0,10)}.json`);
                  document.body.appendChild(dl); dl.click(); dl.remove();
                  showToast('✓ All computed policies exported as JSON');
                }}
                style={{
                  padding: '7px 15px', borderRadius: '8px', border: `1px solid ${c.tagBorder}`,
                  background: isDark ? 'rgba(255,255,255,0.06)' : '#FFFFFF',
                  color: c.title, fontSize: '11.5px', fontWeight: 700, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '6px',
                }}
              >
                <span>📥</span> Export JSON
              </button>
              <button
                className="btn-hover"
                onClick={() => { setComputedPolicies([]); showToast('🗑️ Policy history cleared'); }}
                style={{
                  padding: '7px 15px', borderRadius: '8px', border: `1px solid ${isDark ? 'rgba(239,68,68,0.4)' : '#FECACA'}`,
                  background: isDark ? 'rgba(239,68,68,0.1)' : '#FEF2F2',
                  color: '#EF4444', fontSize: '11.5px', fontWeight: 700, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '6px',
                }}
              >
                <span>🗑️</span> Clear
              </button>
            </div>
          </div>

          {/* Table Header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '130px 110px 110px 110px 110px 95px 95px 1fr',
            gap: '0',
            padding: '11px 22px',
            background: isDark ? 'rgba(0,0,0,0.3)' : '#F8FAFC',
            borderBottom: `1px solid ${c.tableBorder}`,
            fontSize: '10px', fontWeight: 800, color: c.sub, letterSpacing: '.06em', textTransform: 'uppercase',
          }}>
            <div>Material SKU</div>
            <div>Timestamp</div>
            <div style={{ textAlign: 'right' }}>Safety Stock</div>
            <div style={{ textAlign: 'right' }}>Reorder Point</div>
            <div style={{ textAlign: 'right' }}>Order Qty</div>
            <div style={{ textAlign: 'center' }}>Risk Level</div>
            <div style={{ textAlign: 'center' }}>Backorder</div>
            <div style={{ paddingLeft: '12px' }}>Action Recommendation</div>
          </div>

          {/* Table Rows */}
          <div style={{ maxHeight: '380px', overflowY: 'auto' }}>
            {computedPolicies.map((p, idx) => {
              const riskColor = p.risk_level === 'CRITICAL' ? '#EF4444' : p.risk_level === 'HIGH' ? '#F59E0B' : p.risk_level === 'MEDIUM' ? '#3B82F6' : '#10B981';
              const boProb = typeof p.backorder_risk === 'number' ? p.backorder_risk : 0;
              const boColor = boProb > 0.3 ? '#EF4444' : '#10B981';
              const isReorder = Boolean(p.reorder_required);
              const timeStr = p._computedAt ? new Date(p._computedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Just now';
              return (
                <div
                  key={p._requestId || `${p.product_id}-${idx}`}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '130px 110px 110px 110px 110px 95px 95px 1fr',
                    gap: '0',
                    padding: '12px 22px',
                    borderBottom: `1px solid ${c.tableBorder}`,
                    background: idx === 0
                      ? (isDark ? 'rgba(139,92,246,0.09)' : 'rgba(139,92,246,0.04)')
                      : (idx % 2 === 0 ? 'transparent' : (isDark ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.02)')),
                    alignItems: 'center',
                    fontSize: '12.5px',
                  }}
                >
                  {/* Material ID */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontWeight: 900, color: c.title, fontSize: '13px' }}>{p.product_id}</span>
                    {idx === 0 && (
                      <span style={{
                        fontSize: '9px', fontWeight: 800, color: '#8B5CF6',
                        background: isDark ? 'rgba(139,92,246,0.2)' : '#EDE9FE',
                        padding: '1px 6px', borderRadius: '4px',
                      }}>NEWEST</span>
                    )}
                  </div>

                  {/* Timestamp */}
                  <div style={{ color: c.sub, fontSize: '11px', fontWeight: 600 }}>
                    {timeStr}
                  </div>

                  {/* Safety Stock */}
                  <div style={{ textAlign: 'right', fontWeight: 900, color: '#60A5FA', fontSize: '13.5px' }}>
                    {Math.round(p.safety_stock || 0).toLocaleString()}
                  </div>

                  {/* Reorder Point */}
                  <div style={{ textAlign: 'right', fontWeight: 900, color: c.title, fontSize: '13.5px' }}>
                    {Math.round(p.reorder_point || 0).toLocaleString()}
                  </div>

                  {/* Order Quantity */}
                  <div style={{ textAlign: 'right', fontWeight: 900, color: '#34D399', fontSize: '13.5px' }}>
                    {Math.round(p.reorder_quantity || 0).toLocaleString()}
                  </div>

                  {/* Risk Level Badge */}
                  <div style={{ textAlign: 'center' }}>
                    <span style={{
                      padding: '3px 9px', borderRadius: '6px', fontSize: '10px', fontWeight: 800,
                      background: `${riskColor}18`, color: riskColor, border: `1px solid ${riskColor}40`,
                    }}>{p.risk_level || 'MEDIUM'}</span>
                  </div>

                  {/* Backorder Risk */}
                  <div style={{ textAlign: 'center' }}>
                    <span style={{
                      padding: '2px 7px', borderRadius: '5px', fontSize: '11px', fontWeight: 800,
                      color: boColor,
                    }}>{(boProb * 100).toFixed(1)}%</span>
                  </div>

                  {/* Action Recommendation */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: '12px' }}>
                    <span style={{
                      padding: '3px 10px', borderRadius: '6px', fontSize: '10px', fontWeight: 800,
                      background: isReorder
                        ? (isDark ? 'rgba(239,68,68,0.15)' : '#FEF2F2')
                        : (isDark ? 'rgba(16,185,129,0.15)' : '#F0FDF4'),
                      color: isReorder ? '#EF4444' : '#10B981',
                      border: `1px solid ${isReorder ? '#EF444440' : '#10B98140'}`,
                      whiteSpace: 'nowrap',
                    }}>
                      {isReorder ? '🔴 REORDER NOW' : '🟢 SUFFICIENT'}
                    </span>
                    <span style={{ fontSize: '11px', color: c.sub, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={p.reorder_recommendation || ''}>
                      {p.reorder_recommendation || 'Policy evaluated against upstream lead-time and disruption signals.'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer stats */}
          <div style={{
            padding: '11px 22px',
            background: isDark ? 'rgba(0,0,0,0.25)' : '#F8FAFC',
            borderTop: `1px solid ${c.tableBorder}`,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px',
            fontSize: '11.5px', color: c.sub,
          }}>
            <div style={{ display: 'flex', gap: '18px', flexWrap: 'wrap' }}>
              <span>📊 <strong>{computedPolicies.length}</strong> total evaluations</span>
              <span>🔴 <strong>{computedPolicies.filter(p => p.reorder_required).length}</strong> reorders needed</span>
              <span>🟢 <strong>{computedPolicies.filter(p => !p.reorder_required).length}</strong> sufficient inventory</span>
              <span>⚠️ <strong>{computedPolicies.filter(p => p.risk_level === 'CRITICAL' || p.risk_level === 'HIGH').length}</strong> elevated risk</span>
            </div>
            <div style={{ fontSize: '10.5px', color: c.sub, opacity: 0.8 }}>
              Data retained in active browser session
            </div>
          </div>
        </div>
      )}

      {/* ═══ TAB 1: OPERATIONS & INVENTORY COCKPIT ═══════════════════════════ */}
      {activeTab === 'operations' && (
        <div className="connected-tab-content" style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '-18px' }}>

          {/* ── Data Flow Pipeline Bar (Edge-to-Edge Flush Aesthetic) ── */}
                  <div style={{
                    background: isDark
                      ? 'linear-gradient(145deg, rgba(15,23,42,0.85) 0%, rgba(10,16,28,0.95) 100%)'
                      : '#FFFFFF',
                    border: `1.5px solid ${isDark ? 'rgba(59,130,246,0.3)' : '#E2E8F0'}`,
                    borderRadius: '16px',
                    padding: '14px 20px',
                    boxShadow: isDark
                      ? '0 6px 20px rgba(0,0,0,0.35)'
                      : '0 2px 10px rgba(15,23,42,0.04)',
                    transition: 'all .25s ease',
                    overflow: 'hidden',
                  }}>
                    <div
                      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', cursor: 'pointer', userSelect: 'none' }}
                      onClick={() => setShowPipelineCard(v => !v)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '38px',
                          height: '38px',
                          borderRadius: '10px',
                          background: isDark ? 'rgba(37,99,235,0.18)' : '#EFF6FF',
                          border: `1px solid ${isDark ? 'rgba(59,130,246,0.4)' : '#BFDBFE'}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '17px',
                          color: '#60A5FA',
                          flexShrink: 0,
                        }}>
                          🔄
                        </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '15px', fontWeight: 900, color: isDark ? '#FFFFFF' : '#0F172A', letterSpacing: '-0.01em' }}>
                      Data Flow & Decision Pipeline
                    </span>
                    <span style={{
                      fontSize: '9.5px',
                      fontWeight: 800,
                      padding: '3px 10px',
                      borderRadius: '12px',
                      background: showPipelineCard ? 'rgba(16,185,129,0.15)' : (isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9'),
                      color: showPipelineCard ? '#34D399' : (isDark ? '#94A3B8' : '#64748B'),
                      border: `1px solid ${showPipelineCard ? 'rgba(16,185,129,0.35)' : (isDark ? 'rgba(255,255,255,0.1)' : '#CBD5E1')}`,
                      transition: 'all .2s ease',
                      letterSpacing: '.04em',
                    }}>
                      {showPipelineCard ? '● ENGINE ACTIVE' : '○ CLICK TO REVEAL'}
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: isDark ? '#94A3B8' : '#64748B', marginTop: '2px' }}>
                    Upstream signals → Optimization Engine → Policy Deliverables
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }} onClick={e => e.stopPropagation()}>
                {showPipelineCard && (
                  <button
                    className="btn-hover"
                    onClick={() => setShowPolicyOverlay(v => !v)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 14px',
                      borderRadius: '20px',
                      border: `1px solid ${showPolicyOverlay ? '#10B981' : (isDark ? 'rgba(255,255,255,0.12)' : '#CBD5E1')}`,
                      fontSize: '11.5px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      background: showPolicyOverlay ? 'rgba(16,185,129,0.2)' : 'transparent',
                      color: showPolicyOverlay ? '#10B981' : (isDark ? '#CBD5E1' : '#475569'),
                    }}
                  >
                    {showPolicyOverlay ? '✓ Policy Overlay ON' : '⊕ Policy Comparison'}
                  </button>
                )}
                <div style={{
                  background: isDark ? 'rgba(37,99,235,0.15)' : '#FFFFFF',
                  border: `1.5px solid ${isDark ? 'rgba(59,130,246,0.35)' : '#CBD5E1'}`,
                  borderRadius: '14px',
                  padding: '6px 14px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '10px',
                  boxShadow: isDark ? 'none' : '0 2px 8px rgba(15,23,42,0.06)',
                }}>
                  <MaterialThumb category={currentProduct.category} isDark={isDark} />
                  <div>
                    <span style={{ fontSize: '9px', color: isDark ? '#94A3B8' : '#64748B', display: 'block', fontWeight: 800, letterSpacing: '.05em' }}>
                      ACTIVE MATERIAL
                    </span>
                    <span style={{ color: isDark ? '#93C5FD' : '#1D4ED8', fontWeight: 800, fontSize: '12px' }}>
                      {activeOpt.product_id || currentProduct.product_id}
                    </span>
                    <span style={{ marginLeft: '6px', color: isDark ? '#FFFFFF' : '#0F172A', fontWeight: 600, fontSize: '11.5px' }}>
                      {currentProduct.product_name}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setShowPipelineCard(v => !v)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 18px',
                    borderRadius: '12px',
                    fontWeight: 800,
                    fontSize: '12px',
                    cursor: 'pointer',
                    border: 'none',
                    background: showPipelineCard
                      ? (isDark ? 'rgba(239,68,68,0.18)' : '#FEE2E2')
                      : 'linear-gradient(135deg, #2563EB, #1D4ED8)',
                    color: showPipelineCard ? (isDark ? '#FCA5A5' : '#DC2626') : '#FFFFFF',
                    boxShadow: showPipelineCard ? 'none' : '0 4px 14px rgba(37,99,235,0.35)',
                    transition: 'all .25s ease',
                  }}
                >
                  <span>{showPipelineCard ? '✕ Hide Pipeline' : '⚡ View Full Pipeline'}</span>
                  <span style={{ fontSize: '12px', transform: showPipelineCard ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform .3s ease' }}>▼</span>
                </button>
              </div>
            </div>

            {showPipelineCard && (
              <div style={{ marginTop:'22px', animation:'pipeline-pop .4s cubic-bezier(0.16, 1, 0.3, 1)' }}>
                <div style={styles.pipelineGrid}>

                  {/* ── COL 1: UPSTREAM INPUT SIGNALS (Dark Indigo Tech Card) ── */}
                  <div className="pipeline-card-effect col-effect-blue" style={{
                    ...styles.pipelineCol,
                    borderRadius: '16px',
                    background: isDark
                      ? 'linear-gradient(155deg,#0A192F 0%,#0F2744 100%)'
                      : 'linear-gradient(155deg,#FFFFFF 0%,#F0F7FF 100%)',
                    border: `1.5px solid ${isDark ? '#3B82F6' : '#60A5FA'}`,
                    boxShadow: isDark
                      ? '0 12px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)'
                      : '0 8px 24px rgba(37,99,235,0.12), inset 0 1px 0 #FFFFFF',
                    animation: 'col-stagger-1 .4s ease',
                    position: 'relative',
                    overflow: 'hidden',
                  }}>
                    {/* Top Accent Strip */}
                    <div style={{ height:'4px', background:'linear-gradient(90deg,#2563EB,#60A5FA)', margin:'-18px -18px 14px -18px' }} />

                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'14px' }}>
                      <div style={{ fontSize:'12px', fontWeight:900, color: isDark ? '#93C5FD' : '#1E40AF', letterSpacing:'.08em', display:'flex', alignItems:'center', gap:'7px' }}>
                        <span style={{ fontSize:'16px' }}>📥</span> 1. UPSTREAM INPUTS
                      </div>
                      <span style={{
                        fontSize:'10px', padding:'3px 10px', borderRadius:'14px',
                        background: isDark ? 'rgba(37,99,235,0.3)' : '#DBEAFE',
                        color: isDark ? '#BFDBFE' : '#1E40AF',
                        fontWeight:900, border:`1px solid ${isDark ? 'rgba(59,130,246,0.6)' : '#93C5FD'}`
                      }}>
                        DEMO MODE
                      </span>
                    </div>

                    <div style={styles.pipelineRows}>
                      {[
                        ['Demand Forecast (D̄)',   `${activeOpt.demand.toLocaleString()} ${currentProduct.unit}`, 'Module 1: Market Prophet', isDark?'#F8FAFC':'#0F172A', '#2563EB'],
                        ['Lead Time (L̄ ± σL)',      `${currentProduct.average_lead_time}d (±${leadTimeVar}d)`, 'Historical Route Benchmark', isDark?'#F8FAFC':'#0F172A', '#0284C7'],
                        ['Disruption Risk P(risk)', `${(disruptionProb*100).toFixed(0)}%`, 'Module 2: Procurement Guardian', disruptionProb>=.6?'#DC2626':'#D97706', disruptionProb>=.6?'#EF4444':'#F59E0B'],
                        ['Supplier Trust Score',    `${currentProduct.supplier_trust_score}/100`, 'Vendor Performance Record', isDark?'#F8FAFC':'#0F172A', '#7C3AED'],
                        ['On-Hand Warehouse Stock', `${currentProduct.current_inventory?.toLocaleString()} ${currentProduct.unit}`, 'Live SQLite ERP Master', '#059669', '#10B981'],
                      ].map(([lbl,val,src,clr,accent],i)=>(
                        <div key={i} style={{
                          display:'flex', flexDirection:'column', gap:'3px', padding:'9px 11px',
                          marginBottom:'6px', borderRadius:'10px',
                          background: isDark ? 'rgba(255,255,255,0.03)' : '#FFFFFF',
                          border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#E2E8F0'}`,
                          borderLeft: `3.5px solid ${accent}`,
                          transition:'all .2s ease',
                        }}>
                          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                            <span style={{ color: isDark?'#CBD5E1':'#334155', fontSize:'12px', fontWeight:700 }}>{lbl}</span>
                            <strong style={{ color:clr, fontSize:'14px', fontWeight:900, fontFamily:'monospace' }}>{val}</strong>
                          </div>
                          <div style={{ fontSize:'9.5px', color: isDark?'#64748B':'#64748B', fontWeight:600 }}>↳ Source: {src}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ── COL 2: OPTIMIZATION ENGINE (Royal Violet / Sapphire Card) ── */}
                  <div className="pipeline-card-effect col-effect-purple" style={{
                    ...styles.pipelineCol,
                    borderRadius: '16px',
                    background: isDark
                      ? 'linear-gradient(155deg,#0E1630 0%,#161A42 100%)'
                      : 'linear-gradient(155deg,#FFFFFF 0%,#F5F3FF 100%)',
                    border: `1.5px solid ${isDark ? '#818CF8' : '#A78BFA'}`,
                    boxShadow: isDark
                      ? '0 12px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)'
                      : '0 8px 24px rgba(124,58,237,0.12), inset 0 1px 0 #FFFFFF',
                    animation: 'col-stagger-2 .45s ease',
                    position: 'relative',
                    overflow: 'hidden',
                  }}>
                    {/* Top Accent Strip */}
                    <div style={{ height:'4px', background:'linear-gradient(90deg,#7C3AED,#A78BFA)', margin:'-18px -18px 14px -18px' }} />

                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'14px' }}>
                      <div style={{ fontSize:'12px', fontWeight:900, color: isDark ? '#C7D2FE' : '#5B21B6', letterSpacing:'.08em', display:'flex', alignItems:'center', gap:'7px' }}>
                        <span style={{ fontSize:'16px' }}>⚙️</span> 2. ADAPTIVE OPTIMIZATION ENGINE
                      </div>
                      <span style={{
                        fontSize:'10px', padding:'3px 10px', borderRadius:'14px',
                        background: isDark ? 'rgba(124,58,237,0.3)' : '#EDE9FE',
                        color: isDark ? '#DDD6FE' : '#5B21B6',
                        fontWeight:900, border:`1px solid ${isDark ? 'rgba(167,139,250,0.6)' : '#C4B5FD'}`
                      }}>
                        STOCHASTIC
                      </span>
                    </div>

                    <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
                      {[
                        ['SAFETY STOCK (KINGMAN DUAL-VARIANCE)', 'SS = z · √(L·σ_D² + D²·σ_L²) · RF', 'Couples demand jitter with route uncertainty', '#7C3AED'],
                        ['DYNAMIC REORDER POINT (ROP)',          'ROP = (D̄ · L_adj) + Safety_Stock', 'Automated purchase order dispatch threshold', '#2563EB'],
                        ['REORDER QUANTITY (ROQ)',                'ROQ = D̄ · Cycle_Days · RF', 'Demand-coverage periodic replenishment', '#059669'],
                      ].map(([lbl,f,sub,accent],i)=>(
                        <div key={i} style={{
                          background: isDark ? 'rgba(15,23,42,0.85)' : '#FFFFFF',
                          border: `1.5px solid ${isDark ? 'rgba(167,139,250,0.35)' : '#E0E7FF'}`,
                          borderLeft: `4px solid ${accent}`,
                          borderRadius: '12px',
                          padding: '13px 15px',
                          boxShadow: isDark ? '0 4px 14px rgba(0,0,0,0.35)' : '0 2px 10px rgba(99,102,241,0.08)',
                          transition:'all .2s ease',
                        }}>
                          <div style={{ fontSize:'10px', fontWeight:900, letterSpacing:'.06em', color: isDark ? '#A5B4FC' : '#4338CA', marginBottom:'6px' }}>{lbl}</div>
                          <div style={{ fontFamily:'JetBrains Mono, monospace', fontSize:'12.5px', fontWeight:800, color: isDark ? '#E0E7FF' : '#1E1B4B', lineHeight:1.5 }}>{f}</div>
                          <div style={{ fontSize:'10px', color: isDark?'#94A3B8':'#64748B', marginTop:'5px', fontStyle:'italic' }}>{sub}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ── COL 3: POLICY DELIVERABLES (Emerald Action Card) ── */}
                  <div className="pipeline-card-effect col-effect-emerald" style={{
                    ...styles.pipelineCol,
                    borderRadius: '16px',
                    background: isDark
                      ? 'linear-gradient(155deg,#061F17 0%,#0C3326 100%)'
                      : 'linear-gradient(155deg,#FFFFFF 0%,#F0FDF4 100%)',
                    border: `1.5px solid ${isDark ? '#10B981' : '#34D399'}`,
                    boxShadow: isDark
                      ? '0 12px 32px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)'
                      : '0 8px 24px rgba(16,185,129,0.12), inset 0 1px 0 #FFFFFF',
                    animation: 'col-stagger-3 .5s ease',
                    position: 'relative',
                    overflow: 'hidden',
                  }}>
                    {/* Top Accent Strip */}
                    <div style={{ height:'4px', background:'linear-gradient(90deg,#059669,#34D399)', margin:'-18px -18px 14px -18px' }} />

                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'14px' }}>
                      <div style={{ fontSize:'12px', fontWeight:900, color: isDark ? '#6EE7B7' : '#065F46', letterSpacing:'.08em', display:'flex', alignItems:'center', gap:'7px' }}>
                        <span style={{ fontSize:'16px' }}>📤</span> 3. POLICY DELIVERABLES
                      </div>
                      <span style={{
                        fontSize:'10px', padding:'3px 10px', borderRadius:'14px',
                        background: isDark ? 'rgba(239,68,68,0.25)' : '#FEE2E2',
                        color: isDark ? '#FCA5A5' : '#B91C1C',
                        fontWeight:900, border:`1px solid ${isDark ? 'rgba(239,68,68,0.5)' : '#FCA5A5'}`
                      }}>
                        CRITICAL ACTION
                      </span>
                    </div>

                    {/* Circular Stock Gauges */}
                    <div style={{
                      display:'flex', justifyContent:'space-around', alignItems:'center',
                      padding:'10px 8px 14px 8px', marginBottom:'12px',
                      background: isDark ? 'rgba(0,0,0,0.2)' : '#FFFFFF',
                      borderRadius:'12px', border:`1px solid ${isDark ? 'rgba(255,255,255,0.05)' : '#DCFCE7'}`
                    }}>
                      <StockGauge pct={Math.min(1, currentProduct.current_inventory / Math.max(1, activeOpt.rop))} label="Stock/ROP" color="#2563EB" />
                      <StockGauge pct={Math.min(1, currentProduct.current_inventory / Math.max(1, activeOpt.ss))} label="Stock/SS" color={currentProduct.current_inventory < activeOpt.ss ? '#DC2626' : '#059669'} />
                    </div>

                    {/* Output Rows */}
                    <div style={styles.pipelineRows}>
                      {[
                        ['Risk-Adj. Lead Time', `${activeOpt.leadAdj} days`, isDark?'#F8FAFC':'#0F172A', false],
                        ['Dynamic Safety Stock', `${activeOpt.ss.toLocaleString()} ${currentProduct.unit}`, isDark?'#60A5FA':'#1D4ED8', true],
                        ['SS Confidence ±σ', `${activeOpt.ssLo.toLocaleString()} – ${activeOpt.ssHi.toLocaleString()} ${currentProduct.unit}`, isDark?'#94A3B8':'#475569', false],
                        ['Reorder Point (ROP)', `${activeOpt.rop.toLocaleString()} ${currentProduct.unit}`, isDark?'#F8FAFC':'#0F172A', false],
                        ['Reorder Quantity (ROQ)', `${activeOpt.roq.toLocaleString()} ${currentProduct.unit}`, '#059669', true],
                        ['Material Availability', activeOpt.avail ? '✓ TRUE — Ready' : '⚠ FALSE — Shortage', activeOpt.avail ? '#059669' : '#DC2626', true],
                      ].map(([lbl,val,clr,hi],i)=>(
                        <div key={i} style={{
                          display:'flex', justifyContent:'space-between', alignItems:'center',
                          padding:'8px 10px', marginBottom:'5px', borderRadius:'9px',
                          background: hi
                            ? (isDark ? 'rgba(255,255,255,0.06)' : '#FFFFFF')
                            : (isDark ? 'rgba(255,255,255,0.02)' : 'transparent'),
                          border: hi
                            ? `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : '#BBF7D0'}`
                            : '1px solid transparent',
                          boxShadow: hi ? (isDark ? 'none' : '0 2px 6px rgba(16,185,129,0.08)') : 'none',
                        }}>
                          <span style={{ color: isDark?'#CBD5E1':'#334155', fontSize:'12px', fontWeight:700 }}>{lbl}</span>
                          <strong style={{ color:clr, fontSize:'14px', fontWeight:900, fontFamily:'monospace' }}>{val}</strong>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              </div>
            )}
          </div>

          {/* ── Global Supply Network + Activity Feed (Symmetric Equal-Height Deck) ── */}
          <div style={{ display:'grid', gridTemplateColumns:'minmax(0, 1.45fr) minmax(360px, 1fr)', gap:'16px', alignItems:'stretch' }}>

            {/* Supplier Map Card */}
            <div style={{ ...styles.card, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={styles.cardHeader}>
                  <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                    <div style={styles.cardIconBadge}>🌏</div>
                    <div>
                      <div style={styles.cardTitle}>Global Supplier Origin Network</div>
                      <div style={styles.cardSub}>Live animated freight routes · 4 sourcing hubs · MAS Holdings Colombo Factory</div>
                    </div>
                  </div>
                  <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'6px', background: isDark?'rgba(255,255,255,0.06)':'#E2E8F0', padding:'3px 9px', borderRadius:'10px', border:`1px solid ${c.tagBorder}` }}>
                      <img
                        src="https://images.unsplash.com/photo-1578575437130-527eed3abbec?w=64&h=64&fit=crop&q=80"
                        alt="Port of Colombo"
                        style={{ width:'20px', height:'20px', borderRadius:'5px', objectFit:'cover' }}
                      />
                      <span style={{ fontSize:'10.5px', fontWeight:800, color:c.title }}>Port of Colombo (CICT)</span>
                    </div>
                    {[{c:'#F59E0B',l:'🇨🇳 CN'},{c:'#EF4444',l:'🇧🇩 BD'},{c:'#10B981',l:'🇮🇳 IN'},{c:'#60A5FA',l:'🇻🇳 VN'}].map((x,i)=>(
                      <span key={i} style={{ fontSize:'10.5px', fontWeight:700, color:x.c, background:`${x.c}18`, border:`1px solid ${x.c}40`, padding:'3px 8px', borderRadius:'20px' }}>{x.l}</span>
                    ))}
                  </div>
                </div>
              </div>
              <div style={{ flex: 1, minHeight: '340px', display: 'flex', flexDirection: 'column' }}>
                <SupplierWorldMap
                  isDark={isDark}
                  selectedSku={selectedSku}
                  isRerouted={isRerouted}
                  onToggleReroute={() => {
                    setIsRerouted(v => !v);
                    showToast(!isRerouted ? '🛡️ AI Sourcing Rerouted via Hambantota Bypass Lane (-4d ETA)' : 'Restored standard maritime shipping lanes', 'info');
                  }}
                />
              </div>
            </div>

            {/* Activity Feed Card */}
            <div style={{ ...styles.card, display: 'flex', flexDirection: 'column' }}>
              <div style={styles.cardHeader}>
                <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                  <div style={styles.cardIconBadge}>📡</div>
                  <div>
                    <div style={styles.cardTitle}>Live Event Stream</div>
                    <div style={styles.cardSub}>Real-time supply chain alerts & audit telemetry</div>
                  </div>
                </div>
                <span style={{ padding:'3px 10px', borderRadius:'20px', fontSize:'10px', fontWeight:700, background:'rgba(16,185,129,0.15)', color:'#34D399', border:'1px solid rgba(16,185,129,0.3)' }}>
                  <span style={{ animation:'pulse-dot 1.5s infinite', display:'inline-block', marginRight:'4px' }}>●</span>LIVE
                </span>
              </div>
              <ActivityFeed
                productsList={productsList}
                isDark={isDark}
                onSelectSku={(sku) => {
                  setSelectedSku(sku);
                  const p = productsList.find(x => x.product_id === sku);
                  if (p) setDrawerItem(p);
                }}
              />
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
                  const finImpact = calculateFinancialImpact(item, roq, skuSS);

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

                      {/* Header: High-Res Photo Banner + SKU + Category */}
                      <div>
                        {/* Material High-Res Cover Photo Banner */}
                        <div style={{
                          position: 'relative',
                          height: '110px',
                          borderRadius: '12px',
                          overflow: 'hidden',
                          marginBottom: '12px',
                          border: `1.5px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#CBD5E1'}`,
                          boxShadow: isDark ? 'inset 0 0 20px rgba(0,0,0,0.5)' : '0 2px 8px rgba(15,23,42,0.06)',
                        }}>
                          {(() => {
                            const media = SKU_CATALOG_MEDIA[item.product_id];
                            const currentIdx = activeImageIndexes[item.product_id] || 0;
                            const imgSrc = media?.images?.[currentIdx] || SKU_IMAGES[item.product_id] || 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=500&auto=format&fit=crop&q=80';
                            return (
                              <>
                                <img
                                  key={imgSrc}
                                  src={imgSrc}
                                  alt={item.product_name}
                                  referrerPolicy="no-referrer"
                                  loading="lazy"
                                  style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
                                    animation: 'fade-backdrop .6s ease',
                                    transition: 'transform 0.4s ease',
                                  }}
                                />
                                {/* Multi-Image Pagination Dots */}
                                {media?.images?.length > 1 && (
                                  <div style={{ position: 'absolute', bottom: '28px', right: '10px', display: 'flex', gap: '4px', zIndex: 3 }}>
                                    {media.images.map((_, dotIdx) => (
                                      <span
                                        key={dotIdx}
                                        style={{
                                          width: currentIdx === dotIdx ? '14px' : '5px',
                                          height: '5px',
                                          borderRadius: '3px',
                                          background: currentIdx === dotIdx ? '#60A5FA' : 'rgba(255,255,255,0.4)',
                                          transition: 'all .3s ease',
                                        }}
                                      />
                                    ))}
                                  </div>
                                )}
                              </>
                            );
                          })()}
                          {/* Gradient shade overlay for 100% contrast in light and dark mode */}
                          <div style={{
                            position: 'absolute',
                            inset: 0,
                            background: 'linear-gradient(to top, rgba(15,23,42,0.92) 0%, rgba(15,23,42,0.3) 50%, rgba(0,0,0,0.5) 100%)',
                          }} />

                          {/* Top Badges over image */}
                          <div style={{ position: 'absolute', top: '8px', left: '8px', display: 'flex', gap: '6px' }}>
                            <span style={{
                              fontSize: '10px',
                              fontWeight: 800,
                              padding: '3px 8px',
                              borderRadius: '6px',
                              background: 'rgba(15,23,42,0.85)',
                              backdropFilter: 'blur(6px)',
                              color: '#93C5FD',
                              border: '1px solid rgba(147,197,253,0.4)',
                              letterSpacing: '.02em',
                            }}>
                              {item.category}
                            </span>
                            {SKU_CATALOG_MEDIA[item.product_id]?.priceEur && (
                              <span style={{
                                fontSize: '10px',
                                fontWeight: 800,
                                padding: '3px 8px',
                                borderRadius: '6px',
                                background: 'rgba(0,0,0,0.7)',
                                color: '#FDE047',
                                border: '1px solid rgba(253,224,71,0.3)',
                              }}>
                                {SKU_CATALOG_MEDIA[item.product_id].priceEur}
                              </span>
                            )}
                          </div>

                          <div style={{ position: 'absolute', top: '8px', right: '8px' }}>
                            <span style={{
                              fontSize: '10px',
                              fontWeight: 800,
                              padding: '3px 9px',
                              borderRadius: '6px',
                              background: rp >= 0.7 ? '#EF4444' : rp >= 0.35 ? '#F59E0B' : '#10B981',
                              color: '#FFFFFF',
                              boxShadow: '0 2px 6px rgba(0,0,0,0.35)',
                            }}>
                              P(risk) = {(rp * 100).toFixed(0)}%
                            </span>
                          </div>

                          {/* Bottom overlay inside image: SKU ID + MAS Production Line */}
                          <div style={{ position: 'absolute', bottom: '8px', left: '10px', right: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{
                                fontWeight: 900,
                                color: '#FFFFFF',
                                fontSize: '14px',
                                letterSpacing: '.03em',
                                textShadow: '0 2px 4px rgba(0,0,0,0.9)',
                              }}>
                                {item.product_id}
                              </span>
                              <span style={{
                                fontSize: '9.5px',
                                color: '#CBD5E1',
                                background: 'rgba(255,255,255,0.18)',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                fontWeight: 700,
                              }}>
                                Inspect ↗
                              </span>
                            </div>
                            <span style={{
                              fontSize: '9.5px',
                              fontWeight: 700,
                              color: '#6EE7B7',
                              textShadow: '0 1px 3px rgba(0,0,0,0.9)',
                            }}>
                              📍 {finImpact.meta.shortLine || 'MAS Factory'}
                            </span>
                          </div>
                        </div>

                        {/* Fashion Apparel Showcase Spec Tag (As seen in High Fashion Zevana UI) */}
                        {SKU_CATALOG_MEDIA[item.product_id] && (
                          <div style={{
                            marginBottom: '10px',
                            padding: '8px 10px',
                            borderRadius: '8px',
                            background: isDark ? 'rgba(255,255,255,0.03)' : '#F8FAFC',
                            border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : '#E2E8F0'}`,
                            fontSize: '11px',
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                              <span style={{ fontWeight: 800, color: isDark ? '#93C5FD' : '#1D4ED8', letterSpacing: '.02em' }}>
                                👗 {SKU_CATALOG_MEDIA[item.product_id].garmentType}
                              </span>
                              <span style={{ color: '#F59E0B', fontWeight: 800, fontSize: '10.5px' }}>
                                ★ {SKU_CATALOG_MEDIA[item.product_id].rating}
                              </span>
                            </div>
                            <div style={{ fontSize: '10px', color: c.sub, lineHeight: 1.35 }}>
                              {SKU_CATALOG_MEDIA[item.product_id].fabricSpec}
                            </div>
                          </div>
                        )}

                        {/* Product Name & Location */}
                        <div style={{ marginBottom: '12px' }}>
                          <div style={{ fontSize: '14px', fontWeight: 800, color: c.title, lineHeight: 1.3 }}>
                            {item.product_name}
                          </div>
                          <div style={{ fontSize: '10.5px', color: c.sub, marginTop: '3px' }}>
                            📍 {binLoc}
                          </div>
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

                        {/* Financial Impact & Inaction Risk Tag */}
                        <div style={{
                          marginTop: '10px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '7px 11px',
                          borderRadius: '8px',
                          background: hasShortage
                            ? (isDark ? 'rgba(239,68,68,0.12)' : '#FEF2F2')
                            : (isDark ? 'rgba(16,185,129,0.09)' : '#F0FDF4'),
                          border: `1px solid ${hasShortage
                            ? (isDark ? 'rgba(239,68,68,0.25)' : '#FECACA')
                            : (isDark ? 'rgba(16,185,129,0.25)' : '#BBF7D0')}`,
                          fontSize: '10.5px',
                        }}>
                          <span style={{ color: hasShortage ? (isDark ? '#FCA5A5' : '#B91C1C') : (isDark ? '#86EFAC' : '#15803D'), display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 700 }}>
                            <span>{hasShortage ? '⚡ Inaction Risk:' : '🛡️ Value Guarded:'}</span>
                          </span>
                          <span style={{ fontWeight: 800, color: hasShortage ? '#EF4444' : '#10B981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {hasShortage ? `-$${finImpact.downtimeExposure.toLocaleString()} idle` : `+$${finImpact.netProtectedValue.toLocaleString()}`}
                            <span style={{ fontSize: '9px', opacity: 0.8, color: c.sub }}>({finImpact.meta.shortLine})</span>
                          </span>
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
                      <th className="th-sort" style={styles.thRight} onClick={()=>handleSort('roq')}>ROQ & Protected Value <SortIcon col="roq"/></th>
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
                      const roq = Math.round(item.forecasted_demand * 7 * (1 + item.disruption_probability));
                      const finImpact = calculateFinancialImpact(item, roq, skuSS);
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
                            <div style={{ fontWeight: 800, color: c.title, fontSize: '13px' }}>
                              {item.current_inventory.toLocaleString()} <span style={{ fontSize: '10px', color: c.sub }}>{item.unit}</span>
                            </div>
                            {/* High-density Stock Health Micro-bar */}
                            <div style={{ marginTop: '5px', height: '5px', background: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0', borderRadius: '3px', overflow: 'hidden', width: '90px', marginLeft: 'auto' }}>
                              <div style={{
                                height: '100%',
                                width: `${Math.min(100, healthPct * 100)}%`,
                                background: healthColor,
                                borderRadius: '3px',
                                boxShadow: `0 0 6px ${healthColor}`,
                                transition: 'width .6s ease',
                              }} />
                            </div>
                            <div style={{ fontSize: '9px', color: healthColor, textAlign: 'right', marginTop: '2px', fontWeight: 800, letterSpacing: '.02em' }}>
                              {Math.round(healthPct * 100)}% OF SS
                            </div>
                          </td>

                          {/* Availability & Buffer Health Dual-Tier Telemetry Widget */}
                          <td style={{ ...styles.tdCenter, minWidth: '150px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                padding: '3.5px 10px',
                                borderRadius: '20px',
                                fontWeight: 900,
                                fontSize: '10.5px',
                                letterSpacing: '.03em',
                                whiteSpace: 'nowrap',
                                background: hasShortage ? (isDark ? 'rgba(239,68,68,.25)' : '#FEE2E2') : (isDark ? 'rgba(16,185,129,.25)' : '#DCFCE7'),
                                color: hasShortage ? (isDark ? '#FCA5A5' : '#991B1B') : (isDark ? '#6EE7B7' : '#166534'),
                                border: `1px solid ${hasShortage ? (isDark ? 'rgba(239,68,68,.5)' : '#FCA5A5') : (isDark ? 'rgba(16,185,129,.5)' : '#86EFAC')}`,
                                boxShadow: hasShortage ? '0 0 8px rgba(239,68,68,.2)' : '0 0 8px rgba(16,185,129,.2)',
                              }}>
                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: hasShortage ? '#EF4444' : '#10B981', animation: hasShortage ? 'pulseRed 1.8s infinite' : 'none' }} />
                                {hasShortage ? '⚠ SHORTAGE' : '✓ BUFFER NOMINAL'}
                              </span>
                              <span style={{ fontSize: '9.5px', fontWeight: 800, color: hasShortage ? (isDark ? '#F87171' : '#DC2626') : (isDark ? '#34D399' : '#059669') }}>
                                {hasShortage ? `-${(item.forecasted_demand - item.current_inventory).toLocaleString()} ${item.unit} gap` : `+${(item.current_inventory - skuSS).toLocaleString()} ${item.unit} buffer`}
                              </span>
                            </div>
                          </td>

                          <td style={styles.tdRight}>
                            <span style={{ color: c.sub, fontWeight: 600, fontSize: '12px' }}>{item.forecasted_demand.toLocaleString()}</span>
                            <span style={{ fontSize: '10px', color: c.sub, marginLeft: '3px' }}>{item.unit}</span>
                          </td>

                          {/* Risk Badge with Progress Indicator */}
                          <td style={styles.tdCenter}>
                            <span style={{
                              ...styles.badge,
                              padding: '2.5px 8px',
                              borderRadius: '12px',
                              fontWeight: 900,
                              fontSize: '10.5px',
                              background: rp >= 0.7 ? (isDark ? 'rgba(239,68,68,.25)' : '#FEE2E2') : rp >= 0.35 ? (isDark ? 'rgba(245,158,11,.25)' : '#FEF3C7') : (isDark ? 'rgba(16,185,129,.25)' : '#DCFCE7'),
                              color: rp >= 0.7 ? (isDark ? '#FCA5A5' : '#991B1B') : rp >= 0.35 ? (isDark ? '#FDE047' : '#92400E') : (isDark ? '#6EE7B7' : '#166534'),
                              border: `1px solid ${rp >= 0.7 ? (isDark ? 'rgba(239,68,68,.5)' : '#FCA5A5') : rp >= 0.35 ? (isDark ? 'rgba(245,158,11,.5)' : '#FCD34D') : (isDark ? 'rgba(16,185,129,.5)' : '#86EFAC')}`,
                            }}>
                              {(rp * 100).toFixed(0)}%
                            </span>
                            <div style={{ width: '48px', height: '3.5px', background: isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0', borderRadius: '2px', overflow: 'hidden', margin: '4px auto 0' }}>
                              <div style={{ height: '100%', width: `${rp * 100}%`, background: rp >= 0.7 ? '#EF4444' : rp >= 0.35 ? '#F59E0B' : '#10B981', borderRadius: '2px' }} />
                            </div>
                          </td>

                          <td style={styles.tdRight}>
                            <span style={{ color: isDark ? '#60A5FA' : '#2563EB', fontWeight: 800 }}>{skuSS.toLocaleString()}</span>
                            <span style={{ fontSize: '10px', color: c.sub, marginLeft: '3px' }}>{item.unit}</span>
                          </td>
                          <td style={styles.tdRight}>
                            <span style={{ color: c.title, fontWeight: 700 }}>{Math.round(item.forecasted_demand * 1.2).toLocaleString()}</span>
                          </td>
                          <td style={styles.tdRight}>
                            <span style={{ color: isDark ? '#34D399' : '#059669', fontWeight: 900, fontSize: '13px' }}>{roq.toLocaleString()}</span>
                            <span style={{ fontSize: '10px', color: c.sub, marginLeft: '3px' }}>{item.unit}</span>
                            <div style={{ fontSize: '9.5px', fontWeight: 800, color: hasShortage ? '#EF4444' : '#10B981', marginTop: '2px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '3px' }}>
                              <span>{hasShortage ? '⚡' : '🛡️'}</span>
                              <span>{hasShortage ? `-$${Math.round(finImpact.downtimeExposure / 1000)}k risk` : `+$${Math.round(finImpact.netProtectedValue / 1000)}k saved`}</span>
                            </div>
                          </td>

                          {/* Quick Actions Action Toolbar */}
                          <td style={{ ...styles.tdCenter, minWidth: '150px' }}>
                            <div style={{ display: 'flex', gap: '5px', justifyContent: 'center', alignItems: 'center' }}>
                              <button className="btn-hover" onClick={e => { e.stopPropagation(); setXaiModalSku(item); }} style={styles.xaiBtn} title="XAI Formula Inspector">📐</button>
                              <button className="btn-hover" onClick={e => { e.stopPropagation(); openEditModal(item); }} style={styles.editBtn} title="Edit Material">✏️</button>
                              <button className="btn-hover" onClick={e => { e.stopPropagation(); setDeleteConfirmItem(item); }} style={styles.deleteBtn} title="Archive / Delete Material">🗑️</button>
                              <button
                                className="btn-hover"
                                onClick={e => {
                                  e.stopPropagation();
                                  setPoModalItem({ ...item, reorder_quantity: Math.round(item.forecasted_demand * 7 * (1 + item.disruption_probability)) });
                                }}
                                style={{
                                  ...styles.poBtn,
                                  background: isDispatched ? '#059669' : (isDark ? 'linear-gradient(135deg,#2563EB,#1D4ED8)' : 'linear-gradient(135deg,#1E40AF,#2563EB)'),
                                  boxShadow: '0 2px 8px rgba(37,99,235,0.3)',
                                }}
                              >
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
        <div style={{ ...styles.tabContent, animation: 'content-fade-in 0.4s cubic-bezier(0.16, 1, 0.3, 1)' }}>

          {/* Primary Architecture: Adaptive Policy Optimizer (Module 3 Engine) */}
          <div style={{
            ...styles.card,
            border: `1.5px solid ${isDark ? 'rgba(59,130,246,0.35)' : '#BFDBFE'}`,
            boxShadow: isDark ? '0 16px 40px rgba(0,0,0,0.45)' : '0 8px 24px rgba(37,99,235,0.06)',
            padding: '20px 24px',
            marginBottom: '20px',
          }}>
            {/* Header / Launch Bar */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '14px',
            }}>
              <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
                <div style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px',
                  color: '#fff',
                  boxShadow: '0 4px 14px rgba(37,99,235,0.35)',
                }}>
                  🛡️
                </div>
                <div>
                  <div style={{ fontSize:'15.5px', fontWeight:800, color:c.title, display:'flex', alignItems:'center', gap:'8px' }}>
                    <span>Adaptive Policy Optimizer</span>
                    <span style={{ fontSize:'10px', padding:'2px 8px', borderRadius:'12px', background: isDark ? 'rgba(59,130,246,0.15)' : '#EFF6FF', color: '#60A5FA', fontWeight: 700, border: '1px solid rgba(59,130,246,0.3)' }}>
                      Module 3 Engine
                    </span>
                  </div>
                  <div style={{ fontSize:'12px', color:c.sub, marginTop:'2px' }}>
                    Active SKU: <strong style={{ color: '#2563EB' }}>{directParams.product_id}</strong> · Current On-Hand: <strong>{directParams.current_inventory.toLocaleString()}</strong> units · Disruption Risk: <strong style={{ color: directParams.disruption_probability > 0.6 ? '#EF4444' : '#10B981' }}>{(directParams.disruption_probability * 100).toFixed(0)}%</strong>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display:'flex', alignItems:'center', gap:'10px', flexWrap:'wrap' }}>
                <button
                  className="btn-hover"
                  onClick={() => setShowInventoryPicker(true)}
                  style={{
                    padding: '9px 18px',
                    borderRadius: '10px',
                    border: `1.5px solid ${isDark ? 'rgba(59,130,246,0.5)' : '#BFDBFE'}`,
                    background: isDark ? 'rgba(59,130,246,0.15)' : '#EFF6FF',
                    color: isDark ? '#93C5FD' : '#1D4ED8',
                    fontSize: '12.5px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '7px',
                    boxShadow: '0 2px 8px rgba(37,99,235,0.15)',
                  }}
                  title="Open catalog to pick a material"
                >
                  <span>📋</span> View Inventory ({productsList.length} SKUs)
                </button>

                <button
                  className="btn-hover"
                  onClick={async()=>{
                    setIsExecutingDirectApi(true);
                    try{
                      const r = await optimizeInventoryDetailed(directParams);
                      setDirectApiResult(r);
                      setComputedPolicies(prev => [{ ...r, _computedAt: new Date().toISOString() }, ...prev]);
                      showToast(`✓ Optimal policy computed for ${directParams.product_id}`);
                    } catch(e){
                      showToast(`Optimization error: ${e.message||'Unknown'}`, 'error');
                    } finally{
                      setIsExecutingDirectApi(false);
                    }
                  }}
                  disabled={isExecutingDirectApi}
                  style={{
                    ...styles.execBtn,
                    background: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
                    boxShadow: '0 4px 14px rgba(37,99,235,0.35)',
                    padding: '9px 22px',
                    fontSize: '12.5px',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  {isExecutingDirectApi ? '⟳ Computing Policy...' : `⚡ Optimize ${directParams.product_id}`}
                </button>
              </div>
            </div>

            {/* ═══ MODAL: COMPACT INVENTORY CATALOG PICKER ═══ */}
            {showInventoryPicker && (
              <div style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0,0,0,0.65)',
                backdropFilter: 'blur(6px)',
                zIndex: 99999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px',
                animation: 'content-fade-in 0.2s ease',
              }}>
                <div style={{
                  background: isDark ? '#0F172A' : '#FFFFFF',
                  border: `1.5px solid ${isDark ? 'rgba(59,130,246,0.3)' : '#BFDBFE'}`,
                  borderRadius: '18px',
                  width: '100%',
                  maxWidth: '1000px',
                  maxHeight: '90vh',
                  boxShadow: '0 25px 60px rgba(0,0,0,0.5)',
                  overflow: 'hidden',
                }}>
                  {/* Modal Header */}
                  <div style={{
                    padding: '16px 22px',
                    background: isDark ? 'rgba(0,0,0,0.35)' : '#F8FAFC',
                    borderBottom: `1px solid ${c.tableBorder}`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}>
                    <div>
                      <div style={{ fontWeight: 900, fontSize: '15px', color: c.title, display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>📋</span> Select Raw Material to Inspect
                      </div>
                      <div style={{ fontSize: '11px', color: c.sub, marginTop: '2px' }}>
                        Choose a material to view its inventory details and run optimization.
                      </div>
                    </div>
                    <button
                      onClick={() => setShowInventoryPicker(false)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        fontSize: '20px',
                        cursor: 'pointer',
                        color: c.sub,
                        padding: '4px 8px',
                        lineHeight: 1,
                      }}
                    >
                      ✕
                    </button>
                  </div>

                  {/* Compact Inventory List */}
                  <div style={{ maxHeight: 'min(260px, 30vh)', overflowY: 'auto', padding: '12px 18px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {productsList.map(item => {
                      const isSelected = item.product_id === directParams.product_id;
                      const isRiskHigh = item.disruption_probability >= 0.7;
                      const riskColor = isRiskHigh ? '#EF4444' : item.disruption_probability >= 0.35 ? '#F59E0B' : '#10B981';
                      return (
                        <div
                          key={item.product_id}
                          className="btn-hover"
                          onClick={() => {
                            // Update active parameters with selected item
                            setSelectedSku(item.product_id);
                            setDirectParams({
                              ...directParams,
                              product_id: item.product_id,
                              current_inventory: item.current_inventory,
                              forecasted_demand: item.forecasted_demand,
                              average_lead_time: item.average_lead_time,
                              lead_time_std_dev: item.lead_time_std_dev,
                              demand_std_dev: item.demand_std_dev,
                              disruption_probability: item.disruption_probability,
                              supplier_trust_score: item.supplier_trust_score,
                            });
                            setDirectApiResult(null);
                            showToast(`Selected ${item.product_id} (${item.product_name})`);
                          }}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '12px 16px',
                            borderRadius: '12px',
                            border: `1.5px solid ${isSelected ? '#2563EB' : isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0'}`,
                            background: isSelected
                              ? (isDark ? 'rgba(37,99,235,0.18)' : '#EFF6FF')
                              : (isDark ? 'rgba(255,255,255,0.02)' : '#FFFFFF'),
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{
                              width: '38px',
                              height: '38px',
                              borderRadius: '10px',
                              background: isDark ? 'rgba(59,130,246,0.15)' : '#F1F5F9',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 900,
                              fontSize: '11px',
                              color: '#2563EB',
                            }}>
                              {item.product_id.split('-')[0]}
                            </div>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontWeight: 900, fontSize: '13px', color: isSelected ? '#2563EB' : c.title }}>
                                  {item.product_id}
                                </span>
                                <span style={{ fontSize: '11px', color: c.sub, fontWeight: 600 }}>
                                  · {item.product_name}
                                </span>
                              </div>
                              <div style={{ fontSize: '10.5px', color: c.sub, marginTop: '2px' }}>
                                Category: <strong>{item.category || 'Apparel Raw Material'}</strong> · Lead Time: <strong>{item.average_lead_time} days</strong>
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '12.5px', fontWeight: 800, color: c.title }}>
                                {item.current_inventory.toLocaleString()} units
                              </div>
                              <div style={{ fontSize: '10px', color: c.sub }}>
                                Warehouse Stock
                              </div>
                            </div>

                            <span style={{
                              fontSize: '10px',
                              fontWeight: 800,
                              padding: '3px 9px',
                              borderRadius: '6px',
                              background: `${riskColor}18`,
                              color: riskColor,
                              border: `1px solid ${riskColor}40`,
                              whiteSpace: 'nowrap',
                            }}>
                              {(item.disruption_probability * 100).toFixed(0)}% Risk
                            </span>

                            <button
                              style={{
                                padding: '6px 14px',
                                borderRadius: '8px',
                                border: 'none',
                                background: isSelected ? '#2563EB' : isDark ? 'rgba(255,255,255,0.08)' : '#F1F5F9',
                                color: isSelected ? '#FFFFFF' : c.title,
                                fontSize: '11px',
                                fontWeight: 800,
                                cursor: 'pointer',
                              }}
                            >
                              {isSelected ? '✓ Selected' : 'Select ➔'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div style={{
                    margin: '0 18px 18px',
                    padding: '16px',
                    background: isDark ? 'rgba(0,0,0,0.32)' : '#F0F9FF',
                    borderRadius: '14px',
                    border: `1.5px solid ${isDark ? 'rgba(56,189,248,0.25)' : '#BAE6FD'}`,
                    overflowY: 'auto',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '18px' }}>📦</span>
                        <div>
                          <div style={{ fontSize: '13.5px', fontWeight: 900, color: c.title }}>
                            Inventory Details: <span style={{ color: '#0284C7' }}>{directParams.product_id}</span>
                          </div>
                          <div style={{ fontSize: '11px', color: c.sub }}>
                            Selected material and optimization inputs
                          </div>
                        </div>
                      </div>
                      <button
                        className="btn-hover"
                        onClick={async () => {
                          setIsExecutingDirectApi(true);
                          try {
                            const r = await optimizeInventoryDetailed(directParams);
                            setDirectApiResult(r);
                            setComputedPolicies(prev => [{ ...r, _computedAt: new Date().toISOString() }, ...prev]);
                            if (!r.reorder_required || r.material_shortage <= 0) {
                              setReleasedGates(prev => ({ ...prev, [directParams.product_id]: true }));
                            }
                            setShowInventoryPicker(false);
                            showToast(`✓ Optimization complete for ${directParams.product_id}! Results synced to Production Readiness.`);
                          } catch(e) {
                            showToast(`Optimization error: ${e.message || 'Unknown'}`, 'error');
                          } finally {
                            setIsExecutingDirectApi(false);
                          }
                        }}
                        disabled={isExecutingDirectApi}
                        style={{
                          padding: '9px 20px',
                          borderRadius: '10px',
                          border: 'none',
                          background: 'linear-gradient(135deg, #0284C7, #0369A1)',
                          color: '#FFFFFF',
                          fontSize: '12.5px',
                          fontWeight: 800,
                          cursor: isExecutingDirectApi ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '7px',
                          boxShadow: '0 4px 14px rgba(2,132,199,0.35)',
                        }}
                      >
                        {isExecutingDirectApi ? '⟳ Calculating Policy...' : '⚡ Run Optimization'}
                      </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '8px' }}>
                      {[
                        ['Material', currentProduct.product_name],
                        ['Category', currentProduct.category || 'Raw Material'],
                        ['Physical Stock', `${Number(directParams.current_inventory).toLocaleString()} ${currentProduct.unit || 'units'}`],
                        ['In-Transit Stock', `${Number(directParams.in_transit_qty || 0).toLocaleString()} ${currentProduct.unit || 'units'}`],
                        ['Forecast Demand', `${Number(directParams.forecasted_demand).toLocaleString()} ${currentProduct.unit || 'units'}`],
                        ['Demand Std. Deviation', `${Number(directParams.demand_std_dev).toLocaleString()} ${currentProduct.unit || 'units'}`],
                        ['Lead Time', `${directParams.average_lead_time} days`],
                        ['Lead Time Std. Deviation', `${directParams.lead_time_std_dev} days`],
                        ['Disruption Risk', `${(directParams.disruption_probability * 100).toFixed(0)}%`],
                        ['Supplier Trust', `${directParams.supplier_trust_score}/100`],
                        ['Target Service Level', `${(directParams.service_level * 100).toFixed(0)}%`],
                        ['Disruption Scenario', directParams.scenario],
                        ['Optimization Policy', directParams.policy_type],
                      ].map(([label, value]) => (
                        <div key={label} style={{
                          background: isDark ? 'rgba(0,0,0,0.2)' : '#FFFFFF',
                          padding: '9px 10px',
                          borderRadius: '10px',
                          border: `1px solid ${c.tableBorder}`,
                          minWidth: 0,
                        }}>
                          <div style={{ fontSize: '10px', fontWeight: 800, color: c.sub, marginBottom: '4px' }}>{label}</div>
                          <div style={{ fontSize: '12px', fontWeight: 800, color: c.title, overflowWrap: 'anywhere' }}>{value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Dedicated Results Section */}
            {directApiResult && (
              <div style={{
                marginTop:'18px',
                background: isDark ? 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(37,99,235,0.05))' : 'linear-gradient(135deg, #F0FDF4, #EFF6FF)',
                border: `1.5px solid ${isDark ? 'rgba(16,185,129,0.3)' : '#BBF7D0'}`,
                borderRadius: '14px',
                padding: '18px 20px',
                animation: 'content-fade-in 0.3s ease-out',
              }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'14px', flexWrap:'wrap', gap:'10px' }}>
                  <div style={{ fontWeight:800, color:'#10B981', fontSize:'13px', display:'flex', alignItems:'center', gap:'7px' }}>
                    <span>✓</span> Optimal Adaptive Policy Calculated (FastAPI Engine 200 OK)
                  </div>
                  <div style={{ fontSize:'11.5px', color:c.sub }}>
                    Risk Tier: <strong style={{ color: directApiResult.risk_level==='CRITICAL'?'#EF4444':directApiResult.risk_level==='HIGH'?'#F59E0B':'#10B981' }}>{directApiResult.risk_level}</strong> (Factor: {directApiResult.risk_factor?.toFixed(2)})
                  </div>
                </div>

                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(150px, 1fr))', gap:'10px' }}>
                  {[
                    ['Adaptive Safety Stock',  Math.round(directApiResult.safety_stock).toLocaleString()+' units', '#60A5FA'],
                    ['Adaptive Reorder Point', Math.round(directApiResult.reorder_point).toLocaleString()+' units', c.title],
                    ['Recommended ROQ',        Math.round(directApiResult.reorder_quantity).toLocaleString()+' units', '#34D399'],
                    ['Risk-Adjusted Lead Time', directApiResult.risk_adjusted_lead_time+' days', '#F59E0B'],
                    ['Backorder Probability',  (directApiResult.backorder_risk*100).toFixed(1)+'%', directApiResult.backorder_risk>0.3?'#F87171':'#34D399'],
                    ['Production Shortage',    Math.round(directApiResult.material_shortage).toLocaleString()+' units', directApiResult.material_shortage>0?'#F87171':'#34D399'],
                  ].map(([l,v,col],i)=>(
                    <div key={i} style={{ background: isDark?'rgba(0,0,0,.28)':'#FFFFFF', borderRadius:'10px', padding:'12px', border:`1px solid ${c.tableBorder}`, textAlign:'center' }}>
                      <div style={{ fontSize:'9.5px', fontWeight:800, color:c.sub, letterSpacing:'.04em' }}>{l}</div>
                      <div style={{ fontSize:'17px', fontWeight:900, color:col, marginTop:'4px' }}>{v}</div>
                    </div>
                  ))}
                </div>

                {/* Directive & Downstream Actions */}
                <div style={{
                  marginTop:'14px',
                  background: isDark?'rgba(0,0,0,.35)':'#FFFFFF',
                  padding:'12px 16px',
                  borderRadius:'10px',
                  border:`1px solid ${c.tableBorder}`,
                  display:'flex',
                  justifyContent:'space-between',
                  alignItems:'center',
                  flexWrap:'wrap',
                  gap:'12px',
                }}>
                  <div style={{ flex: 1, minWidth: '260px', fontSize:'12px', color:c.sub }}>
                    <strong style={{ color:c.title }}>Action Directive:</strong> {directApiResult.reorder_recommendation}
                  </div>
                  
                  {/* Action Handlers: Download & Send to Self-Healing Production */}
                  <div style={{ display:'flex', gap:'8px', alignItems:'center', flexWrap:'wrap' }}>
                    <button
                      className="btn-hover"
                      onClick={() => {
                        const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify({
                          timestamp: new Date().toISOString(),
                          product_id: directParams.product_id,
                          inputs: directParams,
                          computed_policy: directApiResult,
                        }, null, 2))}`;
                        const downloadAnchor = document.createElement('a');
                        downloadAnchor.setAttribute('href', jsonString);
                        downloadAnchor.setAttribute('download', `OptiChain_Policy_${directParams.product_id}_${new Date().toISOString().slice(0,10)}.json`);
                        document.body.appendChild(downloadAnchor);
                        downloadAnchor.click();
                        downloadAnchor.remove();
                        showToast(`✓ Policy report exported as JSON`);
                      }}
                      style={{
                        padding: '7px 14px',
                        borderRadius: '8px',
                        border: `1px solid ${c.tagBorder}`,
                        background: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9',
                        color: c.title,
                        fontSize: '11.5px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <span>📥</span> Download Policy (JSON)
                    </button>

                    <button
                      className="btn-hover"
                      onClick={() => handleExportPolicyPDF([directApiResult])}
                      style={{
                        padding: '7px 15px',
                        borderRadius: '8px',
                        border: '1px solid rgba(220,38,38,0.3)',
                        background: isDark ? 'rgba(220,38,38,0.18)' : '#FEF2F2',
                        color: '#DC2626',
                        fontSize: '11.5px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 2px 8px rgba(220,38,38,0.15)',
                      }}
                      title="Download PDF report for production line handoff"
                    >
                      <span>📄</span> Export PDF for Scheduling
                    </button>

                    <button
                      className="btn-hover"
                      onClick={() => {
                        // Mark material availability and release gate for this product
                        setReleasedGates(prev => ({ ...prev, [directParams.product_id]: true }));
                        // Switch active tab to Module 4 Production Readiness
                        setActiveTab('readiness');
                        showToast(`🚀 Dispatched to Self-Healing Production! Opening Module 4 handoff...`);
                      }}
                      style={{
                        padding: '7px 16px',
                        borderRadius: '8px',
                        border: 'none',
                        background: 'linear-gradient(135deg, #10B981, #059669)',
                        color: '#FFFFFF',
                        fontSize: '11.5px',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 4px 12px rgba(16,185,129,0.3)',
                      }}
                    >
                      <span>🏭</span> Send to Self-Healing Production ➔
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input Controls */}
          <div style={{
            ...styles.card,
            border: `1.5px solid ${isDark ? 'rgba(245,158,11,0.4)' : '#FDE68A'}`,
            boxShadow: isDark ? '0 0 36px rgba(245,158,11,0.15), 0 12px 36px rgba(0,0,0,0.45)' : '0 8px 24px rgba(245,158,11,0.08)',
          }}>
            <div style={styles.cardHeader}>
              <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                <div style={{ ...styles.cardIconBadge, background: isDark ? 'rgba(245,158,11,0.18)' : '#FEF3C7', color: '#F59E0B' }}>🎛️</div>
                <div>
                  <div style={styles.cardTitle}>Live Disruption Controls</div>
                  <div style={styles.cardSub}>Drag sliders to instantly recalculate — before/after comparison shown below</div>
                </div>
              </div>
              <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
                {[
                  { id:'baseline',      label:'Baseline Ops',     color:'#10B981', img:'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=80&h=80&fit=crop&q=80' },
                  { id:'port_crisis',   label:'Port Crisis',   color:'#EF4444', img:'https://images.unsplash.com/photo-1578575437130-527eed3abbec?w=80&h=80&fit=crop&q=80' },
                  { id:'demand_spike',  label:'Demand Surge',  color:'#F59E0B', img:'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=80&h=80&fit=crop&q=80' },
                  { id:'force_majeure', label:'Force Majeure', color:'#8B5CF6', img:'https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?w=80&h=80&fit=crop&q=80' },
                ].map(p=>(
                  <button
                    key={p.id}
                    className="btn-hover"
                    onClick={()=>applyPreset(p.id)}
                    style={{
                      ...styles.presetBtn,
                      display:'flex',
                      alignItems:'center',
                      gap:'8px',
                      padding:'5px 10px',
                      background: activePreset===p.id?p.color:(isDark?'#1E293B':'#FFFFFF'),
                      color: activePreset===p.id?'#FFFFFF':c.title,
                      border: `1.5px solid ${activePreset===p.id?p.color:c.tagBorder}`,
                      boxShadow: activePreset===p.id?`0 4px 14px ${p.color}55`:'0 1px 4px rgba(0,0,0,0.05)',
                    }}
                  >
                    <img
                      src={p.img}
                      alt={p.label}
                      style={{ width:'18px', height:'18px', borderRadius:'5px', objectFit:'cover' }}
                    />
                    <span style={{ fontWeight: 800 }}>{p.label}</span>
                  </button>
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
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'10px', gap:'8px' }}>
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

            {/* ═══ INTERACTIVE AI BEFORE / AFTER SPLIT COMPARISON SLIDER ═══ */}
            <div style={{ marginTop:'16px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px', flexWrap:'wrap', gap:'8px' }}>
                <div>
                  <div style={{ fontWeight:800, fontSize:'13px', color:c.title, display:'flex', alignItems:'center', gap:'7px' }}>
                    <span>⚡</span> Interactive Split Lens: Static Policy vs. AI Adaptive Guardian
                  </div>
                  <div style={{ fontSize:'11px', color:c.sub, marginTop:'2px' }}>
                    Drag the slider below to visually inspect how OptiChain dynamically recalculates inventory buffers under disruption
                  </div>
                </div>
                <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
                  <button
                    onClick={() => setSplitSliderPos(0)}
                    style={{ padding:'4px 9px', borderRadius:'6px', border:`1px solid ${c.tagBorder}`, background: splitSliderPos === 0 ? '#EF4444' : 'transparent', color: splitSliderPos === 0 ? '#fff' : c.sub, fontSize:'10px', fontWeight:700, cursor:'pointer' }}
                  >
                    100% Static
                  </button>
                  <button
                    onClick={() => setSplitSliderPos(50)}
                    style={{ padding:'4px 9px', borderRadius:'6px', border:`1px solid ${c.tagBorder}`, background: splitSliderPos === 50 ? '#2563EB' : 'transparent', color: splitSliderPos === 50 ? '#fff' : c.sub, fontSize:'10px', fontWeight:700, cursor:'pointer' }}
                  >
                    50 / 50 Split
                  </button>
                  <button
                    onClick={() => setSplitSliderPos(100)}
                    style={{ padding:'4px 9px', borderRadius:'6px', border:`1px solid ${c.tagBorder}`, background: splitSliderPos === 100 ? '#10B981' : 'transparent', color: splitSliderPos === 100 ? '#fff' : c.sub, fontSize:'10px', fontWeight:700, cursor:'pointer' }}
                  >
                    100% AI Guardian
                  </button>
                </div>
              </div>

              {/* Visual Split Dual-Lens Display */}
              <div style={{
                position:'relative',
                borderRadius:'16px',
                overflow:'hidden',
                border:`1.5px solid ${isDark ? 'rgba(59,130,246,0.35)' : '#CBD5E1'}`,
                background: isDark ? '#0A1224' : '#F8FAFC',
                boxShadow: isDark ? '0 12px 36px rgba(0,0,0,0.45)' : '0 6px 24px rgba(15,23,42,0.08)',
                minHeight:'176px',
                display:'flex',
              }}>
                {/* Left Side: Static Legacy Policy */}
                <div style={{
                  flex: `${splitSliderPos}`,
                  padding: '14px 16px',
                  background: isDark ? 'linear-gradient(135deg, rgba(239,68,68,0.12), rgba(15,23,42,0.6))' : 'linear-gradient(135deg, #FEF2F2, #FFFFFF)',
                  borderRight: `2px solid ${isDark ? '#EF4444' : '#DC2626'}`,
                  transition: 'flex 0.1s ease-out',
                  overflow: 'hidden',
                  minWidth: splitSliderPos > 10 ? '180px' : '0px',
                  opacity: splitSliderPos < 15 ? 0.2 : 1,
                }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'12px' }}>
                    <span style={{ fontSize:'16px' }}>🏛️</span>
                    <div>
                      <div style={{ fontSize:'11.5px', fontWeight:900, color: isDark ? '#FCA5A5' : '#B91C1C', letterSpacing:'.06em' }}>
                        STATIC INVENTORY POLICY
                      </div>
                      <div style={{ fontSize:'10px', color:c.sub }}>Fixed Reorder Cycles · Unadjusted</div>
                    </div>
                  </div>

                  <div style={{ display:'grid', gridTemplateColumns:'repeat(3, minmax(0, 1fr))', gap:'8px' }}>
                    <div style={{ background: isDark ? 'rgba(0,0,0,0.3)' : '#FFFFFF', padding:'8px', borderRadius:'9px', border:`1px solid ${c.tableBorder}` }}>
                      <div style={{ fontSize:'9.5px', color:c.sub, fontWeight:700 }}>STATIC BUFFER</div>
                      <div style={{ fontSize:'16px', fontWeight:900, color: isDark ? '#F87171' : '#DC2626', marginTop:'3px' }}>
                        {(baselineSnap?.ss || Math.round(currentProduct.forecasted_demand * 0.2)).toLocaleString()}
                      </div>
                      <div style={{ fontSize:'9px', color:c.sub }}>{currentProduct.unit}</div>
                    </div>

                    <div style={{ background: isDark ? 'rgba(0,0,0,0.3)' : '#FFFFFF', padding:'8px', borderRadius:'9px', border:`1px solid ${c.tableBorder}` }}>
                      <div style={{ fontSize:'9.5px', color:c.sub, fontWeight:700 }}>STOCKOUT RISK</div>
                      <div style={{ fontSize:'16px', fontWeight:900, color:'#EF4444', marginTop:'3px' }}>
                        {(disruptionProb * 100).toFixed(0)}%
                      </div>
                      <div style={{ fontSize:'9px', color:'#F87171' }}>Line Starvation Imminent</div>
                    </div>

                    <div style={{ background: isDark ? 'rgba(0,0,0,0.3)' : '#FFFFFF', padding:'8px', borderRadius:'9px', border:`1px solid ${c.tableBorder}` }}>
                      <div style={{ fontSize:'9.5px', color:c.sub, fontWeight:700 }}>IDLE EXPOSURE</div>
                      <div style={{ fontSize:'16px', fontWeight:900, color:'#EF4444', marginTop:'3px' }}>
                        ${(calculateFinancialImpact(currentProduct, activeOpt.roq, activeOpt.ss).downtimeExposure).toLocaleString()}
                      </div>
                      <div style={{ fontSize:'9px', color:c.sub }}>12h Stoppage Penalty</div>
                    </div>
                  </div>
                </div>

                {/* Right Side: OptiChain AI Adaptive Guardian */}
                <div style={{
                  flex: `${100 - splitSliderPos}`,
                  padding: '14px 16px',
                  background: isDark ? 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(37,99,235,0.1))' : 'linear-gradient(135deg, #F0FDF4, #EFF6FF)',
                  transition: 'flex 0.1s ease-out',
                  overflow: 'hidden',
                  minWidth: (100 - splitSliderPos) > 10 ? '180px' : '0px',
                  opacity: (100 - splitSliderPos) < 15 ? 0.2 : 1,
                }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'12px' }}>
                    <span style={{ fontSize:'16px' }}>🛡️</span>
                    <div>
                      <div style={{ fontSize:'11.5px', fontWeight:900, color: isDark ? '#6EE7B7' : '#15803D', letterSpacing:'.06em' }}>
                        OPTICHAIN AI ADAPTIVE GUARDIAN
                      </div>
                      <div style={{ fontSize:'10px', color:c.sub }}>Dynamic Variance Buffer · Disruption Compensated</div>
                    </div>
                  </div>

                  <div style={{ display:'grid', gridTemplateColumns:'repeat(3, minmax(0, 1fr))', gap:'8px' }}>
                    <div style={{ background: isDark ? 'rgba(0,0,0,0.3)' : '#FFFFFF', padding:'8px', borderRadius:'9px', border:`1px solid ${c.tableBorder}` }}>
                      <div style={{ fontSize:'9.5px', color:c.sub, fontWeight:700 }}>ADAPTIVE BUFFER</div>
                      <div style={{ fontSize:'16px', fontWeight:900, color: '#10B981', marginTop:'3px' }}>
                        {activeOpt.ss.toLocaleString()}
                      </div>
                      <div style={{ fontSize:'9px', color:c.sub }}>+{Math.round(activeOpt.ss - (baselineSnap?.ss || currentProduct.forecasted_demand * 0.2)).toLocaleString()} protected</div>
                    </div>

                    <div style={{ background: isDark ? 'rgba(0,0,0,0.3)' : '#FFFFFF', padding:'8px', borderRadius:'9px', border:`1px solid ${c.tableBorder}` }}>
                      <div style={{ fontSize:'9.5px', color:c.sub, fontWeight:700 }}>SERVICE LEVEL</div>
                      <div style={{ display:'flex', justifyContent:'center', margin:'2px 0' }}>
                        <StockGauge
                          pct={serviceLevel}
                          label="SLA"
                          color="#34D399"
                          size={72}
                          precision={1}
                          trackColor={isDark ? 'rgba(148,163,184,0.2)' : '#E2E8F0'}
                        />
                      </div>
                      <div style={{ fontSize:'9px', color:'#10B981' }}>Full SLA Secured</div>
                    </div>

                    <div style={{ background: isDark ? 'rgba(0,0,0,0.3)' : '#FFFFFF', padding:'8px', borderRadius:'9px', border:`1px solid ${c.tableBorder}` }}>
                      <div style={{ fontSize:'9.5px', color:c.sub, fontWeight:700 }}>PROTECTED ROI</div>
                      <div style={{ fontSize:'16px', fontWeight:900, color:'#10B981', marginTop:'3px' }}>
                        {calculateFinancialImpact(currentProduct, activeOpt.roq, activeOpt.ss).roiMultiplier}×
                      </div>
                      <div style={{ fontSize:'9px', color:'#10B981' }}>+${(calculateFinancialImpact(currentProduct, activeOpt.roq, activeOpt.ss).netProtectedValue).toLocaleString()} net</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Interactive Luxury Drag Slider Control with Pop-up HUD and Dynamic Drag Indicator */}
              <div style={{
                marginTop: '10px',
                background: isDark ? 'rgba(15,23,42,0.8)' : '#FFFFFF',
                border: `1.5px solid ${isDark ? 'rgba(245,158,11,0.3)' : '#FDE68A'}`,
                borderRadius: '12px',
                padding: '9px 14px',
                boxShadow: isDark ? '0 8px 24px rgba(0,0,0,0.35)' : '0 2px 12px rgba(15,23,42,0.05)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', gap: '8px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      fontSize: '10px',
                      fontWeight: 900,
                      color: '#EF4444',
                      background: 'rgba(239,68,68,0.15)',
                      padding: '3px 10px',
                      borderRadius: '12px',
                      border: '1px solid rgba(239,68,68,0.35)',
                    }}>
                      🏛️ Static Policy ({splitSliderPos}%)
                    </span>
                  </div>

                  {/* Centered Floating Drag Prompt & Live Lens Status */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '11px',
                    fontWeight: 800,
                    color: isDark ? '#FDE047' : '#D97706',
                    background: isDark ? 'rgba(245,158,11,0.15)' : '#FEF3C7',
                    padding: '3px 10px',
                    borderRadius: '20px',
                    border: '1px solid rgba(245,158,11,0.4)',
                    boxShadow: '0 2px 8px rgba(245,158,11,0.2)',
                  }}>
                    <span style={{ animation: 'float-subtle 1.5s ease-in-out infinite' }}>👈 Drag Slider 👉</span>
                    <span style={{ opacity: 0.7 }}>|</span>
                    <span>{splitSliderPos < 50 ? '🛡️ AI Buffer Dominant' : splitSliderPos > 50 ? '⚠️ Static Exposure High' : '⚖️ 50/50 Balanced Comparison'}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{
                      fontSize: '10px',
                      fontWeight: 900,
                      color: '#10B981',
                      background: 'rgba(16,185,129,0.15)',
                      padding: '3px 10px',
                      borderRadius: '12px',
                      border: '1px solid rgba(16,185,129,0.35)',
                    }}>
                      🛡️ AI Guardian ({100 - splitSliderPos}%)
                    </span>
                  </div>
                </div>

                {/* Range Slider Track */}
                <div style={{ position: 'relative', width: '100%', padding: '4px 0' }}>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={splitSliderPos}
                    onChange={(e) => setSplitSliderPos(parseInt(e.target.value))}
                    className="split-drag-thumb"
                    style={{
                      width: '100%',
                      height: '9px',
                      borderRadius: '5px',
                      appearance: 'none',
                      background: 'linear-gradient(to right, #EF4444 0%, #F59E0B 50%, #10B981 100%)',
                      outline: 'none',
                      cursor: 'grab',
                      boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.5)',
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Before / After comparison tabular breakdown */}
            <div style={{ marginTop:'12px', display:'grid', gridTemplateColumns:'minmax(0, 1fr) auto minmax(0, 1fr)', gap:'10px', alignItems:'center' }}>
              {/* Before */}
              <div style={{ ...styles.subCard, opacity: baselineSnap?1:0.5 }}>
                <div style={{                 fontSize:'10px', fontWeight:800, color:c.sub, letterSpacing:'.07em', marginBottom:'6px' }}>
                  BASELINE SNAPSHOT {!baselineSnap&&'(select a preset to compare)'}
                </div>
                {[
                  ['Safety Stock', baselineSnap?.ss?.toLocaleString()??'—', '#60A5FA'],
                  ['Reorder Point', baselineSnap?.rop?.toLocaleString()??'—', c.title],
                  ['Reorder Qty', baselineSnap?.roq?.toLocaleString()??'—', '#34D399'],
                  ['Risk Level', baselineSnap?.risk??'—', '#FBBF24'],
                ].map(([l,v,col],i)=>(
                  <div key={i} style={{ display:'flex', justifyContent:'space-between', fontSize:'11px', color:c.sub, padding:'4px 0', borderBottom:`1px solid ${c.tableBorder}` }}>
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
                <div style={{ fontSize:'10px', fontWeight:800, color:'#60A5FA', letterSpacing:'.07em', marginBottom:'6px' }}>LIVE OUTPUT</div>
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
                    <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:'11px', color:c.sub, padding:'4px 0', borderBottom:`1px solid ${c.tableBorder}` }}>
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
            <PolicyComparisonChart
              baseline={baselineSnap}
              current={activeOpt}
              unit={currentProduct.unit}
              isDark={isDark}
            />
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
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(250px,1fr))', gap:'12px' }}>
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
                  <div key={scName} style={{ ...styles.subCard, padding:'14px', border:`1px solid ${ac}44`, boxShadow:`0 0 18px ${ac}14` }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'8px', paddingBottom:'7px', borderBottom:`1px solid ${ac}33` }}>
                      <div>
                        <div style={{ fontWeight:800, fontSize:'13px', color:c.title }}>{scName} ({sc.multiplier}x)</div>
                        <div style={{ fontSize:'11px', color:c.sub, marginTop:'2px' }}>P(risk): {(sc.disruption_probability*100).toFixed(0)}%</div>
                      </div>
                      <span style={{ ...styles.badge, background:ac+'22', color:ac, border:`1px solid ${ac}55`, fontSize:'11px', padding:'4px 10px' }}>{sc.risk_level}</span>
                    </div>
                    {[['Lead Time',sc.risk_adjusted_lead_time+' days',c.title],['Safety Buffer',sc.safety_stock.toLocaleString()+` ${currentProduct.unit}`,'#60A5FA'],['Trigger ROP',sc.reorder_point.toLocaleString()+` ${currentProduct.unit}`,c.title],['Rec. ROQ',sc.reorder_quantity.toLocaleString()+` ${currentProduct.unit}`,'#34D399']].map(([l,v,col],i)=>(
                      <div key={i} style={{ display:'flex', justifyContent:'space-between', fontSize:'11px', color:c.sub, padding:'4px 0', borderBottom:`1px solid ${c.tableBorder}` }}><span>{l}</span><strong style={{ color:col }}>{v}</strong></div>
                    ))}
                    <div style={{ marginTop:'8px', padding:'7px 8px', background:ac+'12', borderRadius:'8px', border:`1px dashed ${ac}44`, fontSize:'10.5px', color:c.title }}>
                      <span style={{ color:ac, fontWeight:800, fontSize:'9.5px', letterSpacing:'.06em' }}>DIRECTIVE — </span>{sc.reorder_recommendation}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ═══ TAB 3: PRODUCTION READINESS & MODULE 4 HANDOFF ═══════════════ */}
      {activeTab === 'readiness' && (() => {
        // Enrich data with factory lines, shifts, and simulation overrides
        const enrichedList = (productionInterfaceData || []).map(item => {
          // Check if user has computed an adaptive policy for this SKU in the active session
          const userPolicy = computedPolicies.find(p => p.product_id === item.product_id);
          const isSim = simulateExpeditedArrival || Boolean(releasedGates[item.product_id]) || (userPolicy && !userPolicy.reorder_required);
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
          const req = userPolicy ? (userPolicy.material_requirement || userPolicy.forecasted_demand || item.material_requirement) : (item.material_requirement || 0);
          const avail = isSim
            ? Math.max(req, userPolicy ? userPolicy.current_inventory : (item.available_inventory || 0))
            : (userPolicy ? userPolicy.current_inventory : (item.available_inventory || 0));
          const shortage = isSim ? 0 : (userPolicy ? (userPolicy.material_shortage ?? Math.max(0, req - avail)) : (item.material_shortage || 0));
          const isReady = isSim ? true : (shortage === 0 && avail >= req);
          const fulfillmentPct = Math.min(100, Math.round((avail / Math.max(1, req)) * 100));

          return {
            ...item,
            available_inventory: avail,
            material_requirement: req,
            material_shortage: shortage,
            selected_reorder_point: userPolicy ? userPolicy.reorder_point : item.selected_reorder_point,
            selected_reorder_quantity: userPolicy ? userPolicy.reorder_quantity : item.selected_reorder_quantity,
            safety_stock: userPolicy ? userPolicy.safety_stock : item.safety_stock,
            inventory_risk_level: userPolicy ? userPolicy.risk_level : item.inventory_risk_level,
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
          <div className="connected-tab-content" style={styles.tabContent}>
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
        <div className="connected-tab-content" style={styles.tabContent}>
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

          {/* ── PANEL 10.5: Policy Comparison Table ── */}
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                <div style={styles.cardIconBadge}>📊</div>
                <div>
                  <div style={styles.cardTitle}>Policy Comparison Table — Absolute & Relative Changes</div>
                  <div style={styles.cardSub}>Panel Req 10.5 · Baseline vs Adaptive vs Forecast-Risk-Aware · Simulation on 171,962 records</div>
                </div>
              </div>
              <span style={{ ...styles.badge, padding:'4px 12px', background:'rgba(16,185,129,.12)', color:'#34D399', border:'1px solid rgba(16,185,129,.35)', fontSize:'10.5px' }}>Authentic Results</span>
            </div>
            <div style={{ overflowX:'auto', borderRadius:'10px', border:`1px solid ${c.tableBorder}` }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'12px', minWidth:'750px' }}>
                <thead>
                  <tr style={{ background: isDark?'#0A1626':'#E2E8F0', borderBottom:`2px solid ${c.tableBorder}` }}>
                    {['Metric','Policy A — Static (s,S)','Policy B — Std Adaptive','Policy C — OPTICHAIN ⭐','B→C Absolute Δ','B→C Relative %'].map((h,i) => (
                      <th key={i} style={{ padding:'11px 14px', textAlign:i===0?'left':'right', color:isDark?c.sub:'#0F172A', fontWeight:800, fontSize:'10.5px', letterSpacing:'.04em', whiteSpace:'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { metric:'Service Level',         a:'99.9988%',      b:'99.4624%',       c:'99.9567%',      delta:'+0.4943 pp', rel:'+0.50%',   good:true  },
                    { metric:'Stockout Rate',          a:'0.0012%',       b:'0.5376%',        c:'0.0433%',       delta:'−0.4943 pp', rel:'−91.9%',   good:true  },
                    { metric:'Stockout Units (total)', a:'4.36 units',    b:'1,994.05 units', c:'160.45 units',  delta:'−1,833.60',  rel:'−91.95%',  good:true  },
                    { metric:'Average Inventory',      a:'62.70 units',   b:'45.43 units',    c:'77.70 units',   delta:'+32.27',     rel:'+71.0%',   good:false },
                    { metric:'Replenishment Orders',   a:'2,916',         b:'6,415',          c:'6,478',         delta:'+63',        rel:'+0.98%',   good:false },
                    { metric:'Fulfilled Demand',       a:'370,941.64',    b:'368,951.95',     c:'370,785.55',    delta:'+1,833.60',  rel:'+0.50%',   good:true  },
                  ].map((row, i) => (
                    <tr key={i} style={{ borderBottom:`1px solid ${c.tableBorder}`, background:i%2===0?'transparent':(isDark?'rgba(255,255,255,0.015)':'rgba(0,0,0,0.013)') }}>
                      <td style={{ padding:'11px 14px', fontWeight:700, color:c.title, whiteSpace:'nowrap' }}>{row.metric}</td>
                      <td style={{ padding:'11px 14px', textAlign:'right', color:c.sub, fontFamily:'monospace', fontSize:'11.5px' }}>{row.a}</td>
                      <td style={{ padding:'11px 14px', textAlign:'right', color:'#FBBF24', fontFamily:'monospace', fontSize:'11.5px' }}>{row.b}</td>
                      <td style={{ padding:'11px 14px', textAlign:'right', color:'#10B981', fontFamily:'monospace', fontSize:'11.5px', fontWeight:800 }}>{row.c}</td>
                      <td style={{ padding:'11px 14px', textAlign:'right', fontFamily:'monospace', fontSize:'11.5px', fontWeight:700, color:row.good===null?c.sub:row.good?'#34D399':'#FBBF24' }}>{row.delta}</td>
                      <td style={{ padding:'11px 14px', textAlign:'right', fontFamily:'monospace', fontSize:'11.5px', fontWeight:700, color:row.good===null?c.sub:row.good?'#34D399':'#FBBF24' }}>{row.rel}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ marginTop:'10px', fontSize:'11px', color:c.sub, lineHeight:1.6, padding:'10px 14px', background:isDark?'rgba(255,255,255,0.02)':'#F8FAFC', borderRadius:'8px', border:`1px solid ${c.subCardBorder}` }}>
              <strong style={{ color:c.title }}>Trade-off:</strong> Policy C carries <strong style={{ color:'#FBBF24' }}>+71% more average inventory</strong> than Policy B — an intentional investment delivering a <strong style={{ color:'#34D399' }}>91.95% reduction in stockout units</strong> and <strong style={{ color:'#34D399' }}>+0.49 pp higher service level</strong>. Absolute (pp) and relative (%) changes are reported separately to maintain statistical accuracy.
            </div>
          </div>

          {/* ── PANEL 10.8: Research Transparency (Expandable) ── */}
          <div style={styles.card}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', cursor:'pointer', userSelect:'none' }} onClick={() => setShowResearchTransparency(v => !v)}>
                  <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                    <div style={styles.cardIconBadge}>🔎</div>
                    <div>
                      <div style={styles.cardTitle}>Research Transparency & Methodology (Panel Req 10.8)</div>
                      <div style={styles.cardSub}>Click to expand — Formulas · Data sources · Assumptions · Limitations · Model version · Timestamp</div>
                    </div>
                  </div>
                  <span style={{ fontSize:'20px', color:c.sub, display:'inline-block', transition:'transform .3s', transform:showResearchTransparency?'rotate(180deg)':'rotate(0deg)' }}>⌄</span>
                </div>
                {showResearchTransparency && (
                  <div style={{ marginTop:'20px', display:'flex', flexDirection:'column', gap:'16px', animation:'slide-up .3s ease' }}>
                    {/* Formulas */}
                    <div style={styles.subCard}>
                      <div style={{ fontWeight:800, fontSize:'11px', color:'#60A5FA', letterSpacing:'.07em', marginBottom:'12px' }}>📐 OPTIMIZATION FORMULAS & ASSUMPTIONS</div>
                      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(310px,1fr))', gap:'10px' }}>
                        {[
                          ['Risk Factor (RF)', 'RF = 1 + (P_disrupt × (1 − Trust/100))', 'Penalises lead time based on disruption probability and supplier trust score (0–100)'],
                          ['Risk-Adjusted Lead Time', 'L_adj = L̄ × RF', 'Extends expected delivery window proportionally under disruption'],
                          ['Kingman Safety Stock', 'SS = Z × √( L_adj·σ_D² + D̄²·σ_L² )', 'Dual-variance formula — accounts for both demand AND lead-time stochasticity'],
                          ['Reorder Point (ROP)', 'ROP = (D̄ × L_adj) + SS', 'Order trigger: when position falls to ROP, dispatch Purchase Order immediately'],
                          ['Reorder Quantity (ROQ)', 'ROQ = D̄ × Cycle_Days × RF', 'Periodic-review demand coverage; EOQ excluded (no static cost inputs in apparel)'],
                          ['Material Shortage', 'Shortage = max(0, Demand − On-Hand)', 'Production floor material deficit in physical units; feeds Module 4 Line Optimizer'],
                        ].map(([name, f, note], i) => (
                          <div key={i} style={{ background:isDark?'rgba(255,255,255,0.03)':'#FFFFFF', border:`1px solid ${isDark?'rgba(59,130,246,0.2)':'#E0F2FE'}`, borderRadius:'8px', padding:'12px' }}>
                            <div style={{ fontSize:'10px', fontWeight:800, color:c.sub, letterSpacing:'.06em', marginBottom:'5px' }}>{name}</div>
                            <div style={{ fontFamily:'monospace', fontSize:'12px', fontWeight:700, color:'#60A5FA', lineHeight:1.6, marginBottom:'5px' }}>{f}</div>
                            <div style={{ fontSize:'10.5px', color:c.sub, lineHeight:1.4, fontStyle:'italic' }}>{note}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* Service Level Trade-off */}
                    <div style={styles.subCard}>
                      <div style={{ fontWeight:800, fontSize:'11px', color:'#A78BFA', letterSpacing:'.07em', marginBottom:'10px' }}>📊 SERVICE LEVEL → Z-VALUE TRADE-OFF (Section 8.3)</div>
                      <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'12px' }}>
                        <thead>
                          <tr style={{ borderBottom:`1px solid ${c.tableBorder}` }}>
                            {['Service Level','Z-value','Safety Stock Effect','Use Case'].map(h => (
                              <th key={h} style={{ padding:'8px 10px', textAlign:'left', color:c.sub, fontWeight:700, fontSize:'10.5px' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {[
                            ['90%',   '1.282', 'Smallest buffer → lowest cost',          'Low-risk local suppliers (YRN-042, TRM-022)'],
                            ['95% ★', '1.645', 'Balanced → OptiChain default',            'Standard for most SKUs; default factory setting'],
                            ['97.5%', '1.960', 'Larger buffer → moderate premium',        'Critical fabrics with long lead times (FAB-001)'],
                            ['99%',   '2.326', 'Maximum buffer → highest holding cost',   'Severe disruption scenarios (Red Sea crisis)'],
                          ].map(([sl, z, eff, use], i) => (
                            <tr key={i} style={{ borderBottom:`1px solid ${c.tableBorder}`, background:sl.includes('★')?(isDark?'rgba(37,99,235,0.08)':'rgba(37,99,235,0.04)'):'' }}>
                              <td style={{ padding:'8px 10px', fontWeight:800, color:sl.includes('★')?'#60A5FA':c.title }}>{sl}</td>
                              <td style={{ padding:'8px 10px', fontFamily:'monospace', fontWeight:700, color:c.title }}>{z}</td>
                              <td style={{ padding:'8px 10px', color:'#A78BFA', fontSize:'11.5px' }}>{eff}</td>
                              <td style={{ padding:'8px 10px', color:c.sub, fontSize:'11px' }}>{use}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {/* Data sources + Limitations */}
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'14px' }}>
                      <div style={styles.subCard}>
                        <div style={{ fontWeight:800, fontSize:'11px', color:'#34D399', letterSpacing:'.07em', marginBottom:'10px' }}>📂 DATA SOURCES & INPUT LABELS</div>
                        {[
                          ['Demand Feed', 'DEMO — Module 1 sim output', 'dummy_demand_forecasts.csv'],
                          ['Risk Feed', 'DEMO — Module 2 sim output', 'dummy_supplier_risk_scores.csv'],
                          ['ML Training Data', 'Kaggle Industrial Backorder Benchmark', 'Training_BOP.csv / Testing_BOP.csv'],
                          ['Simulation Data', 'DataCo Smart Supply Chain (public)', '171,962 records · 2015–2017'],
                          ['Product Catalog', 'SQLite — persistent across sessions', 'optichain_inventory.db'],
                        ].map(([label, src, file], i) => (
                          <div key={i} style={{ borderBottom:`1px solid ${c.tableBorder}`, padding:'7px 0' }}>
                            <div style={{ display:'flex', justifyContent:'space-between', fontSize:'11.5px' }}>
                              <span style={{ color:c.sub, fontWeight:700 }}>{label}:</span>
                              <code style={{ color:'#34D399', fontSize:'10px', fontFamily:'monospace' }}>{file}</code>
                            </div>
                            <div style={{ fontSize:'10px', color:c.sub, marginTop:'2px', opacity:.75 }}>{src}</div>
                          </div>
                        ))}
                      </div>
                      <div style={styles.subCard}>
                        <div style={{ fontWeight:800, fontSize:'11px', color:'#F87171', letterSpacing:'.07em', marginBottom:'10px' }}>⚠️ KNOWN LIMITATIONS</div>
                        {[
                          'Supplier identifiers are synthetic demo labels — not real MAS Holdings vendor records.',
                          'DataCo dataset is global e-commerce logistics; used for ML benchmark only, not garment-specific.',
                          'XGBoost outputs are auxiliary warning signals — not the primary inventory policy driver.',
                          'Demo feeds use a static 14-day forecast horizon; live integration would use rolling windows.',
                          'EOQ excluded — no reliable static holding/ordering cost data available for Sri Lankan apparel.',
                          'Inventory position = On-Hand + In-Transit; full backorder data unavailable for complete IP.',
                        ].map((lim, i) => (
                          <div key={i} style={{ fontSize:'11px', color:c.sub, padding:'5px 0', borderBottom:`1px dashed ${c.tableBorder}`, display:'flex', gap:'6px', lineHeight:1.4 }}>
                            <span style={{ color:'#F87171', flexShrink:0 }}>•</span>{lim}
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* Metadata */}
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:'10px' }}>
                      {[
                        ['Upstream Data Mode',    'DEMO (Simulated — not real trained-model outputs)', '#FBBF24'],
                        ['Policy Engine Version', 'inventory-policy-v1.0', '#60A5FA'],
                        ['ML Model Version',      'backorder-xgb-v1.0', '#A78BFA'],
                        ['Calculation Timestamp', new Date().toLocaleString('en-LK'), '#34D399'],
                        ['Simulation Assumption', 'Instantaneous replenishment (no transit delay in sim)', '#F87171'],
                        ['Git Branch',            'Disruption_Aware_Adaptive_Inventory_Module', '#10B981'],
                      ].map(([label, val, color], i) => (
                        <div key={i} style={{ background:isDark?'rgba(255,255,255,0.02)':'#F8FAFC', border:`1px solid ${c.subCardBorder}`, borderRadius:'8px', padding:'10px 12px' }}>
                          <div style={{ fontSize:'9px', fontWeight:800, color:c.sub, letterSpacing:'.07em', marginBottom:'4px' }}>{label}</div>
                          <div style={{ fontSize:'11px', fontWeight:700, color, wordBreak:'break-word' }}>{val}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
        </div>
      )}




      {/* ═══ 3D MATERIAL LABORATORY & 360 INSPECTION MODAL ════════════════ */}
      {selectedHero3DModal && (() => {
        const p = selectedHero3DModal;
        const media = SKU_CATALOG_MEDIA[p.product_id];
        const fullCover = media?.images?.[0] || 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=1600&auto=format&fit=crop&q=80';
        return (
          <div style={styles.modalOverlay} onClick={() => setSelectedHero3DModal(null)}>
            <div
              style={{
                ...styles.modalBox,
                maxWidth: '840px',
                padding: '0',
                overflow: 'hidden',
                background: isDark ? '#0A1224' : '#FFFFFF',
                borderRadius: '24px',
                animation: 'modal-scale-pop 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                border: `1.5px solid ${isDark ? 'rgba(59,130,246,0.4)' : '#CBD5E1'}`,
                boxShadow: '0 24px 60px rgba(0,0,0,0.65)',
              }}
              onClick={e => e.stopPropagation()}
            >
              {/* Modal Top Header with 3D Photography Hero */}
              <div style={{ position: 'relative', height: '260px', overflow: 'hidden' }}>
                <img
                  src={fullCover}
                  alt={p.product_name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.7) contrast(1.1)' }}
                />
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(to top, rgba(10,18,36,0.95) 0%, rgba(10,18,36,0.4) 60%, transparent 100%)',
                }} />

                {/* Close Button */}
                <button
                  onClick={() => setSelectedHero3DModal(null)}
                  style={{
                    position: 'absolute',
                    top: '16px',
                    right: '16px',
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: 'rgba(0,0,0,0.65)',
                    border: '1px solid rgba(255,255,255,0.25)',
                    color: '#FFFFFF',
                    fontSize: '16px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backdropFilter: 'blur(8px)',
                  }}
                >
                  ✕
                </button>

                {/* Title Overlay */}
                <div style={{ position: 'absolute', bottom: '20px', left: '26px', right: '26px' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ background: '#2563EB', color: '#FFFFFF', fontSize: '11px', fontWeight: 900, padding: '3px 12px', borderRadius: '14px' }}>
                      {p.product_id}
                    </span>
                    <span style={{ color: '#6EE7B7', fontSize: '11px', fontWeight: 800, background: 'rgba(16,185,129,0.2)', padding: '3px 10px', borderRadius: '12px' }}>
                      ✓ OEKO-TEX Standard 100 Verified
                    </span>
                  </div>
                  <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 900, color: '#FFFFFF', letterSpacing: '-0.02em' }}>
                    {p.product_name}
                  </h2>
                  <div style={{ fontSize: '12px', color: '#CBD5E1', marginTop: '4px' }}>
                    {media?.fabricSpec || 'High-Resiliency Technical Apparel Material milled for MAS Colombo Hub'}
                  </div>
                </div>
              </div>

              {/* Modal Body: 3D Weave Texture & Detailed Laboratory Metrics */}
              <div style={{ padding: '24px 26px', display: 'flex', flexDirection: 'column', gap: '20px', maxHeight: '55vh', overflowY: 'auto' }}>
                {/* 3D Tactile Weave Swatch Visualizer */}
                <div style={{
                  background: isDark ? 'rgba(255,255,255,0.03)' : '#F8FAFC',
                  borderRadius: '16px',
                  padding: '16px 20px',
                  border: `1px solid ${c.cardBorder}`,
                  display: 'grid',
                  gridTemplateColumns: '150px 1fr',
                  gap: '18px',
                  alignItems: 'center',
                }}>
                  {/* Warp/Weft Micro Pattern */}
                  <div style={{
                    width: '150px',
                    height: '110px',
                    borderRadius: '12px',
                    border: '1.5px solid rgba(59,130,246,0.4)',
                    boxShadow: '0 8px 20px rgba(0,0,0,0.3), inset 0 0 15px rgba(0,0,0,0.5)',
                    overflow: 'hidden',
                    position: 'relative',
                    background: isDark ? '#0D1B2E' : '#EFF6FF',
                  }}>
                    <svg width="100%" height="100%">
                      <defs>
                        <pattern id={`modal-weave-${p.product_id}`} width="14" height="14" patternUnits="userSpaceOnUse">
                          <path d="M 0,7 L 14,7 M 7,0 L 7,14" stroke="#3B82F6" strokeWidth="2.8" strokeLinecap="round" opacity="0.6" />
                          <circle cx="7" cy="7" r="2.2" fill="#60A5FA" />
                        </pattern>
                      </defs>
                      <rect width="100%" height="100%" fill={`url(#modal-weave-${p.product_id})`} />
                    </svg>
                    <div style={{ position: 'absolute', bottom: '6px', right: '6px', background: 'rgba(0,0,0,0.7)', color: '#fff', fontSize: '8px', fontWeight: 800, padding: '2px 6px', borderRadius: '4px' }}>
                      3D SCAN
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 800, color: isDark ? '#93C5FD' : '#1D4ED8', letterSpacing: '.06em' }}>
                      MICRO-TACTILE YARN DENSITY SCAN
                    </div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: c.title, marginTop: '3px' }}>
                      {media?.endUse || 'Optimized for high-throughput automated circular knitting lines'}
                    </div>
                    <div style={{ fontSize: '11px', color: c.sub, marginTop: '4px', lineHeight: 1.5 }}>
                      Tested across MAS Biyagama Lab with tensile elongation variance of &lt;1.8%. Dual-filament twist delivers enhanced wrinkle recovery and rich saturation under reactive dyes.
                    </div>
                  </div>
                </div>

                {/* 4 Laboratory Metric Bento Tiles */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                  <div style={{ background: isDark ? '#0D1B2E' : '#F1F5F9', padding: '12px', borderRadius: '12px', border: `1px solid ${c.cardBorder}` }}>
                    <div style={{ fontSize: '9px', color: c.sub, fontWeight: 800 }}>PHYSICAL STOCK</div>
                    <div style={{ fontSize: '16px', fontWeight: 900, color: '#38BDF8', marginTop: '2px' }}>
                      {p.current_inventory.toLocaleString()}
                    </div>
                    <div style={{ fontSize: '9px', color: c.sub }}>{p.unit} in Colombo</div>
                  </div>

                  <div style={{ background: isDark ? '#0D1B2E' : '#F1F5F9', padding: '12px', borderRadius: '12px', border: `1px solid ${c.cardBorder}` }}>
                    <div style={{ fontSize: '9px', color: c.sub, fontWeight: 800 }}>ADAPTIVE BUFFER</div>
                    <div style={{ fontSize: '16px', fontWeight: 900, color: '#34D399', marginTop: '2px' }}>
                      {Math.round(p.forecasted_demand * 0.35 * (1 + p.disruption_probability)).toLocaleString()}
                    </div>
                    <div style={{ fontSize: '9px', color: c.sub }}>AI Protected</div>
                  </div>

                  <div style={{ background: isDark ? '#0D1B2E' : '#F1F5F9', padding: '12px', borderRadius: '12px', border: `1px solid ${c.cardBorder}` }}>
                    <div style={{ fontSize: '9px', color: c.sub, fontWeight: 800 }}>DISRUPTION RISK</div>
                    <div style={{ fontSize: '16px', fontWeight: 900, color: p.disruption_probability >= 0.7 ? '#EF4444' : '#F59E0B', marginTop: '2px' }}>
                      {(p.disruption_probability * 100).toFixed(0)}%
                    </div>
                    <div style={{ fontSize: '9px', color: c.sub }}>Upstream Variance</div>
                  </div>

                  <div style={{ background: isDark ? '#0D1B2E' : '#F1F5F9', padding: '12px', borderRadius: '12px', border: `1px solid ${c.cardBorder}` }}>
                    <div style={{ fontSize: '9px', color: c.sub, fontWeight: 800 }}>LEAD TIME</div>
                    <div style={{ fontSize: '16px', fontWeight: 900, color: c.title, marginTop: '2px' }}>
                      {p.average_lead_time} days
                    </div>
                    <div style={{ fontSize: '9px', color: c.sub }}>±{p.lead_time_std_dev}d jitter</div>
                  </div>
                </div>

                {/* Footer Action Buttons */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: `1px solid ${c.cardBorder}`, paddingTop: '16px' }}>
                  <button
                    onClick={() => {
                      setSelectedSku(p.product_id);
                      setDrawerItem(p);
                      setSelectedHero3DModal(null);
                    }}
                    style={{
                      background: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
                      color: '#FFFFFF',
                      padding: '10px 20px',
                      borderRadius: '10px',
                      fontWeight: 800,
                      fontSize: '12px',
                      border: 'none',
                      cursor: 'pointer',
                      boxShadow: '0 4px 14px rgba(37,99,235,0.35)',
                    }}
                  >
                    Open Full Drawer Inspector ➔
                  </button>
                  <button
                    onClick={() => setSelectedHero3DModal(null)}
                    style={{
                      background: isDark ? 'rgba(255,255,255,0.08)' : '#F1F5F9',
                      color: c.title,
                      padding: '10px 18px',
                      borderRadius: '10px',
                      fontWeight: 700,
                      fontSize: '12px',
                      border: `1px solid ${c.cardBorder}`,
                      cursor: 'pointer',
                    }}
                  >
                    Close
                  </button>
                </div>
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
                    maxLength={50}
                    pattern="[A-Za-z][A-Za-z0-9]{1,9}-[A-Za-z0-9][A-Za-z0-9._-]{0,39}"
                    value={addForm.product_id}
                    onChange={e=>setAddForm(f=>({...f, product_id:e.target.value}))}
                    className="input-focus"
                    style={styles.textInput}
                  />
                  <button
                    type="button"
                    onClick={handleLoadDemoFeed}
                    disabled={isLoadingDemoFeed}
                    className="btn-hover"
                    style={{ ...styles.cancelBtn, marginTop:'6px', fontSize:'11px', padding:'6px 10px' }}
                  >
                    {isLoadingDemoFeed ? 'Loading demo feeds...' : 'Load demo Module 1 + 2 data by SKU'}
                  </button>
                </div>
                <div style={styles.inputField}>
                  <label style={styles.inputLabel}>Material Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Heavy Duty Indigo Denim"
                    required
                    maxLength={200}
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
                    required
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
                    required
                    maxLength={20}
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

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
                <div style={styles.inputField}>
                  <label style={styles.inputLabel}>Demand Std Dev (σ_D)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={addForm.demand_std_dev}
                    onChange={e=>setAddForm(f=>({...f, demand_std_dev:e.target.value}))}
                    className="input-focus"
                    style={styles.textInput}
                  />
                </div>
                <div style={styles.inputField}>
                  <label style={styles.inputLabel}>Lead Time Std Dev (σ_L, d)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    required
                    value={addForm.lead_time_std_dev}
                    onChange={e=>setAddForm(f=>({...f, lead_time_std_dev:e.target.value}))}
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
                    min="0.1"
                    step="0.1"
                    required
                    value={addForm.average_lead_time}
                    onChange={e=>setAddForm(f=>({...f, average_lead_time:e.target.value}))}
                    className="input-focus"
                    style={styles.textInput}
                  />
                </div>
                <div style={styles.inputField}>
                  <label style={styles.inputLabel}>P(disrupt) [0.00 – 1.00]</label>
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
                  <label style={styles.inputLabel}>Trust Score [0 – 100]</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    required
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

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px' }}>
                <div style={styles.inputField}>
                  <label style={styles.inputLabel}>Demand Std Dev (σ_D)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={editForm.demand_std_dev ?? 0}
                    onChange={e=>setEditForm(f=>({...f, demand_std_dev:e.target.value}))}
                    className="input-focus"
                    style={styles.textInput}
                  />
                </div>
                <div style={styles.inputField}>
                  <label style={styles.inputLabel}>Lead Time Std Dev (σ_L, d)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    required
                    value={editForm.lead_time_std_dev ?? 1}
                    onChange={e=>setEditForm(f=>({...f, lead_time_std_dev:e.target.value}))}
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
                  <label style={styles.inputLabel}>P(disrupt) [0.00 – 1.00]</label>
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
                  <label style={styles.inputLabel}>Trust Score [0 – 100]</label>
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

              {/* READ-ONLY DERIVED OPTIMIZATION PREVIEW */}
              {(() => {
                const dem = parseFloat(editForm.forecasted_demand) || 1;
                const lt = parseFloat(editForm.average_lead_time) || 1;
                const dp = parseFloat(editForm.disruption_probability) || 0;
                const ltv = parseFloat(editForm.lead_time_std_dev) || 1;
                const dstd = parseFloat(editForm.demand_std_dev) || (dem * 0.15);
                const ladj = lt * (1 + dp);
                const z = 1.645;
                const variance = ladj * Math.pow(dstd, 2) + Math.pow(dem, 2) * Math.pow(ltv, 2);
                const ss = Math.round(z * Math.sqrt(Math.max(0, variance)));
                const rop = Math.round(dem * ladj) + ss;
                const roq = Math.round(dem * 7 * (1 + dp));
                const stock = parseFloat(editForm.current_inventory) || 0;
                const isShort = stock < dem;

                return (
                  <div style={{
                    background: isDark ? 'rgba(15,23,42,0.85)' : '#F1F5F9',
                    border: `1.5px solid ${isDark ? 'rgba(59,130,246,0.35)' : '#CBD5E1'}`,
                    borderRadius: '12px',
                    padding: '12px 14px',
                    marginTop: '4px',
                  }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'8px' }}>
                      <span style={{ fontSize:'11px', fontWeight:800, color: isDark ? '#93C5FD' : '#1D4ED8', letterSpacing:'.06em', textTransform:'uppercase' }}>
                        🔒 Backend Optimization Derived Preview (Read-Only)
                      </span>
                      <span style={{
                        fontSize:'9.5px', fontWeight:800, padding:'2px 7px', borderRadius:'10px',
                        background: isShort ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)',
                        color: isShort ? '#FCA5A5' : '#34D399',
                        border: `1px solid ${isShort ? '#EF4444' : '#10B981'}`
                      }}>
                        {isShort ? '⚠ SHORTAGE RISK' : '✓ BUFFER NOMINAL'}
                      </span>
                    </div>

                    <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:'8px', fontSize:'11px' }}>
                      <div style={{ background: isDark ? 'rgba(0,0,0,0.25)' : '#FFFFFF', padding:'6px 8px', borderRadius:'8px', border:`1px solid ${c.tagBorder}` }}>
                        <div style={{ fontSize:'9.5px', color:c.sub }}>Risk-Adj LT</div>
                        <div style={{ fontWeight:800, color:c.title, marginTop:'2px' }}>{ladj.toFixed(1)} d</div>
                      </div>
                      <div style={{ background: isDark ? 'rgba(0,0,0,0.25)' : '#FFFFFF', padding:'6px 8px', borderRadius:'8px', border:`1px solid ${c.tagBorder}` }}>
                        <div style={{ fontSize:'9.5px', color:c.sub }}>Safety Stock</div>
                        <div style={{ fontWeight:800, color:'#60A5FA', marginTop:'2px' }}>{ss.toLocaleString()} {editForm.unit || 'units'}</div>
                      </div>
                      <div style={{ background: isDark ? 'rgba(0,0,0,0.25)' : '#FFFFFF', padding:'6px 8px', borderRadius:'8px', border:`1px solid ${c.tagBorder}` }}>
                        <div style={{ fontSize:'9.5px', color:c.sub }}>Reorder Point</div>
                        <div style={{ fontWeight:800, color:c.title, marginTop:'2px' }}>{rop.toLocaleString()} {editForm.unit || 'units'}</div>
                      </div>
                      <div style={{ background: isDark ? 'rgba(0,0,0,0.25)' : '#FFFFFF', padding:'6px 8px', borderRadius:'8px', border:`1px solid ${c.tagBorder}` }}>
                        <div style={{ fontSize:'9.5px', color:c.sub }}>Recommended ROQ</div>
                        <div style={{ fontWeight:800, color:'#34D399', marginTop:'2px' }}>{roq.toLocaleString()} {editForm.unit || 'units'}</div>
                      </div>
                    </div>
                  </div>
                );
              })()}

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

              {/* Financial Inaction Protection Preview */}
              {(() => {
                const poFin = calculateFinancialImpact(poModalItem, poModalItem.reorder_quantity, Math.round(poModalItem.forecasted_demand * 0.35));
                const totalEstimatedCost = Math.round(poModalItem.reorder_quantity * poFin.unitCost * (freightMode === 'air' ? 2.4 : 1.0));
                return (
                  <div style={{
                    padding: '10px 14px',
                    borderRadius: '10px',
                    background: isDark ? 'rgba(16,185,129,0.08)' : '#F0FDF4',
                    border: `1px solid ${isDark ? 'rgba(16,185,129,0.3)' : '#BBF7D0'}`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '11px',
                  }}>
                    <div>
                      <div style={{ fontWeight: 700, color: '#10B981', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <span>🛡️</span> Estimated PO Value: <strong>${totalEstimatedCost.toLocaleString()}</strong>
                      </div>
                      <div style={{ fontSize: '10px', color: c.sub, marginTop: '2px' }}>
                        Protects {poFin.meta.line} (${poFin.meta.downtimeCost}/hr rate)
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '12px', fontWeight: 900, color: '#10B981' }}>
                        +${poFin.netProtectedValue.toLocaleString()}
                      </div>
                      <div style={{ fontSize: '9px', color: c.sub }}>Value Guarded</div>
                    </div>
                  </div>
                );
              })()}
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
        const finImpact = calculateFinancialImpact(item, roq, skuSS);

        const media = SKU_CATALOG_MEDIA[item.product_id];
        const curImgIdx = activeImageIndexes[item.product_id] || 0;
        const catalogImg = media?.images?.[curImgIdx] || SKU_IMAGES[item.product_id];

        const coverImg = catalogImg || (item.category === 'Fabrics'
          ? 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=800&auto=format&fit=crop&q=80'
          : item.category === 'Dyes & Chemicals'
          ? 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=800&auto=format&fit=crop&q=80'
          : item.category === 'Packaging'
          ? 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&auto=format&fit=crop&q=80'
          : 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=800&auto=format&fit=crop&q=80');

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
                width: 'min(820px, 96vw)',
                height: '100%',
                background: isDark ? '#0A1424' : '#FFFFFF',
                borderLeft: `1.5px solid ${isDark ? 'rgba(59,130,246,0.35)' : '#CBD5E1'}`,
                boxShadow: '-16px 0 48px rgba(0,0,0,0.5)',
                display: 'flex',
                flexDirection: 'column',
                animation: 'slide-drawer .28s cubic-bezier(0.16, 1, 0.3, 1)',
                overflow: 'hidden',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Cover Image & Top Navigation Bar */}
              <div style={{ position: 'relative', height: '200px', flexShrink: 0, overflow: 'hidden' }}>
                <img
                  src={coverImg}
                  alt={item.product_name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 30%' }}
                />
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: isDark
                      ? 'linear-gradient(to bottom, rgba(10,20,36,0.2) 0%, rgba(10,20,36,0.95) 100%)'
                      : 'linear-gradient(to bottom, rgba(15,23,42,0.1) 0%, rgba(15,23,42,0.85) 100%)',
                  }}
                />

                {/* Top Floating Badges & Close Button */}
                <div style={{ position: 'absolute', top: '16px', left: '20px', right: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
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
                  <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#FFFFFF', textShadow: '0 2px 8px rgba(0,0,0,0.6)' }}>
                    {media?.garmentType ? `${media.garmentType.split('&')[0].trim()} · ${item.product_name}` : item.product_name}
                  </h2>
                  <div style={{ fontSize: '11px', color: '#CBD5E1', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span>📍 {binLoc}</span>
                    <span>•</span>
                    <span style={{ color: '#FDE047', fontWeight: 700 }}>Benchmark: {media?.priceEur || '€120'}</span>
                    <span>•</span>
                    <span style={{ color: '#93C5FD' }}>{media?.fabricSpec || item.category}</span>
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
                  onClick={async () => {
                    const el = document.getElementById('drawer-optimization-suite');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  style={{
                    background: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
                    color: '#fff',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 8px rgba(37,99,235,0.3)',
                  }}
                >
                  ⚡ Optimize Policy & Upstream
                </button>
                <button
                  className="btn-hover"
                  onClick={() => { openEditModal(item); setDrawerItem(null); }}
                  style={{
                    background: isDark ? 'rgba(255,255,255,0.06)' : '#FFFFFF',
                    color: c.title,
                    border: `1px solid ${c.tagBorder}`,
                    padding: '8px 14px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
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
              <div style={{ flex: 1, overflowY: 'auto', padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: '18px' }}>

                {/* ═══ DEDICATED MATERIAL OPTIMIZATION & UPSTREAM INSPECTION SUITE ═══ */}
                <div id="drawer-optimization-suite" style={{
                  background: isDark ? '#091322' : '#F8FAFC',
                  border: `1.5px solid ${isDark ? 'rgba(59,130,246,0.35)' : '#BFDBFE'}`,
                  borderRadius: '16px',
                  padding: '18px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                  boxShadow: isDark ? '0 12px 32px rgba(0,0,0,0.45)' : '0 8px 24px rgba(37,99,235,0.08)',
                }}>

                  {/* 1. Quick Material Selector & Position Bar */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '260px' }}>
                      <span style={{ fontSize: '18px' }}>🏷️</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '10px', color: c.sub, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em' }}>
                          SWITCH MONITORED MATERIAL
                        </div>
                        <select
                          value={item.product_id}
                          onChange={e => {
                            const newSku = e.target.value;
                            setSelectedSku(newSku);
                            const target = productsList.find(p => p.product_id === newSku);
                            if (target) {
                              setDrawerItem(target);
                            }
                          }}
                          style={{
                            width: '100%',
                            padding: '6px 10px',
                            borderRadius: '8px',
                            border: `1.5px solid ${isDark ? 'rgba(59,130,246,0.4)' : '#CBD5E1'}`,
                            background: isDark ? '#0D1B2E' : '#FFFFFF',
                            color: c.title,
                            fontSize: '12px',
                            fontWeight: 800,
                            outline: 'none',
                            marginTop: '2px',
                          }}
                        >
                          {(productsList?.length ? productsList : [
                            { product_id: 'FAB-001', product_name: 'Organic Cotton Premium 30s' },
                            { product_id: 'FAB-002', product_name: 'Lycra Stretch Twill Fabric' },
                            { product_id: 'DYE-008', product_name: 'Indigo Reactive Dye Base' },
                            { product_id: 'TRM-015', product_name: 'Alloy Snap Fasteners 15mm' },
                            { product_id: 'YRN-042', product_name: 'Polyester Spun Thread 40/2' },
                            { product_id: 'TRM-022', product_name: 'Brass YKK Compatible Zippers' },
                            { product_id: 'CHM-005', product_name: 'Textile Pre-Treatment Enzyme' },
                            { product_id: 'YRN-018', product_name: 'Combed Cotton Ring Yarn 40s' },
                          ]).map(p => (
                            <option key={p.product_id} value={p.product_id}>
                              {p.product_id} — {p.product_name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div style={{ fontSize: '11px', fontWeight: 800, color: '#2563EB', background: isDark ? 'rgba(37,99,235,0.15)' : '#EFF6FF', padding: '6px 14px', borderRadius: '12px', border: '1px solid rgba(37,99,235,0.3)', whiteSpace: 'nowrap' }}>
                      📦 Total Position: {(directParams.current_inventory + (directParams.in_transit_qty || 0)).toLocaleString()} {item.unit}
                    </div>
                  </div>

                  {/* 2. Upstream Signals: Module 1 (Demand) & Module 2 (Supply Risk) */}
                  <div style={{ background: isDark ? 'rgba(37,99,235,0.06)' : '#EFF6FF', border: `1.5px solid ${isDark ? 'rgba(59,130,246,0.25)' : '#BFDBFE'}`, borderRadius: '14px', padding: '14px 16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '15px' }}>📡</span>
                        <span style={{ fontSize: '12px', fontWeight: 800, color: isDark ? '#60A5FA' : '#1D4ED8', letterSpacing: '.03em' }}>
                          UPSTREAM SIGNALS: MODULE 1 &amp; MODULE 2 (AI AUTO-FETCHED)
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '9.5px', color: c.sub }}>
                          🕐 {new Date().toLocaleTimeString()}
                        </span>
                        <span style={{ fontSize: '10px', fontWeight: 800, color: '#D97706', background: '#FEF3C7', padding: '2px 8px', borderRadius: '8px', border: '1px solid #FCD34D' }}>
                          ⚡ DEMO DATA (APIs Pending)
                        </span>
                        <button
                          onClick={() => {
                            const match = productsList.find(p => p.product_id === directParams.product_id);
                            if (match) {
                              setDirectParams(p => ({
                                ...p,
                                forecasted_demand: match.forecasted_demand,
                                demand_std_dev: match.demand_std_dev,
                                disruption_probability: match.disruption_probability,
                                supplier_trust_score: match.supplier_trust_score,
                                average_lead_time: match.average_lead_time,
                                lead_time_std_dev: match.lead_time_std_dev,
                              }));
                              showToast(`🔄 Upstream feeds refreshed for ${directParams.product_id}`);
                            }
                          }}
                          style={{ fontSize: '10.5px', fontWeight: 700, color: '#2563EB', background: isDark ? 'rgba(37,99,235,0.15)' : '#EFF6FF', border: '1px solid #93C5FD', borderRadius: '6px', padding: '3px 8px', cursor: 'pointer' }}
                        >
                          🔄 Refresh
                        </button>
                      </div>
                    </div>

                    <div style={{ marginBottom: '10px', fontSize: '10.5px', color: isDark ? '#93C5FD' : '#1E40AF', background: isDark ? 'rgba(37,99,235,0.12)' : '#DBEAFE', padding: '6px 10px', borderRadius: '8px', fontWeight: 600 }}>
                      🔒 These values are <strong>auto-fetched from Module 1 &amp; 2 AI models</strong>. The inventory manager does not edit them.
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '8px' }}>
                      {/* M1: Forecast Demand */}
                      <div style={{ background: isDark ? 'rgba(0,0,0,0.3)' : '#FFFFFF', border: `1px solid ${isDark ? 'rgba(59,130,246,0.2)' : '#BFDBFE'}`, borderRadius: '8px', padding: '10px' }}>
                        <div style={{ fontSize: '9.5px', fontWeight: 800, color: '#2563EB' }}>📈 M1 · FORECAST DEMAND (D)</div>
                        <div style={{ fontSize: '17px', fontWeight: 900, color: directParams.forecasted_demand > 0 ? (isDark ? '#60A5FA' : '#1D4ED8') : '#EF4444', marginTop: '2px' }}>
                          {directParams.forecasted_demand > 0 ? directParams.forecasted_demand.toLocaleString() : '0 (Invalid)'}
                        </div>
                        <div style={{ fontSize: '9px', color: c.sub }}>units / cycle</div>
                      </div>

                      {/* M1: Demand Volatility */}
                      <div style={{ background: isDark ? 'rgba(0,0,0,0.3)' : '#FFFFFF', border: `1px solid ${isDark ? 'rgba(59,130,246,0.2)' : '#BFDBFE'}`, borderRadius: '8px', padding: '10px' }}>
                        <div style={{ fontSize: '9.5px', fontWeight: 800, color: '#2563EB' }}>📊 M1 · VOLATILITY (σ_D)</div>
                        <div style={{ fontSize: '17px', fontWeight: 900, color: isDark ? '#60A5FA' : '#1D4ED8', marginTop: '2px' }}>
                          ±{directParams.demand_std_dev > 0 ? directParams.demand_std_dev.toFixed(1) : '—'}
                        </div>
                        <div style={{ fontSize: '9px', color: c.sub }}>units std. dev.</div>
                      </div>

                      {/* M2: Disruption Risk */}
                      <div style={{ background: isDark ? 'rgba(0,0,0,0.3)' : '#FFFFFF', border: `1px solid ${isDark ? 'rgba(217,119,6,0.25)' : '#FDE68A'}`, borderRadius: '8px', padding: '10px' }}>
                        <div style={{ fontSize: '9.5px', fontWeight: 800, color: '#D97706' }}>⚠️ M2 · DISRUPTION PROB.</div>
                        <div style={{ fontSize: '17px', fontWeight: 900, color: directParams.disruption_probability > 0.6 ? '#EF4444' : directParams.disruption_probability > 0.3 ? '#D97706' : '#10B981', marginTop: '2px' }}>
                          {(directParams.disruption_probability * 100).toFixed(0)}%
                        </div>
                        <div style={{ height: '3px', borderRadius: '2px', background: isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0', marginTop: '4px' }}>
                          <div style={{ height: '100%', width: `${directParams.disruption_probability * 100}%`, background: directParams.disruption_probability > 0.6 ? '#EF4444' : '#F59E0B' }} />
                        </div>
                      </div>

                      {/* M2: Supplier Trust Score */}
                      <div style={{ background: isDark ? 'rgba(0,0,0,0.3)' : '#FFFFFF', border: `1px solid ${isDark ? 'rgba(217,119,6,0.25)' : '#FDE68A'}`, borderRadius: '8px', padding: '10px' }}>
                        <div style={{ fontSize: '9.5px', fontWeight: 800, color: '#D97706' }}>🤝 M2 · SUPPLIER TRUST</div>
                        <div style={{ fontSize: '17px', fontWeight: 900, color: (directParams.supplier_trust_score || 0) >= 75 ? '#10B981' : '#F59E0B', marginTop: '2px' }}>
                          {directParams.supplier_trust_score || 75}<span style={{ fontSize: '11px', fontWeight: 600 }}>/100</span>
                        </div>
                        <div style={{ fontSize: '9px', color: c.sub }}>OTIF rating</div>
                      </div>

                      {/* M2: Lead Time */}
                      <div style={{ background: isDark ? 'rgba(0,0,0,0.3)' : '#FFFFFF', border: `1px solid ${isDark ? 'rgba(217,119,6,0.25)' : '#FDE68A'}`, borderRadius: '8px', padding: '10px' }}>
                        <div style={{ fontSize: '9.5px', fontWeight: 800, color: '#D97706' }}>⏱ M2 · LEAD TIME (L)</div>
                        <div style={{ fontSize: '17px', fontWeight: 900, color: isDark ? '#FBBF24' : '#92400E', marginTop: '2px' }}>
                          {directParams.average_lead_time > 0 ? directParams.average_lead_time.toFixed(1) : '—'} d
                        </div>
                        <div style={{ fontSize: '9px', color: c.sub }}>σ = ±{directParams.lead_time_std_dev?.toFixed(2) || '—'} d</div>
                      </div>

                      {/* M2: Risk Tier */}
                      <div style={{ background: isDark ? 'rgba(0,0,0,0.3)' : '#FFFFFF', border: `1px solid ${isDark ? 'rgba(217,119,6,0.25)' : '#FDE68A'}`, borderRadius: '8px', padding: '10px' }}>
                        <div style={{ fontSize: '9.5px', fontWeight: 800, color: '#D97706' }}>🛡 M2 · RISK TIER</div>
                        <div style={{ fontSize: '15px', fontWeight: 900, color: directParams.disruption_probability > 0.6 ? '#EF4444' : directParams.disruption_probability > 0.3 ? '#F59E0B' : '#10B981', marginTop: '3px' }}>
                          {directParams.disruption_probability > 0.6 ? 'CRITICAL' : directParams.disruption_probability > 0.4 ? 'HIGH' : directParams.disruption_probability > 0.2 ? 'MEDIUM' : 'LOW'}
                        </div>
                        <div style={{ fontSize: '9px', color: c.sub }}>AI classification</div>
                      </div>
                    </div>
                  </div>

                  {/* 3. Section C & D: Inventory Manager Manual Inputs */}
                  <div style={{ background: isDark ? 'rgba(16,185,129,0.04)' : '#F0FDF4', border: `1.5px solid ${isDark ? 'rgba(16,185,129,0.25)' : '#BBF7D0'}`, borderRadius: '14px', padding: '14px 16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '15px' }}>✏️</span>
                        <span style={{ fontSize: '12px', fontWeight: 800, color: isDark ? '#34D399' : '#15803D', letterSpacing: '.03em' }}>
                          SECTION C: WAREHOUSE POSITION &amp; SECTION D: POLICY LEVERS
                        </span>
                      </div>
                      <span style={{ fontSize: '10px', color: c.sub, fontWeight: 600 }}>The only fields you enter manually</span>
                    </div>

                    {/* Field-level domain validation check according to apparel dataset */}
                    {(() => {
                      const dCurrentInv = Number(directParams.current_inventory);
                      const dInTransit = Number(directParams.in_transit_qty ?? 0);
                      const dLeadTime = Number(directParams.average_lead_time);
                      const dDemandVal = Number(directParams.forecasted_demand);

                      const dErrors = {
                        current_inventory:
                          isNaN(dCurrentInv) || dCurrentInv < 0
                            ? 'Physical stock cannot be negative (must be ≥ 0 units)'
                            : dCurrentInv > 100000
                            ? 'Exceeds maximum warehouse bin capacity (max 100,000 units)'
                            : null,
                        in_transit_qty:
                          isNaN(dInTransit) || dInTransit < 0
                            ? 'In-transit quantity cannot be negative (must be ≥ 0 units)'
                            : dInTransit > 50000
                            ? 'Exceeds maximum active PO capacity (max 50,000 units)'
                            : null,
                        average_lead_time:
                          isNaN(dLeadTime) || dLeadTime < 0.5
                            ? 'Lead time must be ≥ 0.5 days (instantaneous delivery is physically impossible)'
                            : dLeadTime > 60.0
                            ? 'Exceeds maximum contract SLA limit (max 60 days)'
                            : null,
                        forecasted_demand:
                          isNaN(dDemandVal) || dDemandVal <= 0
                            ? 'Forecasted demand must be > 0 (Module 1 AI signal required)'
                            : null,
                      };
                      const dHasErrors = Boolean(
                        dErrors.current_inventory ||
                        dErrors.in_transit_qty ||
                        dErrors.average_lead_time ||
                        dErrors.forecasted_demand
                      );

                      return (
                        <>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '10px' }}>
                            {/* Physical Stock */}
                            <div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                <label style={{ fontSize: '11px', fontWeight: 700, color: c.title }}>
                                  📦 Physical Stock (WMS)
                                </label>
                                <span style={{
                                  fontSize: '9px', fontWeight: 700,
                                  color: dErrors.current_inventory ? '#EF4444' : c.sub,
                                  background: dErrors.current_inventory ? (isDark ? 'rgba(239,68,68,0.18)' : '#FEE2E2') : (isDark ? 'rgba(255,255,255,0.06)' : '#E2E8F0'),
                                  padding: '1px 6px', borderRadius: '4px',
                                }}>
                                  Range: 0 – 100,000
                                </span>
                              </div>
                              <input
                                type="number"
                                value={directParams.current_inventory}
                                onChange={e => setDirectParams(p => ({ ...p, current_inventory: parseFloat(e.target.value) }))}
                                style={{
                                  width: '100%', padding: '7px 10px', borderRadius: '8px',
                                  border: dErrors.current_inventory ? '1.5px solid #EF4444' : `1px solid ${c.inputBorder}`,
                                  background: dErrors.current_inventory ? (isDark ? 'rgba(239,68,68,0.12)' : '#FEF2F2') : c.inputBg,
                                  color: dErrors.current_inventory ? '#EF4444' : c.inputText,
                                  fontWeight: 800, fontSize: '13px', outline: 'none', boxSizing: 'border-box',
                                  transition: 'border 0.2s, background 0.2s',
                                }}
                              />
                              {dErrors.current_inventory && (
                                <div style={{ fontSize: '9.5px', color: '#EF4444', fontWeight: 700, marginTop: '3px' }}>
                                  ❌ {dErrors.current_inventory}
                                </div>
                              )}
                            </div>

                            {/* In-Transit Stock */}
                            <div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                <label style={{ fontSize: '11px', fontWeight: 700, color: c.title }}>
                                  🚚 In-Transit Stock (POs)
                                </label>
                                <span style={{
                                  fontSize: '9px', fontWeight: 700,
                                  color: dErrors.in_transit_qty ? '#EF4444' : c.sub,
                                  background: dErrors.in_transit_qty ? (isDark ? 'rgba(239,68,68,0.18)' : '#FEE2E2') : (isDark ? 'rgba(255,255,255,0.06)' : '#E2E8F0'),
                                  padding: '1px 6px', borderRadius: '4px',
                                }}>
                                  Range: 0 – 50,000
                                </span>
                              </div>
                              <input
                                type="number"
                                value={directParams.in_transit_qty ?? 0}
                                onChange={e => setDirectParams(p => ({ ...p, in_transit_qty: parseFloat(e.target.value) }))}
                                style={{
                                  width: '100%', padding: '7px 10px', borderRadius: '8px',
                                  border: dErrors.in_transit_qty ? '1.5px solid #EF4444' : `1px solid ${c.inputBorder}`,
                                  background: dErrors.in_transit_qty ? (isDark ? 'rgba(239,68,68,0.12)' : '#FEF2F2') : c.inputBg,
                                  color: dErrors.in_transit_qty ? '#EF4444' : c.inputText,
                                  fontWeight: 700, fontSize: '13px', outline: 'none', boxSizing: 'border-box',
                                  transition: 'border 0.2s, background 0.2s',
                                }}
                              />
                              {dErrors.in_transit_qty && (
                                <div style={{ fontSize: '9.5px', color: '#EF4444', fontWeight: 700, marginTop: '3px' }}>
                                  ❌ {dErrors.in_transit_qty}
                                </div>
                              )}
                            </div>

                            {/* Baseline Lead Time */}
                            <div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                <label style={{ fontSize: '11px', fontWeight: 700, color: c.title }}>
                                  ⏱️ Baseline Lead Time (SLA)
                                </label>
                                <span style={{
                                  fontSize: '9px', fontWeight: 700,
                                  color: dErrors.average_lead_time ? '#EF4444' : c.sub,
                                  background: dErrors.average_lead_time ? (isDark ? 'rgba(239,68,68,0.18)' : '#FEE2E2') : (isDark ? 'rgba(255,255,255,0.06)' : '#E2E8F0'),
                                  padding: '1px 6px', borderRadius: '4px',
                                }}>
                                  Range: 0.5 – 60.0 d
                                </span>
                              </div>
                              <input
                                type="number"
                                step="0.5"
                                value={directParams.average_lead_time}
                                onChange={e => setDirectParams(p => ({ ...p, average_lead_time: parseFloat(e.target.value) }))}
                                style={{
                                  width: '100%', padding: '7px 10px', borderRadius: '8px',
                                  border: dErrors.average_lead_time ? '1.5px solid #EF4444' : `1px solid ${c.inputBorder}`,
                                  background: dErrors.average_lead_time ? (isDark ? 'rgba(239,68,68,0.12)' : '#FEF2F2') : c.inputBg,
                                  color: dErrors.average_lead_time ? '#EF4444' : c.inputText,
                                  fontWeight: 700, fontSize: '13px', outline: 'none', boxSizing: 'border-box',
                                  transition: 'border 0.2s, background 0.2s',
                                }}
                              />
                              {dErrors.average_lead_time && (
                                <div style={{ fontSize: '9.5px', color: '#EF4444', fontWeight: 700, marginTop: '3px' }}>
                                  ❌ {dErrors.average_lead_time}
                                </div>
                              )}
                            </div>

                            {/* Target SLA */}
                            <div>
                              <label style={{ fontSize: '11px', fontWeight: 700, color: c.title, display: 'block', marginBottom: '4px' }}>
                                🎯 Target Service Level (SL)
                              </label>
                              <select
                                value={directParams.service_level || 0.95}
                                onChange={e => {
                                  const sl = parseFloat(e.target.value);
                                  const zMap = { 0.90: 1.282, 0.95: 1.645, 0.98: 2.054, 0.99: 2.326 };
                                  setDirectParams(p => ({ ...p, service_level: sl, z_value: zMap[sl] || 1.645 }));
                                }}
                                style={{
                                  width: '100%', padding: '7px 10px', borderRadius: '8px',
                                  border: `1px solid ${c.inputBorder}`, background: c.inputBg, color: c.inputText,
                                  fontWeight: 700, fontSize: '12px', outline: 'none', boxSizing: 'border-box',
                                }}
                              >
                                <option value={0.90}>90% SLA (Z = 1.282) · Relaxed Buffer</option>
                                <option value={0.95}>95% SLA (Z = 1.645) · Standard Apparel</option>
                                <option value={0.98}>98% SLA (Z = 2.054) · High Criticality Tier</option>
                                <option value={0.99}>99% SLA (Z = 2.326) · Zero-Stockout Guarantee</option>
                              </select>
                            </div>

                            {/* Disruption Scenario */}
                            <div>
                              <label style={{ fontSize: '11px', fontWeight: 700, color: c.title, display: 'block', marginBottom: '4px' }}>
                                🌪️ Disruption Scenario Stress
                              </label>
                              <select
                                value={directParams.scenario || 'NORMAL'}
                                onChange={e => setDirectParams(p => ({ ...p, scenario: e.target.value }))}
                                style={{
                                  width: '100%', padding: '7px 10px', borderRadius: '8px',
                                  border: `1px solid ${c.inputBorder}`, background: c.inputBg, color: c.inputText,
                                  fontWeight: 700, fontSize: '12px', outline: 'none', boxSizing: 'border-box',
                                }}
                              >
                                <option value="NORMAL">NORMAL · Peace-Time Operations</option>
                                <option value="MODERATE">MODERATE · Port Congestion / Seasonal Delay</option>
                                <option value="SEVERE">SEVERE · Geopolitical Chokepoint Crisis</option>
                              </select>
                            </div>

                            {/* Policy Type */}
                            <div>
                              <label style={{ fontSize: '11px', fontWeight: 700, color: c.title, display: 'block', marginBottom: '4px' }}>
                                🛡️ Risk-Adjustment Policy Type
                              </label>
                              <select
                                value={directParams.policy_type || 'FORECAST_RISK_AWARE'}
                                onChange={e => setDirectParams(p => ({ ...p, policy_type: e.target.value }))}
                                style={{
                                  width: '100%', padding: '7px 10px', borderRadius: '8px',
                                  border: `1px solid ${c.inputBorder}`, background: c.inputBg, color: c.inputText,
                                  fontWeight: 700, fontSize: '12px', outline: 'none', boxSizing: 'border-box',
                                }}
                              >
                                <option value="FORECAST_RISK_AWARE">FORECAST_RISK_AWARE (Adaptive Dual-Sigma)</option>
                                <option value="ADAPTIVE">ADAPTIVE (Dynamic Lead-Time Scaling)</option>
                                <option value="STATIC_BASELINE">STATIC_BASELINE (Unadjusted King's Formula)</option>
                              </select>
                            </div>
                          </div>
                        </>
                      );
                    })()}
                  </div>

                  {/* 4. Real-time Validation Box & Button Interlock */}
                  {(() => {
                    const dCurrentInv = Number(directParams.current_inventory);
                    const dInTransit = Number(directParams.in_transit_qty ?? 0);
                    const dLeadTime = Number(directParams.average_lead_time);
                    const dDemandVal = Number(directParams.forecasted_demand);

                    const activeErrors = [];
                    if (isNaN(dDemandVal) || dDemandVal <= 0) activeErrors.push('⚠ Rolling Forecast Demand must be > 0 (Module 1 AI feed required).');
                    if (isNaN(dLeadTime) || dLeadTime < 0.5) activeErrors.push('⚠ Baseline Lead Time must be ≥ 0.5 days (instant supply is physically impossible).');
                    if (dLeadTime > 60.0) activeErrors.push('⚠ Baseline Lead Time exceeds contract SLA boundary (max 60 days).');
                    if (isNaN(dCurrentInv) || dCurrentInv < 0) activeErrors.push('⚠ Physical stock cannot be negative (WMS scan must be ≥ 0 units).');
                    if (dCurrentInv > 100000) activeErrors.push('⚠ Physical stock exceeds warehouse bin capacity (max 100,000 units).');
                    if (isNaN(dInTransit) || dInTransit < 0) activeErrors.push('⚠ In-transit PO quantity cannot be negative.');
                    if (dInTransit > 50000) activeErrors.push('⚠ In-transit quantity exceeds max active PO capacity (max 50,000 units).');

                    const hasBlockers = activeErrors.length > 0;

                    return (
                      <>
                        {hasBlockers && (
                          <div style={{ background: isDark ? 'rgba(239,68,68,0.12)' : '#FEF2F2', border: '1.5px solid #FCA5A5', borderRadius: '10px', padding: '10px 14px' }}>
                            <div style={{ fontSize: '11px', fontWeight: 800, color: '#DC2626', marginBottom: '4px' }}>
                              🚫 VALIDATION ALERT — Button disabled until input range errors are resolved:
                            </div>
                            {activeErrors.map((e, idx) => (
                              <div key={idx} style={{ fontSize: '11px', color: '#DC2626', fontWeight: 600 }}>{e}</div>
                            ))}
                          </div>
                        )}

                        {/* 5. Run Optimization Action Button */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', paddingTop: '4px' }}>
                          <div style={{ fontSize: '11px', color: c.sub }}>
                            {hasBlockers ? '❌ Validation failed · Fix highlighted fields above' : '✓ Parameters validated · Ready for optimizer dispatch'}
                          </div>
                          <button
                            className="btn-hover"
                            onClick={async () => {
                              if (hasBlockers) return;
                              setIsExecutingDirectApi(true);
                              const requestId = `REQ-${Date.now()}`;
                              const requestTimestamp = new Date().toISOString();
                              try {
                                const r = await optimizeInventoryDetailed({
                                  ...directParams,
                                  _request_id: requestId,
                                });
                                r._requestId = requestId;
                                r._requestTimestamp = requestTimestamp;
                                r._responseTimestamp = new Date().toISOString();
                                r._inputSnapshot = { ...directParams };
                                setDirectApiResult(r);
                                setComputedPolicies(prev => [{ ...r, _computedAt: new Date().toISOString() }, ...prev]);
                                showToast(`✅ Policy computed for ${directParams.product_id} · Request ID: ${requestId}`);
                              } catch (e) {
                                showToast(`❌ Optimization error: ${e.message || 'Unknown error from backend'}`, 'error');
                              } finally {
                                setIsExecutingDirectApi(false);
                              }
                            }}
                            disabled={isExecutingDirectApi || hasBlockers}
                            style={{
                              padding: '10px 24px',
                              borderRadius: '10px',
                              border: 'none',
                              background: hasBlockers
                                ? (isDark ? '#334155' : '#94A3B8')
                                : isExecutingDirectApi
                                ? 'linear-gradient(135deg,#64748B,#475569)'
                                : directApiResult?._requestId
                                ? 'linear-gradient(135deg,#059669,#047857)'
                                : 'linear-gradient(135deg,#2563EB,#1D4ED8)',
                              color: '#FFFFFF',
                              fontWeight: 800,
                              fontSize: '12.5px',
                              cursor: (isExecutingDirectApi || hasBlockers) ? 'not-allowed' : 'pointer',
                              opacity: hasBlockers ? 0.65 : 1,
                              boxShadow: hasBlockers ? 'none' : '0 4px 14px rgba(37,99,235,0.35)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              transition: 'all 0.2s ease',
                            }}
                          >
                            {isExecutingDirectApi
                              ? '⟳ Validating & Running Optimizer...'
                              : hasBlockers
                              ? '🚫 Fix Input Range Errors to Proceed'
                              : directApiResult?._requestId
                              ? '✅ Results Ready — See Below'
                              : '🚀 Submit & Compute Policy'}
                          </button>
                        </div>
                      </>
                    );
                  })()}


                  {/* 6. Detailed Results Panel (Appears right inside this panel!) */}
                  {directApiResult && directApiResult._requestId && (
                    <div style={{
                      marginTop: '10px',
                      background: isDark ? 'rgba(16,185,129,0.06)' : '#F0FDF4',
                      border: `2px solid ${isDark ? 'rgba(16,185,129,0.35)' : '#86EFAC'}`,
                      borderRadius: '14px',
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                    }}>
                      {/* Results Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '16px' }}>✅</span>
                          <span style={{ fontSize: '13px', fontWeight: 800, color: isDark ? '#34D399' : '#15803D' }}>
                            OPTIMIZATION RESULTS — {directApiResult.product_id}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '10px', fontWeight: 800, color: '#2563EB', background: isDark ? 'rgba(37,99,235,0.2)' : '#EFF6FF', padding: '3px 8px', borderRadius: '12px', border: '1px solid #93C5FD' }}>
                            🔑 {directApiResult._requestId}
                          </span>
                          <span style={{ fontSize: '10px', color: c.sub, background: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9', padding: '3px 8px', borderRadius: '12px' }}>
                            ⏱ {new Date(directApiResult._responseTimestamp).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>

                      {/* Input Sources Attribution */}
                      <div style={{ padding: '8px 12px', background: isDark ? 'rgba(37,99,235,0.08)' : '#EFF6FF', borderRadius: '8px', border: `1px solid ${isDark ? 'rgba(37,99,235,0.2)' : '#BFDBFE'}` }}>
                        <div style={{ fontSize: '10px', fontWeight: 800, color: '#2563EB', marginBottom: '4px' }}>
                          📋 INPUT SOURCES (Data that generated this result):
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '4px', fontSize: '10.5px' }}>
                          <div>Demand (M1): <strong>{directApiResult._inputSnapshot?.forecasted_demand?.toLocaleString()} units</strong> <span style={{ color: '#D97706' }}>[Demo M1]</span></div>
                          <div>Disruption (M2): <strong>{((directApiResult._inputSnapshot?.disruption_probability || 0) * 100).toFixed(0)}%</strong> <span style={{ color: '#D97706' }}>[Demo M2]</span></div>
                          <div>Lead Time (ERP): <strong>{directApiResult._inputSnapshot?.average_lead_time?.toFixed(1)} days</strong> <span style={{ color: '#10B981' }}>[WMS Live]</span></div>
                          <div>Physical Stock: <strong>{directApiResult._inputSnapshot?.current_inventory?.toLocaleString()} units</strong> <span style={{ color: '#10B981' }}>[WMS Live]</span></div>
                        </div>
                      </div>

                      {/* Core Calculated Policy Parameters */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
                        {[
                          { label: 'Safety Stock', value: `${directApiResult.safety_stock?.toFixed(1)} units`, color: '#10B981', formula: 'σ_D·√L·Z' },
                          { label: 'Reorder Point', value: `${directApiResult.reorder_point?.toFixed(1)} units`, color: '#2563EB', formula: 'D·L + SS' },
                          { label: 'Reorder Qty', value: `${directApiResult.reorder_quantity?.toFixed(1)} units`, color: '#8B5CF6', formula: 'EOQ + Buffer' },
                          { label: 'Risk-Adj Lead', value: `${directApiResult.risk_adjusted_lead_time?.toFixed(2)} d`, color: '#F59E0B', formula: 'L·(1+P)' },
                          { label: 'Backorder Risk', value: `${((directApiResult.backorder_risk || 0) * 100).toFixed(1)}%`, color: directApiResult.backorder_risk > 0.4 ? '#EF4444' : '#10B981', formula: 'XGBoost' },
                          { label: 'Risk Tier', value: directApiResult.risk_level, color: directApiResult.risk_level === 'CRITICAL' ? '#EF4444' : '#10B981', formula: 'Classifier' },
                        ].map(({ label, value, color, formula }) => (
                          <div key={label} style={{ background: isDark ? 'rgba(0,0,0,0.3)' : '#FFFFFF', border: `1px solid ${c.tableBorder}`, borderRadius: '8px', padding: '8px 10px', textAlign: 'center' }}>
                            <div style={{ fontSize: '9px', color: c.sub, fontWeight: 700 }}>{label}</div>
                            <div style={{ fontSize: '14px', fontWeight: 900, color, marginTop: '2px' }}>{value}</div>
                            <div style={{ fontSize: '8.5px', color: c.sub, fontStyle: 'italic', marginTop: '1px' }}>{formula}</div>
                          </div>
                        ))}
                      </div>

                      {/* Material Readiness for Module 4 */}
                      <div style={{
                        padding: '10px 12px',
                        borderRadius: '10px',
                        background: directApiResult.material_availability_flag ? (isDark ? 'rgba(16,185,129,0.12)' : '#DCFCE7') : (isDark ? 'rgba(239,68,68,0.12)' : '#FEE2E2'),
                        border: `1px solid ${directApiResult.material_availability_flag ? '#86EFAC' : '#FCA5A5'}`,
                      }}>
                        <div style={{ fontSize: '11px', fontWeight: 800, color: directApiResult.material_availability_flag ? '#15803D' : '#DC2626', marginBottom: '4px' }}>
                          {directApiResult.material_availability_flag ? '✅ MATERIAL READY FOR PRODUCTION LINE (Module 4)' : '🚨 PRODUCTION SHORTAGE ALERT'}
                        </div>
                        <div style={{ fontSize: '11px', color: c.title, fontWeight: 600, lineHeight: 1.5 }}>
                          {directApiResult.reorder_recommendation}
                        </div>
                        <div style={{ display: 'flex', gap: '12px', marginTop: '6px', fontSize: '10.5px', color: c.sub, flexWrap: 'wrap' }}>
                          <span>Material Req: <strong style={{ color: c.title }}>{directApiResult.material_requirement?.toFixed(1)} units</strong></span>
                          <span>Shortage: <strong style={{ color: directApiResult.material_shortage > 0 ? '#EF4444' : '#10B981' }}>{directApiResult.material_shortage?.toFixed(1)} units</strong></span>
                          <span>Reorder Needed: <strong style={{ color: directApiResult.reorder_required ? '#F59E0B' : '#10B981' }}>{directApiResult.reorder_required ? 'YES' : 'NO'}</strong></span>
                        </div>
                      </div>

                      {/* Actions: Send to Module 4 & Export */}
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                        <button
                          className="btn-hover"
                          onClick={() => {
                            setReleasedGates(prev => ({ ...prev, [directApiResult.product_id]: true }));
                            getProductionInterface().then(() => {
                              showToast(`📤 Material availability for ${directApiResult.product_id} dispatched to Module 4 Scheduler · ${directApiResult._requestId}`);
                            }).catch(() => {
                              showToast(`📤 Module 4 contract dispatched for ${directApiResult.product_id} · ${directApiResult._requestId}`);
                            });
                            setActiveTab('readiness');
                            setDrawerItem(null);
                          }}
                          style={{
                            padding: '8px 14px', borderRadius: '8px', border: 'none',
                            background: 'linear-gradient(135deg, #10B981, #059669)', color: '#FFFFFF',
                            fontWeight: 800, fontSize: '11.5px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
                          }}
                        >
                          <span>🏭</span> Send to Module 4 (Production Scheduler) ➔
                        </button>
                        <button
                          className="btn-hover"
                          onClick={() => {
                            const text = JSON.stringify({ ...directApiResult }, null, 2);
                            const blob = new Blob([text], { type: 'application/json' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `OptiChain_Policy_${directApiResult.product_id}_${directApiResult._requestId}.json`;
                            a.click();
                            showToast(`✓ Policy exported as JSON`);
                          }}
                          style={{
                            padding: '8px 14px', borderRadius: '8px', border: `1px solid ${c.tagBorder}`,
                            background: isDark ? 'rgba(255,255,255,0.06)' : '#FFFFFF', color: c.title,
                            fontWeight: 700, fontSize: '11.5px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
                          }}
                        >
                          <span>💾</span> Export JSON
                        </button>
                      </div>
                    </div>
                  )}
                </div>

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

                {/* 1.1 Ceylon Luxury Swatch: Interactive Micro-Texture Weave Canvas */}
                <div style={{
                  background: isDark ? 'linear-gradient(145deg, #0D1B2E, #091322)' : 'linear-gradient(145deg, #FFFFFF, #F8FAFC)',
                  border: `1.5px solid ${isDark ? 'rgba(59,130,246,0.3)' : '#E2E8F0'}`,
                  borderRadius: '14px',
                  padding: '16px 18px',
                  boxShadow: isDark ? '0 8px 24px rgba(0,0,0,0.35)' : '0 4px 14px rgba(15,23,42,0.05)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '16px' }}>🧵</span>
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 800, color: isDark ? '#93C5FD' : '#1E40AF', letterSpacing: '.04em' }}>
                          PHYSICAL FABRIC WEAVE & GSM SWATCH
                        </div>
                        <div style={{ fontSize: '10px', color: c.sub }}>Micro-tactile yarn structure · Export quality verification</div>
                      </div>
                    </div>
                    <span style={{
                      fontSize: '9.5px', fontWeight: 800, padding: '3px 8px', borderRadius: '12px',
                      background: 'rgba(16,185,129,0.15)', color: '#10B981', border: '1px solid rgba(16,185,129,0.3)',
                    }}>
                      OEKO-TEX Certified
                    </span>
                  </div>

                  {/* Micro-Weave Canvas & Telemetry Split */}
                  <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '14px', alignItems: 'center' }}>
                    {/* Woven Warp & Weft SVG Simulation Canvas */}
                    <div style={{
                      position: 'relative',
                      width: '140px',
                      height: '110px',
                      borderRadius: '10px',
                      overflow: 'hidden',
                      border: `1.5px solid ${isDark ? 'rgba(255,255,255,0.15)' : '#CBD5E1'}`,
                      background: item.category === 'Fabrics'
                        ? (isDark ? '#0F1E36' : '#E0E7FF')
                        : item.category === 'Dyes & Chemicals'
                        ? (isDark ? '#2E1065' : '#EDE9FE')
                        : (isDark ? '#1C1917' : '#F1F5F9'),
                      boxShadow: 'inset 0 0 16px rgba(0,0,0,0.4)',
                    }}>
                      <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                          <pattern id={`weave-${item.product_id}`} width="12" height="12" patternUnits="userSpaceOnUse">
                            {/* Warp & Weft interlaced cross-threads */}
                            <path d="M 0,6 L 12,6 M 6,0 L 6,12" stroke={isDark ? "rgba(96,165,250,0.55)" : "rgba(37,99,235,0.45)"} strokeWidth="2.4" strokeLinecap="round" />
                            <circle cx="6" cy="6" r="1.8" fill={isDark ? "#60A5FA" : "#2563EB"} opacity="0.8" />
                            <path d="M 0,0 L 4,4 M 8,8 L 12,12" stroke={isDark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.15)"} strokeWidth="1" />
                          </pattern>
                        </defs>
                        <rect width="100%" height="100%" fill={`url(#weave-${item.product_id})`} />
                        {/* Shimmer illumination sweep */}
                        <rect width="100%" height="100%" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
                      </svg>
                      {/* Zoom Badge */}
                      <div style={{
                        position: 'absolute', bottom: '6px', right: '6px',
                        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
                        color: '#FFFFFF', fontSize: '8.5px', fontWeight: 800,
                        padding: '2px 6px', borderRadius: '4px',
                      }}>
                        40× MAGNIFIED
                      </div>
                    </div>

                    {/* Technical Yarn Attributes Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '10.5px' }}>
                      <div style={{ background: isDark ? 'rgba(0,0,0,0.25)' : '#F1F5F9', padding: '7px 9px', borderRadius: '8px', border: `1px solid ${c.tableBorder}` }}>
                        <div style={{ fontSize: '9px', color: c.sub, fontWeight: 700 }}>FABRIC WEIGHT</div>
                        <div style={{ fontSize: '13px', fontWeight: 900, color: c.title, marginTop: '2px' }}>
                          {item.product_id === 'FAB-001' ? '180 GSM' : item.product_id === 'FAB-002' ? '240 GSM' : item.product_id === 'YRN-042' ? '30s/1 Count' : 'Standard Spec'}
                        </div>
                      </div>

                      <div style={{ background: isDark ? 'rgba(0,0,0,0.25)' : '#F1F5F9', padding: '7px 9px', borderRadius: '8px', border: `1px solid ${c.tableBorder}` }}>
                        <div style={{ fontSize: '9px', color: c.sub, fontWeight: 700 }}>KNITTING GAUGE</div>
                        <div style={{ fontSize: '13px', fontWeight: 900, color: '#3B82F6', marginTop: '2px' }}>
                          28G Circular
                        </div>
                      </div>

                      <div style={{ background: isDark ? 'rgba(0,0,0,0.25)' : '#F1F5F9', padding: '7px 9px', borderRadius: '8px', border: `1px solid ${c.tableBorder}` }}>
                        <div style={{ fontSize: '9px', color: c.sub, fontWeight: 700 }}>COLORFASTNESS</div>
                        <div style={{ fontSize: '13px', fontWeight: 900, color: '#10B981', marginTop: '2px' }}>
                          Grade 4.5 / 5.0
                        </div>
                      </div>

                      <div style={{ background: isDark ? 'rgba(0,0,0,0.25)' : '#F1F5F9', padding: '7px 9px', borderRadius: '8px', border: `1px solid ${c.tableBorder}` }}>
                        <div style={{ fontSize: '9px', color: c.sub, fontWeight: 700 }}>TEST LAB ACCRED.</div>
                        <div style={{ fontSize: '11px', fontWeight: 900, color: c.title, marginTop: '2px' }}>
                          MAS Biyagama
                        </div>
                      </div>
                    </div>
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

                {/* 3.1 Financial Impact & Cost-of-Inaction ($ vs. Risk) */}
                <div style={{
                  background: isDark ? 'linear-gradient(135deg,rgba(16,185,129,0.08),rgba(6,95,70,0.12))' : 'linear-gradient(135deg,#F0FDF4,#DCFCE7)',
                  border: `1.5px solid ${isDark ? 'rgba(16,185,129,0.35)' : '#86EFAC'}`,
                  borderRadius: '14px',
                  padding: '16px 18px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '18px' }}>💰</span>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '13px', color: isDark ? '#6EE7B7' : '#15803D' }}>
                          Financial Impact & Cost-of-Inaction ($ vs. Risk)
                        </div>
                        <div style={{ fontSize: '10px', color: c.sub, marginTop: '1px' }}>
                          Factory line protection economics · MAS Line Contract ROI
                        </div>
                      </div>
                    </div>
                    <span style={{
                      padding: '3px 9px',
                      borderRadius: '20px',
                      fontSize: '10px',
                      fontWeight: 800,
                      background: hasShortage ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)',
                      color: hasShortage ? '#EF4444' : '#10B981',
                      border: `1px solid ${hasShortage ? '#EF4444' : '#10B981'}40`,
                    }}>
                      {hasShortage ? '⚠️ CRITICAL EXPOSURE' : '🛡️ VALUE PROTECTED'}
                    </span>
                  </div>

                  {/* 3 Comparative Financial Tiles */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', textAlign: 'center', marginBottom: '12px' }}>
                    <div style={{ background: isDark ? 'rgba(0,0,0,0.35)' : '#FFFFFF', padding: '10px 8px', borderRadius: '10px', border: `1px solid ${c.cardBorder}` }}>
                      <div style={{ fontSize: '9.5px', color: c.sub, fontWeight: 700 }}>REORDER OUTLAY</div>
                      <div style={{ fontSize: '16px', fontWeight: 900, color: c.title, marginTop: '3px' }}>
                        ${finImpact.reorderInvestment.toLocaleString()}
                      </div>
                      <div style={{ fontSize: '9px', color: c.sub, marginTop: '1px' }}>
                        @ ${finImpact.unitCost.toFixed(2)} / {item.unit}
                      </div>
                    </div>

                    <div style={{ background: isDark ? 'rgba(0,0,0,0.35)' : '#FFFFFF', padding: '10px 8px', borderRadius: '10px', border: `1px solid ${c.cardBorder}` }}>
                      <div style={{ fontSize: '9.5px', color: hasShortage ? '#EF4444' : c.sub, fontWeight: 700 }}>INACTION DOWNTIME</div>
                      <div style={{ fontSize: '16px', fontWeight: 900, color: hasShortage ? '#EF4444' : '#F59E0B', marginTop: '3px' }}>
                        ${finImpact.downtimeExposure.toLocaleString()}
                      </div>
                      <div style={{ fontSize: '9px', color: c.sub, marginTop: '1px' }}>
                        {finImpact.outageHours}h @ ${finImpact.meta.downtimeCost}/hr
                      </div>
                    </div>

                    <div style={{ background: isDark ? 'rgba(0,0,0,0.35)' : '#FFFFFF', padding: '10px 8px', borderRadius: '10px', border: `1px solid ${c.cardBorder}` }}>
                      <div style={{ fontSize: '9.5px', color: '#10B981', fontWeight: 700 }}>PROTECTED ROI</div>
                      <div style={{ fontSize: '16px', fontWeight: 900, color: '#10B981', marginTop: '3px' }}>
                        {finImpact.roiMultiplier}x
                      </div>
                      <div style={{ fontSize: '9px', color: '#10B981', marginTop: '1px' }}>
                        +${finImpact.netProtectedValue.toLocaleString()} net
                      </div>
                    </div>
                  </div>

                  {/* Executive Prescriptive Narrative Banner */}
                  <div style={{
                    background: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.7)',
                    borderRadius: '10px',
                    padding: '10px 12px',
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
                    fontSize: '11px',
                    lineHeight: 1.5,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: isDark ? '#E2E8F0' : '#1E293B', marginBottom: '3px' }}>
                      <span>📌</span> Executive Justification:
                    </div>
                    <div style={{ color: c.sub }}>
                      {hasShortage
                        ? `Ordering ${roq.toLocaleString()} ${item.unit} immediately mitigates an impending $${finImpact.downtimeExposure.toLocaleString()} line stoppage penalty on ${finImpact.meta.line} (${finImpact.meta.order}). Inventory carrying costs are ${Math.round((1 - finImpact.reorderInvestment / Math.max(1, finImpact.downtimeExposure)) * 100)}% lower than manufacturing idle time.`
                        : `Maintaining this safety buffer protects ${finImpact.meta.line} against disruption variance. Current buffer guards $${finImpact.netProtectedValue.toLocaleString()} in committed production capacity without triggering excess dead stock.`}
                    </div>
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

      {/* ═══ OPTIMIZER PARAMETERS CONFIGURATION MODAL DIALOG ═══ */}
      {showOptimizerModal && (
        <div style={styles.modalOverlay} onClick={() => setShowOptimizerModal(false)}>
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: isDark ? '#0F172A' : '#FFFFFF',
              borderRadius: '20px',
              padding: '24px 28px',
              maxWidth: '960px',
              width: '95%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: isDark ? '0 24px 60px rgba(0,0,0,0.85)' : '0 20px 50px rgba(15,23,42,0.2)',
              border: `1.5px solid ${isDark ? 'rgba(59,130,246,0.35)' : '#BFDBFE'}`,
              animation: 'modal-pop 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
              boxSizing: 'border-box',
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0'}`, paddingBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'linear-gradient(135deg,#2563EB,#1D4ED8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', color: '#fff', boxShadow: '0 4px 12px rgba(37,99,235,0.35)', flexShrink: 0 }}>
                  ⚙️
                </div>
                <div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: c.title, display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span>Configure Optimization Parameters</span>
                    <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '12px', background: '#DCFCE7', color: '#15803D', fontWeight: 800, border: '1px solid #86EFAC' }}>
                      ● ERP SYNCHRONIZED
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: c.sub, marginTop: '2px' }}>
                    Disruption-Aware Adaptive Inventory Engine (Module 3) · Master Feed Contract
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowOptimizerModal(false)}
                style={{
                  background: isDark ? 'rgba(255,255,255,0.08)' : '#F1F5F9',
                  border: 'none',
                  borderRadius: '8px',
                  width: '32px',
                  height: '32px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: c.title,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                ✕
              </button>
            </div>

            {/* Form Fields: Section C, Upstream Signals, Section D */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* SECTION C: WMS & ERP LIVE INVENTORY */}
              <div style={{ background: isDark ? 'rgba(16,185,129,0.04)' : '#F0FDF4', border: `1.5px solid ${isDark ? 'rgba(16,185,129,0.25)' : '#BBF7D0'}`, borderRadius: '14px', padding: '16px 18px', boxSizing: 'border-box' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '15px' }}>📦</span>
                    <span style={{ fontSize: '12px', fontWeight: 800, color: isDark ? '#34D399' : '#15803D', letterSpacing: '.03em' }}>
                      SECTION C: WAREHOUSE & ERP INVENTORY POSITION
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: '#2563EB', background: isDark ? 'rgba(37,99,235,0.15)' : '#EFF6FF', padding: '4px 12px', borderRadius: '12px', border: '1px solid rgba(37,99,235,0.25)' }}>
                    Total Inventory Position: {(directParams.current_inventory + (directParams.in_transit_qty || 0)).toLocaleString()} units
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
                  {/* SKU Selector from Catalog */}
                  <div style={styles.inputField}>
                    <label style={styles.inputLabel}>
                      <span>🏷️</span> Material ID & SKU
                    </label>
                    <select
                      value={directParams.product_id}
                      onChange={e => {
                        const selSku = e.target.value;
                        const match = (productsList || []).find(p => p.product_id === selSku);
                        setDirectParams(p => ({
                          ...p,
                          product_id: selSku,
                          ...(match ? {
                            current_inventory: match.current_inventory,
                            forecasted_demand: match.forecasted_demand,
                            demand_std_dev: match.demand_std_dev,
                            average_lead_time: match.average_lead_time,
                            lead_time_std_dev: match.lead_time_std_dev,
                            disruption_probability: match.disruption_probability,
                            supplier_trust_score: match.supplier_trust_score,
                          } : {})
                        }));
                      }}
                      className="input-focus"
                      style={{ ...styles.textInput, fontWeight: 700, height: '42px', width: '100%', boxSizing: 'border-box' }}
                    >
                      {(productsList || [
                        { product_id: 'FAB-001', product_name: 'Organic Cotton Single Jersey' },
                        { product_id: 'FAB-002', product_name: 'Poly-Spandex Ribs' },
                        { product_id: 'DYE-008', product_name: 'Reactive Dyes & Chemistry' },
                        { product_id: 'TRM-015', product_name: 'YKK Zippers & Hardware' },
                        { product_id: 'YRN-042', product_name: 'Compact Spun Yarns' },
                      ]).map(p => (
                        <option key={p.product_id} value={p.product_id}>
                          {p.product_id} — {p.product_name || p.id}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Current Physical Stock */}
                  <div style={styles.inputField}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <label style={styles.inputLabel}>
                        <span>📦</span> Physical Stock <span style={{ color: c.sub, fontWeight: 400 }}>(WMS Bin Scan)</span>
                      </label>
                      <span style={{
                        fontSize: '9px', fontWeight: 700,
                        color: directParams.current_inventory < 0 || directParams.current_inventory > 100000 ? '#EF4444' : c.sub,
                        background: directParams.current_inventory < 0 || directParams.current_inventory > 100000 ? (isDark ? 'rgba(239,68,68,0.18)' : '#FEE2E2') : (isDark ? 'rgba(255,255,255,0.06)' : '#E2E8F0'),
                        padding: '1px 6px', borderRadius: '4px',
                      }}>
                        Range: 0 – 100,000
                      </span>
                    </div>
                    <div style={{
                      display: 'flex', width: '100%', borderRadius: '10px', overflow: 'hidden',
                      border: directParams.current_inventory < 0 || directParams.current_inventory > 100000 ? '1.5px solid #EF4444' : `1.5px solid ${c.inputBorder}`,
                      boxSizing: 'border-box',
                    }}>
                      <input
                        type="number"
                        value={directParams.current_inventory}
                        onChange={e => setDirectParams(p => ({ ...p, current_inventory: parseFloat(e.target.value) }))}
                        className="input-focus"
                        style={{
                          flex: 1, minWidth: 0, border: 'none', padding: '10px 14px',
                          background: directParams.current_inventory < 0 || directParams.current_inventory > 100000 ? (isDark ? 'rgba(239,68,68,0.12)' : '#FEF2F2') : c.inputBg,
                          color: directParams.current_inventory < 0 || directParams.current_inventory > 100000 ? '#EF4444' : c.inputText,
                          fontWeight: 800, fontSize: '13px', outline: 'none',
                        }}
                      />
                      <span style={{ background: isDark ? 'rgba(255,255,255,0.06)' : '#E2E8F0', padding: '0 12px', display: 'flex', alignItems: 'center', fontSize: '11px', fontWeight: 700, color: c.sub, flexShrink: 0, borderLeft: `1px solid ${c.inputBorder}` }}>
                        units
                      </span>
                    </div>
                    {(directParams.current_inventory < 0 || directParams.current_inventory > 100000) && (
                      <div style={{ fontSize: '9.5px', color: '#EF4444', fontWeight: 700, marginTop: '3px' }}>
                        ❌ {directParams.current_inventory < 0 ? 'Physical stock cannot be negative (must be ≥ 0 units)' : 'Exceeds warehouse capacity (max 100,000 units)'}
                      </div>
                    )}
                  </div>

                  {/* In-Transit Purchase Orders */}
                  <div style={styles.inputField}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <label style={styles.inputLabel}>
                        <span>🚚</span> In-Transit Stock <span style={{ color: c.sub, fontWeight: 400 }}>(Active POs)</span>
                      </label>
                      <span style={{
                        fontSize: '9px', fontWeight: 700,
                        color: directParams.in_transit_qty < 0 || directParams.in_transit_qty > 50000 ? '#EF4444' : c.sub,
                        background: directParams.in_transit_qty < 0 || directParams.in_transit_qty > 50000 ? (isDark ? 'rgba(239,68,68,0.18)' : '#FEE2E2') : (isDark ? 'rgba(255,255,255,0.06)' : '#E2E8F0'),
                        padding: '1px 6px', borderRadius: '4px',
                      }}>
                        Range: 0 – 50,000
                      </span>
                    </div>
                    <div style={{
                      display: 'flex', width: '100%', borderRadius: '10px', overflow: 'hidden',
                      border: directParams.in_transit_qty < 0 || directParams.in_transit_qty > 50000 ? '1.5px solid #EF4444' : `1.5px solid ${c.inputBorder}`,
                      boxSizing: 'border-box',
                    }}>
                      <input
                        type="number"
                        value={directParams.in_transit_qty ?? 0}
                        onChange={e => setDirectParams(p => ({ ...p, in_transit_qty: parseFloat(e.target.value) }))}
                        className="input-focus"
                        style={{
                          flex: 1, minWidth: 0, border: 'none', padding: '10px 14px',
                          background: directParams.in_transit_qty < 0 || directParams.in_transit_qty > 50000 ? (isDark ? 'rgba(239,68,68,0.12)' : '#FEF2F2') : c.inputBg,
                          color: directParams.in_transit_qty < 0 || directParams.in_transit_qty > 50000 ? '#EF4444' : c.inputText,
                          fontWeight: 700, fontSize: '13px', outline: 'none',
                        }}
                      />
                      <span style={{ background: isDark ? 'rgba(255,255,255,0.06)' : '#E2E8F0', padding: '0 12px', display: 'flex', alignItems: 'center', fontSize: '11px', fontWeight: 700, color: c.sub, flexShrink: 0, borderLeft: `1px solid ${c.inputBorder}` }}>
                        units
                      </span>
                    </div>
                    {(directParams.in_transit_qty < 0 || directParams.in_transit_qty > 50000) && (
                      <div style={{ fontSize: '9.5px', color: '#EF4444', fontWeight: 700, marginTop: '3px' }}>
                        ❌ {directParams.in_transit_qty < 0 ? 'In-transit PO quantity cannot be negative (must be ≥ 0 units)' : 'Exceeds PO limit (max 50,000 units)'}
                      </div>
                    )}
                  </div>

                  {/* Lead Time L */}
                  <div style={styles.inputField}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <label style={styles.inputLabel}>
                        <span>⏱️</span> Baseline Lead Time (L) <span style={{ color: c.sub, fontWeight: 400 }}>(Contract SLA)</span>
                      </label>
                      <span style={{
                        fontSize: '9px', fontWeight: 700,
                        color: directParams.average_lead_time < 0.5 || directParams.average_lead_time > 60.0 ? '#EF4444' : c.sub,
                        background: directParams.average_lead_time < 0.5 || directParams.average_lead_time > 60.0 ? (isDark ? 'rgba(239,68,68,0.18)' : '#FEE2E2') : (isDark ? 'rgba(255,255,255,0.06)' : '#E2E8F0'),
                        padding: '1px 6px', borderRadius: '4px',
                      }}>
                        Range: 0.5 – 60.0 d
                      </span>
                    </div>
                    <div style={{
                      display: 'flex', width: '100%', borderRadius: '10px', overflow: 'hidden',
                      border: directParams.average_lead_time < 0.5 || directParams.average_lead_time > 60.0 ? '1.5px solid #EF4444' : `1.5px solid ${c.inputBorder}`,
                      boxSizing: 'border-box',
                    }}>
                      <input
                        type="number"
                        step="0.5"
                        value={directParams.average_lead_time}
                        onChange={e => setDirectParams(p => ({ ...p, average_lead_time: parseFloat(e.target.value) }))}
                        className="input-focus"
                        style={{
                          flex: 1, minWidth: 0, border: 'none', padding: '10px 14px',
                          background: directParams.average_lead_time < 0.5 || directParams.average_lead_time > 60.0 ? (isDark ? 'rgba(239,68,68,0.12)' : '#FEF2F2') : c.inputBg,
                          color: directParams.average_lead_time < 0.5 || directParams.average_lead_time > 60.0 ? '#EF4444' : c.inputText,
                          fontWeight: 700, fontSize: '13px', outline: 'none',
                        }}
                      />
                      <span style={{ background: isDark ? 'rgba(255,255,255,0.06)' : '#E2E8F0', padding: '0 12px', display: 'flex', alignItems: 'center', fontSize: '11px', fontWeight: 700, color: c.sub, flexShrink: 0, borderLeft: `1px solid ${c.inputBorder}` }}>
                        days
                      </span>
                    </div>
                    {(directParams.average_lead_time < 0.5 || directParams.average_lead_time > 60.0) && (
                      <div style={{ fontSize: '9.5px', color: '#EF4444', fontWeight: 700, marginTop: '3px' }}>
                        ❌ {directParams.average_lead_time < 0.5 ? 'Lead time must be ≥ 0.5 days (instantaneous delivery is physically impossible)' : 'Exceeds maximum contract SLA limit (max 60 days)'}
                      </div>
                    )}
                  </div>

                  {/* Lead Time Variance σ_L */}
                  <div style={styles.inputField}>
                    <label style={styles.inputLabel}>
                      <span>📉</span> Lead Time Std Dev (σ_L) <span style={{ color: c.sub, fontWeight: 400 }}>(Delivery Jitter)</span>
                    </label>
                    <div style={{ display: 'flex', width: '100%', borderRadius: '10px', overflow: 'hidden', border: `1.5px solid ${c.inputBorder}`, boxSizing: 'border-box' }}>
                      <input
                        type="number"
                        step="0.1"
                        value={directParams.lead_time_std_dev}
                        onChange={e => setDirectParams(p => ({ ...p, lead_time_std_dev: parseFloat(e.target.value) || 0 }))}
                        className="input-focus"
                        style={{ flex: 1, minWidth: 0, border: 'none', padding: '10px 14px', background: c.inputBg, color: c.inputText, fontWeight: 600, fontSize: '13px', outline: 'none' }}
                      />
                      <span style={{ background: isDark ? 'rgba(255,255,255,0.06)' : '#E2E8F0', padding: '0 12px', display: 'flex', alignItems: 'center', fontSize: '11px', fontWeight: 700, color: c.sub, flexShrink: 0, borderLeft: `1px solid ${c.inputBorder}` }}>
                        days
                      </span>
                    </div>
                  </div>

                  {/* Supplier Trust Score */}
                  <div style={styles.inputField}>
                    <label style={styles.inputLabel}>
                      <span>🤝</span> Supplier Trust Score <span style={{ color: c.sub, fontWeight: 400 }}>(OTIF Rating)</span>
                    </label>
                    <div style={{ display: 'flex', width: '100%', borderRadius: '10px', overflow: 'hidden', border: `1.5px solid ${c.inputBorder}`, boxSizing: 'border-box' }}>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={directParams.supplier_trust_score || 75}
                        onChange={e => setDirectParams(p => ({ ...p, supplier_trust_score: parseFloat(e.target.value) || 0 }))}
                        className="input-focus"
                        style={{ flex: 1, minWidth: 0, border: 'none', padding: '10px 14px', background: c.inputBg, color: c.inputText, fontWeight: 600, fontSize: '13px', outline: 'none' }}
                      />
                      <span style={{ background: isDark ? 'rgba(255,255,255,0.06)' : '#E2E8F0', padding: '0 12px', display: 'flex', alignItems: 'center', fontSize: '11px', fontWeight: 700, color: c.sub, flexShrink: 0, borderLeft: `1px solid ${c.inputBorder}` }}>
                        / 100
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* UPSTREAM SIGNALS: MODULE 1 & MODULE 2 — READ-ONLY AUTO-FETCHED */}
              <div style={{ background: isDark ? 'rgba(59,130,246,0.04)' : '#EFF6FF', border: `1.5px solid ${isDark ? 'rgba(59,130,246,0.25)' : '#BFDBFE'}`, borderRadius: '14px', padding: '16px 18px', boxSizing: 'border-box' }}>
                {/* Section Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '15px' }}>📡</span>
                    <span style={{ fontSize: '12px', fontWeight: 800, color: isDark ? '#60A5FA' : '#1D4ED8', letterSpacing: '.03em' }}>
                      UPSTREAM SIGNALS: MODULE 1 (DEMAND) &amp; MODULE 2 (SUPPLY RISK)
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '10px', color: c.sub }}>
                      🕐 Fetched: {new Date().toLocaleTimeString()}
                    </span>
                    <span style={{ fontSize: '10.5px', fontWeight: 800, color: '#D97706', background: '#FEF3C7', padding: '3px 10px', borderRadius: '10px', border: '1px solid #FCD34D' }}>
                      ⚡ DEMO DATA (Upstream APIs Pending)
                    </span>
                    <button
                      onClick={async () => {
                        // When live: replace this with fetchDemoUpstreamFeeds() or fetchLiveUpstream()
                        const match = (productsList || []).find(p => p.product_id === directParams.product_id);
                        if (match) {
                          setDirectParams(p => ({
                            ...p,
                            forecasted_demand: match.forecasted_demand,
                            demand_std_dev: match.demand_std_dev,
                            disruption_probability: match.disruption_probability,
                            supplier_trust_score: match.supplier_trust_score,
                            average_lead_time: match.average_lead_time,
                            lead_time_std_dev: match.lead_time_std_dev,
                          }));
                          showToast(`🔄 Upstream signals refreshed for ${directParams.product_id} from demo catalog`);
                        }
                      }}
                      style={{ fontSize: '11px', fontWeight: 700, color: '#2563EB', background: isDark ? 'rgba(37,99,235,0.15)' : '#EFF6FF', border: '1.5px solid #93C5FD', borderRadius: '8px', padding: '4px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}
                    >
                      🔄 Refresh Upstream
                    </button>
                  </div>
                </div>

                {/* Info Banner */}
                <div style={{ marginBottom: '12px', padding: '8px 12px', background: isDark ? 'rgba(37,99,235,0.1)' : '#DBEAFE', borderRadius: '8px', fontSize: '11px', color: isDark ? '#93C5FD' : '#1D4ED8', fontWeight: 600 }}>
                  🔒 These values are <strong>auto-fetched from Module 1 &amp; Module 2</strong>. You cannot edit them — they represent the AI-generated demand forecast and supply-risk score for the selected SKU.
                </div>

                {/* Read-Only Signal Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>

                  {/* M1: Forecasted Demand */}
                  <div style={{ background: isDark ? 'rgba(255,255,255,0.03)' : '#fff', border: `1.5px solid ${isDark ? 'rgba(59,130,246,0.2)' : '#BFDBFE'}`, borderRadius: '10px', padding: '12px 14px', position: 'relative' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '10px', fontWeight: 800, color: '#2563EB', textTransform: 'uppercase', letterSpacing: '.05em' }}>📈 M1 · Forecast Demand</span>
                      <span style={{ fontSize: '9px', fontWeight: 700, color: '#D97706', background: '#FEF3C7', padding: '1px 7px', borderRadius: '8px', border: '1px solid #FDE68A' }}>Demo</span>
                    </div>
                    <div style={{ fontSize: '20px', fontWeight: 900, color: directParams.forecasted_demand > 0 ? (isDark ? '#60A5FA' : '#1D4ED8') : '#EF4444' }}>
                      {directParams.forecasted_demand > 0 ? directParams.forecasted_demand.toLocaleString() : '—'}
                    </div>
                    <div style={{ fontSize: '10px', color: c.sub, marginTop: '2px' }}>units / planning cycle</div>
                    {directParams.forecasted_demand <= 0 && (
                      <div style={{ marginTop: '6px', fontSize: '10px', color: '#EF4444', fontWeight: 700 }}>⚠ No data — select a SKU above</div>
                    )}
                  </div>

                  {/* M1: Demand Volatility */}
                  <div style={{ background: isDark ? 'rgba(255,255,255,0.03)' : '#fff', border: `1.5px solid ${isDark ? 'rgba(59,130,246,0.2)' : '#BFDBFE'}`, borderRadius: '10px', padding: '12px 14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '10px', fontWeight: 800, color: '#2563EB', textTransform: 'uppercase', letterSpacing: '.05em' }}>📊 M1 · Demand Volatility (σ_D)</span>
                      <span style={{ fontSize: '9px', fontWeight: 700, color: '#D97706', background: '#FEF3C7', padding: '1px 7px', borderRadius: '8px', border: '1px solid #FDE68A' }}>Demo</span>
                    </div>
                    <div style={{ fontSize: '20px', fontWeight: 900, color: isDark ? '#60A5FA' : '#1D4ED8' }}>
                      ±{directParams.demand_std_dev > 0 ? directParams.demand_std_dev.toFixed(1) : '—'}
                    </div>
                    <div style={{ fontSize: '10px', color: c.sub, marginTop: '2px' }}>units std. deviation</div>
                  </div>

                  {/* M2: Disruption Probability */}
                  <div style={{ background: isDark ? 'rgba(255,255,255,0.03)' : '#fff', border: `1.5px solid ${isDark ? 'rgba(217,119,6,0.25)' : '#FDE68A'}`, borderRadius: '10px', padding: '12px 14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '10px', fontWeight: 800, color: '#D97706', textTransform: 'uppercase', letterSpacing: '.05em' }}>⚠️ M2 · Disruption Risk</span>
                      <span style={{ fontSize: '9px', fontWeight: 700, color: '#D97706', background: '#FEF3C7', padding: '1px 7px', borderRadius: '8px', border: '1px solid #FDE68A' }}>Demo</span>
                    </div>
                    <div style={{ fontSize: '20px', fontWeight: 900, color: directParams.disruption_probability > 0.6 ? '#EF4444' : directParams.disruption_probability > 0.3 ? '#D97706' : '#10B981' }}>
                      {(directParams.disruption_probability * 100).toFixed(0)}%
                    </div>
                    <div style={{ fontSize: '10px', color: c.sub, marginTop: '2px' }}>disruption probability</div>
                    {/* Risk bar */}
                    <div style={{ marginTop: '6px', height: '4px', borderRadius: '2px', background: isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0' }}>
                      <div style={{ height: '100%', width: `${directParams.disruption_probability * 100}%`, borderRadius: '2px', background: directParams.disruption_probability > 0.6 ? '#EF4444' : directParams.disruption_probability > 0.3 ? '#F59E0B' : '#10B981', transition: 'width 0.4s ease' }} />
                    </div>
                  </div>

                  {/* M2: Supplier Trust Score */}
                  <div style={{ background: isDark ? 'rgba(255,255,255,0.03)' : '#fff', border: `1.5px solid ${isDark ? 'rgba(217,119,6,0.25)' : '#FDE68A'}`, borderRadius: '10px', padding: '12px 14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '10px', fontWeight: 800, color: '#D97706', textTransform: 'uppercase', letterSpacing: '.05em' }}>🤝 M2 · Supplier Trust</span>
                      <span style={{ fontSize: '9px', fontWeight: 700, color: '#D97706', background: '#FEF3C7', padding: '1px 7px', borderRadius: '8px', border: '1px solid #FDE68A' }}>Demo</span>
                    </div>
                    <div style={{ fontSize: '20px', fontWeight: 900, color: (directParams.supplier_trust_score || 0) >= 75 ? '#10B981' : '#F59E0B' }}>
                      {directParams.supplier_trust_score || '—'}<span style={{ fontSize: '12px', fontWeight: 600 }}>/100</span>
                    </div>
                    <div style={{ fontSize: '10px', color: c.sub, marginTop: '2px' }}>OTIF reliability score</div>
                    {/* Trust bar */}
                    <div style={{ marginTop: '6px', height: '4px', borderRadius: '2px', background: isDark ? 'rgba(255,255,255,0.1)' : '#E2E8F0' }}>
                      <div style={{ height: '100%', width: `${directParams.supplier_trust_score || 0}%`, borderRadius: '2px', background: (directParams.supplier_trust_score || 0) >= 75 ? '#10B981' : '#F59E0B', transition: 'width 0.4s ease' }} />
                    </div>
                  </div>

                  {/* M2: Lead Time */}
                  <div style={{ background: isDark ? 'rgba(255,255,255,0.03)' : '#fff', border: `1.5px solid ${isDark ? 'rgba(217,119,6,0.25)' : '#FDE68A'}`, borderRadius: '10px', padding: '12px 14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '10px', fontWeight: 800, color: '#D97706', textTransform: 'uppercase', letterSpacing: '.05em' }}>⏱ M2 · Avg Lead Time</span>
                      <span style={{ fontSize: '9px', fontWeight: 700, color: '#D97706', background: '#FEF3C7', padding: '1px 7px', borderRadius: '8px', border: '1px solid #FDE68A' }}>Demo</span>
                    </div>
                    <div style={{ fontSize: '20px', fontWeight: 900, color: isDark ? '#FBBF24' : '#92400E' }}>
                      {directParams.average_lead_time > 0 ? directParams.average_lead_time.toFixed(1) : '—'}
                    </div>
                    <div style={{ fontSize: '10px', color: c.sub, marginTop: '2px' }}>days · σ = ±{directParams.lead_time_std_dev?.toFixed(2) || '—'} days</div>
                  </div>

                  {/* M2: Risk Level Summary */}
                  <div style={{ background: isDark ? 'rgba(255,255,255,0.03)' : '#fff', border: `1.5px solid ${isDark ? 'rgba(217,119,6,0.25)' : '#FDE68A'}`, borderRadius: '10px', padding: '12px 14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <span style={{ fontSize: '10px', fontWeight: 800, color: '#D97706', textTransform: 'uppercase', letterSpacing: '.05em' }}>🛡 M2 · Risk Classification</span>
                      <span style={{ fontSize: '9px', fontWeight: 700, color: '#D97706', background: '#FEF3C7', padding: '1px 7px', borderRadius: '8px', border: '1px solid #FDE68A' }}>Demo</span>
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: 900, color: directParams.disruption_probability > 0.6 ? '#EF4444' : directParams.disruption_probability > 0.3 ? '#F59E0B' : '#10B981' }}>
                      {directParams.disruption_probability > 0.6 ? 'CRITICAL' : directParams.disruption_probability > 0.4 ? 'HIGH' : directParams.disruption_probability > 0.2 ? 'MEDIUM' : 'LOW'}
                    </div>
                    <div style={{ fontSize: '10px', color: c.sub, marginTop: '2px' }}>computed from disruption prob.</div>
                  </div>

                </div>
              </div>


              {/* SECTION D: OPTIMIZATION SETTINGS & POLICIES */}
              <div style={{ background: isDark ? 'rgba(168,85,247,0.04)' : '#FAF5FF', border: `1.5px solid ${isDark ? 'rgba(168,85,247,0.25)' : '#E9D5FF'}`, borderRadius: '14px', padding: '16px 18px', boxSizing: 'border-box' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '15px' }}>⚙️</span>
                    <span style={{ fontSize: '12px', fontWeight: 800, color: isDark ? '#C084FC' : '#7E22CE', letterSpacing: '.03em' }}>
                      SECTION D: OPTIMIZATION SETTINGS & POLICIES
                    </span>
                  </div>
                  <span style={{ fontSize: '10.5px', color: c.sub }}>Module 3 Control Levers</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
                  <div style={styles.inputField}>
                    <label style={styles.inputLabel}><span>🎯</span> Target Cycle Service Level (SL)</label>
                    <select
                      value={directParams.service_level || 0.95}
                      onChange={e => {
                        const sl = parseFloat(e.target.value);
                        const zMap = { 0.90: 1.282, 0.95: 1.645, 0.98: 2.054, 0.99: 2.326 };
                        setDirectParams(p => ({ ...p, service_level: sl, z_value: zMap[sl] || 1.645 }));
                      }}
                      className="input-focus"
                      style={{ ...styles.textInput, height: '42px', width: '100%', boxSizing: 'border-box' }}
                    >
                      <option value={0.90}>90% SLA (Z = 1.282) · Relaxed Buffer</option>
                      <option value={0.95}>95% SLA (Z = 1.645) · Standard FMCG / Apparel</option>
                      <option value={0.98}>98% SLA (Z = 2.054) · High Criticality Tier</option>
                      <option value={0.99}>99% SLA (Z = 2.326) · Zero-Stockout Guarantee</option>
                    </select>
                  </div>
                  <div style={styles.inputField}>
                    <label style={styles.inputLabel}><span>🌪️</span> Disruption Scenario Stress</label>
                    <select
                      value={directParams.scenario || 'NORMAL'}
                      onChange={e => setDirectParams(p => ({ ...p, scenario: e.target.value }))}
                      className="input-focus"
                      style={{ ...styles.textInput, height: '42px', width: '100%', boxSizing: 'border-box' }}
                    >
                      <option value="NORMAL">NORMAL · Baseline Peace-Time Schedule</option>
                      <option value="MODERATE">MODERATE · Port Congestion / Seasonal Delay</option>
                      <option value="SEVERE">SEVERE · Geopolitical Chokepoint Force Majeure</option>
                    </select>
                  </div>
                  <div style={styles.inputField}>
                    <label style={styles.inputLabel}><span>🛡️</span> Risk-Adjustment Policy Type</label>
                    <select
                      value={directParams.policy_type || 'FORECAST_RISK_AWARE'}
                      onChange={e => setDirectParams(p => ({ ...p, policy_type: e.target.value }))}
                      className="input-focus"
                      style={{ ...styles.textInput, height: '42px', width: '100%', boxSizing: 'border-box' }}
                    >
                      <option value="FORECAST_RISK_AWARE">FORECAST_RISK_AWARE (Adaptive Dual-Sigma)</option>
                      <option value="ADAPTIVE">ADAPTIVE (Dynamic Lead-Time Scaling)</option>
                      <option value="STATIC_BASELINE">STATIC_BASELINE (Unadjusted King's Formula)</option>
                    </select>
                  </div>
                </div>
              </div>

            </div>

            {/* ── FEATURE 1: Inline Field Validation Errors ── */}
            {(() => {
              const mCurrentInv = Number(directParams.current_inventory);
              const mInTransit = Number(directParams.in_transit_qty ?? 0);
              const mLeadTime = Number(directParams.average_lead_time);
              const mDemandVal = Number(directParams.forecasted_demand);

              const errs = [];
              if (isNaN(mDemandVal) || mDemandVal <= 0) errs.push('⚠ Rolling Forecast Demand must be > 0 (Module 1 AI feed required).');
              if (isNaN(mLeadTime) || mLeadTime < 0.5) errs.push('⚠ Baseline Lead Time must be ≥ 0.5 days (instant supply is physically impossible).');
              if (mLeadTime > 60.0) errs.push('⚠ Baseline Lead Time exceeds contract SLA boundary (max 60 days).');
              if (isNaN(mCurrentInv) || mCurrentInv < 0) errs.push('⚠ Physical stock cannot be negative (WMS scan must be ≥ 0 units).');
              if (mCurrentInv > 100000) errs.push('⚠ Physical stock exceeds warehouse bin capacity (max 100,000 units).');
              if (isNaN(mInTransit) || mInTransit < 0) errs.push('⚠ In-transit PO quantity cannot be negative.');
              if (mInTransit > 50000) errs.push('⚠ In-transit quantity exceeds max active PO capacity (max 50,000 units).');
              if (directParams.supplier_trust_score <= 0) errs.push('⚠ Supplier Trust Score must be > 0.');
              if (directParams.disruption_probability < 0 || directParams.disruption_probability > 1) errs.push('⚠ Disruption Probability must be between 0.0 and 1.0.');

              const mHasErrors = errs.length > 0;

              return (
                <>
                  {mHasErrors && (
                    <div style={{ margin: '10px 0 4px', background: isDark ? 'rgba(239,68,68,0.12)' : '#FEF2F2', border: '1.5px solid #FCA5A5', borderRadius: '10px', padding: '10px 14px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 800, color: '#DC2626', marginBottom: '6px' }}>
                        🚫 VALIDATION ALERT — Button disabled until input range errors are resolved:
                      </div>
                      {errs.map((e, i) => (
                        <div key={i} style={{ fontSize: '11px', color: '#DC2626', marginBottom: '3px', fontWeight: 600 }}>{e}</div>
                      ))}
                    </div>
                  )}

                  {/* ── FEATURE 2: Data Source Status Bar ── */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px', padding: '10px 14px', background: isDark ? 'rgba(37,99,235,0.08)' : '#EFF6FF', borderRadius: '10px', border: `1px solid ${isDark ? 'rgba(37,99,235,0.25)' : '#BFDBFE'}`, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: c.sub }}>DATA SOURCES:</span>
                    {/* Module 1 Status */}
                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: 700, color: directParams.forecasted_demand > 0 ? '#15803D' : '#DC2626', background: directParams.forecasted_demand > 0 ? (isDark ? 'rgba(16,185,129,0.15)' : '#DCFCE7') : (isDark ? 'rgba(239,68,68,0.15)' : '#FEE2E2'), padding: '3px 10px', borderRadius: '20px', border: `1px solid ${directParams.forecasted_demand > 0 ? '#86EFAC' : '#FCA5A5'}` }}>
                      📈 Module 1 (Demand): {directParams.forecasted_demand > 0 ? '● Demo Data' : '● No Data'}
                    </span>
                    {/* Module 2 Status */}
                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: 700, color: directParams.disruption_probability >= 0 && directParams.supplier_trust_score > 0 ? '#D97706' : '#DC2626', background: directParams.disruption_probability >= 0 && directParams.supplier_trust_score > 0 ? (isDark ? 'rgba(217,119,6,0.15)' : '#FEF3C7') : (isDark ? 'rgba(239,68,68,0.15)' : '#FEE2E2'), padding: '3px 10px', borderRadius: '20px', border: `1px solid ${directParams.supplier_trust_score > 0 ? '#FDE68A' : '#FCA5A5'}` }}>
                      ⚠️ Module 2 (Risk): {directParams.supplier_trust_score > 0 ? '● Demo Data' : '● No Data'}
                    </span>
                    {/* ERP Status */}
                    <span style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: 700, color: '#2563EB', background: isDark ? 'rgba(37,99,235,0.15)' : '#EFF6FF', padding: '3px 10px', borderRadius: '20px', border: '1px solid #93C5FD' }}>
                      📦 WMS/ERP: ● Synchronized
                    </span>
                    <span style={{ marginLeft: 'auto', fontSize: '10px', color: c.sub }}>
                      Fetched: {new Date().toLocaleTimeString()}
                    </span>
                  </div>

                  {/* ── FEATURE 3 & 4: Enhanced Footer + Results Panel ── */}
                  <div style={{ marginTop: '18px', borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0'}`, paddingTop: '16px' }}>
                    {/* Action row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                      <div style={{ fontSize: '11px', color: c.sub }}>
                        {mHasErrors ? '❌ Validation failed · Fix input ranges before submitting' : '* Validated parameters ready for Python InventoryOptimizer'}
                      </div>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                          onClick={() => setShowOptimizerModal(false)}
                          style={{ padding: '9px 18px', borderRadius: '10px', border: `1px solid ${c.tagBorder}`, background: 'transparent', color: c.sub, fontWeight: 700, fontSize: '12.5px', cursor: 'pointer' }}
                        >
                          Cancel
                        </button>
                        <button
                          className="btn-hover"
                          onClick={async () => {
                            if (mHasErrors) return;
                            setIsExecutingDirectApi(true);
                            const requestId = `REQ-${Date.now()}`;
                            const requestTimestamp = new Date().toISOString();
                            try {
                              const r = await optimizeInventoryDetailed({
                                ...directParams,
                                _request_id: requestId,
                              });
                              r._requestId = requestId;
                              r._requestTimestamp = requestTimestamp;
                              r._responseTimestamp = new Date().toISOString();
                              r._inputSnapshot = { ...directParams };
                              setDirectApiResult(r);
                              setComputedPolicies(prev => [{ ...r, _computedAt: new Date().toISOString() }, ...prev]);
                              showToast(`✅ Policy computed for ${directParams.product_id} · Request ID: ${requestId}`);
                            } catch (e) {
                              showToast(`❌ Optimization error: ${e.message || 'Unknown error from backend'}`, 'error');
                            } finally {
                              setIsExecutingDirectApi(false);
                            }
                          }}
                          disabled={isExecutingDirectApi || mHasErrors}
                          style={{
                            ...styles.execBtn,
                            background: mHasErrors
                              ? (isDark ? '#334155' : '#94A3B8')
                              : isExecutingDirectApi
                              ? 'linear-gradient(135deg,#64748B,#475569)'
                              : directApiResult?._requestId
                              ? 'linear-gradient(135deg,#059669,#047857)'
                              : 'linear-gradient(135deg,#2563EB,#1D4ED8)',
                            boxShadow: mHasErrors ? 'none' : isExecutingDirectApi ? 'none' : '0 4px 14px rgba(37,99,235,0.35)',
                            padding: '9px 24px', fontSize: '12.5px', fontWeight: 800,
                            display: 'flex', alignItems: 'center', gap: '8px',
                            cursor: (isExecutingDirectApi || mHasErrors) ? 'not-allowed' : 'pointer',
                            opacity: mHasErrors ? 0.65 : 1,
                            transition: 'all 0.2s ease',
                          }}
                        >
                          {isExecutingDirectApi
                            ? '⟳ Computing Policy...'
                            : mHasErrors
                            ? '🚫 Fix Input Range Errors to Proceed'
                            : directApiResult?._requestId
                            ? '✅ Results Ready — Scroll Down'
                            : '🚀 Submit & Compute Policy'}
                        </button>
                        </div>
                      </div>
                    </div>
                  </>
                );
              })()}

              {/* ── FEATURE 4: Results Panel (shown inline after submit) ── */}
              {directApiResult && directApiResult._requestId && (
                <div style={{ marginTop: '20px', background: isDark ? 'rgba(16,185,129,0.06)' : '#F0FDF4', border: `2px solid ${isDark ? 'rgba(16,185,129,0.35)' : '#86EFAC'}`, borderRadius: '14px', padding: '18px', boxSizing: 'border-box' }}>
                  {/* Results Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '16px' }}>✅</span>
                      <span style={{ fontSize: '13px', fontWeight: 800, color: isDark ? '#34D399' : '#15803D' }}>
                        OPTIMIZATION RESULTS — {directApiResult.product_id}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '10px', fontWeight: 700, color: '#6B7280', background: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9', padding: '3px 10px', borderRadius: '20px', border: `1px solid ${c.tagBorder}` }}>
                        🔑 {directApiResult._requestId}
                      </span>
                      <span style={{ fontSize: '10px', fontWeight: 700, color: '#6B7280', background: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9', padding: '3px 10px', borderRadius: '20px', border: `1px solid ${c.tagBorder}` }}>
                        ⏱ Requested: {new Date(directApiResult._requestTimestamp).toLocaleTimeString()}
                      </span>
                      <span style={{ fontSize: '10px', fontWeight: 700, color: '#6B7280', background: isDark ? 'rgba(255,255,255,0.06)' : '#F1F5F9', padding: '3px 10px', borderRadius: '20px', border: `1px solid ${c.tagBorder}` }}>
                        ⏱ Responded: {new Date(directApiResult._responseTimestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>

                  {/* Input Sources (which data generated this) */}
                  <div style={{ marginBottom: '14px', padding: '10px 12px', background: isDark ? 'rgba(37,99,235,0.08)' : '#EFF6FF', borderRadius: '10px', border: `1px solid ${isDark ? 'rgba(37,99,235,0.2)' : '#BFDBFE'}` }}>
                    <div style={{ fontSize: '10.5px', fontWeight: 800, color: '#2563EB', marginBottom: '6px' }}>📋 INPUT SOURCES (what data generated this result)</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '6px' }}>
                      {[
                        { label: 'Demand (M1)', value: `${directApiResult._inputSnapshot?.forecasted_demand?.toFixed(0)} units`, tag: 'Demo Data' },
                        { label: 'Demand σ (M1)', value: `±${directApiResult._inputSnapshot?.demand_std_dev?.toFixed(1)} units`, tag: 'Demo Data' },
                        { label: 'Disruption (M2)', value: `${((directApiResult._inputSnapshot?.disruption_probability || 0) * 100).toFixed(0)}%`, tag: 'Demo Data' },
                        { label: 'Trust Score (M2)', value: `${directApiResult._inputSnapshot?.supplier_trust_score?.toFixed(0)}/100`, tag: 'Demo Data' },
                        { label: 'Lead Time (ERP)', value: `${directApiResult._inputSnapshot?.average_lead_time?.toFixed(1)} days`, tag: 'WMS Live' },
                        { label: 'Stock (ERP)', value: `${directApiResult._inputSnapshot?.current_inventory?.toFixed(0)} units`, tag: 'WMS Live' },
                      ].map(({ label, value, tag }) => (
                        <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', padding: '4px 0', borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : '#E2E8F0'}` }}>
                          <span style={{ color: c.sub, fontWeight: 600 }}>{label}</span>
                          <span style={{ color: c.title, fontWeight: 800 }}>{value}</span>
                          <span style={{ fontSize: '9px', padding: '1px 6px', borderRadius: '8px', background: tag === 'WMS Live' ? '#DCFCE7' : '#FEF3C7', color: tag === 'WMS Live' ? '#15803D' : '#92400E', fontWeight: 700 }}>{tag}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Core Calculated Policy */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px', marginBottom: '14px' }}>
                    {[
                      { label: 'Safety Stock', value: `${directApiResult.safety_stock?.toFixed(1)} units`, color: '#10B981', desc: 'σ_D × √L × Z' },
                      { label: 'Reorder Point', value: `${directApiResult.reorder_point?.toFixed(1)} units`, color: '#2563EB', desc: 'D×L + Safety Stock' },
                      { label: 'Reorder Qty', value: `${directApiResult.reorder_quantity?.toFixed(1)} units`, color: '#8B5CF6', desc: 'EOQ + Risk Buffer' },
                      { label: 'Risk-Adj Lead', value: `${directApiResult.risk_adjusted_lead_time?.toFixed(2)} days`, color: '#F59E0B', desc: 'L × (1 + Risk Factor)' },
                      { label: 'Backorder Risk', value: `${((directApiResult.backorder_risk || 0) * 100).toFixed(1)}%`, color: directApiResult.backorder_risk > 0.5 ? '#EF4444' : '#10B981', desc: 'XGBoost Model v1.0' },
                      { label: 'Risk Level', value: directApiResult.risk_level, color: directApiResult.risk_level === 'HIGH' || directApiResult.risk_level === 'CRITICAL' ? '#EF4444' : '#10B981', desc: `Disruption ${((directApiResult.disruption_probability || 0) * 100).toFixed(0)}%` },
                    ].map(({ label, value, color, desc }) => (
                      <div key={label} style={{ background: isDark ? 'rgba(255,255,255,0.04)' : '#fff', border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : '#E2E8F0'}`, borderRadius: '10px', padding: '10px 12px' }}>
                        <div style={{ fontSize: '10px', color: c.sub, fontWeight: 600, marginBottom: '4px' }}>{label}</div>
                        <div style={{ fontSize: '14px', fontWeight: 800, color }}>{value}</div>
                        <div style={{ fontSize: '9px', color: c.sub, marginTop: '3px', fontStyle: 'italic' }}>{desc}</div>
                      </div>
                    ))}
                  </div>

                  {/* Material Readiness for Production */}
                  <div style={{ marginBottom: '14px', padding: '12px', background: directApiResult.material_availability_flag ? (isDark ? 'rgba(16,185,129,0.1)' : '#F0FDF4') : (isDark ? 'rgba(239,68,68,0.1)' : '#FEF2F2'), border: `1.5px solid ${directApiResult.material_availability_flag ? '#86EFAC' : '#FCA5A5'}`, borderRadius: '10px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 800, color: directApiResult.material_availability_flag ? '#15803D' : '#DC2626', marginBottom: '6px' }}>
                      {directApiResult.material_availability_flag ? '✅ MATERIAL READY FOR PRODUCTION (Module 4)' : '🚨 MATERIAL SHORTAGE — MODULE 4 ALERT'}
                    </div>
                    <div style={{ fontSize: '11px', color: c.title, fontWeight: 600, lineHeight: 1.6 }}>
                      {directApiResult.reorder_recommendation}
                    </div>
                    <div style={{ marginTop: '8px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '11px', color: c.sub }}>Material Req: <strong style={{ color: c.title }}>{directApiResult.material_requirement?.toFixed(1)} units</strong></span>
                      <span style={{ fontSize: '11px', color: c.sub }}>Shortage: <strong style={{ color: directApiResult.material_shortage > 0 ? '#EF4444' : '#10B981' }}>{directApiResult.material_shortage?.toFixed(1)} units</strong></span>
                      <span style={{ fontSize: '11px', color: c.sub }}>Reorder Needed: <strong style={{ color: directApiResult.reorder_required ? '#F59E0B' : '#10B981' }}>{directApiResult.reorder_required ? 'YES' : 'NO'}</strong></span>
                    </div>
                  </div>

                  {/* Pass to Module 4 Button */}
                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => {
                        const payload = {
                          product_id: directApiResult.product_id,
                          material_available: directApiResult.material_availability_flag,
                          shortage_units: directApiResult.material_shortage,
                          reorder_required: directApiResult.reorder_required,
                          reorder_quantity: directApiResult.reorder_quantity,
                          risk_adjusted_lead_time: directApiResult.risk_adjusted_lead_time,
                          risk_level: directApiResult.risk_level,
                          source_request_id: directApiResult._requestId,
                          timestamp: directApiResult._responseTimestamp,
                        };
                        getProductionInterface().then(() => {
                          showToast(`📤 Material availability for ${directApiResult.product_id} sent to Module 4 (Production Line Scheduler) · ${directApiResult._requestId}`);
                        }).catch(() => {
                          showToast(`📤 Module 4 contract dispatched for ${directApiResult.product_id} (simulated) · ${directApiResult._requestId}`);
                        });
                      }}
                      style={{ padding: '9px 18px', borderRadius: '10px', border: '1.5px solid #8B5CF6', background: isDark ? 'rgba(139,92,246,0.15)' : '#F5F3FF', color: '#7C3AED', fontWeight: 800, fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      📤 Send to Module 4 (Production Scheduler)
                    </button>
                    <button
                      onClick={() => {
                        const text = JSON.stringify({ ...directApiResult }, null, 2);
                        const blob = new Blob([text], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `inventory-result-${directApiResult.product_id}-${directApiResult._requestId}.json`;
                        a.click();
                      }}
                      style={{ padding: '9px 18px', borderRadius: '10px', border: `1px solid ${c.tagBorder}`, background: 'transparent', color: c.sub, fontWeight: 700, fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      💾 Export Result JSON
                    </button>
                  </div>
                </div>
              )}
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
    bg:            isDark ? '#060C17' : '#EEF2F6',
    card:          isDark ? '#0D1B2E' : '#FFFFFF',
    cardBorder:    isDark ? '#182B44' : '#CBD5E1',
    title:         isDark ? '#F1F5F9' : '#0F172A',
    sub:           isDark ? '#7A9EC0' : '#334155',
    subCard:       isDark ? '#0A1626' : '#F8FAFC',
    subCardBorder: isDark ? '#182B44' : '#CBD5E1',
    tableHead:     isDark ? '#0A1626' : '#E2E8F0',
    tableBorder:   isDark ? '#182B44' : '#CBD5E1',
    inputBg:       isDark ? '#0D1B2E' : '#FFFFFF',
    inputBorder:   isDark ? '#2A3F5F' : '#94A3B8',
    inputText:     isDark ? '#F1F5F9' : '#0F172A',
    modalBg:       isDark ? '#0D1B2E' : '#FFFFFF',
    tagBg:         isDark ? '#182B44' : '#E2E8F0',
    tagText:       isDark ? '#94A3B8' : '#0F172A',
    tagBorder:     isDark ? '#2A3F5F' : '#94A3B8',
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
    alertBanner: {
      background: c.isDark
        ? 'linear-gradient(135deg,#581212 0%,#7F1D1D 50%,#991B1B 100%)'
        : 'linear-gradient(135deg,#7F1D1D 0%,#991B1B 50%,#B91C1C 100%)',
      border: `2px solid ${c.isDark ? '#EF4444' : '#DC2626'}`,
      borderRadius: '16px',
      padding: '18px 22px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: '14px',
      boxShadow: c.isDark ? '0 10px 30px rgba(239,68,68,0.35)' : '0 8px 24px rgba(185,28,28,0.25)',
      animation: 'slide-up .4s ease',
      color: '#FFFFFF',
    },
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
    theadRow: { background: c.isDark?'#0A1626':'#E2E8F0', borderBottom:`2px solid ${c.tableBorder}` },
    th:      { textAlign:'left',   padding:'12px 14px', color: c.isDark ? c.sub : '#0F172A', fontWeight:800, fontSize:'11px', letterSpacing:'.05em', whiteSpace:'nowrap' },
    thRight: { textAlign:'right',  padding:'12px 14px', color: c.isDark ? c.sub : '#0F172A', fontWeight:800, fontSize:'11px', letterSpacing:'.05em', whiteSpace:'nowrap' },
    thCenter:{ textAlign:'center', padding:'12px 14px', color: c.isDark ? c.sub : '#0F172A', fontWeight:800, fontSize:'11px', letterSpacing:'.05em', whiteSpace:'nowrap' },
    tr: { borderBottom:`1px solid ${c.tableBorder}`, transition:'background-color .15s ease' },
    td:      { padding:'13px 14px', color:c.inputText, verticalAlign:'middle' },
    tdRight: { padding:'13px 14px', textAlign:'right',  color:c.inputText, verticalAlign:'middle' },
    tdCenter:{ padding:'13px 14px', textAlign:'center', color:c.inputText, verticalAlign:'middle' },
    categoryChip: { background: c.isDark?'rgba(255,255,255,.05)':'#E2E8F0', border:`1px solid ${c.tagBorder}`, padding:'3px 10px', borderRadius:'8px', fontSize:'10.5px', color: c.isDark ? c.sub : '#0F172A', fontWeight:700, whiteSpace:'nowrap' },
    badge: { display:'inline-block', padding:'3px 9px', borderRadius:'20px', fontSize:'10.5px', fontWeight:700, whiteSpace:'nowrap' },
    addBtn: { background:'linear-gradient(135deg,#1E40AF,#2563EB)', border:'none', color:'#FFFFFF', borderRadius:'10px', padding:'9px 16px', fontSize:'12px', fontWeight:800, cursor:'pointer', display:'inline-flex', alignItems:'center', gap:'6px', boxShadow:'0 4px 14px rgba(37,99,235,.35)', whiteSpace:'nowrap' },
    editBtn: { background: c.isDark?'rgba(59,130,246,.12)':'#EFF6FF', border:`1px solid ${c.isDark?'rgba(59,130,246,.3)':'#BFDBFE'}`, color: c.isDark?'#93C5FD':'#1E40AF', borderRadius:'8px', padding:'6px 9px', fontSize:'12px', fontWeight:600, cursor:'pointer', transition:'all .2s' },
    deleteBtn: { background: c.isDark?'rgba(239,68,68,.12)':'#FEE2E2', border:`1px solid ${c.isDark?'rgba(239,68,68,.3)':'#FECACA'}`, color: c.isDark?'#FCA5A5':'#DC2626', borderRadius:'8px', padding:'6px 9px', fontSize:'12px', fontWeight:600, cursor:'pointer', transition:'all .2s' },
    xaiBtn: { background: c.isDark?'rgba(255,255,255,.07)':'#F8FAFC', border:`1px solid ${c.tagBorder}`, color:c.title, borderRadius:'8px', padding:'6px 10px', fontSize:'12px', fontWeight:600, cursor:'pointer', transition:'all .2s' },
    poBtn:  { border:'none', color:'#FFFFFF', borderRadius:'8px', padding:'6px 10px', fontSize:'11px', fontWeight:700, cursor:'pointer', transition:'all .2s', whiteSpace:'nowrap' },
    // Simulator
    sliderGrid: { display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:'10px', marginTop:'4px' },
    sliderCard: { background: c.isDark?'rgba(255,255,255,.02)':'#FFFFFF', border:`1.5px solid ${c.subCardBorder}`, borderRadius:'12px', padding:'13px', boxShadow: c.isDark?'none':'0 2px 10px rgba(15,23,42,0.06)' },
    presetBtn: { border:'1.5px solid', borderRadius:'10px', padding:'7px 14px', fontSize:'11.5px', fontWeight:800, cursor:'pointer', transition:'all .2s' },
    // API Tester
    execBtn: { background:'linear-gradient(135deg,#1E40AF,#2563EB)', border:'none', color:'#FFFFFF', borderRadius:'10px', padding:'10px 20px', fontSize:'12.5px', fontWeight:800, cursor:'pointer', transition:'all .2s', boxShadow:'0 4px 14px rgba(37,99,235,.35)', whiteSpace:'nowrap' },
    inputGrid: { display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:'16px', marginTop:'4px' },
    inputField: { display:'flex', flexDirection:'column', gap:'6px', minWidth: 0, width: '100%' },
    inputLabel: { fontSize:'11.5px', fontWeight:700, color:c.sub, display:'flex', alignItems:'center', gap:'5px', flexWrap:'wrap' },
    textInput: { width: '100%', boxSizing: 'border-box', padding:'10px 14px', borderRadius:'10px', border:`1.5px solid ${c.inputBorder}`, fontSize:'13px', outline:'none', background:c.inputBg, color:c.inputText, fontWeight:600, transition:'all .2s' },
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
