import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import ElectionCategory from '@/models/ElectionCategory';
import { verifyToken } from '@/lib/auth';
import { isElectionManager, getAccessibleElection } from '@/lib/electionAccess';

// Deliberately public/unauthenticated — this is the voter-facing ballot's
// own category (position) list (app/election/vote/page.tsx calls this with
// no auth header) as well as the admin dashboard's read. Do not add an auth
// requirement here.
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const electionId = searchParams.get('electionId');

    if (!electionId) {
      return NextResponse.json(
        { error: 'Election ID is required' },
        { status: 400 }
      );
    }

    const categories = await ElectionCategory.find({ electionId })
      .sort({ order: 1, createdAt: 1 });

    return NextResponse.json({
      success: true,
      data: categories,
    });
  } catch (error: any) {
    console.error('Get categories error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories', details: process.env.NODE_ENV === 'development' ? error.message : undefined },
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
    const { electionId, name, description, maxSelections, order } = body;

    if (!electionId || !name) {
      return NextResponse.json(
        { error: 'Election ID and name are required' },
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

    const category = await ElectionCategory.create({
      electionId,
      // The election's real owning organization, not the acting admin's own id.
      organizationId: election.organizationId,
      name,
      description,
      maxSelections: maxSelections || 1,
      order: order || 0,
    });

    return NextResponse.json({
      success: true,
      message: 'Category created successfully',
      data: category,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Create category error:', error);
    return NextResponse.json(
      { error: 'Failed to create category', details: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}
