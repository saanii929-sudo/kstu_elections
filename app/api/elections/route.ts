import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Election from '@/models/Election';
import Candidate from '@/models/Candidate';
import Voter from '@/models/Voter';
import ElectionVote from '@/models/ElectionVote';
import Organization from '@/models/Organization';
import Admin from '@/models/Admin';
import { verifyToken, generateToken } from '@/lib/auth';
import { normalizeAlias, isValidAlias, getElectionStatus, ElectionStatusKey } from '@/lib/electionStatus';
import { isElectionManager, electionListMatch } from '@/lib/electionAccess';

const STATUS_SORT_ORDER: Record<ElectionStatusKey, number> = {
  live: 0,
  scheduled: 1,
  closed: 2,
};

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
    const search = searchParams.get('search')?.trim();
    const statusFilter = searchParams.get('status'); // live|scheduled|closed|all
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const sortBy = searchParams.get('sortBy') || 'date'; // date|status|createdDate
    const sortDir = searchParams.get('sortDir') === 'asc' ? 1 : -1;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    // Pagination only applies when explicitly requested — callers that list
    // all elections for a dropdown (voters/reports/agents pages) expect every result.
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? Math.min(100, Math.max(1, parseInt(limitParam, 10) || 9)) : null;

    // Aggregation pipelines bypass Mongoose's automatic string->ObjectId casting
    // (unlike .find()), so this must be cast explicitly or the match hits nothing.
    const match: any = electionListMatch(decoded);
    if (search) {
      const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      match.$or = [{ title: regex }, { alias: regex }];
    }
    if (dateFrom || dateTo) {
      match.startDate = {};
      if (dateFrom) match.startDate.$gte = new Date(dateFrom);
      if (dateTo) match.startDate.$lte = new Date(dateTo);
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
    ]);

    // Status is schedule-derived — computed once here with the server's own
    // clock and stamped onto each election as displayStatus, which the
    // client then trusts instead of recomputing from its own (possibly
    // wrong) device clock. See lib/electionStatus.ts.
    const withStatus = elections.map((e: any) => ({ ...e, displayStatus: getElectionStatus(e) }));

    let filtered = withStatus;
    if (statusFilter && statusFilter !== 'all') {
      filtered = filtered.filter((e) => e.displayStatus === statusFilter);
    }

    filtered.sort((a, b) => {
      let diff = 0;
      if (sortBy === 'status') {
        diff = STATUS_SORT_ORDER[a.displayStatus as ElectionStatusKey] - STATUS_SORT_ORDER[b.displayStatus as ElectionStatusKey];
      } else if (sortBy === 'createdDate') {
        diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else {
        diff = new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
      }
      return diff * sortDir;
    });

    const total = filtered.length;
    const totalPages = limit ? Math.max(1, Math.ceil(total / limit)) : 1;
    const start = limit ? (page - 1) * limit : 0;
    const paged = limit ? filtered.slice(start, start + limit) : filtered;

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

export async function POST(req: NextRequest) {
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

    const body = await req.json();
    const { title, alias, description, startDate, endDate, settings } = body;

    if (!title || !alias || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Title, alias, start date, and end date are required' },
        { status: 400 }
      );
    }

    // An electionAdmin has no organization of their own — they must name
    // one, and only one they already have exposure to (via an existing
    // assigned election), never an arbitrary organization.
    let organizationId: string;
    if (decoded.role === 'organization') {
      organizationId = decoded.id;
    } else {
      const requestedOrgId = body.organizationId;
      if (!requestedOrgId) {
        return NextResponse.json({ error: 'organizationId is required' }, { status: 400 });
      }
      const hasAccess = await Election.exists({
        _id: { $in: decoded.assignedElections || [] },
        organizationId: requestedOrgId,
      });
      if (!hasAccess) {
        return NextResponse.json(
          { error: 'You do not have access to that organization' },
          { status: 403 }
        );
      }
      organizationId = requestedOrgId;
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
      return NextResponse.json(
        { error: 'End date must be after start date' },
        { status: 400 }
      );
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
      // approvalStatus defaults to 'pending' per the schema — an
      // electionAdmin-created election waits for superadmin review, same
      // as an organization's own self-service creation.
    });

    // The admin's current session token was issued at login and doesn't
    // know about this brand-new election. Every other route trusts
    // decoded.assignedElections from the token (not a DB lookup), so
    // without this the admin couldn't manage the election they just
    // created until they logged out and back in.
    let newToken: string | undefined;
    if (decoded.role === 'electionAdmin') {
      await Admin.findByIdAndUpdate(decoded.id, { $addToSet: { assignedElections: election._id } });
      newToken = generateToken({
        id: decoded.id,
        email: decoded.email,
        role: decoded.role,
        sid: decoded.sid,
        assignedElections: [...(decoded.assignedElections || []), String(election._id)],
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Election created successfully',
      data: election,
      ...(newToken ? { token: newToken } : {}),
    }, { status: 201 });
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
