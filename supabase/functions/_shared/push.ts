// Send Expo push notifications. Batches of 100 per Expo API limits.
import { supabaseAdmin } from './supabaseAdmin.ts';

interface ExpoMessage {
  to: string;
  title?: string;
  body: string;
  sound?: 'default';
  data?: Record<string, unknown>;
}

export async function sendPushToUser(userId: string, title: string, body: string, data?: Record<string, unknown>) {
  const { data: tokens } = await supabaseAdmin
    .from('push_tokens')
    .select('token')
    .eq('user_id', userId);
  if (!tokens || tokens.length === 0) return;

  const messages: ExpoMessage[] = tokens.map((t) => ({
    to: t.token,
    sound: 'default',
    title,
    body,
    data,
  }));

  await sendBatch(messages);
}

export async function sendBatch(messages: ExpoMessage[]) {
  const chunks: ExpoMessage[][] = [];
  for (let i = 0; i < messages.length; i += 100) chunks.push(messages.slice(i, i + 100));
  await Promise.all(
    chunks.map((chunk) =>
      fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
          ...(Deno.env.get('EXPO_ACCESS_TOKEN')
            ? { Authorization: `Bearer ${Deno.env.get('EXPO_ACCESS_TOKEN')}` }
            : {}),
        },
        body: JSON.stringify(chunk),
      }),
    ),
  );
}
