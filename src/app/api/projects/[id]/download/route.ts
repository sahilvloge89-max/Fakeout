import archiver from 'archiver';
import { PassThrough, Readable } from 'node:stream';
import { loadSnapshot } from '@/lib/projectStore';

export const runtime = 'nodejs';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const snapshot = await loadSnapshot(id);

  const archive = archiver('zip', { zlib: { level: 9 } });
  const passthrough = new PassThrough();
  archive.pipe(passthrough);

  // Add files
  for (const [path, content] of Object.entries(snapshot.files)) {
    archive.append(content, { name: path });
  }

  // Finalize async
  void archive.finalize();

  const webStream = Readable.toWeb(passthrough) as unknown as ReadableStream;

  return new Response(webStream, {
    headers: {
      'content-type': 'application/zip',
      'content-disposition': `attachment; filename="project-${id}.zip"`,
      'cache-control': 'no-store',
    },
  });
}

