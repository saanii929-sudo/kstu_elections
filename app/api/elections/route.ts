import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/mongodb';
import Election from '@/models/Election';
import Candidate from '@/models/Candidate';
import Voter from '@/models/Voter';
import ElectionVote from '@/models/ElectionVote';
import { verifyToken } from '@/lib/auth';
import { normalizeAlias, isValidAlias, getElectionStatus, ElectionStatusKey } from '@/lib/electionStatus';

const STATUS_SORT_ORDER: Record<ElectionStatusKey, number> = {
  live: 0,
  pending: 1,
  scheduled: 2,
  draft: 3,
  closed: 4,
};

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'organization') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.trim();
    const statusFilter = searchParams.get('status'); // live|pending|scheduled|draft|closed|all
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
    const match: any = { organizationId: new mongoose.Types.ObjectId(decoded.id) };
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
          candidateCount: { $size: '$candidates' },
          voterCount: { $size: '$voters' },
          totalVotes: { $size: '$votes' },
        },
      },
      { $project: { candidates: 0, voters: 0, votes: 0 } },
    ]);

    // Status is schedule-derived, so filtering/sorting on it happens in JS
    // using the same getElectionStatus() the UI uses — keeps both in lockstep.
    let filtered = elections;
    if (statusFilter && statusFilter !== 'all') {
      filtered = filtered.filter((e) => getElectionStatus(e) === statusFilter);
    }

    filtered.sort((a, b) => {
      let diff = 0;
      if (sortBy === 'status') {
        diff = STATUS_SORT_ORDER[getElectionStatus(a)] - STATUS_SORT_ORDER[getElectionStatus(b)];
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
    if (!decoded || decoded.role !== 'organization') {
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
      organizationId: decoded.id,
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
    });

    return NextResponse.json({
      success: true,
      message: 'Election created successfully',
      data: election,
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
