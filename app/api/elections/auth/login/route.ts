import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Voter from '@/models/Voter';
import { verifyPassword } from '@/lib/auth';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { checkVoterEligibility } from '@/lib/voterEligibility';

// Actual login: requires the voter's student number + password, entered
// manually. Reaching this form at all requires the secure per-voter link
// first (see /api/elections/auth/verify-link) — the link is a gate, not a
// credential, but since student numbers are only unique per election (not
// globally), the link's hash is what scopes this lookup to the one voter it
// was issued to.
export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req.headers);
    const rl = checkRateLimit(`election-login:${ip}`, 10, 15 * 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again later.' },
        { status: 429 }
      );
    }

    await connectDB();

    const body = await req.json();
    const { linkHash, studentId, password } = body;

    if (!linkHash || !studentId || !password) {
      return NextResponse.json(
        { error: 'Student number and password are required' },
        { status: 400 }
      );
    }

    const voter = await Voter.findOne({ linkHash: String(linkHash) });
    if (!voter || voter.voterId?.trim().toLowerCase() !== String(studentId).trim().toLowerCase()) {
      return NextResponse.json({ error: 'Invalid student number or password' }, { status: 401 });
    }

    const isValidPassword = await verifyPassword(password, voter.password);
    if (!isValidPassword) {
      return NextResponse.json({ error: 'Invalid student number or password' }, { status: 401 });
    }

    const eligibility = await checkVoterEligibility(voter);
    if (!eligibility.ok) {
      return NextResponse.json(
        { error: eligibility.error, startDate: eligibility.startDate },
        { status: eligibility.status }
      );
    }
    const election = eligibility.election!;

    const now = new Date();
    let electionStatus = 'upcoming';
    if (now >= election.startDate && now <= election.endDate) {
      electionStatus = 'active';
    } else if (now > election.endDate) {
      electionStatus = 'ended';
    }

    const voterData = {
      id: voter._id,
      name: voter.name,
      email: voter.email,
      token: voter.token,
      hasVoted: voter.hasVoted,
      electionId: voter.electionId,
      election: {
        id: election._id,
        title: election.title,
        description: election.description,
        startDate: election.startDate,
        endDate: election.endDate,
        status: electionStatus,
        settings: election.settings,
      },
    };

    return NextResponse.json({
      success: true,
      message: 'Login successful',
      data: voterData,
    });
  } catch (error: any) {
    console.error('Voter login error:', error);
    return NextResponse.json(
      { error: 'Login failed', details: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}
