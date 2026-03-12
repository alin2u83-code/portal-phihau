import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { Card, Input, Button } from './ui';
import { ArrowLeftIcon, CalendarDaysIcon, CheckCircleIcon, XCircleIcon } from './icons';

interface VederePrezentaSportiv {
    sportiv_id: string;
    data: string;
    ora_start: string;
    status: 'prezent' | 'absent' | string;
    nume_grupa: string;
}

interface IstoricPrezentaSportivProps {
    sportivId: string;
    onBack?: () => void;
}

export const IstoricPrezentaSportiv: React.FC<IstoricPrezentaSportivProps> = ({ sportivId, onBack }) => {
    const [prezente, setPrezente] = useState<VederePrezentaSportiv[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filterGrupa, setFilterGrupa] = useState('');

    useEffect(() => {
        const fetchPrezente = async () => {
            setLoading(true);
            try {
                const { data, error } = await supabase
                    .from('vedere_prezenta_sportiv')
                    .select('*')
                    .eq('sportiv_id', sportivId)
                    .order('data', { ascending: false })
                    .order('ora_start', { ascending: false });

                if (error) throw error;
                setPrezente(data || []);
            } catch (err: any) {
                console.error('Error fetching prezente:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        if (sportivId) {
            fetchPrezente();
        }
    }, [sportivId]);

    const filteredPrezente = useMemo(() => {
        return prezente.filter(p => 
            p.nume_grupa?.toLowerCase().includes(filterGrupa.toLowerCase())
        );
    }, [prezente, filterGrupa]);

    const groupedPrezente = useMemo(() => {
        const groups: Record<string, VederePrezentaSportiv[]> = {};
        
        filteredPrezente.forEach(p => {
            const date = new Date((p.data || '').toString().slice(0, 10));
            const monthYear = date.toLocaleDateString('ro-RO', { month: 'long', year: 'numeric' });
            // Capitalize first letter
            const formattedMonthYear = monthYear.charAt(0).toUpperCase() + monthYear.slice(1);
            
            if (!groups[formattedMonthYear]) {
                groups[formattedMonthYear] = [];
            }
            groups[formattedMonthYear].push(p);
        });
        
        return groups;
    }, [filteredPrezente]);

    if (loading) {
        return <div className="p-4 text-center text-slate-400">Se încarcă istoricul...</div>;
    }

    if (error) {
        return <div className="p-4 text-center text-red-400">Eroare: {error}</div>;
    }

    return (
        <div className="flex flex-col space-y-4 w-full max-w-3xl mx-auto">
            <div className="flex items-center gap-4 mb-2">
                {onBack && (
                    <Button variant="secondary" onClick={onBack} className="!p-2">
                        <ArrowLeftIcon className="w-5 h-5" />
                    </Button>
                )}
                <h2 className="text-2xl font-bold text-white">Istoric Prezență</h2>
            </div>

            <Card className="bg-slate-800 border-slate-700">
                <Input 
                    label="Caută după grupă"
                    placeholder="Ex: Grupa Avansați..."
                    value={filterGrupa}
                    onChange={(e) => setFilterGrupa(e.target.value)}
                    className="w-full"
                />
            </Card>

            <div className="space-y-6">
                {Object.keys(groupedPrezente).length === 0 ? (
                    <Card className="text-center py-8 text-slate-400 border-dashed border-slate-700">
                        Nu s-au găsit prezențe pentru criteriile selectate.
                    </Card>
                ) : (
                    Object.entries(groupedPrezente).map(([monthYear, records]) => (
                        <div key={monthYear} className="space-y-3">
                            <h3 className="text-lg font-bold text-amber-500 sticky top-0 bg-slate-900/90 backdrop-blur-sm py-2 z-10 border-b border-slate-800">
                                {monthYear}
                            </h3>
                            <div className="flex flex-col gap-3">
                                {records.map((record, idx) => {
                                    const isPresent = record.status?.toLowerCase() === 'prezent';
                                    const dateObj = new Date((record.data || '').toString().slice(0, 10));
                                    
                                    return (
                                        <div 
                                            key={`${record.data}-${record.ora_start}-${idx}`}
                                            className="flex items-center p-4 rounded-xl bg-slate-800 border border-slate-700 shadow-sm"
                                        >
                                            <div className="flex flex-col items-center justify-center w-14 h-14 rounded-lg bg-slate-900 border border-slate-700 shrink-0 mr-4">
                                                <span className="text-xl font-black text-white">
                                                    {dateObj.toLocaleDateString('ro-RO', { day: '2-digit' })}
                                                </span>
                                                <span className="text-[10px] font-bold text-slate-400 uppercase">
                                                    {dateObj.toLocaleDateString('ro-RO', { weekday: 'short' })}
                                                </span>
                                            </div>
                                            
                                            <div className="flex-grow min-w-0">
                                                <p className="font-bold text-white truncate text-base">
                                                    {record.nume_grupa || 'Antrenament'}
                                                </p>
                                                <div className="flex items-center text-sm text-slate-400 mt-0.5">
                                                    <CalendarDaysIcon className="w-3.5 h-3.5 mr-1.5 opacity-70" />
                                                    {record.ora_start}
                                                </div>
                                            </div>
                                            
                                            <div className="shrink-0 ml-3">
                                                {isPresent ? (
                                                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#1e3a8a]/30 border border-[#1e3a8a] text-blue-400 text-xs font-bold uppercase tracking-wide">
                                                        <CheckCircleIcon className="w-3.5 h-3.5" />
                                                        <span className="hidden sm:inline">Prezent</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900/50 border border-slate-700 text-slate-500 text-xs font-bold uppercase tracking-wide">
                                                        <XCircleIcon className="w-3.5 h-3.5" />
                                                        <span className="hidden sm:inline">Absent</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
