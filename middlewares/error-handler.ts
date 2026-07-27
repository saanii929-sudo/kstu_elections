import { NextResponse } from 'next/server';
import { handleError, AppError } from '@/utils/error-handler';

export const errorHandlerMiddleware = (handler: Function) => {
  return async (req: any, res: any) => {
    try {
      return await handler(req, res);
    } catch (error: any) {
      const { statusCode, message } = handleError(error);
      return NextResponse.json(
        { success: false, message },
        { status: statusCode }
      );
    }
  };
};
