import nodemailer from 'nodemailer';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '465'),
      secure: true,
      auth: {
        user: process.env.SMTP_USERNAME,
        pass: process.env.SMTP_PASSWORD,
      },
      // nodemailer's defaults are 2 minutes each — if the SMTP host is
      // unreachable (network egress blocked, wrong host, etc.) that stalls
      // whatever request triggered the email for up to 2 minutes per
      // attempt. Fail fast instead.
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000,
    });

    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });
    return true;
  } catch (error: any) {
    console.error('sendEmail failed:', error?.message || error);
    return false;
  }
}

export async function sendNomineeApprovalEmail(
  email: string,
  name: string,
  nomineeCode: string,
  awardName: string
): Promise<boolean> {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .code-box { background: white; border: 2px solid #16a34a; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px; }
        .code { font-size: 32px; font-weight: bold; color: #dc2626; letter-spacing: 2px; }
        .button { display: inline-block; background: #16a34a; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 Congratulations!</h1>
        </div>
        <div class="content">
          <h2>Dear ${name},</h2>
          <p>We are thrilled to inform you that your nomination for <strong>${awardName}</strong> has been approved!</p>
          
          <div class="code-box">
            <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 14px;">Your Nominee Code</p>
            <div class="code">${nomineeCode}</div>
          </div>
          
          <p>Your nominee code is your unique identifier for this award program. Please keep it safe as you may need it for future reference.</p>
          
          <p><strong>What's Next?</strong></p>
          <ul>
            <li>Your profile is now live and visible to voters</li>
            <li>Share your nomination with friends and family</li>
            <li>Encourage supporters to vote for you</li>
          </ul>
          
          <p>We wish you the very best of luck in the competition!</p>
          
          <p>Best regards,<br>The Awards Team</p>
        </div>
        <div class="footer">
          <p>This is an automated message. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
    Congratulations ${name}!
    
    Your nomination for ${awardName} has been approved.
    
    Your Nominee Code: ${nomineeCode}
    
    Your profile is now live and visible to voters. Share your nomination with friends and family and encourage them to vote for you.
    
    Best of luck!
    The Awards Team
  `;

  return sendEmail({
    to: email,
    subject: `🎉 Nomination Approved - ${awardName}`,
    html,
    text,
  });
}

// Generate a random password
export function generateRandomPassword(length: number = 12): string {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return password;
}

// Generate a random invitation token
export function generateInvitationToken(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Send invitation email to admin
export async function sendInvitationEmail(
  email: string,
  name: string,
  organizationName: string,
  invitationLink: string,
  temporaryPassword: string
): Promise<boolean> {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .info-box { background: white; border-left: 4px solid #16a34a; padding: 15px; margin: 20px 0; }
        .button { display: inline-block; background: #16a34a; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
        .password { font-family: monospace; font-size: 18px; font-weight: bold; color: #dc2626; background: #fee; padding: 10px; border-radius: 4px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Welcome to ${organizationName}!</h1>
        </div>
        <div class="content">
          <h2>Hello ${name},</h2>
          <p>You have been invited to join <strong>${organizationName}</strong> as an administrator.</p>
          
          <div class="info-box">
            <p><strong>Your Login Credentials:</strong></p>
            <p>Email: <strong>${email}</strong></p>
            <p>Temporary Password: <span class="password">${temporaryPassword}</span></p>
          </div>
          
          <p>Please click the button below to accept your invitation and set up your account:</p>
          
          <div style="text-align: center;">
            <a href="${invitationLink}" class="button">Accept Invitation</a>
          </div>
          
          <p><strong>Important:</strong> This invitation link will expire in 7 days. For security reasons, please change your password after your first login.</p>
          
          <p>If you did not expect this invitation, please ignore this email.</p>
          
          <p>Best regards,<br>${organizationName} Team</p>
        </div>
        <div class="footer">
          <p>This is an automated message. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
    Welcome to ${organizationName}!
    
    Hello ${name},
    
    You have been invited to join ${organizationName} as an administrator.
    
    Your Login Credentials:
    Email: ${email}
    Temporary Password: ${temporaryPassword}
    
    Please visit the following link to accept your invitation:
    ${invitationLink}
    
    This invitation link will expire in 7 days. For security reasons, please change your password after your first login.
    
    If you did not expect this invitation, please ignore this email.
    
    Best regards,
    ${organizationName} Team
  `;

  return sendEmail({
    to: email,
    subject: `Invitation to join ${organizationName}`,
    html,
    text,
  });
}

/* ─────────────── Ticket purchase confirmation (congratulatory, no ticket cards) ─────────────── */
export async function sendTicketConfirmationEmail(data: {
  buyerName: string;
  buyerEmail: string;
  eventTitle: string;
  ticketTypeName: string;
  ticketTypeColor: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  ticketCodes: string[];
  eventDate: string;
  eventTime: string;
  venueName: string;
  venueAddress: string;
  reference: string;
}): Promise<boolean> {
  const appName = process.env.APP_NAME || 'Pawavotes';
  const appUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  const logoUrl = `${appUrl}/images/logo.png`;
  const downloadUrl = `${appUrl}/ticket-download?ref=${data.reference}`;
  const accentColor = data.ticketTypeColor || '#16a34a';

  const shortDate = data.eventDate
    ? new Date(data.eventDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : '';
  const formattedDate = data.eventDate
    ? new Date(data.eventDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    : '';

  const html = `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <title>Booking Confirmed — ${data.eventTitle}</title>
</head>
<body style="margin:0;padding:0;background:#f0f2f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">

  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">
    Your booking for ${data.eventTitle} is confirmed! Access your tickets on Pawavotes.
  </div>

  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f0f2f5;padding:40px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;">

        <!-- Brand pill -->
        <tr>
          <td style="padding-bottom:28px;text-align:center;">
            <table cellpadding="0" cellspacing="0" border="0" align="center"
                   style="background:${accentColor};border-radius:50px;padding:10px 22px;display:inline-table;">
              <tr>
                <td style="padding-right:10px;vertical-align:middle;">
                  <img src="${logoUrl}" width="28" height="28" style="display:block;border-radius:7px;" alt="${appName}" />
                </td>
                <td style="vertical-align:middle;color:#fff;font-size:13px;font-weight:700;letter-spacing:0.3px;">${appName} Ticketing</td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Hero card -->
        <tr>
          <td>
            <table width="100%" cellpadding="0" cellspacing="0" border="0"
                   style="background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

              <!-- Gradient header -->
              <tr>
                <td style="background:linear-gradient(135deg,${accentColor} 0%,${accentColor}bb 100%);padding:36px 36px 32px;">
                  <div style="font-size:12px;color:rgba(255,255,255,0.75);font-weight:700;letter-spacing:2.5px;text-transform:uppercase;margin-bottom:8px;">
                    Booking Confirmed ✓
                  </div>
                  <div style="font-size:28px;font-weight:800;color:#fff;line-height:1.2;letter-spacing:-0.5px;margin-bottom:6px;">
                    You're all set, ${data.buyerName.split(' ')[0]}! 🎉
                  </div>
                  <div style="font-size:14px;color:rgba(255,255,255,0.8);">
                    ${data.quantity} × ${data.ticketTypeName} ticket${data.quantity > 1 ? 's' : ''} secured for
                    <strong style="color:#fff;">${data.eventTitle}</strong>
                  </div>
                </td>
              </tr>

              <!-- Event summary strip -->
              <tr>
                <td style="padding:24px 36px;border-bottom:1px solid #f3f4f6;">
                  <table width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      ${shortDate ? `<td style="padding-right:20px;border-right:1px solid #f3f4f6;">
                        <div style="font-size:10px;color:#9ca3af;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:4px;">DATE</div>
                        <div style="font-size:14px;font-weight:700;color:#111827;">${shortDate}</div>
                        ${data.eventTime ? `<div style="font-size:12px;color:#6b7280;margin-top:2px;">${data.eventTime}</div>` : ''}
                      </td>` : ''}
                      ${data.venueName ? `<td style="padding-left:20px;padding-right:20px;border-right:1px solid #f3f4f6;">
                        <div style="font-size:10px;color:#9ca3af;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:4px;">VENUE</div>
                        <div style="font-size:14px;font-weight:700;color:#111827;">${data.venueName}</div>
                        ${data.venueAddress ? `<div style="font-size:11px;color:#6b7280;margin-top:2px;">${data.venueAddress}</div>` : ''}
                      </td>` : ''}
                      <td style="padding-left:20px;text-align:right;">
                        <div style="font-size:10px;color:#9ca3af;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:4px;">TOTAL</div>
                        <div style="font-size:22px;font-weight:800;color:${accentColor};">
                          ${data.totalAmount === 0 ? 'FREE' : `GHS ${data.totalAmount.toFixed(2)}`}
                        </div>
                        <div style="font-size:10px;color:#9ca3af;margin-top:2px;">${data.quantity} ticket${data.quantity > 1 ? 's' : ''}</div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- CTA -->
              <tr>
                <td style="padding:28px 36px;text-align:center;">
                  <div style="font-size:15px;color:#374151;margin-bottom:20px;line-height:1.6;">
                    Your tickets are ready and waiting for you. Click below to view, download, or share them — right from your browser.
                  </div>
                  <a href="${downloadUrl}"
                     style="display:inline-block;background:${accentColor};color:#fff;font-size:15px;font-weight:700;
                            padding:16px 40px;border-radius:50px;text-decoration:none;letter-spacing:0.3px;
                            box-shadow:0 6px 20px ${accentColor}50;">
                    View &amp; Download My Tickets →
                  </a>
                  <div style="margin-top:12px;font-size:12px;color:#9ca3af;">
                    Save as image, print as PDF, or share individually
                  </div>
                </td>
              </tr>

              <!-- Ref row -->
              <tr>
                <td style="padding:16px 36px;background:#f9fafb;border-top:1px solid #f3f4f6;">
                  <table width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td style="font-size:12px;color:#9ca3af;">Order Reference</td>
                      <td style="text-align:right;font-family:monospace;font-size:12px;font-weight:700;color:#374151;">${data.reference}</td>
                    </tr>
                  </table>
                </td>
              </tr>

            </table>
          </td>
        </tr>

        <!-- Quick tips -->
        <tr>
          <td style="padding:24px 0 0;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0"
                   style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.05);">
              <tr>
                <td style="padding:16px 24px;border-bottom:1px solid #f9fafb;">
                  <span style="font-size:11px;font-weight:700;color:#6b7280;letter-spacing:2px;text-transform:uppercase;">Good to know</span>
                </td>
              </tr>
              <tr>
                <td style="padding:16px 24px;">
                  <table cellpadding="0" cellspacing="6" border="0">
                    <tr><td style="font-size:13px;color:#374151;padding-bottom:8px;">🎟️ &nbsp;Each ticket code is valid for <strong>one entry only</strong></td></tr>
                    <tr><td style="font-size:13px;color:#374151;padding-bottom:8px;">🔗 &nbsp;You can share individual tickets from the ticket download page</td></tr>
                    <tr><td style="font-size:13px;color:#374151;padding-bottom:8px;">🪪 &nbsp;Bring a valid ID matching the name on your booking</td></tr>
                    <tr><td style="font-size:13px;color:#374151;">📩 &nbsp;Keep this email — your order ref is <strong style="font-family:monospace;">${data.reference}</strong></td></tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="text-align:center;padding:28px 0 8px;">
            <img src="${logoUrl}" width="22" height="22" style="display:inline-block;border-radius:6px;opacity:0.4;vertical-align:middle;margin-right:6px;" alt="${appName}" />
            <span style="font-size:13px;font-weight:600;color:#c4c9d4;vertical-align:middle;">${appName}</span>
            <div style="margin-top:6px;font-size:11px;color:#d1d5db;">
              Questions? <a href="${appUrl}" style="color:${accentColor};text-decoration:none;font-weight:600;">${appUrl}</a>
            </div>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = `${appName} — Booking Confirmed!

Hi ${data.buyerName},

You're all set! Your booking for ${data.eventTitle} is confirmed.

${shortDate ? `Date: ${formattedDate}${data.eventTime ? ` at ${data.eventTime}` : ''}` : ''}
${data.venueName ? `Venue: ${data.venueName}${data.venueAddress ? `, ${data.venueAddress}` : ''}` : ''}
Ticket type: ${data.ticketTypeName}
Quantity: ${data.quantity}
Total: ${data.totalAmount === 0 ? 'Free' : `GHS ${data.totalAmount.toFixed(2)}`}
Order ref: ${data.reference}

View, download, or share your tickets:
${downloadUrl}

${appName} · ${appUrl}
`;

  return sendEmail({
    to: data.buyerEmail,
    subject: `🎉 Booking confirmed — ${data.eventTitle}${shortDate ? ` · ${shortDate}` : ''}`,
    html,
    text,
  });
}

/* ─────────────── Shared ticket email (single ticket card to recipient) ─────────────── */
export async function sendSharedTicketEmail(data: {
  recipientEmail: string;
  senderName: string;
  ticketCode: string;
  eventTitle: string;
  ticketTypeName: string;
  ticketTypeColor: string;
  ticketBg?: string;
  ticketTextColor?: 'light' | 'dark';
  unitPrice: number;
  eventDate?: string;
  eventTime?: string;
  venueName?: string;
  venueAddress?: string;
  reference: string;
}): Promise<boolean> {
  const appName = process.env.APP_NAME || 'Pawavotes';
  const appUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  const logoUrl = `${appUrl}/images/logo.png`;
  const accentColor = data.ticketTypeColor || '#16a34a';
  const hasBg = !!data.ticketBg;
  const isLight = !hasBg || data.ticketTextColor !== 'dark';
  const textColor = hasBg ? (isLight ? '#ffffff' : '#111827') : '#111827';
  const subColor = hasBg ? (isLight ? 'rgba(255,255,255,0.75)' : 'rgba(0,0,0,0.55)') : '#9ca3af';
  const overlayBg = hasBg ? (isLight ? 'rgba(0,0,0,0.48)' : 'rgba(255,255,255,0.55)') : 'transparent';
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=130x130&data=${encodeURIComponent(data.ticketCode)}&bgcolor=ffffff&color=111827&margin=6`;

  const shortDate = data.eventDate
    ? new Date(data.eventDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : '';

  const html = `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <title>Your ticket for ${data.eventTitle}</title>
</head>
<body style="margin:0;padding:0;background:#f0f2f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">

  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">
    ${data.senderName} sent you a ticket for ${data.eventTitle}! Here's your entry code.
  </div>

  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f0f2f5;padding:40px 16px;">
    <tr><td align="center">
      <table width="540" cellpadding="0" cellspacing="0" border="0" style="max-width:540px;width:100%;">

        <!-- Brand -->
        <tr>
          <td style="padding-bottom:24px;text-align:center;">
            <table cellpadding="0" cellspacing="0" border="0" align="center"
                   style="background:${accentColor};border-radius:50px;padding:9px 20px;display:inline-table;">
              <tr>
                <td style="padding-right:9px;vertical-align:middle;">
                  <img src="${logoUrl}" width="26" height="26" style="display:block;border-radius:7px;" alt="${appName}" />
                </td>
                <td style="vertical-align:middle;color:#fff;font-size:12px;font-weight:700;">${appName} Ticketing</td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Sender notice -->
        <tr>
          <td style="padding-bottom:16px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0"
                   style="background:#fff;border-radius:14px;padding:16px 24px;box-shadow:0 2px 8px rgba(0,0,0,0.05);">
              <tr>
                <td style="font-size:14px;color:#374151;">
                  👋 &nbsp;<strong>${data.senderName}</strong> sent you a ticket to
                  <strong>${data.eventTitle}</strong>!
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Ticket card -->
        <tr>
          <td>
            <table width="100%" cellpadding="0" cellspacing="0" border="0"
                   style="border-radius:20px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.12);${hasBg ? `background-image:url('${data.ticketBg}');background-size:cover;background-position:center;` : ''}">
              <tr>
                ${!hasBg ? `<td width="8" style="background:${accentColor};"></td>` : ''}
                <td style="${hasBg ? `background:${overlayBg};` : 'background:#fff;'}padding:0;">

                  <table width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <!-- Info -->
                      <td style="padding:24px 20px 20px 24px;vertical-align:top;">

                        <!-- Brand row -->
                        <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:14px;">
                          <tr>
                            <td style="padding-right:8px;vertical-align:middle;">
                              <img src="${logoUrl}" width="24" height="24" style="border-radius:6px;display:block;" alt="${appName}" />
                            </td>
                            <td style="vertical-align:middle;font-size:9px;font-weight:700;color:${subColor};letter-spacing:2px;text-transform:uppercase;">${appName} · E-TICKET</td>
                            <td style="padding-left:10px;vertical-align:middle;">
                              <span style="background:${accentColor};color:#fff;font-size:8px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;padding:3px 8px;border-radius:20px;">${data.ticketTypeName}</span>
                            </td>
                          </tr>
                        </table>

                        <div style="font-size:17px;font-weight:800;color:${textColor};line-height:1.3;margin-bottom:14px;">${data.eventTitle}</div>

                        <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:8px;">
                          <tr>
                            ${shortDate ? `<td style="padding-right:16px;">
                              <div style="font-size:9px;color:${subColor};font-weight:700;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:2px;">DATE</div>
                              <div style="font-size:12px;font-weight:700;color:${textColor};">${shortDate}</div>
                            </td>` : ''}
                            ${data.eventTime ? `<td style="padding-right:16px;">
                              <div style="font-size:9px;color:${subColor};font-weight:700;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:2px;">TIME</div>
                              <div style="font-size:12px;font-weight:700;color:${textColor};">${data.eventTime}</div>
                            </td>` : ''}
                            <td>
                              <div style="font-size:9px;color:${subColor};font-weight:700;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:2px;">PRICE</div>
                              <div style="font-size:12px;font-weight:700;color:${hasBg ? textColor : accentColor};">${data.unitPrice === 0 ? 'FREE' : `GHS ${data.unitPrice.toFixed(2)}`}</div>
                            </td>
                          </tr>
                        </table>

                        ${data.venueName ? `<div style="font-size:11px;color:${subColor};margin-top:6px;">📍 ${data.venueName}${data.venueAddress ? ` · ${data.venueAddress}` : ''}</div>` : ''}

                      </td>

                      <!-- Dashed divider -->
                      <td width="1" style="background:repeating-linear-gradient(to bottom,${hasBg ? (isLight ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.15)') : '#e5e7eb'} 0,${hasBg ? (isLight ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.15)') : '#e5e7eb'} 6px,transparent 6px,transparent 12px);margin:12px 0;"></td>

                      <!-- QR — always white bg for scanability -->
                      <td width="150" style="padding:20px 18px;text-align:center;vertical-align:middle;background:#ffffff;">
                        <img src="${qrUrl}" width="130" height="130"
                             style="display:block;margin:0 auto 8px;border-radius:10px;border:1px solid #f0f0f0;" alt="QR" />
                        <div style="font-size:8px;color:#9ca3af;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;">SCAN AT DOOR</div>
                      </td>
                    </tr>
                  </table>

                  <!-- Perforated cut line -->
                  <table width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td width="14" style="padding:0;"><div style="width:14px;height:14px;background:#f0f2f5;border-radius:50%;margin-left:-7px;"></div></td>
                      <td style="padding:0 4px;"><div style="border-top:2px dashed ${hasBg ? (isLight ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.15)') : '#e5e7eb'};width:100%;"></div></td>
                      <td width="14" style="padding:0;"><div style="width:14px;height:14px;background:#f0f2f5;border-radius:50%;margin-right:-7px;"></div></td>
                    </tr>
                  </table>

                  <!-- Stub -->
                  <table width="100%" cellpadding="0" cellspacing="0" border="0"
                         style="${hasBg ? `background:${isLight ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.35)'};` : 'background:#fafafa;'}">
                    <tr>
                      <td style="padding:12px 24px;">
                        <table width="100%" cellpadding="0" cellspacing="0" border="0">
                          <tr>
                            <td>
                              <div style="font-size:9px;color:${subColor};letter-spacing:0.1em;text-transform:uppercase;margin-bottom:3px;">TICKET CODE</div>
                              <div style="font-family:monospace;font-size:14px;font-weight:800;color:${textColor};letter-spacing:2px;">${data.ticketCode}</div>
                            </td>
                            <td style="text-align:right;">
                              <div style="font-size:9px;color:${subColor};letter-spacing:0.1em;text-transform:uppercase;margin-bottom:3px;">ORDER REF</div>
                              <div style="font-family:monospace;font-size:10px;color:${subColor};">${data.reference}</div>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>

                </td>
                ${!hasBg ? `<td width="8" style="background:${accentColor};opacity:0.12;"></td>` : ''}
              </tr>
            </table>
          </td>
        </tr>

        <!-- Info -->
        <tr>
          <td style="padding-top:20px;">
            <table width="100%" cellpadding="0" cellspacing="0" border="0"
                   style="background:#fff;border-radius:14px;padding:16px 24px;box-shadow:0 2px 8px rgba(0,0,0,0.05);">
              <tr>
                <td>
                  <table cellpadding="0" cellspacing="5" border="0">
                    <tr><td style="font-size:13px;color:#374151;padding-bottom:6px;">✅ &nbsp;Present this QR code or ticket code at the entrance</td></tr>
                    <tr><td style="font-size:13px;color:#374151;padding-bottom:6px;">🪪 &nbsp;Bring a valid photo ID on the day</td></tr>
                    <tr><td style="font-size:13px;color:#374151;">📱 &nbsp;Screenshot this email as a backup</td></tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="text-align:center;padding:24px 0 8px;">
            <img src="${logoUrl}" width="20" height="20" style="display:inline-block;border-radius:5px;opacity:0.4;vertical-align:middle;margin-right:6px;" alt="${appName}" />
            <span style="font-size:12px;font-weight:600;color:#c4c9d4;vertical-align:middle;">${appName}</span>
            <div style="margin-top:4px;font-size:10px;color:#d1d5db;">
              <a href="${appUrl}" style="color:${accentColor};text-decoration:none;">${appUrl}</a>
            </div>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return sendEmail({
    to: data.recipientEmail,
    subject: `🎟️ Your ticket for ${data.eventTitle}${shortDate ? ` · ${shortDate}` : ''} — from ${data.senderName}`,
    html,
    text: `${data.senderName} sent you a ticket for ${data.eventTitle}!\n\nTicket Code: ${data.ticketCode}\n${shortDate ? `Date: ${shortDate}${data.eventTime ? ` at ${data.eventTime}` : ''}\n` : ''}${data.venueName ? `Venue: ${data.venueName}\n` : ''}\nPresent this code at the entrance.\n\n${appName} · ${appUrl}`,
  });
}
