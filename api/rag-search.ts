import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { checkRateLimit, getClientIp } from './_rateLimit';

async function generateEmbedding(text: string, apiKey: string): Promise<number[]> {
  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: { parts: [{ text }] }, outputDimensionality: 1536 }),
    }
  );
  if (!resp.ok) {
    const body = await resp.text();
    throw new Error(`Gemini embedding ${resp.status}: ${body}`);
  }
  const data = await resp.json();
  return data.embedding.values as number[];
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const ip = getClientIp(req);
  const rl = checkRateLimit(`rag-search:${ip}`, { maxRequests: 30, windowMs: 60_000 });
  if (!rl.allowed) {
    return res.status(429).json({ error: 'Prea multe cereri. Încearcă din nou în câteva minute.' });
  }

  const { query, category, matchCount = 4, matchThreshold = 0.60 } = req.body ?? {};
  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'query string required' });
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!geminiKey || !supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Missing server env vars' });
  }

  try {
    const embedding = await generateEmbedding(query.trim(), geminiKey);

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data, error } = await supabase.rpc('match_knowledge_base', {
      query_embedding: embedding,
      match_threshold: matchThreshold,
      match_count: matchCount,
      filter_category: category ?? null,
    });

    if (error) throw error;

    return res.json({ results: data ?? [] });
  } catch (err: any) {
    console.error('[rag-search] error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
