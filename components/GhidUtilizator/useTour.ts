import { useState, useEffect, useCallback } from 'react';
import { TourStep } from './types';

interface UseTourOptions {
  steps: TourStep[];
  pageKey: string;
}

interface UseTourReturn {
  active: boolean;
  currentStep: number;
  totalSteps: number;
  nextStep: () => void;
  prevStep: () => void;
  skip: () => void;
  complete: () => void;
  restart: () => void;
}

export function useTour({ steps, pageKey }: UseTourOptions): UseTourReturn {
  const storageKey = `tour_completed_${pageKey}`;
  const totalSteps = steps.length;

  const [active, setActive] = useState<boolean>(false);
  const [currentStep, setCurrentStep] = useState<number>(0);

  useEffect(() => {
    const completed = localStorage.getItem(storageKey);
    if (!completed) {
      setActive(true);
      setCurrentStep(0);
    }
  }, [storageKey]);

  const nextStep = useCallback(() => {
    setCurrentStep(prev => {
      const next = prev + 1;
      if (next >= totalSteps) {
        return prev;
      }
      return next;
    });
  }, [totalSteps]);

  const prevStep = useCallback(() => {
    setCurrentStep(prev => Math.max(0, prev - 1));
  }, []);

  const complete = useCallback(() => {
    localStorage.setItem(storageKey, '1');
    setActive(false);
    setCurrentStep(0);
  }, [storageKey]);

  const skip = useCallback(() => {
    localStorage.setItem(storageKey, '1');
    setActive(false);
    setCurrentStep(0);
  }, [storageKey]);

  const restart = useCallback(() => {
    localStorage.removeItem(storageKey);
    setCurrentStep(0);
    setActive(true);
  }, [storageKey]);

  return {
    active,
    currentStep,
    totalSteps,
    nextStep,
    prevStep,
    skip,
    complete,
    restart,
  };
}
