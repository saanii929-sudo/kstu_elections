import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Vote from '@/models/Vote';
import Nominee from '@/models/Nominee';
import Category from '@/models/Category';

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const awardId = searchParams.get('awardId');
    const categoryId = searchParams.get('categoryId');

    if (!awardId) {
      return NextResponse.json(
        { error: 'Award ID is required' },
        { status: 400 }
      );
    }

    let query: any = {
      awardId,
      paymentStatus: 'completed',
    };

    if (categoryId) {
      query.categoryId = categoryId;
    }

    const votes = await Vote.find(query)
      .select('nomineeId categoryId numberOfVotes amount createdAt')
      .sort({ createdAt: -1 })
      .lean();

    const nomineeIds = [...new Set(votes.map(v => v.nomineeId.toString()))];
    const categoryIds = [...new Set(votes.map(v => v.categoryId.toString()))];

    const nominees = await Nominee.find({ _id: { $in: nomineeIds } })
      .select('name image')
      .lean();

    const categories = await Category.find({ _id: { $in: categoryIds } })
      .select('name')
      .lean();

    const votesWithDetails = votes.map(vote => {
      const nominee = nominees.find(n => n._id.toString() === vote.nomineeId.toString());
      const category = categories.find(c => c._id.toString() === vote.categoryId.toString());

      return {
        ...vote,
        nominee,
        category,
      };
    });

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
