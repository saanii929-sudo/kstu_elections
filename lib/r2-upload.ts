import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Initialize R2 client
const r2Client = new S3Client({
  region: process.env.R2_REGION || 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const BUCKET_NAME = process.env.R2_BUCKET_NAME!;
const PUBLIC_URL = process.env.R2_PUBLIC_URL || process.env.R2_ENDPOINT;


export async function uploadToR2(
  file: Buffer,
  key: string,
  contentType: string
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: file,
    ContentType: contentType,
  });

  try {
    await r2Client.send(command);
  } catch (error: any) {
    console.error('R2 upload failed:', error?.message || error);
    throw new Error(`R2 upload failed: ${error?.message || 'unknown error'}`);
  }

  return `${PUBLIC_URL}/${key}`;
}

export async function deleteFromR2(key: string): Promise<void> {
  try {
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    await r2Client.send(command);
  } catch (error) {
    throw new Error('Failed to delete file from R2');
  }
}

export async function getPresignedUrl(
  key: string,
  expiresIn: number = 3600
): Promise<string> {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    const url = await getSignedUrl(r2Client, command, { expiresIn });
    return url;
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    throw new Error('Failed to generate presigned URL');
  }
}

/**
 * Generate a unique file key with timestamp and random string
 * @param originalName - Original filename
 * @param folder - Optional folder path
 * @returns Unique file key
 */
export function generateFileKey(originalName: string, folder?: string): string {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 15);
  const extension = originalName.split('.').pop();
  const sanitizedName = originalName
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .substring(0, 50);
  
  const key = folder
    ? `${folder}/${timestamp}-${randomString}-${sanitizedName}`
    : `${timestamp}-${randomString}-${sanitizedName}`;
  
  return key;
}

/**
 * Extract file key from R2 URL
 * @param url - Full R2 URL
 * @returns File key
 */
export function extractKeyFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.pathname.substring(1); // Remove leading slash
  } catch (error) {
    // If URL parsing fails, assume it's already a key
    return url;
  }
}

/**
 * Validate file type
 * @param contentType - MIME type
 * @param allowedTypes - Array of allowed MIME types
 * @returns boolean
 */
export function validateFileType(
  contentType: string,
  allowedTypes: string[]
): boolean {
  return allowedTypes.some(type => {
    if (type.endsWith('/*')) {
      const baseType = type.split('/')[0];
      return contentType.startsWith(baseType + '/');
    }
    return contentType === type;
  });
}

/**
 * Validate file size
 * @param size - File size in bytes
 * @param maxSize - Maximum allowed size in bytes
 * @returns boolean
 */
export function validateFileSize(size: number, maxSize: number): boolean {
  return size <= maxSize;
}
