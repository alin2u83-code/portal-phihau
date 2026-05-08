import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

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

  const secret = req.headers['x-index-secret'];
  if (!process.env.RAG_INDEX_SECRET || secret !== process.env.RAG_INDEX_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { title, content, category = 'general', source, metadata } = req.body ?? {};
  if (!title || !content) {
    return res.status(400).json({ error: 'title and content are required' });
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!geminiKey || !supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Missing server env vars' });
  }

  try {
    const embedding = await generateEmbedding(content, geminiKey);

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data, error } = await supabase
      .from('knowledge_base')
      .insert({
        title,
        content,
        embedding,
        category,
        source: source ?? null,
        metadata: metadata ?? {},
      })
      .select('id')
      .single();

    if (error) throw error;

    return res.json({ id: data.id, success: true });
  } catch (err: any) {
    console.error('[rag-index] error:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
