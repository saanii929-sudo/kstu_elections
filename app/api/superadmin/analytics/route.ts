import { NextRequest, NextResponse } from 'next/server';
import { withDB } from '@/middleware/db';
import PageView from '@/models/PageView';
import { verifyToken } from '@/lib/auth';

async function getSiteAnalytics(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'superadmin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const range = searchParams.get('range') || '7d';

    let daysBack = 7;
    if (range === '24h') daysBack = 1;
    else if (range === '30d') daysBack = 30;
    else if (range === '90d') daysBack = 90;

    const since = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [
      totalViews,
      uniqueSessions,
      todayViews,
      todaySessions,
      topPages,
      deviceBreakdown,
      browserBreakdown,
      viewsByDay,
      topReferrers,
      recentViews,
    ] = await Promise.all([
      PageView.countDocuments({ createdAt: { $gte: since } }),
      PageView.distinct('sessionId', { createdAt: { $gte: since } }).then(s => s.length),
      PageView.countDocuments({ createdAt: { $gte: todayStart } }),
      PageView.distinct('sessionId', { createdAt: { $gte: todayStart } }).then(s => s.length),
      PageView.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: '$path', views: { $sum: 1 }, uniqueVisitors: { $addToSet: '$sessionId' } } },
        { $project: { _id: 1, views: 1, uniqueVisitors: { $size: '$uniqueVisitors' } } },
        { $sort: { views: -1 } },
        { $limit: 10 },
      ]),
      PageView.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: '$device', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      PageView.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $group: { _id: '$browser', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      PageView.aggregate([
        { $match: { createdAt: { $gte: since } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            views: { $sum: 1 },
            uniqueVisitors: { $addToSet: '$sessionId' },
          },
        },
        { $project: { _id: 1, views: 1, uniqueVisitors: { $size: '$uniqueVisitors' } } },
        { $sort: { _id: 1 } },
      ]),
      PageView.aggregate([
        { $match: { createdAt: { $gte: since }, referrer: { $exists: true, $ne: '' } } },
        { $group: { _id: '$referrer', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      PageView.find({ createdAt: { $gte: since } })
        .select('path device browser createdAt sessionId')
        .sort({ createdAt: -1 })
        .limit(20)
        .lean(),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        overview: { totalViews, uniqueSessions, todayViews, todaySessions },
        topPages,
        deviceBreakdown,
        browserBreakdown,
        viewsByDay,
        topReferrers,
        recentViews,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to fetch analytics', details: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}

export const GET = withDB(getSiteAnalytics);
