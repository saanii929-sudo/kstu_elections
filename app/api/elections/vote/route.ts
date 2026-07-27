import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Voter from '@/models/Voter';
import Election from '@/models/Election';
import ElectionVote from '@/models/ElectionVote';
import Candidate from '@/models/Candidate';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req.headers);
    const rl = checkRateLimit(`election-vote:${ip}`, 5, 10 * 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    await connectDB();

    const body = await req.json();
    const { token, votes } = body;

    if (!token || !votes || !Array.isArray(votes) || votes.length === 0) {
      return NextResponse.json(
        { error: 'Token and votes are required' },
        { status: 400 }
      );
    }

    const voter = await Voter.findOneAndUpdate(
      { token: token.toUpperCase(), hasVoted: false, status: 'active' },
      { $set: { hasVoted: true, votedAt: new Date(), status: 'expired' } },
      { returnDocument: 'before' } // return the original doc so we can read electionId etc.
    );

    if (!voter) {
      const existing = await Voter.findOne({ token: token.toUpperCase() }).select('hasVoted status').lean() as any;
      if (!existing) {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
      }
      if (existing.hasVoted) {
        return NextResponse.json({ error: 'You have already voted' }, { status: 403 });
      }
      return NextResponse.json({ error: 'Your voting access has been disabled' }, { status: 403 });
    }

    const election = await Election.findById(voter.electionId);

    if (!election) {
      return NextResponse.json(
        { error: 'Election not found' },
        { status: 404 }
      );
    }

    if (election.status === 'ended') {
      await Voter.findByIdAndUpdate(voter._id, {
        $set: { hasVoted: false, status: 'active' },
        $unset: { votedAt: 1 },
      });
      return NextResponse.json({ error: 'Voting has ended' }, { status: 403 });
    }

    const now = new Date();
    const startDate = new Date(election.startDate);
    const endDate = new Date(election.endDate);

    if (now < startDate) {
      await Voter.findByIdAndUpdate(voter._id, {
        $set: { hasVoted: false, status: 'active' },
        $unset: { votedAt: 1 },
      });
      return NextResponse.json({ error: 'Voting has not started yet' }, { status: 403 });
    }

    if (now > endDate) {
      await Voter.findByIdAndUpdate(voter._id, {
        $set: { hasVoted: false, status: 'active' },
        $unset: { votedAt: 1 },
      });
      return NextResponse.json({ error: 'Voting has ended' }, { status: 403 });
    }

    if (votes.length > 100) {
      await Voter.findByIdAndUpdate(voter._id, {
        $set: { hasVoted: false, status: 'active' },
        $unset: { votedAt: 1 },
      });
      return NextResponse.json({ error: 'Invalid vote data' }, { status: 400 });
    }

    const seenCategories = new Set<string>();
    for (const vote of votes) {
      if (!vote.categoryId || !vote.candidateId) {
        await Voter.findByIdAndUpdate(voter._id, {
          $set: { hasVoted: false, status: 'active' },
          $unset: { votedAt: 1 },
        });
        return NextResponse.json({ error: 'Invalid vote data' }, { status: 400 });
      }
      if (seenCategories.has(String(vote.categoryId))) {
        await Voter.findByIdAndUpdate(voter._id, {
          $set: { hasVoted: false, status: 'active' },
          $unset: { votedAt: 1 },
        });
        return NextResponse.json(
          { error: 'Only one vote per category is allowed' },
          { status: 400 }
        );
      }
      seenCategories.add(String(vote.categoryId));
    }

    const votesToSave = [];
    const candidateUpdates = [];

    for (const vote of votes) {
      const { categoryId, candidateId } = vote;

      const candidate = await Candidate.findOne({
        _id: candidateId,
        categoryId,
        electionId: voter.electionId,
      }).select('_id').lean();

      if (!candidate) {
        await Voter.findByIdAndUpdate(voter._id, {
          $set: { hasVoted: false, status: 'active' },
          $unset: { votedAt: 1 },
        });
        return NextResponse.json(
          { error: 'Invalid candidate selection' },
          { status: 400 }
        );
      }

      votesToSave.push({
        electionId: voter.electionId,
        voterId: voter._id,
        categoryId,
        candidateId,
        organizationId: voter.organizationId,
        voterToken: voter.token,
      });

      candidateUpdates.push(candidateId);
    }

    await ElectionVote.deleteMany({ voterId: voter._id, electionId: voter.electionId });

    try {
      await ElectionVote.insertMany(votesToSave);
    } catch (insertError: any) {
      await Voter.findByIdAndUpdate(voter._id, {
        $set: { hasVoted: false, status: 'active' },
        $unset: { votedAt: 1 },
      });
      throw insertError;
    }

    // Update candidate vote counts
    await Promise.all(
      candidateUpdates.map(candidateId =>
        Candidate.findByIdAndUpdate(candidateId, { $inc: { voteCount: 1 } })
      )
    );
    // hasVoted / status / votedAt were already set atomically above

    return NextResponse.json({
      success: true,
      message: 'Vote submitted successfully',
      data: {
        votesCount: votesToSave.length,
      },
    });
  } catch (error: any) {
    console.error('Submit vote error:', error);
    return NextResponse.json(
      { error: 'Failed to submit vote', details: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}
