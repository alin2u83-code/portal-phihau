import React from 'react';

interface MartialArtsSkeletonProps {
  count?: number;
}

export const MartialArtsSkeleton: React.FC<MartialArtsSkeletonProps> = ({ count = 5 }) => {
  return (
    <div className="space-y-3 p-4 bg-slate-900 rounded-lg shadow-lg">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="flex items-center space-x-3 animate-pulse">
          {/* Small circle for Qwan Ki Do grade (blue/black) */}
          <div className="w-8 h-8 rounded-full bg-blue-900 flex-shrink-0"></div>
          {/* Wide line for athlete's name */}
          <div className="h-4 bg-slate-700 rounded w-3/4"></div>
        </div>
      ))}
    </div>
  );
};
