#!/usr/bin/env node
/**
 * One-off migration: (re)create the ROI tab on each PTG client sheet using
 * the new per-opportunity schema.
 *
 * Schema:
 *   Opportunity | Pipeline Value | Contract Value | Notes | <Mon YYYY> | <Mon YYYY> | ...
 *
 *   - One row per opportunity.
 *   - Month columns start from the client's engagement month (derived from
 *     earliest meeting date in the Meetings booked tab) and run through
 *     today + 12 months.
 *   - Past months that have values = already billed.
 *   - Future months that have values = still to be billed.
 *   - Total contract value = sum of all month columns + Contract Value column.
 *   - Pipeline Value = potential value of un-signed deals (separate bucket).
 *
 * Usage:
 *   1. rm -rf .vercel
 *      vercel link --yes --project=prime-trading-group-dashboard --scope holly-archs-projects
 *      vercel env pull .env.temp --environment production
 *   2. Dry-run:  node scripts/seed-roi-tabs.js --dry-run
 *   3. For real: node scripts/seed-roi-tabs.js
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// --- Current ROI snapshot. Revenue entries land in the client's first month
//     column (we don't know exact dates). Pipeline entries go into the
//     Pipeline Value column. ---
const ROI_BY_CLIENT = {
  'Prime Secure': [
    { opportunity: 'BrynBuild', revenue: 1188.57 },
    { opportunity: 'Coffey Construction Ltd', revenue: 9107.14 },
  ],
  'Select Group': [
    { opportunity: 'Closed deals', revenue: 18000 },
  ],
  'Catapult Marketing': [
    { opportunity: 'Closed deals', revenue: 18900 },
  ],
  'Trust Hire': [
    { opportunity: 'YTL', revenue: 34280 },
    { opportunity: 'YTL', pipeline: 59240 },
    { opportunity: 'Lancer Scott', pipeline: 121250 },
    { opportunity: 'Armac', pipeline: 4000, notes: 'expected to close in June' },
  ],
  'V360': [
    { opportunity: 'Creynolds Lane v1', revenue: 67060 },
    { opportunity: 'vPods Birmingham', revenue: 720 },
  ],
  'Evergreen Security': [],
};

const FIXED_HEADERS = ['Opportunity', 'Pipeline Value', 'Contract Value', 'Notes'];

// Help text written into a column right of the data. With ~18 months of
// columns starting around mid-2025 plus the 4 fixed columns, that's ~22
// data columns — putting help at column AB (index 27) leaves buffer.
const HELP_COLUMN_INDEX = 27; // AB
const HELP_LINES = [
  'HOW TO USE',
  '• One row per opportunity (deal)',
  '• Pipeline Value = potential value',
  '  of un-signed deals',
  '• Contract Value = total contract',
  '  size when monthly split unknown',
  '• Month columns = revenue billed',
  '  in that month',
  '• Recurring deal? Fill the same row',
  '  across multiple month columns',
  '• Past months count as billed,',
  '  future months as to-be-billed',
  '• Numbers only — no £ or commas',
  '• New month? Add a column to the',
  '  right (e.g. "Sep 2026")',
  '• Don\'t rename the tab or change',
  '  the Opportunity / Pipeline Value /',
  '  Contract Value / Notes headers',
];

// --- env loading (.env.temp first, then process.env) ---
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.temp');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const m = line.match(/^([A-Z_]+)="?(.*?)"?$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  }
}

// --- Google Sheets auth ---
async function getAccessToken() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
  if (!email || !privateKey) throw new Error('Missing GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_PRIVATE_KEY');
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const claims = Buffer.from(JSON.stringify({
    iss: email,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  })).toString('base64url');
  const signature = crypto.sign('RSA-SHA256', Buffer.from(`${header}.${claims}`), privateKey);
  const jwt = `${header}.${claims}.${signature.toString('base64url')}`;
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  if (!res.ok) throw new Error(`Auth failed: ${res.status} ${await res.text()}`);
  return (await res.json()).access_token;
}

async function fetchTab(token, sheetId, tabName) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(`'${tabName}'`)}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) return [];
  const json = await res.json();
  return json.values || [];
}

async function listSheets(token, sheetId) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=sheets.properties(sheetId,title)`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`listSheets failed (${res.status}): ${await res.text()}`);
  const json = await res.json();
  return (json.sheets || []).map((s) => s.properties);
}

async function batchUpdate(token, sheetId, requests) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}:batchUpdate`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ requests }),
  });
  if (!res.ok) throw new Error(`batchUpdate failed (${res.status}): ${await res.text()}`);
  return res.json();
}

async function writeRange(token, sheetId, range, values) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ values }),
  });
  if (!res.ok) throw new Error(`writeRange failed (${res.status}): ${await res.text()}`);
}

function colLetter(idx) {
  let s = '';
  let n = idx;
  while (n >= 0) {
    s = String.fromCharCode((n % 26) + 65) + s;
    n = Math.floor(n / 26) - 1;
  }
  return s;
}

// Parse DD/MM/YYYY or YYYY-MM-DD (the only formats clients use in Meetings tabs).
function parseDate(str) {
  if (!str) return null;
  const trimmed = String(str).trim();
  let m = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (m) {
    let [, d, mo, y] = m;
    if (y.length === 2) y = (parseInt(y) > 50 ? '19' : '20') + y;
    return new Date(parseInt(y), parseInt(mo) - 1, parseInt(d));
  }
  m = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return new Date(parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3]));
  const t = Date.parse(trimmed);
  return isNaN(t) ? null : new Date(t);
}

// Look at the Meetings booked tab and return the earliest dateCreated.
async function findEngagementStart(token, sheetId) {
  // Try common Meetings tab names — fall back if first doesn't exist.
  const candidates = ['Meetings booked', 'Meetings Booked', 'Meetings'];
  let rows = [];
  for (const name of candidates) {
    rows = await fetchTab(token, sheetId, name);
    if (rows.length > 1) break;
  }
  if (rows.length < 2) return null;
  const headers = rows[0].map((h) => (h || '').toLowerCase().trim());
  const dateIdx = headers.findIndex((h) => h === 'date booked' || h === 'date' || h.includes('date booked'));
  if (dateIdx < 0) return null;
  let earliest = null;
  for (let i = 1; i < rows.length; i++) {
    const d = parseDate(rows[i][dateIdx]);
    if (d && (!earliest || d < earliest)) earliest = d;
  }
  return earliest;
}

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Generate "Mon YYYY" headers from start month through today + futureMonths.
function generateMonthColumns(startDate, futureMonths = 12) {
  const today = new Date();
  const start = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  const end = new Date(today.getFullYear(), today.getMonth() + futureMonths, 1);
  const cols = [];
  let d = new Date(start);
  while (d <= end) {
    cols.push(`${MONTH_SHORT[d.getMonth()]} ${d.getFullYear()}`);
    d.setMonth(d.getMonth() + 1);
  }
  return cols;
}

async function seed(client, token, dryRun) {
  const { name, sheetId } = client;
  console.log(`\n=== ${name} ===`);
  console.log(`   sheetId: ${sheetId}`);

  // Discover engagement start month.
  const start = await findEngagementStart(token, sheetId);
  if (!start) {
    console.error(`   ✗ couldn't find engagement start from Meetings tab — skipping`);
    return;
  }
  const monthCols = generateMonthColumns(start);
  const firstMonth = monthCols[0];
  console.log(`   engagement start: ${firstMonth}, ${monthCols.length} month columns through ${monthCols[monthCols.length - 1]}`);

  // Build data rows from snapshot.
  const entries = ROI_BY_CLIENT[name] || [];
  const dataRows = entries.map((e) => {
    const row = [e.opportunity, '', '', e.notes || '', ...monthCols.map(() => '')];
    if (e.pipeline !== undefined) row[1] = e.pipeline;
    if (e.revenue !== undefined) row[FIXED_HEADERS.length + 0] = e.revenue; // first month col
    return row;
  });
  console.log(`   ${entries.length} opportunity rows`);

  if (dryRun) {
    console.log(`   headers: ${JSON.stringify([...FIXED_HEADERS, ...monthCols])}`);
    for (const r of dataRows) console.log(`     ${JSON.stringify(r)}`);
    return;
  }

  // Drop existing ROI tab and recreate with a grid big enough to hold the
  // data table + the help block far to the right.
  const sheets = await listSheets(token, sheetId);
  const existing = sheets.find((s) => s.title === 'ROI');
  if (existing) {
    await batchUpdate(token, sheetId, [{ deleteSheet: { sheetId: existing.sheetId } }]);
  }
  const tableCols = FIXED_HEADERS.length + monthCols.length;
  const gridCols = Math.max(tableCols, HELP_COLUMN_INDEX + 1) + 4; // a little buffer for new month columns
  await batchUpdate(token, sheetId, [{
    addSheet: { properties: { title: 'ROI', gridProperties: { rowCount: 200, columnCount: gridCols } } },
  }]);

  const headerRow = [...FIXED_HEADERS, ...monthCols];
  const tableValues = [headerRow, ...dataRows];
  const lastCol = colLetter(headerRow.length - 1);
  await writeRange(token, sheetId, `'ROI'!A1:${lastCol}${tableValues.length}`, tableValues);

  // Help block far right.
  const helpCol = colLetter(HELP_COLUMN_INDEX);
  await writeRange(token, sheetId, `'ROI'!${helpCol}1:${helpCol}${HELP_LINES.length}`, HELP_LINES.map((l) => [l]));

  console.log(`   ✓ rebuilt ROI tab (${tableValues.length} table rows, ${monthCols.length} month columns)`);
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  loadEnv();

  const groupRaw = process.env.GROUP_CLIENTS;
  if (!groupRaw) {
    console.error('GROUP_CLIENTS env var not set — pull from prime-trading-group-dashboard');
    process.exit(1);
  }
  const clients = JSON.parse(groupRaw);
  console.log(`${dryRun ? '[DRY RUN] ' : ''}Rebuilding ROI tab on ${clients.length} client sheets`);

  const token = await getAccessToken();
  for (const client of clients) {
    try {
      await seed(client, token, dryRun);
    } catch (err) {
      console.error(`   ✗ ${client.name}: ${err.message}`);
    }
  }
  console.log('\nDone.');
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
