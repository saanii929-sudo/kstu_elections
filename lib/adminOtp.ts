import crypto from 'crypto';

interface PendingLogin {
  otp: string;
  expiresAt: number;
  email: string;
  tokenPayload: Record<string, unknown>;
  user: Record<string, unknown>;
}

const OTP_TTL_MS = 10 * 60 * 1000;

// In-memory pending-login store, same pattern already used for voter OTP —
// short-lived by design, resets on server restart (acceptable: a lost pending
// login just means the admin re-enters email/password).
const pendingLogins = new Map<string, PendingLogin>();

function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export function createPendingLogin(
  email: string,
  tokenPayload: Record<string, unknown>,
  user: Record<string, unknown>
): { loginId: string; otp: string } {
  const loginId = crypto.randomBytes(16).toString('hex');
  const otp = generateOtp();
  pendingLogins.set(loginId, { otp, expiresAt: Date.now() + OTP_TTL_MS, email, tokenPayload, user });
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
