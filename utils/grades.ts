import React from 'react';
import { Grad } from '../types';

const normalizeGradName = (gradName: string): string => {
    if (!gradName) return '';
    // Normalizează pentru a gestiona diacriticele (ex: 'â' vs 'a'), punctele și pentru a fi case-insensitive
    return gradName
        .toLowerCase()
        .replace(/\./g, '') // Elimină punctele pentru a trata "C.V." ca "cv"
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
};

/**
 * Returnează un șir de clase Tailwind CSS bazat pe numele gradului,
 * conform ierarhiei oficiale de culori a clubului Phi Hau.
 */
export const getGradStyle = (gradName: string): string => {
    if (!gradName) return 'bg-slate-600 text-white';
    const name = normalizeGradName(gradName);
    
    // Prioritizează 'albastru' pentru a evita conflictul cu 'cap alb'
    if (name.includes('albastru')) {
        return 'bg-white text-blue-600 border-2 border-blue-600';
    }
    
    // Regulă specifică pentru 'Cap Alb' / 'Câp Alb' / 'C.V.'
    if (name.includes('cap alb') || name.includes('violet') || name.includes('cv')) {
        return 'bg-violet-500 text-white'; // #8B5CF6 este violet-500
    }
    
    if (name.includes('6 dang') || name.includes('7 dang') || name.includes('8 dang')) {
        return 'bg-white text-red-600 border border-red-600';
    }
    if (name.includes('5 dang')) {
        return 'bg-black text-yellow-400 border-[4px] border-yellow-400';
    }
    if (name.includes('dang')) {
        return 'bg-black text-red-600 border-[4px] border-red-600';
    }
    if (name.includes('neagra')) { // 'neagră'
        return 'bg-black text-white';
    }
    if (name.includes('rosu')) { // 'roșu'
        return 'bg-red-600 text-white';
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
    const name = normalizeGradName(gradName);
    
    if (name.includes('cap alb') || name.includes('violet') || name.includes('cv')) {
        return 'border-violet-500';
    }
    if (name.includes('albastru')) return 'border-blue-500';
    if (name.includes('rosu')) return 'border-red-500';
    if (name.includes('5 dang')) return 'border-yellow-400';
    if (name.includes('dang')) return 'border-red-600';
    if (name.includes('neagra')) return 'border-slate-400';
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
        ? 'px-6 py-2 text-3xl font-black' 
        : 'px-3 py-1 text-sm font-bold';

    return React.createElement(
        'span',
        {
            className: `inline-block rounded-full whitespace-nowrap text-center ${sizeClasses} ${getGradStyle(gradName)} ${className || ''}`.trim()
        },
        gradName
    );
};