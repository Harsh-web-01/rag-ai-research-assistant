import { NextResponse } from 'next/server';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

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

    const formData = await request.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const key = file.name;

    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: Buffer.from(bytes),
        ContentType: file.type || 'application/pdf',
      })
    );

    return NextResponse.json({ ok: true, key });
  } catch (error) {
    console.error('Direct upload error:', error);
    const message =
      error instanceof Error && error.message.includes('credentials')
        ? 'AWS credentials not found. Configure ~/.aws/credentials or AWS env vars.'
        : 'Could not upload file to S3 from server. Check credentials, region, and bucket.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
