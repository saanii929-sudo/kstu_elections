import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Organization from '@/models/Organization';
import OrganizationAdmin from '@/models/OrganizationAdmin';
import { verifyToken } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    const body = await req.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json({ error: 'Password is required' }, { status: 400 });
    }
    let user;
    if (decoded.role === 'organization') {
      user = await Organization.findById(decoded.id).select('password');
    } else if (decoded.role === 'org-admin') {
      user = await OrganizationAdmin.findById(decoded.id).select('password');
    } else {
      return NextResponse.json({ error: 'Invalid user role' }, { status: 403 });
    }

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return NextResponse.json({ 
        success: false,
        error: 'Invalid password' 
      }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      message: 'Password verified successfully',
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to verify password', details: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}
