import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import OrganizationAdmin from '@/models/OrganizationAdmin';
import Organization from '@/models/Organization';
import Award from '@/models/Award';
import jwt from 'jsonwebtoken';
import { hashPassword } from '@/lib/auth';
import { sendInvitationEmail, generateRandomPassword, generateInvitationToken } from '@/lib/email';

const JWT_SECRET = process.env.JWT_SECRET!;

export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const decoded: any = jwt.verify(token, JWT_SECRET);

    if (decoded.role !== 'organization' && decoded.role !== 'org-admin') {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // org owner → filter by their own id; org-admin → filter by their active org
    const orgId = decoded.role === 'org-admin' ? decoded.organizationId : decoded.id;

    if (!orgId) {
      return NextResponse.json({ error: 'No organization context found' }, { status: 400 });
    }

    await connectDB();

    // Fetch the org owner and org-admins in parallel
    const [org, admins] = await Promise.all([
      Organization.findById(orgId).select('_id name email status createdAt').lean(),
      OrganizationAdmin.find({ organizationId: orgId })
        .select('-password')
        .sort({ createdAt: -1 }),
    ]);

    // Collect all award + event IDs across all admins for batch lookup
    const awardIds = new Set<string>();
    const eventIds = new Set<string>();
    for (const admin of admins) {
      const membership = (admin as any).organizations?.find(
        (o: any) => o.organizationId?.toString() === orgId
      );
      for (const id of membership?.assignedAwards || []) awardIds.add(id.toString());
      for (const id of membership?.assignedEvents || []) eventIds.add(id.toString());
    }
    const normalizedAdmins = admins.map((admin) => {
      const plain = (admin as any).toObject ? (admin as any).toObject() : { ...admin };
      const membership = (plain.organizations || []).find(
        (o: any) => o.organizationId?.toString() === orgId
      );
      plain.status = membership?.status || plain.status;
      plain.type = 'admin';
      return plain;
    });

    // Prepend the org owner as the first entry
    const ownerEntry = org ? {
      _id: (org as any)._id,
      name: (org as any).name,
      email: (org as any).email,
      status: (org as any).status || 'active',
      assignedAwards: [],
      createdAt: (org as any).createdAt,
      type: 'owner',
    } : null;

    const data = [
      ...(ownerEntry ? [ownerEntry] : []),
      ...normalizedAdmins,
    ];

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error('Get admins error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch admins', details: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}

// POST create and invite new admin
export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const decoded: any = jwt.verify(token, JWT_SECRET);

    if (decoded.role !== 'organization') {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    await connectDB();

    const body = await req.json();
    const { name, assignedAwards, assignedEvents } = body;
    const email = (body.email || '').toLowerCase().trim();

    // Validation
    if (!name || !email) {
      return NextResponse.json(
        { error: 'Name and email are required' },
        { status: 400 }
      );
    }

    // Get organization for name (needed for both new and existing admin flows)
    const Organization = require('@/models/Organization').default;
    const organization = await Organization.findById(decoded.id);
    const organizationName = organization?.name || 'Organization';

    // Verify assigned awards belong to this organization
    if (assignedAwards && assignedAwards.length > 0) {
      const awards = await Award.find({
        _id: { $in: assignedAwards },
        organizationId: decoded.id,
      });

      if (awards.length !== assignedAwards.length) {
        return NextResponse.json(
          { error: 'Some awards do not belong to your organization' },
          { status: 400 }
        );
      }
    }

    // Check if admin already exists
    const existingAdmin = await OrganizationAdmin.findOne({ email });
    if (existingAdmin) {
      // Check if they are already a member of THIS organization
      const alreadyInOrg = existingAdmin.organizations.some(
        (o) => o.organizationId.toString() === decoded.id
      );

      if (alreadyInOrg) {
        return NextResponse.json(
          { error: 'This admin already belongs to your organization' },
          { status: 400 }
        );
      }

      // Add this organization to both the organizationId array and organizations array
      const invitationToken = generateInvitationToken();
      const invitationExpiry = new Date();
      invitationExpiry.setDate(invitationExpiry.getDate() + 7);

      const updated = await OrganizationAdmin.findByIdAndUpdate(
        existingAdmin._id,
        {
          $push: {
            organizationId: decoded.id,
            organizations: {
              organizationId: decoded.id,
              organizationName,
              assignedAwards: assignedAwards || [],
              assignedEvents: assignedEvents || [],
              invitedBy: decoded.id,
              status: 'pending',
              invitationToken,
              invitationExpiry,
            },
          },
        },
        { new: true }
      );

      if (!updated) {
        return NextResponse.json(
          { error: 'Failed to add organization to existing admin' },
          { status: 500 }
        );
      }

      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
      const invitationLink = `${baseUrl}/accept-invitation?token=${invitationToken}`;
      const emailSent = await sendInvitationEmail(
        email,
        existingAdmin.name,
        organizationName,
        invitationLink,
        '' // existing admin already has a password
      );
      if (!emailSent) console.warn('Failed to send invitation email');

      return NextResponse.json({
        success: true,
        message: 'Invitation sent to existing admin',
        data: { email, name: existingAdmin.name },
      }, { status: 201 });
    }

    // Generate random password and token for new admin
    const randomPassword = generateRandomPassword();
    const hashedPassword = await hashPassword(randomPassword);
    const invitationToken = generateInvitationToken();
    const invitationExpiry = new Date();
    invitationExpiry.setDate(invitationExpiry.getDate() + 7);

    // Create admin with organizationId as array and first org entry in organizations array
    const admin = await OrganizationAdmin.create({
      organizationId: [decoded.id],
      name,
      email,
      password: hashedPassword,
      invitedBy: decoded.id,
      status: 'pending',
      organizations: [{
        organizationId: decoded.id,
        organizationName,
        assignedAwards: assignedAwards || [],
        assignedEvents: assignedEvents || [],
        invitedBy: decoded.id,
        status: 'pending',
        invitationToken,
        invitationExpiry,
      }],
    });

    // Build invitation link
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const invitationLink = `${baseUrl}/accept-invitation?token=${invitationToken}`;

    const emailSent = await sendInvitationEmail(
      email,
      name,
      organizationName,
      invitationLink,
      randomPassword
    );

    if (!emailSent) {
      console.warn('Failed to send invitation email');
    }

    const adminData = await OrganizationAdmin.findById(admin._id)
      .select('-password');

    return NextResponse.json({
      success: true,
      message: 'Admin invited successfully',
      data: adminData,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Create admin error:', error);
    return NextResponse.json(
      { error: 'Failed to create admin', details: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}
