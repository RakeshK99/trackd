// Curated list of popular companies college students apply to.
// Domain is the source of truth -> Clearbit logo URL is derived from it.
// Add to this list as we discover gaps in user usage.
export interface CompanyHint {
  name: string;
  domain: string; // primary marketing domain (no http://)
}

export const COMPANIES: CompanyHint[] = [
  // Tech (big)
  { name: 'Google', domain: 'google.com' },
  { name: 'Meta', domain: 'meta.com' },
  { name: 'Apple', domain: 'apple.com' },
  { name: 'Microsoft', domain: 'microsoft.com' },
  { name: 'Amazon', domain: 'amazon.com' },
  { name: 'Netflix', domain: 'netflix.com' },
  { name: 'Tesla', domain: 'tesla.com' },
  { name: 'Nvidia', domain: 'nvidia.com' },
  { name: 'Adobe', domain: 'adobe.com' },
  { name: 'Oracle', domain: 'oracle.com' },
  { name: 'Salesforce', domain: 'salesforce.com' },
  { name: 'IBM', domain: 'ibm.com' },
  { name: 'Intel', domain: 'intel.com' },
  { name: 'AMD', domain: 'amd.com' },
  { name: 'Qualcomm', domain: 'qualcomm.com' },
  { name: 'Cisco', domain: 'cisco.com' },
  { name: 'Uber', domain: 'uber.com' },
  { name: 'Lyft', domain: 'lyft.com' },
  { name: 'Airbnb', domain: 'airbnb.com' },
  { name: 'DoorDash', domain: 'doordash.com' },
  { name: 'Instacart', domain: 'instacart.com' },
  { name: 'Snap', domain: 'snap.com' },
  { name: 'Pinterest', domain: 'pinterest.com' },
  { name: 'Reddit', domain: 'reddit.com' },
  { name: 'X', domain: 'x.com' },
  { name: 'LinkedIn', domain: 'linkedin.com' },
  { name: 'PayPal', domain: 'paypal.com' },
  { name: 'Square', domain: 'squareup.com' },
  { name: 'Stripe', domain: 'stripe.com' },
  { name: 'Robinhood', domain: 'robinhood.com' },
  { name: 'Coinbase', domain: 'coinbase.com' },
  { name: 'Plaid', domain: 'plaid.com' },
  { name: 'Brex', domain: 'brex.com' },
  { name: 'Ramp', domain: 'ramp.com' },
  { name: 'Mercury', domain: 'mercury.com' },
  { name: 'Affirm', domain: 'affirm.com' },
  { name: 'Klarna', domain: 'klarna.com' },
  // Startups / scale-ups
  { name: 'OpenAI', domain: 'openai.com' },
  { name: 'Anthropic', domain: 'anthropic.com' },
  { name: 'Perplexity', domain: 'perplexity.ai' },
  { name: 'Cohere', domain: 'cohere.com' },
  { name: 'Hugging Face', domain: 'huggingface.co' },
  { name: 'Notion', domain: 'notion.so' },
  { name: 'Linear', domain: 'linear.app' },
  { name: 'Figma', domain: 'figma.com' },
  { name: 'Canva', domain: 'canva.com' },
  { name: 'Vercel', domain: 'vercel.com' },
  { name: 'Netlify', domain: 'netlify.com' },
  { name: 'Cloudflare', domain: 'cloudflare.com' },
  { name: 'Supabase', domain: 'supabase.com' },
  { name: 'MongoDB', domain: 'mongodb.com' },
  { name: 'Snowflake', domain: 'snowflake.com' },
  { name: 'Databricks', domain: 'databricks.com' },
  { name: 'Datadog', domain: 'datadoghq.com' },
  { name: 'Splunk', domain: 'splunk.com' },
  { name: 'GitLab', domain: 'gitlab.com' },
  { name: 'GitHub', domain: 'github.com' },
  { name: 'Atlassian', domain: 'atlassian.com' },
  { name: 'Asana', domain: 'asana.com' },
  { name: 'Slack', domain: 'slack.com' },
  { name: 'Zoom', domain: 'zoom.us' },
  { name: 'Twilio', domain: 'twilio.com' },
  { name: 'SendGrid', domain: 'sendgrid.com' },
  { name: 'Shopify', domain: 'shopify.com' },
  { name: 'Squarespace', domain: 'squarespace.com' },
  { name: 'Wix', domain: 'wix.com' },
  { name: 'Discord', domain: 'discord.com' },
  { name: 'Spotify', domain: 'spotify.com' },
  { name: 'TikTok', domain: 'tiktok.com' },
  { name: 'ByteDance', domain: 'bytedance.com' },
  { name: 'Roblox', domain: 'roblox.com' },
  { name: 'Unity', domain: 'unity.com' },
  { name: 'Epic Games', domain: 'epicgames.com' },
  { name: 'Riot Games', domain: 'riotgames.com' },
  { name: 'Activision', domain: 'activision.com' },
  { name: 'EA', domain: 'ea.com' },
  { name: 'Replit', domain: 'replit.com' },
  // Finance
  { name: 'Goldman Sachs', domain: 'goldmansachs.com' },
  { name: 'JP Morgan', domain: 'jpmorganchase.com' },
  { name: 'Morgan Stanley', domain: 'morganstanley.com' },
  { name: 'Citi', domain: 'citi.com' },
  { name: 'Bank of America', domain: 'bankofamerica.com' },
  { name: 'Wells Fargo', domain: 'wellsfargo.com' },
  { name: 'BlackRock', domain: 'blackrock.com' },
  { name: 'Bridgewater', domain: 'bridgewater.com' },
  { name: 'Citadel', domain: 'citadel.com' },
  { name: 'Two Sigma', domain: 'twosigma.com' },
  { name: 'Jane Street', domain: 'janestreet.com' },
  { name: 'Jump Trading', domain: 'jumptrading.com' },
  { name: 'Hudson River Trading', domain: 'hudsonrivertrading.com' },
  { name: 'DE Shaw', domain: 'deshaw.com' },
  // Consulting
  { name: 'McKinsey', domain: 'mckinsey.com' },
  { name: 'Bain', domain: 'bain.com' },
  { name: 'BCG', domain: 'bcg.com' },
  { name: 'Deloitte', domain: 'deloitte.com' },
  { name: 'PwC', domain: 'pwc.com' },
  { name: 'EY', domain: 'ey.com' },
  { name: 'KPMG', domain: 'kpmg.com' },
  { name: 'Accenture', domain: 'accenture.com' },
  // Other
  { name: 'Boeing', domain: 'boeing.com' },
  { name: 'Lockheed Martin', domain: 'lockheedmartin.com' },
  { name: 'SpaceX', domain: 'spacex.com' },
  { name: 'Anduril', domain: 'anduril.com' },
  { name: 'Palantir', domain: 'palantir.com' },
  { name: 'Scale AI', domain: 'scale.com' },
  { name: 'Rivian', domain: 'rivian.com' },
];

/**
 * Free, no-key logo URL. Google's favicon service returns up to 128px — much
 * crisper than DuckDuckGo's 16px .ico. Use `logoFallbackUrl` as onError source.
 */
export function logoUrl(domain: string, size = 128) {
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=${size}`;
}

/** Lower-res but very reliable fallback if Google has no icon for a domain. */
export function logoFallbackUrl(domain: string) {
  return `https://icons.duckduckgo.com/ip3/${domain}.ico`;
}

/** Type-ahead match: prefix first, then contains. Returns up to 6. */
export function searchCompanies(query: string, limit = 6): CompanyHint[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const prefix: CompanyHint[] = [];
  const contains: CompanyHint[] = [];
  for (const c of COMPANIES) {
    const n = c.name.toLowerCase();
    if (n === q || n.startsWith(q)) prefix.push(c);
    else if (n.includes(q)) contains.push(c);
    if (prefix.length >= limit) break;
  }
  return [...prefix, ...contains].slice(0, limit);
}
