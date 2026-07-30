import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Organization from '@/models/Organization';
import OrganizationAdmin from '@/models/OrganizationAdmin';
import EventOrganizer from '@/models/EventOrganizer';
import Admin from '@/models/Admin';
import { hashPassword, verifyPassword, verifyToken } from '@/lib/auth';
import { logAudit } from '@/lib/auditLog';

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await req.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Current password and new password are required' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'New password must be at least 6 characters' },
        { status: 400 }
      );
    }

    if (currentPassword === newPassword) {
      return NextResponse.json(
        { error: 'New password must be different from current password' },
        { status: 400 }
      );
    }

    await connectDB();

    let user: any = null;

    if (decoded.role === 'organization') {
      user = await Organization.findById(decoded.id);
    } else if (decoded.role === 'org-admin') {
      user = await OrganizationAdmin.findById(decoded.id);
    } else if (decoded.role === 'event-organizer') {
      user = await EventOrganizer.findById(decoded.id);
    } else if (decoded.role === 'superadmin' || decoded.role === 'electionAdmin') {
      user = await Admin.findById(decoded.id);
    } else {
      return NextResponse.json(
        { error: 'Password change is not available for this account type' },
        { status: 403 }
      );
    }

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const isValid = await verifyPassword(currentPassword, user.password);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Current password is incorrect' },
        { status: 400 }
      );
    }

    user.password = await hashPassword(newPassword);
    await user.save();

    await logAudit({
      actor: { id: decoded.id, email: decoded.email, role: decoded.role },
      action: 'account.password.change',
      targetType: decoded.role === 'superadmin' || decoded.role === 'electionAdmin' ? 'Admin' : 'Account',
      targetId: decoded.id,
    });

    return NextResponse.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: 'Failed to change password',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
