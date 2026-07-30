import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Voter from '@/models/Voter';
import VoterLoginAttempt from '@/models/VoterLoginAttempt';
import { verifyPassword } from '@/lib/auth';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { checkVoterEligibility } from '@/lib/voterEligibility';
import { verifyTurnstileToken } from '@/lib/turnstile';

// Per-account lockout — caps failed attempts against one specific voter
// regardless of which IP they come from, so an attacker who already has a
// valid link (linkHash uniquely identifies the voter) can't get around the
// per-IP rate limit above by distributing password guesses across IPs.
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000;
const LOCKOUT_THRESHOLD = 8;

// Actual login: requires the voter's student number + password, entered
// manually. Reaching this form at all requires the secure per-voter link
// first (see /api/elections/auth/verify-link) — the link is a gate, not a
// credential, but since student numbers are only unique per election (not
// globally), the link's hash is what scopes this lookup to the one voter it
// was issued to.
export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req.headers);
    const rl = await checkRateLimit(`election-login:${ip}`, 10, 15 * 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again later.' },
        { status: 429 }
      );
    }

    await connectDB();

    const body = await req.json();
    const { linkHash, studentId, password, turnstileToken } = body;
    const userAgent = req.headers.get('user-agent') || undefined;

    // Best-effort audit write — never let logging failures break a real
    // login/error response. Not awaited by callers that don't need to block
    // on it, but we do await it here since every exit path is about to
    // return anyway.
    const logAttempt = async (
      success: boolean,
      opts: {
        failureReason?: 'not_found' | 'bad_password' | 'ineligible' | 'bot_check_failed' | 'account_locked';
        electionId?: any;
        voterId?: any;
      } = {}
    ) => {
      try {
        await VoterLoginAttempt.create({
          electionId: opts.electionId,
          voterId: opts.voterId,
          attemptedStudentId: studentId ? String(studentId).trim() : undefined,
          ip,
          userAgent,
          success,
          failureReason: opts.failureReason,
        });
      } catch (logError) {
        console.error('Failed to record voter login attempt:', logError);
      }
    };

    if (!linkHash || !studentId || !password) {
      return NextResponse.json(
        { error: 'Student number and password are required' },
        { status: 400 }
      );
    }

    // Bot gate — checked before any credential lookup so a script never
    // gets a guessing oracle against real voter data.
    const isHuman = await verifyTurnstileToken(turnstileToken, ip);
    if (!isHuman) {
      await logAttempt(false, { failureReason: 'bot_check_failed' });
      return NextResponse.json(
        { error: 'Verification failed. Please try again.' },
        { status: 400 }
      );
    }

    const voter = await Voter.findOne({ linkHash: String(linkHash) });
    if (!voter || voter.voterId?.trim().toLowerCase() !== String(studentId).trim().toLowerCase()) {
      await logAttempt(false, { failureReason: 'not_found', electionId: voter?.electionId });
      return NextResponse.json({ error: 'Invalid student number or password' }, { status: 401 });
    }

    const lockoutSince = new Date(Date.now() - LOCKOUT_WINDOW_MS);
    const recentFailures = await VoterLoginAttempt.countDocuments({
      voterId: voter._id,
      success: false,
      createdAt: { $gte: lockoutSince },
    });
    if (recentFailures >= LOCKOUT_THRESHOLD) {
      await logAttempt(false, { failureReason: 'account_locked', electionId: voter.electionId, voterId: voter._id });
      return NextResponse.json(
        { error: 'Too many failed attempts on this account. Please try again later.' },
        { status: 429 }
      );
    }

    const isValidPassword = await verifyPassword(password, voter.password);
    if (!isValidPassword) {
      await logAttempt(false, { failureReason: 'bad_password', electionId: voter.electionId, voterId: voter._id });
      return NextResponse.json({ error: 'Invalid student number or password' }, { status: 401 });
    }

    const eligibility = await checkVoterEligibility(voter);
    if (!eligibility.ok) {
      await logAttempt(false, { failureReason: 'ineligible', electionId: voter.electionId, voterId: voter._id });
      return NextResponse.json(
        { error: eligibility.error, startDate: eligibility.startDate },
        { status: eligibility.status }
      );
    }
    const election = eligibility.election!;

    await logAttempt(true, { electionId: voter.electionId, voterId: voter._id });

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
