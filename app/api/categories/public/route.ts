import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Category from '@/models/Category';

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const awardId = searchParams.get('awardId');

    if (!awardId) {
      return NextResponse.json(
        { error: 'Award ID is required' },
        { status: 400 }
      );
    }

    const categories = await Category.find({
      awardId,
      status: 'published',
    })
      .select('name description')
      .sort({ createdAt: 1 })
      .lean();

    return NextResponse.json({
      success: true,
      categories,
    });
  } catch (error: any) {
    console.error('Get public categories error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories', details: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}
