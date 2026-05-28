import { NextResponse } from 'next/server';
import { listPaths, loadSnapshot } from '@/lib/projectStore';

export const runtime = 'nodejs';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const snapshot = await loadSnapshot(id);
    return NextResponse.json({ paths: listPaths(snapshot), updatedAt: snapshot.updatedAt });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 404 });
  }
}

