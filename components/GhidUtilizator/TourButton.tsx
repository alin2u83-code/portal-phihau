import React from 'react';
import { TourStep } from './types';
import { useTour } from './useTour';

interface TourButtonProps {
  steps: TourStep[];
  pageKey: string;
}

const TourButton: React.FC<TourButtonProps> = ({ steps, pageKey }) => {
  const { restart } = useTour({ steps, pageKey });

  return (
    <button
      onClick={restart}
      className="fixed z-50 w-10 h-10 rounded-full bg-blue-600 hover:bg-blue-500 active:scale-95 text-white flex items-center justify-center shadow-lg transition-all bottom-20 right-6 md:bottom-6"
      title="Deschide ghidul"
      aria-label="Deschide ghidul interactiv"
    >
      <span className="text-base font-bold leading-none">?</span>
    </button>
  );
};

export default TourButton;
