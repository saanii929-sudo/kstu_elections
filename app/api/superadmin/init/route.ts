import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Admin from '@/models/Admin';
import { hashPassword } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const existingSuperAdmin = await Admin.findOne({ role: 'superadmin' });

    if (existingSuperAdmin) {
      return NextResponse.json(
        { error: 'Superadmin already exists' },
        { status: 400 }
      );
    }

    const { username, email, password } = await req.json();

    if (!username || !email || !password) {
      return NextResponse.json(
        { error: 'Username, email, and password are required' },
        { status: 400 }
      );
    }

    const hashedPassword = await hashPassword(password);

    const superAdmin = await Admin.create({
      username,
      email,
      password: hashedPassword,
      role: 'superadmin',
      status: 'active',
    });

    return NextResponse.json({
      success: true,
      message: 'Superadmin created successfully',
      data: {
        id: superAdmin._id,
        username: superAdmin.username,
        email: superAdmin.email,
        role: superAdmin.role,
      },
    }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to create superadmin', details: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}
