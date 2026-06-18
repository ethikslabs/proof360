import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect, Component } from 'react';
import { FeatureFlagProvider } from './contexts/FeatureFlagContext';
import AdminPreread from './pages/AdminPreread';
import Portal from './pages/Portal';
import PortalDashboard from './pages/PortalDashboard';
import PortalLeadDetail from './pages/PortalLeadDetail';
import FounderAuth from './pages/FounderAuth';
import FounderDashboard from './pages/FounderDashboard';
import Chat from './pages/Chat';
import Journey from './pages/Journey';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ minHeight: '100vh', background: '#0a0d14', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40 }}>
          <div style={{ maxWidth: 520, textAlign: 'center' }}>
            <p style={{ color: '#ef4444', fontFamily: 'monospace', fontSize: 11, letterSpacing: '2px', marginBottom: 16 }}>RENDER ERROR</p>
            <p style={{ color: '#94a3b8', fontSize: 14, marginBottom: 20 }}>{this.state.error.message}</p>
            <button
              onClick={() => { this.setState({ error: null }); window.location.href = '/'; }}
              style={{ background: '#5eead4', color: '#0a0d14', border: 'none', borderRadius: 8, padding: '10px 24px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
            >
              Back to home
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <BrowserRouter>
      <FeatureFlagProvider>
        <ErrorBoundary>
          <ScrollToTop />
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('proof360:telegram'))}
            title="Message John"
            style={{
              position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
              width: 48, height: 48, borderRadius: '50%',
              background: '#229ED9', display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(0,0,0,0.4)', border: 'none', cursor: 'pointer',
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8l-1.68 7.92c-.12.56-.44.7-.9.44l-2.48-1.83-1.2 1.15c-.13.13-.24.24-.5.24l.18-2.52 4.56-4.12c.2-.18-.04-.28-.3-.1L7.82 14.4l-2.44-.76c-.53-.17-.54-.53.11-.78l9.54-3.68c.44-.16.82.11.61.62z"/>
            </svg>
          </button>
          <Routes>
            <Route path="/" element={<Navigate to="/chat" replace />} />
            <Route path="/portal" element={<Portal />} />
            <Route path="/portal/callback" element={<Portal />} />
            <Route path="/portal/dashboard" element={<PortalDashboard />} />
            <Route path="/portal/leads/:leadId" element={<PortalLeadDetail />} />
            <Route path="/account/login" element={<FounderAuth />} />
            <Route path="/account" element={<FounderDashboard />} />
            <Route path="/admin/preread" element={<AdminPreread />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/journey" element={<Journey />} />
          </Routes>
        </ErrorBoundary>
      </FeatureFlagProvider>
    </BrowserRouter>
  );
}
