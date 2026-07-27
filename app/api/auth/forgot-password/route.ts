import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Organization from '@/models/Organization';
import OrganizationAdmin from '@/models/OrganizationAdmin';
import Admin from '@/models/Admin';
import crypto from 'crypto';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  try {
    // Rate limit: 3 reset requests per 15 minutes per IP
    const ip = getClientIp(req.headers);
    const rl = checkRateLimit(`forgot-pw:${ip}`, 3, 15 * 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: `Too many requests. Try again in ${rl.resetIn} seconds.` },
        { status: 429 }
      );
    }

    await connectDB();

    const body = await req.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    let user = await Organization.findOne({ email: email.toLowerCase() });
    let userType = 'organization';

    if (!user) {
      user = await OrganizationAdmin.findOne({ email: email.toLowerCase() });
      userType = 'org-admin';
    }

    if (!user) {
      user = await Admin.findOne({ email: email.toLowerCase() });
      userType = 'admin';
    }

    if (!user) {
      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, a reset link has been sent.',
      });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

    user.resetPasswordToken = resetToken;
    user.resetPasswordExpiry = resetTokenExpiry;
    await user.save();

    const resetUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;

    try {
      const nodemailer = require('nodemailer');
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '465'),
        secure: true,
        auth: {
          user: process.env.SMTP_USERNAME,
          pass: process.env.SMTP_PASSWORD,
        },
      });
      await transporter.sendMail({
        from: process.env.SMTP_FROM,
        to: email,
        subject: 'Password Reset Request - PawaVotes',
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #16a34a; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
              .content { background-color: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
              .button { display: inline-block; background-color: #16a34a; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; margin: 20px 0; }
              .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
              .warning { background-color: #fef3c7; padding: 10px; border-radius: 4px; margin: 15px 0; border-left: 4px solid #f59e0b; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Password Reset Request</h1>
              </div>
              <div class="content">
                <p>Hello,</p>
                <p>You requested to reset your password for your PawaVotes account.</p>
                
                <div class="warning">
                  <strong>⚠️ Important:</strong> This link will expire in 1 hour.
                </div>
                
                <p>Click the button below to reset your password:</p>
                
                <div style="text-align: center;">
                  <a href="${resetUrl}" class="button">Reset Password</a>
                </div>
                
                <p style="font-size: 12px; color: #6b7280;">Or copy and paste this link into your browser:<br>
                <a href="${resetUrl}" style="color: #16a34a; word-break: break-all;">${resetUrl}</a></p>
                
                <p style="margin-top: 30px;">If you didn't request this password reset, please ignore this email. Your password will remain unchanged.</p>
              </div>
              <div class="footer">
                <p>This is an automated email from PawaVotes. Please do not reply to this email.</p>
                <p>&copy; ${new Date().getFullYear()} PawaVotes. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `,
        text: `
Password Reset Request

You requested to reset your password for your PawaVotes account.

This link will expire in 1 hour.

To reset your password, visit: ${resetUrl}

If you didn't request this password reset, please ignore this email.

---
This is an automated email from PawaVotes.
        `.trim(),
      });
    } catch (emailError: any) {
    }

    return NextResponse.json({
      success: true,
      message: 'If an account exists with this email, a reset link has been sent.',
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}
