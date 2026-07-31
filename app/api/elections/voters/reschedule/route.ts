import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Voter from '@/models/Voter';
import { verifyToken } from '@/lib/auth';
import { isElectionManager, getAccessibleElection } from '@/lib/electionAccess';
import { logAudit } from '@/lib/auditLog';

// Bulk-reschedules not-yet-sent voters to a new credentialsSendAt — either
// every pending voter in the election (no batchId), or just one bulk-upload
// batch (batchId given — this is what the bulk-upload wizard's "Schedule"
// step calls once the admin has reviewed which rows actually got stored).
// Only touches voters with credentialsSent: false; anyone whose credentials
// already went out is untouched (their real password/link were already
// generated and delivered — rescheduling wouldn't do anything meaningful
// for them).
export async function PATCH(req: NextRequest) {
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
    const { electionId, credentialsSendAt, batchId } = body;

    if (!electionId || !credentialsSendAt) {
      return NextResponse.json(
        { error: 'Election ID and a new send date/time are required' },
        { status: 400 }
      );
    }

    const election = await getAccessibleElection(decoded, electionId);
    if (!election) {
      return NextResponse.json({ error: 'Election not found' }, { status: 404 });
    }

    const now = new Date();
    const endDate = new Date(election.endDate);
    const sendAt = new Date(credentialsSendAt);

    if (isNaN(sendAt.getTime()) || sendAt <= now) {
      return NextResponse.json(
        { error: 'New send date/time must be in the future' },
        { status: 400 }
      );
    }
    if (sendAt > endDate) {
      return NextResponse.json(
        { error: 'New send date/time must be before the election ends' },
        { status: 400 }
      );
    }

    const filter: Record<string, unknown> = { electionId, credentialsSent: false };
    if (batchId) filter.importBatchId = batchId;

    const result = await Voter.updateMany(filter, { $set: { credentialsSendAt: sendAt } });

    if (result.modifiedCount === 0) {
      return NextResponse.json(
        {
          error: batchId
            ? 'No pending voters found in this batch to schedule.'
            : 'No pending voters to reschedule — everyone in this election already has credentials sent.',
        },
        { status: 400 }
      );
    }

    await logAudit({
      actor: { id: decoded.id, email: decoded.email, role: decoded.role },
      action: batchId ? 'voters.schedule_batch' : 'voters.reschedule',
      targetType: 'Election',
      targetId: String(electionId),
      details: { credentialsSendAt: sendAt, rescheduled: result.modifiedCount, batchId },
    });

    return NextResponse.json({
      success: true,
      message: `Rescheduled ${result.modifiedCount} pending voter(s) to ${sendAt.toLocaleString()}.`,
      data: { modifiedCount: result.modifiedCount, credentialsSendAt: sendAt },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to reschedule credentials', details: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}
