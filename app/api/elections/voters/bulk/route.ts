import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import connectDB from '@/lib/mongodb';
import Voter from '@/models/Voter';
import ElectionVote from '@/models/ElectionVote';
import Candidate from '@/models/Candidate';
import { verifyToken } from '@/lib/auth';
import { logAudit } from '@/lib/auditLog';
import { isElectionManager, getAccessibleElection } from '@/lib/electionAccess';
import { createVotersFromRows, VoterRow } from '@/lib/voterImportHelpers';

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
    const { electionId, voters, deliveryMethod = 'both', credentialsSendAt } = body;

    if (!electionId || !voters || !Array.isArray(voters) || voters.length === 0) {
      return NextResponse.json(
        { error: 'Election ID and voters array are required' },
        { status: 400 }
      );
    }

    // Every voter created by this request is tagged with the same batch id,
    // so the whole upload can be undone as a unit if it was a mistake.
    const batchId = crypto.randomBytes(8).toString('hex');

    const election = await getAccessibleElection(decoded, electionId);

    if (!election) {
      return NextResponse.json(
        { error: 'Election not found' },
        { status: 404 }
      );
    }
    const now = new Date();
    const endDate = new Date(election.endDate);
    if (now > endDate) {
      return NextResponse.json(
        { error: 'Cannot upload voters. This election has already ended.' },
        { status: 400 }
      );
    }

    // Scheduling now happens as a separate step (PATCH /api/elections/voters/reschedule
    // scoped to this batch's importBatchId) after the admin has reviewed which rows
    // actually got stored — so credentialsSendAt here is optional. If it IS given
    // (kept for backward compatibility with any other caller), validate and apply
    // it immediately; otherwise voters are created unscheduled (credentialsSent:
    // false, credentialsSendAt unset) and simply won't be picked up by the sender
    // until scheduled.
    let sendAt: Date | undefined;
    if (credentialsSendAt) {
      sendAt = new Date(credentialsSendAt);
      if (isNaN(sendAt.getTime()) || sendAt <= now) {
        return NextResponse.json(
          { error: 'Credentials send date/time must be in the future' },
          { status: 400 }
        );
      }
      if (sendAt > endDate) {
        return NextResponse.json(
          { error: 'Credentials send date/time must be before the election ends' },
          { status: 400 }
        );
      }
    }

    const rows: VoterRow[] = voters.map((voterData: any) => ({
      name: voterData.name,
      email: voterData.email,
      phone: voterData.phone,
      voterId: voterData.voterId,
      metadata: {
        department: voterData.department || null,
        class: voterData.class || null,
        studentId: voterData.studentId || null,
        faculty: voterData.faculty || null,
        level: voterData.level || null,
        gender: voterData.gender || null,
        ...voterData.metadata,
      },
    }));

    const outcome = await createVotersFromRows({
      electionId,
      organizationId: election.organizationId,
      linkExpiresAt: election.endDate,
      rows,
      deliveryMethod,
      sendAt,
      batchId,
    });

    if (outcome.successful > 0) {
      await logAudit({
        actor: { id: decoded.id, email: decoded.email, role: decoded.role },
        action: 'voters.bulk_import',
        targetType: 'Election',
        targetId: String(electionId),
        details: { batchId, imported: outcome.successful, failed: outcome.failed },
      });
    }

    return NextResponse.json({
      success: true,
      message: sendAt
        ? `Successfully added ${outcome.successful} voters. Credentials will be sent on ${sendAt.toLocaleString()}.`
        : `Successfully added ${outcome.successful} voters. ${outcome.failed} row(s) could not be stored — review and schedule when ready.`,
      data: { ...outcome, credentialsSendAt: sendAt },
    });
  } catch (error: any) {
    console.error('Bulk upload voters error:', error);
    return NextResponse.json(
      { error: 'Failed to upload voters', details: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}

// Bulk voter removal: either "undo a batch" (batchId given — removes just
// that upload, skipping anyone who's already voted to protect recorded
// results) or "delete all" (batchId omitted — wipes every voter in the
// election, including ones who already voted or whose status is expired;
// their votes are deleted and that election's candidate tallies are reset
// to zero, since no voters remain to have cast them).
export async function DELETE(req: NextRequest) {
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
    const batchId = searchParams.get('batchId');
    const electionId = searchParams.get('electionId');

    if (!electionId) {
      return NextResponse.json({ error: 'electionId is required' }, { status: 400 });
    }

    const election = await getAccessibleElection(decoded, electionId);
    if (!election) {
      return NextResponse.json({ error: 'Election not found' }, { status: 404 });
    }

    const targetVoters = await Voter.find(
      batchId ? { electionId, importBatchId: batchId } : { electionId }
    );

    if (targetVoters.length === 0) {
      return NextResponse.json(
        { error: batchId ? 'This upload batch was not found, or has already been removed.' : 'No voters found for this election.' },
        { status: 404 }
      );
    }

    const removable = batchId ? targetVoters.filter((v) => !v.hasVoted) : targetVoters;
    const blocked = batchId ? targetVoters.filter((v) => v.hasVoted) : [];
    const removableIds = removable.map((v) => v._id);

    await Promise.all([
      Voter.deleteMany({ _id: { $in: removableIds } }),
      ElectionVote.deleteMany({ voterId: { $in: removableIds } }),
      ...(!batchId ? [Candidate.updateMany({ electionId }, { voteCount: 0, noVoteCount: 0 })] : []),
    ]);

    await logAudit({
      actor: { id: decoded.id, email: decoded.email, role: decoded.role },
      action: batchId ? 'voters.bulk_import_undo' : 'voters.delete_all',
      targetType: 'Election',
      targetId: String(electionId),
      details: batchId
        ? { batchId, removed: removable.length, blocked: blocked.length }
        : { removed: removable.length },
    });

    return NextResponse.json({
      success: true,
      message:
        blocked.length > 0
          ? `Removed ${removable.length} voter(s). ${blocked.length} could not be removed because they have already voted.`
          : `Removed ${removable.length} voter(s)${batchId ? ' from this upload' : ' and reset all candidate vote counts for this election'}.`,
      data: {
        removed: removable.length,
        blocked: blocked.length,
        blockedNames: blocked.map((v) => v.name),
      },
    });
  } catch (error: any) {
    console.error('Delete voters error:', error);
    return NextResponse.json(
      { error: 'Failed to delete voters', details: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}
