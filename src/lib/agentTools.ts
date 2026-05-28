import { z } from 'zod';
import { tool, type ToolSet, zodSchema } from 'ai';
import type { ProjectSnapshot } from './projectStore';

export function createProjectTools(opts: {
  snapshot: ProjectSnapshot;
  maxFileSizeChars?: number;
}): ToolSet {
  const maxFileSizeChars = opts.maxFileSizeChars ?? 200_000;

  function assertPath(path: string) {
    if (!path || path.includes('..') || path.startsWith('/') || path.includes('\\')) {
      throw new Error('Invalid path');
    }
  }

  return {
    list_files: tool({
      description: 'List files in the project (flat list of paths).',
      inputSchema: zodSchema(
        z.object({
          prefix: z.string().optional().describe('Optional path prefix filter'),
        }),
      ),
      execute: async ({ prefix }) => {
        const paths = Object.keys(opts.snapshot.files).sort();
        return prefix ? paths.filter((p) => p.startsWith(prefix)) : paths;
      },
    }),

    read_file: tool({
      description: 'Read a UTF-8 text file from the project.',
      inputSchema: zodSchema(
        z.object({
          path: z.string(),
        }),
      ),
      execute: async ({ path }) => {
        assertPath(path);
        const content = opts.snapshot.files[path];
        if (content == null) throw new Error('File not found');
        return content.length > maxFileSizeChars
          ? content.slice(0, maxFileSizeChars) + '\n\n/* TRUNCATED */\n'
          : content;
      },
    }),

    write_file: tool({
      description: 'Create or overwrite a UTF-8 text file.',
      inputSchema: zodSchema(
        z.object({
          path: z.string(),
          content: z.string(),
        }),
      ),
      execute: async ({ path, content }) => {
        assertPath(path);
        if (content.length > maxFileSizeChars) {
          throw new Error(`Refusing to write very large file (> ${maxFileSizeChars} chars) in v1`);
        }
        opts.snapshot.files[path] = content;
        return { ok: true, path, size: content.length };
      },
    }),

    delete_file: tool({
      description: 'Delete a file if it exists.',
      inputSchema: zodSchema(
        z.object({
          path: z.string(),
        }),
      ),
      execute: async ({ path }) => {
        assertPath(path);
        const existed = Object.prototype.hasOwnProperty.call(opts.snapshot.files, path);
        delete opts.snapshot.files[path];
        return { ok: true, path, existed };
      },
    }),

    search: tool({
      description: 'Search for a substring across files (best-effort line numbers).',
      inputSchema: zodSchema(
        z.object({
          query: z.string(),
          prefix: z.string().optional(),
          maxResults: z.number().int().min(1).max(200).optional(),
        }),
      ),
      execute: async ({ query, prefix, maxResults }) => {
        const limit = maxResults ?? 50;
        const results: Array<{ path: string; line: number; preview: string }> = [];
        const paths = Object.keys(opts.snapshot.files).sort();

        for (const p of paths) {
          if (prefix && !p.startsWith(prefix)) continue;
          const content = opts.snapshot.files[p];
          if (!content) continue;
          if (!content.includes(query)) continue;

          const lines = content.split('\n');
          for (let i = 0; i < lines.length; i++) {
            if (lines[i]?.includes(query)) {
              results.push({ path: p, line: i + 1, preview: lines[i].slice(0, 300) });
              if (results.length >= limit) return results;
            }
          }
        }
        return results;
      },
    }),
  };
}
