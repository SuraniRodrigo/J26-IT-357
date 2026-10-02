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

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

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

        {/* Dynamic Content View */}
        <main style={styles.contentArea}>
          {renderActiveView()}
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
