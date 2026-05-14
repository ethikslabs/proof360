import { useState, useCallback } from 'react';

export function useChatSession() {
  const [messages, setMessages] = useState([]);
  const [activePersona, setActivePersona] = useState(null);
  const [phase, setPhase] = useState('intake'); // intake | thinking | report | done
  const [openDrawers, setOpenDrawers] = useState({
    evidence: false,
    cost: false,
    vendor: false,
    report: false,
  });
  const [thinkingSteps, setThinkingSteps] = useState([]);
  const [reportData, setReportData] = useState(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showHandoffModal, setShowHandoffModal] = useState(false);

  const addUserMessage = useCallback((content) => {
    setMessages(prev => [...prev, {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    }]);
  }, []);

  const addPersonaMessages = useCallback((personaMessages) => {
    setMessages(prev => [...prev, ...personaMessages.map(m => ({
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      ...m,
    }))]);
  }, []);

  const toggleDrawer = useCallback((drawer) => {
    setOpenDrawers(prev => ({ ...prev, [drawer]: !prev[drawer] }));
  }, []);

  return {
    messages,
    activePersona,
    setActivePersona,
    phase,
    setPhase,
    openDrawers,
    toggleDrawer,
    thinkingSteps,
    setThinkingSteps,
    reportData,
    setReportData,
    showSaveModal,
    setShowSaveModal,
    showHandoffModal,
    setShowHandoffModal,
    addUserMessage,
    addPersonaMessages,
  };
}
