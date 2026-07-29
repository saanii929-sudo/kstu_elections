import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import PinkSheet from '@/models/PinkSheet';
import { verifyToken } from '@/lib/auth';
import { isElectionManager, getAccessibleElection } from '@/lib/electionAccess';

// GET /api/elections/pinksheet?electionId=xxx
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const decoded = verifyToken(token);
    if (!isElectionManager(decoded)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const electionId = searchParams.get('electionId');
    if (!electionId) return NextResponse.json({ error: 'electionId is required' }, { status: 400 });

    const election = await getAccessibleElection(decoded, electionId);
    if (!election) return NextResponse.json({ error: 'Election not found' }, { status: 404 });

    // PinkSheet.organizationId always reflects the election's real owning
    // organization, not the caller's own id — matters for an electionAdmin,
    // whose id isn't an Organization id at all.
    const sheet = await PinkSheet.findOne({ electionId, organizationId: election.organizationId });

    return NextResponse.json({
      success: true,
      data: {
        signatures: sheet?.signatures ?? {},
        dates: sheet?.dates ?? {},
        decisions: sheet?.decisions ?? {},
      },
    });
  } catch (error) {
    console.error('PinkSheet GET error:', error);
    return NextResponse.json({ error: 'Failed to load pink sheet' }, { status: 500 });
  }
}

// PUT /api/elections/pinksheet — upsert signatures and/or dates
export async function PUT(req: NextRequest) {
  try {
    await connectDB();

    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const decoded = verifyToken(token);
    if (!isElectionManager(decoded)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { electionId, signatures, dates, decisions } = body;

    if (!electionId) return NextResponse.json({ error: 'electionId is required' }, { status: 400 });

    const election = await getAccessibleElection(decoded, electionId);
    if (!election) return NextResponse.json({ error: 'Election not found' }, { status: 404 });

    // Use findOneAndUpdate with upsert. For Schema.Types.Mixed fields, we must
    // mark modified explicitly, so we use replace-style upsert instead of $set.
    // organizationId comes from the loaded election (its real owner), not
    // decoded.id — an electionAdmin's id isn't an Organization id, and a
    // fresh upsert needs organizationId to satisfy the schema's required field.
    const sheet = await PinkSheet.findOneAndUpdate(
      { electionId, organizationId: election.organizationId },
      {
        $set: {
          ...(signatures !== undefined && { signatures }),
          ...(dates !== undefined && { dates }),
          ...(decisions !== undefined && { decisions }),
        },
      },
      { upsert: true, new: true }
    );

    // Mixed fields need markModified to guarantee Mongoose flushes the change
    if (signatures !== undefined) sheet.markModified('signatures');
    if (dates !== undefined) sheet.markModified('dates');
    if (decisions !== undefined) sheet.markModified('decisions');
    await sheet.save();

    return NextResponse.json({ success: true, data: { id: sheet._id } });
  } catch (error) {
    console.error('PinkSheet PUT error:', error);
    return NextResponse.json({ error: 'Failed to save pink sheet' }, { status: 500 });
  }
}

// DELETE /api/elections/pinksheet?electionId=xxx — clear all signatures and dates
export async function DELETE(req: NextRequest) {
  try {
    await connectDB();

    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const decoded = verifyToken(token);
    if (!isElectionManager(decoded)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const electionId = searchParams.get('electionId');
    if (!electionId) return NextResponse.json({ error: 'electionId is required' }, { status: 400 });

    const election = await getAccessibleElection(decoded, electionId);
    if (!election) return NextResponse.json({ error: 'Election not found' }, { status: 404 });

    const sheet = await PinkSheet.findOne({ electionId, organizationId: election.organizationId });
    if (sheet) {
      sheet.signatures = {};
      sheet.dates = {};
      sheet.decisions = {};
      sheet.markModified('signatures');
      sheet.markModified('dates');
      sheet.markModified('decisions');
      await sheet.save();
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PinkSheet DELETE error:', error);
    return NextResponse.json({ error: 'Failed to clear pink sheet' }, { status: 500 });
  }
}
