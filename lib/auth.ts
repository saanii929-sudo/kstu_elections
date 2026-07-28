import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { isSessionRevoked, touchSession } from '@/lib/sessionStore';

const JWT_SECRET = process.env.JWT_SECRET!;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required. Never use a default secret.');
}

export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 10);
}

export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return await bcrypt.compare(password, hashedPassword);
}

// Administrator sessions default to 7 days ("remember me" is effectively always on);
// callers that need a shorter-lived token (e.g. voter access links) pass expiresIn explicitly.
export function generateToken(payload: any, expiresIn: string = '7d'): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn } as jwt.SignOptions);
}

export function verifyToken(token: string): any {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    // Sessions carrying a sid (admin-type logins) can be force-logged-out;
    // this check stays synchronous so no existing route needs to change.
    if (typeof decoded !== 'string' && decoded.sid) {
      if (isSessionRevoked(decoded.sid)) {
        return null;
      }
      touchSession(decoded.sid);
    }
    return decoded;
  } catch (error) {
    return null;
  }
}
