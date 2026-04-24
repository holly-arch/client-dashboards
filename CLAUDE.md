# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — Start dev server (Turbopack)
- `npm run build` — Production build (also runs TypeScript checking)
- `npm run lint` — ESLint
- No test suite configured

## Architecture

This is a **multi-tenant campaign dashboard** built with Next.js 16 (App Router). A single codebase is deployed as 20 separate Vercel projects (19 individual clients + 1 group dashboard). Each deployment is configured via environment variables: `GOOGLE_SHEET_ID`, `CLIENT_NAME`, `DASHBOARD_PASSWORD`, and Google service account credentials.

### Data Flow

```
Browser (60s polling) → /api/opportunities?period=all_time
  → sheets-api.ts: reads Meetings + Leads tabs from Google Sheets,
    auto-detects columns, parses dates, normalises attendance
  → utils.ts: filters by time period (Date Booked column), computes metrics
  → JSON response → Dashboard.tsx state → child components
```

### Key Design Decisions

- **Data source is Google Sheets, not Close CRM.** Each client has a Google Sheet with two tabs (Meetings and Leads). The dashboard reads directly from these via the Google Sheets API v4 using a service account. `close-api.ts` still exists for import scripts but is not used by the dashboard.
- **Column auto-detection** matches common variations (e.g. "First Name"/"Name", "Job Title"/"Title", "Date Booked"/"Date"). Same fuzzy matching pattern used in both `sheets-api.ts` and the import scripts.
- **Numeric attendance codes** are normalised: 1=Attended, 2=Awaiting Reschedule, 3=Cancelled, 4=Upcoming. Some sheets (Lytx, Coral Vision) use numbers instead of text.
- **JWT auth with no external dependencies.** Google Sheets API auth uses a self-signed JWT (Node.js `crypto` module), exchanged for an access token. No Google SDK needed.
- **Caching**: Sheet data cached 60s, OAuth token cached 55min.
- **Time filters** use the "Date Booked" column (when the meeting was booked), not the meeting date itself.
- **Meetings Sat* metric** — `attended + 80% of upcoming`, computed once in `utils.ts` and used consistently across individual dashboards, the group aggregate, and the CampaignTable per-client rows.
- **Opportunities with status "Meeting Booked"** go into the meetings table; all other statuses go into the leads/pipeline table.
- **Attendance left blank** when the sheet field is empty — it does not default to "Upcoming".
- **Closed/Lost leads sorted to bottom** of the pipeline table, with active leads (Lead, Nurture, Engaged Lead) shown first.
- **ROI section** shown on 6 client dashboards: Prime Secure, Catapult Marketing, Evergreen Security, Select Group, Trust Hire, V360. Hidden on all others. Conditional on `CLIENT_NAME`.
- **Weekly Touchpoints section** shown on Jua and myBasePay dashboards. Reads from a "Touchpoints" tab on the client's Google Sheet (columns: Week, Calls, LinkedIn, Email). Displays the most recent row. Component: `TouchpointsCard.tsx`.
- **Password protection** via `DASHBOARD_PASSWORD` env var. Password stored in localStorage after first entry.

### Styling

- Dark theme with `#0a0a0a` background, `#fafafa` text, `#ff2eeb` brand accent
- All colors use inline styles with hex values (not Tailwind color classes) to avoid Tailwind's blue-tinted gray palette
- Table row dividers use a custom `.divide-subtle` class (4% white opacity)
- Status badges are pill-shaped with 10% opacity backgrounds and 30% opacity borders

## CSV Import Script

`scripts/import-meetings.js` — Standalone Node.js script (no dependencies) for bulk-importing meeting data from CSV files into Close CRM.

### Usage
```bash
node scripts/import-meetings.js <CLOSE_API_KEY> <path-to-csv>
```

### What It Does
1. Auto-detects CSV columns (handles "First Name"/"Last Name" split or single "Name" column, plus variations like "Contact Name", "Meeting Date", etc.)
2. Resolves Close CRM custom field IDs and "Meeting Booked" status ID by name
3. Loads all leads/contacts from Close and builds an in-memory index
4. For each CSV row:
   - If contact found with existing "Meeting Booked" opportunity → updates it
   - If contact found without one → creates new opportunity
   - If contact not found → creates the Lead (company) and Contact first, then creates the opportunity
5. Sets Attendance and Meeting Date/Time custom fields on each opportunity
6. Outputs summary of created/updated opportunities, leads, and contacts

### Key Details
- Handles null `display_name` and `contact.name` in Close CRM data
- Normalizes whitespace in names (trailing spaces, double spaces)
- Filters out placeholder values ("N/A", "NA", "None") from phone/email/LinkedIn fields
- Uses `Content-Length` header on POST/PUT requests (required by Close API)
- Rate-limited with small delays every 5 rows
- CSV files are stored in `scripts/imports/` (gitignored)

## CSV Lead Import Script

`scripts/import-leads.js` — Standalone Node.js script for importing pipeline leads (Lead, Nurture, Engaged Lead, Closed/Lost) into Close CRM.

### Usage
```bash
node scripts/import-leads.js <CLOSE_API_KEY> <path-to-csv>
```

### Key Behaviour
- **Skips** rows with empty status or status "Meeting Booked"
- **Imports** rows with pipeline statuses: Lead, Nurture, Engaged Lead, Closed/Lost
- Creates Lead (company) and Contact if not found in Close
- No custom fields set (unlike import-meetings.js which sets Attendance and Meeting Date)
- Won't create duplicates — skips if contact already has an opportunity with the same status

## Multi-Client Deployment

20 Vercel projects share this repo. Vercel limits Git-connected repos to 10 projects, so 10 projects require manual `vercel --prod` redeployment after code changes.

To deploy a new client:
```bash
vercel link --yes --project <slug>-dashboard
printf '%s' '<sheet_id>' | vercel env add GOOGLE_SHEET_ID production
printf '%s' '<Client Name>' | vercel env add CLIENT_NAME production
printf '%s' '<password>' | vercel env add DASHBOARD_PASSWORD production
printf '%s' 'dashboard-reader@orrjo-dashboards.iam.gserviceaccount.com' | vercel env add GOOGLE_SERVICE_ACCOUNT_EMAIL production
printf '%s' '<private_key>' | vercel env add GOOGLE_PRIVATE_KEY production
vercel --prod
```

Use `printf '%s'` (not `echo` or `<<<`) to avoid trailing newlines in env values.

For clients with non-default tab names, also set:
- `MEETINGS_TAB` — defaults to "Meetings booked" if not set
- `LEADS_TAB` — defaults to "Leads" if not set

## Group Dashboard (Prime Trading Group)

A 19th Vercel project (`prime-trading-group-dashboard`) aggregates data from 6 client sheets into a single overview. Activated by the `GROUP_CLIENTS` env var (JSON array of `{name, sheetId, url}` objects).

When `GROUP_CLIENTS` is set, `page.tsx` renders `GroupDashboard` instead of `Dashboard`. The `/api/group` route calls `fetchDashboardRawData(sheetId)` for each client in parallel using the optional parameter added to `sheets-api.ts`.

Key components: `GroupDashboard.tsx`, `GroupROICard.tsx`, `CampaignTable.tsx`. The campaign table shows per-client metrics with "View →" links to individual dashboard URLs.

The Sat* calculation is unified across individual and group dashboards — both use `attended + 80% of upcoming` from `utils.ts`.

ROI revenue/pipeline values (Select Group, Catapult Marketing, Trust Hire) live in `src/lib/client-revenues.ts`. `Dashboard.tsx` reads per-client values via `getRoiFor(clientName)`; `GroupDashboard.tsx` sums them via `getGroupRoi(clientNames)`. This keeps the group total in sync whenever an individual ROI changes.
