import React, { useRef, useEffect, useState } from 'react';
import { useAIStore } from '../../src/store/useAIStore';
import { useAIAssistant } from '../../contexts/AIAssistantContext';
import { ChatMessage } from './ChatMessage';
import { TypingIndicator } from './TypingIndicator';
import { QuickActions } from './QuickActions';
import { AgentPanel } from './AgentPanel';
import { BotIcon, XIcon, SendIcon, SparklesIcon, Minimize2Icon } from '../icons';
import { ALL_AGENTS } from '../../services/agents';

interface AIAssistantWidgetProps {
  activeRole: string;
}

export const AIAssistantWidget: React.FC<AIAssistantWidgetProps> = ({ activeRole }) => {
  const { isOpen, setIsOpen, messages, isLoading, clearMessages, activeAgentId } = useAIStore();
  const { sendMessage, startTutorial } = useAIAssistant();
  const [input, setInput] = useState('');
  const [showAgentPanel, setShowAgentPanel] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentAgent = activeAgentId ? ALL_AGENTS.find((a) => a.id === activeAgentId) : null;

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      if (!showAgentPanel) setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, messages, showAgentPanel]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;
    setInput('');
    setShowAgentPanel(false);
    await sendMessage(text);
  };

  const handleQuickAction = async (prompt: string) => {
    setShowAgentPanel(false);
    await sendMessage(prompt);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="fixed bottom-[72px] right-4 md:bottom-12 md:right-6 z-[8000] flex flex-col items-end gap-3">
      {/* Chat panel — se deschide deasupra butonului (mobil: FAB, desktop: buton din footer) */}
      {isOpen && (
        <div className="w-[calc(100vw-2rem)] sm:w-80 md:w-96 h-[min(460px,calc(100dvh-200px))] md:h-[520px] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl shadow-black/50 flex flex-col overflow-hidden animate-fade-in-down relative">

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/80 bg-slate-800/80 backdrop-blur shrink-0">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center text-base border transition-all ${
                  currentAgent
                    ? `${currentAgent.colorClass} ${currentAgent.borderColorClass}`
                    : 'bg-indigo-600/20 border-indigo-500/30'
                }`}
              >
                {currentAgent ? currentAgent.emoji : <BotIcon className="w-4 h-4 text-indigo-400" />}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold text-white">
                    {currentAgent ? currentAgent.name : 'Asistent AI'}
                  </span>
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                </div>
                <p className="text-[10px] text-slate-500">
                  {currentAgent ? currentAgent.description : '8 agenți specializați • Powered by Claude'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {/* Tutorial button */}
              <button
                onClick={() => { setIsOpen(false); startTutorial(); }}
                className="p-1.5 text-slate-500 hover:text-slate-300 hover:bg-slate-700/50 rounded-lg transition-colors"
                title="Pornește tutorialul"
              >
                <SparklesIcon className="w-3.5 h-3.5" />
              </button>
              {messages.length > 0 && (
                <button
                  onClick={() => { clearMessages(); setShowAgentPanel(false); }}
                  className="p-1.5 text-slate-500 hover:text-slate-300 hover:bg-slate-700/50 rounded-lg transition-colors text-xs"
                  title="Conversație nouă"
                >
                  Nou
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-slate-500 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
              >
                <Minimize2Icon className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Agent Panel (overlay) */}
          {showAgentPanel && (
            <AgentPanel
              activeAgentId={activeAgentId}
              onSelectAgent={handleQuickAction}
              onClose={() => setShowAgentPanel(false)}
            />
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-4">
                <div className="w-14 h-14 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center">
                  <SparklesIcon className="w-7 h-7 text-indigo-400" />
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">Cum te pot ajuta?</p>
                  <p className="text-slate-400 text-xs mt-1">
                    Am <span className="text-indigo-400 font-medium">8 agenți specializați</span> care te pot ajuta
                    cu orice aspect al aplicației.
                  </p>
                </div>
                {/* Agent pills preview */}
                <div className="flex flex-wrap justify-center gap-1.5 mt-1">
                  {ALL_AGENTS.filter((a) => a.id !== 'general').map((a) => (
                    <span
                      key={a.id}
                      className={`text-xs px-2 py-1 rounded-lg border ${a.colorClass} ${a.textColorClass} ${a.borderColorClass} cursor-pointer hover:opacity-80`}
                      onClick={() => setShowAgentPanel(true)}
                    >
                      {a.emoji} {a.name.replace('Agent ', '')}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {messages.map((msg, i) => (
              <ChatMessage key={i} message={msg} />
            ))}
            {isLoading && <TypingIndicator agentName="Agent" />}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick actions - only when no messages */}
          {messages.length === 0 && !showAgentPanel && (
            <QuickActions activeRole={activeRole} onSelect={handleQuickAction} />
          )}

          {/* Input */}
          <div className="px-3 pb-3 pt-2 border-t border-slate-700/80 shrink-0">
            <form onSubmit={handleSubmit} className="flex items-center gap-2">
              {/* Agents button */}
              <button
                type="button"
                onClick={() => setShowAgentPanel(!showAgentPanel)}
                className={`w-10 h-10 rounded-xl flex items-center justify-center text-base transition-all shrink-0 border ${
                  showAgentPanel
                    ? 'bg-indigo-600/30 border-indigo-500/60 text-indigo-400'
                    : 'bg-slate-800 border-slate-600 hover:border-indigo-500/50 text-slate-400 hover:text-indigo-400'
                }`}
                title="Alege agentul"
              >
                🤖
              </button>
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Scrie o întrebare..."
                disabled={isLoading}
                className="flex-1 bg-slate-800 border border-slate-600 hover:border-slate-500 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-colors disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="w-10 h-10 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl flex items-center justify-center transition-all hover:scale-105 active:scale-95 shrink-0"
              >
                <SendIcon className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Floating trigger button — DOAR pe mobil, pe desktop butonul e în footer */}
      <button
        data-tutorial="ai-widget"
        onClick={() => setIsOpen(!isOpen)}
        className={`md:hidden w-14 h-14 rounded-2xl shadow-lg flex items-center justify-center transition-all hover:scale-110 active:scale-95 ${
          isOpen
            ? 'bg-slate-700 hover:bg-slate-600 text-white'
            : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/30'
        }`}
        title="Asistent AI"
      >
        {isOpen ? (
          <XIcon className="w-6 h-6" />
        ) : (
          <BotIcon className="w-6 h-6" />
        )}
      </button>
    </div>
  );
};
