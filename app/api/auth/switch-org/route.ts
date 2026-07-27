import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import OrganizationAdmin from '@/models/OrganizationAdmin';
import { verifyToken, generateToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const authToken = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(authToken);
    if (!decoded || (decoded as any).role !== 'org-admin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { organizationId } = await req.json();
    if (!organizationId) {
      return NextResponse.json({ error: 'organizationId is required' }, { status: 400 });
    }

    await connectDB();

    const admin = await OrganizationAdmin.findById((decoded as any).id).lean();
    if (!admin) {
      return NextResponse.json({ error: 'Admin not found' }, { status: 404 });
    }

    // Find the target membership in the organizations array
    const membership = ((admin as any).organizations || []).find(
      (o: any) => o.organizationId.toString() === organizationId && o.status === 'active'
    );

    if (!membership) {
      return NextResponse.json(
        { error: 'You are not an active member of this organization' },
        { status: 403 }
      );
    }

    const targetOrgId = membership.organizationId.toString();
    const targetOrgName = membership.organizationName;
    const targetAssignedAwards = membership.assignedAwards || [];

    // Issue new JWT for the target org
    const newToken = generateToken({
      id: (admin as any)._id,
      email: (admin as any).email,
      role: 'org-admin',
      organizationId: targetOrgId,
      assignedAwards: targetAssignedAwards,
    });

    // Build full organizations list
    const organizations = ((admin as any).organizations || [])
      .filter((o: any) => o.status === 'active')
      .map((o: any) => ({
        organizationId: o.organizationId.toString(),
        organizationName: o.organizationName,
        assignedAwards: o.assignedAwards || [],
      }));

    return NextResponse.json({
      success: true,
      token: newToken,
      user: {
        id: (admin as any)._id,
        email: (admin as any).email,
        name: (admin as any).name,
        role: 'org-admin',
        organizationId: targetOrgId,
        organizationName: targetOrgName,
        assignedAwards: targetAssignedAwards,
        organizations,
      },
    });
  } catch (error: any) {
    console.error('Switch org error:', error);
    return NextResponse.json(
      { error: 'Failed to switch organization', details: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}
