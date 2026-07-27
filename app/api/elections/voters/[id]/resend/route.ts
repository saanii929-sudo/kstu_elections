import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Voter from '@/models/Voter';
import Election from '@/models/Election';
import { verifyToken, hashPassword } from '@/lib/auth';
import { sendEmail } from '@/lib/email';
import { sendVoterCredentialsSms } from '@/services/sms.service';

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

// Send voter credentials via email
async function sendVoterCredentials(
  email: string,
  name: string,
  token: string,
  password: string,
  electionTitle: string,
  startDate: Date,
  endDate: Date
) {
  const loginUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/election/login`;

  // Format dates
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
        .credential-value { font-size: 18px; font-weight: bold; color: #16a34a; font-family: monospace; }
        .button { display: inline-block; padding: 12px 30px; background: #16a34a; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
        .date-box { background: #dcfce7; border-left: 4px solid #16a34a; padding: 15px; margin: 20px 0; }
        .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🗳️ Your Voting Credentials (Resent)</h1>
        </div>
        <div class="content">
          <p>Hello <strong>${name}</strong>,</p>
          <p>Your voting credentials for <strong>${electionTitle}</strong> have been resent as requested.</p>
          
          <div class="date-box">
            <p style="margin: 0; font-size: 14px;"><strong>📅 Election Period:</strong></p>
            <p style="margin: 5px 0 0 0; font-size: 14px;">
              <strong>Start:</strong> ${startDateFormatted}<br>
              <strong>End:</strong> ${endDateFormatted}
            </p>
          </div>
          
          <div class="credentials-box">
            <p style="text-align: center; margin-bottom: 20px; color: #6b7280;">Your Login Credentials</p>
            
            <div class="credential-item">
              <div class="credential-label">Voter Token</div>
              <div class="credential-value">${token}</div>
            </div>
            
            <div class="credential-item">
              <div class="credential-label">Password</div>
              <div class="credential-value">${password}</div>
            </div>
          </div>
          
          <div style="text-align: center;">
            <a href="${loginUrl}" class="button">Go to Voting Portal</a>
          </div>
          
          <div class="warning">
            <strong>⚠️ Important:</strong> Keep these credentials safe. You will need them to cast your vote. These credentials will expire after you vote.
          </div>
          
          <h3>How to Vote:</h3>
          <ol>
            <li>Visit the voting portal using the button above</li>
            <li>Enter your token and password</li>
            <li>Review the candidates carefully</li>
            <li>Cast your vote</li>
          </ol>
          
          <p>If you did not request this resend or have any questions, please contact the election administrator.</p>
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
    
    Your voting credentials for ${electionTitle} have been resent as requested.
    
    ELECTION PERIOD:
    Start: ${startDateFormatted}
    End: ${endDateFormatted}
    
    Your Login Credentials:
    Token: ${token}
    Password: ${password}
    
    Voting Portal: ${loginUrl}
    
    Keep these credentials safe. You will need them to cast your vote.
    These credentials will expire after you vote.
    
    How to Vote:
    1. Visit the voting portal
    2. Enter your token and password
    3. Review the candidates carefully
    4. Cast your vote
    
    If you did not request this resend or have any questions, please contact the election administrator.
  `;

  return sendEmail({
    to: email,
    subject: `Your Voting Credentials (Resent) - ${electionTitle}`,
    html,
    text,
  });
}

// POST /api/elections/voters/[id]/resend - Resend credentials
async function resendCredentials(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { id } = await params;

    // Optional: update phone before resending
    let updatedPhone: string | undefined;
    try {
      const body = await req.json();
      if (body?.phone) {
        updatedPhone = String(body.phone).trim();
      }
    } catch {
      // body is optional
    }

    // Find voter
    const voter = await Voter.findOne({
      _id: id,
      organizationId: decoded.id,
    });

    if (!voter) {
      return NextResponse.json(
        { error: 'Voter not found' },
        { status: 404 }
      );
    }

    // Check if voter has already voted
    if (voter.hasVoted) {
      return NextResponse.json(
        { error: 'Cannot resend credentials to a voter who has already voted' },
        { status: 400 }
      );
    }

    // Check if voter has email or phone
    if (!voter.email && !voter.phone) {
      return NextResponse.json(
        { error: 'Voter does not have an email address or phone number' },
        { status: 400 }
      );
    }

    // Get election details
    const election = await Election.findById(voter.electionId);
    if (!election) {
      return NextResponse.json(
        { error: 'Election not found' },
        { status: 404 }
      );
    }

    // Update phone if provided
    if (updatedPhone) {
      voter.phone = updatedPhone;
    }

    // Always generate a fresh password on resend — never store plaintext
    const plainPassword = generatePassword();
    const hashedPassword = await hashPassword(plainPassword);
    const updateFields: any = { password: hashedPassword };
    if (updatedPhone) updateFields.phone = updatedPhone;
    await Voter.findByIdAndUpdate(voter._id, updateFields);

    // Send credentials via email and/or SMS
    let emailSent = false;
    let smsSent = false;
    let errors: string[] = [];

    try {
      // Send email if available
      if (voter.email) {
        try {
          await sendVoterCredentials(
            voter.email,
            voter.name,
            voter.token,
            plainPassword,
            election.title,
            election.startDate,
            election.endDate
          );
          emailSent = true;
        } catch (emailError) {
          console.error('Failed to send email:', emailError);
          errors.push('Email failed to send');
        }
      }

      // Send SMS if available
      if (voter.phone) {
        try {
          const smsResult = await sendVoterCredentialsSms(
            voter.phone,
            voter.name,
            voter.token,
            plainPassword,
            election.title,
            election.startDate,
            election.endDate
          );
          if (smsResult) {
            smsSent = true;
          } else {
            errors.push('SMS failed to send');
          }
        } catch (smsError) {
          console.error('Failed to send SMS:', smsError);
          errors.push('SMS failed to send');
        }
      }

      // Check if at least one method succeeded
      if (emailSent || smsSent) {
        let message = 'Credentials resent successfully';
        if (emailSent && smsSent) {
          message += ' via email and SMS';
        } else if (emailSent) {
          message += ' via email';
        } else if (smsSent) {
          message += ' via SMS';
        }

        if (errors.length > 0) {
          message += ` (${errors.join(', ')})`;
        }

        return NextResponse.json({
          success: true,
          message,
          data: {
            emailSent,
            smsSent,
          },
        });
      } else {
        return NextResponse.json(
          { error: 'Failed to send credentials via any method. ' + errors.join(', ') },
          { status: 500 }
        );
      }
    } catch (error) {
      console.error('Failed to resend credentials:', error);
      return NextResponse.json(
        { error: 'Failed to resend credentials' },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Resend credentials error:', error);
    return NextResponse.json(
      { error: 'Failed to resend credentials', details: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}

export const POST = resendCredentials;
