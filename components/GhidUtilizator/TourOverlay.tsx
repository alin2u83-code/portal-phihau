import React, { useEffect, useState, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { TourStep } from './types';
import { useTour } from './useTour';

interface ElementRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface PopoverPosition {
  top: number;
  left: number;
  placement: 'top' | 'bottom' | 'left' | 'right';
}

function getPopoverPosition(
  rect: ElementRect,
  preferredPlacement: 'top' | 'bottom' | 'left' | 'right' | undefined,
  popoverWidth: number,
  popoverHeight: number,
  padding: number
): PopoverPosition {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const placement = preferredPlacement || 'bottom';

  const positions: Record<'top' | 'bottom' | 'left' | 'right', PopoverPosition> = {
    bottom: {
      top: rect.top + rect.height + padding,
      left: Math.min(Math.max(padding, rect.left + rect.width / 2 - popoverWidth / 2), vw - popoverWidth - padding),
      placement: 'bottom',
    },
    top: {
      top: rect.top - popoverHeight - padding,
      left: Math.min(Math.max(padding, rect.left + rect.width / 2 - popoverWidth / 2), vw - popoverWidth - padding),
      placement: 'top',
    },
    right: {
      top: Math.min(Math.max(padding, rect.top + rect.height / 2 - popoverHeight / 2), vh - popoverHeight - padding),
      left: rect.left + rect.width + padding,
      placement: 'right',
    },
    left: {
      top: Math.min(Math.max(padding, rect.top + rect.height / 2 - popoverHeight / 2), vh - popoverHeight - padding),
      left: rect.left - popoverWidth - padding,
      placement: 'left',
    },
  };

  // Try preferred, fallback to best fit
  const preferred = positions[placement];
  if (
    preferred.top >= padding &&
    preferred.top + popoverHeight <= vh - padding &&
    preferred.left >= padding &&
    preferred.left + popoverWidth <= vw - padding
  ) {
    return preferred;
  }

  // Fallback order
  const fallbackOrder: Array<'bottom' | 'top' | 'right' | 'left'> = ['bottom', 'top', 'right', 'left'];
  for (const p of fallbackOrder) {
    if (p === placement) continue;
    const pos = positions[p];
    if (
      pos.top >= padding &&
      pos.top + popoverHeight <= vh - padding &&
      pos.left >= padding &&
      pos.left + popoverWidth <= vw - padding
    ) {
      return pos;
    }
  }

  return preferred;
}

interface TourOverlayProps {
  steps: TourStep[];
  pageKey: string;
}

export const TourOverlay: React.FC<TourOverlayProps> = ({ steps, pageKey }) => {
  const { active, currentStep, totalSteps, nextStep, prevStep, skip, complete } = useTour({ steps, pageKey });
  const [rect, setRect] = useState<ElementRect | null>(null);
  const [popoverPos, setPopoverPos] = useState<PopoverPosition | null>(null);
  const [skippedStep, setSkippedStep] = useState(false);

  const POPOVER_WIDTH = 320;
  const POPOVER_HEIGHT = 180;
  const PADDING = 16;

  const updatePosition = useCallback(() => {
    if (!active || currentStep >= steps.length) return;

    const step = steps[currentStep];
    const el = document.querySelector<HTMLElement>(step.target);

    if (!el) {
      // Target not found — auto-skip to next step
      setSkippedStep(true);
      return;
    }

    setSkippedStep(false);
    const bounding = el.getBoundingClientRect();
    const newRect: ElementRect = {
      top: bounding.top,
      left: bounding.left,
      width: bounding.width,
      height: bounding.height,
    };
    setRect(newRect);

    const pos = getPopoverPosition(newRect, step.placement, POPOVER_WIDTH, POPOVER_HEIGHT, PADDING);
    setPopoverPos(pos);
  }, [active, currentStep, steps]);

  // Auto-skip when target not found
  useEffect(() => {
    if (skippedStep) {
      const timer = setTimeout(() => {
        if (currentStep + 1 >= totalSteps) {
          complete();
        } else {
          nextStep();
        }
        setSkippedStep(false);
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [skippedStep, currentStep, totalSteps, nextStep, complete]);

  // Scroll element into view and update position
  useEffect(() => {
    if (!active || currentStep >= steps.length) return;

    const step = steps[currentStep];
    const el = document.querySelector<HTMLElement>(step.target);
    if (!el) return;

    el.scrollIntoView({ behavior: 'smooth', block: 'center' });

    // Wait for scroll to complete before measuring
    const timer = setTimeout(updatePosition, 350);
    return () => clearTimeout(timer);
  }, [active, currentStep, steps, updatePosition]);

  // Update position on resize
  useEffect(() => {
    if (!active) return;
    window.addEventListener('resize', updatePosition);
    return () => window.removeEventListener('resize', updatePosition);
  }, [active, updatePosition]);

  if (!active || !rect || !popoverPos || currentStep >= steps.length) return null;

  const step = steps[currentStep];
  const isLast = currentStep === totalSteps - 1;

  const arrowStyle = (): React.CSSProperties => {
    const arrowSize = 8;
    const base: React.CSSProperties = {
      position: 'absolute',
      width: 0,
      height: 0,
    };
    switch (popoverPos.placement) {
      case 'bottom':
        return {
          ...base,
          top: -arrowSize,
          left: POPOVER_WIDTH / 2 - arrowSize,
          borderLeft: `${arrowSize}px solid transparent`,
          borderRight: `${arrowSize}px solid transparent`,
          borderBottom: `${arrowSize}px solid rgb(51 65 85)`, // slate-700
        };
      case 'top':
        return {
          ...base,
          bottom: -arrowSize,
          left: POPOVER_WIDTH / 2 - arrowSize,
          borderLeft: `${arrowSize}px solid transparent`,
          borderRight: `${arrowSize}px solid transparent`,
          borderTop: `${arrowSize}px solid rgb(51 65 85)`,
        };
      case 'right':
        return {
          ...base,
          left: -arrowSize,
          top: POPOVER_HEIGHT / 2 - arrowSize,
          borderTop: `${arrowSize}px solid transparent`,
          borderBottom: `${arrowSize}px solid transparent`,
          borderRight: `${arrowSize}px solid rgb(51 65 85)`,
        };
      case 'left':
        return {
          ...base,
          right: -arrowSize,
          top: POPOVER_HEIGHT / 2 - arrowSize,
          borderTop: `${arrowSize}px solid transparent`,
          borderBottom: `${arrowSize}px solid transparent`,
          borderLeft: `${arrowSize}px solid rgb(51 65 85)`,
        };
      default:
        return base;
    }
  };

  return ReactDOM.createPortal(
    <>
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 z-[9998] pointer-events-none"
        style={{ background: 'rgba(0,0,0,0.6)' }}
      />

      {/* Spotlight on element */}
      <div
        className="fixed pointer-events-none z-[9999] rounded-lg"
        style={{
          top: rect.top - 4,
          left: rect.left - 4,
          width: rect.width + 8,
          height: rect.height + 8,
          boxShadow: '0 0 0 9999px rgba(0,0,0,0.6)',
          borderRadius: 8,
        }}
      />

      {/* Clickable backdrop to close */}
      <div
        className="fixed inset-0 z-[9999]"
        style={{ cursor: 'default' }}
        onClick={skip}
        aria-label="Închide ghidul"
      />

      {/* Popover card */}
      <div
        className="fixed z-[10000] bg-slate-800 border border-slate-700 text-white rounded-xl shadow-2xl"
        style={{
          top: popoverPos.top,
          left: popoverPos.left,
          width: POPOVER_WIDTH,
          maxWidth: `calc(100vw - ${PADDING * 2}px)`,
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Arrow */}
        <div style={arrowStyle()} />

        <div className="p-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="font-bold text-white text-sm leading-snug">{step.title}</h3>
            <span className="text-xs text-slate-500 shrink-0 mt-0.5">
              {currentStep + 1}/{totalSteps}
            </span>
          </div>

          {/* Description */}
          <p className="text-slate-300 text-xs leading-relaxed mb-4">{step.description}</p>

          {/* Actions */}
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={skip}
              className="text-slate-500 hover:text-slate-300 text-xs transition-colors"
            >
              Sari peste
            </button>
            <div className="flex items-center gap-2">
              {currentStep > 0 && (
                <button
                  onClick={prevStep}
                  className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-600 text-slate-300 hover:border-slate-400 hover:text-white transition-colors"
                >
                  Înapoi
                </button>
              )}
              <button
                onClick={isLast ? complete : nextStep}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 active:scale-95 text-white transition-all"
              >
                {isLast ? 'Termină' : 'Următor'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
};

export default TourOverlay;
