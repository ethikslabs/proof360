import { useState, useCallback } from 'react';
import { useChatSession } from '../hooks/useChatSession.js';
import { PersonaChips } from '../components/chat/PersonaChips.jsx';
import { MessageList } from '../components/chat/MessageList.jsx';
import { ChatInput } from '../components/chat/ChatInput.jsx';
import { ThinkingStream } from '../components/chat/ThinkingStream.jsx';
import { DrawerPanel } from '../components/chat/DrawerPanel.jsx';
import { EvidenceDrawer } from '../components/chat/EvidenceDrawer.jsx';
import { CostDrawer } from '../components/chat/CostDrawer.jsx';
import { VendorShortlist } from '../components/chat/VendorShortlist.jsx';
import { ReportPanel } from '../components/chat/ReportPanel.jsx';
import { SaveModal } from '../components/chat/SaveModal.jsx';
import { HandoffModal } from '../components/chat/HandoffModal.jsx';
import { getPersonaResponses } from '../data/mock/personas.js';
import { getThinkingSteps } from '../data/mock/thinking.js';
import { getMockReport } from '../data/mock/report.js';
import { getMockVendors } from '../data/mock/vendors.js';
import { getMockEvidence } from '../data/mock/evidence.js';
import { getMockCosts } from '../data/mock/costs.js';

const BG = '#0a0d14';

function drawerBtnStyle(color) {
  return {
    padding: '6px 12px',
    borderRadius: 6,
    border: `1px solid ${color}44`,
    background: `${color}11`,
    color,
    fontSize: 11,
    fontWeight: 600,
    cursor: 'pointer',
    letterSpacing: '0.3px',
  };
}

export default function Chat() {
  const session = useChatSession();
  const [isProcessing, setIsProcessing] = useState(false);
  const [vendorList, setVendorList] = useState([]);
  const [evidenceList, setEvidenceList] = useState([]);
  const [costList, setCostList] = useState([]);

  const handleSubmit = useCallback(async (input) => {
    session.addUserMessage(input);
    setIsProcessing(true);
    session.setPhase('thinking');

    const steps = getThinkingSteps();
    session.setThinkingSteps(steps.map(s => ({ ...s, status: 'running' })));

    for (let i = 0; i < steps.length; i++) {
      await new Promise(r => setTimeout(r, 350 + Math.random() * 400));
      session.setThinkingSteps(prev => prev.map((s, idx) =>
        idx <= i ? { ...s, status: 'complete' } : s
      ));
    }

    const responses = getPersonaResponses(input);
    session.addPersonaMessages(responses.map(r => ({
      role: 'assistant',
      persona: r.persona,
      content: r.response,
    })));

    session.setReportData(getMockReport());
    setVendorList(getMockVendors());
    setEvidenceList(getMockEvidence());
    setCostList(getMockCosts());

    session.setPhase('report');
    setIsProcessing(false);

    setTimeout(() => session.setShowSaveModal(true), 3000);
  }, [session]);

  const handleShortlist = (vendorId) => {
    setVendorList(prev => prev.map(v => v.id === vendorId ? { ...v, status: 'shortlisted' } : v));
  };

  const handleDefer = (vendorId) => {
    setVendorList(prev => prev.map(v => v.id === vendorId ? { ...v, status: 'deferred' } : v));
  };

  const sessionSummary = session.messages.length > 0
    ? `Company: ${session.messages[0]?.content?.slice(0, 200)}\nStage: Early/growing\nInterest: Investor readiness, enterprise buyers\nVendor shortlist: ${vendorList.filter(v => v.status === 'shortlisted').map(v => v.name).join(', ') || 'None yet'}`
    : 'No context yet.';

  return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', flexDirection: 'column' }}>
      <div style={{ borderBottom: '1px solid #0f172a', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 16, fontWeight: 800, color: '#4f46e5', letterSpacing: '-0.5px' }}>proof360</span>
          <span style={{ fontSize: 11, color: '#334155', borderLeft: '1px solid #1e293b', paddingLeft: 10 }}>Trust conversation</span>
        </div>
        {session.phase === 'report' && (
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => session.toggleDrawer('report')} style={drawerBtnStyle('#4f46e5')}>Report</button>
            <button onClick={() => session.toggleDrawer('vendor')} style={drawerBtnStyle('#22c55e')}>
              Vendors {vendorList.length > 0 && `(${vendorList.length})`}
            </button>
            <button onClick={() => session.toggleDrawer('evidence')} style={drawerBtnStyle('#8b5cf6')}>Sources</button>
            <button onClick={() => session.toggleDrawer('cost')} style={drawerBtnStyle('#64748b')}>Cost</button>
            <button onClick={() => session.setShowHandoffModal(true)} style={{ ...drawerBtnStyle('#f59e0b'), fontWeight: 700 }}>Talk to John</button>
          </div>
        )}
      </div>

      <div style={{ flex: 1, maxWidth: 760, width: '100%', margin: '0 auto', padding: '0 24px', display: 'flex', flexDirection: 'column' }}>
        <PersonaChips activePersona={session.activePersona} onSelect={session.setActivePersona} />
        <MessageList messages={session.messages} />
        <ThinkingStream
          steps={session.thinkingSteps}
          visible={session.phase === 'thinking' || (session.thinkingSteps.length > 0 && session.phase === 'report')}
        />
        <ChatInput onSubmit={handleSubmit} disabled={isProcessing} />
      </div>

      <DrawerPanel title="Trust snapshot" isOpen={session.openDrawers.report} onClose={() => session.toggleDrawer('report')}>
        <ReportPanel report={session.reportData} />
      </DrawerPanel>
      <DrawerPanel title="Vendor shortlist" badge={vendorList.length} isOpen={session.openDrawers.vendor} onClose={() => session.toggleDrawer('vendor')}>
        <VendorShortlist vendors={vendorList} onShortlist={handleShortlist} onDefer={handleDefer} />
      </DrawerPanel>
      <DrawerPanel title="Sources & evidence" badge={evidenceList.length} isOpen={session.openDrawers.evidence} onClose={() => session.toggleDrawer('evidence')}>
        <EvidenceDrawer evidence={evidenceList} />
      </DrawerPanel>
      <DrawerPanel title="Inference cost" isOpen={session.openDrawers.cost} onClose={() => session.toggleDrawer('cost')}>
        <CostDrawer receipts={costList} />
      </DrawerPanel>

      {session.showSaveModal && (
        <SaveModal
          onSave={(data) => { console.log('save', data); session.setShowSaveModal(false); }}
          onDismiss={() => session.setShowSaveModal(false)}
        />
      )}
      {session.showHandoffModal && (
        <HandoffModal
          sessionSummary={sessionSummary}
          onSubmit={() => { console.log('handoff submitted'); session.setShowHandoffModal(false); }}
          onDismiss={() => session.setShowHandoffModal(false)}
        />
      )}
    </div>
  );
}
