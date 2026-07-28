import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Election from '@/models/Election';
import Candidate from '@/models/Candidate';
import Voter from '@/models/Voter';
import ElectionVote from '@/models/ElectionVote';
import Organization from '@/models/Organization';
import { withAuth } from '@/middleware/auth';

async function getAllElections(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.trim();
    const approvalStatus = searchParams.get('approvalStatus');

    const match: any = {};
    if (search) {
      const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      match.$or = [{ title: regex }, { alias: regex }];
    }
    if (approvalStatus && approvalStatus !== 'all') {
      match.approvalStatus = approvalStatus;
    }

    const elections = await Election.aggregate([
      { $match: match },
      {
        $lookup: {
          from: Organization.collection.name,
          localField: 'organizationId',
          foreignField: '_id',
          as: 'organization',
        },
      },
      {
        $lookup: {
          from: Candidate.collection.name,
          localField: '_id',
          foreignField: 'electionId',
          as: 'candidates',
        },
      },
      {
        $lookup: {
          from: Voter.collection.name,
          localField: '_id',
          foreignField: 'electionId',
          as: 'voters',
        },
      },
      {
        $lookup: {
          from: ElectionVote.collection.name,
          localField: '_id',
          foreignField: 'electionId',
          as: 'votes',
        },
      },
      {
        $addFields: {
          organizationName: { $arrayElemAt: ['$organization.name', 0] },
          candidateCount: { $size: '$candidates' },
          voterCount: { $size: '$voters' },
          totalVotes: { $size: '$votes' },
        },
      },
      { $project: { organization: 0, candidates: 0, voters: 0, votes: 0 } },
      { $sort: { createdAt: -1 } },
    ]);

    return NextResponse.json({ success: true, data: elections });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to fetch elections', details: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getAllElections, 'superadmin');
