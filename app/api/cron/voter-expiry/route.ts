import { NextRequest, NextResponse } from 'next/server';
import { processDueElectionVoterExpiry } from '@/lib/scheduledVoterExpiry';

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error('CRON_SECRET is not configured — /api/cron/voter-expiry is disabled.');
    return NextResponse.json({ error: 'Cron endpoint not configured' }, { status: 503 });
  }

  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await processDueElectionVoterExpiry();
    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    console.error('Cron voter-expiry sweep failed:', error);
    return NextResponse.json(
      { error: 'Sweep failed', details: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}
