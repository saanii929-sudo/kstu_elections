import crypto from 'crypto';
import connectDB from '@/lib/mongodb';
import Voter from '@/models/Voter';
import Election from '@/models/Election';
import { hashPassword } from '@/lib/auth';
import { sendVoterCredentialsSms } from '@/services/sms.service';
import { sendVoterCredentialsEmail } from '@/lib/voterCredentialsEmail';
import { generateVoterLinkHash, buildVoterLoginUrl } from '@/lib/voterLink';

const BATCH_LIMIT = 200;

function generatePassword(): string {
  const uppercase = 'ABCDEFGHJKMNPQRSTUVWXYZ';
  const lowercase = 'abcdefghjkmnpqrstuvwxyz';
  const numbers = '23456789';
  const allChars = uppercase + lowercase + numbers;
  const bytes = crypto.randomBytes(8);

  const picks = [
    uppercase[bytes[0] % uppercase.length],
    lowercase[bytes[1] % lowercase.length],
    numbers[bytes[2] % numbers.length],
    allChars[bytes[3] % allChars.length],
    allChars[bytes[4] % allChars.length],
    allChars[bytes[5] % allChars.length],
    allChars[bytes[6] % allChars.length],
    allChars[bytes[7] % allChars.length],
  ];
  const shuffleBytes = crypto.randomBytes(picks.length);
  for (let i = picks.length - 1; i > 0; i--) {
    const j = shuffleBytes[i] % (i + 1);
    [picks[i], picks[j]] = [picks[j], picks[i]];
  }
  return picks.join('');
}

/**
 * Finds every voter whose scheduled credential-send time has arrived and
 * hasn't been sent yet, generates a fresh password for each (never reusing
 * whatever was set at creation time — same principle as the manual "Resend
 * Credentials" flow: no real password is ever held at rest before the
 * moment it's actually sent), delivers it via the voter's chosen channel,
 * and marks it sent.
 *
 * Claims one voter at a time via an atomic findOneAndUpdate (flipping
 * credentialsSent to true as part of the same query that finds it) rather
 * than loading a batch and saving each at the end — this is what makes it
 * safe to call from more than one trigger (the in-process interval AND a
 * cron hit landing close together, or two overlapping cron ticks) without
 * two triggers both finding the same still-unsent voter and sending it
 * twice with two different passwords.
 *
 * A failed send is still marked sent (matching the immediate-send routes,
 * which also don't auto-retry) — an admin can use "Resend Credentials" on
 * that individual voter if delivery genuinely failed.
 */
export async function processDueScheduledVoterCredentials(): Promise<{ processed: number }> {
  await connectDB();

  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  const electionCache = new Map<string, any>();
  let processed = 0;

  while (processed < BATCH_LIMIT) {
    const now = new Date();
    // Atomic claim: only one caller can ever win this update for a given
    // voter, since credentialsSent: false is part of the filter itself.
    const voter = await Voter.findOneAndUpdate(
      { credentialsSent: false, credentialsSendAt: { $lte: now } },
      { $set: { credentialsSent: true } }
    );

    if (!voter) break; // nothing left due

    processed++;

    try {
      const electionIdStr = String(voter.electionId);
      let election = electionCache.get(electionIdStr);
      if (election === undefined) {
        election = await Election.findById(voter.electionId);
        electionCache.set(electionIdStr, election);
      }

      if (!election) {
        // Election no longer exists — nothing sensible to send. Already
        // claimed (credentialsSent: true), so just move on.
        continue;
      }

      const plainPassword = generatePassword();
      const hashedPassword = await hashPassword(plainPassword);
      const linkHash = generateVoterLinkHash(voter.token, hashedPassword);
      const secureLink = buildVoterLoginUrl(baseUrl, linkHash);

      const method = voter.credentialsDeliveryMethod || 'both';

      if (voter.email && (method === 'email' || method === 'both')) {
        try {
          await sendVoterCredentialsEmail(
            voter.email,
            voter.name,
            voter.voterId!,
            plainPassword,
            election.title,
            election.startDate,
            election.endDate,
            secureLink
          );
        } catch (emailError) {
          console.error(`Scheduled credentials email failed for voter ${voter._id}:`, emailError);
        }
      }

      if (voter.phone && (method === 'sms' || method === 'both')) {
        try {
          await sendVoterCredentialsSms(
            voter.phone,
            voter.name,
            voter.voterId!,
            plainPassword,
            election.title,
            election.startDate,
            election.endDate,
            secureLink,
            election.alias
          );
        } catch (smsError) {
          console.error(`Scheduled credentials SMS failed for voter ${voter._id}:`, smsError);
        }
      }

      await Voter.updateOne(
        { _id: voter._id },
        { $set: { password: hashedPassword, linkHash, linkExpiresAt: election.endDate } }
      );
    } catch (voterError) {
      console.error(`Scheduled credential send failed for voter ${voter._id}:`, voterError);
      // Already claimed above — an admin can use "Resend Credentials" if
      // delivery genuinely failed.
    }
  }

  return { processed };
}

const SWEEP_INTERVAL_MS = 60 * 1000;

declare global {
  var __scheduledVoterCredentialsJobStarted: boolean | undefined;
}

/**
 * Starts the recurring in-process sweep. This is a redundant fallback, not
 * the primary trigger — set up a real cron job against
 * /api/cron/voter-credentials (see that route for the why) as the
 * authoritative one. Cached on `global` (mirroring lib/rate-limit.ts's
 * cleanup-interval guard) so a Next.js dev-mode hot-reload doesn't register
 * a second interval on top of the first.
 */
export function startScheduledVoterCredentialsJob(): void {
  if (global.__scheduledVoterCredentialsJobStarted) return;
  global.__scheduledVoterCredentialsJobStarted = true;

  setInterval(() => {
    processDueScheduledVoterCredentials().catch((err) =>
      console.error('Scheduled voter credentials sweep errored:', err)
    );
  }, SWEEP_INTERVAL_MS);

  // Also run shortly after startup, in case something came due while the
  // server was down or mid-deploy.
  setTimeout(() => {
    processDueScheduledVoterCredentials().catch((err) =>
      console.error('Initial scheduled voter credentials sweep errored:', err)
    );
  }, 5000);
}
