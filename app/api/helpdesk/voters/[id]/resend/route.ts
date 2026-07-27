import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Voter from '@/models/Voter';
import Election from '@/models/Election';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';

const JWT_SECRET = process.env.JWT_SECRET!;

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(date));
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    if (!decoded.assignedElections || decoded.assignedElections.length === 0) {
      return NextResponse.json({ error: 'No elections assigned' }, { status: 403 });
    }

    await dbConnect();

    const { id } = await params;

    const voter = await Voter.findById(id).populate('electionId');

    if (!voter) {
      return NextResponse.json({ error: 'Voter not found' }, { status: 404 });
    }

    // Check if voter belongs to assigned elections
    if (!decoded.assignedElections.includes(voter.electionId.toString())) {
      return NextResponse.json({ error: 'Access denied to this voter' }, { status: 403 });
    }

    if (voter.hasVoted) {
      return NextResponse.json(
        { error: 'Cannot resend credentials to voters who have already voted' },
        { status: 400 }
      );
    }

    const plainPassword = voter.metadata?.plainPassword;

    if (!plainPassword) {
      return NextResponse.json(
        { error: 'Original password not available' },
        { status: 400 }
      );
    }

    const election = voter.electionId as any;
    const startDate = formatDate(election.startDate);
    const endDate = formatDate(election.endDate);

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
          .credentials { background: white; border: 2px solid #16a34a; border-radius: 8px; padding: 20px; margin: 20px 0; }
          .credential-item { margin: 15px 0; }
          .credential-label { font-weight: bold; color: #666; font-size: 14px; }
          .credential-value { font-size: 18px; color: #16a34a; font-weight: bold; font-family: monospace; }
          .dates-box { background: #dcfce7; border: 2px solid #16a34a; border-radius: 8px; padding: 15px; margin: 20px 0; }
          .date-item { margin: 10px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Your Voting Credentials (Resent)</h1>
            <p>${election.title}</p>
          </div>
          <div class="content">
            <p>Hello <strong>${voter.name}</strong>,</p>
            <p>Your voting credentials have been resent as requested by our help desk team.</p>
            
            <div class="dates-box">
              <div class="date-item">
                <strong>📅 Voting Starts:</strong><br/>
                ${startDate}
              </div>
              <div class="date-item">
                <strong>📅 Voting Ends:</strong><br/>
                ${endDate}
              </div>
            </div>

            <div class="credentials">
              <div class="credential-item">
                <div class="credential-label">Voter ID:</div>
                <div class="credential-value">${voter.voterId}</div>
              </div>
              <div class="credential-item">
                <div class="credential-label">Password:</div>
                <div class="credential-value">${plainPassword}</div>
              </div>
            </div>

            <p><strong>Important:</strong></p>
            <ul>
              <li>Keep these credentials secure</li>
              <li>You can only vote once</li>
              <li>Contact help desk if you need assistance</li>
            </ul>

            <div class="footer">
              <p>This is an automated message. Please do not reply to this email.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: voter.email,
      subject: `Voting Credentials Resent - ${election.title}`,
      html: emailHtml,
    });

    return NextResponse.json({
      success: true,
      message: 'Credentials resent successfully',
    });
  } catch (error) {
    console.error('Resend credentials error:', error);
    return NextResponse.json(
      { error: 'Failed to resend credentials' },
      { status: 500 }
    );
  }
}
