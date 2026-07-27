import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, JWTPayload } from '@/lib/jwt';

export const authMiddleware = (handler: Function) => {
  return async (req: NextRequest, res: NextResponse) => {
    try {
      const authHeader = req.headers.get('Authorization');
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json(
          { success: false, message: 'Unauthorized' },
          { status: 401 }
        );
      }

      const token = authHeader.substring(7);
      const decoded = verifyToken(token) as JWTPayload;
      
      // Attach user to request
      (req as any).user = decoded;
      
      return handler(req, res);
    } catch (error) {
      return NextResponse.json(
        { success: false, message: 'Invalid token' },
        { status: 401 }
      );
    }
  };
};

export const roleBasedMiddleware = (roles: string[]) => {
  return (handler: Function) => {
    return async (req: NextRequest) => {
      try {
        const authHeader = req.headers.get('Authorization');
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return NextResponse.json(
            { success: false, message: 'Unauthorized' },
            { status: 401 }
          );
        }

        const token = authHeader.substring(7);
        const decoded = verifyToken(token) as JWTPayload;
        
        if (!roles.includes(decoded.role)) {
          return NextResponse.json(
            { success: false, message: 'Forbidden' },
            { status: 403 }
          );
        }
        
        (req as any).user = decoded;
        return handler(req);
      } catch (error) {
        return NextResponse.json(
          { success: false, message: 'Invalid token' },
          { status: 401 }
        );
      }
    };
  };
};
