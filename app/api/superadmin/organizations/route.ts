import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import Organization from "@/models/Organization";
import { hashPassword } from "@/lib/auth";
import { withAuth } from "@/middleware/auth";
import { sanitizeSearch } from "@/lib/security";

async function getOrganizations(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = sanitizeSearch(searchParams.get("search"));
    const status = searchParams.get("status") || "";

    const query: any = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    if (status) {
      query.status = status;
    }

    const skip = (page - 1) * limit;

    const [organizations, total] = await Promise.all([
      Organization.find(query)
        .select("-password")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Organization.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      data: organizations,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to fetch organizations", details: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 },
    );
  }
}

async function createOrganization(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const {
      name,
      email,
      phone,
      address,
      website,
      description,
      eventType,
      status,
      deliveryMethod,
    } = body;

    if (!name || !email) {
      return NextResponse.json(
        { error: "Name and email are required" },
        { status: 400 },
      );
    }

    if (!eventType) {
      return NextResponse.json(
        { error: "Event type is required" },
        { status: 400 },
      );
    }

    if (!deliveryMethod || !["email", "sms", "both"].includes(deliveryMethod)) {
      return NextResponse.json(
        { error: "Delivery method is required (email, sms, or both)" },
        { status: 400 },
      );
    }

    if ((deliveryMethod === "sms" || deliveryMethod === "both") && !phone) {
      return NextResponse.json(
        { error: "Phone number is required for SMS delivery" },
        { status: 400 },
      );
    }

    const existingOrg = await Organization.findOne({ email });
    if (existingOrg) {
      return NextResponse.json(
        { error: "Organization with this email already exists" },
        { status: 400 },
      );
    }

    // Auto-generate a secure password
    const generatedPassword = generateSecurePassword();
    const hashedPassword = await hashPassword(generatedPassword);

    const organization = await Organization.create({
      name,
      email,
      password: hashedPassword,
      phone,
      address,
      website,
      description,
      eventType: eventType || "awards",
      status: status || "active",
      createdBy: (req as any).user?.id || "superadmin",
    });

    // Send credentials via selected method(s)
    const deliveryResults = {
      email: { sent: false, error: null as string | null },
      sms: { sent: false, error: null as string | null },
    };

    // Send via Email
    if (deliveryMethod === "email" || deliveryMethod === "both") {
      try {
        const nodemailer = require("nodemailer");
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT || "465"),
          secure: true,
          auth: {
            user: process.env.SMTP_USERNAME,
            pass: process.env.SMTP_PASSWORD,
          },
        });

        await transporter.sendMail({
          from: process.env.SMTP_FROM,
          to: email,
          subject: "Welcome to PawaVotes - Your Account Credentials",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #16a34a;">Welcome to PawaVotes!</h2>
              <p>Hello ${name},</p>
              <p>Your organization account has been created successfully. Here are your login credentials:</p>
              <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 5px 0;"><strong>Email:</strong> ${email}</p>
                <p style="margin: 5px 0;"><strong>Password:</strong> ${generatedPassword}</p>
                <p style="margin: 5px 0;"><strong>Login URL:</strong> <a href="${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"}/login">${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"}/login</a></p>
              </div>
              <p style="color: #dc2626;"><strong>Important:</strong> Please change your password after your first login for security purposes.</p>
              <p>If you have any questions, please contact our support team.</p>
              <p>Best regards,<br>PawaVotes Team</p>
            </div>
          `,
        });

        deliveryResults.email.sent = true;
      } catch (emailError: any) {
        deliveryResults.email.error = emailError.message;
      }
    }

    // Send via SMS
    if (deliveryMethod === "sms" || deliveryMethod === "both") {
      try {
        const { sendSms } = require("@/services/sms.service");
        const smsResult = await sendSms({
          to: phone,
          message: `Welcome to PawaVotes! Your login credentials:\nEmail: ${email}\nPassword: ${generatedPassword}\nLogin: ${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"}/login\nPlease change your password after first login.`,
        });

        if (smsResult.success) {
          deliveryResults.sms.sent = true;
        } else {
          deliveryResults.sms.error = smsResult.error || "Failed to send SMS";
        }
      } catch (smsError: any) {
        deliveryResults.sms.error = smsError.message;
      }
    }

    const orgData: any = organization.toObject();
    delete orgData.password;

    // Determine overall success message
    let message = "Organization created successfully. ";
    if (deliveryMethod === "email" && deliveryResults.email.sent) {
      message += "Credentials sent via email.";
    } else if (deliveryMethod === "sms" && deliveryResults.sms.sent) {
      message += "Credentials sent via SMS.";
    } else if (deliveryMethod === "both") {
      if (deliveryResults.email.sent && deliveryResults.sms.sent) {
        message += "Credentials sent via email and SMS.";
      } else if (deliveryResults.email.sent) {
        message += "Credentials sent via email. SMS delivery failed.";
      } else if (deliveryResults.sms.sent) {
        message += "Credentials sent via SMS. Email delivery failed.";
      } else {
        message += "Failed to send credentials via email and SMS.";
      }
    } else {
      message += "Failed to send credentials.";
    }

    return NextResponse.json(
      {
        success: true,
        message,
        data: {
          ...orgData,
          generatedPassword: generatedPassword, // Include in response for superadmin to see
        },
        delivery: deliveryResults,
      },
      { status: 201 },
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to create organization", details: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 },
    );
  }
}

// Helper function to generate secure password
function generateSecurePassword(): string {
  const length = 12;
  const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lowercase = "abcdefghijklmnopqrstuvwxyz";
  const numbers = "0123456789";
  const symbols = "!@#$%^&*";

  const allChars = uppercase + lowercase + numbers + symbols;

  let password = "";
  // Ensure at least one of each type
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];

  // Fill the rest randomly
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  // Shuffle the password
  return password
    .split("")
    .sort(() => Math.random() - 0.5)
    .join("");
}

export const GET = withAuth(getOrganizations, "superadmin");
export const POST = withAuth(createOrganization, "superadmin");
