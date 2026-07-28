import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Election from '@/models/Election';
import Candidate from '@/models/Candidate';
import Voter from '@/models/Voter';
import ElectionVote from '@/models/ElectionVote';
import { withAuth } from '@/middleware/auth';
import { logAudit } from '@/lib/auditLog';

// Clears every recorded vote for an election. Super Admin only (enforced by
// withAuth below) — used when a voting session was interrupted or cancelled.
async function resetVotes(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id } = await params;
    const body = await req.json();
    const { reason } = body;
    const actor = (req as any).user;

    if (!reason || typeof reason !== 'string' || !reason.trim()) {
      return NextResponse.json(
        { error: 'A reason is required to reset votes for an election' },
        { status: 400 }
      );
    }

    const election = await Election.findById(id);
    if (!election) {
      return NextResponse.json({ error: 'Election not found' }, { status: 404 });
    }

    const [voteDeleteResult, candidateResetResult, voterResetResult] = await Promise.all([
      ElectionVote.deleteMany({ electionId: id }),
      Candidate.updateMany({ electionId: id }, { voteCount: 0 }),
      Voter.updateMany(
        { electionId: id },
        { hasVoted: false, $unset: { votedAt: '' } }
      ),
    ]);

    await logAudit({
      actor,
      action: 'election.votes.reset',
      targetType: 'Election',
      targetId: id,
      details: {
        title: election.title,
        alias: election.alias,
        reason: reason.trim(),
        votesDeleted: voteDeleteResult.deletedCount,
        candidatesReset: candidateResetResult.modifiedCount,
        votersReset: voterResetResult.modifiedCount,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Cleared ${voteDeleteResult.deletedCount} vote(s) for ${election.title}`,
      data: {
        votesDeleted: voteDeleteResult.deletedCount,
        candidatesReset: candidateResetResult.modifiedCount,
        votersReset: voterResetResult.modifiedCount,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to reset votes', details: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}

export const POST = withAuth(resetVotes, 'superadmin');
