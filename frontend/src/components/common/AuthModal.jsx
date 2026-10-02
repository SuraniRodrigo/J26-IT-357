import React, { useState } from 'react';

export default function AuthModal({ isOpen, onClose, onLogin, initialMode = 'signin' }) {
  const [mode, setMode] = useState(initialMode); // 'signin' or 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('Production Line Optimization');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please fill in all required credentials.');
      return;
    }

    if (mode === 'signup' && !name) {
      setError('Please enter your full name.');
      return;
    }

    const userData = {
      name: mode === 'signup' ? name : (email.split('@')[0] || 'Chief Engineer'),
      email,
      role: mode === 'signup' ? department : 'Chief Engineer · Shift A-1',
      avatarText: (mode === 'signup' ? name : email).slice(0, 2).toUpperCase(),
    };

    onLogin(userData);
    onClose();
  };

  const handleQuickLogin = (roleName, roleTitle, roleEmail) => {
    const userData = {
      name: roleName,
      email: roleEmail,
      role: roleTitle,
      avatarText: roleName.split(' ').map(w => w[0]).join('').slice(0, 2),
    };
    onLogin(userData);
    onClose();
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Close Button */}
        <button style={styles.closeBtn} onClick={onClose} title="Close">✕</button>

        {/* Modal Brand Header */}
        <div style={styles.modalHeader}>
          <div style={styles.logoBadge}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2.2">
              <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
              <polyline points="2 17 12 22 22 17"></polyline>
              <polyline points="2 12 12 17 22 12"></polyline>
            </svg>
          </div>
          <h2 style={styles.title}>OPTICHAIN ACCESS GATEWAY</h2>
          <p style={styles.subtitle}>
            Sri Lankan Garment Factory Decision Support Terminal
          </p>
        </div>

        {/* Tab Switcher: Sign In vs Sign Up */}
        <div style={styles.tabContainer}>
          <button
            onClick={() => { setMode('signin'); setError(''); }}
            style={{
              ...styles.tabBtn,
              background: mode === 'signin' ? '#1e293b' : 'transparent',
              color: mode === 'signin' ? '#ffffff' : '#64748b',
              borderBottom: mode === 'signin' ? '2px solid #38bdf8' : '2px solid transparent',
            }}
          >
            Sign In to Terminal
          </button>
          <button
            onClick={() => { setMode('signup'); setError(''); }}
            style={{
              ...styles.tabBtn,
              background: mode === 'signup' ? '#1e293b' : 'transparent',
              color: mode === 'signup' ? '#ffffff' : '#64748b',
              borderBottom: mode === 'signup' ? '2px solid #38bdf8' : '2px solid transparent',
            }}
          >
            Register Terminal Access
          </button>
        </div>

        {/* Error message if any */}
        {error && (
          <div style={styles.errorBox}>
            <span>⚠</span> {error}
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={styles.form}>
          {mode === 'signup' && (
            <>
              <div style={styles.inputGroup}>
                <label style={styles.label}>FULL NAME</label>
                <input
                  type="text"
                  placeholder="e.g. Shehan Senarathna"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={styles.input}
                  required
                />
              </div>

              <div style={styles.inputGroup}>
                <label style={styles.label}>FACTORY DEPARTMENT / ROLE</label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  style={styles.select}
                >
                  <option value="Executive Production Architecture">Executive Production Architecture</option>
                  <option value="Demand Planning & Market Prophet">Demand Planning & Market Prophet</option>
                  <option value="Procurement & Supplier Risk">Procurement & Supplier Risk</option>
                  <option value="Inventory Control & Adaptive Buffers">Inventory Control & Adaptive Buffers</option>
                  <option value="Line Floor Operations & Self-Healing">Line Floor Operations & Self-Healing</option>
                </select>
              </div>
            </>
          )}

          <div style={styles.inputGroup}>
            <label style={styles.label}>ENTERPRISE ID / EMAIL</label>
            <input
              type="email"
              placeholder="engineer@optichain.app"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
              required
            />
          </div>

          <div style={styles.inputGroup}>
            <label style={styles.label}>SECURITY KEY / PASSWORD</label>
            <div style={styles.passwordWrapper}>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={styles.passwordInput}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={styles.eyeBtn}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <div style={styles.rememberRow}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px', color: '#94a3b8' }}>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{ accentColor: '#38bdf8' }}
              />
              Remember this factory terminal
            </label>
            <a href="#reset" onClick={(e) => { e.preventDefault(); alert('Password reset link sent to registered factory supervisor.'); }} style={styles.forgotLink}>
              Forgot key?
            </a>
          </div>

          <button type="submit" style={styles.submitBtn}>
            {mode === 'signin' ? 'Authenticate & Enter OptiChain' : 'Register Terminal Clearance'}
          </button>
        </form>

        {/* Quick Demo Logins Section */}
        <div style={styles.quickLoginSection}>
          <div style={styles.quickDivider}>
            <span>ONE-CLICK DEMO CLEARANCE</span>
          </div>

          <div style={styles.quickBtnGrid}>
            <button
              onClick={() => handleQuickLogin('Shehan Senarathna', 'Chief Engineer · Shift A-1', 'shehan@optichain.lk')}
              style={styles.quickRoleBtn}
            >
              <span style={{ color: '#38bdf8' }}>⚙</span>
              <div>
                <strong>Shehan Senarathna</strong>
                <small>Chief Engineer (Full Access)</small>
              </div>
            </button>

            <button
              onClick={() => handleQuickLogin('Herath H.M.C.P', 'Lead Risk Profiler · Procurement', 'herath@optichain.lk')}
              style={styles.quickRoleBtn}
            >
              <span style={{ color: '#f59e0b' }}>🛡</span>
              <div>
                <strong>Procurement Lead</strong>
                <small>Supply Disruption</small>
              </div>
            </button>

            <button
              onClick={() => handleQuickLogin('Line Supervisor', 'Floor Controller · Line Alpha', 'line.lead@optichain.lk')}
              style={styles.quickRoleBtn}
            >
              <span style={{ color: '#10b981' }}>⚡</span>
              <div>
                <strong>Line Supervisor</strong>
                <small>Self-Healing Ops</small>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(5, 8, 16, 0.85)',
    backdropFilter: 'blur(10px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    padding: '20px',
  },
  modal: {
    background: '#0d1322',
    border: '1px solid rgba(56, 189, 248, 0.35)',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.8), 0 0 35px rgba(56, 189, 248, 0.15)',
    borderRadius: '18px',
    width: '100%',
    maxWidth: '520px',
    padding: '32px',
    position: 'relative',
    color: '#ffffff',
  },
  closeBtn: {
    position: 'absolute',
    top: '18px',
    right: '20px',
    background: 'none',
    border: 'none',
    color: '#64748b',
    fontSize: '18px',
    cursor: 'pointer',
    padding: '4px 8px',
  },
  modalHeader: {
    textAlign: 'center',
    marginBottom: '20px',
  },
  logoBadge: {
    width: '46px',
    height: '46px',
    borderRadius: '12px',
    background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
    border: '1px solid rgba(56, 189, 248, 0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 12px',
    boxShadow: '0 0 15px rgba(56, 189, 248, 0.25)',
  },
  title: {
    fontSize: '18px',
    fontWeight: 800,
    letterSpacing: '0.08em',
    color: '#f8fafc',
    fontFamily: 'Outfit, sans-serif',
  },
  subtitle: {
    fontSize: '12px',
    color: '#94a3b8',
    marginTop: '4px',
  },
  tabContainer: {
    display: 'flex',
    background: '#080c16',
    borderRadius: '8px',
    padding: '4px',
    marginBottom: '20px',
  },
  tabBtn: {
    flex: 1,
    padding: '10px',
    border: 'none',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  errorBox: {
    background: 'rgba(239, 68, 68, 0.12)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    borderRadius: '8px',
    padding: '10px 14px',
    color: '#f87171',
    fontSize: '12px',
    marginBottom: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '10px',
    fontWeight: 700,
    letterSpacing: '0.08em',
    color: '#64748b',
  },
  input: {
    background: '#080c16',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '8px',
    padding: '11px 14px',
    color: '#ffffff',
    fontSize: '13px',
    outline: 'none',
    transition: 'border 0.2s',
  },
  select: {
    background: '#080c16',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '8px',
    padding: '11px 14px',
    color: '#ffffff',
    fontSize: '13px',
    outline: 'none',
  },
  passwordWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  passwordInput: {
    background: '#080c16',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '8px',
    padding: '11px 14px',
    color: '#ffffff',
    fontSize: '13px',
    outline: 'none',
    width: '100%',
  },
  eyeBtn: {
    position: 'absolute',
    right: '12px',
    background: 'none',
    border: 'none',
    color: '#64748b',
    fontSize: '11px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  rememberRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  forgotLink: {
    fontSize: '11px',
    color: '#38bdf8',
    textDecoration: 'none',
  },
  submitBtn: {
    background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
    border: 'none',
    borderRadius: '10px',
    color: '#ffffff',
    padding: '13px',
    fontSize: '13px',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 4px 18px rgba(37, 99, 235, 0.35)',
    marginTop: '6px',
    transition: 'all 0.2s',
  },
  quickLoginSection: {
    marginTop: '22px',
    borderTop: '1px solid rgba(255, 255, 255, 0.06)',
    paddingTop: '16px',
  },
  quickDivider: {
    textAlign: 'center',
    marginBottom: '12px',
    fontSize: '9px',
    fontWeight: 800,
    letterSpacing: '0.1em',
    color: '#64748b',
  },
  quickBtnGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '8px',
  },
  quickRoleBtn: {
    background: '#080c16',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '8px',
    padding: '8px 10px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    gap: '4px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    color: '#cbd5e1',
    fontSize: '11px',
  },
};
