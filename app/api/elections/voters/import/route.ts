import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import connectDB from '@/lib/mongodb';
import Voter from '@/models/Voter';
import { verifyToken } from '@/lib/auth';
import { isElectionManager, getAccessibleElection } from '@/lib/electionAccess';
import { logAudit } from '@/lib/auditLog';
import { createVotersFromRows, VoterRow } from '@/lib/voterImportHelpers';

// Lets an org-admin who already uploaded a full roster for one election
// (e.g. a school-wide SRC election) reuse that same roster — filtered down
// by department/faculty/level/gender — as the voter list for a related
// election (a departmental or faculty race), instead of re-uploading a CSV
// of the same students. Unrelated elections (Hall, Graduate, Lecturers)
// simply aren't a subset of that roster, so they still go through the
// normal CSV bulk upload.

function buildFilter(electionId: string, searchParams: URLSearchParams) {
  const filter: Record<string, unknown> = { electionId };
  for (const key of ['department', 'faculty', 'level', 'gender']) {
    const val = searchParams.get(key);
    if (val) filter[`metadata.${key}`] = val;
  }
  return filter;
}

// GET ?sourceElectionId=X&department=&faculty=&level=&gender=
// Returns the distinct filter values available in the source election's
// roster, plus how many voters currently match the given filter combo —
// so the admin can narrow down before committing to the import.
export async function GET(req: NextRequest) {
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
    const sourceElectionId = searchParams.get('sourceElectionId');
    if (!sourceElectionId) {
      return NextResponse.json({ error: 'sourceElectionId is required' }, { status: 400 });
    }

    const sourceElection = await getAccessibleElection(decoded, sourceElectionId);
    if (!sourceElection) {
      return NextResponse.json({ error: 'Election not found' }, { status: 404 });
    }

    const filter = buildFilter(sourceElectionId, searchParams);

    const [count, departments, faculties, levels, genders] = await Promise.all([
      Voter.countDocuments(filter),
      Voter.distinct('metadata.department', { electionId: sourceElectionId }),
      Voter.distinct('metadata.faculty', { electionId: sourceElectionId }),
      Voter.distinct('metadata.level', { electionId: sourceElectionId }),
      Voter.distinct('metadata.gender', { electionId: sourceElectionId }),
    ]);

    const clean = (arr: unknown[]) =>
      (arr as (string | null | undefined)[]).filter((v): v is string => !!v && v.trim().length > 0).sort();

    return NextResponse.json({
      success: true,
      data: {
        count,
        filterOptions: {
          departments: clean(departments),
          faculties: clean(faculties),
          levels: clean(levels),
          genders: clean(genders),
        },
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to load import options', details: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}

// POST { targetElectionId, sourceElectionId, filters: {department?, faculty?, level?, gender?}, deliveryMethod }
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
    const { targetElectionId, sourceElectionId, filters, deliveryMethod = 'both' } = body;

    if (!targetElectionId || !sourceElectionId) {
      return NextResponse.json(
        { error: 'Target and source election IDs are required' },
        { status: 400 }
      );
    }
    if (targetElectionId === sourceElectionId) {
      return NextResponse.json(
        { error: 'Source and target election must be different' },
        { status: 400 }
      );
    }

    // Both elections must belong to something this admin actually manages —
    // otherwise any org could pull another org's student roster into their
    // own election just by guessing an election id.
    const [targetElection, sourceElection] = await Promise.all([
      getAccessibleElection(decoded, targetElectionId),
      getAccessibleElection(decoded, sourceElectionId),
    ]);
    if (!targetElection || !sourceElection) {
      return NextResponse.json({ error: 'Election not found' }, { status: 404 });
    }

    const now = new Date();
    if (now > new Date(targetElection.endDate)) {
      return NextResponse.json(
        { error: 'Cannot import voters. This election has already ended.' },
        { status: 400 }
      );
    }

    const sourceFilter: Record<string, unknown> = { electionId: sourceElectionId };
    if (filters && typeof filters === 'object') {
      for (const key of ['department', 'faculty', 'level', 'gender']) {
        const val = filters[key];
        if (val) sourceFilter[`metadata.${key}`] = val;
      }
    }

    const sourceVoters = await Voter.find(sourceFilter)
      .select('name email phone voterId metadata')
      .lean();

    if (sourceVoters.length === 0) {
      return NextResponse.json(
        { error: 'No voters match those filters in the source election.' },
        { status: 400 }
      );
    }

    const rows: VoterRow[] = sourceVoters.map((v: any) => ({
      name: v.name,
      email: v.email,
      phone: v.phone,
      voterId: v.voterId,
      // Carries department/faculty/level/gender/class/studentId straight
      // through — this is exactly the data the filters just selected on.
      metadata: v.metadata || {},
    }));

    const batchId = crypto.randomBytes(8).toString('hex');
    const outcome = await createVotersFromRows({
      electionId: targetElectionId,
      organizationId: targetElection.organizationId,
      linkExpiresAt: targetElection.endDate,
      rows,
      deliveryMethod,
      batchId,
    });

    if (outcome.successful > 0) {
      await logAudit({
        actor: { id: decoded.id, email: decoded.email, role: decoded.role },
        action: 'voters.import_from_election',
        targetType: 'Election',
        targetId: String(targetElectionId),
        details: {
          sourceElectionId,
          filters,
          batchId,
          imported: outcome.successful,
          failed: outcome.failed,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: `Imported ${outcome.successful} voters. ${outcome.failed} could not be stored — review and schedule when ready.`,
      data: outcome,
    });
  } catch (error: any) {
    console.error('Import voters from election error:', error);
    return NextResponse.json(
      { error: 'Failed to import voters', details: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}
