import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Voter from '@/models/Voter';
import Election from '@/models/Election';

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Token required' }, { status: 400 });
    }

    const voter = await Voter.findOne({ token: token.toUpperCase() })
      .select('name token hasVoted status electionId')
      .lean();

    if (!voter || (voter as any).status === 'disabled') {
      return NextResponse.json({ error: 'Invalid token' }, { status: 404 });
    }

    const election = await Election.findById((voter as any).electionId)
      .select('title description startDate endDate status settings')
      .lean();

    if (!election) {
      return NextResponse.json({ error: 'Election not found' }, { status: 404 });
    }

    const now = new Date();
    const startDate = new Date(election.startDate);
    const endDate = new Date(election.endDate);

    let electionStatus: 'upcoming' | 'active' | 'ended' = 'upcoming';
    if (election.status === 'ended' || now > endDate) electionStatus = 'ended';
    else if (now >= startDate && now <= endDate) electionStatus = 'active';

    return NextResponse.json({
      success: true,
      data: {
        name: (voter as any).name,
        token: (voter as any).token,
        hasVoted: (voter as any).hasVoted,
        electionId: (voter as any).electionId,
        election: {
          id: (election as any)._id,
          title: election.title,
          description: election.description,
          startDate: election.startDate,
          endDate: election.endDate,
          status: electionStatus,
          settings: election.settings,
        },
      },
    });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch voter status' }, { status: 500 });
  }
}
