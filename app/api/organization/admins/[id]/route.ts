import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import OrganizationAdmin from '@/models/OrganizationAdmin';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET!;

// GET single admin
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = req.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const decoded: any = jwt.verify(token, JWT_SECRET);

    if (decoded.role !== 'organization') {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    await connectDB();

    const admin = await OrganizationAdmin.findOne({
      _id: id,
      organizationId: decoded.id,
    })
      .select('-password');

    if (!admin) {
      return NextResponse.json(
        { error: 'Admin not found' },
        { status: 404 }
      );
    }

    // Normalize: populate assignedAwards + assignedEvents for this org's membership entry
    const membership = (admin as any).organizations?.find(
      (o: any) => o.organizationId?.toString() === decoded.id
    );
    const awardIds = membership?.assignedAwards || [];
    const eventIds = membership?.assignedEvents || [];
    const plain = (admin as any).toObject();
    plain.status = membership?.status || plain.status;

    return NextResponse.json({
      success: true,
      data: plain,
    });
  } catch (error: any) {
    console.error('Get admin error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch admin', details: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}

// PUT update admin
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = req.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const decoded: any = jwt.verify(token, JWT_SECRET);

    if (decoded.role !== 'organization') {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    await connectDB();

    const body = await req.json();
    const { name, assignedAwards, assignedEvents, status } = body;

    // Verify admin belongs to this organization
    const admin = await OrganizationAdmin.findOne({
      _id: id,
      organizationId: decoded.id,
    });

    if (!admin) {
      return NextResponse.json(
        { error: 'Admin not found' },
        { status: 404 }
      );
    }

    // Determine the index of this org's membership entry
    const orgIdx = admin.organizations
      ? admin.organizations.findIndex(
          (o: any) => o.organizationId?.toString() === decoded.id
        )
      : -1;

    // Build update
    const updateData: any = {};
    if (name) updateData.name = name;
    if (status) updateData.status = status;
    if (assignedAwards !== undefined && orgIdx >= 0) {
      updateData[`organizations.${orgIdx}.assignedAwards`] = assignedAwards;
    }
    if (assignedEvents !== undefined && orgIdx >= 0) {
      updateData[`organizations.${orgIdx}.assignedEvents`] = assignedEvents;
    }

    const updatedAdmin = await OrganizationAdmin.findByIdAndUpdate(
      id,
      { $set: updateData },
      { returnDocument: 'after', runValidators: true }
    )
      .select('-password');

    // Normalize: return assignedAwards + assignedEvents populated for this org
    const membership = (updatedAdmin as any)?.organizations?.find(
      (o: any) => o.organizationId?.toString() === decoded.id
    );
    const awardIds = membership?.assignedAwards || [];
    const eventIds = membership?.assignedEvents || [];
    const plain = (updatedAdmin as any).toObject();
    return NextResponse.json({
      success: true,
      message: 'Admin updated successfully',
      data: plain,
    });
  } catch (error: any) {
    console.error('Update admin error:', error);
    return NextResponse.json(
      { error: 'Failed to update admin', details: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}

// DELETE admin
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = req.headers.get('authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const decoded: any = jwt.verify(token, JWT_SECRET);

    if (decoded.role !== 'organization') {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    await connectDB();

    const admin = await OrganizationAdmin.findOneAndDelete({
      _id: id,
      organizationId: decoded.id,
    });

    if (!admin) {
      return NextResponse.json(
        { error: 'Admin not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Admin deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete admin error:', error);
    return NextResponse.json(
      { error: 'Failed to delete admin', details: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}
