
interface SendSmsParams {
  to: string;
  message: string;
  senderId?: string;
}

interface SmsResponse {
  success: boolean;
  message?: string;
  error?: string;
}
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

// mNotify wants recipients in local Ghana format (0XXXXXXXXX), per their own
// docs examples (e.g. '0241234567') — not the +233 E.164 format the
// previous gateway used.
function toLocalGhanaFormat(phoneStr: string): string {
  const cleaned = phoneStr.replace(/[\s\-\(\)]/g, "");
  if (cleaned.startsWith("+233")) return "0" + cleaned.slice(4);
  if (cleaned.startsWith("233")) return "0" + cleaned.slice(3);
  if (!cleaned.startsWith("0")) return "0" + cleaned;
  return cleaned;
}

export async function sendSms({
  to,
  message,
  senderId = "KsTUEvote",
}: SendSmsParams): Promise<SmsResponse> {
  try {
    let phoneStr = String(to).trim();
    if (phoneStr.includes('E') || phoneStr.includes('e')) {
      phoneStr = scientificToDecimal(phoneStr);
    }

    if (phoneStr.includes('.')) {
      phoneStr = phoneStr.split('.')[0];
      console.log("Removed decimal point:", phoneStr);
    }

    const apiKey = process.env.MNOTIFY_API_KEY;

    if (!apiKey) {
      return {
        success: false,
        error: "SMS service not configured",
      };
    }

    const phoneNumber = toLocalGhanaFormat(phoneStr);
    const apiUrl = `https://api.mnotify.com/api/sms/quick?key=${apiKey}`;

    // A plain fetch() has no timeout — if the SMS gateway is unreachable
    // (network egress blocked, DNS black hole, etc.) this would otherwise
    // hang for the OS's default TCP timeout, stalling whatever request
    // triggered it for minutes.
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    let response: Response;
    try {
      response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient: [phoneNumber],
          sender: senderId,
          message,
          is_schedule: false,
          schedule_date: "",
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `SMS API returned status ${response.status}: ${errorText}`,
      );
    }

    const data = await response.json();

    if (data.status === "success") {
      return {
        success: true,
        message: data.message || "SMS sent successfully",
      };
    } else {
      return {
        success: false,
        error: data.message || `mNotify error (code ${data.code ?? "unknown"})`,
      };
    }
  } catch (error: any) {
    const timedOut = error?.name === "AbortError";
    // fetch() wraps the real network error (DNS failure, connection reset,
    // etc.) in error.cause — surface it so "fetch failed" isn't the entire
    // diagnostic.
    const detail = timedOut
      ? "Request timed out after 15s"
      : error?.cause?.message || error.message || "Failed to send SMS";
    console.error("sendSms failed:", detail);
    return {
      success: false,
      error: detail,
    };
  }
}

export async function sendVoterCredentialsSms(
  phone: string,
  name: string,
  studentId: string,
  password: string,
  electionTitle: string,
  startDate?: Date,
  endDate?: Date,
  secureLink?: string,
  electionAlias?: string,
): Promise<boolean> {
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  let dateInfo = "";
  if (startDate && endDate) {
    dateInfo = `\n\nVoting Period:\n${formatDate(startDate)} - ${formatDate(endDate)}`;
  }
  const electionLabel = electionAlias ? `${electionTitle} (${electionAlias})` : electionTitle;
  const closesInfo = endDate ? ` before ${formatDate(endDate)}` : "";

  const message = secureLink
    ? `Hello ${name},

You are invited to vote in ${electionLabel}. Click the secure link below, then enter your student number and password to continue${closesInfo}:

${secureLink}

Student Number: ${studentId}
Password: ${password}

This link is unique to you, cannot be shared, and expires automatically.${dateInfo}
`
    : `Hello ${name},

You are invited to vote in ${electionLabel}.

Student Number: ${studentId}
Password: ${password}${dateInfo}

Contact your election administrator for your secure voting link.
`;

  const result = await sendSms({
    to: phone,
    message,
    senderId: "KsTUEvote",
  });

  if (result.success) {
    console.log("Voter credentials SMS sent successfully to:", phone);
  } else {
    console.error("Failed to send voter credentials SMS:", result.error);
  }

  return result.success;
}

export async function sendVoterOtpSms(
  phone: string,
  name: string,
  OTP: string,
  electionTitle: string,
  startDate?: Date,
  endDate?: Date,
): Promise<boolean> {
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  const dateInfo =
    startDate && endDate
      ? `\n\nVoting Period:\n${formatDate(startDate)} - ${formatDate(endDate)}`
      : "";

  const message = `Hello ${name},

Your otp for ${electionTitle}:

OTP: ${OTP}${dateInfo}

Keep these credentials safe.

`;

  const result = await sendSms({
    to: phone,
    message,
    senderId: "KsTUEvote",
  });

  if (result.success) {
    console.log("Voter credentials SMS sent successfully to:", phone);
  } else {
    console.error("Failed to send voter credentials SMS:", result.error);
  }

  return result.success;
}

// Login OTP for any account type that has opted into SMS delivery
// (organization, admin, superadmin, electionAdmin) — used instead of email
// when the account has a phone number on file.
export async function sendAdminOtpSms(phone: string, otp: string): Promise<boolean> {
  const message = `Your PawaVotes verification code is: ${otp}\n\nIt expires in 10 minutes. Do not share this code.`;

  const result = await sendSms({
    to: phone,
    message,
    senderId: "KsTUEvote",
  });

  if (result.success) {
    console.log("Login OTP SMS sent successfully to:", phone);
  } else {
    console.error("Failed to send login OTP SMS:", result.error);
  }

  return result.success;
}

// New administrator account credentials — sent instead of email when
// superadmin provides a phone number for the new account.
export async function sendAdminCredentialsSms(
  phone: string,
  username: string,
  email: string,
  password: string,
  role: string,
): Promise<boolean> {
  const message = `Hello ${username},

Your PawaVotes administrator account (${role}) has been created.

Email: ${email}
Password: ${password}

Change your password after first login. Keep these credentials safe.`;

  const result = await sendSms({
    to: phone,
    message,
    senderId: "KsTUEvote",
  });

  if (result.success) {
    console.log("Admin credentials SMS sent successfully to:", phone);
  } else {
    console.error("Failed to send admin credentials SMS:", result.error);
  }

  return result.success;
}

// NOTE: mNotify's balance endpoint wasn't part of the /sms/quick and
// /sms/group docs this migration was based on — this is our best-effort
// mapping to mNotify's documented `GET /api/balance/sms` endpoint and
// should be verified against their actual account/balance docs before
// being relied on.
export async function checkSmsBalance(): Promise<{
  success: boolean;
  balance?: number;
  smsCount?: number;
  currency?: string;
  error?: string;
}> {
  try {
    const apiKey = process.env.MNOTIFY_API_KEY;

    if (!apiKey) {
      return {
        success: false,
        error: "SMS service not configured",
      };
    }

    const apiUrl = `https://api.mnotify.com/api/balance/sms?key=${apiKey}`;

    const response = await fetch(apiUrl);

    if (!response.ok) {
      throw new Error("Failed to check SMS balance");
    }

    const data = await response.json();
    if (data.status && data.status !== "success") {
      throw new Error(data.message || "Failed to check SMS balance");
    }
    const balance = data.balance ?? 0;

    return {
      success: true,
      balance: balance,
      smsCount: balance,
      currency: "GHS",
    };
  } catch (error: any) {
    console.error("Check SMS balance error:", error);
    return {
      success: false,
      error: error.message || "Failed to check SMS balance",
    };
  }
}
