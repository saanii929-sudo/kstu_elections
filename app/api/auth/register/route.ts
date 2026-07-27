import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/services/auth.service';
import { organizationRegistrationSchema } from '@/lib/schemas';
import { successResponse } from '@/utils/api-response';
import { handleError } from '@/utils/error-handler';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  try {
    // Rate limit: 3 registrations per 15 minutes per IP
    const ip = getClientIp(req.headers);
    const rl = checkRateLimit(`register:${ip}`, 3, 15 * 60 * 1000);
    if (!rl.allowed) {
      return NextResponse.json(
        { success: false, message: `Too many attempts. Try again in ${rl.resetIn} seconds.` },
        { status: 429 }
      );
    }

    const body = await req.json();
    const validatedData = organizationRegistrationSchema.parse(body);
    
    const result = await authService.registerOrganization(validatedData);
    
    return NextResponse.json(
      successResponse('Organization registered successfully', result),
      { status: 201 }
    );
  } catch (error: any) {
    const { statusCode, message } = handleError(error);
    return NextResponse.json({ success: false, message }, { status: statusCode });
  }
}
