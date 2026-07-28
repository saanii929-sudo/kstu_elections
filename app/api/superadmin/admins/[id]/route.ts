import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Admin from '@/models/Admin';
import { hashPassword } from '@/lib/auth';
import { withAuth } from '@/middleware/auth';
import { logAudit } from '@/lib/auditLog';

async function updateAdmin(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id } = await params;
    const body = await req.json();
    const { username, email, role, status, password } = body;
    const actor = (req as any).user;

    const existingAdmin = await Admin.findById(id);
    if (!existingAdmin) {
      return NextResponse.json({ error: 'Administrator not found' }, { status: 404 });
    }

    if (status && status !== existingAdmin.status && String(existingAdmin._id) === String(actor?.id)) {
      return NextResponse.json(
        { error: 'You cannot suspend or activate your own account' },
        { status: 400 }
      );
    }
    if (role && role !== existingAdmin.role && String(existingAdmin._id) === String(actor?.id)) {
      return NextResponse.json(
        { error: 'You cannot change your own role' },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (username) updateData.username = username;
    if (email) updateData.email = email;
    if (role) {
      if (!['superadmin', 'admin', 'helpdesk'].includes(role)) {
        return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
      }
      updateData.role = role;
    }
    if (status) {
      if (!['active', 'inactive'].includes(status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      }
      updateData.status = status;
    }
    if (password) {
      updateData.password = await hashPassword(password);
    }

    const admin = await Admin.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).select('-password');

    let action = 'admin.update';
    if (status && status !== existingAdmin.status) {
      action = status === 'active' ? 'admin.activate' : 'admin.suspend';
    }

    await logAudit({
      actor,
      action,
      targetType: 'Admin',
      targetId: id,
      details: { before: { role: existingAdmin.role, status: existingAdmin.status }, after: updateData },
    });

    return NextResponse.json({
      success: true,
      message: 'Administrator updated successfully',
      data: admin,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to update administrator', details: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}

async function deleteAdmin(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id } = await params;
    const actor = (req as any).user;

    if (String(id) === String(actor?.id)) {
      return NextResponse.json({ error: 'You cannot delete your own account' }, { status: 400 });
    }

    const admin = await Admin.findByIdAndDelete(id);
    if (!admin) {
      return NextResponse.json({ error: 'Administrator not found' }, { status: 404 });
    }

    await logAudit({
      actor,
      action: 'admin.delete',
      targetType: 'Admin',
      targetId: id,
      details: { username: admin.username, email: admin.email, role: admin.role },
    });

    return NextResponse.json({ success: true, message: 'Administrator deleted successfully' });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to delete administrator', details: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}

export const PUT = withAuth(updateAdmin, 'superadmin');
export const DELETE = withAuth(deleteAdmin, 'superadmin');
