import { sendEmail } from '@/lib/email';

/**
 * Sends the voter's login credentials by email. Extracted as a shared
 * helper (rather than duplicated inline again) specifically for
 * lib/scheduledVoterCredentials.ts — the immediate-send routes
 * (app/api/elections/voters/route.ts, .../bulk/route.ts,
 * .../[id]/resend/route.ts) each keep their own near-identical copy of this
 * template; not touched here to avoid an unrelated refactor of working code.
 */
export async function sendVoterCredentialsEmail(
  email: string,
  name: string,
  studentId: string,
  password: string,
  electionTitle: string,
  startDate: Date,
  endDate: Date,
  secureLink: string
): Promise<boolean> {
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString('en-GB', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
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
            <a href="${secureLink}" class="button" style="color: white;">
              🗳️ Start Voting
            </a>
          </div>

          <div class="info-box">
            <strong>📍 Your Secure Voting Link:</strong><br>
            <a href="${secureLink}" style="color: #6366f1; word-break: break-all;">${secureLink}</a>
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

    Your secure voting link: ${secureLink}

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
