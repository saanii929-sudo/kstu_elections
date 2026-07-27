import { NextRequest, NextResponse } from 'next/server';
import { deleteFromR2, extractKeyFromUrl } from '@/lib/r2-upload';
import { withAuth } from '@/middleware/auth';

async function deleteImage(request: NextRequest) {
  try {
    const { url, key } = await request.json();

    if (!url && !key) {
      return NextResponse.json(
        { error: 'URL or key is required' },
        { status: 400 }
      );
    }
    const fileKey = key || extractKeyFromUrl(url);

    await deleteFromR2(fileKey);

    return NextResponse.json({
      success: true,
      message: 'File deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete file' },
      { status: 500 }
    );
  }
}

export const DELETE = withAuth(deleteImage);
