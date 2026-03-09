import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Card, Button } from './ui';
import { TrophyIcon, CalendarDaysIcon } from './icons';
import { Eveniment } from '../types';

interface EvenimenteWidgetProps { sportivId: string; }

export const EvenimenteWidget: React.FC<EvenimenteWidgetProps> = ({ sportivId }) => {
    const [evenimente, setEvenimente] = useState<Eveniment[]>([]);
    const [inscrieri, setInscrieri] = useState<string[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            const { data: evData } = await supabase.from('evenimente').select('*').gte('data', new Date().toISOString());
            const { data: insData } = await supabase.from('inscrieri_evenimente').select('eveniment_id').eq('sportiv_id', sportivId);
            
            setEvenimente(evData || []);
            setInscrieri(insData?.map(i => i.eveniment_id) || []);
        };
        fetchData();
    }, [sportivId]);

    const handleInscriere = async (evenimentId: string) => {
        await supabase.from('inscrieri_evenimente').insert({ eveniment_id: evenimentId, sportiv_id: sportivId });
        setInscrieri([...inscrieri, evenimentId]);
    };

    return (
        <Card className="border border-slate-800 bg-slate-900/50 p-4">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <TrophyIcon className="w-5 h-5 text-indigo-400" /> Evenimente Viitoare
            </h3>
            <div className="space-y-3">
                {evenimente.map(ev => (
                    <div key={ev.id} className="flex justify-between items-center p-3 bg-slate-800 rounded-lg">
                        <div>
                            <p className="font-medium text-white">{ev.denumire}</p>
                            <p className="text-xs text-slate-400 flex items-center gap-1"><CalendarDaysIcon className="w-3 h-3" /> {ev.data}</p>
                        </div>
                        {inscrieri.includes(ev.id) ? 
                            <span className="text-emerald-400 text-sm font-bold">Înscris</span> :
                            <Button size="sm" onClick={() => handleInscriere(ev.id)}>Înscrie-te</Button>
                        }
                    </div>
                ))}
            </div>
        </Card>
    );
};
