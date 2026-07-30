import { NextRequest, NextResponse } from 'next/server';

// Web Crypto (not Node's `crypto` module) so this works whether middleware
// runs on the Edge or Node.js runtime.
function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

export function middleware(request: NextRequest) {
  // The voter login page is link-only: it must be reached via the secure,
  // per-voter link (?<linkHash>) sent by SMS/email. A bare visit with no
  // query string has no way to identify a voter, so send it to the
  // no-access page rather than rendering an empty/broken login form.
  if (request.nextUrl.pathname === '/election/login' && !request.nextUrl.search) {
    return NextResponse.redirect(new URL('/election/no-access', request.url));
  }

  // Threaded through as a request header (not just used in the response
  // CSP) so Next.js's own internally-injected scripts (hydration/RSC
  // payload) automatically pick it up too — this is the documented Next.js
  // pattern for CSP nonces, not something specific to this app.
  const nonce = generateNonce();
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);

  const response = NextResponse.next({ request: { headers: requestHeaders } });

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

  // Content-Security-Policy: restrict what can be loaded/executed.
  // In production, script-src uses a per-request nonce instead of
  // 'unsafe-inline' — a modern browser ignores unsafe-inline whenever a
  // nonce-source is present, so an XSS payload that injects its own
  // <script> tag (the classic reflected/stored-XSS pattern) no longer
  // executes, since it can't know the nonce. Dev mode stays fully
  // permissive: Next's webpack HMR genuinely needs unsafe-eval, and dev
  // never faces the public anyway. unsafe-eval is intentionally left alone
  // in production too for now — nothing here is known to need it, but it
  // hasn't been verified risk-free to drop without a full browser
  // regression pass (chart rendering, Turnstile, framer-motion, vote
  // submission) first.
  const isProd = process.env.NODE_ENV === 'production';
  const scriptSrc = isProd
    ? `script-src 'self' 'nonce-${nonce}' 'unsafe-eval' https://challenges.cloudflare.com`
    : "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com";

  response.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      scriptSrc,
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
