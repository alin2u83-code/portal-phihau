export type AgentId =
  | 'sportivi'
  | 'examene'
  | 'grupe'
  | 'prezenta'
  | 'financiar'
  | 'admin'
  | 'rapoarte'
  | 'legitimatii'
  | 'general';

export interface AgentContext {
  activeView: string;
  userRole: string;
  userName: string;
  clubName?: string;
}

export interface DomainAgent {
  id: AgentId;
  name: string;
  emoji: string;
  colorClass: string;          // Tailwind bg color for badge
  textColorClass: string;      // Tailwind text color for badge
  borderColorClass: string;    // Tailwind border color for badge
  description: string;
  keywords: string[];          // Keywords for auto-routing
  views: string[];             // App views this agent handles
  buildSystemPrompt: (ctx: AgentContext) => string;
}

// Message stored in chat state — extends Anthropic format with agent metadata
export interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
  agentId?: AgentId;
  agentName?: string;
  agentEmoji?: string;
  agentColorClass?: string;
  agentTextColorClass?: string;
}

// What the orchestrator returns
export interface AgentResponse {
  text: string;
  agentId: AgentId;
  agentName: string;
  agentEmoji: string;
  agentColorClass: string;
  agentTextColorClass: string;
}
