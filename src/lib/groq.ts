import { createOpenAI } from '@ai-sdk/openai';

export function groqModel(modelId = 'llama-3.1-70b-versatile') {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error(
      'Missing GROQ_API_KEY. Set it in your environment (e.g. Vercel Project Settings → Environment Variables).',
    );
  }

  const groq = createOpenAI({
    apiKey,
    baseURL: 'https://api.groq.com/openai/v1',
  });

  return groq(modelId);
}

