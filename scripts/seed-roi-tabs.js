#!/usr/bin/env node
/**
 * One-off migration: (re)create the wide-format ROI tab on each PTG client sheet.
 *
 * Wide format: each row = one deal/opportunity (with a Type column that says
 * Revenue or Pipeline). Columns to the right of the metadata are reporting
 * periods (e.g. "Historical", "May 2026", "Jun 2026"). The dashboard sums
 * every period column on every row to get the headline figure.
 *
 * Usage:
 *   1. Link a project that has the credentials + GROUP_CLIENTS:
 *        rm -rf .vercel
 *        vercel link --yes --project=prime-trading-group-dashboard --scope holly-archs-projects
 *        vercel env pull .env.temp --environment production
 *   2. Dry-run:  node scripts/seed-roi-tabs.js --dry-run
 *   3. For real: node scripts/seed-roi-tabs.js
 *
 * If an ROI tab already exists it's deleted and rebuilt — destructive by design
 * so the seed always matches this script's output. Run it again after editing
 * the snapshot if anything drifts.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// --- Current ROI snapshot. One row per (deal, type). Each entry's `periods`
//     maps a column header -> amount. The set of period columns is the union
//     of every entry's periods plus "Historical" first if anyone uses it. ---
const ROI_BY_CLIENT = {
  'Prime Secure': [
    { deal: 'BrynBuild', type: 'Revenue', periods: { Historical: 1188.57 } },
    { deal: 'Coffey Construction Ltd', type: 'Revenue', periods: { Historical: 9107.14 } },
  ],
  'Select Group': [
    { deal: 'Closed deals', type: 'Revenue', periods: { Historical: 18000 } },
  ],
  'Catapult Marketing': [
    { deal: 'Closed deals', type: 'Revenue', periods: { Historical: 18900 } },
  ],
  'Trust Hire': [
    { deal: 'YTL', type: 'Revenue', periods: { Historical: 34280 } },
    { deal: 'YTL', type: 'Pipeline', periods: { Historical: 59240 } },
    { deal: 'Lancer Scott', type: 'Pipeline', periods: { Historical: 121250 } },
    { deal: 'Armac', type: 'Pipeline', notes: 'expected to close in June', periods: { 'Jun 2026': 4000 } },
  ],
  'V360': [
    { deal: 'Creynolds Lane v1', type: 'Revenue', periods: { Historical: 67060 } },
    { deal: 'vPods Birmingham', type: 'Revenue', periods: { Historical: 720 } },
  ],
  'Evergreen Security': [
    // Intentionally empty — headers only so the ROI card still renders (N/A).
  ],
};

// Help text written into a far-right column so clients can read it without
// crowding their data. Lives at column M onwards — leaves cols D-L (9 slots)
// for "Historical" + 8 monthly columns before the help bumps anything.
const HELP_COLUMN_INDEX = 12; // M
const HELP_LINES = [
  'HOW TO USE',
  '• One row per deal (or deal + type)',
  '• Type column: "Revenue" (closed/billed)',
  '  or "Pipeline" (in progress)',
  '• Amounts go under the month column',
  '  when billed / expected',
  '• Recurring? Same row, multiple months',
  '• New month? Add a column to the right',
  '  (e.g. "Aug 2026")',
  '• Numbers only — no £ or commas',
  '• Don\'t rename the tab or the Deal Name /',
  '  Type / Notes column headers',
  '• Pipeline closed? Change Type to Revenue',
];

const FIXED_HEADERS = ['Deal Name', 'Type', 'Notes'];

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

// --- Google Sheets auth (mirror of src/lib/sheets-api.ts) ---
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

// Build the table for a client: union of period columns across all entries,
// "Historical" first if used, then chronological-ish.
function buildTable(entries) {
  const periodSet = new Set();
  for (const e of entries) for (const k of Object.keys(e.periods || {})) periodSet.add(k);
  const periods = [];
  if (periodSet.has('Historical')) {
    periods.push('Historical');
    periodSet.delete('Historical');
  }
  for (const p of Array.from(periodSet).sort()) periods.push(p);

  const headerRow = [...FIXED_HEADERS, ...periods];
  const dataRows = entries.map((e) => {
    const row = [e.deal, e.type, e.notes || ''];
    for (const p of periods) row.push(e.periods?.[p] !== undefined ? e.periods[p] : '');
    return row;
  });
  return { headerRow, dataRows, periodCount: periods.length };
}

async function seed(client, token, dryRun) {
  const { name, sheetId } = client;
  const entries = ROI_BY_CLIENT[name] || [];
  const { headerRow, dataRows, periodCount } = buildTable(entries);

  console.log(`\n=== ${name} ===`);
  console.log(`   sheetId: ${sheetId}`);
  console.log(`   ${entries.length} deals, ${periodCount} period columns`);
  if (dryRun) {
    console.log(`   headers: ${JSON.stringify(headerRow)}`);
    for (const r of dataRows) console.log(`     ${JSON.stringify(r)}`);
    return;
  }

  // Drop any existing ROI tab so we start clean.
  const sheets = await listSheets(token, sheetId);
  const existing = sheets.find((s) => s.title === 'ROI');
  if (existing) {
    await batchUpdate(token, sheetId, [{ deleteSheet: { sheetId: existing.sheetId } }]);
  }
  // Create the new ROI tab.
  await batchUpdate(token, sheetId, [{ addSheet: { properties: { title: 'ROI' } } }]);

  // Write the data table (headers + rows).
  const tableValues = [headerRow, ...dataRows];
  if (tableValues.length > 0) {
    const lastCol = colLetter(headerRow.length - 1);
    await writeRange(token, sheetId, `'ROI'!A1:${lastCol}${tableValues.length}`, tableValues);
  }

  // Write the help text far right, one line per row starting at row 1.
  const helpCol = colLetter(HELP_COLUMN_INDEX);
  const helpValues = HELP_LINES.map((line) => [line]);
  await writeRange(token, sheetId, `'ROI'!${helpCol}1:${helpCol}${HELP_LINES.length}`, helpValues);

  console.log(`   ✓ rebuilt ROI tab (${tableValues.length} table rows + help block at col ${helpCol})`);
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  loadEnv();

  const groupRaw = process.env.GROUP_CLIENTS;
  if (!groupRaw) {
    console.error('GROUP_CLIENTS env var not set — pull from prime-trading-group-dashboard:');
    console.error('  vercel link --yes --project=prime-trading-group-dashboard --scope holly-archs-projects');
    console.error('  vercel env pull .env.temp --environment production');
    process.exit(1);
  }
  const clients = JSON.parse(groupRaw);
  console.log(`${dryRun ? '[DRY RUN] ' : ''}Rebuilding ROI tab on ${clients.length} client sheets (wide format)`);

  const token = dryRun ? null : await getAccessToken();

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
