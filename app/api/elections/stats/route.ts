import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Election from '@/models/Election';
import Voter from '@/models/Voter';
import Candidate from '@/models/Candidate';
import ElectionVote from '@/models/ElectionVote';
import { verifyToken } from '@/lib/auth';
import { isElectionManager, electionListMatch, electionOwnerMatch } from '@/lib/electionAccess';

// GET dashboard statistics
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

    // Fetch all statistics in parallel
    const [
      totalElections,
      activeElections,
      totalVoters,
      totalCandidates,
      votedCount,
      totalVotes,
    ] = await Promise.all([
      // Total elections
      Election.countDocuments(electionListMatch(decoded)),

      // Active elections (currently running)
      Election.countDocuments({
        ...electionListMatch(decoded),
        startDate: { $lte: new Date() },
        endDate: { $gte: new Date() },
      }),

      // Total voters
      Voter.countDocuments(electionOwnerMatch(decoded)),

      // Total candidates
      Candidate.countDocuments(electionOwnerMatch(decoded)),

      // Voters who have voted
      Voter.countDocuments({ ...electionOwnerMatch(decoded), hasVoted: true }),

      // Total votes cast
      ElectionVote.countDocuments(electionOwnerMatch(decoded)),
    ]);

    // Calculate turnout rate
    const turnoutRate = totalVoters > 0 
      ? Math.round((votedCount / totalVoters) * 100) 
      : 0;

    return NextResponse.json({
      success: true,
      data: {
        totalElections,
        activeElections,
        totalVoters,
        totalVotes,
        totalCandidates,
        turnoutRate,
        votedCount,
      },
    });
  } catch (error: any) {
    console.error('Get stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch statistics', details: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}
