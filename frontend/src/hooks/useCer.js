import { useState, useEffect, useMemo, useCallback } from 'react';
import { getCers, createCer, withdrawCerConsent } from '../api/client.js';
import { cerBuildFields, cerMeter, agencyReady, buildProposal } from '../utils/cerPathways.js';

// CER state for the chat flow. Holds ONE forming CER at a time (the record assembling
// itself from the conversation) plus the list of created CERs. Two entry points feed the
// same forming state: proposeRoute (conversation-detected, unconfirmed) and startRoute
// (explicit click, confirmed). Confirm → createCer → refresh; withdraw → append event.
export function useCer({ companyName, contactName, evidenceRefs = [], enabled = true } = {}) {
  const [forming, setForming] = useState(null); // { route, need, routeConfirmed }
  const [createdCers, setCreatedCers] = useState([]);
  const [agencyOpen, setAgencyOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [awaitingField, setAwaitingField] = useState(null);
  const awaitField = useCallback((field) => setAwaitingField(field), []);
  const clearAwaiting = useCallback(() => setAwaitingField(null), []);

  const refresh = useCallback(async () => {
    try {
      const res = await getCers();
      setCreatedCers(res?.cers || []);
    } catch {
      /* demo/no-auth or offline — leave list as-is */
    }
  }, []);

  useEffect(() => {
    if (enabled) refresh();
  }, [enabled, refresh]);

  // Conversation proposes a route (unconfirmed). Never override a route the founder has
  // already confirmed, and never clobber an existing forming CER with a different guess.
  const proposeRoute = useCallback((route, opts = {}) => {
    if (!route) return;
    setForming((prev) => {
      if (prev) return prev; // one at a time; keep what's forming
      return { route, need: opts.need || null, routeConfirmed: false };
    });
  }, []);

  // Explicit click — route is confirmed immediately.
  const startRoute = useCallback((route, opts = {}) => {
    if (!route) return;
    setForming({ route, need: opts.need || null, routeConfirmed: true });
    setAgencyOpen(false);
  }, []);

  const confirmRoute = useCallback(() => setForming((p) => (p ? { ...p, routeConfirmed: true } : p)), []);
  const dismissForming = useCallback(() => { setForming(null); setAgencyOpen(false); setAwaitingField(null); }, []);
  const openAgency = useCallback(() => setAgencyOpen(true), []);

  const fields = useMemo(
    () => (forming ? cerBuildFields({ route: forming.route, companyName, contactName, need: forming.need, evidenceRefs, routeConfirmed: forming.routeConfirmed }) : []),
    [forming, companyName, contactName, evidenceRefs]
  );

  const proposal = useMemo(
    () => (forming ? buildProposal({ route: forming.route, companyName, need: forming.need, evidenceRefs }) : null),
    [forming, companyName, evidenceRefs]
  );

  const confirmCer = useCallback(async () => {
    if (!forming) return null;
    setBusy(true);
    try {
      const res = await createCer({ route: forming.route, evidence_refs: evidenceRefs });
      await refresh();
      setForming(null);
      setAgencyOpen(false);
      setAwaitingField(null);
      return res?.cer || null;
    } finally {
      setBusy(false);
    }
  }, [forming, evidenceRefs, refresh]);

  const withdrawCer = useCallback(async (cerId) => {
    setBusy(true);
    try {
      await withdrawCerConsent(cerId, {});
      await refresh();
    } finally {
      setBusy(false);
    }
  }, [refresh]);

  return {
    forming,
    fields,
    meter: cerMeter(fields),
    agencyReady: agencyReady(fields),
    agencyOpen,
    proposal,
    createdCers,
    busy,
    awaitingField,
    awaitField,
    clearAwaiting,
    proposeRoute,
    startRoute,
    confirmRoute,
    dismissForming,
    openAgency,
    confirmCer,
    withdrawCer,
    refresh,
  };
}
