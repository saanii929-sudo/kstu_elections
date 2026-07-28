import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Voter from '@/models/Voter';
import Election from '@/models/Election';
import { verifyToken } from '@/lib/auth';
import { hashPassword } from '@/lib/auth';
import { sendEmail } from '@/lib/email';
import { sendVoterCredentialsSms } from '@/services/sms.service';
import { generateVoterLinkHash, buildVoterLoginUrl } from '@/lib/voterLink';

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
    if (!decoded || decoded.role !== 'organization') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const electionId = searchParams.get('electionId');

    if (!electionId) {
      return NextResponse.json(
        { error: 'Election ID is required' },
        { status: 400 }
      );
    }

    const election = await Election.findOne({
      _id: electionId,
      organizationId: decoded.id,
    });

    if (!election) {
      return NextResponse.json(
        { error: 'Election not found' },
        { status: 404 }
      );
    }

    const voters = await Voter.find({ electionId }).sort({ createdAt: -1 });

    return NextResponse.json({
      success: true,
      data: voters,
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
    if (!decoded || decoded.role !== 'organization') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { electionId, name, email, phone, voterId, metadata, deliveryMethod = 'both' } = body;

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

    const election = await Election.findOne({
      _id: electionId,
      organizationId: decoded.id,
    });

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
    const password = generatePassword();
    const hashedPassword = await hashPassword(password);
    const linkHash = generateVoterLinkHash(voterToken, hashedPassword);
    const voter = await Voter.create({
      electionId,
      organizationId: decoded.id,
      name,
      email,
      phone: phoneNumber || undefined,
      voterId,
      token: voterToken,
      password: hashedPassword,
      linkHash,
      linkExpiresAt: election.endDate,
      metadata: metadata || {},
      status: 'active',
      hasVoted: false,
    });

    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    const secureLink = buildVoterLoginUrl(baseUrl, linkHash);

    if (email && (deliveryMethod === 'email' || deliveryMethod === 'both')) {
      try {
        await sendVoterCredentials(email, name, voter.voterId!, password, election.title, election.startDate, election.endDate, secureLink);
      } catch (emailError) {
      }
    }

    if (phoneNumber && (deliveryMethod === 'sms' || deliveryMethod === 'both')) {
      try {
        await sendVoterCredentialsSms(phoneNumber, name, voter.voterId!, password, election.title, election.startDate, election.endDate, secureLink, election.alias);
      } catch (smsError) {
      }
    }

    const voterData: any = voter.toObject();
    // Returned once so the admin can see it — the stored hash is replaced
    // with the plaintext here, never persisted anywhere in plaintext.
    voterData.password = password;

    return NextResponse.json({
      success: true,
      message: 'Voter added successfully. Credentials sent via selected delivery method.',
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

async function sendVoterCredentials(
  email: string,
  name: string,
  studentId: string,
  password: string,
  electionTitle: string,
  startDate: Date,
  endDate: Date,
  secureLink: string
): Promise<boolean> {
  const loginUrl = secureLink;

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString('en-GB', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const startDateFormatted = formatDate(startDate);
  const endDateFormatted = formatDate(endDate);

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .credentials-box { background: white; border: 2px solid #16a34a; padding: 20px; margin: 20px 0; border-radius: 8px; }
        .credential-item { margin: 15px 0; }
        .credential-label { font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 1px; }
        .credential-value { font-size: 24px; font-weight: bold; color: #16a34a; font-family: monospace; letter-spacing: 2px; }
        .button { display: inline-block; background: #16a34a; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: bold; font-size: 16px; }
        .button:hover { background: #15803d; }
        .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
        .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
        .info-box { background: #e0e7ff; border-left: 4px solid #6366f1; padding: 15px; margin: 20px 0; }
        .date-box { background: #dcfce7; border-left: 4px solid #16a34a; padding: 15px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🗳️ You&#39;re Invited to Vote</h1>
        </div>
        <div class="content">
          <h2>Hello ${name},</h2>
          <p>You have been registered as a voter for <strong>${electionTitle}</strong>.</p>

          <div class="date-box">
            <p style="margin: 0; font-size: 14px;"><strong>📅 Election Period:</strong></p>
            <p style="margin: 5px 0 0 0; font-size: 14px;">
              <strong>Start:</strong> ${startDateFormatted}<br>
              <strong>End:</strong> ${endDateFormatted}
            </p>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${loginUrl}" class="button" style="color: white;">
              🗳️ Start Voting
            </a>
          </div>

          <div class="info-box">
            <strong>📍 Your Secure Voting Link:</strong><br>
            <a href="${loginUrl}" style="color: #6366f1; word-break: break-all;">${loginUrl}</a>
          </div>

          <div class="credentials-box">
            <p style="text-align: center; margin-bottom: 20px; color: #6b7280;">After clicking the link, sign in with:</p>

            <div class="credential-item">
              <div class="credential-label">Student Number</div>
              <div class="credential-value">${studentId}</div>
            </div>

            <div class="credential-item">
              <div class="credential-label">Password</div>
              <div class="credential-value">${password}</div>
            </div>
          </div>

          <div class="warning">
            <strong>⚠️ Important:</strong> This link and these credentials are unique to you — do not share them. They expire automatically once the election ends.
          </div>

          <p style="margin-top: 30px;">If you have any questions or issues, please contact the election organizers.</p>

          <p>Best regards,<br>Election Management Team</p>
        </div>
        <div class="footer">
          <p>This is an automated message. Please do not reply to this email.</p>
          <p>Your credentials are confidential. Do not share them with anyone.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
    Hello ${name},

    You have been registered as a voter for ${electionTitle}.

    ELECTION PERIOD:
    Start: ${startDateFormatted}
    End: ${endDateFormatted}

    Your secure voting link: ${loginUrl}

    After clicking the link, sign in with:
    Student Number: ${studentId}
    Password: ${password}

    This link and these credentials are unique to you — do not share them.
    They expire automatically once the election ends.

    If you have any questions, please contact the election organizers.

    Best regards,
    Election Management Team
  `;

  return sendEmail({
    to: email,
    subject: `Your Voting Credentials - ${electionTitle}`,
    html,
    text,
  });
}