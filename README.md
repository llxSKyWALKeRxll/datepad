# DatePad

> **Never forget a date that matters.**

A birthday & important-date tracker that reminds you *well in advance* — a week out, a day out, and the morning of — so you have time to actually do something about it. Add a person or a date once; get smart, escalating reminders forever.

---

## Why DatePad

Calendar apps remind you the day of — too late to buy a gift, book a table, or write something thoughtful. DatePad is built around **advance, escalating notice** plus a little help with the follow-through (gift ideas, message drafts), so the reminder turns into action instead of guilt.

**Differentiator vs. a plain calendar:** advance + escalating reminders, recurring annual events handled automatically, and optional gifting/message help.

## Core Features (MVP)

- **Add people & dates once** — birthdays, anniversaries, and custom important dates.
- **Recurring annual events** — yearly dates repeat automatically; no re-entry.
- **Advance, escalating reminders** — configurable lead times (e.g. 1 week / 1 day / day-of).
- **Push notifications** — reminders arrive even when the app is closed.
- **Upcoming view** — see what's coming and how many days are left at a glance.

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

A daily scheduled job queries "whose reminders fire today?" (a relational range query over people ↔ dates ↔ reminder_rules) and sends the pushes. Optionally, near-term reminders are *also* scheduled as local notifications for redundancy, with the server push as source of truth.

## Tech Stack

- **Expo (React Native + TypeScript)** — one codebase, Android first, iOS later.
- **expo-router** — navigation.
- **Supabase** — Postgres + Auth + Edge Functions + **pg_cron** (the reminder scheduler lives next to the data).
- **Expo Push** — wraps FCM + APNs behind one API.

Chosen on merits: the reminder engine is a SQL scheduling problem (Postgres + pg_cron), and cross-platform-from-one-codebase fits an Android-first / iOS-later plan.

## Data Model (draft)

- **people** — name, relationship, notes, optional photo.
- **dates** — owner, label, type (birthday / anniversary / custom), month/day (+ optional year), `recurring` flag, linked person.
- **reminder_rules** — per-date lead times (e.g. `[7d, 1d, 0d]`), notification channel.

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

## Roadmap

- [ ] Write full spec
- [ ] Data model (people, dates, reminder rules)
- [ ] Advance-notice notification engine (pg_cron → Edge Function → Expo Push)
- [ ] MVP build (add dates + reminders + upcoming view)
- [ ] Premium tier (unlimited + gift ideas + message drafts)
- [ ] iOS build

## Status

Early — moving from idea to spec. Name, tagline, stack, and architecture locked:

- **Name:** DatePad
- **Tagline:** *Never forget a date that matters.*
- **Repo:** https://github.com/llxSKyWALKeRxll/datepad

---

_Part of the products_to_ship workspace._
