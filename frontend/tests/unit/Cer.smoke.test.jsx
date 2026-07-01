import { render, screen, fireEvent } from '@testing-library/react';
import { tokens } from '../../src/tokens.js';
import { CerBuildCard } from '../../src/components/chat/CerBuildCard.jsx';
import { CerAgencyCard } from '../../src/components/chat/CerAgencyCard.jsx';
import { CerProjectionCard } from '../../src/components/chat/CerProjectionCard.jsx';
import { CerFacet } from '../../src/components/chat/CerFacet.jsx';

const tk = tokens('pearl');

const FIELDS = [
  { key: 'company', label: 'Company', value: 'Acme Robotics', state: 'done' },
  { key: 'contact', label: 'Contact', value: 'Dana O.', state: 'done' },
  { key: 'need', label: 'Need / gap', value: 'cloud spend', state: 'done' },
  { key: 'evidence', label: 'Evidence', value: 'cloud_invoice', state: 'done' },
  { key: 'route', label: 'Route', value: 'ingram_micro_aws?', state: 'live' },
  { key: 'consent', label: 'Consent', value: 'pending', state: 'wait' },
  { key: 'visibility', label: 'Visibility', value: '—', state: 'wait' },
];

const PROPOSAL = {
  pathwayLabel: 'AWS via Ingram',
  route: 'ingram_micro_aws',
  need: 'growing cloud spend, no committed program',
  evidence: ['cloud_invoice.pdf', 'profile.cloud_spend'],
  visibility: [
    { who: 'You + Ethiks360 admin', verdict: '✓ full', tone: 'full' },
    { who: 'Ingram Micro', verdict: 'later · if permissioned', tone: 'later' },
    { who: 'Vanta · Austbrokers', verdict: '✕ never', tone: 'never' },
  ],
};

const CER = {
  cer_id: 'abcd1234-cer',
  decision_type: 'commercial_engagement',
  pathway_type: 'cloud_program',
  route: 'ingram_micro_aws',
  status: 'Submitted',
  consent_state: 'granted',
  evidence_refs: ['e1', 'e2', 'e3'],
};

describe('CerBuildCard', () => {
  it('shows the meter and all seven fields', () => {
    render(<CerBuildCard title="AWS PATHWAY · FORMING" meter={4} total={7} fields={FIELDS} tk={tk} />);
    expect(screen.getByText('4/7')).toBeInTheDocument();
    expect(screen.getByText('Company')).toBeInTheDocument();
    expect(screen.getByText('Visibility')).toBeInTheDocument();
    expect(screen.getByText('ingram_micro_aws?')).toBeInTheDocument();
  });
});

describe('CerAgencyCard', () => {
  it('renders visibility + evidence and gates Confirm behind consent', () => {
    const onConfirm = vi.fn();
    render(<CerAgencyCard proposal={PROPOSAL} tk={tk} onConfirm={onConfirm} onEdit={() => {}} />);
    expect(screen.getByText('cloud_invoice.pdf')).toBeInTheDocument();
    expect(screen.getByText('✕ never')).toBeInTheDocument();

    const confirm = screen.getByRole('button', { name: /confirm & create pathway/i });
    expect(confirm).toBeDisabled(); // no consent yet
    fireEvent.click(confirm);
    expect(onConfirm).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('checkbox'));
    expect(confirm).not.toBeDisabled();
    fireEvent.click(confirm);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});

describe('CerProjectionCard', () => {
  it('renders the created pathway, status and typed record', () => {
    render(<CerProjectionCard cer={CER} companyName="ACME ROBOTICS" tk={tk} />);
    expect(screen.getByText(/your aws pathway is live/i)).toBeInTheDocument();
    expect(screen.getByText('commercial_engagement')).toBeInTheDocument();
    expect(screen.getByText('consent-granted')).toBeInTheDocument();
    expect(screen.getByText(/3 evidence refs/)).toBeInTheDocument();
  });

  it('reflects a withdrawn CER as closed, no partner sharing, no Book-a-call', () => {
    render(<CerProjectionCard cer={{ ...CER, status: 'Closed', consent_state: 'withdrawn' }} tk={tk} />);
    expect(screen.getByText(/your aws pathway is closed/i)).toBeInTheDocument();
    expect(screen.getByText(/no further partner sharing/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /book a call/i })).toBeNull();
  });
});

describe('CerFacet', () => {
  it('renders a purple facet with title, count and status', () => {
    render(<CerFacet cer={CER} meter={7} total={7} tk={tk} />);
    expect(screen.getByText('AWS PATHWAY')).toBeInTheDocument();
    expect(screen.getByText('7/7')).toBeInTheDocument();
    expect(screen.getByText('Submitted')).toBeInTheDocument();
  });
});
