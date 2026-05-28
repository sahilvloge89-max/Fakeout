## Vibe Coding Agent (Groq + Next.js, Vercel-friendly)

This is a minimal “vibe coding” web agent inspired by emergent.sh:
- Chat UI
- Groq-backed tool calling (read/search/write files)
- Persistent project snapshot using **Vercel Blob**
- **Download zip** button for the generated source

## Getting Started

### 1) Configure environment variables

Create `.env.local`:

```bash
GROQ_API_KEY=your_groq_key
BLOB_READ_WRITE_TOKEN=your_vercel_blob_token
```

On Vercel, set these in **Project Settings → Environment Variables**.

### 2) Run locally

Run the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Deploy on Vercel (free plan compatible)

1. Push this repo to GitHub
2. Import it into Vercel
3. Add `GROQ_API_KEY` + `BLOB_READ_WRITE_TOKEN`
4. Deploy

### Notes / limitations (important)

- This v1 focuses on **file generation + download**.
- Running arbitrary build/test commands inside Vercel serverless functions is intentionally not enabled (it’s a security + runtime limitation).
- The project snapshot is stored as a single JSON blob (UTF-8 text files). For very large projects (e.g., 1500+ files / huge total size), you’ll want a more scalable storage scheme (per-file blobs + manifest) and/or a paid plan / external storage.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

If you want the “1500+ files” version with indexing + per-file storage + diff approvals, ask and I’ll extend this template.
