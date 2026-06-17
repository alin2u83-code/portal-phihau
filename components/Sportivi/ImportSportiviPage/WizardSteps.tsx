import React from 'react';
import { ImportStep } from './types';

const STEPS = [
    { id: 0,   label: 'Încărcare' },
    { id: 0.5, label: 'Configurare' },
    { id: 1,   label: 'Revizuire' },
    { id: 2,   label: 'Raport' },
];

export const WizardSteps: React.FC<{ current: ImportStep }> = ({ current }) => {
    const currentIdx = STEPS.findIndex(s => s.id === current);
    return (
        <div className="flex items-center gap-0 mb-6">
            {STEPS.map((step, idx) => {
                const done = idx < currentIdx;
                const active = idx === currentIdx;
                return (
                    <React.Fragment key={step.id}>
                        <div className="flex flex-col items-center min-w-0">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${
                                done   ? 'bg-blue-500 border-blue-500 text-white' :
                                active ? 'bg-blue-500/20 border-blue-400 text-blue-300' :
                                         'bg-slate-800 border-slate-700 text-slate-600'
                            }`}>
                                {done ? '✓' : idx + 1}
                            </div>
                            <span className={`text-[10px] mt-1 font-medium whitespace-nowrap ${
                                active ? 'text-blue-300' : done ? 'text-slate-400' : 'text-slate-600'
                            }`}>{step.label}</span>
                        </div>
                        {idx < STEPS.length - 1 && (
                            <div className={`flex-1 h-0.5 mx-1 mb-4 ${idx < currentIdx ? 'bg-blue-500' : 'bg-slate-700'}`} />
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
};
