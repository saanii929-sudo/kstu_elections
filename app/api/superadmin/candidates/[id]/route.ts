import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Candidate from '@/models/Candidate';
import { withAuth } from '@/middleware/auth';
import { logAudit } from '@/lib/auditLog';

// Advisory approval only — does not remove the candidate from the ballot.
async function updateApproval(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id } = await params;
    const body = await req.json();
    const { decision, reason } = body;
    const actor = (req as any).user;

    if (!['approved', 'rejected', 'pending'].includes(decision)) {
      return NextResponse.json({ error: 'Invalid decision' }, { status: 400 });
    }

    const candidate = await Candidate.findByIdAndUpdate(
      id,
      { approvalStatus: decision },
      { returnDocument: 'after', runValidators: true }
    );

    if (!candidate) {
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
    }

    await logAudit({
      actor,
      action: `candidate.${decision}`,
      targetType: 'Candidate',
      targetId: id,
      details: { name: candidate.name, reason },
    });

    return NextResponse.json({
      success: true,
      message: 'Candidate approval status updated',
      data: candidate,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to update candidate approval status', details: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}

export const PUT = withAuth(updateApproval, 'superadmin');
