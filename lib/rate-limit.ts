import connectDB from './mongodb';
import RateLimitCounter from '@/models/RateLimitCounter';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetIn: number; // seconds
}

/**
 * Fixed-window rate limiter backed by MongoDB — persists across restarts
 * and is shared across every app instance, unlike a plain in-memory
 * counter. Fails OPEN on a database error: a DB hiccup should never lock
 * everyone out of login/voting, so an error here is logged and treated as
 * "allowed" rather than surfaced to the caller.
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  try {
    await connectDB();
    const now = new Date();

    // Try to bump an already-active window first.
    let doc = await RateLimitCounter.findOneAndUpdate(
      { key, resetTime: { $gt: now } },
      { $inc: { count: 1 } },
      { new: true }
    ).lean<{ count: number; resetTime: Date } | null>();

    if (!doc) {
      // No active window — start a fresh one. The unique index on `key`
      // makes this atomic; if two requests race here, one of them hits a
      // duplicate-key error and falls back to incrementing the window the
      // other one just created.
      const resetTime = new Date(now.getTime() + windowMs);
      try {
        doc = await RateLimitCounter.findOneAndUpdate(
          { key },
          { $set: { count: 1, resetTime } },
          { new: true, upsert: true }
        ).lean<{ count: number; resetTime: Date } | null>();
      } catch (err: any) {
        if (err?.code === 11000) {
          doc = await RateLimitCounter.findOneAndUpdate(
            { key },
            { $inc: { count: 1 } },
            { new: true }
          ).lean<{ count: number; resetTime: Date } | null>();
        } else {
          throw err;
        }
      }
    }

    if (!doc) {
      return { allowed: true, remaining: Math.max(0, limit - 1), resetIn: Math.ceil(windowMs / 1000) };
    }

    const resetIn = Math.max(0, Math.ceil((doc.resetTime.getTime() - now.getTime()) / 1000));
    if (doc.count > limit) {
      return { allowed: false, remaining: 0, resetIn };
    }
    return { allowed: true, remaining: Math.max(0, limit - doc.count), resetIn };
  } catch (error) {
    console.error('Rate limit check failed, allowing request:', error);
    return { allowed: true, remaining: limit, resetIn: Math.ceil(windowMs / 1000) };
  }
}

export function getClientIp(headers: Headers): string {
  return (
    headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headers.get('x-real-ip') ||
    'unknown'
  );
}
