import jwt from 'jsonwebtoken';

export interface JWTPayload {
  id: string;
  email: string;
  role: 'superadmin' | 'admin' | 'organization' | 'helpdesk';
  organizationId?: string;
}

export const generateToken = (payload: JWTPayload, expiresIn: string | number = '7d'): string => {
  const secret = process.env.JWT_SECRET!;
  return jwt.sign(payload, secret, {
    expiresIn,
  } as jwt.SignOptions);
};

export const verifyToken = (token: string): JWTPayload => {
  const secret = process.env.JWT_SECRET!;
  return jwt.verify(token, secret) as JWTPayload;
};

export const decodeToken = (token: string): JWTPayload | null => {
  try {
    return jwt.decode(token) as JWTPayload;
  } catch {
    return null;
  }
};
