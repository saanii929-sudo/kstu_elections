import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import ElectionVote from '@/models/ElectionVote';
import Voter from '@/models/Voter';
import Candidate from '@/models/Candidate';
import ElectionCategory from '@/models/ElectionCategory';
import { verifyToken } from '@/lib/auth';
import { isElectionManager, getAccessibleElection } from '@/lib/electionAccess';

// GET /api/elections/reports?electionId=xxx&type=activity|results|voters
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const decoded = verifyToken(token);
    if (!isElectionManager(decoded)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const electionId = searchParams.get('electionId');
    const type = searchParams.get('type') || 'activity';

    if (!electionId) {
      return NextResponse.json({ error: 'electionId is required' }, { status: 400 });
    }

    const election = await getAccessibleElection(decoded, electionId);
    if (!election) return NextResponse.json({ error: 'Election not found' }, { status: 404 });

    if (type === 'activity') {
      // Voting activity log — all voters with their status
      const voters = await Voter.find({ electionId }, {
        name: 1, email: 1, phone: 1, voterId: 1,
        token: 1, hasVoted: 1, votedAt: 1, status: 1, createdAt: 1,
      }).sort({ createdAt: 1 }).lean();

      return NextResponse.json({ success: true, data: voters });
    }

    if (type === 'results') {
      // Full results: votes per candidate per position
      const categories = await ElectionCategory.find({ electionId }).sort({ order: 1 }).lean();
      const candidates = await Candidate.find({ electionId }).lean();
      const votes = await ElectionVote.find({ electionId })
        .populate('candidateId', 'name image ballotNumber')
        .populate('categoryId', 'name')
        .lean();

      const totalVoters = await Voter.countDocuments({ electionId });
      const votedCount = await Voter.countDocuments({ electionId, hasVoted: true });

      // Election is considered ended if status is 'ended' OR endDate has passed
      const isEnded = election.status === 'ended' || new Date(election.endDate) < new Date();

      const positionResults = categories.map((cat: any) => {
        const posCandidates = candidates
          .filter((c: any) => String(c.categoryId) === String(cat._id))
          .sort((a: any, b: any) => b.voteCount - a.voteCount);
        const posTotal = posCandidates.reduce((s: number, c: any) => s + c.voteCount, 0);

        // Tie detection
        const maxVotes = posCandidates.length > 0 ? posCandidates[0].voteCount : 0;
        const tiedCount = maxVotes > 0 ? posCandidates.filter((c: any) => c.voteCount === maxVotes).length : 0;
        const isTied = tiedCount > 1;
        // Solo-candidate referendum tie: voted count equals did-not-vote count
        const isSoloTied = posCandidates.length === 1 && maxVotes > 0 && maxVotes === (totalVoters - maxVotes);
        const effectiveIsTied = isTied || isSoloTied;

        return {
          position: cat.name,
          totalVotes: posTotal,
          isTied: effectiveIsTied,
          isSoloTied,
          tiedCount: effectiveIsTied ? tiedCount : 0,
          candidates: posCandidates.map((c: any, i: number) => {
            const isTop = c.voteCount === maxVotes && maxVotes > 0;
            let status: string;
            if (isTop && effectiveIsTied) status = 'Tied';
            else if (isTop && isEnded) status = 'Elected';
            else if (isTop) status = 'Leading';
            else status = 'Trailing';
            return {
              rank: i + 1,
              name: c.name,
              ballotNumber: c.ballotNumber,
              votes: c.voteCount,
              percentage: posTotal > 0 ? ((c.voteCount / posTotal) * 100).toFixed(2) : '0.00',
              status,
            };
          }),
        };
      });

      return NextResponse.json({
        success: true,
        data: {
          election: { title: election.title, startDate: election.startDate, endDate: election.endDate, status: isEnded ? 'ended' : election.status },
          totalVoters,
          votedCount,
          turnoutRate: totalVoters > 0 ? ((votedCount / totalVoters) * 100).toFixed(1) : '0.0',
          positions: positionResults,
        },
      });
    }

    if (type === 'failed') {
      // Voters who did NOT vote
      const notVoted = await Voter.find({ electionId, hasVoted: false }, {
        name: 1, email: 1, phone: 1, voterId: 1, token: 1, status: 1, createdAt: 1,
      }).sort({ createdAt: 1 }).lean();

      return NextResponse.json({ success: true, data: notVoted });
    }

    return NextResponse.json({ error: 'Invalid report type' }, { status: 400 });
  } catch (error: any) {
    console.error('Reports API error:', error);
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 });
  }
}
