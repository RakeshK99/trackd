// Verify Svix-signed webhook (AgentMail uses Svix).
// Returns parsed JSON payload or throws on signature failure.
import { Webhook } from 'npm:svix@1.29.0';

export async function verifySvix(req: Request, secretEnv = 'AGENTMAIL_WEBHOOK_SECRET'): Promise<any> {
  const secret = Deno.env.get(secretEnv);
  if (!secret) throw new Error(`${secretEnv} not configured`);
  const body = await req.text();
  const headers = {
    'svix-id': req.headers.get('svix-id') ?? '',
    'svix-timestamp': req.headers.get('svix-timestamp') ?? '',
    'svix-signature': req.headers.get('svix-signature') ?? '',
  };
  const wh = new Webhook(secret);
  return wh.verify(body, headers);
}
