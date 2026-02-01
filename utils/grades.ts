import React from 'react';
import { Grad } from '../types';

/**
 * Returnează un șir de clase Tailwind CSS bazat pe numele gradului,
 * conform ierarhiei oficiale de culori a clubului Phi Hau.
 */
export const getGradStyle = (gradName: string): string => {
    if (!gradName) return 'bg-slate-600 text-white';
    const name = gradName.toLowerCase();
    
    if (name.includes('6 dang') || name.includes('7 dang') || name.includes('8 dang')) {
        return 'bg-white text-red-600 border border-red-600';
    }
    if (name.includes('5 dang')) {
        return 'bg-black text-yellow-400 border-[4px] border-yellow-400';
    }
    if (name.includes('dang')) { // Captează 1-4 Dang
        return 'bg-black text-red-600 border-[4px] border-red-600';
    }
    if (name.includes('neagră')) {
        return 'bg-black text-white';
    }
    if (name.includes('violet') || name.includes('cap alb')) {
        return 'bg-violet-500 text-white'; // Hex #8B5CF6 este tailwind violet-500
    }
    if (name.includes('roșu')) {
        return 'bg-red-600 text-white';
    }
    if (name.includes('albastru')) {
        return 'bg-white text-blue-600 border border-blue-600';
    }
    if (name.includes('galben')) {
        return 'bg-yellow-400 text-black';
    }
    
    return 'bg-slate-600 text-white';
};

/**
 * Returnează o clasă de bordură Tailwind CSS pentru a colora rândul
 * unui sportiv în listele de prezență.
 */
export const getGradBorderColor = (gradName: string): string => {
    if (!gradName) return 'border-slate-700';
    const name = gradName.toLowerCase();
    
    if (name.includes('violet') || name.includes('cap alb')) return 'border-violet-500';
    if (name.includes('albastru')) return 'border-blue-500';
    if (name.includes('roșu')) return 'border-red-500';
    if (name.includes('5 dang')) return 'border-yellow-400';
    if (name.includes('dang')) return 'border-red-600'; // Pentru 1-4 și 6-8
    if (name.includes('neagră')) return 'border-slate-400';
    if (name.includes('galben')) return 'border-yellow-400';
    
    return 'border-slate-700';
};

/**
 * O componentă reutilizabilă pentru afișarea unui badge de grad,
 * cu suport pentru dimensiuni diferite și stilizare conform ierarhiei.
 */
export const GradBadge: React.FC<{ grad: Grad | null | undefined; isLarge?: boolean; className?: string }> = ({ grad, isLarge, className }) => {
    const gradName = grad ? grad.nume : 'Începător';
    
    const sizeClasses = isLarge 
        ? 'px-6 py-2 text-2xl font-bold' 
        : 'px-3 py-1 text-sm font-bold';

    // FIX: Replaced JSX with React.createElement to fix syntax errors in a .ts file.
    return React.createElement(
        'span',
        {
            className: `inline-block rounded-full whitespace-nowrap text-center ${sizeClasses} ${getGradStyle(gradName)} ${className || ''}`.trim()
        },
        gradName
    );
};