import React from 'react';
import { TutorialStep } from '../../src/store/useAIStore';
import { Button } from '../ui';
import { SparklesIcon } from '../icons';

interface TutorialTooltipProps {
  step: TutorialStep;
  stepIndex: number;
  totalSteps: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  style: React.CSSProperties;
}

export const TutorialTooltip: React.FC<TutorialTooltipProps> = ({
  step, stepIndex, totalSteps, onNext, onPrev, onSkip, style
}) => {
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === totalSteps - 1;

  return (
    <div
      style={style}
      className="fixed z-[9100] w-80 bg-slate-900 border border-indigo-500/50 rounded-2xl shadow-2xl shadow-indigo-500/20 p-5 animate-fade-in-down"
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-indigo-600/20 flex items-center justify-center">
          <SparklesIcon className="w-4 h-4 text-indigo-400" />
        </div>
        <div className="flex-1">
          <p className="text-xs text-indigo-400 font-medium">Tur de prezentare</p>
          <h3 className="text-white font-bold text-sm leading-tight">{step.title}</h3>
        </div>
      </div>

      {/* Content */}
      <p className="text-slate-300 text-sm leading-relaxed mb-4">{step.content}</p>

      {/* Progress dots */}
      <div className="flex items-center gap-1 mb-4">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === stepIndex ? 'w-6 bg-indigo-500' : 'w-1.5 bg-slate-600'
            }`}
          />
        ))}
        <span className="ml-auto text-xs text-slate-500">{stepIndex + 1}/{totalSteps}</span>
      </div>

      {/* Buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={onSkip}
          className="text-xs text-slate-500 hover:text-slate-300 transition-colors mr-auto"
        >
          Sari peste
        </button>
        {!isFirst && (
          <Button variant="secondary" size="sm" onClick={onPrev}>
            Înapoi
          </Button>
        )}
        <Button variant="primary" size="sm" onClick={onNext}>
          {isLast ? 'Finalizează' : 'Continuă'}
        </Button>
      </div>

      {/* Arrow indicator */}
      <div
        className={`absolute w-3 h-3 bg-slate-900 border-indigo-500/50 rotate-45 ${
          step.position === 'bottom' ? '-top-1.5 left-6 border-t border-l' :
          step.position === 'top' ? '-bottom-1.5 left-6 border-b border-r' :
          step.position === 'right' ? '-left-1.5 top-6 border-l border-b' :
          '-right-1.5 top-6 border-r border-t'
        }`}
      />
    </div>
  );
};
