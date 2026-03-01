import React, { useState, useMemo } from 'react';
import { Card, Button, Select } from './ui';
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
    loading?: boolean;
}

export const TabelPrezentaVedere: React.FC<TabelPrezentaVedereProps> = ({ istoricPrezenta, loading }) => {
    const [filter, setFilter] = useState<'Toate' | 'Prezent' | 'Absent'>('Toate');
    const [limit, setLimit] = useState(20);

    const filteredData = useMemo(() => {
        if (!istoricPrezenta) return [];
        return istoricPrezenta.filter(p => {
            if (filter === 'Toate') return true;
            const isPrezent = p.status?.toLowerCase() === 'prezent';
            return filter === 'Prezent' ? isPrezent : !isPrezent;
        });
    }, [istoricPrezenta, filter]);

    const displayedData = filteredData.slice(0, limit);

    if (loading) {
        return (
            <div className="space-y-3">
                {[1, 2, 3].map(i => (
                    <Card key={i} className="p-4 bg-slate-800/50 border-slate-700 animate-pulse flex items-center justify-between">
                        <div className="flex flex-col gap-2">
                            <div className="h-5 w-32 bg-slate-700 rounded"></div>
                            <div className="h-4 w-24 bg-slate-700/50 rounded"></div>
                        </div>
                        <div className="h-10 w-24 bg-slate-700 rounded-full"></div>
                    </Card>
                ))}
            </div>
        );
    }

    if (!istoricPrezenta || istoricPrezenta.length === 0) {
        return (
            <Card className="text-center p-6 bg-slate-800 border-slate-700">
                <p className="text-slate-400">Nu există prezențe înregistrate.</p>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-end mb-4">
                <div className="w-48">
                    <Select label="Filtrează" value={filter} onChange={(e) => { setFilter(e.target.value as any); setLimit(20); }}>
                        <option value="Toate">Toate</option>
                        <option value="Prezent">Doar Prezențe</option>
                        <option value="Absent">Doar Absențe</option>
                    </Select>
                </div>
            </div>

            <div className="space-y-3">
                {displayedData.map((p, idx) => {
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
                
                {filteredData.length === 0 && (
                    <div className="text-center py-8 text-slate-500 italic">
                        Nu există rezultate pentru filtrul selectat.
                    </div>
                )}
            </div>

            {filteredData.length > limit && (
                <div className="flex justify-center pt-4">
                    <Button variant="secondary" onClick={() => setLimit(prev => prev + 20)}>
                        Încarcă mai multe
                    </Button>
                </div>
            )}
        </div>
    );
};
