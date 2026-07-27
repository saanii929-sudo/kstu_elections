import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import ElectionAgent from '@/models/ElectionAgent';
import { verifyPassword } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const { electionId, candidateName, position, password } = body;

    if (!electionId || !candidateName || !position || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Find the agent assigned to this candidate + position in this election
    const agent = await ElectionAgent.findOne({
      electionId,
      candidates: {
        $elemMatch: {
          candidateName: { $regex: new RegExp(`^${candidateName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
          position: { $regex: new RegExp(`^${position.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
        },
      },
    });

    if (!agent) {
      return NextResponse.json({ success: false, error: 'No agent assigned to this candidate' }, { status: 404 });
    }

    const isValid = await verifyPassword(password, agent.password);

    if (!isValid) {
      return NextResponse.json({ success: false, error: 'Incorrect password' }, { status: 401 });
    }

    return NextResponse.json({ success: true, agentName: agent.name });
  } catch (error: any) {
    console.error('Verify agent password error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
