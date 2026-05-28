'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

type ChatMsg = { role: 'user' | 'assistant'; content: string };

export default function Home() {
  const [projectId, setProjectId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      role: 'assistant',
      content:
        'Tell me what you want to build. I will create files in a project and you can download the source as a zip.',
    },
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [paths, setPaths] = useState<string[]>([]);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const downloadUrl = useMemo(() => {
    if (!projectId) return null;
    return `/api/projects/${projectId}/download`;
  }, [projectId]);

  async function ensureProject() {
    const cached = window.localStorage.getItem('vibe_project_id');
    if (cached) {
      setProjectId(cached);
      return cached;
    }
    const r = await fetch('/api/projects', { method: 'POST' });
    const j = (await r.json()) as { projectId: string };
    window.localStorage.setItem('vibe_project_id', j.projectId);
    setProjectId(j.projectId);
    return j.projectId;
  }

  async function refreshTree(pid?: string) {
    const id = pid ?? projectId;
    if (!id) return;
    const r = await fetch(`/api/projects/${id}/tree`, { cache: 'no-store' });
    if (!r.ok) return;
    const j = (await r.json()) as { paths: string[] };
    setPaths(j.paths ?? []);
  }

  useEffect(() => {
    void (async () => {
      const pid = await ensureProject();
      await refreshTree(pid);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, busy]);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    setInput('');
    setBusy(true);

    const pid = await ensureProject();
    const nextMessages: ChatMsg[] = [...messages, { role: 'user', content: text }, { role: 'assistant', content: '' }];
    setMessages(nextMessages);

    try {
      const r = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          projectId: pid,
          messages: nextMessages
            .filter((m) => m.content.length > 0 || m.role === 'user')
            .map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!r.ok || !r.body) {
        throw new Error(`Chat failed (${r.status})`);
      }

      const reader = r.body.getReader();
      const decoder = new TextDecoder();
      let acc = '';

      // Stream text chunks
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const copy = [...prev];
          const last = copy[copy.length - 1];
          if (last?.role === 'assistant') last.content = acc;
          return copy;
        });
      }

      await refreshTree(pid);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `Error: ${e instanceof Error ? e.message : String(e)}` },
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-4 p-4 md:grid-cols-[1fr_320px]">
        <div className="rounded-xl bg-white shadow-sm">
          <div className="border-b px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-lg font-semibold">Vibe Coding Agent (Groq + Next.js)</div>
                <div className="text-xs text-zinc-500">
                  Project: {projectId ? projectId : 'creating...'} • Deployable on Vercel
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="rounded-md border px-3 py-1.5 text-sm hover:bg-zinc-50 disabled:opacity-50"
                  onClick={() => refreshTree()}
                  disabled={!projectId}
                >
                  Refresh files
                </button>
                <a
                  className={`rounded-md bg-black px-3 py-1.5 text-sm text-white ${!downloadUrl ? 'pointer-events-none opacity-50' : ''}`}
                  href={downloadUrl ?? '#'}
                >
                  Download zip
                </a>
              </div>
            </div>
          </div>

          <div className="h-[70vh] overflow-auto px-4 py-3">
            <div className="space-y-3">
              {messages.map((m, idx) => (
                <div key={idx} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                  <div
                    className={`max-w-[85%] whitespace-pre-wrap rounded-xl px-3 py-2 text-sm leading-6 ${
                      m.role === 'user' ? 'bg-blue-600 text-white' : 'bg-zinc-100 text-zinc-900'
                    }`}
                  >
                    {m.content || (m.role === 'assistant' && busy && idx === messages.length - 1 ? '…' : '')}
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
          </div>

          <div className="border-t p-3">
            <div className="flex gap-2">
              <input
                className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                placeholder='e.g. "Create a Next.js todo app with Prisma and auth"'
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void send();
                }}
                disabled={busy}
              />
              <button
                className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50"
                onClick={() => void send()}
                disabled={busy}
              >
                Send
              </button>
            </div>
            <div className="mt-2 text-xs text-zinc-500">
              Note: on Vercel, this v1 focuses on file generation + download. Running arbitrary build/test commands
              inside serverless functions is intentionally not enabled.
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-white shadow-sm">
          <div className="border-b px-4 py-3">
            <div className="text-sm font-semibold">Files</div>
            <div className="text-xs text-zinc-500">{paths.length} files</div>
          </div>
          <div className="h-[82vh] overflow-auto p-3">
            <ul className="space-y-1 text-xs">
              {paths.map((p) => (
                <li key={p} className="truncate rounded px-2 py-1 hover:bg-zinc-50" title={p}>
                  {p}
                </li>
              ))}
              {paths.length === 0 ? (
                <li className="text-zinc-500">No files yet (the agent will create them).</li>
              ) : null}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
