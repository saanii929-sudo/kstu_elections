import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Admin from '@/models/Admin';
import { verifyToken } from '@/lib/auth';
import { logAudit } from '@/lib/auditLog';

function isAdminRole(role: string | undefined): boolean {
  return role === 'superadmin' || role === 'electionAdmin';
}

// GET my own Admin-model profile (superadmin or electionAdmin)
export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || !isAdminRole(decoded.role)) {
      return NextResponse.json({ error: 'Access denied.' }, { status: 403 });
    }

    await connectDB();

    const admin = await Admin.findById(decoded.id).select('-password');
    if (!admin) {
      return NextResponse.json({ error: 'Administrator not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: admin });
  } catch (error: any) {
    console.error('Get profile error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch profile', details: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}

// PUT update my own Admin-model profile
export async function PUT(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || !isAdminRole(decoded.role)) {
      return NextResponse.json({ error: 'Access denied.' }, { status: 403 });
    }

    await connectDB();

    const body = await req.json();
    // Don't allow self-service changes to sensitive/privileged fields —
    // those stay superadmin-managed via /api/superadmin/admins/[id].
    const { password, role, status, assignedElections, ...updateData } = body;

    const admin = await Admin.findByIdAndUpdate(decoded.id, updateData, {
      new: true,
      runValidators: true,
    }).select('-password');

    if (!admin) {
      return NextResponse.json({ error: 'Administrator not found' }, { status: 404 });
    }

    await logAudit({
      actor: { id: decoded.id, email: admin.email, role: decoded.role },
      action: 'admin.profile.update',
      targetType: 'Admin',
      targetId: decoded.id,
      details: updateData,
    });

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      data: admin,
    });
  } catch (error: any) {
    console.error('Update profile error:', error);
    if (error?.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0];
      return NextResponse.json(
        { error: `This ${field || 'value'} is already in use` },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to update profile', details: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}
