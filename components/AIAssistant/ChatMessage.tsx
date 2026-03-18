import React from 'react';
import { AIMessage } from '../../src/store/useAIStore';
import { UserCircleIcon } from '../icons';

interface ChatMessageProps {
  message: AIMessage;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div className="flex justify-end gap-2">
        <div className="max-w-[80%] bg-indigo-600 text-white rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm">
          {message.content}
        </div>
        <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center shrink-0 mt-auto">
          <UserCircleIcon className="w-4 h-4 text-slate-300" />
        </div>
      </div>
    );
  }

  const hasAgent = !!message.agentId && message.agentId !== 'general';

  return (
    <div className="flex gap-2">
      {/* Agent avatar */}
      <div
        className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-auto text-sm border ${
          hasAgent
            ? `${message.agentColorClass} ${message.agentTextColorClass} border-current/30`
            : 'bg-slate-700 border-slate-600 text-slate-300'
        }`}
        title={message.agentName}
      >
        {message.agentEmoji || '🤖'}
      </div>

      <div className="max-w-[85%] flex flex-col gap-1">
        {/* Agent badge */}
        {hasAgent && (
          <span
            className={`inline-flex items-center gap-1 self-start text-[10px] font-semibold px-2 py-0.5 rounded-full border ${message.agentColorClass} ${message.agentTextColorClass} ${message.agentColorClass?.replace('bg-', 'border-')}`}
          >
            {message.agentEmoji} {message.agentName}
          </span>
        )}

        {/* Message bubble */}
        <div className="bg-slate-800 border border-slate-700 text-slate-200 rounded-2xl rounded-tl-sm px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap">
          {message.content}
        </div>
      </div>
    </div>
  );
};
