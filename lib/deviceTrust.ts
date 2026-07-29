import crypto from 'crypto';
import connectDB from '@/lib/mongodb';
import Admin, { IAdmin } from '@/models/Admin';

// "Remember this device" for Admin-model logins (superadmin/electionAdmin):
// once a browser completes OTP verification, it's issued a random token
// that lets it skip OTP on subsequent logins until the token's own expiry —
// a *new* browser/device always still requires OTP, even for the same
// account within the window. Fixed 7-day expiry from the verification that
// issued it (not a sliding window).
const DEVICE_TRUST_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function generateDeviceToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function isDeviceTokenValid(admin: Pick<IAdmin, 'trustedDevices'>, token: string | undefined | null): boolean {
  if (!token) return false;
  const now = new Date();
  return (admin.trustedDevices || []).some((d) => d.token === token && d.expiresAt > now);
}

/**
 * Records a newly-trusted device for this admin and opportunistically prunes
 * any expired entries. Returns the token that was stored.
 */
export async function trustDevice(adminId: string): Promise<string> {
  await connectDB();
  const token = generateDeviceToken();
  const now = new Date();
  const admin = await Admin.findById(adminId).select('trustedDevices');
  const kept = (admin?.trustedDevices || []).filter((d) => d.expiresAt > now);
  kept.push({ token, expiresAt: new Date(Date.now() + DEVICE_TRUST_TTL_MS) });
  await Admin.findByIdAndUpdate(adminId, { trustedDevices: kept });
  return token;
}
