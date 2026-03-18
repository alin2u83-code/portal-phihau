import React from 'react';
import { useAIStore } from '../../src/store/useAIStore';
import { ALL_AGENTS } from '../../services/agents';

interface TypingIndicatorProps {
  agentName?: string;
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({ agentName }) => {
  const { activeAgentId } = useAIStore();
  const agent = activeAgentId ? ALL_AGENTS.find((a) => a.id === activeAgentId) : null;

  const displayEmoji = agent ? agent.emoji : '🤖';
  const displayName = agent ? agent.name : (agentName || 'Asistent');
  const colorClass = agent ? agent.colorClass : 'bg-slate-700/50';
  const borderClass = agent ? agent.borderColorClass : 'border-slate-600';

  return (
    <div className="flex gap-2 items-end">
      <div
        className={`w-7 h-7 rounded-full flex items-center justify-center text-sm shrink-0 border ${colorClass} ${borderClass}`}
      >
        {displayEmoji}
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-[10px] text-slate-500 ml-1">{displayName} scrie...</span>
        <div className="bg-slate-800 border border-slate-700 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1">
          <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
          <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
          <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" />
        </div>
      </div>
    </div>
  );
};
