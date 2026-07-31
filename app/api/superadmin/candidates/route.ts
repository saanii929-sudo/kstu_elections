import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Candidate from '@/models/Candidate';
import { withAuth } from '@/middleware/auth';
import { logAudit } from '@/lib/auditLog';

async function getCandidates(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const electionId = searchParams.get('electionId');
    if (!electionId) {
      return NextResponse.json({ error: 'electionId is required' }, { status: 400 });
    }

    // Optional — omitted means "return everything", for any caller that
    // doesn't need paging.
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? Math.max(1, parseInt(limitParam, 10)) : undefined;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));

    const total = await Candidate.countDocuments({ electionId });
    const totalPages = limit ? Math.max(1, Math.ceil(total / limit)) : 1;

    let query = Candidate.find({ electionId }).sort({ ballotNumber: 1 });
    if (limit) query = query.skip((page - 1) * limit).limit(limit);
    const candidates = await query;

    return NextResponse.json({
      success: true,
      data: candidates,
      pagination: { page: limit ? page : 1, limit: limit ?? total, total, totalPages },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to fetch candidates', details: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}

// Bulk approval — lets a superadmin clear an entire election's candidate
// slate in one action instead of clicking through each candidate
// individually, which gets impractical once there are dozens of them.
async function bulkUpdateApproval(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const { electionId, decision, reason } = body;
    const actor = (req as any).user;

    if (!electionId) {
      return NextResponse.json({ error: 'electionId is required' }, { status: 400 });
    }
    if (!['approved', 'rejected', 'pending'].includes(decision)) {
      return NextResponse.json({ error: 'Invalid decision' }, { status: 400 });
    }

    const result = await Candidate.updateMany(
      { electionId, approvalStatus: { $ne: decision } },
      { approvalStatus: decision }
    );

    await logAudit({
      actor,
      action: `candidate.bulk_${decision}`,
      targetType: 'Candidate',
      targetId: electionId,
      details: { electionId, count: result.modifiedCount, reason },
    });

    return NextResponse.json({
      success: true,
      message: `${result.modifiedCount} candidate(s) updated`,
      data: { modifiedCount: result.modifiedCount },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to bulk update candidates', details: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getCandidates, 'superadmin');
export const PATCH = withAuth(bulkUpdateApproval, 'superadmin');
