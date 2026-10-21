import React, { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';

export default function Footer() {
  const { isDark } = useTheme();
  const [slstTime, setSlstTime] = useState('');
  const [utcTime, setUtcTime] = useState('');

  useEffect(() => {
    const updateClocks = () => {
      const now = new Date();
      setSlstTime(
        now.toLocaleTimeString('en-US', {
          timeZone: 'Asia/Colombo',
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
      setUtcTime(
        now.toLocaleTimeString('en-US', {
          timeZone: 'UTC',
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    };

    updateClocks();
    const interval = setInterval(updateClocks, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <footer style={{
      ...styles.footer,
      backgroundColor: isDark ? '#070a12' : '#ffffff',
      borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.1)'}`,
      color: isDark ? '#94a3b8' : '#64748b',
    }}>
      {/* Left side: Telemetry & Engine Nodes */}
      <div style={styles.left}>
        <div style={styles.statusGroup}>
          <span style={styles.liveIndicator} className="pulse-dot" />
          <span style={{ ...styles.systemName, color: isDark ? '#f1f5f9' : '#0f172a' }}>OPTICHAIN ENGINE</span>
        </div>

        <div style={{ ...styles.divider, background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)' }} />

        <div style={styles.infoPill}>
          <span style={{ color: isDark ? '#64748b' : '#94a3b8' }}>Gateway:</span>
          <strong style={{ color: '#38bdf8' }}>FastAPI :8000 (12ms)</strong>
        </div>

        <div style={styles.infoPill}>
          <span style={{ color: isDark ? '#64748b' : '#94a3b8' }}>Disruption Engine:</span>
          <strong style={{ color: '#10b981' }}>Autonomous Healing Active</strong>
        </div>

        <div style={styles.infoPill}>
          <span style={{ color: isDark ? '#64748b' : '#94a3b8' }}>Contracts:</span>
          <strong style={{ color: isDark ? '#cbd5e1' : '#334155' }}>5 Schema-Enforced</strong>
        </div>
      </div>

      {/* Right side: Real-time clocks & Documentation links */}
      <div style={styles.right}>
        <div style={styles.clockContainer}>
          <span style={styles.clockLabel}>SLST (COLOMBO):</span>
          <span style={{
            ...styles.clockValue,
            background: isDark ? 'rgba(15,22,38,0.8)' : 'rgba(241,245,249,0.9)',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.1)'}`,
          }}>{slstTime || '19:10:00'}</span>
        </div>

        <div style={styles.clockContainer}>
          <span style={styles.clockLabel}>UTC:</span>
          <span style={{
            ...styles.clockValue,
            color: isDark ? '#94a3b8' : '#64748b',
            background: isDark ? 'rgba(15,22,38,0.8)' : 'rgba(241,245,249,0.9)',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.1)'}`,
          }}>{utcTime || '13:40:00'}Z</span>
        </div>

        <div style={{ ...styles.divider, background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)' }} />

        <a
          href="http://127.0.0.1:8000/docs"
          target="_blank"
          rel="noreferrer"
          style={{
            ...styles.apiLink,
            background: isDark ? '#0f1626' : '#f8fafc',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.1)'}`,
            color: isDark ? '#cbd5e1' : '#334155',
          }}
          title="Open FastAPI Swagger Interactive Specification"
        >
          <span>API Docs</span>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
            <polyline points="15 3 21 3 21 9"></polyline>
            <line x1="10" y1="14" x2="21" y2="3"></line>
          </svg>
        </a>

        <span style={{
          ...styles.versionBadge,
          color: isDark ? '#64748b' : '#94a3b8',
          background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(15,23,42,0.04)',
        }}>v1.0.4-PROD</span>
      </div>
    </footer>
  );
}

const styles = {
  footer: {
    height: '46px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 28px',
    fontSize: '11px',
    position: 'sticky',
    bottom: 0,
    zIndex: 30,
    backdropFilter: 'blur(12px)',
  },
  left: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
  },
  statusGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  liveIndicator: {
    width: '7px',
    height: '7px',
    borderRadius: '50%',
    backgroundColor: '#10b981',
    flexShrink: 0,
  },
  systemName: {
    fontWeight: 700,
    letterSpacing: '0.06em',
    fontSize: '10px',
  },
  divider: {
    width: '1px',
    height: '16px',
  },
  infoPill: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '11px',
  },
  right: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
  },
  clockContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  clockLabel: {
    fontSize: '9px',
    fontWeight: 700,
    letterSpacing: '0.06em',
    color: '#64748b',
  },
  clockValue: {
    fontFamily: 'monospace',
    fontWeight: 600,
    color: '#38bdf8',
    borderRadius: '4px',
    padding: '2px 6px',
  },
  apiLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    textDecoration: 'none',
    fontWeight: 600,
    padding: '3px 8px',
    borderRadius: '4px',
    transition: 'all 0.2s',
  },
  versionBadge: {
    fontSize: '10px',
    fontFamily: 'monospace',
    padding: '2px 6px',
    borderRadius: '4px',
  },
};