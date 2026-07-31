import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Election from '@/models/Election';
import Organization from '@/models/Organization';
import { withAuth } from '@/middleware/auth';
import { logAudit } from '@/lib/auditLog';

// Co-assigns additional organizations to an election — full management
// access (voters, candidates, results) alongside the owning organization,
// same election shared across all of them. See lib/electionAccess.ts.
async function updateAssignedOrganizations(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const { id } = await params;
    const body = await req.json();
    const { organizationIds } = body;
    const actor = (req as any).user;

    if (!Array.isArray(organizationIds)) {
      return NextResponse.json({ error: 'organizationIds must be an array' }, { status: 400 });
    }

    const election = await Election.findById(id);
    if (!election) {
      return NextResponse.json({ error: 'Election not found' }, { status: 404 });
    }

    // Dedupe and drop the owner — owner access is already implicit via
    // organizationId, so keeping it out of this list avoids double-counting.
    const uniqueIds = Array.from(new Set(organizationIds.map(String))).filter(
      (orgId) => orgId !== String(election.organizationId)
    );

    if (uniqueIds.length > 0) {
      const found = await Organization.countDocuments({ _id: { $in: uniqueIds } });
      if (found !== uniqueIds.length) {
        return NextResponse.json({ error: 'One or more organizations were not found' }, { status: 400 });
      }
    }

    election.assignedOrganizationIds = uniqueIds as any;
    await election.save();

    await logAudit({
      actor,
      action: 'election.assign_organizations',
      targetType: 'Election',
      targetId: id,
      details: { title: election.title, alias: election.alias, organizationIds: uniqueIds },
    });

    const populated = await Election.findById(id).populate('assignedOrganizationIds', 'name');

    return NextResponse.json({
      success: true,
      message: 'Assigned organizations updated',
      data: populated,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to update assigned organizations', details: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}

export const PATCH = withAuth(updateAssignedOrganizations, 'superadmin');
