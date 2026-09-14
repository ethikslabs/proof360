// frontend/src/rendering/actTitles.js
//
// Plain names for the read's acts, used when an act's start line never arrived (an
// untagged error before the perimeter start creates that act with no title). An act id
// is machinery (Law 11) and never renders as a heading.
// Kept out of ActTrace.jsx so that file exports components only (react-refresh rule).
//
// Plain names for acts whose start line never arrived (an untagged error before the
// perimeter start creates that act with no title).
export const ACT_PLAIN_TITLES = {
  perimeter: 'How your site looks from the outside',
  site: 'Reading your site',
  perplexity: 'Asking the live web about you',
  gemini: 'A second opinion, asked independently',
  correlate: 'Putting every witness side by side',
  corpus: 'What we already hold on you',
  reading: 'Writing your read',
  preflight: 'Checking the address',
};

