# Skating Association Platform

A complete website + sports management platform for a skating association:
a public website, an athlete (student) portal and an admin portal. It uses
**Google Sheets as the database, Google Drive for files and Google Apps
Script as the backend API**. There is no other database.

```
Browser ──► Next.js website (public pages, student & admin portals)
               │  server-side only: /api/gas proxy + httpOnly session cookie
               ▼
        Google Apps Script Web App  (apps-script/src — the API, auth, automation)
               │
               ├──► Google Sheets  SKATING_ASSOCIATION_DATABASE (28 sheets)
               └──► Google Drive   SKATING ASSOCIATION/ (posters, photos, documents, certificates)
```

Every event, program, gallery image, membership plan, price, announcement,
sponsor, contact detail and piece of website text comes from Google Sheets.
Change the sheet (or use the admin portal) and the website updates on the next
request, with no code changes.

## What's included

| Area | Highlights |
|---|---|
| **Public website** | Home (hero, live statistics, upcoming events with countdowns, announcements, programs, plans, gallery, videos, sponsors), About, Events (Upcoming / Ongoing / Past tabs, type chips, state/city/month filters, search, pagination), event details (`/events/{slug}`, categories, schedule, rules, sponsors, map, SEO + JSON-LD), public results, rankings, Programs & certification, Gallery (masonry + lightbox + videos), Membership, Contact, verification pages, Privacy, Terms |
| **Event automation** | UPCOMING / ONGOING / PAST / CANCELLED are **calculated from dates in the association timezone on every request** (`getEventLifecycleStatus`). Registration counts come from `COUNT(Event_Registrations)`. The deadline, capacity and admin overrides close registration automatically |
| **Student portal** | Registration with consent + guardian consent, Google sign-in or password, dashboard (membership, events, certificates, medals, personal bests, activity), profile, digital membership card with QR, event registration flow (profile → category → confirm → payment → REG number), registrations with bib/heat/lane/results, printable receipts, results, certificates (PDF + verification QR), achievements, documents, notifications |
| **Admin portal** | Dashboard with charts, Students, Memberships (approve/reject/renew/suspend, plans), Events (create/edit/publish/cancel/archive, poster & rules upload to Drive, category generator, event report), Registrations (filters, bib assignment, manual registrations, CSV / Google Sheet export), Programs, Certifications, Results entry + publish, Certificates (auto-generated PDFs), Achievements, Ranking rules, Gallery upload, Videos, Announcements, Sponsors, Payments, Inquiries, Reports, Website content, Settings, Audit / error logs |
| **Payments** | Configurable: `MANUAL` (offline + admin verification) or `RAZORPAY` (server-side signature verification + payment lookup + signed webhook). Card data is never stored |
| **Automation** | Daily trigger: membership expiry (30/7-day notices → EXPIRED), 7-day and 1-day event reminders, releasing unpaid registrations. `onEdit` trigger: fills missing IDs/slugs and stamps `Updated_At` for conflict detection when the sheet is edited directly |
| **Security** | Role checks on every Apps Script action, proxy secret (the API is reachable only through the website server), httpOnly session cookie, PBKDF2 password hashes, verified Google ID tokens, rate limits, honeypot, formula-injection guard, audit logs, public endpoints expose no private data |

## Repository layout

```
apps-script/
  src/               Google Apps Script backend (copy these files into your Apps Script project)
  tests/             Node test harness: runs the real .gs code against in-memory Google mocks
  dev/mock-server.js Local mock of the deployed Web App (for development & demos)
src/
  app/(site)/        Public website pages
  app/dashboard/     Student portal
  app/admin/         Admin portal (login + (portal) pages)
  app/api/           gas proxy, auth (cookie), payment webhook, setup
  components/        UI kit, event/program/gallery/membership components, admin EntityManager
  lib/               api.ts (central browser API service), server/ (Apps Script client), types, format
docs/SETUP.md        Step-by-step installation guide
docs/API.md          API actions, sheets and relationships
```

## Quick start (local demo, no Google account needed)

```bash
npm install
cp .env.example .env.local        # then set APPS_SCRIPT_URL=http://localhost:8787 and API_PROXY_SECRET=dev-proxy-secret
npm run mock:api                  # runs the real backend code in memory, seeded with demo data
npm run dev                       # http://localhost:3000
```

Demo logins: **admin@demo.local / Admin12345** (at `/admin/login`) and **student@demo.local / Student123**.

## Production

Follow **[docs/SETUP.md](docs/SETUP.md)**. In short: create the Apps Script project from
`apps-script/src`, set Script Properties, run `setupSystem()` (or use `/setup`), deploy it as a
Web App, and deploy this Next.js app (e.g. Vercel) with `APPS_SCRIPT_URL` and `API_PROXY_SECRET`.

## Checks

```bash
npm run test:backend   # 51 backend tests incl. the 10 demo tests from the specification
npm run typecheck
npm run lint
npm run build
```
