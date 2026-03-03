import React from 'react';
import { Grad } from '../types';

const normalizeGradName = (gradName: string): string => {
    if (!gradName) return '';
    // Normalizează pentru a gestiona diacriticele și pentru a fi case-insensitive
    return gradName
        .toLowerCase()
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
    
    // Logica pentru Dang (Centuri Negre cu trepte)
    if (name.includes('dang')) {
        const levelMatch = name.match(/\d+/);
        const level = levelMatch ? parseInt(levelMatch[0]) : 0;
        
        if (level >= 6) return 'bg-white text-red-600 border-2 border-red-600';
        if (level === 5) return 'bg-black text-white border-2 border-yellow-400';
        // 1-4 Dang sau nespecificat
        return 'bg-black text-white border-2 border-red-600';
    }

    if (name.includes('neagra')) return 'bg-black text-white';
    
    // Reguli pentru centuri colorate
    if (name.includes('grad albastru') || name.includes('albastru')) return 'bg-white text-blue-700 border border-blue-700';
    if (name.includes('cap galben') || name.includes('galben')) return 'bg-yellow-400 text-black';
    if (name.includes('grad rosu') || name.includes('rosu')) return 'bg-red-600 text-white';
    if (name.includes('violet') || name.includes('cap alb') || name.includes('c.v.') || name.includes('cv')) return 'bg-violet-600 text-white';
    
    // Default pentru începători sau grade nespecificate
    return 'bg-slate-600 text-white';
};

/**
 * Returnează o clasă de bordură Tailwind CSS pentru a colora rândul
 * unui sportiv în listele de prezență.
 */
export const getGradBorderColor = (gradName: string): string => {
    if (!gradName) return 'border-slate-700';
    const name = normalizeGradName(gradName);
    
    if (name.includes('dang')) {
        const levelMatch = name.match(/\d+/);
        const level = levelMatch ? parseInt(levelMatch[0]) : 0;
        if (level >= 6) return 'border-red-600';
        if (level === 5) return 'border-yellow-400';
        return 'border-red-600';
    }

    if (name.includes('albastru')) return 'border-blue-500';
    if (name.includes('cap alb') || name.includes('violet') || name.includes('cv')) return 'border-violet-500';
    if (name.includes('rosu')) return 'border-red-500';
    if (name.includes('neagra')) return 'border-slate-900';
    if (name.includes('galben')) return 'border-yellow-400';
    
    return 'border-slate-700';
};

/**
 * Returnează stilurile inline CSS pentru un grad, conform cerințelor specifice.
 */
export const getInlineGradeStyle = (gradNume: string): React.CSSProperties => {
    if (!gradNume) return { backgroundColor: '#E0E0E0', color: '#000000' };
    const name = normalizeGradName(gradNume);
  
    // Logica pentru Dang (Centuri Negre cu trepte)
    if (name.includes('dang')) {
      const levelMatch = name.match(/\d+/);
      const level = levelMatch ? parseInt(levelMatch[0]) : 0;

      if (level >= 6) 
        return { backgroundColor: '#FFFFFF', color: '#FF0000', border: '2px solid #FF0000' };
      if (level === 5) 
        return { backgroundColor: '#000000', color: '#FFFFFF', border: '2px solid #FFFF00' };
      
      // 1-4 Dang
      return { backgroundColor: '#000000', color: '#FFFFFF', border: '2px solid #FF0000' };
    }
  
    // Logica pentru Gradele de bază
    if (name.includes('grad albastru') || name.includes('albastru')) return { backgroundColor: '#FFFFFF', color: '#0000FF', border: '1px solid #0000FF' };
    if (name.includes('cap galben') || name.includes('galben')) return { backgroundColor: '#FFFF00', color: '#000000' };
    if (name.includes('grad rosu') || name.includes('rosu')) return { backgroundColor: '#FF0000', color: '#FFFFFF' };
    if (name.includes('violet') || name.includes('cap alb') || name.includes('c.v.') || name.includes('cv')) return { backgroundColor: '#8B00FF', color: '#FFFFFF' };
    if (name.includes('centura neagra') || name.includes('neagra')) return { backgroundColor: '#000000', color: '#FFFFFF' };
    
    return { backgroundColor: '#E0E0E0', color: '#000000' }; // Default/Incepator
};

/**
 * Generează un șir de caractere HTML cu stiluri inline pentru un badge de grad.
 * Util pentru rapoarte sau componente care necesită HTML raw.
 */
export const generateGradeBadgeHtml = (sportiv: { nume: string; prenume: string; grad_denumire: string }): string => {
    const style = getInlineGradeStyle(sportiv.grad_denumire);
    
    // Convertim obiectul de stil în string CSS
    const styleString = Object.entries(style)
        .map(([key, value]) => {
            // Convert camelCase to kebab-case
            const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
            return `${cssKey}:${value}`;
        })
        .join(';');

    const baseStyle = `
        padding: 2px 8px;
        border-radius: 9999px; /* Circular/Pill */
        font-size: 12px;
        font-weight: bold;
        display: inline-block;
        text-align: center;
        min-width: 60px;
        text-transform: uppercase;
        font-family: sans-serif;
        line-height: 1.2;
    `.replace(/\s+/g, ' ').trim(); // Minify base style

    return `<div style="${baseStyle};${styleString}">${sportiv.grad_denumire || 'Începător'}</div>`;
};

/**
 * O componentă reutilizabilă pentru afișarea unui badge de grad,
 * cu suport pentru dimensiuni diferite și stilizare conform ierarhiei.
 */
export const GradBadge: React.FC<{ grad: Grad | null | undefined; isLarge?: boolean; className?: string }> = ({ grad, isLarge, className }) => {
    const gradName = grad ? grad.nume : 'Începător';
    const style = getInlineGradeStyle(gradName);
    
    const sizeStyle: React.CSSProperties = isLarge 
        ? { padding: '8px 24px', fontSize: '1.875rem', fontWeight: 900 } 
        : { padding: '2px 8px', fontSize: '0.75rem', fontWeight: 700 };

    return React.createElement(
        'span',
        {
            className: `inline-block rounded-full whitespace-nowrap text-center ${className || ''}`.trim(),
            style: { ...style, ...sizeStyle }
        },
        gradName
    );
};
