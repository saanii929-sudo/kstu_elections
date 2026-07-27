import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Vote from '@/models/Vote';
import Award from '@/models/Award';
import Nominee from '@/models/Nominee';
import { verifyToken } from '@/lib/auth';

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

    let voteQuery: any = { paymentStatus: 'completed' };
    let paymentQuery: any = { status: 'completed' };

    if (decoded.role === 'organization') {
      const awards = await Award.find({ organizationId: decoded.id }).select('_id');
      const awardIds = awards.map(a => a._id.toString());
      
      if (awardIds.length === 0) {
        return NextResponse.json({ success: true, data: getEmptyAnalytics() });
      }
      
      voteQuery.awardId = { $in: awardIds };
      paymentQuery.awardId = { $in: awardIds };
    } else if (decoded.role === 'org-admin') {
      const assignedAwards = decoded.assignedAwards || [];

      if (assignedAwards.length === 0) {
        return NextResponse.json({ success: true, data: getEmptyAnalytics() });
      }

      voteQuery.awardId = { $in: assignedAwards };
      paymentQuery.awardId = { $in: assignedAwards };
    }
    if (awardId) {
      voteQuery.awardId = awardId;
      paymentQuery.awardId = awardId;
    }

    const now = new Date();
    const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
    
    const allVotesData = await Vote.find(voteQuery)
      .select('amount numberOfVotes createdAt nomineeId voterPhone paymentMethod')
      .sort({ createdAt: -1 })
      .lean();
    const totalVotes = allVotesData.length;
    const totalRevenue = allVotesData.reduce((sum, vote) => sum + (vote.amount || 0), 0);
    
    const votesTodayData = allVotesData.filter(v => new Date(v.createdAt) >= todayStart);
    const votesToday = votesTodayData.length;
    const revenueToday = votesTodayData.reduce((sum, vote) => sum + (vote.amount || 0), 0);

    const voteIds = allVotesData.map(v => (v as any)._id);
    const aggQuery: any = { 
      _id: { $in: voteIds }
    };

    const [
      topNominees,
      votesByHour,
      paymentMethods,
      votingTrend,
    ] = await Promise.all([
      Vote.aggregate([
        { $match: aggQuery },
        {
          $group: {
            _id: '$nomineeId',
            totalVotes: { $sum: '$numberOfVotes' },
            totalAmount: { $sum: '$amount' },
            voteCount: { $sum: 1 },
          },
        },
        { $sort: { totalVotes: -1 } },
        { $limit: 10 },
      ]),
      Vote.aggregate([
        {
          $match: {
            ...aggQuery,
            createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          },
        },
        {
          $group: {
            _id: { $hour: '$createdAt' },
            count: { $sum: 1 },
            amount: { $sum: '$amount' },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Vote.aggregate([
        { $match: aggQuery },
        {
          $group: {
            _id: '$paymentMethod',
            count: { $sum: 1 },
            amount: { $sum: '$amount' },
          },
        },
      ]),
    
      Vote.aggregate([
        {
          $match: {
            ...aggQuery,
            createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
            },
            votes: { $sum: '$numberOfVotes' },
            transactions: { $sum: 1 },
            revenue: { $sum: '$amount' },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    const votesByRegion = allVotesData.reduce((acc: any[], vote) => {
      const prefix = vote.voterPhone?.substring(0, 5) || 'Unknown';
      const existing = acc.find(r => r._id === prefix);
      if (existing) {
        existing.count++;
      } else {
        acc.push({ _id: prefix, count: 1 });
      }
      return acc;
    }, []).sort((a, b) => b.count - a.count).slice(0, 10);

    const recentVotes = allVotesData.slice(0, 20);

    const nomineeIds = topNominees.map(n => n._id);
    const nominees = await Nominee.find({ _id: { $in: nomineeIds } })
      .populate('categoryId', 'name')
      .select('name image categoryId')
      .lean();

    const topNomineesWithDetails = topNominees.map(nominee => {
      const details = nominees.find(n => n._id.toString() === nominee._id.toString());
      return {
        ...nominee,
        nominee: details,
      };
    });
    const recentNomineeIds = recentVotes.map(v => v.nomineeId);
    const recentNominees = await Nominee.find({ _id: { $in: recentNomineeIds } })
      .select('name image')
      .lean();

    const recentVotesWithDetails = recentVotes.map(vote => {
      const nominee = recentNominees.find(n => n._id.toString() === vote.nomineeId.toString());
      return {
        ...vote,
        nominee,
      };
    });

    const analyticsData = {
      overview: {
        totalVotes,
        totalRevenue,
        votesToday,
        revenueToday,
        averageVoteValue: totalVotes > 0 ? totalRevenue / totalVotes : 0,
      },
      topNominees: topNomineesWithDetails,
      votesByRegion,
      votesByHour,
      recentVotes: recentVotesWithDetails,
      paymentMethods,
      votingTrend,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json({
      success: true,
      data: analyticsData,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to fetch analytics', details: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}

function getEmptyAnalytics() {
  return {
    overview: {
      totalVotes: 0,
      totalRevenue: 0,
      votesToday: 0,
      revenueToday: 0,
      averageVoteValue: 0,
    },
    topNominees: [],
    votesByRegion: [],
    votesByHour: [],
    recentVotes: [],
    paymentMethods: [],
    votingTrend: [],
    timestamp: new Date().toISOString(),
  };
}
