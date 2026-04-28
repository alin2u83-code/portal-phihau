export interface KnowledgeChunk {
  id: string;
  title: string;
  content: string;
  category: string;
  source?: string;
  similarity: number;
}

export interface RAGSearchOptions {
  category?: string;
  matchCount?: number;
  matchThreshold?: number;
}

export async function searchKnowledgeBase(
  query: string,
  options: RAGSearchOptions = {}
): Promise<KnowledgeChunk[]> {
  if (!query || query.trim().length < 5) return [];

  try {
    const response = await fetch('/api/rag-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: query.trim(),
        category: options.category,
        matchCount: options.matchCount ?? 4,
        matchThreshold: options.matchThreshold ?? 0.60,
      }),
    });

    if (!response.ok) return [];

    const data = await response.json();
    const results: KnowledgeChunk[] = data.results ?? [];

    if (results.length > 0) {
      console.debug(`[RAG] ${results.length} chunks found for: "${query.slice(0, 60)}"`);
    }

    return results;
  } catch {
    return [];
  }
}

export function formatRAGContext(chunks: KnowledgeChunk[]): string {
  if (chunks.length === 0) return '';

  const body = chunks
    .map((c) => `### ${c.title}\n${c.content}`)
    .join('\n\n');

  return `\n\n---\nINFORMAȚII RELEVANTE DIN BAZA DE CUNOȘTINȚE A APLICAȚIEI:\n${body}\n---\nFolosește aceste informații pentru a oferi răspunsuri precise și concrete.`;
}
