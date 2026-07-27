import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import OrganizationAdmin from '@/models/OrganizationAdmin';
import { verifyToken } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const authToken = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!authToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(authToken);
    if (!decoded || (decoded as any).role !== 'org-admin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    await connectDB();

    const admin = await OrganizationAdmin.findById((decoded as any).id).lean();
    if (!admin) {
      return NextResponse.json({ error: 'Admin not found' }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const includeAll = searchParams.get('all') === 'true';

    const organizations = ((admin as any).organizations || [])
      .filter((o: any) => includeAll ? true : o.status === 'active')
      .map((o: any) => ({
        organizationId: o.organizationId.toString(),
        organizationName: o.organizationName,
        assignedAwards: o.assignedAwards || [],
        status: o.status,
      }));

    return NextResponse.json({ success: true, data: organizations });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to fetch organizations', details: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}
