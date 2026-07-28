import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Candidate from '@/models/Candidate';
import { withAuth } from '@/middleware/auth';

async function getCandidates(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const electionId = searchParams.get('electionId');
    if (!electionId) {
      return NextResponse.json({ error: 'electionId is required' }, { status: 400 });
    }

    const candidates = await Candidate.find({ electionId }).sort({ ballotNumber: 1 });

    return NextResponse.json({ success: true, data: candidates });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to fetch candidates', details: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getCandidates, 'superadmin');
