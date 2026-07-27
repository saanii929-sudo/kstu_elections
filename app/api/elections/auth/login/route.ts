import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Voter from '@/models/Voter';
import Election from '@/models/Election';
import { verifyPassword } from '@/lib/auth';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  try {
    // Rate limit: 10 login attempts per IP per 15 minutes
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
    const { token, password } = body;

    if (!token || !password) {
      return NextResponse.json(
        { error: 'Token and password are required' },
        { status: 400 }
      );
    }
    const voter = await Voter.findOne({ token: token.toUpperCase() });

    if (!voter) {
      return NextResponse.json(
        { error: 'Invalid token or password' },
        { status: 401 }
      );
    }

    if (voter.status !== 'active') {
      if (voter.status === 'expired') {
        return NextResponse.json(
          { error: 'Your voting credentials have expired. You have already voted.' },
          { status: 403 }
        );
      }
      return NextResponse.json(
        { error: 'Your voting access has been disabled' },
        { status: 403 }
      );
    }

    const isValidPassword = await verifyPassword(password, voter.password);

    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid token or password' },
        { status: 401 }
      );
    }
    const election = await Election.findById(voter.electionId);

    if (!election) {
      return NextResponse.json(
        { error: 'Election not found' },
        { status: 404 }
      );
    }
    const now = new Date();
    const startDate = new Date(election.startDate);
    const endDate = new Date(election.endDate);

    // Reject login before election starts
    if (now < startDate) {
      return NextResponse.json(
        {
          error: 'Voting has not started yet. Please wait until the election begins.',
          startDate: election.startDate,
        },
        { status: 403 }
      );
    }

    // Reject login after election period ends — token has expired
    if (election.status === 'ended' || now > endDate) {
      // Mark voter as expired so future attempts also fail fast
      if (voter.status === 'active') {
        await Voter.findByIdAndUpdate(voter._id, { status: 'expired' });
      }
      return NextResponse.json(
        { error: 'This election has ended. Your voting credentials are no longer valid.' },
        { status: 403 }
      );
    }

    let electionStatus = 'upcoming';
    if (now >= startDate && now <= endDate) {
      electionStatus = 'active';
    } else if (now > endDate) {
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
