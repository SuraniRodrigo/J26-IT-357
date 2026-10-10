import React, { useState } from 'react';
import Sidebar from './components/common/Sidebar';
import Header from './components/common/Header';
import Footer from './components/common/Footer';
import AuthModal from './components/common/AuthModal';

import DashboardView from './pages/Dashboard';
import DemandForecastingView from './pages/DemandForecasting';
import SupplyDisruptionView from './pages/SupplyDisruption';
import ProductionOptimizationView from './pages/ProductionOptimization';
import InventoryOptimizationView from './pages/InventoryOptimization';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error('OptiChain ErrorBoundary caught:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '32px',
          margin: '24px',
          backgroundColor: '#0f172a',
          border: '1px solid #ef4444',
          borderRadius: '12px',
          color: '#f8fafc',
          fontFamily: "'Inter', sans-serif"
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <span style={{ fontSize: '20px' }}>⚠️</span>
            <h2 style={{ color: '#ef4444', fontSize: '18px', fontWeight: 800, margin: 0 }}>
              Module Render Diagnostics
            </h2>
          </div>
          <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '16px' }}>
            {this.state.error?.message || 'An unexpected rendering error occurred in this view.'}
          </p>
          <pre style={{
            background: '#070a12',
            padding: '16px',
            borderRadius: '8px',
            fontSize: '11.5px',
            overflow: 'auto',
            color: '#fca5a5',
            lineHeight: 1.5,
            border: '1px solid #1e293b'
          }}>
            {this.state.error?.stack}
          </pre>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              marginTop: '16px',
              padding: '8px 18px',
              backgroundColor: '#3b82f6',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Retry View Render
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [activeTab, setActiveTab] = useState('inventory');

  // User Authentication State
  const [user, setUser] = useState({
    name: 'Shehan Senarathna',
    email: 'shehan@optichain.lk',
    role: 'Chief Engineer · Shift A-1',
    avatarText: 'SS',
  });

  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState('signin'); // 'signin' or 'signup'

  const handleOpenAuth = (mode = 'signin') => {
    setAuthMode(mode);
    setIsAuthOpen(true);
  };

  const handleLogin = (userData) => {
    setUser(userData);
    setIsAuthOpen(false);
  };

  const handleLogout = () => {
    setUser(null);
  };

  const renderActiveView = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView onNavigate={setActiveTab} />;
      case 'demand':
        return <DemandForecastingView />;
      case 'supply':
        return <SupplyDisruptionView />;
      case 'production':
        return <ProductionOptimizationView />;
      case 'inventory':
        return <InventoryOptimizationView />;
      default:
        return <DashboardView onNavigate={setActiveTab} />;
    }
  };

  return (
    <div style={styles.appLayout}>
      {/* Fixed Left Sidebar */}
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main App Content Area */}
      <div style={styles.mainContainer}>
        {/* Sticky Header with Search, Telemetry, and Auth Controls */}
        <Header
          user={user}
          onOpenAuth={handleOpenAuth}
          onLogout={handleLogout}
          activeTab={activeTab}
        />

        {/* Dynamic Content View with Error Boundary */}
        <main style={styles.contentArea}>
          <ErrorBoundary key={activeTab}>
            {renderActiveView()}
          </ErrorBoundary>
        </main>

        {/* Telemetry Footer with Clocks & API links */}
        <Footer />
      </div>

      {/* Sign In / Sign Up Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onLogin={handleLogin}
        initialMode={authMode}
      />
    </div>
  );
}

const styles = {
  appLayout: {
    display: 'flex',
    minHeight: '100vh',
    backgroundColor: '#0a0e17',
    color: '#f1f5f9',
    fontFamily: "'Inter', sans-serif",
  },
  mainContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
    overflowX: 'hidden',
  },
  contentArea: {
    flex: 1,
    backgroundColor: '#0a0e17',
    backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(30, 58, 138, 0.08) 0%, transparent 70%)',
    overflowY: 'auto',
  },
};
