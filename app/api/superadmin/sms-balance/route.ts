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

    // Fetch SMS balance from Arkesel API
    const apiKey = process.env.ARKESEL_API_KEY || "ZEFGc0FndExNUnRvTklFTVByQmI";
    const apiUrl = `https://sms.arkesel.com/sms/api?action=check-balance&api_key=${apiKey}&response=json`;

    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Arkesel API error:", errorText);
      throw new Error("Failed to fetch SMS balance");
    }

    const data = await response.json();

    // Parse the response
    const balance = data.balance || 0;
    const currency = "GHS"; // Arkesel uses GHS for Ghana
    const user = data.user || "";
    const country = data.country || "";
    const estimatedSmsCount = balance > 0 ? Math.floor(balance / 0.07) : 0;

    return NextResponse.json({
      success: true,
      data: {
        balance: balance,
        currency: currency,
        smsCount: estimatedSmsCount,
        user: user,
        country: country,
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
