import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Organization from '@/models/Organization';
import { hashPassword } from '@/lib/auth';
import { withAuth } from '@/middleware/auth';
import { logAudit } from '@/lib/auditLog';

async function getOrganization(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id } = await params;

    const organization = await Organization.findById(id).select('-password');

    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: organization,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to fetch organization', details: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}

async function updateOrganization(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id } = await params;
    const body = await req.json();
    const { password, serviceFeePercentage, ...updateData } = body;

    if (password) {
      updateData.password = await hashPassword(password);
    }

    if (serviceFeePercentage !== undefined) {
      const fee = Number(serviceFeePercentage);
      if (isNaN(fee) || fee < 0 || fee > 100) {
        return NextResponse.json(
          { error: 'Service fee percentage must be between 0 and 100' },
          { status: 400 }
        );
      }
      updateData.serviceFeePercentage = fee;
    }

    const organization = await Organization.findByIdAndUpdate(
      id,
      updateData,
      { returnDocument: 'after', runValidators: true }
    ).select('-password');

    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    await logAudit({
      actor: (req as any).user,
      action: 'organization.update',
      targetType: 'Organization',
      targetId: id,
      // Never write the plaintext/hashed password into the audit trail —
      // just whether it was part of this update.
      details: { ...updateData, password: password ? '(changed)' : undefined },
    });

    return NextResponse.json({
      success: true,
      message: 'Organization updated successfully',
      data: organization,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to update organization', details: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}

async function deleteOrganization(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id } = await params;

    const organization = await Organization.findByIdAndDelete(id);

    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      );
    }

    await logAudit({
      actor: (req as any).user,
      action: 'organization.delete',
      targetType: 'Organization',
      targetId: id,
      details: { name: organization.name, email: organization.email },
    });

    return NextResponse.json({
      success: true,
      message: 'Organization deleted successfully',
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to delete organization', details: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getOrganization, 'superadmin');
export const PUT = withAuth(updateOrganization, 'superadmin');
export const DELETE = withAuth(deleteOrganization, 'superadmin');
