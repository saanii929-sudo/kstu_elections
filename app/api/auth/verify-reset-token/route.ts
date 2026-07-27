import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Organization from '@/models/Organization';
import OrganizationAdmin from '@/models/OrganizationAdmin';
import Admin from '@/models/Admin';

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { error: 'Reset token is required' },
        { status: 400 }
      );
    }
    let user = await Organization.findOne({
      resetPasswordToken: token,
      resetPasswordExpiry: { $gt: new Date() },
    });

    if (!user) {
      user = await OrganizationAdmin.findOne({
        resetPasswordToken: token,
        resetPasswordExpiry: { $gt: new Date() },
      });
    }

    if (!user) {
      user = await Admin.findOne({
        resetPasswordToken: token,
        resetPasswordExpiry: { $gt: new Date() },
      });
    }

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid or expired reset token' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Token is valid',
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to verify token', details: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}
