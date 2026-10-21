import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';

export default function Header({ user, onOpenAuth, onLogout, activeTab, onSearch }) {
  const { isDark } = useTheme();
  const [searchValue, setSearchValue] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const notifications = [
    { id: 1, title: 'Typhoon Yagi Disruption Alert', time: '10m ago', urgent: true, desc: 'Port Shanghai reroute: 72h lead time delay.' },
    { id: 2, title: 'Loom 4 Motor Failure Self-Healed', time: '1h ago', urgent: false, desc: 'Batch 410B transferred to Line Alpha.' },
    { id: 3, title: 'Organic Cotton Buffer Depleting', time: '2h ago', urgent: true, desc: '15,200 kg dynamic reorder recommendation active.' },
  ];

  const th = {
    header: {
      height: '68px',
      backgroundColor: isDark ? 'rgba(10,14,23,0.9)' : 'rgba(255,255,255,0.95)',
      borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.1)'}`,
      color: isDark ? '#f1f5f9' : '#0f172a',
    },
    searchContainer: {
      background: isDark ? '#0f1626' : '#f8fafc',
      border: `1px solid ${isDark ? 'rgba(255,255,255,0.09)' : 'rgba(15,23,42,0.12)'}`,
    },
    searchInput: {
      color: isDark ? '#e2e8f0' : '#0f172a',
    },
    factoryNodeBadge: {
      background: isDark ? 'rgba(15,22,38,0.7)' : 'rgba(241,245,249,0.9)',
      border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.1)'}`,
    },
    iconBtn: {
      background: isDark ? '#0f1626' : '#f8fafc',
      border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.1)'}`,
      color: isDark ? '#94a3b8' : '#64748b',
    },
    notifDropdown: {
      background: isDark ? '#0f1626' : '#ffffff',
      border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(15,23,42,0.12)'}`,
      boxShadow: isDark ? '0 12px 35px rgba(0,0,0,0.6)' : '0 12px 35px rgba(15,23,42,0.12)',
    },
    notifHeader: {
      borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.06)'}`,
    },
    notifTitle: {
      color: isDark ? '#f1f5f9' : '#0f172a',
    },
    notifDesc: {
      color: isDark ? '#94a3b8' : '#64748b',
    },
    profileBadge: {
      background: isDark ? '#0f1626' : '#f8fafc',
      border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(15,23,42,0.1)'}`,
    },
    avatarStatusBorder: {
      border: `2px solid ${isDark ? '#0f1626' : '#f8fafc'}`,
    },
    userDropdown: {
      background: isDark ? '#0f1626' : '#ffffff',
      border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(15,23,42,0.12)'}`,
      boxShadow: isDark ? '0 12px 35px rgba(0,0,0,0.6)' : '0 12px 35px rgba(15,23,42,0.12)',
    },
    dropdownDivider: {
      background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.06)',
    },
    signInBtn: {
      background: isDark ? '#0f1626' : '#f8fafc',
      border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(15,23,42,0.12)'}`,
      color: isDark ? '#e2e8f0' : '#0f172a',
    },
    clockValue: {
      background: isDark ? 'rgba(15,22,38,0.8)' : 'rgba(241,245,249,0.9)',
      border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.1)'}`,
    },
    dropdownItem: {
      color: isDark ? '#cbd5e1' : '#334155',
    },
    headerText: {
      color: isDark ? '#f1f5f9' : '#0f172a',
      fontWeight: 700,
      fontSize: '12px',
    },
    userEmail: {
      fontSize: '10px',
      color: '#38bdf8',
    },
  };

  return (
    <header style={{ ...styles.header, ...th.header }}>
      {/* Search Bar & Factory Node Identifier */}
      <div style={styles.leftSection}>
        <div style={{ ...styles.searchContainer, ...th.searchContainer }}>
          <svg style={styles.searchIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            type="text"
            placeholder="Search telemetry, SKUs, lines, suppliers... (⌘K)"
            value={searchValue}
            onChange={(e) => {
              setSearchValue(e.target.value);
              if (onSearch) onSearch(e.target.value);
            }}
            style={{ ...styles.searchInput, ...th.searchInput }}
          />
        </div>

        {/* Live Factory Node Badge */}
        <div style={{ ...styles.factoryNodeBadge, ...th.factoryNodeBadge }}>
          <span style={styles.pingDot} className="pulse-dot" />
          <span style={{ ...styles.nodeText, color: isDark ? '#94a3b8' : '#64748b' }}>SL-FACTORY-NODE-01</span>
          <span style={styles.onlineBadge}>LIVE :8000</span>
        </div>
      </div>

      {/* Right Controls: Notifications & Auth/User Profile */}
      <div style={styles.rightSection}>
        {/* Notification Bell */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            style={{ ...styles.iconBtn, ...th.iconBtn }}
            title="System Alert Stream"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
            <span style={styles.notificationDot} className="pulse-dot-red" />
          </button>

          {showNotifications && (
            <div style={{ ...styles.notifDropdown, ...th.notifDropdown }}>
              <div style={{ ...styles.notifHeader, ...th.notifHeader }}>
                <span style={{ fontWeight: 700, fontSize: '12px', letterSpacing: '0.04em', color: isDark ? '#f1f5f9' : '#0f172a' }}>ACTIVE TELEMETRY ALERTS</span>
                <span style={styles.urgentBadge}>3 Critical</span>
              </div>
              {notifications.map((n) => (
                <div key={n.id} style={styles.notifItem}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: n.urgent ? '#ef4444' : '#10b981', flexShrink: 0 }} />
                      <span style={{ fontSize: '12px', fontWeight: 600, ...th.notifTitle }}>{n.title}</span>
                    </div>
                    <span style={{ fontSize: '10px', color: '#64748b' }}>{n.time}</span>
                  </div>
                  <div style={{ fontSize: '11px', marginTop: '4px', paddingLeft: '14px', ...th.notifDesc }}>
                    {n.desc}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* User Profile / Auth Action Buttons */}
        {user ? (
          <div style={{ position: 'relative' }}>
            <div
              style={{ ...styles.profileBadge, ...th.profileBadge }}
              onClick={() => setShowUserMenu(!showUserMenu)}
            >
              <div style={styles.avatar}>
                <span>{user.avatarText || 'CE'}</span>
                <span style={{ ...styles.avatarStatusDot, ...th.avatarStatusBorder }} />
              </div>
              <div style={styles.userInfo}>
                <span style={{ ...styles.userName, color: isDark ? '#f1f5f9' : '#0f172a' }}>{user.name || 'Chief Engineer'}</span>
                <span style={styles.userRole}>{user.role || 'Shift A-1 · Active'}</span>
              </div>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" style={{ marginLeft: '4px' }}>
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </div>

            {/* Profile Dropdown Menu */}
            {showUserMenu && (
              <div style={{ ...styles.userDropdown, ...th.userDropdown }}>
                <div style={styles.dropdownHeader}>
                  <strong style={th.headerText}>{user.name}</strong>
                  <span style={th.userEmail}>{user.email || 'engineer@optichain.lk'}</span>
                </div>
                <div style={{ ...styles.dropdownDivider, ...th.dropdownDivider }} />
                <button
                  onClick={() => { setShowUserMenu(false); onOpenAuth('signup'); }}
                  style={{ ...styles.dropdownItem, ...th.dropdownItem }}
                >
                  <span>+</span> Register New Terminal Clearance
                </button>
                <button
                  onClick={() => { setShowUserMenu(false); onLogout(); }}
                  style={{ ...styles.dropdownItem, color: '#f87171' }}
                >
                  <span>⇥</span> Sign Out from Session
                </button>
              </div>
            )}
          </div>
        ) : (
          <div style={styles.authBtnGroup}>
            <button
              onClick={() => onOpenAuth('signin')}
              style={{ ...styles.signInBtn, ...th.signInBtn }}
            >
              Sign In
            </button>
            <button
              onClick={() => onOpenAuth('signup')}
              style={styles.signUpBtn}
            >
              Sign Up
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

const styles = {
  header: {
    height: '68px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 28px',
    position: 'sticky',
    top: 0,
    zIndex: 40,
    backdropFilter: 'blur(12px)',
  },
  leftSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
  },
  searchContainer: {
    display: 'flex',
    alignItems: 'center',
    borderRadius: '10px',
    padding: '9px 16px',
    width: '420px',
    transition: 'border 0.2s',
  },
  searchIcon: {
    color: '#64748b',
    marginRight: '10px',
    flexShrink: 0,
  },
  searchInput: {
    background: 'transparent',
    border: 'none',
    outline: 'none',
    fontSize: '13px',
    width: '100%',
    fontFamily: 'inherit',
  },
  factoryNodeBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 12px',
    borderRadius: '20px',
  },
  pingDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    backgroundColor: '#10b981',
    flexShrink: 0,
  },
  nodeText: {
    fontSize: '10px',
    fontWeight: 700,
    letterSpacing: '0.06em',
    fontFamily: 'monospace',
  },
  onlineBadge: {
    fontSize: '9px',
    fontWeight: 700,
    color: '#34d399',
    background: 'rgba(16, 185, 129, 0.12)',
    padding: '2px 6px',
    borderRadius: '4px',
  },
  rightSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '18px',
  },
  iconBtn: {
    borderRadius: '10px',
    width: '40px',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    position: 'relative',
    transition: 'all 0.2s',
  },
  notificationDot: {
    position: 'absolute',
    top: '8px',
    right: '8px',
    width: '7px',
    height: '7px',
    borderRadius: '50%',
    backgroundColor: '#ef4444',
  },
  notifDropdown: {
    position: 'absolute',
    top: '52px',
    right: 0,
    width: '340px',
    borderRadius: '12px',
    padding: '14px',
    zIndex: 50,
  },
  notifHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: '10px',
    marginBottom: '8px',
  },
  urgentBadge: {
    background: 'rgba(239, 68, 68, 0.15)',
    color: '#f87171',
    borderRadius: '6px',
    padding: '2px 8px',
    fontSize: '10px',
    fontWeight: 700,
  },
  notifItem: {
    padding: '10px 8px',
    borderRadius: '8px',
  },
  authBtnGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  signInBtn: {
    padding: '8px 16px',
    borderRadius: '8px',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  signUpBtn: {
    background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
    border: 'none',
    color: '#ffffff',
    padding: '8px 18px',
    borderRadius: '8px',
    fontSize: '12px',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 2px 10px rgba(37, 99, 235, 0.35)',
    transition: 'all 0.2s',
  },
  profileBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    borderRadius: '30px',
    padding: '4px 14px 4px 6px',
    cursor: 'pointer',
    userSelect: 'none',
  },
  avatar: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #2563eb 0%, #0284c7 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#ffffff',
    fontSize: '12px',
    fontWeight: 700,
    position: 'relative',
    flexShrink: 0,
  },
  avatarStatusDot: {
    position: 'absolute',
    bottom: '-1px',
    right: '-1px',
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: '#10b981',
  },
  userInfo: {
    display: 'flex',
    flexDirection: 'column',
  },
  userName: {
    fontSize: '12px',
    fontWeight: 600,
    lineHeight: 1.2,
  },
  userRole: {
    fontSize: '10px',
    color: '#94a3b8',
    lineHeight: 1.2,
  },
  userDropdown: {
    position: 'absolute',
    top: '48px',
    right: 0,
    width: '240px',
    borderRadius: '12px',
    padding: '10px',
    zIndex: 50,
  },
  dropdownHeader: {
    padding: '8px',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  dropdownDivider: {
    height: '1px',
    margin: '6px 0',
  },
  dropdownItem: {
    width: '100%',
    padding: '8px 10px',
    background: 'none',
    border: 'none',
    fontSize: '11px',
    fontWeight: 600,
    textAlign: 'left',
    borderRadius: '6px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'background 0.2s',
  },
};