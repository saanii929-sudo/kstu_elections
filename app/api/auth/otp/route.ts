import { NextRequest, NextResponse } from 'next/server';
import { generateToken } from '@/lib/auth';
import { sendEmail } from '@/lib/email';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { peekPendingLogin, regenerateOtp, consumePendingLogin } from '@/lib/adminOtp';
import { createSession } from '@/lib/sessionStore';

// Resend the login verification code
export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req.headers);
    const rl = checkRateLimit(`admin-otp-send:${ip}`, 5, 5 * 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait before trying again.' },
        { status: 429 }
      );
    }

    const { loginId } = await req.json();
    if (!loginId) {
      return NextResponse.json({ error: 'loginId is required' }, { status: 400 });
    }

    const pending = peekPendingLogin(loginId);
    if (!pending) {
      return NextResponse.json(
        { error: 'Your login session has expired. Please log in again.' },
        { status: 400 }
      );
    }

    const otp = regenerateOtp(loginId);
    if (!otp) {
      return NextResponse.json(
        { error: 'Your login session has expired. Please log in again.' },
        { status: 400 }
      );
    }

    const sent = await sendEmail({
      to: pending.email,
      subject: 'Your PawaVotes verification code',
      html: `<p>Your one-time verification code is:</p><h2 style="letter-spacing:4px;">${otp}</h2><p>This code expires in 10 minutes.</p>`,
      text: `Your PawaVotes verification code is ${otp}. It expires in 10 minutes.`,
    });

    if (!sent) {
      return NextResponse.json({ error: 'Failed to resend verification code' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Verification code resent' });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to resend verification code' }, { status: 500 });
  }
}

// Verify the login code and issue the session token
export async function PUT(req: NextRequest) {
  try {
    const ip = getClientIp(req.headers);
    const rl = checkRateLimit(`admin-otp-verify:${ip}`, 10, 5 * 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many verification attempts. Please wait before trying again.' },
        { status: 429 }
      );
    }

    const { loginId, otp } = await req.json();
    if (!loginId || !otp) {
      return NextResponse.json({ error: 'loginId and otp are required' }, { status: 400 });
    }

    const record = consumePendingLogin(loginId, String(otp));
    if (!record) {
      return NextResponse.json({ error: 'Invalid or expired verification code' }, { status: 400 });
    }

    const payload = record.tokenPayload as { id: string; role: string };
    const sid = await createSession({
      userId: String(payload.id),
      userType: String(payload.role),
      email: record.email,
      userAgent: req.headers.get('user-agent') || undefined,
      ip: getClientIp(req.headers),
    });

    const token = generateToken({ ...record.tokenPayload, sid });

    return NextResponse.json({
      success: true,
      token,
      user: record.user,
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to verify code' }, { status: 500 });
  }
}
