import React, { useEffect, useState, useCallback } from 'react';
import { useAIStore } from '../../src/store/useAIStore';
import { TutorialTooltip } from './TutorialTooltip';
import { useNavigation } from '../../contexts/NavigationContext';
import { View } from '../../types';

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const PADDING = 8;

export const TutorialOverlay: React.FC = () => {
  const { isTutorialActive, currentStepIndex, tutorialSteps, nextStep, prevStep, skipTutorial } = useAIStore();
  const { navigateTo } = useNavigation();
  const [targetRect, setTargetRect] = useState<Rect | null>(null);

  const currentStep = tutorialSteps[currentStepIndex];

  const findTarget = useCallback(() => {
    if (!currentStep) return;

    let attempts = 0;
    const tryFind = () => {
      const el = document.querySelector(currentStep.targetSelector);
      if (el) {
        const rect = el.getBoundingClientRect();
        setTargetRect({
          top: rect.top - PADDING,
          left: rect.left - PADDING,
          width: rect.width + PADDING * 2,
          height: rect.height + PADDING * 2,
        });
      } else if (attempts < 10) {
        attempts++;
        setTimeout(tryFind, 150);
      }
    };
    tryFind();
  }, [currentStep]);

  useEffect(() => {
    if (!isTutorialActive || !currentStep) return;

    if (currentStep.navigateTo) {
      navigateTo(currentStep.navigateTo as View);
      setTimeout(findTarget, 400);
    } else {
      findTarget();
    }
  }, [isTutorialActive, currentStepIndex, currentStep, findTarget, navigateTo]);

  useEffect(() => {
    const handleResize = () => findTarget();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [findTarget]);

  if (!isTutorialActive || !currentStep || !targetRect) return null;

  const getTooltipStyle = (): React.CSSProperties => {
    const TOOLTIP_WIDTH = 320;
    const TOOLTIP_HEIGHT = 220;
    const GAP = 16;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let top: number, left: number;

    switch (currentStep.position) {
      case 'bottom':
        top = targetRect.top + targetRect.height + GAP;
        left = targetRect.left;
        break;
      case 'top':
        top = targetRect.top - TOOLTIP_HEIGHT - GAP;
        left = targetRect.left;
        break;
      case 'right':
        top = targetRect.top;
        left = targetRect.left + targetRect.width + GAP;
        break;
      case 'left':
        top = targetRect.top;
        left = targetRect.left - TOOLTIP_WIDTH - GAP;
        break;
      default:
        top = targetRect.top + targetRect.height + GAP;
        left = targetRect.left;
    }

    // Keep within viewport
    left = Math.max(8, Math.min(left, vw - TOOLTIP_WIDTH - 8));
    top = Math.max(8, Math.min(top, vh - TOOLTIP_HEIGHT - 8));

    return { top, left };
  };

  return (
    <>
      {/* Backdrop overlay with spotlight hole using clip-path */}
      <div
        className="fixed inset-0 z-[9000] pointer-events-none"
        style={{
          background: 'rgba(0,0,0,0.65)',
          clipPath: `polygon(
            0% 0%, 100% 0%, 100% 100%, 0% 100%,
            0% ${targetRect.top}px,
            ${targetRect.left}px ${targetRect.top}px,
            ${targetRect.left}px ${targetRect.top + targetRect.height}px,
            ${targetRect.left + targetRect.width}px ${targetRect.top + targetRect.height}px,
            ${targetRect.left + targetRect.width}px ${targetRect.top}px,
            0% ${targetRect.top}px
          )`,
        }}
      />

      {/* Spotlight border */}
      <div
        className="fixed z-[9050] pointer-events-none rounded-xl border-2 border-indigo-500 shadow-[0_0_0_4px_rgba(99,102,241,0.2)]"
        style={{
          top: targetRect.top,
          left: targetRect.left,
          width: targetRect.width,
          height: targetRect.height,
        }}
      />

      {/* Clickable backdrop to skip */}
      <div
        className="fixed inset-0 z-[9000]"
        style={{ cursor: 'default' }}
      />

      {/* Tooltip */}
      <TutorialTooltip
        step={currentStep}
        stepIndex={currentStepIndex}
        totalSteps={tutorialSteps.length}
        onNext={nextStep}
        onPrev={prevStep}
        onSkip={skipTutorial}
        style={getTooltipStyle()}
      />
    </>
  );
};
