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
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // unsafe-inline/eval required by Next.js dev mode; tighten with nonces in production
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "connect-src 'self' https:",
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
