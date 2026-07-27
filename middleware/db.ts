import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';

export function withDB(handler: Function) {
  return async (req: NextRequest, context?: any) => {
    try {
      await connectDB();
      return handler(req, context);
    } catch (error) {
      return NextResponse.json(
        { error: 'Database connection failed' },
        { status: 500 }
      );
    }
  };
}
