import crypto from 'crypto';
import connectDB from '@/lib/mongodb';
import Session from '@/models/Session';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

// Fast, synchronous revocation check used inside verifyToken() (which stays
// sync so none of the existing route handlers need to change). Session and
// device metadata live durably in MongoDB for the dashboard; this Set is
// just a hot cache of "which sids are currently revoked."
//
// Known limitation: this cache lives in process memory. A server restart
// clears it — the hydration pass below best-effort repopulates it from
// MongoDB on module load, but in a multi-instance or fully serverless
// deployment a revocation on one instance won't be visible to another.
//
// Cached on `global` (mirroring lib/mongodb.ts's connection cache) so a
// Next.js dev-mode hot-reload of this module doesn't silently drop
// revocations that were already hydrated/added this process.
declare global {
  var __revokedSids: Set<string> | undefined;
}

const revokedSids: Set<string> = global.__revokedSids || new Set<string>();
if (!global.__revokedSids) {
  global.__revokedSids = revokedSids;
}

export async function createSession(params: {
  userId: string;
  userType: string;
  email: string;
  userAgent?: string;
  ip?: string;
}): Promise<string> {
  await connectDB();
  const sid = crypto.randomBytes(16).toString('hex');
  await Session.create({
    sid,
    userId: params.userId,
    userType: params.userType,
    email: params.email,
    userAgent: params.userAgent,
    ip: params.ip,
    expiresAt: new Date(Date.now() + SEVEN_DAYS_MS),
  });
  return sid;
}

export function isSessionRevoked(sid: string): boolean {
  return revokedSids.has(sid);
}

export function touchSession(sid: string): void {
  // Fire-and-forget best-effort update — never blocks or throws into the caller.
  (async () => {
    try {
      await connectDB();
      await Session.updateOne({ sid }, { lastActiveAt: new Date() });
    } catch {
      // last-active tracking is best-effort only
    }
  })();
}

export async function revokeSession(sid: string): Promise<void> {
  await connectDB();
  await Session.updateOne({ sid }, { revoked: true, revokedAt: new Date() });
  revokedSids.add(sid);
}

export async function revokeAllSessionsForUser(userId: string, exceptSid?: string): Promise<void> {
  await connectDB();
  const query: Record<string, unknown> = { userId, revoked: false };
  if (exceptSid) query.sid = { $ne: exceptSid };
  const sessions = await Session.find(query, { sid: 1 }).lean();
  await Session.updateMany(query, { revoked: true, revokedAt: new Date() });
  for (const s of sessions) revokedSids.add((s as { sid: string }).sid);
}

// Best-effort hydration on cold start so a restart doesn't silently
// un-revoke sessions that were force-logged-out just before it.
(async () => {
  try {
    await connectDB();
    const revoked = await Session.find(
      { revoked: true, expiresAt: { $gt: new Date() } },
      { sid: 1 }
    ).lean();
    for (const s of revoked) revokedSids.add((s as { sid: string }).sid);
  } catch {
    // best effort only
  }
})();
