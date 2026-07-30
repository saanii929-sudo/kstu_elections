import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Voter from '@/models/Voter';
import Election from '@/models/Election';
import { sendVoterOtpSms } from '@/services/sms.service';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

const otpStore = new Map<string, { otp: string; expiresAt: number }>();

function generateOTP(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req.headers);
    const rl = await checkRateLimit(`otp-send:${ip}`, 5, 5 * 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many OTP requests. Please wait before trying again.' },
        { status: 429 }
      );
    }

    await connectDB();

    const { voterToken } = await req.json();
    if (!voterToken) {
      return NextResponse.json({ error: 'Voter token is required' }, { status: 400 });
    }

    const voter = await Voter.findOne({ token: voterToken.toUpperCase() });
    if (!voter) {
      return NextResponse.json({ error: 'Voter not found' }, { status: 404 });
    }

    const election = await Election.findById(voter.electionId);
    if (!election) {
      return NextResponse.json({ error: 'Election not found' }, { status: 404 });
    }

    const otp = generateOTP();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
    otpStore.set(String(voter._id), { otp, expiresAt });

    const message = `Your OTP for ${election.title} is: ${otp}. It expires in 10 minutes. Do not share this code.`;

    if (!voter.phone) {
      return NextResponse.json(
        { error: 'No phone number on file to receive OTP via SMS' },
        { status: 400 }
      );
    }

    let sent = false;

    try {
      const result = await sendVoterOtpSms(
        voter.phone,
        voter.name,
        otp,
        election.title,
        election.startDate,
        election.endDate
      );
      if (result) sent = true;
    } catch (e) {
      console.error('OTP SMS error:', e);
    }

    if (!sent) {
      return NextResponse.json(
        { error: 'Failed to send OTP via SMS. Please try again.' },
        { status: 500 }
      );
    }

    const maskedPhone = voter.phone.slice(0, 3) + '****' + voter.phone.slice(-3);

    return NextResponse.json({
      success: true,
      message: 'OTP sent via SMS',
      data: { maskedPhone },
    });
  } catch (error: any) {
    console.error('OTP send error:', error);
    return NextResponse.json({ error: 'Failed to send OTP' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const ip = getClientIp(req.headers);
    const rl = await checkRateLimit(`otp-verify:${ip}`, 10, 5 * 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many verification attempts.' },
        { status: 429 }
      );
    }

    await connectDB();

    const { voterToken, otp } = await req.json();
    if (!voterToken || !otp) {
      return NextResponse.json({ error: 'Voter token and OTP are required' }, { status: 400 });
    }

    const voter = await Voter.findOne({ token: voterToken.toUpperCase() });
    if (!voter) {
      return NextResponse.json({ error: 'Voter not found' }, { status: 404 });
    }

    const record = otpStore.get(String(voter._id));
    if (!record) {
      return NextResponse.json({ error: 'No OTP found. Please request a new one.' }, { status: 400 });
    }

    if (Date.now() > record.expiresAt) {
      otpStore.delete(String(voter._id));
      return NextResponse.json({ error: 'OTP has expired. Please request a new one.' }, { status: 400 });
    }

    if (record.otp !== String(otp).trim()) {
      return NextResponse.json({ error: 'Invalid OTP. Please try again.' }, { status: 400 });
    }

    otpStore.delete(String(voter._id));

    return NextResponse.json({ success: true, message: 'OTP verified successfully' });
  } catch (error: any) {
    console.error('OTP verify error:', error);
    return NextResponse.json({ error: 'Failed to verify OTP' }, { status: 500 });
  }
}
