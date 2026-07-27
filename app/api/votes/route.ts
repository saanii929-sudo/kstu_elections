import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Vote from '@/models/Vote';
import { verifyToken } from '@/lib/auth';
import { hasAwardAccess } from '@/lib/access-control';

export async function GET(req: NextRequest) {
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

    const { searchParams } = new URL(req.url);
    const awardId = searchParams.get('awardId');
    const categoryId = searchParams.get('categoryId');
    const nomineeId = searchParams.get('nomineeId');
    const stageId = searchParams.get('stageId');

    let query: any = {};

    if (awardId) {
      const assignedAwards: string[] = decoded.role === 'org-admin'
        ? (decoded.assignedAwards || []).map((id: any) => id.toString())
        : [];
      const hasAccess = await hasAwardAccess(decoded.id, decoded.role, awardId, assignedAwards);
      
      if (!hasAccess) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
      query.awardId = awardId;
    } else {
      if (decoded.role === 'org-admin') {
        const assignedAwards = decoded.assignedAwards || [];
        if (assignedAwards.length === 0) {
          return NextResponse.json({ success: true, data: [] });
        }
        query.awardId = { $in: assignedAwards };
      } else if (decoded.role === 'organization') {
        const Award = (await import('@/models/Award')).default;
        const awards = await Award.find({ organizationId: decoded.id }).select('_id');
        const awardIds = awards.map(a => a._id.toString());
        if (awardIds.length === 0) {
          return NextResponse.json({ success: true, data: [] });
        }
        query.awardId = { $in: awardIds };
      }
    }

    if (categoryId) {
      query.categoryId = categoryId;
    }

    if (nomineeId) {
      query.nomineeId = nomineeId;
    }

    if (stageId) {
      query.stageId = stageId;
    }
    query.paymentStatus = 'completed';

    const votes = await Vote.find(query)
      .sort({ createdAt: -1 })
      .lean();

    const Nominee = (await import('@/models/Nominee')).default;
    const Category = (await import('@/models/Category')).default;

    // Batch-fetch all related documents instead of N+1 individual queries
    const nomineeIds = [...new Set(votes.map(v => v.nomineeId?.toString()).filter((id): id is string => !!id))];
    const categoryIds = [...new Set(votes.map(v => v.categoryId?.toString()).filter((id): id is string => !!id))];
    const stageIds = [...new Set(votes.map(v => v.stageId?.toString()).filter((id): id is string => !!id))];

    const [nominees, categories] = await Promise.all([
      nomineeIds.length > 0
        ? Nominee.find({ _id: { $in: nomineeIds } }).select('name image').lean()
        : [],
      categoryIds.length > 0
        ? Category.find({ _id: { $in: categoryIds } }).select('name').lean()
        : [],
    ]);

    // Build lookup maps for O(1) access
    const nomineeMap = new Map(nominees.map((n: any) => [n._id.toString(), n]));
    const categoryMap = new Map(categories.map((c: any) => [c._id.toString(), c]));

    const votesWithDetails = votes.map((vote) => ({
      ...vote,
      bulkPackageId: vote.bulkPackageId || null,
      nominee: nomineeMap.get(vote.nomineeId?.toString()) || null,
      category: categoryMap.get(vote.categoryId?.toString()) || null,
    }));

    return NextResponse.json({
      success: true,
      data: votesWithDetails,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to fetch votes', details: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}
