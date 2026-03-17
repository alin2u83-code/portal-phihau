import React from 'react';

export const QwanKiDoLogo: React.FC<{ className?: string; iconClassName?: string }> = ({ className = "h-12 w-12", iconClassName = "w-8 h-8" }) => (
    <div className={`flex items-center justify-center rounded-full bg-slate-800 border border-amber-500/50 shadow-lg shadow-amber-500/10 ${className}`}>
        <svg viewBox="0 0 100 100" className={`${iconClassName} text-amber-500`}>
            <path d="M50 10 L90 50 L50 90 L10 50 Z" stroke="currentColor" strokeWidth="6" fill="none" />
            <circle cx="50" cy="50" r="12" fill="currentColor" />
            <path d="M30 50 L70 50 M50 30 L50 70" stroke="rgba(0,0,0,0.3)" strokeWidth="2" />
        </svg>
    </div>
);
