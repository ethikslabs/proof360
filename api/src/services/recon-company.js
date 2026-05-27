// Company research via Perplexity sonar — real-time web intelligence about the target company.
// Runs in parallel with Firecrawl + passive recon. Silent on failure or missing API key.

const PERPLEXITY_URL = 'https://api.perplexity.ai/chat/completions';
const TIMEOUT_MS = 10_000;

export async function reconCompany(domain, session_id = null) {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) return null;

  const query = `Research the company at ${domain}. Cover: what they build and sell, who their customers are, funding stage and amount raised if known, founding team, and any notable news or partnerships in the last 12 months. Be specific and factual. 200 words max.`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const res = await fetch(PERPLEXITY_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [{ role: 'user', content: query }],
        max_tokens: 400,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) return null;

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content || content.length < 50) return null;

    return { label: 'company research (web)', content: content.slice(0, 2000) };
  } catch {
    return null;
  }
}
