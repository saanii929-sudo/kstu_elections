import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import ElectionAgent from '@/models/ElectionAgent';
import Election from '@/models/Election';
import { verifyToken, hashPassword } from '@/lib/auth';
import { sendSms } from '@/services/sms.service';

function generatePassword(): string {
  const uppercase = 'ABCDEFGHJKMNPQRSTUVWXYZ';
  const lowercase = 'abcdefghjkmnpqrstuvwxyz';
  const numbers = '23456789';
  const allChars = uppercase + lowercase + numbers;

  let password = '';
  password += uppercase.charAt(Math.floor(Math.random() * uppercase.length));
  password += lowercase.charAt(Math.floor(Math.random() * lowercase.length));
  password += numbers.charAt(Math.floor(Math.random() * numbers.length));

  for (let i = 0; i < 5; i++) {
    password += allChars.charAt(Math.floor(Math.random() * allChars.length));
  }

  return password.split('').sort(() => Math.random() - 0.5).join('');
}

export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'organization') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const electionId = req.nextUrl.searchParams.get('electionId');
    if (!electionId) {
      return NextResponse.json({ error: 'electionId is required' }, { status: 400 });
    }

    const agents = await ElectionAgent.find({
      electionId,
      organizationId: decoded.id,
    }).select('-password').sort({ createdAt: -1 });

    return NextResponse.json({ success: true, data: agents });
  } catch (error: any) {
    console.error('GET agents error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'organization') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { name, phone, candidates, electionId } = body;

    if (!name || !phone || !electionId || !Array.isArray(candidates) || candidates.length === 0) {
      return NextResponse.json(
        { error: 'name, phone, electionId and at least one candidate are required' },
        { status: 400 }
      );
    }

    const election = await Election.findOne({ _id: electionId, organizationId: decoded.id });
    if (!election) {
      return NextResponse.json({ error: 'Election not found' }, { status: 404 });
    }

    const plainPassword = generatePassword();
    const hashedPassword = await hashPassword(plainPassword);

    const agent = await ElectionAgent.create({
      name,
      phone,
      electionId,
      organizationId: decoded.id,
      candidates,
      password: hashedPassword,
    });

    // Send SMS with credentials
    const smsMessage =
      `PawaVotes Agent Credentials\n` +
      `Election: ${election.title}\n` +
      `Agent: ${name}\n` +
      `Password: ${plainPassword}\n` +
      `Use this password when signing candidate forms.`;

    const smsResult = await sendSms({ to: phone, message: smsMessage, senderId: 'PAWAVOTES' });

    return NextResponse.json({
      success: true,
      data: {
        _id: agent._id,
        name: agent.name,
        phone: agent.phone,
        candidates: agent.candidates,
        electionId: agent.electionId,
        createdAt: agent.createdAt,
      },
      smsSent: smsResult.success,
    });
  } catch (error: any) {
    console.error('POST agents error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await connectDB();

    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'organization') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const agentId = req.nextUrl.searchParams.get('agentId');
    if (!agentId) return NextResponse.json({ error: 'agentId is required' }, { status: 400 });

    await ElectionAgent.deleteOne({ _id: agentId, organizationId: decoded.id });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('DELETE agents error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
