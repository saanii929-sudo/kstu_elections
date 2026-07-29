import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Candidate from '@/models/Candidate';
import { verifyToken } from '@/lib/auth';
import { isElectionManager, getAccessibleElection } from '@/lib/electionAccess';

// Deliberately public/unauthenticated — this is the voter-facing ballot's
// own candidate list (app/election/vote/page.tsx calls this with no auth
// header) as well as the admin dashboard's read. Do not add an auth
// requirement here.
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const electionId = searchParams.get('electionId');
    const categoryId = searchParams.get('categoryId');

    if (!electionId) {
      return NextResponse.json(
        { error: 'Election ID is required' },
        { status: 400 }
      );
    }

    const query: any = { electionId };
    if (categoryId) {
      query.categoryId = categoryId;
    }

    const candidates = await Candidate.find(query)
      .populate('categoryId', 'name')
      .sort({ ballotNumber: 1, createdAt: 1 });

    return NextResponse.json({
      success: true,
      data: candidates,
    });
  } catch (error: any) {
    console.error('Get candidates error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch candidates', details: process.env.NODE_ENV === 'development' ? error.message : undefined },
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
    const { electionId, categoryId, name, image, bio, manifesto, ballotNumber } = body;

    if (!electionId || !categoryId || !name) {
      return NextResponse.json(
        { error: 'Election ID, category ID, and name are required' },
        { status: 400 }
      );
    }
    const election = await getAccessibleElection(decoded, electionId);

    if (!election) {
      return NextResponse.json(
        { error: 'Election not found' },
        { status: 404 }
      );
    }

    const candidate = await Candidate.create({
      electionId,
      categoryId,
      // The election's real owning organization, not the acting admin's own id.
      organizationId: election.organizationId,
      name,
      image,
      bio,
      manifesto,
      ballotNumber: ballotNumber || 1,
      voteCount: 0,
    });

    return NextResponse.json({
      success: true,
      message: 'Candidate created successfully',
      data: candidate,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Create candidate error:', error);
    return NextResponse.json(
      { error: 'Failed to create candidate', details: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}
