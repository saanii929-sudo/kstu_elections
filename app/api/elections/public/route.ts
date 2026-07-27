import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Election from '@/models/Election';

export async function GET() {
  try {
    await connectDB();

    const now = new Date();

    // Find the most recent active or upcoming (draft) election that hasn't ended
    const election = await Election.findOne({
      status: { $in: ['active', 'draft'] },
      endDate: { $gt: now },
    })
      .sort({ startDate: 1 })
      .select('title description startDate endDate status')
      .lean();

    if (!election) {
      return NextResponse.json({ success: true, data: null });
    }

    const startDate = new Date(election.startDate);
    const endDate = new Date(election.endDate);

    let computedStatus: 'upcoming' | 'active' | 'ended' = 'upcoming';
    if (now >= startDate && now <= endDate) computedStatus = 'active';
    else if (now > endDate) computedStatus = 'ended';

    return NextResponse.json({
      success: true,
      data: {
        id: (election as any)._id,
        title: election.title,
        description: election.description,
        startDate: election.startDate,
        endDate: election.endDate,
        status: computedStatus,
      },
    });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch election' }, { status: 500 });
  }
}
