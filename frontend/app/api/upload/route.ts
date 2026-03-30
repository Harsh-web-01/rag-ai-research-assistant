import { NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({ region: process.env.AWS_REGION || 'ap-south-1' });

export async function POST(request: Request) {
  try {
    const bucket = process.env.S3_BUCKET_NAME || process.env.NEXT_PUBLIC_S3_BUCKET;
    if (!bucket) {
      return NextResponse.json(
        { error: 'S3_BUCKET_NAME (or NEXT_PUBLIC_S3_BUCKET) is not set. Add it to .env.local.' },
        { status: 500 }
      );
    }

    const { filename, contentType } = await request.json();

    if (!filename) {
      return NextResponse.json({ error: 'Filename is required' }, { status: 400 });
    }

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: filename,
      ContentType: contentType || 'application/pdf',
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

    return NextResponse.json({ url });
  } catch (error) {
    console.error('Error generating presigned URL:', error);
    const message =
      error instanceof Error && error.message.includes('credentials')
        ? 'AWS credentials not found. Configure ~/.aws/credentials or AWS env vars.'
        : 'Error generating presigned URL. Check AWS credentials and bucket name.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
