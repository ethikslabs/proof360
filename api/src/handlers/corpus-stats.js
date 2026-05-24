import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CORPUS_SEARCH = resolve(__dirname, '../../../../CORPUS/src/query/search.mjs');

const FALLBACK = [
  { number: '75%',  text: 'of investors say management track record is the top factor before they agree to take a meeting', source: 'CapitalHQ Investor Survey, 2026' },
  { number: '96%',  text: 'of companies say GRC and compliance is getting more boardroom attention than ever before', source: 'Vanta State of GRC, 2025' },
  { number: '51%',  text: 'are experiencing brand safety and reputation issues due to security or data breaches', source: 'Vanta State of GRC, 2025' },
];

const QUERIES = [
  'investor management track record decision factor before meeting percentage',
  'GRC compliance getting more attention boardroom spotlight companies believe',
  'brand safety reputation security breach percentage organizations experiencing',
];

function cleanSentence(s, removeToken) {
  return s
    .replace(/\([^)]*\)/g, '')
    .replace(removeToken instanceof RegExp ? removeToken : new RegExp(removeToken.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), '')
    .replace(/Australia State of Trust Report\s*\d{4}\s*\d*/gi, '')
    .replace(/Australia vs other countries/gi, '')
    .replace(/Key findings?\s*[-–]\s*Australia/gi, '')
    .replace(/\| The State of GRC \d{4}/gi, '')
    .replace(/CAPITALHQ STRATEGIC INVESTOR INTELLIGENCE\s*\d*/gi, '')
    .replace(/MARKER INSIGHT\s*/gi, '')
    .replace(/FACTOR PERCENTAGE\s*/gi, '')
    .replace(/\d{4}\s+\d+\b/g, '')
    .replace(/^staying the same\s+/i, '')
    .replace(/^[^a-zA-Z]+/, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function extractStat(text) {
  const sentences = text.split(/[.!?]+\s+/).map(s => s.trim()).filter(s => s.length > 20);

  // Pick percentage from the longest sentence (filters out short fragments like "increase of 4%")
  let bestPct = null, bestPctText = null, bestLen = 0;
  for (const s of sentences) {
    const m = s.match(/(\d+(?:\.\d+)?%)/);
    if (m && s.length > bestLen && s.length > 50) {
      bestPct = m[1]; bestPctText = s; bestLen = s.length;
    }
  }
  if (bestPct) {
    const clean = cleanSentence(bestPctText, bestPct);
    return { number: bestPct, text: clean.slice(0, 115) };
  }

  // Time measurement
  for (const s of sentences) {
    const m = s.match(/(\d+(?:\.\d+)?)\s+(?:working\s+)?(hours?|weeks?|months?)\b/i);
    if (m && s.length > 30) {
      const unit = m[2].toLowerCase().replace(/s$/, '');
      const clean = cleanSentence(s, m[0]);
      return { number: `${m[1]} ${unit}s`, text: clean.slice(0, 115) };
    }
  }
  return null;
}

function sourceLabel(slug) {
  const s = (slug ?? '').toLowerCase();
  if (s.includes('capitalhq-investor-survey-report-2026') || s.includes('capitalhq-investor')) return 'CapitalHQ Investor Survey, 2026';
  if (s.includes('capitalhq'))  return 'CapitalHQ, 2026';
  if (s.includes('grc-2025') || s.includes('state-of-grc')) return 'Drata State of GRC, 2025';
  if (s.includes('vanta') && s.includes('2024')) return 'Vanta State of Trust, Australia 2024';
  if (s.includes('vanta'))      return 'Vanta, 2024';
  if (s.includes('okta'))       return 'Okta, 2024';
  if (s.includes('arcticwolf') || s.includes('arctic-wolf')) return 'Arctic Wolf, 2025';
  if (s.includes('gartner'))    return 'Gartner, 2024';
  if (s.includes('drata'))      return 'Drata, 2025';
  if (s.includes('fortinet'))   return 'Fortinet, 2025';
  if (s.includes('wholesale') || s.includes('vc-deep')) return 'Wholesale Investor, 2026';
  if (s.includes('crunchbase')) return 'Crunchbase Insights, 2024';
  return slug?.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') ?? 'Industry Report';
}

export async function corpusStatsHandler(_req, reply) {
  try {
    const { searchSemantic } = await import(CORPUS_SEARCH);
    const stats = [];

    for (let i = 0; i < QUERIES.length; i++) {
      const results = await searchSemantic(QUERIES[i], { topK: 5 });
      let found = false;
      for (const chunk of results) {
        const extracted = extractStat(chunk.text);
        if (extracted) {
          stats.push({ ...extracted, source: sourceLabel(chunk.object_slug) });
          found = true;
          break;
        }
      }
      if (!found) stats.push(FALLBACK[i]);
    }

    return reply.send({ stats, source: 'corpus' });
  } catch {
    return reply.send({ stats: FALLBACK, source: 'fallback' });
  }
}
