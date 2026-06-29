# DatePad

> **Never forget a date that matters.**

A birthday & important-date tracker that reminds you *well in advance* — a week out, a day out, and the morning of — so you have time to actually do something about it. Add a person or a date once; get smart, escalating reminders forever.

---

## Why DatePad

Calendar apps remind you the day of — too late to buy a gift, book a table, or write something thoughtful. DatePad is built around **advance, escalating notice** plus a little help with the follow-through (gift ideas, message drafts), so the reminder turns into action instead of guilt.

**Differentiator vs. a plain calendar:** advance + escalating reminders, flexible recurrence handled automatically, and optional gifting/message help.

## Core Features (MVP)

- **Add people & dates once** — birthdays, anniversaries, and custom important dates.
- **Flexible recurrence** — yearly, monthly, one-off, or every-N-years; repeating dates roll over automatically with no re-entry.
- **Advance, escalating reminders** — per-date, customizable lead times (on the day / 1 day / 3 days / 1 week / 2 weeks / 1 month before), with a master on/off per date.
- **Push notifications** — reminders arrive even when the app is closed.
- **Upcoming view** — see what's coming and how many days are left at a glance, with search and sort (soonest / A–Z / newest).
- **Share a date** — send a one-line "X is in N days" via the native share sheet.

## Planned / Premium (later)

- **Gift ideas** — suggestions tied to the person/occasion.
- **Message drafts** — ready-to-send greetings you can tweak.
- **Unlimited dates** — free tier covers a handful; paid unlocks the rest.

AI features ship in a later phase. When they do, they'll use the cheapest viable approach (canned templates where possible, a low-cost model only where generation is genuinely needed) — decided at build time, not now.

## Architecture

The core promise is reminders that fire **weeks in advance** and **every year forever**. Pure on-device scheduled notifications can't deliver that reliably:

- iOS caps pending local notifications at **64 per app** (25 dates × 3 lead-times overflows it).
- Android OEMs aggressively kill scheduled alarms for battery.
- Far-future + recurring-annual scheduling is where local notifications are least reliable.

So reminders are **server-driven**:

```
pg_cron (daily)  →  Edge Function "send-reminders"  →  Expo Push (FCM + APNs)  →  device
```

A daily scheduled job queries "whose reminders fire today?" and sends the pushes. Optionally, near-term reminders are *also* scheduled as local notifications for redundancy, with the server push as source of truth.

**Implemented (server side):** each date carries `lead_days` (default `{7,1,0}`), a `reminders_enabled` flag, and a `recurrence` (`annual` / `monthly` / `once` / `everyNYears`, with `recurrence_years`). The SQL helper `next_occurrence(...)` computes the next occurrence per recurrence type (clamping the day to the month length, e.g. Feb 29 → Feb 28 off-leap), and `reminders_due(p_today)` returns every enabled date whose next occurrence minus today lands on one of its lead days. The `send-reminders` edge function calls it, joins each owner's `push_tokens`, builds the message copy, and posts to the Expo Push API (accepts `{ "today", "dryRun" }` overrides for testing). `pg_cron` invokes it daily at 09:00 UTC, reading the function URL + service key from Vault. The client lead-time editor is built; still TODO: the client registering its Expo push token (needs a real device).

## Tech Stack

- **Expo (React Native + TypeScript)** — one codebase, Android first, iOS later.
- **expo-router** — navigation.
- **Supabase** — Postgres + Auth + Edge Functions + **pg_cron** (the reminder scheduler lives next to the data).
- **Expo Push** — wraps FCM + APNs behind one API.

Chosen on merits: the reminder engine is a SQL scheduling problem (Postgres + pg_cron), and cross-platform-from-one-codebase fits an Android-first / iOS-later plan.

## Design / Theme

**Coral / Warm** — friendly and celebratory (it's an app about loved ones) while staying a clean, legible utility. Light mode first; dark mode later.

| Token | Hex | Use |
|---|---|---|
| `accent` | `#FF6B5E` | primary buttons, highlights, active state |
| `accent-pressed` | `#E8503F` | pressed/active accent |
| `background` | `#FFF7F2` | app background (warm cream) |
| `surface` | `#FFFFFF` | cards, sheets |
| `text` | `#22201E` | primary text (warm ink) |
| `text-muted` | `#8A817C` | secondary text, captions |

**Countdown / urgency scale** (functional, used on date badges regardless of theme):

| State | Hex | Meaning |
|---|---|---|
| `far` | `#3FB27F` | plenty of time |
| `soon` | `#F2A53C` | coming up |
| `today` | `#FF6B5E` | today / overdue |

## Data Model

- **important_dates** — owner, name, `category_id`, month/day (+ optional year), optional time-of-day, note, `recurrence` (+ `recurrence_years`), `lead_days` (e.g. `{7,1,0}`), `reminders_enabled`.
- **categories** — built-in client constants (birthday / anniversary / holiday / reminder) plus user-created tags persisted per user.
- **push_tokens** — one row per device, for server-driven Expo Push.

## Repo Structure

Single repo — the Expo app and the (small, tightly-coupled) Supabase backend live together so changes land atomically.

```
datepad/
├─ README.md
├─ package.json, app.json     ← Expo app at root
├─ app/                       ← expo-router screens
├─ components/ , lib/ ...
└─ supabase/
   ├─ migrations/             ← schema (people, dates, reminder_rules)
   ├─ functions/
   │   └─ send-reminders/     ← daily pg_cron → Expo Push job
   └─ config.toml
```

## Running locally

This is an Expo **development build** (installed natively, not Expo Go):

```bash
npm install
npm run android   # builds + installs the dev APK, then starts Metro
```

On Windows, build through a short path (e.g. a `C:\dp` junction to this repo) to
avoid MAX_PATH issues during the Gradle build. The generated `android/` folder is
gitignored — it's regenerated from `app.json` via Expo prebuild.

### Backend (Supabase)

The app reads/writes through a single `useStore()` seam with two backends:
**AsyncStorage** when signed out (local-only, offline) and **Supabase** when
signed in (synced, RLS-scoped per user). Sign-in is optional, via an emailed
6-digit code; on a user's first sign-in their local data migrates up to the
cloud.

Run the local stack (Docker required) and point the app at it:

```bash
npx supabase start          # boots Postgres/Auth/etc. on the 544xx ports
```

Create a `.env` (gitignored) with the values `supabase start` prints:

```bash
EXPO_PUBLIC_SUPABASE_URL=http://10.0.2.2:54421   # 10.0.2.2 = host, from the Android emulator
EXPO_PUBLIC_SUPABASE_ANON_KEY=<ANON_KEY from `supabase start`>
```

Migrations live in `supabase/migrations/`; the OTP email template is
`supabase/templates/magic_link.html`. Restart Metro after editing `.env`
(`EXPO_PUBLIC_*` vars are inlined at bundle time). Locally, emails land in
Mailpit at <http://127.0.0.1:54424>.

## Roadmap

- [x] Scaffold base app (Expo Router, Coral theme)
- [x] Upcoming list + date detail + edit + delete
- [x] Custom tags/categories with inline "create on the spot"
- [x] Local persistence (AsyncStorage) — the seam we'll swap for Supabase
- [x] Native Android dev build
- [x] Real date picker (native calendar + time picker)
- [x] Supabase persistence + auth (email OTP, optional, local fallback + migrate-on-sign-in)
- [x] Per-date customizable reminders (lead-time editor + master toggle)
- [x] Flexible recurrence (annual / monthly / one-off / every-N-years), server `reminders_due` aware
- [x] Upcoming search + sort; share a date
- [~] Advance-notice notification engine — server side + client lead-time UI done; client push-token registration still TODO (needs a real device)
- [ ] Premium tier (unlimited + gift ideas + message drafts)
- [ ] iOS build

## Status

MVP shell working on-device. Name, tagline, stack, and architecture locked:

- **Name:** DatePad
- **Tagline:** *Never forget a date that matters.*
- **Repo:** https://github.com/llxSKyWALKeRxll/datepad

Data model: `important_dates` (name, categoryId, month/day, optional year,
optional time-of-day, note, recurrence, lead_days, reminders_enabled) +
`categories` (built-in client constants + user-created tags). Both persist
locally or to Supabase behind one `useStore()` seam. Next up: client Expo
push-token registration (needs a real device), then the premium tier.

---

_Part of the products_to_ship workspace._
