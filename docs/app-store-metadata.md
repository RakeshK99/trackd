# App Store Connect — copy-paste metadata

Everything below is drafted for you to paste directly into App Store Connect. Adjust tone/wording
to taste — nothing here is final until you submit.

## App Information

- **Name:** Trackd
- **Subtitle** (30 char max): `Job search, automated`
- **Primary category:** Productivity
- **Secondary category:** Business
- **Privacy Policy URL:** https://rakeshk99.github.io/trackd-legal/privacy.html
- **Support URL:** https://rakeshk99.github.io/trackd-legal/support.html

## Promotional text (170 char max, editable anytime without review)

```
Forward recruiter emails to your Trackd inbox and watch your pipeline update itself. No manual
status changes, no spreadsheets — just your job search, tracked.
```

## Description (4000 char max)

```
Trackd is the job-application tracker that updates itself.

Every application gets its own personal Trackd email address. Forward recruiter emails there (or
set up a one-time Gmail filter to do it automatically) — Trackd reads each one, figures out what
happened, and moves the right application to the right stage. Interview invite? Moved to
Interview. Offer letter? Moved to Offer. No manual data entry.

WHAT YOU GET
- A kanban pipeline (Saved, Applied, Phone Screen, Interview, Offer, Ghosted) that updates itself
  as recruiter emails come in
- A searchable, filterable list of every application
- A full timeline per application: every status change, every email, every note
- Automatic "ghost" detection — Trackd flags applications that have gone quiet for 14+ days so you
  know when to follow up
- Push notifications for the moments that matter: interviews, offers, and ghosting alerts
- Response-rate and pipeline analytics so you can see what's actually working

HOW IT WORKS
1. Sign up and get your personal @trackd inbox address
2. Forward recruiter emails there (or set up an auto-forwarding filter once)
3. Add your applications with company, role, and status
4. Watch your pipeline update itself as responses come in

Your data is private to your account — Trackd never sells your information. See our Privacy
Policy for details on what we collect and why.

Free tier includes up to 15 active applications.
```

## Keywords (100 char max, comma-separated)

```
job search,job tracker,application tracker,recruiter email,job hunt,career,interview,job pipeline
```

## What's New (for this version)

```
Welcome to Trackd! Track your job search, forward recruiter emails to your personal Trackd inbox,
and watch your pipeline update itself.
```

---

## Age Rating questionnaire

Trackd has no user-generated public content, no social/chat features, and no objectionable
material. Answer "None"/"No" to every category (violence, sexual content, profanity, alcohol/drugs,
gambling, horror, mature/suggestive themes, unrestricted web access, contests). This should
qualify for a **4+** rating.

---

## App Privacy ("nutrition label") questionnaire

Based on what the app and its Supabase/AgentMail/Anthropic backend actually collect (no analytics
or crash-reporting SDKs are integrated — verified against package.json):

| Data type | Collected? | Linked to user? | Used for tracking? | Purpose |
|---|---|---|---|---|
| Email Address | Yes | Yes | No | App functionality (account, forwarding inbox) |
| Name | Yes | Yes | No | App functionality (display name) |
| Other User Content (application data: company, role, notes) | Yes | Yes | No | App functionality |
| Other User Content (forwarded email content: sender, subject, body preview) | Yes | Yes | No | App functionality (status classification) |
| Device ID / Push Token | Yes | Yes | No | App functionality (push notifications) |
| User ID | Yes | Yes | No | App functionality (account identification) |

Everything else (Location, Contacts, Browsing History, Search History, Financial Info, Health,
Sexual Orientation, Analytics, Advertising Data) — **Data Not Collected**.

Answer "No" to "Do you or your third-party partners use data collected from this app to track
users?" — there is no advertising SDK and no cross-app/cross-site tracking.

Third parties data is shared with (for App Store Connect's data-sharing disclosure): Supabase
(database/auth hosting), AgentMail (email inbox provisioning), Anthropic (email classification via
Claude API), Expo (push notification delivery). None of these are advertising/data-broker sharing.

---

## Export Compliance

`app.json` already sets `ITSAppUsesNonExemptEncryption: false` — when App Store Connect asks about
encryption, you can answer "No" (the app only uses standard HTTPS/TLS, no proprietary encryption).
