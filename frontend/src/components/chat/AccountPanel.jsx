import { useState, useRef } from 'react';

// ── Icons ─────────────────────────────────────────────────────────────────────
const Ic = {
  person:   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  programs: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="6" height="6" rx="1"/><rect x="9" y="3" width="6" height="6" rx="1"/><rect x="16" y="3" width="6" height="6" rx="1"/><rect x="2" y="10" width="6" height="6" rx="1"/><rect x="9" y="10" width="6" height="6" rx="1"/></svg>,
  cart:     <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>,
  link:     <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>,
  billing:  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
  settings: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  help:     <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
  logout:   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  chevron:  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M3.5 2 L7 5 L3.5 8"/></svg>,
  close:    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  check:    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>,
  spark:    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>,
  plus:     <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><line x1="6.5" y1="1" x2="6.5" y2="12"/><line x1="1" y1="6.5" x2="12" y2="6.5"/></svg>,
};

// ── Status dot ─────────────────────────────────────────────────────────────────
const STATUS = {
  active:      { color: '#16a34a', label: 'Active' },
  pending:     { color: '#d97706', label: 'Pending review' },
  eligible:    { color: '#2563eb', label: 'Eligible' },
  none:        { color: '#9ca3af', label: 'Not started' },
  quote:       { color: '#d97706', label: 'Quote requested' },
  connected:   { color: '#16a34a', label: 'Connected' },
  disconnected:{ color: '#9ca3af', label: 'Not connected' },
};

function Dot({ status }) {
  const s = STATUS[status] ?? STATUS.none;
  return <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: s.color, flexShrink: 0 }} />;
}

// ── Mock data — demo founder profile ─────────────────────────────────────────
const DEMO = {
  name: 'Your company',
  tagline: 'Founder · Free',
  initials: 'YC',
  programs: [
    {
      id: 'aws',
      name: 'AWS Activate',
      status: 'pending',
      badge: '$10k credits',
      detail: 'Application under review. Credits applied to EC2, S3, and RDS on approval.',
      action: null,
    },
    {
      id: 'msft',
      name: 'Microsoft for Startups',
      status: 'active',
      badge: '2 programs',
      detail: null,
      children: [
        { name: 'Founders Hub', status: 'active', note: 'Azure credits · $1,000' },
        { name: 'Ingram AMP Assessment', status: 'active', note: 'Free · via Ingram Micro' },
        { name: 'Xvantage CSP', status: 'eligible', note: 'Cloud subscription resell' },
      ],
    },
    {
      id: 'cloudflare',
      name: 'Cloudflare Startup Program',
      status: 'eligible',
      badge: 'Eligible',
      detail: '$1,000 credits + Enterprise DDoS protection.',
      action: 'Apply now',
    },
  ],
  purchases: [
    {
      id: 'vanta',
      name: 'Vanta',
      category: 'Compliance automation',
      status: 'active',
      note: 'Via proof360 · renews 14 Jun 2026',
    },
    {
      id: 'insurance',
      name: 'Cyber Insurance',
      category: 'Austbrokers CyberPro',
      status: 'quote',
      note: 'Quote requested · ~3 business days',
    },
  ],
  integrations: [
    { id: 'aws', name: 'AWS Console', status: 'connected', note: 'us-east-1 · ap-southeast-2' },
    { id: 'github', name: 'GitHub', status: 'disconnected', note: 'Repo activity + commit signals' },
    { id: 'xero', name: 'Xero', status: 'disconnected', note: 'Financial signals for investor readiness' },
  ],
};

// ── Settings sections ─────────────────────────────────────────────────────────
function ProgramsSection() {
  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 600, color: '#111827', margin: '0 0 4px', fontFamily: '"IBM Plex Sans", system-ui, sans-serif' }}>Programs</h2>
      <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 20px', fontFamily: '"IBM Plex Sans", system-ui, sans-serif' }}>
        Programs you've applied for or are eligible to join through proof360.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {DEMO.programs.map(p => (
          <div key={p.id} style={{
            border: '1px solid #e5e7eb', borderRadius: 12,
            padding: '14px 16px', background: '#fafafa',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: p.children || p.detail ? 10 : 0 }}>
              <Dot status={p.status} />
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#111827', fontFamily: '"IBM Plex Sans", system-ui, sans-serif' }}>{p.name}</span>
              </div>
              <span style={{
                fontSize: 11, fontWeight: 600, letterSpacing: '0.04em',
                color: STATUS[p.status]?.color ?? '#9ca3af',
                background: (STATUS[p.status]?.color ?? '#9ca3af') + '15',
                padding: '2px 8px', borderRadius: 10,
                fontFamily: '"IBM Plex Mono", monospace',
              }}>{p.badge ?? STATUS[p.status]?.label}</span>
            </div>
            {p.children && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingLeft: 15 }}>
                {p.children.map(c => (
                  <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Dot status={c.status} />
                    <span style={{ fontSize: 13, color: '#374151', fontFamily: '"IBM Plex Sans", system-ui, sans-serif', flex: 1 }}>{c.name}</span>
                    <span style={{ fontSize: 11, color: '#9ca3af', fontFamily: '"IBM Plex Mono", monospace' }}>{c.note}</span>
                  </div>
                ))}
              </div>
            )}
            {p.detail && (
              <p style={{ fontSize: 12.5, color: '#6b7280', margin: '6px 0 0', fontFamily: '"IBM Plex Sans", system-ui, sans-serif', lineHeight: 1.5 }}>
                {p.detail}
                {p.action && (
                  <button style={{
                    marginLeft: 8, background: 'none', border: 'none',
                    color: '#2563eb', fontSize: 12.5, cursor: 'pointer',
                    fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
                    fontWeight: 600, padding: 0,
                  }}>{p.action} →</button>
                )}
              </p>
            )}
          </div>
        ))}
        <button style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 14px', borderRadius: 10,
          border: '1px dashed #d1d5db', background: 'transparent',
          color: '#6b7280', fontSize: 13, cursor: 'pointer',
          fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
          width: '100%',
        }}>
          {Ic.plus} Find more programs
        </button>
      </div>
    </div>
  );
}

function PurchasesSection() {
  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 600, color: '#111827', margin: '0 0 4px', fontFamily: '"IBM Plex Sans", system-ui, sans-serif' }}>Purchases</h2>
      <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 20px', fontFamily: '"IBM Plex Sans", system-ui, sans-serif' }}>
        Products and services you've purchased through proof360.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {DEMO.purchases.map(p => (
          <div key={p.id} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            border: '1px solid #e5e7eb', borderRadius: 10,
            padding: '12px 16px', background: '#fafafa',
          }}>
            <Dot status={p.status} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#111827', fontFamily: '"IBM Plex Sans", system-ui, sans-serif' }}>{p.name}</div>
              <div style={{ fontSize: 12, color: '#9ca3af', fontFamily: '"IBM Plex Sans", system-ui, sans-serif', marginTop: 2 }}>{p.category}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: STATUS[p.status]?.color ?? '#9ca3af', fontFamily: '"IBM Plex Mono", monospace', fontWeight: 600 }}>
                {STATUS[p.status]?.label}
              </div>
              <div style={{ fontSize: 11, color: '#b8b1c0', fontFamily: '"IBM Plex Mono", monospace', marginTop: 2 }}>{p.note}</div>
            </div>
          </div>
        ))}
        <div style={{
          padding: '12px 16px', borderRadius: 10,
          background: 'linear-gradient(135deg, #f0f7ff 0%, #faf5ff 100%)',
          border: '1px solid #dde9ff',
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', fontFamily: '"IBM Plex Sans", system-ui, sans-serif', marginBottom: 4 }}>
            {Ic.spark} More through proof360
          </div>
          <div style={{ fontSize: 12, color: '#6b7280', fontFamily: '"IBM Plex Sans", system-ui, sans-serif', lineHeight: 1.6 }}>
            Cisco · Cloudflare · Ingram Micro · PaloAlto · Azure Marketplace · Wholesale Investor access
          </div>
        </div>
      </div>
    </div>
  );
}

function IntegrationsSection() {
  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 600, color: '#111827', margin: '0 0 4px', fontFamily: '"IBM Plex Sans", system-ui, sans-serif' }}>Integrations</h2>
      <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 20px', fontFamily: '"IBM Plex Sans", system-ui, sans-serif' }}>
        Connect your tools so proof360 can surface live signals in your analysis.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {DEMO.integrations.map(i => (
          <div key={i.id} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            border: '1px solid #e5e7eb', borderRadius: 10,
            padding: '12px 16px', background: '#fafafa',
          }}>
            <Dot status={i.status} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#111827', fontFamily: '"IBM Plex Sans", system-ui, sans-serif' }}>{i.name}</div>
              <div style={{ fontSize: 12, color: '#9ca3af', fontFamily: '"IBM Plex Sans", system-ui, sans-serif', marginTop: 2 }}>{i.note}</div>
            </div>
            {i.status === 'connected' ? (
              <span style={{ fontSize: 11, color: '#16a34a', fontFamily: '"IBM Plex Mono", monospace', fontWeight: 600 }}>Connected ✓</span>
            ) : (
              <button style={{
                padding: '5px 12px', borderRadius: 8,
                border: '1px solid #e5e7eb', background: '#ffffff',
                color: '#374151', fontSize: 12, cursor: 'pointer',
                fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
                fontWeight: 500,
              }}>Connect</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function BillingSection() {
  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 600, color: '#111827', margin: '0 0 4px', fontFamily: '"IBM Plex Sans", system-ui, sans-serif' }}>Billing</h2>
      <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 20px', fontFamily: '"IBM Plex Sans", system-ui, sans-serif' }}>
        Your proof360 plan and purchase invoices.
      </p>
      <div style={{
        padding: '16px', borderRadius: 12, border: '1px solid #e5e7eb',
        background: '#fafafa', marginBottom: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#111827', fontFamily: '"IBM Plex Sans", system-ui, sans-serif' }}>Free plan</span>
          <button style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '6px 14px', borderRadius: 8,
            border: 'none', background: '#111827',
            color: '#ffffff', fontSize: 12.5, cursor: 'pointer',
            fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
            fontWeight: 600,
          }}>
            {Ic.spark} Upgrade
          </button>
        </div>
        <div style={{ fontSize: 12.5, color: '#6b7280', fontFamily: '"IBM Plex Sans", system-ui, sans-serif', lineHeight: 1.6 }}>
          Unlimited chat · 3 saved analyses · Community support
        </div>
      </div>
      <p style={{ fontSize: 13, color: '#9ca3af', fontFamily: '"IBM Plex Sans", system-ui, sans-serif' }}>
        No invoices yet. Purchases through proof360 will appear here.
      </p>
    </div>
  );
}

function GeneralSection() {
  return (
    <div>
      <h2 style={{ fontSize: 18, fontWeight: 600, color: '#111827', margin: '0 0 20px', fontFamily: '"IBM Plex Sans", system-ui, sans-serif' }}>General</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {[
          { label: 'Company name', value: 'Your company' },
          { label: 'Email', value: '—' },
          { label: 'Stage', value: 'Pre-seed' },
        ].map((row, i) => (
          <div key={row.label} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '13px 0',
            borderTop: i > 0 ? '1px solid #f3f4f6' : 'none',
          }}>
            <span style={{ fontSize: 14, color: '#374151', fontFamily: '"IBM Plex Sans", system-ui, sans-serif' }}>{row.label}</span>
            <span style={{ fontSize: 14, color: '#9ca3af', fontFamily: '"IBM Plex Sans", system-ui, sans-serif' }}>{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Settings modal ─────────────────────────────────────────────────────────────
const SECTIONS = [
  { id: 'general',      label: 'General',      icon: Ic.settings,  Comp: GeneralSection },
  { id: 'programs',     label: 'Programs',      icon: Ic.programs,  Comp: ProgramsSection,     badge: '2' },
  { id: 'purchases',    label: 'Purchases',     icon: Ic.cart,      Comp: PurchasesSection,    badge: '1' },
  { id: 'integrations', label: 'Integrations',  icon: Ic.link,      Comp: IntegrationsSection, badge: '1' },
  { id: 'billing',      label: 'Billing',       icon: Ic.billing,   Comp: BillingSection },
];

function AccountSettings({ initialSection = 'programs', onClose }) {
  const [activeSection, setActiveSection] = useState(initialSection);
  const current = SECTIONS.find(s => s.id === activeSection) ?? SECTIONS[0];
  const { Comp } = current;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }} onClick={onClose}>
      <div style={{
        background: '#ffffff', borderRadius: 16,
        width: '100%', maxWidth: 760, height: 520,
        display: 'flex', overflow: 'hidden',
        boxShadow: '0 24px 64px rgba(0,0,0,0.2)',
      }} onClick={e => e.stopPropagation()}>

        {/* Left nav */}
        <div style={{
          width: 200, flexShrink: 0,
          borderRight: '1px solid #f3f4f6',
          padding: '20px 0',
          display: 'flex', flexDirection: 'column',
        }}>
          <div style={{
            padding: '0 20px 16px',
            borderBottom: '1px solid #f3f4f6',
            marginBottom: 8,
          }}>
            <button onClick={onClose} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#9ca3af', display: 'flex', alignItems: 'center', gap: 6,
              padding: 0, fontSize: 13,
              fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
            }}>
              {Ic.close} Close
            </button>
          </div>
          {SECTIONS.map(s => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '9px 20px',
                background: s.id === activeSection ? '#f3f4f6' : 'transparent',
                border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%',
                color: s.id === activeSection ? '#111827' : '#6b7280',
                fontSize: 13, fontWeight: s.id === activeSection ? 600 : 400,
                fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
                borderRadius: '0 8px 8px 0', marginRight: 8,
                transition: 'background 0.12s',
              }}
            >
              <span style={{ opacity: 0.7 }}>{s.icon}</span>
              <span style={{ flex: 1 }}>{s.label}</span>
              {s.badge && (
                <span style={{
                  fontSize: 10, fontWeight: 700, color: '#2563eb',
                  background: '#dbeafe', borderRadius: 10,
                  padding: '1px 6px', fontFamily: '"IBM Plex Mono", monospace',
                }}>{s.badge}</span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '28px 28px 28px' }}>
          <Comp />
        </div>
      </div>
    </div>
  );
}

// ── Account menu popup ─────────────────────────────────────────────────────────
function AccountMenu({ onClose, onOpenSettings, pos }) {
  const activeCount = DEMO.programs.filter(p => p.status === 'active').length;
  const purchaseCount = DEMO.purchases.filter(p => p.status === 'active').length;
  const linkedCount = DEMO.integrations.filter(i => i.status === 'connected').length;

  const menuStyle = {
    background: '#ffffff', border: '1px solid #e5e7eb',
    borderRadius: 14, boxShadow: '0 8px 40px rgba(0,0,0,0.14)',
    padding: '8px 0', minWidth: 240, zIndex: 200,
    position: 'fixed',
    bottom: pos ? pos.bottom : 52,
    left: pos ? pos.left : 0,
  };

  function Row({ icon, label, value, onClick }) {
    const [hov, setHov] = useState(false);
    return (
      <button
        onClick={onClick}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          width: '100%', padding: '9px 14px',
          background: hov ? '#f9fafb' : 'none',
          border: 'none', cursor: 'pointer', textAlign: 'left',
          fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
        }}
      >
        <span style={{ color: '#6b7280', flexShrink: 0 }}>{icon}</span>
        <span style={{ flex: 1, fontSize: 13, color: '#111827' }}>{label}</span>
        {value !== undefined && (
          <span style={{ fontSize: 11, color: '#9ca3af', fontFamily: '"IBM Plex Mono", monospace' }}>{value}</span>
        )}
        {Ic.chevron}
      </button>
    );
  }

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 199 }} onClick={onClose} />
      <div style={menuStyle}>
        {/* User header */}
        <div style={{ padding: '10px 14px 12px', borderBottom: '1px solid #f3f4f6' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: '#111827', color: '#ffffff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 700, letterSpacing: '0.05em',
              fontFamily: '"IBM Plex Mono", monospace', flexShrink: 0,
            }}>{DEMO.initials}</div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', fontFamily: '"IBM Plex Sans", system-ui, sans-serif' }}>
                {DEMO.name}
              </div>
              <div style={{ fontSize: 11, color: '#9ca3af', fontFamily: '"IBM Plex Mono", monospace' }}>
                {DEMO.tagline}
              </div>
            </div>
          </div>
        </div>

        {/* Commercial items */}
        <div style={{ padding: '4px 0' }}>
          <Row icon={Ic.programs} label="Programs"    value={`${activeCount} active`}   onClick={() => { onClose(); onOpenSettings('programs'); }} />
          <Row icon={Ic.cart}     label="Purchases"   value={`${purchaseCount} active`} onClick={() => { onClose(); onOpenSettings('purchases'); }} />
          <Row icon={Ic.link}     label="Integrations" value={`${linkedCount} linked`}  onClick={() => { onClose(); onOpenSettings('integrations'); }} />
          <Row icon={Ic.billing}  label="Billing"     onClick={() => { onClose(); onOpenSettings('billing'); }} />
        </div>

        <div style={{ height: 1, background: '#f3f4f6', margin: '4px 0' }} />

        {/* Settings / meta */}
        <div style={{ padding: '4px 0' }}>
          <Row icon={Ic.settings} label="Settings" onClick={() => { onClose(); onOpenSettings('general'); }} />
          <Row icon={Ic.help}     label="Help" onClick={onClose} />
        </div>

        <div style={{ height: 1, background: '#f3f4f6', margin: '4px 0' }} />

        <button
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            width: '100%', padding: '9px 14px',
            background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#fef2f2'}
          onMouseLeave={e => e.currentTarget.style.background = 'none'}
          onClick={onClose}
        >
          <span style={{ color: '#ef4444' }}>{Ic.logout}</span>
          <span style={{ fontSize: 13, color: '#ef4444', fontFamily: '"IBM Plex Sans", system-ui, sans-serif' }}>Log out</span>
        </button>
      </div>
    </>
  );
}

// ── Account button — bottom of sidebar ───────────────────────────────────────
export function AccountButton({ collapsed }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState(null);
  const [settingsSection, setSettingsSection] = useState(null);
  const btnRef = useRef(null);

  function handleToggleMenu() {
    if (!menuOpen && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setMenuPos({ bottom: window.innerHeight - r.top + 4, left: r.right + 8 });
    }
    setMenuOpen(o => !o);
  }

  return (
    <div>
      {menuOpen && (
        <AccountMenu
          onClose={() => setMenuOpen(false)}
          onOpenSettings={section => setSettingsSection(section)}
          pos={menuPos}
        />
      )}
      {settingsSection !== null && (
        <AccountSettings
          initialSection={settingsSection}
          onClose={() => setSettingsSection(null)}
        />
      )}

      <button
        ref={btnRef}
        onClick={handleToggleMenu}
        style={{
          display: 'flex', alignItems: 'center',
          gap: collapsed ? 0 : 10,
          width: '100%',
          padding: collapsed ? '12px 0' : '10px 16px',
          background: menuOpen ? '#f3f4f6' : 'transparent',
          border: 'none', cursor: 'pointer', textAlign: 'left',
          justifyContent: collapsed ? 'center' : 'flex-start',
          transition: 'background 0.12s',
          borderTop: '1px solid #f3f4f6',
        }}
        onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
        onMouseLeave={e => e.currentTarget.style.background = menuOpen ? '#f3f4f6' : 'transparent'}
      >
        {/* Avatar */}
        <div style={{
          width: 28, height: 28, borderRadius: '50%',
          background: '#111827', color: '#ffffff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 10, fontWeight: 700, letterSpacing: '0.05em',
          fontFamily: '"IBM Plex Mono", monospace', flexShrink: 0,
        }}>
          {DEMO.initials}
        </div>

        {!collapsed && (
          <>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 12.5, fontWeight: 600, color: '#111827',
                fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>{DEMO.name}</div>
              <div style={{
                fontSize: 10, color: '#9ca3af',
                fontFamily: '"IBM Plex Mono", monospace',
                letterSpacing: '0.05em',
              }}>Free · Log in to save</div>
            </div>
            <span style={{ color: '#9ca3af', flexShrink: 0 }}>{Ic.chevron}</span>
          </>
        )}
      </button>
    </div>
  );
}
