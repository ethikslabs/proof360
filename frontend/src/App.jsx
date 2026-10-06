import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect, useState, Component } from 'react';
import { MeetJohnModal } from './components/chat/MeetJohnModal.jsx';
import { MEET_JOHN_EVENT, openMeetJohn } from './components/chat/meetJohn.js';
import { FeatureFlagProvider } from './contexts/FeatureFlagContext';
import AdminPreread from './pages/AdminPreread';
import Portal from './pages/Portal';
import PortalDashboard from './pages/PortalDashboard';
import PortalLeadDetail from './pages/PortalLeadDetail';
import PortalRecordDetail from './pages/PortalRecordDetail.jsx';
import FounderAuth from './pages/FounderAuth';
import FounderDashboard from './pages/FounderDashboard';
import Chat from './pages/Chat';
import Journey from './pages/Journey';
import Raise from './pages/Raise.jsx';
import RecordPage from './pages/RecordPage';
import Mel from './pages/Mel';
import Lab from './pages/Lab';

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

// Floating "Meet John" button + the HubSpot booking modal, on every route.
function MeetJohn() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener(MEET_JOHN_EVENT, handler);
    return () => window.removeEventListener(MEET_JOHN_EVENT, handler);
  }, []);
  return (
    <>
      <button
        onClick={openMeetJohn}
        title="Meet John"
        aria-label="Meet John"
        style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
          width: 48, height: 48, borderRadius: '50%',
          background: '#1a1a2e', display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(0,0,0,0.4)', border: 'none', cursor: 'pointer',
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M16 3v4M8 3v4M3 10h18" />
        </svg>
      </button>
      {open && <MeetJohnModal onClose={() => setOpen(false)} />}
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <FeatureFlagProvider>
        <ErrorBoundary>
          <ScrollToTop />
          <MeetJohn />
          <Routes>
            <Route path="/" element={<Navigate to="/chat" replace />} />
            <Route path="/portal" element={<Portal />} />
            <Route path="/portal/callback" element={<Portal />} />
            <Route path="/portal/dashboard" element={<PortalDashboard />} />
            <Route path="/portal/leads/:leadId" element={<PortalLeadDetail />} />
            <Route path="/portal/records/:cerId" element={<PortalRecordDetail />} />
            <Route path="/account/login" element={<FounderAuth />} />
            <Route path="/account" element={<FounderDashboard />} />
            <Route path="/admin/preread" element={<AdminPreread />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/journey" element={<Journey />} />
            {/* The raise designer — the Capital Rosetta join over the ratified register, against the
                founder's own record. Nothing ranked (workshop 2026-09-03). */}
            <Route path="/raise" element={<Raise />} />
            <Route path="/record" element={<RecordPage />} />
            <Route path="/mel/:beatId" element={<Mel />} />
            <Route path="/mel" element={<Mel />} />
            {/* The accumulating "lab" home (design/hiveandco-lab). Additive first cut; folds into
                /chat as the home in a later deliberate step. */}
            <Route path="/lab" element={<Lab />} />
            {/* Catch-all: legacy/deleted paths (/audit, /home, /report, /processing) and any
                typo redirect to the single entry point rather than rendering a blank SPA shell
                (CATCHALL-ROUTE-001). */}
            <Route path="*" element={<Navigate to="/chat" replace />} />
          </Routes>
        </ErrorBoundary>
      </FeatureFlagProvider>
    </BrowserRouter>
  );
}
