import connectDB from '@/lib/mongodb';
import Election from '@/models/Election';
import Voter from '@/models/Voter';

const BATCH_LIMIT = 200;

/**
 * Keeps Voter.status in sync with election expiry, in both directions —
 * same "expired" definition lib/electionStatus.ts uses to derive "closed"
 * for display (status === 'ended', set manually/early-terminated, OR
 * endDate has passed on its own):
 *
 * 1. Expire: every voter tied to a now-expired election gets status:
 *    'expired', so the org-admin/helpdesk resend routes (and the voters
 *    table UI) refuse to resend credentials to them.
 * 2. Reactivate: if an org-admin later extends an expired election's
 *    endDate (or reopens it), voters who were previously auto-expired but
 *    never actually voted (hasVoted: false) get flipped back to 'active' so
 *    they can vote again. Voters who already voted are left untouched —
 *    there's nothing to resume for them, and this sweep isn't the place to
 *    decide revote policy.
 *
 * Neither direction has an external side effect (no email/SMS sent) —
 * setting the same status twice is a no-op, so plain updateMany calls per
 * election are safe to call from more than one trigger without the atomic
 * per-document claim the scheduled-credentials job needs.
 */
export async function processDueElectionVoterExpiry(): Promise<{
  expiredElectionsChecked: number;
  votersExpired: number;
  activeElectionsChecked: number;
  votersReactivated: number;
}> {
  await connectDB();

  const now = new Date();

  // 1. Expire voters of elections that are now expired.
  const expiredElections = await Election.find(
    { $or: [{ status: 'ended' }, { endDate: { $lt: now } }] },
    { _id: 1 }
  )
    .limit(BATCH_LIMIT)
    .lean();

  let votersExpired = 0;
  for (const election of expiredElections) {
    const result = await Voter.updateMany(
      { electionId: election._id, status: { $ne: 'expired' } },
      { $set: { status: 'expired' } }
    );
    votersExpired += result.modifiedCount || 0;
  }

  // 2. Reactivate not-yet-voted voters of elections that are active/not
  // (or no longer) expired — covers an org-admin extending the endDate or
  // reopening an ended election.
  const activeElections = await Election.find(
    { status: { $ne: 'ended' }, endDate: { $gte: now } },
    { _id: 1 }
  )
    .limit(BATCH_LIMIT)
    .lean();

  let votersReactivated = 0;
  for (const election of activeElections) {
    const result = await Voter.updateMany(
      { electionId: election._id, status: 'expired', hasVoted: false },
      { $set: { status: 'active' } }
    );
    votersReactivated += result.modifiedCount || 0;
  }

  return {
    expiredElectionsChecked: expiredElections.length,
    votersExpired,
    activeElectionsChecked: activeElections.length,
    votersReactivated,
  };
}

const SWEEP_INTERVAL_MS = 60 * 1000;

declare global {
  var __scheduledVoterExpiryJobStarted: boolean | undefined;
}

/**
 * Starts the recurring in-process sweep. This is a redundant fallback, not
 * the primary trigger — set up a real cron job against
 * /api/cron/voter-expiry (see that route) as the authoritative one. Cached
 * on `global` so a Next.js dev-mode hot-reload doesn't register a second
 * interval on top of the first — mirrors lib/scheduledVoterCredentials.ts.
 */
export function startScheduledVoterExpiryJob(): void {
  if (global.__scheduledVoterExpiryJobStarted) return;
  global.__scheduledVoterExpiryJobStarted = true;

  console.log(`[scheduler] voter-expiry sweep starting, every ${SWEEP_INTERVAL_MS / 1000}s`);

  setInterval(() => {
    processDueElectionVoterExpiry()
      .then((result) =>
        console.log(
          `[scheduler] voter-expiry tick ${new Date().toISOString()} — ${result.votersExpired} voter(s) expired (${result.expiredElectionsChecked} election(s)), ${result.votersReactivated} voter(s) reactivated (${result.activeElectionsChecked} election(s))`
        )
      )
      .catch((err) => console.error('Scheduled voter expiry sweep errored:', err));
  }, SWEEP_INTERVAL_MS);

  // Also run shortly after startup, in case an election expired (or was
  // extended) while the server was down or mid-deploy.
  setTimeout(() => {
    processDueElectionVoterExpiry()
      .then((result) =>
        console.log(
          `[scheduler] voter-expiry startup sweep — ${result.votersExpired} voter(s) expired (${result.expiredElectionsChecked} election(s)), ${result.votersReactivated} voter(s) reactivated (${result.activeElectionsChecked} election(s))`
        )
      )
      .catch((err) => console.error('Initial scheduled voter expiry sweep errored:', err));
  }, 5000);
}
