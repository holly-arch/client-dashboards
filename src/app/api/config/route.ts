import { NextResponse } from 'next/server';
import { fetchTouchpoints } from '@/lib/sheets-api';

export async function GET() {
  const touchpoints = await fetchTouchpoints();

  return NextResponse.json({
    clientName: process.env.CLIENT_NAME || 'Client',
    isGroup: !!process.env.GROUP_CLIENTS,
    touchpoints,
  });
}
