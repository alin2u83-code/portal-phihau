import { DomainAgent, AgentContext, AgentResponse, AgentId } from './types';
import { sportiviAgent } from './sportiviAgent';
import { exameneAgent } from './exameneAgent';
import { grupeAgent } from './grupeAgent';
import { prezentaAgent } from './prezentaAgent';
import { financiarAgent } from './financiarAgent';
import { adminAgent } from './adminAgent';
import { rapoarteAgent } from './rapoarteAgent';
import { legitimatiiAgent } from './legitimatiiAgent';
import { generalAgent } from './generalAgent';
import { searchKnowledgeBase, formatRAGContext } from '../ragService';

// All domain agents registered in priority order
export const ALL_AGENTS: DomainAgent[] = [
  sportiviAgent,
  exameneAgent,
  grupeAgent,
  prezentaAgent,
  financiarAgent,
  adminAgent,
  rapoarteAgent,
  legitimatiiAgent,
  generalAgent,
];

// View → agent mapping (strongest routing signal)
const VIEW_TO_AGENT_ID: Record<string, AgentId> = {
  sportivi: 'sportivi',
  'import-sportivi': 'sportivi',
  'profil-sportiv': 'sportivi',
  'fisa-digitala': 'sportivi',
  'fisa-competitie': 'sportivi',
  examene: 'examene',
  'inscrierii-examene': 'examene',
  'gestiune-examene': 'examene',
  grupe: 'grupe',
  stagii: 'grupe',
  competitii: 'grupe',
  prezenta: 'prezenta',
  'prezenta-instructor': 'prezenta',
  'istoric-prezenta': 'prezenta',
  'plati-scadente': 'financiar',
  'taxe-anuale': 'financiar',
  'raport-financiar': 'financiar',
  'jurnal-incasari': 'financiar',
  'istoric-plati': 'financiar',
  'user-management': 'admin',
  'setari-club': 'admin',
  'structura-federatie': 'admin',
  'data-maintenance': 'admin',
  notificari: 'admin',
  'account-settings': 'admin',
  rapoarte: 'rapoarte',
  dashboard: 'rapoarte',
  'admin-dashboard': 'rapoarte',
  'federation-dashboard': 'rapoarte',
  legitimatii: 'legitimatii',
};

function getAgentById(id: AgentId): DomainAgent {
  return ALL_AGENTS.find((a) => a.id === id) ?? generalAgent;
}

/**
 * Selects the best agent for a given message and active view.
 * Priority: 1. View-based routing (strongest), 2. Keyword matching, 3. General fallback
 */
export function selectAgent(message: string, activeView: string): DomainAgent {
  // 1. View-based routing — strongest signal
  const viewAgentId = VIEW_TO_AGENT_ID[activeView];
  if (viewAgentId) return getAgentById(viewAgentId);

  // 2. Keyword-based routing
  const lower = message.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, ''); // remove diacritics for matching

  let bestAgent: DomainAgent | null = null;
  let bestScore = 0;

  for (const agent of ALL_AGENTS) {
    if (agent.id === 'general') continue;
    const score = agent.keywords.filter((kw) => lower.includes(kw)).length;
    if (score > bestScore) {
      bestScore = score;
      bestAgent = agent;
    }
  }

  if (bestAgent && bestScore > 0) return bestAgent;

  // 3. Fallback to general agent
  return generalAgent;
}

/**
 * Main orchestrator function.
 * Routes the conversation to the appropriate domain agent and returns its response.
 */
export async function orchestrate(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  context: AgentContext
): Promise<AgentResponse> {
  // Get the latest user message for routing
  const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user')?.content ?? '';

  // Select agent
  const agent = selectAgent(lastUserMessage, context.activeView);

  // Build system prompt + fetch RAG context in parallel
  const [systemPrompt, ragChunks] = await Promise.all([
    Promise.resolve(agent.buildSystemPrompt(context)),
    searchKnowledgeBase(lastUserMessage, {
      category: agent.id === 'general' ? undefined : agent.id,
      matchCount: 3,
    }),
  ]);

  const enrichedSystemPrompt = systemPrompt + formatRAGContext(ragChunks);

  // Call Claude via proxy
  const response = await fetch('/api/claude-proxy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages,
      system: enrichedSystemPrompt,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || `Eroare server: ${response.status}`);
  }

  const data = await response.json();
  const text = data.content?.[0]?.text;
  if (!text) throw new Error('Răspuns invalid de la server');

  return {
    text,
    agentId: agent.id,
    agentName: agent.name,
    agentEmoji: agent.emoji,
    agentColorClass: agent.colorClass,
    agentTextColorClass: agent.textColorClass,
  };
}

export { getAgentById };
