import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Admin from '@/models/Admin';
import Organization from '@/models/Organization';
import OrganizationAdmin from '@/models/OrganizationAdmin';
import EventOrganizer from '@/models/EventOrganizer';
import { verifyPassword, generateToken } from '@/lib/auth';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  try {
    // Rate limit: 5 login attempts per minute per IP
    const ip = getClientIp(req.headers);
    const rl = checkRateLimit(`login:${ip}`, 5, 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: `Too many login attempts. Try again in ${rl.resetIn} seconds.` },
        { status: 429 }
      );
    }

    await connectDB();

    const body = await req.json();
    const { email, password, userType } = body;
    
    if (!email || !password || !userType) {
      return NextResponse.json(
        { error: 'Email, password, and user type are required' },
        { status: 400 }
      );
    }

    let user;
    let role;

    if (userType === 'admin' || userType === 'superadmin') {
      user = await Admin.findOne({ email, status: 'active' });
      role = user?.role;
    } else if (userType === 'organization') {
      user = await Organization.findOne({ email, status: 'active' });
      role = 'organization';
    } else if (userType === 'org-admin') {
      user = await OrganizationAdmin.findOne({ email, status: 'active' });
      role = 'org-admin';
    } else if (userType === 'event-organizer') {
      user = await EventOrganizer.findOne({ email: email.toLowerCase().trim(), status: 'active' });
      role = 'event-organizer';
    } else {
      return NextResponse.json(
        { error: 'Invalid user type' },
        { status: 400 }
      );
    }

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }
    const isValidPassword = await verifyPassword(password, user.password);

    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // For org-admins, derive all context from the organizations array
    let primaryOrgId: string | undefined;
    let primaryOrgName: string | undefined;
    let primaryAssignedAwards: any[] = [];
    let allOrgs: Array<{ organizationId: string; organizationName: string; assignedAwards: any[] }> = [];

    if (role === 'org-admin') {
      const activeOrgs = ((user as any).organizations || []).filter((o: any) => o.status === 'active');
      allOrgs = activeOrgs.map((o: any) => ({
        organizationId: o.organizationId.toString(),
        organizationName: o.organizationName,
        assignedAwards: o.assignedAwards || [],
      }));
      if (allOrgs.length > 0) {
        primaryOrgId = allOrgs[0].organizationId;
        primaryOrgName = allOrgs[0].organizationName;
        primaryAssignedAwards = allOrgs[0].assignedAwards;
      }
    }

    const token = generateToken({
      id: user._id,
      email: user.email,
      role: role,
      name: (role === 'event-organizer' || role === 'scanner') ? (user as any).name : undefined,
      eventType: role === 'organization' ? (user as any).eventType : undefined,
      organizationId: role === 'org-admin' ? primaryOrgId : undefined,
      assignedAwards: role === 'org-admin' ? primaryAssignedAwards : undefined,
    });
    return NextResponse.json({
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        name: (user as any).username || (user as any).name,
        role: role,
        assignedEvents: role === 'scanner' ? (user as any).assignedEvents : undefined,
        eventType: role === 'organization' ? (user as any).eventType : undefined,
        organizationId: role === 'org-admin' ? primaryOrgId : undefined,
        organizationName: role === 'org-admin' ? primaryOrgName : undefined,
        assignedAwards: role === 'org-admin' ? primaryAssignedAwards : undefined,
        organizations: role === 'org-admin' ? allOrgs : undefined,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    );
  }
}
