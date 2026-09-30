import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const folderId = searchParams.get('folderId') || null;
  const userId = searchParams.get('userId') || 'default-demo-user';

  try {
    const folders = await prisma.folder.findMany({
      where: {
        userId,
        parentId: folderId,
        isTrashed: false,
      },
      orderBy: { name: 'asc' },
    });

    const files = await prisma.file.findMany({
      where: {
        userId,
        folderId: folderId,
        isTrashed: false,
      },
      orderBy: { createdAt: 'desc' },
    });

    const serializedFiles = files.map(file => ({
      ...file,
      sizeBytes: file.sizeBytes.toString(),
    }));

    return NextResponse.json({ folders, files: serializedFiles });
  } catch (error) {
    console.error('Fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 });
  }
}
