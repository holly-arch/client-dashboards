import { NextRequest, NextResponse } from 'next/server';

const COOKIE_NAME = 'dashboard_auth';
// 1 year. Long enough that even infrequently-visited dashboards (e.g. a
// client checking in once a quarter) don't re-prompt for a password.
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

function correctPassword(): string {
  return process.env.DASHBOARD_PASSWORD || '';
}

export async function POST(request: NextRequest) {
  const { password } = await request.json();
  const correct = correctPassword();

  // No password configured on this deployment — open access.
  if (!correct) return NextResponse.json({ ok: true });

  // Case-insensitive match so clients typing "pgi12345" instead of "PGI12345"
  // aren't bounced. Acceptable trade-off here — these passwords gate viewing
  // of campaign data, not secrets, and the UX win matters more.
  if ((password ?? '').toLowerCase() !== correct.toLowerCase()) {
    return NextResponse.json({ ok: false, error: 'Incorrect password' }, { status: 401 });
  }

  // HttpOnly cookie survives Safari's 7-day Intelligent Tracking Prevention
  // (which clears localStorage) and Chrome / Firefox aggressive cleaners.
  // Set first-party — same origin as the dashboard — so it's not third-party-cookie blocked.
  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: COOKIE_NAME,
    value: password,
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  });
  return res;
}

// Cookie-based session check — called from each dashboard's mount-time auth
// check. Returns ok:true if the cookie matches the configured password,
// no body needed.
export async function GET(request: NextRequest) {
  const correct = correctPassword();
  if (!correct) return NextResponse.json({ ok: true });

  const cookieValue = request.cookies.get(COOKIE_NAME)?.value;
  if (cookieValue && cookieValue.toLowerCase() === correct.toLowerCase()) {
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ ok: false });
}
