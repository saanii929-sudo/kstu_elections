import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get("authorization")?.split(" ")[1];
    if (!token) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== "superadmin") {
      return NextResponse.json(
        { success: false, message: "Unauthorized - Superadmin access required" },
        { status: 403 }
      );
    }

    // Fetch SMS balance from mNotify API
    const apiKey = process.env.MNOTIFY_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { success: false, message: "SMS service not configured" },
        { status: 500 }
      );
    }
    const apiUrl = `https://api.mnotify.com/api/balance/sms?key=${apiKey}`;

    const response = await fetch(apiUrl);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("mNotify API error:", errorText);
      throw new Error("Failed to fetch SMS balance");
    }

    const data = await response.json();
    if (data.status && data.status !== "success") {
      throw new Error(data.message || "Failed to fetch SMS balance");
    }

    // mNotify's balance is already denominated in SMS credits.
    const balance = data.balance ?? 0;

    return NextResponse.json({
      success: true,
      data: {
        balance: balance,
        currency: "GHS",
        smsCount: balance,
      },
    });
  } catch (error: any) {
    console.error("Error fetching SMS balance:", error);
    return NextResponse.json(
      {
        success: false,
        message: error.message || "Failed to fetch SMS balance",
      },
      { status: 500 }
    );
  }
}
