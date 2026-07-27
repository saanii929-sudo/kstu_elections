import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import HelpDeskUser from '@/models/HelpDeskUser';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET!;

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    if (decoded.role !== 'organization') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // For organizations, their ID is the organizationId
    const organizationId = decoded.id;

    await dbConnect();

    const helpdeskUsers = await HelpDeskUser.find({ organizationId })
      .populate('assignedElections', 'title')
      .select('-password')
      .sort({ createdAt: -1 });

    return NextResponse.json({
      success: true,
      data: helpdeskUsers,
    });
  } catch (error) {
    console.error('Get helpdesk users error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch helpdesk users' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    if (decoded.role !== 'organization') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // For organizations, their ID is the organizationId
    const organizationId = decoded.id;

    const { username, email, password, assignedElections } = await request.json();

    if (!username || !email || !password) {
      return NextResponse.json(
        { error: 'Username, email, and password are required' },
        { status: 400 }
      );
    }

    if (!assignedElections || assignedElections.length === 0) {
      return NextResponse.json(
        { error: 'At least one election must be assigned' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    await dbConnect();

    const existingUser = await HelpDeskUser.findOne({
      email,
      organizationId,
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email already exists' },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const helpdeskUser = await HelpDeskUser.create({
      username,
      email,
      password: hashedPassword,
      assignedElections,
      organizationId,
      status: 'active',
    });

    const populatedUser = await HelpDeskUser.findById(helpdeskUser._id)
      .populate('assignedElections', 'title')
      .select('-password');

    return NextResponse.json({
      success: true,
      data: populatedUser,
    });
  } catch (error) {
    console.error('Create helpdesk user error:', error);
    return NextResponse.json(
      { error: 'Failed to create helpdesk user' },
      { status: 500 }
    );
  }
}
