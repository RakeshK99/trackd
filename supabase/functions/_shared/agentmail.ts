// Shared AgentMail API client. Required env: AGENTMAIL_API_KEY, AGENTMAIL_DOMAIN.
const AGENTMAIL_BASE = 'https://api.agentmail.to/v0';
const AGENTMAIL_KEY = Deno.env.get('AGENTMAIL_API_KEY');

export const AGENTMAIL_DOMAIN = Deno.env.get('AGENTMAIL_DOMAIN') ?? 'trackd.app';

export async function am(path: string, init?: RequestInit) {
  const res = await fetch(`${AGENTMAIL_BASE}${path}`, {
    ...init,
    headers: {
      'Authorization': `Bearer ${AGENTMAIL_KEY}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`AgentMail ${path} ${res.status}: ${await res.text()}`);
  // DELETE responses are often an empty body.
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}
