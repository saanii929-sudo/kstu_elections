import mongoose from 'mongoose';
import Voter from '@/models/Voter';
import { hashPassword } from '@/lib/auth';
import { generateVoterLinkHash } from '@/lib/voterLink';

export interface VoterRow {
  name: string;
  email?: string | null;
  phone?: string | null;
  voterId: string;
  metadata?: Record<string, unknown>;
}

export interface VoterImportSuccess {
  row: number;
  name: string;
  token: string;
  voterId: string;
  email?: string;
  phone?: string;
  linkHash: string;
}

export interface VoterImportFailure {
  row: number;
  data: unknown;
  error: string;
}

export interface VoterImportOutcome {
  successful: number;
  failed: number;
  total: number;
  batchId?: string;
  voters: VoterImportSuccess[];
  errors: VoterImportFailure[];
}

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
  while (existingTokens.has(token) || (await Voter.findOne({ token }))) {
    token = generateToken();
  }
  existingTokens.add(token);
  return token;
}

export async function createVotersFromRows(params: {
  electionId: string;
  organizationId: mongoose.Types.ObjectId;
  linkExpiresAt: Date;
  rows: VoterRow[];
  deliveryMethod: 'email' | 'sms' | 'both';
  sendAt?: Date;
  batchId: string;
}): Promise<VoterImportOutcome> {
  const { electionId, organizationId, linkExpiresAt, rows, deliveryMethod, sendAt, batchId } = params;

  const existingVoters = await Voter.find({ electionId }, { email: 1, phone: 1, voterId: 1 }).lean();
  const existingEmails = new Set(existingVoters.map((v: any) => v.email).filter(Boolean));
  const existingPhones = new Set(existingVoters.map((v: any) => v.phone).filter(Boolean));
  const existingVoterIds = new Set(existingVoters.map((v: any) => v.voterId).filter(Boolean));

  const batchEmails = new Set<string>();
  const batchPhones = new Set<string>();
  const batchVoterIds = new Set<string>();
  const existingTokens = new Set<string>();

  const votersToCreate: any[] = [];
  const results: { success: VoterImportSuccess[]; failed: VoterImportFailure[] } = {
    success: [],
    failed: [],
  };

  for (let i = 0; i < rows.length; i++) {
    const voterData = rows[i];

    try {
      if (!voterData.name) {
        results.failed.push({ row: i + 1, data: voterData, error: 'Name is required' });
        continue;
      }

      if (!voterData.voterId || !String(voterData.voterId).trim()) {
        results.failed.push({ row: i + 1, data: voterData, error: 'Student number (voterId) is required' });
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

      let phoneNumber: string | null = null;
      if (voterData.phone) {
        let phoneStr = String(voterData.phone).trim().replace(/"/g, '');
        if (phoneStr.includes('E') || phoneStr.includes('e')) {
          phoneStr = scientificToDecimal(phoneStr);
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
      // Throwaway password/link — never revealed anywhere. The real one is
      // generated fresh right before actual delivery, at credentialsSendAt
      // (see lib/scheduledVoterCredentials.ts). This one only exists to
      // satisfy the schema until then.
      const placeholderPassword = generatePassword();
      const hashedPlaceholder = await hashPassword(placeholderPassword);
      const linkHash = generateVoterLinkHash(voterToken, hashedPlaceholder);

      votersToCreate.push({
        electionId,
        organizationId,
        name: voterData.name,
        email: voterData.email || null,
        phone: phoneNumber,
        voterId: vidStr,
        token: voterToken,
        password: hashedPlaceholder,
        linkHash,
        linkExpiresAt,
        importBatchId: batchId,
        metadata: voterData.metadata || {},
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
        email: voterData.email || undefined,
        phone: phoneNumber || undefined,
        linkHash,
      });
    } catch (error: any) {
      results.failed.push({ row: i + 1, data: voterData, error: error.message });
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
          const successIndex = results.success.findIndex((s) => s.token === failedVoter.token);
          if (successIndex !== -1) {
            const failedEntry = results.success.splice(successIndex, 1)[0];
            results.failed.push({ row: failedEntry.row, data: failedVoter, error: errorMsg });
          }
        });
      }
    }
  }

  return {
    total: rows.length,
    successful: results.success.length,
    failed: results.failed.length,
    voters: results.success,
    errors: results.failed,
    batchId: results.success.length > 0 ? batchId : undefined,
  };
}
