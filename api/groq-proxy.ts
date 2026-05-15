import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Groq API key not configured' });
  }

  const { messages, system } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Invalid messages format' });
  }

  const allMessages = [
    ...(system ? [{ role: 'system', content: system }] : []),
    ...messages,
  ];

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 2048,
        messages: allMessages,
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error('[groq-proxy] API error:', response.status, errBody);
      return res.status(response.status).json({ error: `Eroare API Groq (${response.status}): ${errBody}` });
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content;
    if (!text) {
      return res.status(500).json({ error: 'Răspuns invalid de la Groq' });
    }

    return res.status(200).json({ text });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
