import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const { password } = await request.json();
  const correct = process.env.DASHBOARD_PASSWORD || '';

  if (!correct) {
    // No password set — allow access
    return NextResponse.json({ ok: true });
  }

  if (password === correct) {
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: false, error: 'Incorrect password' }, { status: 401 });
}
