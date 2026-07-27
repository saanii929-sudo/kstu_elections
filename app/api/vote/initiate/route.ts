import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    return NextResponse.json(
      { 
        error: 'This endpoint has been deprecated. Please use /api/public/votes/initialize instead.',
        newEndpoint: '/api/public/votes/initialize'
      },
      { status: 410 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to initiate vote', details: process.env.NODE_ENV === 'development' ? error.message : undefined },
      { status: 500 }
    );
  }
}
