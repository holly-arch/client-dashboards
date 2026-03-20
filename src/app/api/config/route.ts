import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    clientName: process.env.CLIENT_NAME || 'Client',
  });
}
