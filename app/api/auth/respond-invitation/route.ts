import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import { verifyToken } from '@/lib/auth';
import OrganizationAdmin from '@/models/OrganizationAdmin';

// POST — org-admin accepts or declines a pending invitation from My Organizations page
export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const decoded = verifyToken(token);
    if (!decoded || (decoded as any).role !== 'org-admin') {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const { organizationId, action } = await req.json();
    if (!organizationId || !['accept', 'decline'].includes(action)) {
      return NextResponse.json({ error: 'organizationId and action (accept|decline) are required' }, { status: 400 });
    }

    await connectDB();

    const admin = await OrganizationAdmin.findById((decoded as any).id);
    if (!admin) return NextResponse.json({ error: 'Admin not found' }, { status: 404 });

    const idx = admin.organizations.findIndex(
      (o: any) => o.organizationId?.toString() === organizationId && o.status === 'pending'
    );
    if (idx === -1) {
      return NextResponse.json({ error: 'Pending invitation not found' }, { status: 404 });
    }

    if (action === 'decline') {
      // Remove the membership entry and the organizationId from the array
      await OrganizationAdmin.findByIdAndUpdate(admin._id, {
        $pull: {
          organizationId: admin.organizations[idx].organizationId,
        },
        $unset: { [`organizations.${idx}`]: 1 },
      });
      // Clean up the null left by $unset
      await OrganizationAdmin.findByIdAndUpdate(admin._id, {
        $pull: { organizations: null },
      });
      return NextResponse.json({ success: true, message: 'Invitation declined' });
    }

    // Accept: set the membership status to active
    const hasOtherActive = admin.organizations.some(
      (o: any) => o.status === 'active'
    );
    await OrganizationAdmin.findByIdAndUpdate(admin._id, {
      $set: {
        [`organizations.${idx}.status`]: 'active',
        [`organizations.${idx}.invitationToken`]: undefined,
        [`organizations.${idx}.invitationExpiry`]: undefined,
        // Set root status to active if not already
        status: 'active',
      },
      $unset: {
        [`organizations.${idx}.invitationToken`]: '',
        [`organizations.${idx}.invitationExpiry`]: '',
      },
    });

    return NextResponse.json({ success: true, message: 'Invitation accepted' });
  } catch (error: any) {
    console.error('Respond invitation error:', error);
    return NextResponse.json(
      { error: 'Failed to process invitation', details: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}
