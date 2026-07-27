import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      transferId,
      referenceId,
      organizationName,
      awardName,
      amount,
      recipientName,
      transferType,
      recipientDetails,
    } = body;

    // Create transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.SMTP_USERNAME || process.env.EMAIL_USER,
        pass: process.env.SMTP_PASSWORD || process.env.EMAIL_PASSWORD,
      },
    });

    const approveUrl = `${process.env.NEXT_PUBLIC_API_URL}/admin/transfers/${transferId}/approve`;
    const rejectUrl = `${process.env.NEXT_PUBLIC_API_URL}/admin/transfers/${transferId}/reject`;

    // Email content
    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.EMAIL_USER,
      to: 'pawavotes@gmail.com',
      subject: `🔔 New Transfer Request - ${referenceId}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #16a34a; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
            .info-box { background: white; padding: 20px; margin: 15px 0; border-radius: 8px; border-left: 4px solid #16a34a; }
            .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
            .info-label { font-weight: bold; color: #6b7280; }
            .info-value { color: #111827; }
            .amount { font-size: 24px; font-weight: bold; color: #16a34a; text-align: center; margin: 20px 0; }
            .button-container { text-align: center; margin: 30px 0; }
            .button { display: inline-block; padding: 12px 30px; margin: 0 10px; text-decoration: none; border-radius: 6px; font-weight: bold; }
            .approve-btn { background: #16a34a; color: white; }
            .reject-btn { background: #dc2626; color: white; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">🔔 New Transfer Request</h1>
              <p style="margin: 5px 0 0 0;">Action Required</p>
            </div>
            
            <div class="content">
              <p>Hello Admin,</p>
              <p>A new transfer request has been submitted and requires your approval.</p>
              
              <div class="amount">GHS ${amount.toFixed(2)}</div>
              
              <div class="info-box">
                <h3 style="margin-top: 0; color: #16a34a;">Transfer Details</h3>
                <div class="info-row">
                  <span class="info-label">Reference ID:</span>
                  <span class="info-value">${referenceId}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Organization:</span>
                  <span class="info-value">${organizationName}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Award:</span>
                  <span class="info-value">${awardName}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Amount:</span>
                  <span class="info-value">GHS ${amount.toFixed(2)}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Transfer Type:</span>
                  <span class="info-value">${transferType === 'bank' ? 'Bank Transfer' : 'Mobile Money'}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Recipient Name:</span>
                  <span class="info-value">${recipientName}</span>
                </div>
                <div class="info-row" style="border-bottom: none;">
                  <span class="info-label">Recipient Details:</span>
                  <span class="info-value">${recipientDetails}</span>
                </div>
              </div>
              
              <div class="button-container">
                <a href="${approveUrl}" class="button approve-btn">✓ Approve Transfer</a>
                <a href="${rejectUrl}" class="button reject-btn">✗ Reject Transfer</a>
              </div>
              
              <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px;">
                <strong>Note:</strong> Please review the transfer details carefully before approving. 
                Once approved, the funds will be transferred via Hubtel to the recipient's account.
              </p>
            </div>
            
            <div class="footer">
              <p>This is an automated notification from PawaVotes Transfer Management System</p>
              <p>© ${new Date().getFullYear()} PawaVotes. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    await transporter.sendMail(mailOptions);

    return NextResponse.json({
      success: true,
      message: 'Email notification sent successfully',
    });
  } catch (error: any) {
    console.error('Email sending error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send email', details: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}
