import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  // The voter login page is link-only: it must be reached via the secure,
  // per-voter link (?<linkHash>) sent by SMS/email. A bare visit with no
  // query string has no way to identify a voter, so send it to the
  // no-access page rather than rendering an empty/broken login form.
  if (request.nextUrl.pathname === '/election/login' && !request.nextUrl.search) {
    return NextResponse.redirect(new URL('/election/no-access', request.url));
  }

  const response = NextResponse.next();

  // Security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=63072000; includeSubDomains; preload'
  );
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  response.headers.set('Cross-Origin-Resource-Policy', 'same-origin');

  // Content-Security-Policy: restrict what can be loaded/executed
  response.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      // A prior attempt to swap this for a per-request nonce blocked
      // Next.js's own internally-injected scripts in production (hydration
      // bootstrap, RSC payload) — reverted. Doing this properly needs the
      // root layout to read the nonce via next/headers so Next applies it
      // to its own scripts too, not just middleware setting the header;
      // that's a real follow-up, not something to guess at again blind.
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https:",
      // Turnstile renders its challenge in an iframe from this origin —
      // with no frame-src set, CSP falls back to default-src 'self' and
      // silently blocks it.
      "frame-src https://challenges.cloudflare.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; ')
  );

  // Set JSON content-type on API responses, but NOT on upload endpoints
  // (multipart uploads need their own Content-Type with boundary intact)
  const isUploadRoute =
    request.nextUrl.pathname.startsWith('/api/upload/') ||
    request.nextUrl.pathname.startsWith('/api/public/upload/');
  if (request.nextUrl.pathname.startsWith('/api/') && !isUploadRoute) {
    response.headers.set('Content-Type', 'application/json');
  }

  return response;
}

export const config = {
  matcher: [
    // Match all routes except static files and images
    '/((?!_next/static|_next/image|favicon.ico|images/).*)',
  ],
};
