import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Election from '@/models/Election';
import Voter from '@/models/Voter';
import Candidate from '@/models/Candidate';
import ElectionCategory from '@/models/ElectionCategory';
import ElectionVote from '@/models/ElectionVote';
import PinkSheet from '@/models/PinkSheet';
import { verifyToken } from '@/lib/auth';
import { normalizeAlias, isValidAlias } from '@/lib/electionStatus';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'organization') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { title, alias, description, startDate, endDate, settings, status } = body;
    const election = await Election.findOne({
      _id: id,
      organizationId: decoded.id,
    });

    if (!election) {
      return NextResponse.json(
        { error: 'Election not found' },
        { status: 404 }
      );
    }

    let normalizedAlias: string | undefined;
    if (alias !== undefined) {
      normalizedAlias = normalizeAlias(alias);
      if (!isValidAlias(normalizedAlias)) {
        return NextResponse.json(
          { error: 'Alias must be 2-20 characters: letters, numbers, and hyphens only' },
          { status: 400 }
        );
      }
      const existingAlias = await Election.findOne({
        alias: normalizedAlias,
        _id: { $ne: id },
      });
      if (existingAlias) {
        return NextResponse.json(
          { error: 'That alias is already in use. Choose a different one.' },
          { status: 409 }
        );
      }
    }

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (start >= end) {
        return NextResponse.json(
          { error: 'End date must be after start date' },
          { status: 400 }
        );
      }
    }

    const updateData: any = {};
    if (title) updateData.title = title;
    if (normalizedAlias !== undefined) updateData.alias = normalizedAlias;
    if (description !== undefined) updateData.description = description;
    if (startDate) updateData.startDate = new Date(startDate);
    if (endDate) updateData.endDate = new Date(endDate);
    if (settings) updateData.settings = settings;
    if (status) updateData.status = status;

    const updatedElection = await Election.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    return NextResponse.json({
      success: true,
      message: 'Election updated successfully',
      data: updatedElection,
    });
  } catch (error: any) {
    console.error('Update election error:', error);
    if (error?.code === 11000) {
      return NextResponse.json(
        { error: 'That alias is already in use. Choose a different one.' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to update election', details: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();

    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'organization') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Verify ownership before deleting
    const election = await Election.findOne({ _id: id, organizationId: decoded.id });
    if (!election) {
      return NextResponse.json({ error: 'Election not found' }, { status: 404 });
    }

    // Cascade delete all related data in parallel
    await Promise.all([
      Voter.deleteMany({ electionId: id }),
      Candidate.deleteMany({ electionId: id }),
      ElectionCategory.deleteMany({ electionId: id }),
      ElectionVote.deleteMany({ electionId: id }),
      PinkSheet.deleteMany({ electionId: id }),
    ]);

    // Delete the election itself
    await Election.findByIdAndDelete(id);

    return NextResponse.json({
      success: true,
      message: 'Election and all related data deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete election error:', error);
    return NextResponse.json(
      { error: 'Failed to delete election', details: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}
