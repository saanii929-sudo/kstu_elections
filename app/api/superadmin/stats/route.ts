import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Organization from '@/models/Organization';
import Admin from '@/models/Admin';
import { withAuth } from '@/middleware/auth';

async function getStats(req: NextRequest) {
  try {
    await connectDB();

    const [
      totalOrganizations,
      activeOrganizations,
      inactiveOrganizations,
      suspendedOrganizations,
      totalAdmins,
      recentOrganizations,
    ] = await Promise.all([
      Organization.countDocuments(),
      Organization.countDocuments({ status: 'active' }),
      Organization.countDocuments({ status: 'inactive' }),
      Organization.countDocuments({ status: 'suspended' }),
      Admin.countDocuments(),
      Organization.find()
        .select('-password')
        .sort({ createdAt: -1 })
        .limit(5),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        organizations: {
          total: totalOrganizations,
          active: activeOrganizations,
          inactive: inactiveOrganizations,
          suspended: suspendedOrganizations,
        },
        admins: {
          total: totalAdmins,
        },
        recentOrganizations,
      },
    });
  } catch (error: any) {
    console.error('Get stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats', details: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getStats, 'superadmin');
