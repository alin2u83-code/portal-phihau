import React from 'react';
import { ALL_AGENTS } from '../../services/agents';
import { AgentId } from '../../services/agents/types';

interface AgentPanelProps {
  activeAgentId: AgentId | null;
  onSelectAgent: (prompt: string) => void;
  onClose: () => void;
}

export const AgentPanel: React.FC<AgentPanelProps> = ({ activeAgentId, onSelectAgent, onClose }) => {
  const agents = ALL_AGENTS.filter((a) => a.id !== 'general');

  return (
    <div className="absolute inset-0 bg-slate-900 rounded-2xl flex flex-col z-10 animate-fade-in-down">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
        <div>
          <p className="text-white font-bold text-sm">Agenții Disponibili</p>
          <p className="text-slate-500 text-xs">Fiecare agent este specialist în domeniul lui</p>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 text-slate-500 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors text-xs"
        >
          Înapoi
        </button>
      </div>

      {/* Agent list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
        {agents.map((agent) => {
          const isActive = activeAgentId === agent.id;
          return (
            <button
              key={agent.id}
              onClick={() => {
                onSelectAgent(`Vreau să vorbesc cu ${agent.name}. Ce poți face pentru mine?`);
                onClose();
              }}
              className={`w-full flex items-start gap-3 p-3 rounded-xl border transition-all text-left ${
                isActive
                  ? `${agent.colorClass} ${agent.borderColorClass} border`
                  : 'bg-slate-800/60 border-slate-700 hover:border-slate-500 hover:bg-slate-800'
              }`}
            >
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 border ${agent.colorClass} ${agent.borderColorClass}`}
              >
                {agent.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className={`font-semibold text-sm ${isActive ? agent.textColorClass : 'text-white'}`}>
                    {agent.name}
                  </p>
                  {isActive && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${agent.colorClass} ${agent.textColorClass} font-medium border ${agent.borderColorClass}`}>
                      Activ
                    </span>
                  )}
                </div>
                <p className="text-slate-400 text-xs mt-0.5 leading-snug">{agent.description}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* General agent note */}
      <div className="px-4 pb-3 pt-2 border-t border-slate-700">
        <p className="text-xs text-slate-500 text-center">
          🤖 Dacă nu selectezi un agent specific, sistemul alege automat cel mai potrivit
        </p>
      </div>
    </div>
  );
};
