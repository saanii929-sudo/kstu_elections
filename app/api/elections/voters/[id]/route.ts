import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Voter from '@/models/Voter';
import Election from '@/models/Election';
import { verifyToken } from '@/lib/auth';
import { sendEmail } from '@/lib/email';

// Send voter credentials via email
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
          <h1>🗳️ Your Voting Credentials</h1>
        </div>
        <div class="content">
          <h2>Hello ${name},</h2>
          <p>Your voter information has been updated for <strong>${electionTitle}</strong>.</p>
          
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
    
    Your voter information has been updated for ${electionTitle}.
    
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

// PUT update voter
export async function PUT(
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
    if (!decoded || decoded.role !== 'organization') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { name, email, phone, voterId, metadata, status } = body;

    // Verify voter belongs to organization
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

    // Update voter
    const updateData: any = {};
    if (name) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (phone !== undefined) updateData.phone = phone;
    if (voterId !== undefined) updateData.voterId = voterId;
    if (status) updateData.status = status;
    
    // Merge metadata instead of replacing it to preserve plainPassword
    if (metadata) {
      updateData.metadata = {
        ...voter.metadata,
        ...metadata,
      };
    }

    const updatedVoter = await Voter.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    // If email was updated and voter hasn't voted, send credentials
    if (email && email !== voter.email && !voter.hasVoted && updatedVoter?.metadata?.plainPassword) {
      try {
        const election = await Election.findById(voter.electionId);
        if (election) {
          await sendVoterCredentials(
            email,
            updatedVoter.name,
            updatedVoter.token,
            updatedVoter.metadata.plainPassword,
            election.title,
            election.startDate,
            election.endDate
          );
        }
      } catch (emailError) {
        console.error('Failed to send email after update:', emailError);
        // Don't fail the update if email fails
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Voter updated successfully',
      data: updatedVoter,
    });
  } catch (error: any) {
    console.error('Update voter error:', error);
    
    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0];
      if (field === 'email') {
        return NextResponse.json(
          { error: 'This email address is already registered for this election' },
          { status: 400 }
        );
      } else if (field === 'phone') {
        return NextResponse.json(
          { error: 'This phone number is already registered for this election' },
          { status: 400 }
        );
      }
    }
    
    return NextResponse.json(
      { error: 'Failed to update voter', details: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}

// DELETE voter
export async function DELETE(
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
    if (!decoded || decoded.role !== 'organization') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Verify voter belongs to organization
    const voter = await Voter.findOneAndDelete({
      _id: id,
      organizationId: decoded.id,
    });

    if (!voter) {
      return NextResponse.json(
        { error: 'Voter not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Voter deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete voter error:', error);
    return NextResponse.json(
      { error: 'Failed to delete voter', details: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}
