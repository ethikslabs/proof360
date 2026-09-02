// Vendor identity in context. John, 2026-09-02: "the whole idea is to show that this is an
// ecosystem, not just a single place to do things." The NAMED TIMELINE ruling in the
// product: the logo IS the recommendation, not a badge beside it.
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  VendorBrand, VendorTile, vendorColor, vendorLabel, vendorInitials,
} from '../../src/components/chat/VendorBrand.jsx';

describe('recognising a vendor', () => {
  it('knows the named ecosystem by id or by name', () => {
    expect(vendorColor({ id: 'vanta' })).toBe('#6558f5');
    expect(vendorColor({ name: 'Vanta' })).toBe('#6558f5');
    expect(vendorColor({ id: 'arctic_wolf' })).toBe('#00263e');
    expect(vendorColor({ name: 'Austbrokers CyberPro' })).toBe('#00954d');
  });

  it('prefers the longest match so a sub-brand is not swallowed by its parent', () => {
    expect(vendorLabel({ id: 'cisco_duo' })).toBe('Cisco Duo');
    expect(vendorLabel({ id: 'cisco_umbrella' })).toBe('Cisco Umbrella');
  });

  it('gives an unknown vendor an identity anyway, never a blank', () => {
    const v = { id: 'some_niche_tool', name: 'Some Niche Tool' };
    expect(vendorColor(v)).toBeTruthy();
    expect(vendorInitials(v)).toBe('SN');
    expect(vendorLabel(v)).toBe('Some Niche Tool');
  });

  it('uses the catalog initials when the vendor carries them', () => {
    expect(vendorInitials({ id: 'aws_security_hub', name: 'AWS Security Hub', initials: 'SH' }))
      .toBe('SH');
  });

  it('never throws on a malformed vendor', () => {
    expect(vendorLabel(null)).toBe('Unknown');
    expect(vendorInitials({})).toBe('?');
    expect(vendorColor(undefined)).toBeTruthy();
  });
});

describe('rendering', () => {
  it('shows the name beside the tile', () => {
    render(<VendorBrand vendor={{ id: 'vanta', name: 'Vanta' }} />);
    expect(screen.getByText('Vanta')).toBeTruthy();
  });

  it('renders a tile for a vendor with no mark rather than an empty square', () => {
    const { container } = render(<VendorTile vendor={{ id: 'unknown_co', name: 'Unknown Co' }} />);
    expect(container.textContent).toBe('UC');
  });

  it('can render the tile alone', () => {
    const { container } = render(<VendorBrand vendor={{ id: 'vanta', name: 'Vanta' }} showName={false} />);
    expect(container.textContent).not.toContain('Vanta');
  });
});

describe('the stake is disclosed with the logo', () => {
  // Canon: a recommendation carries its disclosed stake, and terms stay sealed — the
  // RELATIONSHIP is shown, never the economics. A logo that reads as an endorsement
  // without saying we have an interest is what the no-one-is-paid-to-sell rule prevents.
  it('marks a partner vendor', () => {
    render(<VendorBrand vendor={{ id: 'vanta', name: 'Vanta', is_partner: true }} />);
    expect(screen.getByText('partner')).toBeTruthy();
  });

  it('says nothing for a vendor we have no relationship with', () => {
    render(<VendorBrand vendor={{ id: 'vanta', name: 'Vanta', is_partner: false }} />);
    expect(screen.queryByText('partner')).toBeNull();
  });

  it('reads the flag off the vendor so a caller cannot forget to pass it', () => {
    render(<VendorBrand vendor={{ id: 'drata', name: 'Drata', is_partner: true }} />);
    expect(screen.getByText('partner')).toBeTruthy();
  });

  it('discloses the relationship and never the economics', () => {
    render(<VendorBrand vendor={{ id: 'vanta', name: 'Vanta', is_partner: true, deal_label: '20% lifetime' }} />);
    const badge = screen.getByText('partner');
    expect(badge.getAttribute('title')).toMatch(/commercial relationship/i);
    expect(document.body.textContent).not.toMatch(/20%|lifetime|commission|margin/i);
  });
});
