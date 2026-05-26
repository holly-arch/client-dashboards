#!/usr/bin/env node
/**
 * One-off migration: (re)create the ROI tab on each PTG client sheet using
 * the long-format schema (Month | Deal Name | Revenue | Pipeline | Notes).
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
 * so the seed always matches this script's output.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// --- Current ROI snapshot. Each row in the array = one row in the sheet. ---
const ROI_BY_CLIENT = {
  'Prime Secure': [
    { month: '', deal: 'BrynBuild', revenue: 1188.57 },
    { month: '', deal: 'Coffey Construction Ltd', revenue: 9107.14 },
  ],
  'Select Group': [
    { month: '', deal: 'Closed deals', revenue: 18000 },
  ],
  'Catapult Marketing': [
    { month: '', deal: 'Closed deals', revenue: 18900 },
  ],
  'Trust Hire': [
    { month: '', deal: 'YTL', revenue: 34280 },
    { month: '', deal: 'YTL', pipeline: 59240 },
    { month: '', deal: 'Lancer Scott', pipeline: 121250 },
    { month: 'June 2026', deal: 'Armac', pipeline: 4000, notes: 'expected to close in June' },
  ],
  'V360': [
    { month: '', deal: 'Creynolds Lane v1', revenue: 67060 },
    { month: '', deal: 'vPods Birmingham', revenue: 720 },
  ],
  'Evergreen Security': [
    // intentionally empty — tab is created with just headers so the ROI card
    // still renders (showing "N/A") and the client can fill in deals as they close.
  ],
};

const HEADERS = ['Month', 'Deal Name', 'Revenue', 'Pipeline', 'Notes'];

// Help text written into column G so clients can read it next to the table.
const HELP_COLUMN_INDEX = 6; // G
const HELP_LINES = [
  'HOW TO USE',
  '• One row per deal',
  '• Fill EITHER Revenue (closed/billed)',
  '  OR Pipeline (in progress), not both',
  '• Numbers only — no £ or commas',
  '• Recurring? Add a new row for each',
  '  month it gets billed',
  '• Don\'t change headers or rename the tab',
  '• New deals = new rows below',
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

function rowsForClient(name) {
  const entries = ROI_BY_CLIENT[name] || [];
  return entries.map((e) => [
    e.month || '',
    e.deal || '',
    e.revenue !== undefined ? e.revenue : '',
    e.pipeline !== undefined ? e.pipeline : '',
    e.notes || '',
  ]);
}

async function seed(client, token, dryRun) {
  const { name, sheetId } = client;
  const dataRows = rowsForClient(name);
  console.log(`\n=== ${name} ===`);
  console.log(`   sheetId: ${sheetId}`);
  console.log(`   ${dataRows.length} data rows`);
  if (dryRun) {
    console.log(`   headers: ${JSON.stringify(HEADERS)}`);
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

  // Write headers + data rows.
  const tableValues = [HEADERS, ...dataRows];
  const lastCol = colLetter(HEADERS.length - 1);
  await writeRange(token, sheetId, `'ROI'!A1:${lastCol}${tableValues.length}`, tableValues);

  // Write the help block in column G, one line per row.
  const helpCol = colLetter(HELP_COLUMN_INDEX);
  await writeRange(token, sheetId, `'ROI'!${helpCol}1:${helpCol}${HELP_LINES.length}`, HELP_LINES.map((l) => [l]));

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
  console.log(`${dryRun ? '[DRY RUN] ' : ''}Rebuilding ROI tab on ${clients.length} client sheets (long format)`);

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
