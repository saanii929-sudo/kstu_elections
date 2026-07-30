import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import VoterLoginAttempt from '@/models/VoterLoginAttempt';
import { withAuth } from '@/middleware/auth';

// A cluster is flagged when the same (election, ip) pair has this many
// distinct voters logging in within a short rolling window — real campus
// WiFi/hostel NAT spreads logins across the whole voting period as students
// individually decide to vote, so a burst of many different accounts from
// one IP in a few minutes is a much cleaner bot signature than raw volume.
const SUSPICIOUS_WINDOW_MS = 5 * 60 * 1000;
const SUSPICIOUS_VOTER_THRESHOLD = 5;

async function getSuspiciousActivity(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '25', 10) || 25));
    const search = searchParams.get('search')?.trim();

    // Only attempts recent enough to still fall inside some window are
    // relevant — clusters entirely older than the window can't be flagged.
    const since = new Date(Date.now() - SUSPICIOUS_WINDOW_MS);

    const pipeline: any[] = [
      { $match: { createdAt: { $gte: since } } },
      { $sort: { createdAt: 1 } },
      {
        $group: {
          _id: { electionId: '$electionId', ip: '$ip' },
          distinctVoterIds: { $addToSet: '$voterId' },
          distinctStudentIds: { $addToSet: '$attemptedStudentId' },
          totalAttempts: { $sum: 1 },
          failedAttempts: { $sum: { $cond: ['$success', 0, 1] } },
          firstSeen: { $first: '$createdAt' },
          lastSeen: { $last: '$createdAt' },
        },
      },
      {
        $addFields: {
          distinctVoterCount: {
            $size: { $filter: { input: '$distinctVoterIds', cond: { $ne: ['$$this', null] } } },
          },
        },
      },
      { $match: { distinctVoterCount: { $gte: SUSPICIOUS_VOTER_THRESHOLD } } },
      {
        $lookup: {
          from: 'elections',
          localField: '_id.electionId',
          foreignField: '_id',
          as: 'election',
        },
      },
      { $unwind: { path: '$election', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          electionId: '$_id.electionId',
          electionTitle: '$election.title',
          ip: '$_id.ip',
          distinctVoterCount: 1,
          distinctStudentIds: 1,
          totalAttempts: 1,
          failedAttempts: 1,
          firstSeen: 1,
          lastSeen: 1,
        },
      },
      { $sort: { distinctVoterCount: -1, lastSeen: -1 } },
    ];

    if (search) {
      const regex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      pipeline.push({ $match: { $or: [{ ip: regex }, { electionTitle: regex }] } });
    }

    const allClusters = await VoterLoginAttempt.aggregate(pipeline);

    const total = allClusters.length;
    const skip = (page - 1) * limit;
    const clusters = allClusters.slice(skip, skip + limit);

    return NextResponse.json({
      success: true,
      data: clusters,
      meta: { windowMs: SUSPICIOUS_WINDOW_MS, voterThreshold: SUSPICIOUS_VOTER_THRESHOLD },
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to fetch suspicious activity', details: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}

export const GET = withAuth(getSuspiciousActivity, 'superadmin');
