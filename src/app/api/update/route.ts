import { NextResponse } from 'next/server';
import { writeCell, resolveColumnIndex } from '@/lib/sheets-api';

const FIELD_TO_COLUMN: Record<string, { tab: 'meetings' | 'leads'; columnName: string }> = {
  shortStatus: { tab: 'meetings', columnName: 'Short Status' },
  partnerStatus: { tab: 'meetings', columnName: 'Partner Status' },
  lytxNotes: { tab: 'leads', columnName: 'Lytx Notes' },
};

export async function POST(request: Request) {
  try {
    // Validate password
    const password = request.headers.get('x-dashboard-password');
    const correct = process.env.DASHBOARD_PASSWORD || '';
    if (correct && password !== correct) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sheetRowIndex, field, value } = await request.json();

    if (!sheetRowIndex || !field || value === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const fieldConfig = FIELD_TO_COLUMN[field];
    if (!fieldConfig) {
      return NextResponse.json({ error: `Unknown field: ${field}` }, { status: 400 });
    }

    const sheetId = process.env.GOOGLE_SHEET_ID;
    if (!sheetId) {
      return NextResponse.json({ error: 'Sheet not configured' }, { status: 500 });
    }

    const meetingsTab = process.env.MEETINGS_TAB || 'Meetings booked';
    const leadsTab = process.env.LEADS_TAB || 'Leads';
    const tabName = fieldConfig.tab === 'meetings' ? meetingsTab : leadsTab;

    // Resolve the column index for this field
    const colIndex = await resolveColumnIndex(sheetId, tabName, fieldConfig.columnName);

    // Write the value
    await writeCell(sheetId, tabName, sheetRowIndex, colIndex, value);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Update error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
