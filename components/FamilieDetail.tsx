import React, { useState } from 'react';
import { Familie, Sportiv } from '../types';
import { Button, Card, Select } from './ui';
import { ArrowLeftIcon, UsersIcon } from './icons';
import { supabase } from '../supabaseClient';

interface FamilieDetailProps {
    familie: Familie;
    membri: Sportiv[];
    onBack: () => void;
    onSelectSportiv: (sportiv: Sportiv) => void;
    sportivi: Sportiv[];
    setSportivi: React.Dispatch<React.SetStateAction<Sportiv[]>>;
}

export const FamilieDetail: React.FC<FamilieDetailProps> = ({ familie, membri, onBack, onSelectSportiv, sportivi, setSportivi }) => {
    const [sportivToAddId, setSportivToAddId] = useState('');
    const [loading, setLoading] = useState(false);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    const sportiviNeasignati = sportivi.filter(s => s.familie_id === null);

    const handleAddMember = async () => {
        if (!sportivToAddId) return;
        if (!supabase) {
            setFeedback({ type: 'error', message: 'Eroare de configurare Supabase.' });
            return;
        }
        setLoading(true);
        const { data, error } = await supabase
            .from('sportivi')
            .update({ familie_id: familie.id })
            .eq('id', sportivToAddId)
            .select()
            .single();
        
        setLoading(false);
        if (error) {
            setFeedback({ type: 'error', message: `Eroare: ${error.message}` });
        } else if (data) {
            setSportivi(prevSportivi => prevSportivi.map(s => s.id === sportivToAddId ? data : s));
            setSportivToAddId('');
            setFeedback({ type: 'success', message: 'Membru adăugat cu succes!' });
            setTimeout(() => setFeedback(null), 3000);
        }
    };

    return (
        <div>
            <Button onClick={onBack} variant="secondary" className="mb-6"><ArrowLeftIcon className="w-5 h-5 mr-2" /> Înapoi</Button>
            
            <Card>
                <div className="flex items-center gap-4 mb-4">
                    <UsersIcon className="w-10 h-10 text-brand-secondary" />
                    <div>
                        <h2 className="text-3xl font-bold text-white">Familia {familie.nume}</h2>
                    </div>
                </div>

                <div className="border-t border-slate-700 pt-4">
                    <h3 className="text-xl font-semibold text-white mb-2">Membri</h3>
                    <div className="space-y-2">
                        {membri.map(sportiv => (
                            <div 
                                key={sportiv.id} 
                                className="bg-slate-700/50 p-3 rounded-md hover:bg-slate-700 cursor-pointer transition-colors"
                                onClick={() => onSelectSportiv(sportiv)}
                            >
                                <p className="font-semibold">{sportiv.nume} {sportiv.prenume}</p>
                                <p className="text-sm text-slate-400">{sportiv.email}</p>
                            </div>
                        ))}
                        {membri.length === 0 && <p className="text-slate-400">Niciun membru în această familie.</p>}
                    </div>
                </div>
            </Card>

            <Card className="mt-6">
                <h3 className="text-xl font-semibold text-white mb-4">Adaugă Membru în Familie</h3>
                <div className="flex gap-4 items-end">
                    <div className="flex-grow">
                        <Select label="Selectează un sportiv" value={sportivToAddId} onChange={(e) => setSportivToAddId(e.target.value)}>
                            <option value="">Alege sportiv...</option>
                            {sportiviNeasignati.map(s => (
                                <option key={s.id} value={s.id}>{s.nume} {s.prenume}</option>
                            ))}
                        </Select>
                    </div>
                    <Button onClick={handleAddMember} disabled={!sportivToAddId || loading}>
                        {loading ? 'Se adaugă...' : 'Adaugă Membru'}
                    </Button>
                </div>
                {feedback && <p className={`mt-2 text-sm ${feedback.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>{feedback.message}</p>}
            </Card>
        </div>
    );
};