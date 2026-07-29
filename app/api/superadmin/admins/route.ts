import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Admin from '@/models/Admin';
// Unused directly, but its side-effecting mongoose.model() call must run
// before .populate('assignedElections', ...) below — see the identical fix
// in app/api/elections/candidates/route.ts for 'ElectionCategory'.
import '@/models/Election';
import { hashPassword } from '@/lib/auth';
import { withAuth } from '@/middleware/auth';
import { sendEmail } from '@/lib/email';
import { sendAdminCredentialsSms } from '@/services/sms.service';
import { logAudit } from '@/lib/auditLog';

function generateSecurePassword(): string {
  const length = 12;
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*';
  const allChars = uppercase + lowercase + numbers + symbols;

  let password = '';
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  return password
    .split('')
    .sort(() => Math.random() - 0.5)
    .join('');
}

async function getAdmins(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role') || '';
    const status = searchParams.get('status') || '';

    const query: any = {};
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }
    if (role) query.role = role;
    if (status) query.status = status;

    const admins = await Admin.find(query)
      .select('-password')
      .populate('assignedElections', 'title')
      .sort({ createdAt: -1 });

    return NextResponse.json({ success: true, data: admins });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to fetch administrators', details: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}

async function createAdmin(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const { username, email, phone, role, status, assignedElections } = body;

    if (!username || !email) {
      return NextResponse.json({ error: 'Username and email are required' }, { status: 400 });
    }
    if (!role || !['superadmin', 'admin', 'helpdesk', 'electionAdmin'].includes(role)) {
      return NextResponse.json({ error: 'A valid role is required' }, { status: 400 });
    }
    if (role === 'electionAdmin' && (!Array.isArray(assignedElections) || assignedElections.length === 0)) {
      return NextResponse.json({ error: 'At least one election must be assigned' }, { status: 400 });
    }

    const existing = await Admin.findOne({ $or: [{ email }, { username }] });
    if (existing) {
      return NextResponse.json(
        { error: 'An administrator with this email or username already exists' },
        { status: 409 }
      );
    }

    const generatedPassword = generateSecurePassword();
    const hashedPassword = await hashPassword(generatedPassword);

    const admin = await Admin.create({
      username,
      email,
      phone: phone || undefined,
      password: hashedPassword,
      role,
      status: status || 'active',
      assignedElections: role === 'electionAdmin' ? assignedElections : [],
    });

    // Credentials go by SMS when a phone is on file, email otherwise —
    // never both, matching the login-OTP delivery convention.
    const credentialsSentVia: 'sms' | 'email' = phone ? 'sms' : 'email';
    try {
      if (phone) {
        await sendAdminCredentialsSms(phone, username, email, generatedPassword, role);
      } else {
        await sendEmail({
          to: email,
          subject: 'Your PawaVotes administrator account',
          html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Welcome to PawaVotes</h2>
            <p>Hello ${username},</p>
            <p>An administrator account has been created for you with the role: <strong>${role}</strong>.</p>
            <div style="background:#f3f4f6;padding:20px;border-radius:8px;margin:20px 0;">
              <p><strong>Email:</strong> ${email}</p>
              <p><strong>Password:</strong> ${generatedPassword}</p>
            </div>
            <p style="color:#dc2626;"><strong>Important:</strong> Change your password after first login.</p>
          </div>`,
        });
      }
    } catch {
      // Non-fatal — the account still exists even if credential delivery fails
    }

    const actor = (req as any).user;
    await logAudit({
      actor,
      action: 'admin.create',
      targetType: 'Admin',
      targetId: String(admin._id),
      details: { username, email, role, credentialsSentVia },
    });

    const adminData: any = admin.toObject();
    delete adminData.password;

    return NextResponse.json(
      { success: true, message: 'Administrator created successfully', data: adminData, credentialsSentVia },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to create administrator', details: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getAdmins, 'superadmin');
export const POST = withAuth(createAdmin, 'superadmin');
