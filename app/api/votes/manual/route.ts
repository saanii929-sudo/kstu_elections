import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Vote from '@/models/Vote';
import Nominee from '@/models/Nominee';
import Category from '@/models/Category';
import Award from '@/models/Award';
import { verifyToken } from '@/lib/auth';
import { hasAwardAccess } from '@/lib/access-control';

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
    const { awardId, categoryId, nomineeId, numberOfVotes, stageId } = body;

    if (!awardId || !categoryId || !nomineeId || !numberOfVotes) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    if (numberOfVotes <= 0) {
      return NextResponse.json(
        { error: 'Number of votes must be greater than 0' },
        { status: 400 }
      );
    }

    const assignedAwards: string[] = decoded.role === 'org-admin'
      ? (decoded.assignedAwards || []).map((id: any) => id.toString())
      : [];

    const hasAccess = await hasAwardAccess(decoded.id, decoded.role, awardId, assignedAwards);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const nominee = await Nominee.findOne({
      _id: nomineeId,
      categoryId,
      awardId,
    });

    if (!nominee) {
      return NextResponse.json(
        { error: 'Nominee not found or does not belong to the selected category' },
        { status: 404 }
      );
    }

    const referenceId = `MANUAL_${Date.now()}_${Math.random().toString(36).substring(7).toUpperCase()}`;

    const vote = await Vote.create({
      awardId,
      categoryId,
      nomineeId,
      stageId: stageId || undefined,
      voterEmail: decoded.email || 'manual@system.local',
      voterPhone: 'N/A',
      numberOfVotes,
      paymentReference: referenceId,
      paymentMethod: 'manual',
      paymentStatus: 'completed',
      amount: 0,
    });

    await Nominee.findByIdAndUpdate(
      nomineeId,
      { $inc: { voteCount: numberOfVotes } }
    );
    await Category.findByIdAndUpdate(
      categoryId,
      { $inc: { voteCount: numberOfVotes } }
    );

    await Award.findByIdAndUpdate(
      awardId,
      { $inc: { totalVotes: numberOfVotes } }
    );
    let stageName = null;
    if (vote.stageId) {
    }

    return NextResponse.json({
      success: true,
      message: 'Votes added successfully',
      data: {
        ...vote.toObject(),
        stageName,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to add votes', details: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: error.statusCode || 500 }
    );
  }
}
