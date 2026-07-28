import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Session from '@/models/Session';
import { verifyToken } from '@/lib/auth';
import { revokeSession, revokeAllSessionsForUser } from '@/lib/sessionStore';

function getDecoded(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return null;
  return verifyToken(token);
}

// List the requester's own active sessions/devices
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const decoded = getDecoded(req);
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sessions = await Session.find({
      userId: decoded.id,
      userType: decoded.role,
      revoked: false,
      expiresAt: { $gt: new Date() },
    })
      .sort({ lastActiveAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      data: sessions.map((s: any) => ({
        id: String(s._id),
        userAgent: s.userAgent,
        ip: s.ip,
        createdAt: s.createdAt,
        lastActiveAt: s.lastActiveAt,
        expiresAt: s.expiresAt,
        isCurrent: s.sid === decoded.sid,
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to load sessions' }, { status: 500 });
  }
}

// Force-logout a specific device, or every device but this one
export async function DELETE(req: NextRequest) {
  try {
    await connectDB();

    const decoded = getDecoded(req);
    if (!decoded) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('id');
    const all = searchParams.get('all') === 'true';

    if (all) {
      await revokeAllSessionsForUser(String(decoded.id), decoded.sid);
      return NextResponse.json({ success: true, message: 'Logged out of all other devices' });
    }

    if (!sessionId) {
      return NextResponse.json({ error: 'Session id is required' }, { status: 400 });
    }

    const session = await Session.findOne({ _id: sessionId, userId: decoded.id });
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    await revokeSession(session.sid);

    return NextResponse.json({ success: true, message: 'Device logged out' });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to log out device' }, { status: 500 });
  }
}
