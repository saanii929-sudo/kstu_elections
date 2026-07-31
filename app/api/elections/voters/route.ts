import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Voter from '@/models/Voter';
import { verifyToken } from '@/lib/auth';
import { hashPassword } from '@/lib/auth';
import { generateVoterLinkHash } from '@/lib/voterLink';
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
  let token = '';
  for (let i = 0; i < 8; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

function generatePassword(): string {
  const uppercase = 'ABCDEFGHJKMNPQRSTUVWXYZ';
  const lowercase = 'abcdefghjkmnpqrstuvwxyz';
  const numbers = '23456789';
  const allChars = uppercase + lowercase + numbers;
  
  let password = '';
  password += uppercase.charAt(Math.floor(Math.random() * uppercase.length));
  
  password += lowercase.charAt(Math.floor(Math.random() * lowercase.length));
  
  password += numbers.charAt(Math.floor(Math.random() * numbers.length));
  
  for (let i = 0; i < 5; i++) {
    password += allChars.charAt(Math.floor(Math.random() * allChars.length));
  }
  
  return password.split('').sort(() => Math.random() - 0.5).join('');
}
async function generateUniqueToken(): Promise<string> {
  let token = generateToken();
  let exists = await Voter.findOne({ token });
  
  while (exists) {
    token = generateToken();
    exists = await Voter.findOne({ token });
  }
  
  return token;
}

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
    const electionId = searchParams.get('electionId');
    const search = searchParams.get('search')?.trim();
    // Optional — omitted means "return everything" (unpaginated), for any
    // caller that doesn't need paging.
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? Math.max(1, parseInt(limitParam, 10)) : undefined;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));

    if (!electionId) {
      return NextResponse.json(
        { error: 'Election ID is required' },
        { status: 400 }
      );
    }

    const election = await getAccessibleElection(decoded, electionId);

    if (!election) {
      return NextResponse.json(
        { error: 'Election not found' },
        { status: 404 }
      );
    }

    const filter: Record<string, unknown> = { electionId };
    if (search) {
      const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ name: regex }, { email: regex }, { voterId: regex }];
    }

    // electionTotal/pendingCredentialsCount are election-wide (ignore the
    // search filter) — actions like "Delete All" and "Reschedule" operate on
    // the whole roster, not just whatever's visible on the current search/page.
    const [total, electionTotal, pendingCredentialsCount] = await Promise.all([
      Voter.countDocuments(filter),
      search ? Voter.countDocuments({ electionId }) : Promise.resolve(undefined),
      Voter.countDocuments({ electionId, credentialsSent: false }),
    ]);
    const totalPages = limit ? Math.max(1, Math.ceil(total / limit)) : 1;

    let query = Voter.find(filter).sort({ createdAt: -1 });
    if (limit) query = query.skip((page - 1) * limit).limit(limit);
    const voters = await query;

    return NextResponse.json({
      success: true,
      data: voters,
      pagination: { page: limit ? page : 1, limit: limit ?? total, total, totalPages },
      electionTotal: electionTotal ?? total,
      pendingCredentialsCount,
    });
  } catch (error: any) {
    console.error('Get voters error');
    return NextResponse.json(
      { error: 'Failed to fetch voters', details: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
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
    const { electionId, name, email, phone, voterId, metadata, deliveryMethod = 'both', credentialsSendAt } = body;

    if (!electionId || !name) {
      return NextResponse.json(
        { error: 'Election ID and name are required' },
        { status: 400 }
      );
    }

    if (!voterId || !String(voterId).trim()) {
      return NextResponse.json(
        { error: 'Student number is required' },
        { status: 400 }
      );
    }

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
        { error: 'Cannot add voters. This election has already ended.' },
        { status: 400 }
      );
    }

    // Sending is always scheduled, never immediate — a date/time must be
    // picked, and credential delivery waits for it (see
    // lib/scheduledVoterCredentials.ts).
    if (!credentialsSendAt) {
      return NextResponse.json(
        { error: 'A credentials send date/time is required' },
        { status: 400 }
      );
    }
    const sendAt = new Date(credentialsSendAt);
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

    let phoneNumber = null;
    if (phone) {
      let phoneStr = String(phone).trim();
      
      if (phoneStr.includes('E') || phoneStr.includes('e')) {
        phoneStr = scientificToDecimal(phoneStr);
      }
      
      if (phoneStr.includes('.')) {
        phoneStr = phoneStr.split('.')[0];
      }
      
      phoneNumber = phoneStr;
    }
    const voterToken = await generateUniqueToken();
    // Throwaway password/link — never revealed anywhere. The real one is
    // generated fresh right before actual delivery, at credentialsSendAt
    // (see lib/scheduledVoterCredentials.ts). This one only exists to
    // satisfy the schema until then.
    const placeholderPassword = generatePassword();
    const hashedPlaceholder = await hashPassword(placeholderPassword);
    const linkHash = generateVoterLinkHash(voterToken, hashedPlaceholder);
    const voter = await Voter.create({
      electionId,
      // The election's real owning organization, not the acting admin's own id.
      organizationId: election.organizationId,
      name,
      email,
      phone: phoneNumber || undefined,
      voterId,
      token: voterToken,
      password: hashedPlaceholder,
      linkHash,
      linkExpiresAt: election.endDate,
      metadata: metadata || {},
      status: 'active',
      hasVoted: false,
      credentialsSendAt: sendAt,
      credentialsSent: false,
      credentialsDeliveryMethod: deliveryMethod,
    });

    const voterData: any = voter.toObject();
    delete voterData.password;

    return NextResponse.json({
      success: true,
      message: `Voter added successfully. Credentials will be sent on ${sendAt.toLocaleString()}.`,
      data: voterData,
    }, { status: 201 });
  } catch (error: any) {
    
    if (error.code === 11000) {
      const keyFields = Object.keys(error.keyPattern || {});
      if (keyFields.includes('email')) {
        return NextResponse.json(
          { error: 'This email address is already registered for this election' },
          { status: 400 }
        );
      } else if (keyFields.includes('phone')) {
        return NextResponse.json(
          { error: 'This phone number is already registered for this election' },
          { status: 400 }
        );
      } else if (keyFields.includes('voterId')) {
        return NextResponse.json(
          { error: 'This student number is already registered for this election' },
          { status: 400 }
        );
      } else if (keyFields.includes('token')) {
        return NextResponse.json(
          { error: 'Token conflict. Please try again.' },
          { status: 400 }
        );
      }
    }
    
    return NextResponse.json(
      { error: 'Failed to add voter', details: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}
