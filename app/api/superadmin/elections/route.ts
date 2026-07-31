import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Election from '@/models/Election';
import Candidate from '@/models/Candidate';
import Voter from '@/models/Voter';
import Organization from '@/models/Organization';
import { withAuth } from '@/middleware/auth';
import { normalizeAlias, isValidAlias, getElectionStatus } from '@/lib/electionStatus';
import { logAudit } from '@/lib/auditLog';

async function getAllElections(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.trim();
    const approvalStatus = searchParams.get('approvalStatus');
    // Optional — omitted (e.g. by the admins page's election picker) means
    // "return everything", preserving that consumer's existing behavior.
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? Math.max(1, parseInt(limitParam, 10)) : undefined;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));

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
          from: Organization.collection.name,
          localField: 'assignedOrganizationIds',
          foreignField: '_id',
          as: 'assignedOrganizations',
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
        $addFields: {
          organizationName: { $arrayElemAt: ['$organization.name', 0] },
          assignedOrganizationNames: '$assignedOrganizations.name',
          candidateCount: { $size: '$candidates' },
          voterCount: { $size: '$voters' },
          // Voters who have voted, not ElectionVote documents — a voter who
          // votes across multiple positions creates one ElectionVote per
          // position (see models/ElectionVote.ts's {voterId, categoryId}
          // uniqueness), which would otherwise inflate this well past the
          // number of people who actually voted.
          totalVotes: {
            $size: { $filter: { input: '$voters', as: 'v', cond: '$$v.hasVoted' } },
          },
        },
      },
      { $project: { organization: 0, assignedOrganizations: 0, candidates: 0, voters: 0 } },
      { $sort: { createdAt: -1 } },
    ]);

    // Computed once here with the server's own clock and stamped onto each
    // election as displayStatus — the client trusts this instead of
    // recomputing from its own (possibly wrong) device clock. See
    // lib/electionStatus.ts.
    const withStatus = elections.map((e: any) => ({ ...e, displayStatus: getElectionStatus(e) }));

    const total = withStatus.length;
    const totalPages = limit ? Math.max(1, Math.ceil(total / limit)) : 1;
    const start = limit ? (page - 1) * limit : 0;
    const paged = limit ? withStatus.slice(start, start + limit) : withStatus;

    return NextResponse.json({
      success: true,
      data: paged,
      pagination: { page: limit ? page : 1, limit: limit ?? total, total, totalPages },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to fetch elections', details: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}

// Superadmin creating an election directly, on behalf of an existing
// organization — mirrors app/api/elections/route.ts POST (the org's own
// self-service creation), except organizationId comes from the request body
// (superadmin-picked) instead of the caller's own id, and the election is
// marked pre-approved since a superadmin authored it directly.
async function createElection(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const { organizationId, title, alias, description, startDate, endDate, settings } = body;

    if (!organizationId) {
      return NextResponse.json({ error: 'Organization is required' }, { status: 400 });
    }
    if (!title || !alias || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Title, alias, start date, and end date are required' },
        { status: 400 }
      );
    }

    const organization = await Organization.findById(organizationId);
    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const normalizedAlias = normalizeAlias(alias);
    if (!isValidAlias(normalizedAlias)) {
      return NextResponse.json(
        { error: 'Alias must be 2-20 characters: letters, numbers, and hyphens only' },
        { status: 400 }
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (start >= end) {
      return NextResponse.json({ error: 'End date must be after start date' }, { status: 400 });
    }

    const existingAlias = await Election.findOne({ alias: normalizedAlias });
    if (existingAlias) {
      return NextResponse.json(
        { error: 'That alias is already in use. Choose a different one.' },
        { status: 409 }
      );
    }

    const election = await Election.create({
      organizationId,
      title,
      alias: normalizedAlias,
      description,
      startDate: start,
      endDate: end,
      settings: settings || {
        showLiveResults: true,
        allowRevote: false,
        requireAllCategories: false,
      },
      status: 'draft',
      // Superadmin-authored — no self-review step needed.
      approvalStatus: 'approved',
    });

    const actor = (req as any).user;
    await logAudit({
      actor,
      action: 'election.create',
      targetType: 'Election',
      targetId: String(election._id),
      details: { title, organizationId },
    });

    return NextResponse.json(
      { success: true, message: 'Election created successfully', data: election },
      { status: 201 }
    );
  } catch (error: any) {
    if (error?.code === 11000) {
      return NextResponse.json(
        { error: 'That alias is already in use. Choose a different one.' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to create election', details: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getAllElections, 'superadmin');
export const POST = withAuth(createElection, 'superadmin');
