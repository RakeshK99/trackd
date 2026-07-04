# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Trackd — mobile-first (iOS/Android/web) job application tracker. Its hook is zero-effort status
updates: each user gets a provisioned AgentMail inbox; recruiter emails forwarded there are
classified by Claude and automatically move the right application to the right kanban stage.

Stack: Expo (React Native) + TypeScript · Supabase (Auth + Postgres + Edge Functions + Realtime)
· AgentMail (email inboxes) · Claude (`claude-sonnet-4-5`, email classification) · Expo Push.

Supabase project ref: `atzcinurvjhndmdpgdtv` (already linked via `npx supabase link`).

## Commands

```bash
npm install                # install deps
npx expo start              # dev server (Metro) — press i/a/w for iOS/Android/web, or scan QR w/ Expo Go
npx expo start --ios        # shortcuts for the above
npx expo start --android
npx expo start --web
npm run typecheck           # tsc --noEmit — only checks app/lib/components (supabase/functions is Deno, excluded)
```

If `expo start` crashes with `EMFILE: too many open files, watch` on macOS, Node's built-in
watcher can't handle `node_modules`' file count — install Watchman (`brew install watchman`) and
rerun with `npx expo start --clear`.

### Supabase (backend)

```bash
npx supabase login
npx supabase link --project-ref atzcinurvjhndmdpgdtv

npx supabase db push                                   # apply supabase/migrations/*.sql
npx supabase functions deploy on-user-signup
npx supabase functions deploy process-email --no-verify-jwt   # called by AgentMail, not a logged-in user
npx supabase functions deploy ghost-detector --no-verify-jwt  # called by cron, not a logged-in user

npx supabase secrets set KEY=value                     # AGENTMAIL_API_KEY, AGENTMAIL_WEBHOOK_SECRET,
                                                          # AGENTMAIL_DOMAIN, ANTHROPIC_API_KEY, EXPO_ACCESS_TOKEN,
                                                          # GHOST_DETECTOR_SECRET (shared bearer secret the
                                                          # cron/scheduler must send — ghost-detector has no other
                                                          # auth since it's deployed with --no-verify-jwt)
npx supabase secrets list
npx supabase functions logs process-email               # debug the webhook pipeline
```

`SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` are auto-injected into Edge Functions — never set
them manually and never put the service-role key in client code or `.env`.

`supabase/config.toml` pins `major_version = 17` to match the linked remote Postgres version;
update it if the remote is upgraded, or `supabase link` will warn.

## Architecture

### Client (Expo Router, `app/`)

- `app/_layout.tsx` — root layout; loads fonts, wraps everything in `AuthProvider`, and runs
  `AuthGate`, which redirects between `(auth)` and `(app)` route groups based on `session` +
  `user.onboarded` (see `lib/auth.tsx`).
- `app/(auth)/` — sign in/up (`index.tsx`) and `onboarding.tsx` (typewriter-style intro that
  triggers inbox provisioning and displays the trackd email + Gmail-forwarding CTA).
- `app/(app)/` — tab layout (`_layout.tsx`) wraps its screens in `ApplicationsProvider` and
  `ActivityProvider` (see below), and registers for push on mount. Tabs: `index` (kanban
  pipeline), `list` (all apps), `analytics`, `settings`; `add` and `app/[id]` are modal/detail
  routes hidden from the tab bar (`href: null`).
- `lib/` — no separate "API layer"; Supabase is queried directly from components/providers via
  the shared client in `lib/supabase.ts` (SecureStore-backed session storage on native,
  AsyncStorage on web since SecureStore isn't available in browsers).
- `theme/tokens.ts` — single source of truth for colors (`T`), the `AppStatus` union, per-status
  color/label (`STATUS`), and font family constants. Ported 1:1 from an external design prototype
  (`shared.jsx`) — keep it in sync if the design system changes elsewhere.

**State pattern**: `lib/applications.tsx` and `lib/activity.tsx` are each a single
context+provider that owns one Supabase fetch + one Realtime channel subscription, exposed to all
descendant screens via `useApplications()` / `useActivity()`. This is deliberate — mounting the
same `postgres_changes` subscription from multiple screens previously caused duplicate-channel
crashes. When adding a new screen that needs applications or activity data, consume the existing
context; don't create a new subscription.

### Backend (Supabase, `supabase/`)

- `migrations/0001_init.sql` — schema: `users` (mirrors `auth.users` + AgentMail/plan fields),
  `applications`, `timeline_events` (append-only), `email_events` (raw inbound audit/dedup),
  `push_tokens`. Notable server-side logic:
  - `enforce_active_app_limit()` trigger enforces the free-tier 15-active-application cap and
    maintains `users.active_app_count` incrementally on insert/archive/delete.
  - `log_status_change()` trigger auto-inserts a `timeline_events` row and bumps
    `last_activity` whenever `applications.status` or `.notes` changes.
  - `match_application(p_user_id, p_company)` RPC does fuzzy company matching via `pg_trgm`
    (`similarity(...) > 0.45`) — this is how inbound emails get attached to the right application.
  - `handle_new_user()` trigger auto-creates a `public.users` row when `auth.users` gets one.
  - RLS is on for every table; owner-scoped policies (`auth.uid() = user_id`) — service-role
    Edge Functions bypass RLS by design.
- `migrations/0002_realtime.sql` — adds `applications`/`timeline_events` to the
  `supabase_realtime` publication; without this, server-side writes (from the email pipeline)
  never reach subscribed clients even though `postgres_changes` looks correctly configured.
- `functions/on-user-signup/` — provisions an AgentMail "pod" (tenant isolation) + inbox per user,
  stores `agentmail_pod_id`/`agentmail_inbox_id`/`trackd_email` on their `users` row. Invoked
  directly from the client during onboarding (`app/(auth)/onboarding.tsx`'s mount effect — the
  single call site; don't add another one, e.g. in the sign-up screen, or you reintroduce a
  provisioning race). Bails early if `agentmail_inbox_id` is already set, and passes `client_id:
  userId` on both the pod and inbox creation calls so AgentMail itself de-dupes concurrent/retried
  invocations for the same user instead of creating a second pod+inbox.
- `functions/process-email/` — the core automation. AgentMail webhook (`message.received`) → Svix
  signature verification via `_shared/svix.ts` (fails closed: a missing/misconfigured
  `AGENTMAIL_WEBHOOK_SECRET` rejects the request with 401, it does not skip verification —
  bypassable only via the explicit `WEBHOOK_DEBUG_BYPASS_SIGNATURE=true` flag while confirming
  wiring, which should be unset again once wiring is confirmed) → parse the confirmed AgentMail
  payload shape (`{ event_type, message: { inbox_id, message_id, from, subject, text, ... } }`,
  field resolution stays defensive/multi-key as a safety net) → classify with Claude
  (`claude-sonnet-4-5`, which also extracts a `role` guess) → resolve user via `inbox_id` →
  fuzzy-match application via `match_application` RPC (only applied when `confidence >= 0.6`) →
  on a match, update status + enrich the `timeline_events` row that `log_status_change()` already
  auto-inserted (rather than inserting a second row) + push notification. On *no* match, if the
  classified status is `applied` (an automated "we received your application" confirmation, not
  just any update) at `confidence >= 0.6`, auto-creates the application instead of dropping the
  email — this is how applying somewhere outside Trackd (LinkedIn, a careers page, etc.) still
  ends up tracked, since there's no existing row to match against. The `email_events` row for this
  `agentmail_message_id` is inserted *before* processing (as an atomic dedup claim — a
  unique-constraint conflict means a retry/redelivery, so the handler bails immediately) and
  updated with classification results at the end.
  There is a single account-level AgentMail webhook shared across all users/inboxes (not
  one-per-inbox) — simpler signature verification with one shared secret; the function resolves
  the owning user from `inbox_id` in the payload.
- `functions/ghost-detector/` — meant to run on a daily cron (see README for the Supabase Studio
  scheduler steps); flags applications with no activity in 14+ days as `ghosted` and relabels the
  trigger-inserted `timeline_events` row to `ghost_flagged` (rather than inserting a duplicate),
  and batches an Expo push per affected user. Deployed with `--no-verify-jwt` (the caller is a
  scheduler, not a logged-in user) so it authenticates itself: requires
  `Authorization: Bearer <GHOST_DETECTOR_SECRET>` or responds 401.
- `functions/_shared/` — `supabaseAdmin.ts` (service-role client), `push.ts` (batches Expo push
  sends in chunks of 100), `svix.ts` (webhook signature verification helper).
- These functions run on Deno (`npm:`/`jsr:` specifier imports), which is why
  `tsconfig.json` excludes `supabase/functions` from the app's `tsc --noEmit` — Deno validates
  that code at deploy time, not the RN toolchain.

### AgentMail specifics

MVP uses AgentMail's free managed domain (`agentmail.to`) — no DNS setup needed. A custom domain
(`trackd.app`) requires upgrading the AgentMail plan and adding MX records; that's a pre-launch
step, not required for local development.

## Security notes

- Never commit `.env` (gitignored) — it only ever holds the public `EXPO_PUBLIC_SUPABASE_URL` /
  `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
- The Supabase service-role key, AgentMail API key/webhook secret, and Anthropic API key only
  belong in Edge Function secrets (`npx supabase secrets set`) — never in client code, `.env`, or
  git history.
- If a secret is ever pasted into a chat/terminal transcript that leaves the machine, treat it as
  exposed and rotate it (Supabase → Settings → API for service-role/anon; AgentMail dashboard for
  its API key; Anthropic console → API Keys for `sk-ant-...`).
