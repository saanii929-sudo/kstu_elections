import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Admin from '@/models/Admin';
import Organization from '@/models/Organization';
import OrganizationAdmin from '@/models/OrganizationAdmin';
import EventOrganizer from '@/models/EventOrganizer';
import { verifyPassword } from '@/lib/auth';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { createPendingLogin, maskEmail, maskPhone } from '@/lib/adminOtp';
import { sendEmail } from '@/lib/email';
import { sendAdminOtpSms } from '@/services/sms.service';

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

    const tokenPayload = {
      id: user._id,
      email: user.email,
      role: role,
      name: (role === 'event-organizer' || role === 'scanner') ? (user as any).name : undefined,
      eventType: role === 'organization' ? (user as any).eventType : undefined,
      organizationId: role === 'org-admin' ? primaryOrgId : undefined,
      assignedAwards: role === 'org-admin' ? primaryAssignedAwards : undefined,
      assignedElections: role === 'electionAdmin'
        ? ((user as any).assignedElections || []).map((e: any) => e.toString())
        : undefined,
    };

    const userResponse = {
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
      assignedElections: role === 'electionAdmin'
        ? ((user as any).assignedElections || []).map((e: any) => e.toString())
        : undefined,
    };

    // Admin-model accounts (superadmin/electionAdmin) with a phone on file
    // get their OTP via SMS instead of email; every other user type is
    // unaffected.
    const isAdminModelRole = userType === 'admin' || userType === 'superadmin';
    const phone: string | undefined = isAdminModelRole ? (user as any).phone : undefined;
    const useSms = isAdminModelRole && !!phone;

    // Password verified — now require a one-time code before issuing the session token.
    const { loginId, otp } = createPendingLogin(
      user.email,
      tokenPayload,
      userResponse,
      useSms ? { method: 'sms', contact: phone! } : undefined
    );

    const deliverySucceeded = useSms
      ? await sendAdminOtpSms(phone!, otp)
      : await sendEmail({
          to: user.email,
          subject: 'Your PawaVotes verification code',
          html: `<p>Your one-time verification code is:</p><h2 style="letter-spacing:4px;">${otp}</h2><p>This code expires in 10 minutes. If you did not attempt to log in, you can ignore this email.</p>`,
          text: `Your PawaVotes verification code is ${otp}. It expires in 10 minutes.`,
        });

    if (!deliverySucceeded) {
      return NextResponse.json(
        { error: `Failed to send verification code${useSms ? ' via SMS' : ''}. Please try again.` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      requiresOtp: true,
      loginId,
      deliveryMethod: useSms ? 'sms' : 'email',
      maskedContact: useSms ? maskPhone(phone!) : maskEmail(user.email),
      // Kept for backward compatibility with any existing consumer reading this directly.
      maskedEmail: useSms ? undefined : maskEmail(user.email),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    );
  }
}
