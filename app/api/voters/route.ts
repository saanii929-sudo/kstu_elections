import { NextRequest, NextResponse } from 'next/server';
import { createVoterSchema, updateVoterSchema } from '@/lib/schemas';
import { successResponse, paginatedResponse } from '@/utils/api-response';
import { handleError } from '@/utils/error-handler';

// GET /api/voters?awardId=xxx
export async function GET(req: NextRequest) {
  try {
    const awardId = req.nextUrl.searchParams.get('awardId');
    const page = parseInt(req.nextUrl.searchParams.get('page') || '1');
    const limit = parseInt(req.nextUrl.searchParams.get('limit') || '50');
    
    if (!awardId) {
      return NextResponse.json(
        { success: false, message: 'awardId query parameter is required' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      ""
    );
  } catch (error: any) {
    const { statusCode, message } = handleError(error);
    return NextResponse.json({ success: false, message }, { status: statusCode });
  }
}

// POST /api/voters
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validatedData = createVoterSchema.parse(body);
  
    
    return NextResponse.json(
      successResponse('Voter created successfully'),
      { status: 201 }
    );
  } catch (error: any) {
    const { statusCode, message } = handleError(error);
    return NextResponse.json({ success: false, message }, { status: statusCode });
  }
}
