import { NextRequest, NextResponse } from 'next/server';
import {
  uploadToR2,
  generateFileKey,
  validateFileType,
  validateFileSize,
} from '@/lib/r2-upload';
import { withAuth } from '@/middleware/auth';

const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024;

async function uploadImage(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const rawFolder = (formData.get('folder') as string || 'images');
    // Sanitize folder to prevent path traversal
    const folder = rawFolder.replace(/\.\./g, '').replace(/[^a-zA-Z0-9/_-]/g, '');

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!validateFileType(file.type, ALLOWED_IMAGE_TYPES)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only images are allowed.' },
        { status: 400 }
      );
    }

    if (!validateFileSize(file.size, MAX_FILE_SIZE)) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB.' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const key = generateFileKey(file.name, folder);

    const url = await uploadToR2(buffer, key, file.type);

    return NextResponse.json({
      success: true,
      url,
      key,
      size: file.size,
      type: file.type,
    });
  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload file' },
      { status: 500 }
    );
  }
}

export const POST = withAuth(uploadImage);
