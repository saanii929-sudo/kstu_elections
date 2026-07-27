import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Organization from '@/models/Organization';
import OrganizationAdmin from '@/models/OrganizationAdmin';
import { withAuth } from '@/middleware/auth';

// Initiate DB connection at module load so it's warm before the first request
connectDB().catch(() => {});

async function getCurrentUser(req: NextRequest) {
  try {
    await connectDB();

    const user = (req as any).user;

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    let userData: any = {
      id: user.id,
      email: user.email,
      role: user.role,
    };
    if (user.role === 'organization') {
      const organization = await Organization.findById(user.id).select('-password');
      if (organization) {
        userData = {
          ...userData,
          name: organization.name,
          email: organization.email,
          phone: organization.phone,
          address: organization.address,
          website: organization.website,
          description: organization.description,
          logo: organization.logo,
          status: organization.status,
          serviceFeePercentage: organization.serviceFeePercentage,
        };
      }
    } else if (user.role === 'org-admin') {
      const orgAdmin = await OrganizationAdmin.findById(user.id)
        .populate('organizationId', 'name email phone logo serviceFeePercentage')
        .select('-password');
      
      if (orgAdmin) {
        userData = {
          ...userData,
          name: (orgAdmin as any).username,
          email: orgAdmin.email,
          organizationId: (orgAdmin.organizationId as any)._id,
          organizationName: (orgAdmin.organizationId as any).name,
          serviceFeePercentage: (orgAdmin.organizationId as any).serviceFeePercentage,
          assignedAwards: user.assignedAwards || [],
        };
      }
    }

    return NextResponse.json({
      success: true,
      data: userData,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to fetch user data', details: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getCurrentUser);
