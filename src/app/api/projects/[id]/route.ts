import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { createEmptyProject } from '@/lib/projectStore';

export const runtime = 'nodejs';

export async function POST() {
  const projectId = nanoid(16);
  await createEmptyProject(projectId);
  return NextResponse.json({ projectId });
}


