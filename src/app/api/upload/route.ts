import { NextRequest, NextResponse } from 'next/server';
import { generateUploadUrl } from '@/lib/s3';
import { prisma } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { fileName, fileType, fileSize, folderId, userId } = await req.json();

    if (!fileName || !fileSize || !userId) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const s3Key = `users/${userId}/${Date.now()}-${fileName}`;
    const uploadUrl = await generateUploadUrl(s3Key, fileType);

    const fileRecord = await prisma.file.create({
      data: {
        name: fileName,
        s3Key: s3Key,
        mimeType: fileType,
        sizeBytes: BigInt(fileSize),
        userId: userId,
        folderId: folderId || null,
      },
    });

    await prisma.user.update({
      where: { id: userId },
      data: {
        storageUsed: {
          increment: BigInt(fileSize),
        },
      },
    });

    return NextResponse.json({
      uploadUrl,
      file: {
        ...fileRecord,
        sizeBytes: fileRecord.sizeBytes.toString(),
      },
    });
  } catch (error) {
    console.error('Upload init error:', error);
    return NextResponse.json({ error: 'Failed to generate upload URL' }, { status: 500 });
  }
}
