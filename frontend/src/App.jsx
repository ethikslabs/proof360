import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Audit from './pages/Audit';
import AuditReading from './pages/AuditReading';
import AuditColdRead from './pages/AuditColdRead';
import Processing from './pages/Processing';
import Report from './pages/Report';
import Portal from './pages/Portal';
import PortalDashboard from './pages/PortalDashboard';

export default function App() {
  return (
    <BrowserRouter>
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
      </Routes>
    </BrowserRouter>
  );
}
