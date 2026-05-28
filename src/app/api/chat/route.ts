import { streamText, createTextStreamResponse, type CoreMessage } from 'ai';
import { z } from 'zod';
import { groqModel } from '@/lib/groq';
import { loadSnapshot, saveSnapshot } from '@/lib/projectStore';
import { createProjectTools } from '@/lib/agentTools';

export const runtime = 'nodejs';

const BodySchema = z.object({
  projectId: z.string().min(1),
  messages: z
    .array(
      z.object({
        role: z.enum(['system', 'user', 'assistant', 'tool']),
        content: z.any(),
      }),
    )
    .min(1),
});

export async function POST(req: Request) {
  const json = await req.json();
  const body = BodySchema.parse(json);

  const snapshot = await loadSnapshot(body.projectId);
  const tools = createProjectTools({ snapshot });

  const result = streamText({
    model: groqModel(),
    system: [
      'You are a "vibe coding" software agent.',
      'Your job is to create and edit a codebase in the provided project using tools.',
      'Rules:',
      '- Use the tools to read/search files before making changes.',
      '- Prefer small, targeted edits. Avoid rewriting large files.',
      '- Do not dump entire file contents in chat unless explicitly asked; summarize instead.',
      '- If you create a new project, include package.json, README, and a clear run command.',
      '- When done, briefly explain what you changed and how to run it.',
      '',
      'You have tools:',
      '- list_files(prefix?)',
      '- read_file(path)',
      '- write_file(path, content)',
      '- delete_file(path)',
      '- search(query, prefix?)',
    ].join('\n'),
    messages: body.messages as CoreMessage[],
    tools,
    maxRetries: 1,
    // keep the agent from looping forever
    stopWhen: ({ steps }) => steps.length >= 8,
    onFinish: async () => {
      await saveSnapshot(body.projectId, snapshot);
    },
  });

  return createTextStreamResponse({ textStream: result.textStream });
}

