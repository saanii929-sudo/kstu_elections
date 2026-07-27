import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Voter from '@/models/Voter';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET!;

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    if (!decoded.assignedElections || decoded.assignedElections.length === 0) {
      return NextResponse.json({ error: 'No elections assigned' }, { status: 403 });
    }

    await dbConnect();

    const voters = await Voter.find({
      electionId: { $in: decoded.assignedElections }
    })
      .populate('electionId', 'title')
      .select('-password')
      .sort({ createdAt: -1 });

    return NextResponse.json({
      success: true,
      data: voters,
    });
  } catch (error) {
    console.error('Get voters error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch voters' },
      { status: 500 }
    );
  }
}
