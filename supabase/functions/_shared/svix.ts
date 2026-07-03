// Verify Svix-signed webhook (AgentMail uses Svix).
// Fails closed: throws (caller must reject the request) unless the debug
// bypass flag is explicitly set. A missing/misconfigured secret must never
// silently skip verification, or the endpoint becomes unauthenticated.
import { Webhook } from 'npm:svix@1.29.0';

export async function verifySvix(rawBody: string, headers: Headers, secretEnv = 'AGENTMAIL_WEBHOOK_SECRET') {
  if (Deno.env.get('WEBHOOK_DEBUG_BYPASS_SIGNATURE') === 'true') return;

  const secret = Deno.env.get(secretEnv);
  if (!secret) throw new Error(`${secretEnv} not configured`);

  const wh = new Webhook(secret);
  wh.verify(rawBody, {
    'svix-id': headers.get('svix-id') ?? headers.get('webhook-id') ?? '',
    'svix-timestamp': headers.get('svix-timestamp') ?? headers.get('webhook-timestamp') ?? '',
    'svix-signature': headers.get('svix-signature') ?? headers.get('webhook-signature') ?? '',
  });
}
