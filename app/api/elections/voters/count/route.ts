import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Voter from '@/models/Voter';
import { verifyToken } from '@/lib/auth';
import { isElectionManager, getAccessibleElection } from '@/lib/electionAccess';

// Lightweight companion to GET /api/elections/voters — returns just the two
// counts the results page's auto-refresh actually needs, instead of every
// voter document (name/email/phone/credentials/...) on every 5s poll.
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!isElectionManager(decoded)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const electionId = searchParams.get('electionId');

    if (!electionId) {
      return NextResponse.json(
        { error: 'Election ID is required' },
        { status: 400 }
      );
    }

    const election = await getAccessibleElection(decoded, electionId);
    if (!election) {
      return NextResponse.json({ error: 'Election not found' }, { status: 404 });
    }

    const [totalVoters, votedCount] = await Promise.all([
      Voter.countDocuments({ electionId }),
      Voter.countDocuments({ electionId, hasVoted: true }),
    ]);

    return NextResponse.json({
      success: true,
      data: { totalVoters, votedCount },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to fetch voter counts', details: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}
