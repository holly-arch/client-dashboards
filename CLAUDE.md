# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — Start dev server (Turbopack)
- `npm run build` — Production build (also runs TypeScript checking)
- `npm run lint` — ESLint
- No test suite configured

## Architecture

This is a **multi-tenant campaign dashboard** built with Next.js 16 (App Router). A single codebase is deployed as 20+ separate Vercel projects (one per client). Each deployment is configured purely via environment variables: `GOOGLE_SHEET_ID`, `CLIENT_NAME`, `DASHBOARD_PASSWORD`, and Google service account credentials.

### Dashboard Variants

Three distinct dashboard variants live in this codebase, selected at runtime by `src/app/page.tsx` based on the `dashboardType` field returned from `/api/config`:

- **Standard** (`Dashboard.tsx`) — Meetings + Leads tables, the default for individual clients.
- **Group** (`GroupDashboard.tsx`) — aggregates multiple client sheets into one overview. Activated by setting the `GROUP_CLIENTS` env var (a JSON array of `{name, sheetId, url}`).
- **Transcend** (`TranscendDashboard.tsx`) — email-only outreach variant with Campaign Performance, Lead Tracking, and Negative Replies tables. Activated when `CLIENT_NAME === 'Transcend Consulting'`.

### Standard Data Flow

```
Browser (60s polling) → /api/opportunities?period=all_time
  → sheets-api.ts: reads Meetings + Leads tabs from Google Sheets,
    auto-detects columns, parses dates, normalises attendance
  → utils.ts: filters by time period (Date Booked column), computes metrics
  → JSON response → Dashboard.tsx state → child components
```

### Key Design Decisions

- **Data source is Google Sheets, not Close CRM.** Each client has a Google Sheet with two tabs (Meetings and Leads). The dashboard reads directly via Google Sheets API v4 using a service account. `close-api.ts` still exists for import scripts but is not used by the dashboard.
- **Column auto-detection** matches common variations (e.g. "First Name"/"Name", "Job Title"/"Title", "Date Booked"/"Date"). Same fuzzy matching pattern in `sheets-api.ts`, `transcend-sheets.ts`, and the import scripts.
- **Numeric attendance codes** are normalised: 1=Attended, 2=Awaiting Reschedule, 3=Cancelled, 4=Upcoming. Some sheets (Lytx, Coral Vision) use numbers instead of text.
- **JWT auth with no external dependencies.** Google Sheets API auth uses a self-signed JWT (Node.js `crypto` module), exchanged for an access token. No Google SDK needed.
- **Caching**: Sheet data cached 60s, OAuth token cached 55min. Each Vercel deployment has its own cache instance.
- **Time filters** use the "Date Booked" column (when the meeting was booked), not the meeting date itself. Transcend dashboards filter by Launch Date.
- **Meetings Sat* metric** — `attended + 80% of upcoming`, computed once in `utils.ts` and used consistently across individual dashboards, the group aggregate, and the CampaignTable per-client rows.
- **Opportunities with status "Meeting Booked"** go into the meetings table; all other statuses go into the leads/pipeline table.
- **Attendance left blank** when the sheet field is empty — does not default to "Upcoming".
- **Closed/Lost leads sorted to bottom** of the pipeline table; active leads (Lead, Nurture, Engaged Lead) shown first.
- **ROI section** shown on Prime Secure, Catapult Marketing, Evergreen Security, Select Group, Trust Hire, V360. Hidden on all others. Conditional on `CLIENT_NAME`. Revenue/pipeline values for clients with deals closed live in `src/lib/client-revenues.ts` — the group dashboard sums these via `getGroupRoi(clientNames)` so individual and group totals stay in sync automatically.
- **Weekly Touchpoints** shown on Jua, myBasePay, and Tower Supplies. Reads from a "Touchpoints" tab (columns: Week, Calls, LinkedIn, Email — each channel is optional and the card auto-hides any channel the sheet doesn't track). Component: `TouchpointsCard.tsx`.
- **Fleet Size column + Avg Fleet Size tile** (Cameramatics). Auto-detected from a "Fleet Size" header on the Meetings tab. When present, the Outreach table gains a Fleet Size column and a compact KPI tile renders above the metric cards showing the average fleet size across the currently filtered meetings. Component: `FleetSizeCard.tsx`. Average excludes rows where the cell is blank or non-numeric so historical rows don't drag the figure down.
- **Meeting Date column** appears on the Jua dashboard's Meetings table (gated on `CLIENT_NAME === 'Jua'` in `OutreachTable.tsx`). The data is parsed from the sheet for every client but only rendered for Jua.
- **Editable cells (Lytx only)** — Short Status (dropdown), Partner Status (text), Lytx Notes (text). The columns are auto-detected from sheet headers, so they only render on dashboards whose sheet has those columns. Writes go via `/api/update` which uses the writable Google Sheets scope. Components: `EditableDropdown.tsx`, `EditableText.tsx`. The service account must have **Editor** access on the Lytx sheet (Viewer is enough for everywhere else).
- **Password protection** via `DASHBOARD_PASSWORD` env var. Password stored in localStorage after first entry.

### Styling

- Dark theme with `#0a0a0a` background, `#fafafa` text, `#ff2eeb` brand accent
- All colors use inline styles with hex values (not Tailwind color classes) to avoid Tailwind's blue-tinted gray palette
- Table row dividers use a custom `.divide-subtle` class (4% white opacity)
- Status badges are pill-shaped with 10% opacity backgrounds and 30% opacity borders

## Multi-Client Deployment

20+ Vercel projects share this repo. Vercel limits Git-connected repos to 10 projects, so newer projects (Cameramatics, Demo, Transcend, etc.) and the Prime Trading Group are **not Git-connected** — they require manual `vercel --prod` redeployment after code changes. Only the original 10 auto-deploy on push to `main`. To check whether a project picked up a recent change, look at its deployment list in Vercel.

To deploy a new client:
```bash
vercel link --yes --project=<slug>-dashboard --scope holly-archs-projects
printf '%s' '<sheet_id>' | vercel env add GOOGLE_SHEET_ID production
printf '%s' '<Client Name>' | vercel env add CLIENT_NAME production
printf '%s' '<password>' | vercel env add DASHBOARD_PASSWORD production
printf '%s' 'dashboard-reader@orrjo-dashboards.iam.gserviceaccount.com' | vercel env add GOOGLE_SERVICE_ACCOUNT_EMAIL production
printf '%s' '<private_key>' | vercel env add GOOGLE_PRIVATE_KEY production
vercel --prod
vercel domains add <slug>.orrjodashboards.com
```

Use `printf '%s'` (not `echo` or `<<<`) to avoid trailing newlines in env values. The private key for new projects can be retrieved by `vercel env pull .env.temp --environment production` from any existing linked project.

For clients with non-default tab names, also set:
- `MEETINGS_TAB` — defaults to "Meetings booked" if not set
- `LEADS_TAB` — defaults to "Leads" if not set

### Custom subdomain (orrjodashboards.com)

After `vercel domains add <slug>.orrjodashboards.com`, the subdomain needs a CNAME in GoDaddy:
- **Type:** CNAME, **Name:** `<slug>`, **Value:** `cname.vercel-dns.com`

DNS propagation usually takes 1–5 minutes; SSL cert issuance (Let's Encrypt via Vercel) up to ~10 minutes. `ERR_CONNECTION_CLOSED` after DNS resolves means the cert is still being provisioned — wait and retry.

Vercel will recommend an `A` record pointing at `76.76.21.21` because orrjodashboards.com uses GoDaddy nameservers, but CNAME works too and matches the existing pattern.

## Group Dashboard (Prime Trading Group)

The `prime-trading-group-dashboard` Vercel project aggregates data from 6 client sheets (Select Group, Prime Secure, V360, Trust Hire, Evergreen Security, Catapult Marketing) into a single overview. Activated by setting `GROUP_CLIENTS` to a JSON array of `{name, sheetId, url}` objects.

`/api/group` calls `fetchDashboardRawData(sheetId)` for each client in parallel. Per-client metrics are built individually, then the aggregate is built from concatenated raw meetings/leads. Components: `GroupDashboard.tsx`, `GroupROICard.tsx`, `CampaignTable.tsx`.

**PTG is not Git-connected** — code changes need a manual `vercel --prod` against the linked project. Easy to forget; verify by checking the deployment age in `vercel ls prime-trading-group-dashboard`.

When updating the group's per-client URLs (e.g. switching from `*.vercel.app` to `*.orrjodashboards.com`), edit the `GROUP_CLIENTS` env var directly: `vercel env rm GROUP_CLIENTS production --yes && printf '%s' '<json>' | vercel env add GROUP_CLIENTS production` then redeploy.

## Transcend Consulting (Email Campaign Variant)

A bespoke dashboard variant for an email-only outreach client. Triggered when `CLIENT_NAME === 'Transcend Consulting'`. Three sheet tabs:

- **Campaign Performance** — per-campaign metrics (emails sent, replies, open/click/bounce rates, target sector, launch date)
- **Lead Tracking** — positive replies (contact details, campaign, dates, reply text)
- **Negative Replies** — negative responses categorised as Not Interested / Wrong Person / Do Not Contact / Uncategorised. The four category columns are read as boolean flags; whichever has a non-empty value becomes the row's "Category" badge.

The data flow uses a separate API route (`/api/transcend`) and parser (`src/lib/transcend-sheets.ts`) but reuses the JWT helpers (`fetchSheet`, `parseDate`) exported from `sheets-api.ts`.

Time filtering applies to **Launch Date** on Campaign Performance; Lead Tracking and Negative Replies are joined to the filtered campaign set by Campaign Name. An end-client dropdown narrows everything to a single end-client (since Transcend runs campaigns for multiple sub-brands). Rate values are parsed defensively — handles `23.5%`, `23.5`, and `0.235`.

## CSV Import Scripts

`scripts/import-meetings.js` and `scripts/import-leads.js` — Standalone Node.js scripts (no dependencies) for bulk-importing into Close CRM. CSV files live in `scripts/imports/` (gitignored). These exist for historical reasons; the live dashboards no longer read from Close.

### Usage
```bash
node scripts/import-meetings.js <CLOSE_API_KEY> <path-to-csv>
node scripts/import-leads.js <CLOSE_API_KEY> <path-to-csv>
```

### import-meetings.js
1. Auto-detects CSV columns (handles "First Name"/"Last Name" split or single "Name" column, plus variations like "Contact Name", "Meeting Date", etc.)
2. Resolves Close CRM custom field IDs and "Meeting Booked" status ID by name
3. Loads all leads/contacts from Close and builds an in-memory index
4. For each row: updates an existing "Meeting Booked" opportunity, creates a new one, or creates the Lead+Contact+Opportunity from scratch
5. Sets Attendance and Meeting Date/Time custom fields
6. Handles null `display_name`/`contact.name`, normalises whitespace, filters placeholder values ("N/A", "NA", "None") from phone/email/LinkedIn
7. Uses `Content-Length` on POST/PUT (required by Close API), rate-limited every 5 rows

### import-leads.js
- **Skips** rows with empty status or status "Meeting Booked"
- **Imports** Lead, Nurture, Engaged Lead, Closed/Lost
- Creates Lead+Contact if not found in Close
- Skips duplicates (contact already has an opportunity with the same status)
