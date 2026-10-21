import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';

export default function Sidebar({ activeTab, setActiveTab }) {
  const { isDark, toggleTheme } = useTheme();
  const [iconAnimating, setIconAnimating] = useState(false);

  const handleToggle = () => {
    setIconAnimating(true);
    toggleTheme();
    setTimeout(() => setIconAnimating(false), 400);
  };

  const navItems = [
    {
      id: 'dashboard',
      label: 'Executive Overview',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="7" height="7"></rect>
          <rect x="14" y="3" width="7" height="7"></rect>
          <rect x="14" y="14" width="7" height="7"></rect>
          <rect x="3" y="14" width="7" height="7"></rect>
        </svg>
      ),
    },
    {
      id: 'demand',
      label: 'Demand Forecasting',
      badge: 'Market Prophet',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
          <polyline points="17 6 23 6 23 12"></polyline>
        </svg>
      ),
    },
    {
      id: 'supply',
      label: 'Supply Disruption',
      badge: 'Procurement Guardian',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
          <line x1="12" y1="9" x2="12" y2="13"></line>
          <line x1="12" y1="17" x2="12.01" y2="17"></line>
        </svg>
      ),
    },
    {
      id: 'production',
      label: 'Production Optimizer',
      badge: 'Line Optimizer',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
        </svg>
      ),
    },
    {
      id: 'inventory',
      label: 'Smart Inventory',
      badge: 'Inventory Guardian',
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="16.5" y1="9.4" x2="7.5" y2="4.21"></line>
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
          <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
          <line x1="12" y1="22.08" x2="12" y2="12"></line>
        </svg>
      ),
    },
  ];

  return (
    <aside style={{
      ...styles.sidebar,
      backgroundColor: isDark ? '#070a12' : '#ffffff',
      borderRight: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(15,23,42,0.1)'}`,
    }}>
      {/* Brand Logo Header */}
      <div style={{
        ...styles.brandContainer,
        borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.08)'}`,
      }}>
        <div style={styles.logoIcon}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.2">
            <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
            <polyline points="2 17 12 22 22 17"></polyline>
            <polyline points="2 12 12 17 22 12"></polyline>
          </svg>
        </div>
        <div>
          <div style={styles.brandTitle}>OPTICHAIN</div>
          <div style={styles.brandSubtitle}>CDAI RESEARCH PROJECT</div>
        </div>
      </div>

      {/* Nav List */}
      <nav style={styles.nav}>
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              style={{
                ...styles.navBtn,
                backgroundColor: isActive
                  ? isDark ? 'rgba(59,130,246,0.16)' : 'rgba(37,99,235,0.09)'
                  : 'transparent',
                borderColor: isActive ? '#3b82f6' : 'transparent',
                color: isActive
                  ? '#60a5fa'
                  : isDark ? '#94a3b8' : '#475569',
              }}
            >
              <span style={{ ...styles.iconWrap, color: isActive ? '#60a5fa' : isDark ? '#64748b' : '#64748b' }}>
                {item.icon}
              </span>
              <span style={styles.navLabel}>{item.label}</span>
              {isActive && <div style={styles.activeGlow} />}
            </button>
          );
        })}
      </nav>

      {/* Sidebar Footer: System Ready + Theme Toggle */}
      <div style={{
        ...styles.footerContainer,
        borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.08)'}`,
      }}>
        {/* System Ready Badge */}
        <div style={{
          ...styles.systemReadyBadge,
          background: isDark ? 'rgba(16,185,129,0.06)' : 'rgba(16,185,129,0.08)',
          border: `1px solid ${isDark ? 'rgba(16,185,129,0.2)' : 'rgba(16,185,129,0.3)'}`,
          marginBottom: '10px',
        }}>
          <span style={styles.pulsingDot} className="pulse-dot" />
          <span style={{
            ...styles.readyText,
            color: isDark ? '#34d399' : '#059669',
          }}>SYSTEM READY</span>
        </div>

        {/* Theme Toggle Row */}
        <div style={styles.toggleRow}>
          {/* Sun icon */}
          <svg
            width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke={!isDark ? '#f59e0b' : '#64748b'}
            strokeWidth="2"
            style={{ flexShrink: 0, transition: 'stroke 0.2s' }}
          >
            <circle cx="12" cy="12" r="5"></circle>
            <line x1="12" y1="1" x2="12" y2="3"></line>
            <line x1="12" y1="21" x2="12" y2="23"></line>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
            <line x1="1" y1="12" x2="3" y2="12"></line>
            <line x1="21" y1="12" x2="23" y2="12"></line>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
          </svg>

          {/* Toggle Switch */}
          <button
            onClick={handleToggle}
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            aria-label="Toggle theme"
            style={{
              ...styles.toggleTrack,
              background: isDark
                ? 'linear-gradient(135deg,#1e293b,#0f172a)'
                : 'linear-gradient(135deg,#bfdbfe,#93c5fd)',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(37,99,235,0.25)'}`,
            }}
          >
            <span
              style={{
                ...styles.toggleThumb,
                transform: isDark ? 'translateX(0)' : 'translateX(20px)',
                background: isDark ? '#334155' : '#ffffff',
                boxShadow: isDark
                  ? '0 1px 4px rgba(0,0,0,0.5)'
                  : '0 1px 6px rgba(37,99,235,0.3)',
              }}
              className={iconAnimating ? 'theme-toggle-pop' : ''}
            />
          </button>

          {/* Moon icon */}
          <svg
            width="13" height="13" viewBox="0 0 24 24" fill="none"
            stroke={isDark ? '#818cf8' : '#64748b'}
            strokeWidth="2"
            style={{ flexShrink: 0, transition: 'stroke 0.2s' }}
          >
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
          </svg>

          <span style={{
            ...styles.toggleLabel,
            color: isDark ? '#475569' : '#94a3b8',
          }}>
            {isDark ? 'DARK' : 'LIGHT'}
          </span>
        </div>
      </div>
    </aside>
  );
}

const styles = {
  sidebar: {
    width: '260px',
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    position: 'sticky',
    top: 0,
    zIndex: 50,
  },
  brandContainer: {
    padding: '24px 20px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  logoIcon: {
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    background: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 0 15px rgba(37, 99, 235, 0.4)',
    flexShrink: 0,
  },
  brandTitle: {
    fontSize: '18px',
    fontWeight: 800,
    fontFamily: 'Outfit, sans-serif',
    letterSpacing: '0.05em',
    color: '#3b82f6',
  },
  brandSubtitle: {
    fontSize: '9px',
    fontWeight: 700,
    letterSpacing: '0.12em',
    color: '#38bdf8',
    textTransform: 'uppercase',
  },
  nav: {
    padding: '20px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    flex: 1,
  },
  navBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 14px',
    borderRadius: '10px',
    border: '1px solid transparent',
    background: 'none',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    position: 'relative',
    overflow: 'hidden',
    width: '100%',
  },
  iconWrap: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navLabel: {
    fontSize: '13px',
    fontWeight: 500,
    letterSpacing: '0.01em',
  },
  activeGlow: {
    position: 'absolute',
    left: 0,
    top: '20%',
    height: '60%',
    width: '3px',
    backgroundColor: '#3b82f6',
    borderRadius: '0 4px 4px 0',
    boxShadow: '0 0 10px #3b82f6',
  },
  footerContainer: {
    padding: '16px 16px 18px',
  },
  systemReadyBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 14px',
    borderRadius: '8px',
  },
  pulsingDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#10b981',
    flexShrink: 0,
  },
  readyText: {
    fontSize: '11px',
    fontWeight: 700,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
  },
  toggleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '4px 4px',
  },
  toggleTrack: {
    width: '44px',
    height: '24px',
    borderRadius: '12px',
    position: 'relative',
    cursor: 'pointer',
    padding: 0,
    flexShrink: 0,
    transition: 'background 0.3s ease, border 0.3s ease',
  },
  toggleThumb: {
    display: 'block',
    width: '18px',
    height: '18px',
    borderRadius: '50%',
    position: 'absolute',
    top: '2px',
    left: '2px',
    transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.3s ease',
  },
  toggleLabel: {
    fontSize: '9px',
    fontWeight: 700,
    letterSpacing: '0.1em',
    fontFamily: 'monospace',
  },
};