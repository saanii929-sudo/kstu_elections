import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Voter from '@/models/Voter';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { checkVoterEligibility } from '@/lib/voterEligibility';

// Gate check only: confirms the secure per-voter link is real and not
// expired, and returns just enough to personalize the login form (first
// name). It does NOT authenticate the voter or return a session — the
// voter still has to enter their token + password on the next step.
export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req.headers);
    const rl = await checkRateLimit(`verify-link:${ip}`, 20, 15 * 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many attempts. Please try again later.' },
        { status: 429 }
      );
    }

    await connectDB();

    const body = await req.json();
    const { linkHash } = body;

    if (!linkHash || typeof linkHash !== 'string') {
      return NextResponse.json({ error: 'A valid voting link is required.' }, { status: 400 });
    }

    const voter = await Voter.findOne({ linkHash });
    if (!voter || !voter.linkExpiresAt || voter.linkExpiresAt < new Date()) {
      return NextResponse.json(
        { error: 'This voting link is invalid or has expired. Please contact your election administrator.' },
        { status: 401 }
      );
    }

    const eligibility = await checkVoterEligibility(voter);
    if (!eligibility.ok) {
      return NextResponse.json(
        { error: eligibility.error, startDate: eligibility.startDate },
        { status: eligibility.status }
      );
    }

    return NextResponse.json({
      success: true,
      data: { name: voter.name.split(' ')[0] },
    });
  } catch (error: any) {
    console.error('Verify link error:', error);
    return NextResponse.json(
      { error: 'Failed to verify link', details: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}
