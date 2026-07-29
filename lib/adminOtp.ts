import crypto from 'crypto';

interface PendingLogin {
  otp: string;
  expiresAt: number;
  email: string;
  // How this OTP was actually delivered, and to what — 'contact' is the
  // masked-able destination (email address or phone number). Defaults to
  // email/email for callers that don't pass a delivery option (organization,
  // org-admin, event-organizer logins), so their behavior is unchanged.
  deliveryMethod: 'email' | 'sms';
  contact: string;
  tokenPayload: Record<string, unknown>;
  user: Record<string, unknown>;
}

const OTP_TTL_MS = 10 * 60 * 1000;

// In-memory pending-login store, same pattern already used for voter OTP —
// short-lived by design, resets on server restart (acceptable: a lost pending
// login just means the admin re-enters email/password).
//
// Cached on `global` (mirroring lib/mongodb.ts's connection cache) because a
// plain module-level Map gets wiped whenever Next.js dev-mode hot-reloading
// re-instantiates this module — which happens on essentially any edit to a
// file that imports it (e.g. the login route) — making every in-flight OTP
// fail with a false "invalid or expired" even seconds after being issued.
declare global {
  var __pendingLogins: Map<string, PendingLogin> | undefined;
}

const pendingLogins: Map<string, PendingLogin> = global.__pendingLogins || new Map();
if (!global.__pendingLogins) {
  global.__pendingLogins = pendingLogins;
}

function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function createPendingLogin(
  email: string,
  tokenPayload: Record<string, unknown>,
  user: Record<string, unknown>,
  delivery?: { method: 'email' | 'sms'; contact: string }
): { loginId: string; otp: string } {
  const loginId = crypto.randomBytes(16).toString('hex');
  const otp = generateOtp();
  pendingLogins.set(loginId, {
    otp,
    expiresAt: Date.now() + OTP_TTL_MS,
    email,
    deliveryMethod: delivery?.method || 'email',
    contact: delivery?.contact || email,
    tokenPayload,
    user,
  });
  return { loginId, otp };
}

export function regenerateOtp(loginId: string): string | null {
  const record = pendingLogins.get(loginId);
  if (!record) return null;
  const otp = generateOtp();
  record.otp = otp;
  record.expiresAt = Date.now() + OTP_TTL_MS;
  return otp;
}

export function peekPendingLogin(loginId: string): PendingLogin | null {
  return pendingLogins.get(loginId) || null;
}

export function consumePendingLogin(loginId: string, otp: string): PendingLogin | null {
  const record = pendingLogins.get(loginId);
  if (!record) return null;
  if (Date.now() > record.expiresAt) {
    pendingLogins.delete(loginId);
    return null;
  }
  if (record.otp !== otp.trim()) return null;
  pendingLogins.delete(loginId);
  return record;
}

export function maskEmail(email: string): string {
  return email.replace(/^(.{1,2}).+(@.+)$/, (_match, head, tail) => `${head}***${tail}`);
}

export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length <= 4) return '*'.repeat(digits.length);
  return '*'.repeat(digits.length - 4) + digits.slice(-4);
}
