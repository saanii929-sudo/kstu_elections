import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import ElectionCategory from '@/models/ElectionCategory';
import Candidate from '@/models/Candidate';
import { verifyToken } from '@/lib/auth';
import { isElectionManager, getAccessibleElection } from '@/lib/electionAccess';
import { logAudit } from '@/lib/auditLog';

// Copies selected positions and/or candidates from one election an admin
// manages into another election they manage — so a recurring election
// (same union, new year) doesn't require re-typing the same roster.
// Positions are matched/deduplicated by name (case-insensitive) so
// re-running an import, or importing candidates whose position already
// exists in the target, never creates duplicate positions.
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
    const { targetElectionId, sourceElectionId, positionIds, candidateIds } = body;

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

    const wantedPositionIds: string[] = Array.isArray(positionIds) ? positionIds : [];
    const wantedCandidateIds: string[] = Array.isArray(candidateIds) ? candidateIds : [];
    if (wantedPositionIds.length === 0 && wantedCandidateIds.length === 0) {
      return NextResponse.json({ error: 'Nothing selected to import' }, { status: 400 });
    }

    // Both elections must belong to something this admin actually manages —
    // otherwise any org could pull another org's candidate roster (names,
    // photos, bios) into their own election just by guessing an election id.
    const [targetElection, sourceElection] = await Promise.all([
      getAccessibleElection(decoded, targetElectionId),
      getAccessibleElection(decoded, sourceElectionId),
    ]);
    if (!targetElection || !sourceElection) {
      return NextResponse.json({ error: 'Election not found' }, { status: 404 });
    }
    // Captured for the closures below — TS narrowing of targetElection
    // doesn't persist across function boundaries.
    const targetOrganizationId = targetElection.organizationId;

    const targetPositions = await ElectionCategory.find({ electionId: targetElectionId });
    const targetPositionByName = new Map(
      targetPositions.map((p) => [p.name.trim().toLowerCase(), p])
    );

    let positionsCreated = 0;
    let positionsSkipped = 0;
    // sourcePositionId -> target ElectionCategory doc (created or matched)
    const positionMap = new Map<string, InstanceType<typeof ElectionCategory>>();

    // find-or-create the target position for a given source position,
    // shared by both the explicit position import and the candidate import
    // (a candidate pulls its position along with it if not already present).
    async function resolveTargetPosition(sourcePosition: InstanceType<typeof ElectionCategory>) {
      const already = positionMap.get(String(sourcePosition._id));
      if (already) return already;

      const key = sourcePosition.name.trim().toLowerCase();
      const existing = targetPositionByName.get(key);
      if (existing) {
        positionMap.set(String(sourcePosition._id), existing);
        return existing;
      }

      const created = await ElectionCategory.create({
        electionId: targetElectionId,
        organizationId: targetOrganizationId,
        name: sourcePosition.name,
        description: sourcePosition.description,
        maxSelections: sourcePosition.maxSelections,
        order: sourcePosition.order,
      });
      targetPositionByName.set(key, created);
      positionMap.set(String(sourcePosition._id), created);
      positionsCreated++;
      return created;
    }

    if (wantedPositionIds.length > 0) {
      const sourcePositions = await ElectionCategory.find({
        _id: { $in: wantedPositionIds },
        electionId: sourceElectionId,
      });
      for (const sp of sourcePositions) {
        const key = sp.name.trim().toLowerCase();
        if (targetPositionByName.has(key)) {
          positionsSkipped++;
          positionMap.set(String(sp._id), targetPositionByName.get(key)!);
          continue;
        }
        await resolveTargetPosition(sp);
      }
    }

    let candidatesCreated = 0;
    let candidatesSkipped = 0;

    if (wantedCandidateIds.length > 0) {
      const sourceCandidates = await Candidate.find({
        _id: { $in: wantedCandidateIds },
        electionId: sourceElectionId,
      }).populate('categoryId');

      // Track next free ballot number per target position so imported
      // candidates never collide with what's already on the ballot there.
      const nextBallotNumber = new Map<string, number>();
      const ballotSeed = async (targetPositionId: string) => {
        const key = String(targetPositionId);
        if (nextBallotNumber.has(key)) return;
        const existing = await Candidate.find({ categoryId: targetPositionId })
          .select('ballotNumber')
          .lean();
        const max = existing.reduce((m: number, c: any) => Math.max(m, c.ballotNumber || 0), 0);
        nextBallotNumber.set(key, max + 1);
      };

      for (const sc of sourceCandidates) {
        const sourcePosition = sc.categoryId as any;
        if (!sourcePosition) continue;

        const targetPosition = await resolveTargetPosition(sourcePosition);
        const targetPositionId = String(targetPosition._id);

        const alreadyInTarget = await Candidate.exists({
          categoryId: targetPositionId,
          name: { $regex: `^${sc.name.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' },
        });
        if (alreadyInTarget) {
          candidatesSkipped++;
          continue;
        }

        await ballotSeed(targetPositionId);
        const ballotNumber = nextBallotNumber.get(targetPositionId)!;
        nextBallotNumber.set(targetPositionId, ballotNumber + 1);

        await Candidate.create({
          electionId: targetElectionId,
          categoryId: targetPositionId,
          organizationId: targetOrganizationId,
          name: sc.name,
          image: sc.image,
          bio: sc.bio,
          manifesto: sc.manifesto,
          ballotNumber,
        });
        candidatesCreated++;
      }
    }

    await logAudit({
      actor: { id: decoded.id, email: decoded.email, role: decoded.role },
      action: 'election.import',
      targetType: 'Election',
      targetId: String(targetElectionId),
      details: {
        sourceElectionId,
        positionsCreated,
        positionsSkipped,
        candidatesCreated,
        candidatesSkipped,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Imported ${positionsCreated} position(s) and ${candidatesCreated} candidate(s).`,
      data: { positionsCreated, positionsSkipped, candidatesCreated, candidatesSkipped },
    });
  } catch (error: any) {
    console.error('Import election data error:', error);
    return NextResponse.json(
      { error: 'Failed to import data', details: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}
