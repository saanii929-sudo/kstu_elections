import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import connectDB from '@/lib/mongodb';
import Voter from '@/models/Voter';
import ElectionVote from '@/models/ElectionVote';
import Candidate from '@/models/Candidate';
import { verifyToken } from '@/lib/auth';
import { hashPassword } from '@/lib/auth';
import { generateVoterLinkHash } from '@/lib/voterLink';
import { logAudit } from '@/lib/auditLog';
import { isElectionManager, getAccessibleElection } from '@/lib/electionAccess';

function scientificToDecimal(num: string): string {
  const numStr = String(num).trim();
  if (!numStr.includes('E') && !numStr.includes('e')) {
    return numStr;
  }
  const [base, exponent] = numStr.split(/[eE]/);
  const exp = parseInt(exponent, 10);
  
  if (exp === 0) {
    return base;
  }
  const [intPart, decPart = ''] = base.split('.');
  const digits = intPart + decPart;
  if (exp > 0) {
    const totalDigits = digits.length;
    const zerosToAdd = exp - decPart.length;
    
    if (zerosToAdd >= 0) {
      return digits + '0'.repeat(zerosToAdd);
    } else {
      const newDecimalPos = intPart.length + exp;
      return digits.slice(0, newDecimalPos) + '.' + digits.slice(newDecimalPos);
    }
  } else {
    const zerosToAdd = Math.abs(exp) - intPart.length;
    if (zerosToAdd >= 0) {
      return '0.' + '0'.repeat(zerosToAdd) + digits;
    } else {
      const newDecimalPos = intPart.length + exp;
      return digits.slice(0, newDecimalPos) + '.' + digits.slice(newDecimalPos);
    }
  }
}

function generateToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const bytes = require('crypto').randomBytes(8);
  let token = '';
  for (let i = 0; i < 8; i++) {
    token += chars[bytes[i] % chars.length];
  }
  return token;
}

function generatePassword(): string {
  const uppercase = 'ABCDEFGHJKMNPQRSTUVWXYZ';
  const lowercase = 'abcdefghjkmnpqrstuvwxyz';
  const numbers = '23456789';
  const allChars = uppercase + lowercase + numbers;
  const bytes = require('crypto').randomBytes(8);

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

  const shuffleBytes = require('crypto').randomBytes(picks.length);
  for (let i = picks.length - 1; i > 0; i--) {
    const j = shuffleBytes[i] % (i + 1);
    [picks[i], picks[j]] = [picks[j], picks[i]];
  }
  return picks.join('');
}


async function generateUniqueToken(existingTokens: Set<string>): Promise<string> {
  let token = generateToken();
  
  while (existingTokens.has(token) || await Voter.findOne({ token })) {
    token = generateToken();
  }
  
  existingTokens.add(token);
  return token;
}

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

    const existingVoters = await Voter.find({ electionId }, { email: 1, phone: 1, voterId: 1 }).lean();
    const existingEmails = new Set(existingVoters.map((v: any) => v.email).filter(Boolean));
    const existingPhones = new Set(existingVoters.map((v: any) => v.phone).filter(Boolean));
    const existingVoterIds = new Set(existingVoters.map((v: any) => v.voterId).filter(Boolean));

    const batchEmails = new Set<string>();
    const batchPhones = new Set<string>();
    const batchVoterIds = new Set<string>();

    const existingTokens = new Set<string>();
    const votersToCreate: any[] = [];
    const results: {
      success: Array<{
        row: number;
        name: string;
        token: string;
        voterId: string;
        email?: string;
        phone?: string;
        linkHash: string;
      }>;
      failed: Array<{
        row: number;
        data: any;
        error: string;
      }>;
    } = {
      success: [],
      failed: [],
    };

    for (let i = 0; i < voters.length; i++) {
      const voterData = voters[i];
      
      try {
        if (!voterData.name) {
          results.failed.push({
            row: i + 1,
            data: voterData,
            error: 'Name is required',
          });
          continue;
        }

        if (!voterData.voterId || !String(voterData.voterId).trim()) {
          results.failed.push({
            row: i + 1,
            data: voterData,
            error: 'Student number (voterId) is required',
          });
          continue;
        }

        const vidStr = String(voterData.voterId).trim();
        if (existingVoterIds.has(vidStr) || batchVoterIds.has(vidStr)) {
          results.failed.push({
            row: i + 1,
            data: voterData,
            error: `Student number ${vidStr} is already registered in this election`,
          });
          continue;
        }
        batchVoterIds.add(vidStr);

        if (voterData.email) {
          const emailStr = String(voterData.email).trim().toLowerCase();
          if (existingEmails.has(emailStr) || batchEmails.has(emailStr)) {
            results.failed.push({
              row: i + 1,
              data: voterData,
              error: `Email ${emailStr} is already registered in this election`,
            });
            continue;
          }
          batchEmails.add(emailStr);
        }

        let phoneNumber = null;
        if (voterData.phone) {
          // Defensive: a phone number should never legitimately contain a
          // quote character. Excel CSV exports often wrap numeric-looking
          // cells in quotes (e.g. `"0551234567"`) to preserve leading
          // zeros — strip them here in case they slipped through parsing.
          let phoneStr = String(voterData.phone).trim().replace(/"/g, '');

          if (phoneStr.includes('E') || phoneStr.includes('e')) {
            phoneStr = scientificToDecimal(phoneStr);
           
            const trailingZeros = phoneStr.match(/0+$/);
            if (trailingZeros && trailingZeros[0].length >= 4) {
              console.warn(`⚠️ Row ${i + 1} - Phone number may have lost precision due to Excel formatting. Original: ${voterData.phone}, Converted: ${phoneStr}`);
              console.warn(`   This happens when Excel converts phone numbers to scientific notation.`);
              console.warn(`   To fix: Format the phone column as TEXT in Excel before saving CSV.`);
            }
          }
          if (phoneStr.includes('.')) {
            phoneStr = phoneStr.split('.')[0];
          }
          
          phoneNumber = phoneStr;

          if (existingPhones.has(phoneNumber) || batchPhones.has(phoneNumber)) {
            results.failed.push({
              row: i + 1,
              data: voterData,
              error: `Phone ${phoneNumber} is already registered in this election`,
            });
            continue;
          }
          batchPhones.add(phoneNumber);
        }
        const voterToken = await generateUniqueToken(existingTokens);
        // Throwaway password/link — never revealed anywhere. The real one
        // is generated fresh right before actual delivery, at
        // credentialsSendAt (see lib/scheduledVoterCredentials.ts). This
        // one only exists to satisfy the schema until then.
        const placeholderPassword = generatePassword();
        const hashedPlaceholder = await hashPassword(placeholderPassword);
        const linkHash = generateVoterLinkHash(voterToken, hashedPlaceholder);

        votersToCreate.push({
          electionId,
          // The election's real owning organization, not the acting admin's own id.
          organizationId: election.organizationId,
          name: voterData.name,
          email: voterData.email || null,
          phone: phoneNumber,
          voterId: vidStr,
          token: voterToken,
          password: hashedPlaceholder,
          linkHash,
          linkExpiresAt: election.endDate,
          importBatchId: batchId,
          metadata: {
            department: voterData.department || null,
            class: voterData.class || null,
            studentId: voterData.studentId || null,
            ...voterData.metadata,
          },
          status: 'active',
          hasVoted: false,
          credentialsSendAt: sendAt,
          credentialsSent: false,
          credentialsDeliveryMethod: deliveryMethod,
        });

        results.success.push({
          row: i + 1,
          name: voterData.name,
          token: voterToken,
          voterId: vidStr,
          email: voterData.email,
          phone: phoneNumber || undefined,
          linkHash,
        });
      } catch (error: any) {
        results.failed.push({
          row: i + 1,
          data: voterData,
          error: error.message,
        });
      }
    }
    if (votersToCreate.length > 0) {
      try {
        await Voter.insertMany(votersToCreate, { ordered: false });
      } catch (bulkError: any) {
        if (bulkError.code === 11000 && bulkError.writeErrors) {
          bulkError.writeErrors.forEach((writeError: any) => {
            const failedVoter = votersToCreate[writeError.index];
            const field = Object.keys(writeError.err.keyPattern || {})[0];
            let errorMsg = 'Duplicate entry';
            
            if (field === 'email') {
              errorMsg = `Email ${failedVoter.email} is already registered in this election`;
            } else if (field === 'phone') {
              errorMsg = `Phone ${failedVoter.phone} is already registered in this election`;
            } else if (field === 'voterId') {
              errorMsg = `Student number ${failedVoter.voterId} is already registered in this election`;
            } else if (field === 'token') {
              errorMsg = 'Token conflict';
            }
            const successIndex = results.success.findIndex(
              s => s.token === failedVoter.token
            );
            if (successIndex !== -1) {
              const failedEntry = results.success.splice(successIndex, 1)[0];
              results.failed.push({
                row: failedEntry.row,
                data: failedVoter,
                error: errorMsg,
              });
            }
          });
        }
      }
    }
    if (results.success.length > 0) {
      await logAudit({
        actor: { id: decoded.id, email: decoded.email, role: decoded.role },
        action: 'voters.bulk_import',
        targetType: 'Election',
        targetId: String(electionId),
        details: { batchId, imported: results.success.length, failed: results.failed.length },
      });
    }

    return NextResponse.json({
      success: true,
      message: sendAt
        ? `Successfully added ${results.success.length} voters. Credentials will be sent on ${sendAt.toLocaleString()}.`
        : `Successfully added ${results.success.length} voters. ${results.failed.length} row(s) could not be stored — review and schedule when ready.`,
      data: {
        total: voters.length,
        successful: results.success.length,
        failed: results.failed.length,
        credentialsSendAt: sendAt,
        voters: results.success,
        errors: results.failed,
        batchId: results.success.length > 0 ? batchId : undefined,
      },
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
