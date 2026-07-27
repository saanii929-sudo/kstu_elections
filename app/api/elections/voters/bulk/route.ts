import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Voter from '@/models/Voter';
import Election from '@/models/Election';
import { verifyToken } from '@/lib/auth';
import { hashPassword } from '@/lib/auth';
import { sendEmail } from '@/lib/email';
import { sendVoterCredentialsSms } from '@/services/sms.service';

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

async function sendVoterCredentials(
  email: string,
  name: string,
  token: string,
  password: string,
  electionTitle: string,
  startDate: Date,
  endDate: Date
): Promise<boolean> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  const loginUrl = `${baseUrl}/election/login`;
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
        .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
        .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
        .info-box { background: #e0e7ff; border-left: 4px solid #6366f1; padding: 15px; margin: 20px 0; }
        .date-box { background: #dcfce7; border-left: 4px solid #16a34a; padding: 15px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🗳️ Your Voting Credentials</h1>
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
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${loginUrl}" class="button" style="color: white;">
              🗳️ Go to Voting Portal
            </a>
          </div>

          <div class="info-box">
            <strong>📍 Voting Portal URL:</strong><br>
            <a href="${loginUrl}" style="color: #6366f1; word-break: break-all;">${loginUrl}</a>
          </div>
          
          <div class="warning">
            <strong>⚠️ Important:</strong> Keep these credentials safe. You will need them to cast your vote.
          </div>
          
          <p><strong>How to Vote:</strong></p>
          <ol>
            <li>Visit the voting portal and enter your credentials</li>
            <li>Review the candidates and cast your vote</li>
            <li>Submit your ballot</li>
          </ol>
          
          <p style="margin-top: 30px;">If you have any questions, please contact the election organizers.</p>
          
          <p>Best regards,<br>Election Management Team</p>
        </div>
        <div class="footer">
          <p>This is an automated message. Please do not reply to this email.</p>
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
    
    Your Login Credentials:
    Token: ${token}
    Password: ${password}
    
    Voting Portal: ${loginUrl}
    
    Keep these credentials safe. You will need them to cast your vote.
    
    Best regards,
    Election Management Team
  `;

  try {
    return await sendEmail({
      to: email,
      subject: `Your Voting Credentials - ${electionTitle}`,
      html,
      text,
    });
  } catch (error) {
    console.error(`Failed to send email to ${email}:`, error);
    return false;
  }
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
    if (!decoded || decoded.role !== 'organization') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { electionId, voters, deliveryMethod = 'both' } = body;

    if (!electionId || !voters || !Array.isArray(voters) || voters.length === 0) {
      return NextResponse.json(
        { error: 'Election ID and voters array are required' },
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
        { error: 'Cannot upload voters. This election has already ended.' },
        { status: 400 }
      );
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
        password: string;
        email?: string;
        phone?: string;
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

        if (voterData.voterId) {
          const vidStr = String(voterData.voterId).trim();
          if (existingVoterIds.has(vidStr) || batchVoterIds.has(vidStr)) {
            results.failed.push({
              row: i + 1,
              data: voterData,
              error: `Voter ID ${vidStr} is already registered in this election`,
            });
            continue;
          }
          batchVoterIds.add(vidStr);
        }

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
          let phoneStr = String(voterData.phone).trim();
          
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
        const password = generatePassword();
        const hashedPassword = await hashPassword(password);

        votersToCreate.push({
          electionId,
          organizationId: decoded.id,
          name: voterData.name,
          email: voterData.email || null,
          phone: phoneNumber,
          voterId: voterData.voterId || null,
          token: voterToken,
          password: hashedPassword,
          metadata: {
            department: voterData.department || null,
            class: voterData.class || null,
            studentId: voterData.studentId || null,
            ...voterData.metadata,
          },
          status: 'active',
          hasVoted: false,
        });

        results.success.push({
          row: i + 1,
          name: voterData.name,
          token: voterToken,
          password: password,
          email: voterData.email,
          phone: phoneNumber || undefined,
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
              errorMsg = `Voter ID ${failedVoter.voterId} is already registered in this election`;
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
    let emailsSent = 0;
    let emailsFailed = 0;
    let smsSent = 0;
    let smsFailed = 0;
    
    if (results.success.length > 0) {
      for (const voter of results.success) {
        if (voter.email && (deliveryMethod === 'email' || deliveryMethod === 'both')) {
          try {
            const emailSent = await sendVoterCredentials(
              voter.email,
              voter.name,
              voter.token,
              voter.password,
              election.title,
              election.startDate,
              election.endDate
            );
            
            if (emailSent) {
              emailsSent++;
            } else {
              emailsFailed++;
            }
          } catch (emailError) {
            console.error(`Failed to send email to ${voter.email}:`, emailError);
            emailsFailed++;
          }
        }

        if (voter.phone && (deliveryMethod === 'sms' || deliveryMethod === 'both')) {
          try {
            const smsSentSuccess = await sendVoterCredentialsSms(
              voter.phone,
              voter.name,
              voter.token,
              voter.password,
              election.title,
              election.startDate,
              election.endDate
            );
            
            if (smsSentSuccess) {
              smsSent++;
            } else {
              smsFailed++;
            }
          } catch (smsError) {
            console.error(`Failed to send SMS to ${voter.phone}:`, smsError);
            smsFailed++;
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully added ${results.success.length} voters. Emails: ${emailsSent} sent${emailsFailed > 0 ? `, ${emailsFailed} failed` : ''}. SMS: ${smsSent} sent${smsFailed > 0 ? `, ${smsFailed} failed` : ''}`,
      data: {
        total: voters.length,
        successful: results.success.length,
        failed: results.failed.length,
        emailsSent,
        emailsFailed,
        smsSent,
        smsFailed,
        voters: results.success,
        errors: results.failed,
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
