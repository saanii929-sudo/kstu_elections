import mongoose from 'mongoose';
import Election, { IElection } from '@/models/Election';

// Shared authorization logic for the two identities that can manage an
// election: the owning Organization (full access to every election it
// owns, plus any election a superadmin has co-assigned it to via
// Election.assignedOrganizationIds — carried in decoded.assignedElections,
// same mechanism as electionAdmin below), and an electionAdmin (an Admin
// account scoped to specific elections via decoded.assignedElections).
// Centralized here so the many app/api/elections/** routes don't each
// re-derive this independently.
export interface DecodedElectionActor {
  id: string;
  role: string;
  assignedElections?: string[];
}

export function isElectionManager(decoded: DecodedElectionActor | null | undefined): boolean {
  return !!decoded && (decoded.role === 'organization' || decoded.role === 'electionAdmin');
}

function assignedIds(decoded: DecodedElectionActor): string[] {
  return (decoded.assignedElections || []).map(String);
}

/**
 * Loads the Election iff the actor is allowed to manage it. Replaces
 * `Election.findOne({ _id: electionId, organizationId: decoded.id })`.
 */
export async function getAccessibleElection(
  decoded: DecodedElectionActor,
  electionId: string
): Promise<IElection | null> {
  if (decoded.role === 'organization') {
    if (assignedIds(decoded).includes(String(electionId))) {
      return Election.findById(electionId);
    }
    return Election.findOne({ _id: electionId, organizationId: decoded.id });
  }
  if (decoded.role === 'electionAdmin') {
    if (!assignedIds(decoded).includes(String(electionId))) return null;
    return Election.findById(electionId);
  }
  return null;
}

/**
 * Filter fragment for sub-resource collections that store BOTH
 * organizationId and electionId (Candidate, Voter, ElectionCategory,
 * ElectionAgent, PinkSheet). Spread into a query alongside `_id`/`electionId`:
 *   Candidate.findOne({ _id: id, ...electionOwnerMatch(decoded) })
 */
export function electionOwnerMatch(decoded: DecodedElectionActor): Record<string, unknown> {
  if (decoded.role === 'organization') {
    const assigned = assignedIds(decoded);
    // Sub-resources always carry the owning organization's id (set once at
    // creation, never rewritten for co-assigned orgs — see bulk voter
    // upload). A co-assigned org therefore can't match on organizationId,
    // only on electionId membership.
    if (assigned.length === 0) return { organizationId: decoded.id };
    return { $or: [{ organizationId: decoded.id }, { electionId: { $in: assigned } }] };
  }
  if (decoded.role === 'electionAdmin') return { electionId: { $in: assignedIds(decoded) } };
  return { _id: null }; // matches nothing
}

/**
 * Filter fragment for querying the Election collection itself (list/aggregate
 * endpoints). Note: aggregation pipelines need real ObjectIds, not strings.
 */
export function electionListMatch(decoded: DecodedElectionActor): Record<string, unknown> {
  if (decoded.role === 'organization') {
    const ownId = new mongoose.Types.ObjectId(decoded.id);
    const assigned = assignedIds(decoded)
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));
    if (assigned.length === 0) return { organizationId: ownId };
    return { $or: [{ organizationId: ownId }, { _id: { $in: assigned } }] };
  }
  if (decoded.role === 'electionAdmin') {
    const ids = assignedIds(decoded)
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));
    return { _id: { $in: ids } };
  }
  return { _id: null };
}
