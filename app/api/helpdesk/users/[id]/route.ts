import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import HelpDeskUser from '@/models/HelpDeskUser';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET!;

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { assignedElections } = await request.json();

    if (!assignedElections || assignedElections.length === 0) {
      return NextResponse.json(
        { error: 'At least one election must be assigned' },
        { status: 400 }
      );
    }

    await dbConnect();

    const { id } = await params;

    const helpdeskUser = await HelpDeskUser.findOne({
      _id: id,
      organizationId,
    });

    if (!helpdeskUser) {
      return NextResponse.json(
        { error: 'Help desk user not found' },
        { status: 404 }
      );
    }

    helpdeskUser.assignedElections = assignedElections;
    await helpdeskUser.save();

    const populatedUser = await HelpDeskUser.findById(helpdeskUser._id)
      .populate('assignedElections', 'title')
      .select('-password');

    return NextResponse.json({
      success: true,
      data: populatedUser,
    });
  } catch (error) {
    console.error('Update helpdesk user error:', error);
    return NextResponse.json(
      { error: 'Failed to update helpdesk user' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;

    const helpdeskUser = await HelpDeskUser.findOne({
      _id: id,
      organizationId,
    });

    if (!helpdeskUser) {
      return NextResponse.json(
        { error: 'Help desk user not found' },
        { status: 404 }
      );
    }

    await HelpDeskUser.deleteOne({ _id: id });

    return NextResponse.json({
      success: true,
      message: 'Help desk user deleted successfully',
    });
  } catch (error) {
    console.error('Delete helpdesk user error:', error);
    return NextResponse.json(
      { error: 'Failed to delete helpdesk user' },
      { status: 500 }
    );
  }
}
