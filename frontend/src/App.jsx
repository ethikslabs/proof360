import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect } from 'react';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}
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

export default function App() {
  return (
    <BrowserRouter>
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
      </Routes>
    </BrowserRouter>
  );
}
