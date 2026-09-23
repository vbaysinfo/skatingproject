# Setup guide

This guide takes you from nothing to a live website. You need a Google account and a host
for the Next.js website (Vercel is the simplest; any Node.js 20+ host works).

## 1. Create (or choose) a Google account

Use an account owned by the association (e.g. `skating.association@gmail.com` or a Google Workspace account).
The Apps Script runs as this account, and every spreadsheet and Drive file is owned by it.

## 2. Create the Google Drive root folder

In Google Drive create a folder, e.g. `Association Platform`. Copy its URL or ID
(the part after `/folders/`). You do **not** need to create any sub-folders: setup creates
`SKATING ASSOCIATION/Website, Events, Students, Memberships, Programs, Gallery, Certificates, Documents, Reports`
and records every folder ID in the `Drive_Folders` sheet.

## 3. Create the Google Apps Script project

Go to <https://script.google.com> → **New project** and name it `Skating Association API`.

*(Optional)* To get a **Skating Association** menu inside the spreadsheet, create the script from the
spreadsheet instead (**Extensions → Apps Script**) after step 7.

## 4. Add the script files

Copy every file from `apps-script/src/` into the project (one script file per `.gs` file, same names).
Open **Project Settings → Show "appsscript.json"** and replace its contents with `apps-script/src/appsscript.json`.

Using [clasp](https://github.com/google/clasp) instead:

```bash
npm i -g @google/clasp && clasp login
cp apps-script/.clasp.json.example apps-script/.clasp.json   # put your scriptId in it
cd apps-script && clasp push
```

## 5–6. Configure Script Properties (spreadsheet + Drive folder IDs)

**Project Settings → Script properties → Add property**:

| Property | Value |
|---|---|
| `GOOGLE_DRIVE_ROOT_FOLDER_ID` | the folder ID from step 2 (**required**) |
| `GOOGLE_SHEET_ID` | *leave empty* to let setup create `SKATING_ASSOCIATION_DATABASE`, or an existing spreadsheet ID |
| `API_PROXY_SECRET` | a long random string, e.g. the output of `openssl rand -hex 32`. The website must use the same value |
| `SETUP_TOKEN` | a random string, needed only if you use the web wizard at `/setup` |
| `SITE_URL` | `https://www.your-association.org` (used in QR codes and verification links) |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | first administrator (the password is deleted automatically after setup) |
| `ASSOCIATION_NAME` | optional |
| `CREATE_SAMPLE_DATA` | `TRUE` to create removable demo events, programs and plans |
| `GOOGLE_CLIENT_ID` | optional, for Google Sign-In (see step 12) |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` | optional, for online payments |

Secrets live only in Script Properties, never in the spreadsheet.

## 7. Run `setupSystem()`

In the editor, select `setupSystem` in the function list and click **Run**. The log shows every step:

1. Connect Google account → 2. Drive root folder → 3. Create spreadsheet → 4. Create all 28 sheets →
5. Create headers → 6. Default settings → 7. Drive folders → 8. Save IDs → 9. First admin →
10. Association details → (sample data) → 11. Install triggers → 12. **SYSTEM READY**

Setup is idempotent. Running it again repairs missing sheets, columns and folders without touching data.

## 8. Authorise permissions

The first run asks for permissions: Sheets, Drive, external requests (Google token verification,
Razorpay and QR images), triggers, and email for optional notifications. Approve them.
(For an unverified app, click *Advanced → Go to project*.)

## 9. Deploy the Web App

**Deploy → New deployment → Web app**:

- Execute as: **Me**
- Who has access: **Anyone**

"Anyone" is required so the website server can call it. Access is still restricted: every request
must carry `API_PROXY_SECRET`, and user actions need a valid session with the right role.

## 10. Copy the API URL

Copy the Web App URL (it ends in `/exec`). After changing code, use **Manage deployments → Edit →
New version** so the URL stays the same.

## 11. Configure the frontend

```bash
cp .env.example .env.local
```

| Variable | Value |
|---|---|
| `APPS_SCRIPT_URL` | the `/exec` URL from step 10 |
| `API_PROXY_SECRET` | same value as the Script Property |
| `NEXT_PUBLIC_SITE_URL` | public URL of the website |
| `REVALIDATE_SECONDS` | how long public pages may be served from cache (default 60) |
| `ASSOCIATION_TIMEZONE` | fallback only; the live value is the `TIMEZONE` setting |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | optional; the `GOOGLE_CLIENT_ID` Script Property takes precedence |

Run it locally with `npm install && npm run dev`.

> Alternative to steps 7–8: open `https://your-site/setup`, enter the `SETUP_TOKEN`, the Drive folder
> and the first admin, and click **Run setup**. You still need to authorise the script once in the editor
> (run any function) before deploying.

## 12. Configure the admin

Sign in at `/admin/login` with the first admin, then:

- **Website**: association name, logo, hero, about, contact details, social links, map, privacy and terms.
- **Settings**: timezone (default `Asia/Kolkata`), currency, payment gateway, auto-approval, cache, page sizes,
  **Keys & integrations** (Razorpay, Google client ID, site URL) and extra administrators.
- **Memberships → Plans & prices**, **Ranking rules**, **Programs**, **Certifications**, **Sponsors**.
- **Google Sign-In (optional)**: in Google Cloud Console create an OAuth client ID (Web), add your site URL
  to *Authorized JavaScript origins*, and set `GOOGLE_CLIENT_ID`.
- **Razorpay (optional)**: set the keys, set `PAYMENT_GATEWAY = RAZORPAY`, and add a webhook to
  `https://your-site/api/payments/webhook` (events `payment.captured`, `payment.failed`, `order.paid`) with
  the same webhook secret.

## 13. Test the public website

Open `/`: the hero, statistics and sample events appear. Check `/events` (Upcoming / Ongoing / Past),
an event page, `/programs`, `/gallery` and `/membership`.

## 14. Test student registration

Open `/register` and create an athlete. A `STU-YYYY-000001` ID is created, along with the Drive folder
`Students/STU-…/{Photo,Documents,Certificates}`.

## 15. Test event registration

Open an event → **Register** → confirm profile → choose a category → accept terms → payment.
You get a `REG-YYYY-000001` number, and the event's registration count increases.
With the MANUAL gateway, approve the payment under **Admin → Payments**.

## 16. Test membership

Open **Membership** → choose a plan → apply → pay. Then **Admin → Memberships → Approve**. The student
dashboard shows the digital card with a QR code linking to `/verify/member/MEM-…`.

## 17. Test certificates

**Admin → Results**: select an event, enter times and positions → **Save** → **Publish** → **Certificates**.
PDFs are saved to `Certificates/{Student_ID}` and appear in the student's dashboard and at
`/verify/certificate/CERT-…`.

## 18. Deploy the production website

Vercel: import the repository, set the environment variables from step 11 and deploy. Any Node host:
`npm run build && npm start`. Then set `SITE_URL` (Script Property) to the final domain.

> Build with the Apps Script URL reachable. If the backend is down during the build, static pages start
> in an error state and refresh on the first request after `REVALIDATE_SECONDS`.

---

## Demo test checklist (spec §160)

All ten run automatically in `npm run test:backend` against the real backend code:

| # | Action | Expected |
|---|---|---|
| 1 | Create + publish event | appears on the website |
| 2 | Change event fee | website shows the new fee |
| 3 | Set end date to yesterday | event moves to Past |
| 4 | Create program | appears automatically |
| 5 | Upload gallery image | appears automatically |
| 6 | Register student | student record created |
| 7 | Register for event | registration count increases |
| 8 | Reach maximum participants | registration closes (FULL) |
| 9 | Create membership | appears in the student dashboard |
| 10 | Issue certificate | appears in the dashboard and the verification page |

## Operating notes

- **Editing the spreadsheet directly** is supported. The `onSheetEdit` trigger fills missing IDs and slugs,
  stamps `Updated_At` (the admin portal rejects stale saves with a conflict message) and clears the website
  cache. Keep header names unchanged; the column order can change.
- **Caching**: Apps Script caches public data (`CACHE_SECONDS`), and the website caches pages
  (`REVALIDATE_SECONDS`). Admin changes clear both immediately. **Admin → Settings → Clear website cache**
  forces a refresh.
- **Sample data**: **Admin → Settings → Delete sample data** removes only the demo records.
- **Quotas**: Apps Script consumer accounts allow about 20k URL fetches and 100 emails a day. Keep
  `EMAIL_NOTIFICATIONS` off unless needed. Sheets comfortably handle tens of thousands of rows per sheet.
- **Backups**: *File → Version history* on the spreadsheet; Drive keeps file history too.
