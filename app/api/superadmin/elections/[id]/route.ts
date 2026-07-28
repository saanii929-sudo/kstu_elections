import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Election from '@/models/Election';
import { withAuth } from '@/middleware/auth';
import { logAudit } from '@/lib/auditLog';

// Advisory approval only — never blocks the organization from running the
// election or publishing results. Updates a visibility/audit status only.
async function updateApproval(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id } = await params;
    const body = await req.json();
    const { field, decision, reason } = body;
    const actor = (req as any).user;

    if (!['approvalStatus', 'resultsApprovalStatus'].includes(field)) {
      return NextResponse.json({ error: 'Invalid approval field' }, { status: 400 });
    }
    if (!['approved', 'rejected', 'pending'].includes(decision)) {
      return NextResponse.json({ error: 'Invalid decision' }, { status: 400 });
    }

    const election = await Election.findByIdAndUpdate(
      id,
      { [field]: decision },
      { new: true, runValidators: true }
    );

    if (!election) {
      return NextResponse.json({ error: 'Election not found' }, { status: 404 });
    }

    await logAudit({
      actor,
      action: field === 'resultsApprovalStatus' ? `election.results.${decision}` : `election.${decision}`,
      targetType: 'Election',
      targetId: id,
      details: { title: election.title, alias: election.alias, reason },
    });

    return NextResponse.json({
      success: true,
      message: 'Approval status updated',
      data: election,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to update approval status', details: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}

export const PUT = withAuth(updateApproval, 'superadmin');
