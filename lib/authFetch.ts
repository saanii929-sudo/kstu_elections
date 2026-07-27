export const AUTH_EXPIRED_EVENT = 'auth:expired';

/** Decode the JWT exp field (no signature verification — client-side only). */
function getTokenExpiry(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

/** Returns true when the stored token is missing or past its expiry. */
export function isTokenExpired(): boolean {
  if (typeof window === 'undefined') return false;
  const token = localStorage.getItem('token');
  if (!token) return true;
  const expiry = getTokenExpiry(token);
  return expiry !== null && Date.now() > expiry;
}

/** Clear auth data from localStorage and fire the expired event. */
export function clearAuthAndNotify(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  localStorage.removeItem('tokenTimestamp');
  window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT));
}

/**
 * Drop-in replacement for `fetch` inside authenticated pages.
 * - Automatically attaches the `Authorization: Bearer <token>` header.
 * - Checks token expiry *before* sending the request.
 * - On a 401 response (expired / invalid on the server), fires `auth:expired`.
 * The layout listens for that event and redirects to the login page.
 */
export async function authFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = localStorage.getItem('token');

  if (!token) {
    clearAuthAndNotify();
    return new Response(JSON.stringify({ error: 'No token' }), { status: 401 });
  }

  const expiry = getTokenExpiry(token);
  if (expiry !== null && Date.now() > expiry) {
    clearAuthAndNotify();
    return new Response(JSON.stringify({ error: 'Token expired' }), { status: 401 });
  }

  const headers = {
    ...options.headers,
    Authorization: `Bearer ${token}`,
  };

  const response = await fetch(url, { ...options, headers });

  if (response.status === 401) {
    clearAuthAndNotify();
  }

  return response;
}
