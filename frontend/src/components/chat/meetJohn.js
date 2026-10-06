// John's HubSpot meetings page — the same link the vendor shortlist's
// "Book a conversation →" uses. A booking lands in HubSpot as a contact and a
// meeting, so the "Meet John" door replaces the Telegram "Message John" relay.
export const MEET_JOHN_URL = 'https://meetings.hubspot.com/john3174';

// The modal is owned by App (one mount, every route); anything can open it.
export const MEET_JOHN_EVENT = 'proof360:meet-john';
export function openMeetJohn() { window.dispatchEvent(new CustomEvent(MEET_JOHN_EVENT)); }
