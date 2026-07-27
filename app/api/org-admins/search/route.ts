import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import OrganizationAdmin from '@/models/OrganizationAdmin';
import { withAuth } from '@/middleware/auth';

/**
 * GET /api/org-admins/search?q=email_or_name
 * Accessible by event-organizer role to look up org-admins for assignment.
 */
async function searchOrgAdmins(req: NextRequest) {
  try {
    await connectDB();
    const user = (req as any).user;

    if (user.role !== 'event-organizer') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get('q') || '').trim();

    if (!q || q.length < 2) {
      return NextResponse.json({ success: true, data: [] });
    }

    const admins = await OrganizationAdmin.find({
      status: 'active',
      $or: [
        { email: { $regex: q, $options: 'i' } },
        { name: { $regex: q, $options: 'i' } },
      ],
    })
      .select('_id name email')
      .limit(10)
      .lean();

    return NextResponse.json({ success: true, data: admins });
  } catch (error: any) {
    return NextResponse.json({ error: 'Search failed', details: error.message }, { status: 500 });
  }
}

export const GET = withAuth(searchOrgAdmins);
