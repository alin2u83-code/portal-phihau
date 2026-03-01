import React from 'react';
import { Card } from './ui';
import { CheckIcon, XIcon } from './icons';

export interface PrezentaVedere {
    sportiv_id: string;
    data: string;
    ora_start: string;
    status: string;
    nume_grupa: string;
}

interface TabelPrezentaVedereProps {
    istoricPrezenta: PrezentaVedere[];
}

export const TabelPrezentaVedere: React.FC<TabelPrezentaVedereProps> = ({ istoricPrezenta }) => {
    if (!istoricPrezenta || istoricPrezenta.length === 0) {
        return (
            <Card className="text-center p-6 bg-slate-800 border-slate-700">
                <p className="text-slate-400">Nu există prezențe înregistrate.</p>
            </Card>
        );
    }

    return (
        <div className="space-y-3">
            {istoricPrezenta.map((p, idx) => {
                const isPrezent = p.status?.toLowerCase() === 'prezent';
                
                return (
                    <Card key={idx} className="p-4 bg-slate-800 border-slate-700 flex items-center justify-between hover:bg-slate-700/50 transition-colors">
                        <div className="flex flex-col">
                            <span className="text-white font-semibold">
                                {new Date(p.data).toLocaleDateString('ro-RO', { 
                                    weekday: 'short', 
                                    year: 'numeric', 
                                    month: 'short', 
                                    day: 'numeric' 
                                })}
                            </span>
                            <span className="text-sm text-slate-400">
                                {p.nume_grupa} • {p.ora_start}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className={`text-sm font-bold ${isPrezent ? 'text-green-400' : 'text-red-400'}`}>
                                {isPrezent ? 'Prezent' : 'Absent'}
                            </span>
                            <div className={`p-2 rounded-full ${isPrezent ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                                {isPrezent ? (
                                    <CheckIcon className="w-5 h-5 text-green-400" />
                                ) : (
                                    <XIcon className="w-5 h-5 text-red-400" />
                                )}
                            </div>
                        </div>
                    </Card>
                );
            })}
        </div>
    );
};
