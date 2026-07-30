const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

/**
 * Verifies a Cloudflare Turnstile response token server-side.
 *
 * Fails OPEN (returns true) if TURNSTILE_SECRET_KEY isn't configured — a
 * missing key must never lock every voter out of a live election. It logs
 * loudly instead, so the gap is visible rather than silently "working."
 */
export async function verifyTurnstileToken(token: string | undefined | null, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;

  if (!secret) {
    console.error(
      'TURNSTILE_SECRET_KEY is not configured — bot verification is DISABLED. ' +
      'Set it in the environment to actually enforce the CAPTCHA gate.'
    );
    return true;
  }

  if (!token) {
    return false;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    let response: Response;
    try {
      response = await fetch(VERIFY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret, response: token, remoteip: ip }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      console.error('Turnstile verify request failed with status', response.status);
      return false;
    }

    const data = await response.json();
    return data.success === true;
  } catch (error: any) {
    console.error('Turnstile verify request errored:', error?.message || error);
    // A network hiccup reaching Cloudflare shouldn't be indistinguishable
    // from "definitely a bot" — fail closed on the CAPTCHA check itself is
    // still safer than failing open here, since this is a transient-error
    // path, not a missing-config path.
    return false;
  }
}
