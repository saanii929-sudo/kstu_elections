
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

export async function sendSms({
  to,
  message,
  senderId = "PAWAVOTES",
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

    const apiKey = process.env.ARKESEL_API_KEY;

    if (!apiKey) {
      return {
        success: false,
        error: "SMS service not configured",
      };
    }
    const cleanPhone = phoneStr.replace(/[\s\-\(\)]/g, "");
    let phoneNumber = cleanPhone;
    if (!phoneNumber.startsWith("+")) {
      if (phoneNumber.startsWith("0")) {
        phoneNumber = "+233" + phoneNumber.substring(1);
      } else if (!phoneNumber.startsWith("233")) {
        phoneNumber = "+233" + phoneNumber;
      } else {
        phoneNumber = "+" + phoneNumber;
      }
    }
    const apiUrl = `https://sms.arkesel.com/sms/api?action=send-sms&api_key=${apiKey}&to=${encodeURIComponent(phoneNumber)}&from=${encodeURIComponent(senderId)}&sms=${encodeURIComponent(message)}`;

    // A plain fetch() has no timeout — if the SMS gateway is unreachable
    // (network egress blocked, DNS black hole, etc.) this would otherwise
    // hang for the OS's default TCP timeout, stalling whatever request
    // triggered it for minutes.
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    let response: Response;
    try {
      response = await fetch(apiUrl, {
        method: "GET",
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
    
    if (data.code === "ok" || data.status === "success") {
      return {
        success: true,
        message: "SMS sent successfully",
      };
    } else {
      return {
        success: false,
        error: data.message || "Failed to send SMS",
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
    senderId: "PAWAVOTES",
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
    senderId: "PAWAVOTES",
  });

  if (result.success) {
    console.log("Voter credentials SMS sent successfully to:", phone);
  } else {
    console.error("Failed to send voter credentials SMS:", result.error);
  }

  return result.success;
}

export async function sendTicketSmsConfirmation(
  phone: string,
  buyerName: string,
  eventTitle: string,
  ticketTypeName: string,
  quantity: number,
  reference: string,
): Promise<boolean> {
  const appUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  const downloadLink = `${appUrl}/ticket-download?ref=${reference}`;

  // Keep event + ticket names short to stay within a single 160-char SMS
  const shortEvent = eventTitle.length > 28 ? eventTitle.substring(0, 25) + '...' : eventTitle;
  const shortType = ticketTypeName.length > 20 ? ticketTypeName.substring(0, 17) + '...' : ticketTypeName;
  const firstName = buyerName.split(' ')[0];

  const message =
    `Hi ${firstName}! Your ${quantity}x ${shortType} ticket(s) for "${shortEvent}" are confirmed.\n` +
    `Download: ${downloadLink}`;

  const result = await sendSms({ to: phone, message, senderId: 'PAWAVOTES' });

  if (result.success) {
    console.log(`[SMS] Ticket confirmation sent to ${phone} for ref ${reference}`);
  } else {
    console.warn(`[SMS] Failed to send ticket confirmation to ${phone}:`, result.error);
  }

  return result.success;
}

export async function checkSmsBalance(): Promise<{
  success: boolean;
  balance?: number;
  smsCount?: number;
  currency?: string;
  error?: string;
}> {
  try {
    const apiKey = process.env.ARKESEL_API_KEY;

    if (!apiKey) {
      return {
        success: false,
        error: "SMS service not configured",
      };
    }

    const apiUrl = `https://sms.arkesel.com/sms/api?action=check-balance&api_key=${apiKey}&response=json`;

    const response = await fetch(apiUrl);

    if (!response.ok) {
      throw new Error("Failed to check SMS balance");
    }

    const data = await response.json();
    const balance = data.balance || 0;
    const estimatedSmsCount = balance > 0 ? Math.floor(balance / 0.07) : 0;

    return {
      success: true,
      balance: balance,
      smsCount: estimatedSmsCount,
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
