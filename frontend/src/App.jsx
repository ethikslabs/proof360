import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect, Component } from 'react';
import { FeatureFlagProvider } from './contexts/FeatureFlagContext';
import AdminPreread from './pages/AdminPreread';
import Home from './pages/Home';
import Audit from './pages/Audit';
import AuditReading from './pages/AuditReading';
import AuditColdRead from './pages/AuditColdRead';
import Processing from './pages/Processing';
import Report from './pages/Report';
import Portal from './pages/Portal';
import PortalDashboard from './pages/PortalDashboard';
import PortalLeadDetail from './pages/PortalLeadDetail';
import FounderAuth from './pages/FounderAuth';
import FounderDashboard from './pages/FounderDashboard';

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
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/audit" element={<Audit />} />
            <Route path="/audit/reading" element={<AuditReading />} />
            <Route path="/audit/cold-read" element={<AuditColdRead />} />
            <Route path="/processing" element={<Processing />} />
            <Route path="/report/:sessionId" element={<Report />} />
            <Route path="/portal" element={<Portal />} />
            <Route path="/portal/callback" element={<Portal />} />
            <Route path="/portal/dashboard" element={<PortalDashboard />} />
            <Route path="/portal/leads/:leadId" element={<PortalLeadDetail />} />
            <Route path="/account/login" element={<FounderAuth />} />
            <Route path="/account" element={<FounderDashboard />} />
            <Route path="/admin/preread" element={<AdminPreread />} />
          </Routes>
        </ErrorBoundary>
      </FeatureFlagProvider>
    </BrowserRouter>
  );
}
