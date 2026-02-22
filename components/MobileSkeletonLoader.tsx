import React from 'react';

const SkeletonBar: React.FC<{ width?: string; height?: string; className?: string }> = ({ width = 'w-full', height = 'h-4', className = '' }) => (
    <div className={`bg-slate-700 rounded-md ${width} ${height} ${className}`}></div>
);

export const MobileSkeletonLoader: React.FC = () => {
    return (
        <div className="flex min-h-screen bg-[var(--bg-main)] animate-pulse">
            <div className="w-16 bg-[var(--bg-card)] p-2 space-y-6 pt-6">
                <SkeletonBar height="h-8" width="w-8" className="mx-auto" />
                <SkeletonBar height="h-6" />
                <SkeletonBar height="h-6" />
                <SkeletonBar height="h-6" />
                <SkeletonBar height="h-6" />
            </div>
            <main className="flex-1 p-4 space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <SkeletonBar width="w-32" height="h-6" />
                        <SkeletonBar width="w-48" height="h-4" className="mt-2" />
                    </div>
                    <SkeletonBar width="w-10" height="h-10" className="rounded-full" />
                </div>
                <div className="space-y-4">
                    <SkeletonBar height="h-32" />
                    <SkeletonBar height="h-48" />
                    <SkeletonBar height="h-24" />
                </div>
            </main>
        </div>
    );
};
