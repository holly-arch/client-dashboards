#!/usr/bin/env node
/**
 * One-off migration: create an "ROI" tab on each PTG client sheet and seed it
 * with the values that used to live in src/lib/client-revenues.ts.
 *
 * Usage:
 *   1. Pull credentials from a Vercel project that has them:
 *        vercel env pull .env.temp --environment production
 *      (any linked project works — they share the same Google service account)
 *   2. Pull the GROUP_CLIENTS list from the PTG project:
 *        rm -rf .vercel && vercel link --yes --project=prime-trading-group-dashboard --scope holly-archs-projects
 *        vercel env pull .env.temp --environment production
 *   3. Run:
 *        node scripts/seed-roi-tabs.js [--dry-run]
 *
 * The script is idempotent for "tab already exists" — it logs and skips
 * those clients so re-running won't double-write or fail noisily.
 *
 * The service account needs Editor access on each client's sheet. Lytx has
 * it already (for the editable cells feature); the 6 PTG sheets currently
 * have Viewer only — bump them to Editor before running this.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// --- Hardcoded current ROI snapshot (copied from src/lib/client-revenues.ts
//     before deletion, plus the deal-level breakdowns Holly noted) ---
const ROI_BY_CLIENT = {
  'Prime Secure': [
    { month: 'Historical', deal: 'BrynBuild', revenue: 1188.57 },
    { month: 'Historical', deal: 'Coffey Construction Ltd', revenue: 9107.14 },
  ],
  'Select Group': [
    { month: 'Historical', deal: 'Closed deals', revenue: 18000 },
  ],
  'Catapult Marketing': [
    { month: 'Historical', deal: 'Closed deals', revenue: 18900 },
  ],
  'Trust Hire': [
    { month: 'Historical', deal: 'YTL', revenue: 34280 },
    { month: 'Historical', deal: 'YTL', pipeline: 59240 },
    { month: 'Historical', deal: 'Lancer Scott', pipeline: 121250 },
    { month: 'June 2026', deal: 'Armac', pipeline: 4000, notes: 'expected to close in June' },
  ],
  'V360': [
    { month: 'Historical', deal: 'Creynolds Lane v1', revenue: 67060 },
    { month: 'Historical', deal: 'vPods Birmingham', revenue: 720 },
  ],
  'Evergreen Security': [
    // intentionally empty — tab is created with just headers so the ROI card
    // still renders (showing "N/A") and the client can fill in deals as they close.
  ],
};

const HEADERS = ['Month', 'Deal Name', 'Revenue', 'Pipeline', 'Notes'];

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
  if (!email || !privateKey) {
    throw new Error('Missing GOOGLE_SERVICE_ACCOUNT_EMAIL or GOOGLE_PRIVATE_KEY');
  }
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
  const data = await res.json();
  return data.access_token;
}

async function listTabs(token, sheetId) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=sheets.properties.title`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`listTabs failed (${res.status}): ${await res.text()}`);
  const json = await res.json();
  return (json.sheets || []).map((s) => s.properties.title);
}

async function addTab(token, sheetId, title) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}:batchUpdate`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ requests: [{ addSheet: { properties: { title } } }] }),
  });
  if (!res.ok) throw new Error(`addTab failed (${res.status}): ${await res.text()}`);
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
  console.log(`   rows to seed: ${dataRows.length}`);
  if (dryRun) {
    for (const r of dataRows) console.log(`   ${JSON.stringify(r)}`);
    return;
  }

  const tabs = await listTabs(token, sheetId);
  if (tabs.includes('ROI')) {
    console.log(`   SKIP — ROI tab already exists`);
    return;
  }

  await addTab(token, sheetId, 'ROI');
  const values = [HEADERS, ...dataRows];
  await writeRange(token, sheetId, `'ROI'!A1:E${values.length}`, values);
  console.log(`   ✓ created ROI tab + wrote ${values.length} rows (incl. headers)`);
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
  console.log(`${dryRun ? '[DRY RUN] ' : ''}Seeding ROI tab on ${clients.length} client sheets`);

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
