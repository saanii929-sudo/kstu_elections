import Election from '@/models/Election';
import type { IVoter } from '@/models/Voter';

export interface EligibilityResult {
  ok: boolean;
  error?: string;
  status?: number;
  startDate?: Date;
  election?: InstanceType<typeof Election>;
}

/**
 * Shared voter-status + election-timing checks used by both the link-gate
 * check and the actual credential login, so the two can't drift out of sync.
 */
export async function checkVoterEligibility(voter: IVoter): Promise<EligibilityResult> {
  if (voter.status !== 'active') {
    if (voter.status === 'expired') {
      return {
        ok: false,
        error: 'Your voting credentials have expired. You have already voted.',
        status: 403,
      };
    }
    return { ok: false, error: 'Your voting access has been disabled', status: 403 };
  }

  const election = await Election.findById(voter.electionId);
  if (!election) {
    return { ok: false, error: 'Election not found', status: 404 };
  }

  const now = new Date();
  const startDate = new Date(election.startDate);
  const endDate = new Date(election.endDate);

  if (now < startDate) {
    return {
      ok: false,
      error: 'Voting has not started yet. Please wait until the election begins.',
      status: 403,
      startDate: election.startDate,
    };
  }

  if (election.status === 'ended' || now > endDate) {
    // Mark voter as expired so future attempts also fail fast
    if (voter.status === 'active') {
      voter.status = 'expired';
      await voter.save();
    }
    return {
      ok: false,
      error: 'This election has ended. Your voting credentials are no longer valid.',
      status: 403,
    };
  }

  return { ok: true, election };
}
