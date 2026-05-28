# Trackd

Your job search, finally under control.

Mobile-first (iOS + Android + web) job application tracker with **zero-effort status updates**: AgentMail spins up a `@trackd.app` inbox per user, recruiter emails get classified by Claude, and your kanban pipeline updates automatically.

Stack: **Expo (React Native) · TypeScript · Supabase (Auth + Postgres + Edge Functions + Realtime) · AgentMail · Claude Sonnet 4.5 · Expo Push**.

---

## Repo layout

```
app/                     Expo Router screens
  (auth)/                signin + onboarding (provision trackd email)
  (app)/                 tabbed app: pipeline / list / analytics / settings
                         + add modal + app/[id] detail
components/              StatusBadge, CompanyAvatar, Lockup, KanbanCard
lib/                     supabase client, auth context, data hooks, push
theme/                   design tokens (colors, status palette, fonts)
supabase/
  migrations/0001_init.sql   tables, RLS, pg_trgm, triggers, match_application RPC
  functions/
    on-user-signup/          provision AgentMail pod + inbox on signup
    process-email/           Svix-verified webhook → Claude → match → push
    ghost-detector/          nightly cron: flag silent apps as ghosted
eas.json                 EAS Build profiles (dev / preview / production)
app.json                 Expo config, bundle ids, plugins
```

## One-time local setup

```bash
cd /Users/rakeshk/trackd
npm install
cp .env.example .env
# fill in EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY
npx expo start
```

## Backend setup (Supabase)

1. Create a project at https://supabase.com → copy URL + anon key into `.env`.
2. Apply migration:
   ```bash
   npx supabase link --project-ref <your-ref>
   npx supabase db push
   ```
3. Set Edge Function secrets:
   ```bash
   npx supabase secrets set \
     AGENTMAIL_API_KEY=... \
     AGENTMAIL_WEBHOOK_SECRET=... \
     AGENTMAIL_DOMAIN=trackd.app \
     ANTHROPIC_API_KEY=sk-ant-... \
     EXPO_ACCESS_TOKEN=...
   ```
4. Deploy functions:
   ```bash
   npx supabase functions deploy on-user-signup
   npx supabase functions deploy process-email --no-verify-jwt
   npx supabase functions deploy ghost-detector --no-verify-jwt
   ```
5. Schedule the ghost detector — in Supabase Studio → Edge Functions → Cron, daily at 09:00 UTC, hit `ghost-detector`.

## AgentMail

1. Sign up at https://agentmail.to, verify the `trackd.app` domain (or another you own).
2. Generate an API key → `AGENTMAIL_API_KEY`.
3. The `on-user-signup` function registers a per-inbox webhook pointing at the deployed `process-email` URL. The shared signing secret lives in `AGENTMAIL_WEBHOOK_SECRET`.

## Claude

Anthropic API key → `ANTHROPIC_API_KEY`. Model: `claude-sonnet-4-5`. Cost ≈ $0.003 per email classified.

## Expo Push

No setup needed beyond `expo-notifications`. For higher rate limits create an Expo access token (https://expo.dev → access tokens) and set `EXPO_ACCESS_TOKEN`.

## Building for the stores

```bash
npm install -g eas-cli
eas login
eas init        # ties this repo to an EAS project; replaces projectId placeholder in app.json
eas build --platform ios --profile production
eas build --platform android --profile production
eas submit --platform ios --latest
eas submit --platform android --latest
```

Apple Developer Program ($99/yr) and Google Play Console ($25 one-time) accounts required. Privacy policy must be hosted at `https://trackd.app/privacy` before App Store review.

---

## What I need from you to flip this on

To finish wiring everything end-to-end I need:

1. **Supabase project** — create one and send me the project URL + anon key + service role key.
2. **AgentMail account** + API key, and confirmation of the domain you'll use (`trackd.app` recommended; needs DNS access to add MX records).
3. **Anthropic API key** for the Claude classifier.
4. **Apple Developer + Google Play Console accounts** (when we're ready for TestFlight / Play submission).
5. **Expo account** — free to create at expo.dev — so we can run `eas init` and get a real EAS project id (replace the placeholder in `app.json`).

The app already runs locally without those — auth + UI work against an empty Supabase project; AgentMail/Claude only kick in once their secrets are set in Edge Function env.
