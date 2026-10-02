import React, { useState } from 'react';

export default function Header({ user, onOpenAuth, onLogout, activeTab, onSearch }) {
  const [searchValue, setSearchValue] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const notifications = [
    { id: 1, title: 'Typhoon Yagi Disruption Alert', time: '10m ago', urgent: true, desc: 'Port Shanghai reroute: 72h lead time delay.' },
    { id: 2, title: 'Loom 4 Motor Failure Self-Healed', time: '1h ago', urgent: false, desc: 'Batch 410B transferred to Line Alpha.' },
    { id: 3, title: 'Organic Cotton Buffer Depleting', time: '2h ago', urgent: true, desc: '15,200 kg dynamic reorder recommendation active.' },
  ];

  return (
    <header style={styles.header}>
      {/* Search Bar & Factory Node Identifier */}
      <div style={styles.leftSection}>
        <div style={styles.searchContainer}>
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
            style={styles.searchInput}
          />
        </div>

        {/* Live Factory Node Badge */}
        <div style={styles.factoryNodeBadge}>
          <span style={styles.pingDot} className="pulse-dot" />
          <span style={styles.nodeText}>SL-FACTORY-NODE-01</span>
          <span style={styles.onlineBadge}>LIVE :8000</span>
        </div>
      </div>

      {/* Right Controls: Notifications & Auth/User Profile */}
      <div style={styles.rightSection}>
        {/* Notification Bell */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            style={styles.iconBtn}
            title="System Alert Stream"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
            <span style={styles.notificationDot} className="pulse-dot-red" />
          </button>

          {showNotifications && (
            <div style={styles.notifDropdown}>
              <div style={styles.notifHeader}>
                <span style={{ fontWeight: 700, fontSize: '12px', letterSpacing: '0.04em' }}>ACTIVE TELEMETRY ALERTS</span>
                <span style={styles.urgentBadge}>3 Critical</span>
              </div>
              {notifications.map((n) => (
                <div key={n.id} style={styles.notifItem}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: n.urgent ? '#ef4444' : '#10b981' }} />
                      <span style={{ fontSize: '12px', color: '#f1f5f9', fontWeight: 600 }}>{n.title}</span>
                    </div>
                    <span style={{ fontSize: '10px', color: '#64748b' }}>{n.time}</span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px', paddingLeft: '14px' }}>
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
              style={styles.profileBadge}
              onClick={() => setShowUserMenu(!showUserMenu)}
            >
              <div style={styles.avatar}>
                <span>{user.avatarText || 'CE'}</span>
                <span style={styles.avatarStatusDot} />
              </div>
              <div style={styles.userInfo}>
                <span style={styles.userName}>{user.name || 'Chief Engineer'}</span>
                <span style={styles.userRole}>{user.role || 'Shift A-1 · Active'}</span>
              </div>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" style={{ marginLeft: '4px' }}>
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </div>

            {/* Profile Dropdown Menu */}
            {showUserMenu && (
              <div style={styles.userDropdown}>
                <div style={styles.dropdownHeader}>
                  <strong style={{ fontSize: '12px', color: '#ffffff' }}>{user.name}</strong>
                  <span style={{ fontSize: '10px', color: '#38bdf8' }}>{user.email || 'engineer@optichain.lk'}</span>
                </div>
                <div style={styles.dropdownDivider} />
                <button
                  onClick={() => { setShowUserMenu(false); onOpenAuth('signup'); }}
                  style={styles.dropdownItem}
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
              style={styles.signInBtn}
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
    backgroundColor: '#0a0e17',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
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
    background: '#0f1626',
    border: '1px solid rgba(255, 255, 255, 0.09)',
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
    color: '#e2e8f0',
    fontSize: '13px',
    width: '100%',
    fontFamily: 'inherit',
  },
  factoryNodeBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: 'rgba(15, 22, 38, 0.7)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    padding: '6px 12px',
    borderRadius: '20px',
  },
  pingDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    backgroundColor: '#10b981',
  },
  nodeText: {
    fontSize: '10px',
    fontWeight: 700,
    letterSpacing: '0.06em',
    color: '#94a3b8',
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
    background: '#0f1626',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '10px',
    color: '#94a3b8',
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
    background: '#0f1626',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: '12px',
    padding: '14px',
    boxShadow: '0 12px 35px rgba(0, 0, 0, 0.6)',
    zIndex: 50,
  },
  notifHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: '10px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
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
    borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
  },
  authBtnGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  signInBtn: {
    background: '#0f1626',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    color: '#e2e8f0',
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
    background: '#0f1626',
    border: '1px solid rgba(255, 255, 255, 0.1)',
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
  },
  avatarStatusDot: {
    position: 'absolute',
    bottom: '-1px',
    right: '-1px',
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    background: '#10b981',
    border: '2px solid #0f1626',
  },
  userInfo: {
    display: 'flex',
    flexDirection: 'column',
  },
  userName: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#f1f5f9',
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
    background: '#0f1626',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: '12px',
    padding: '10px',
    boxShadow: '0 12px 35px rgba(0, 0, 0, 0.6)',
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
    background: 'rgba(255, 255, 255, 0.06)',
    margin: '6px 0',
  },
  dropdownItem: {
    width: '100%',
    padding: '8px 10px',
    background: 'none',
    border: 'none',
    color: '#cbd5e1',
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
