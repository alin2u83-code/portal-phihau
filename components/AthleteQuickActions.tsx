import React, { useState, useMemo } from 'react';
import { User, Antrenament, AnuntPrezenta } from '../types';
import { Card, Button } from './ui';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';

type AnuntStatus = 'Confirm' | 'Intarziat' | 'Absent';

interface TrainingActionCardProps {
    training: Antrenament;
    anunt: AnuntPrezenta | undefined;
    onStatusChange: (trainingId: string, status: AnuntStatus) => Promise<void>;
}

const TrainingActionCard: React.FC<TrainingActionCardProps> = ({ training, anunt, onStatusChange }) => {
    const [loading, setLoading] = useState(false);
    const currentStatus = anunt?.status;

    const handleClick = async (status: AnuntStatus) => {
        setLoading(true);
        await onStatusChange(training.id, status);
        setLoading(false);
    };

    const getButtonClasses = (status: AnuntStatus) => {
        const base = 'text-white font-bold transition-all duration-200';
        const colors = {
            Confirm: 'bg-emerald-600 hover:bg-emerald-500',
            Intarziat: 'bg-amber-600 hover:bg-amber-500',
            Absent: 'bg-rose-700 hover:bg-rose-600',
        };
        const active = currentStatus === status;
        const inactive = currentStatus !== undefined && !active;
        
        return `${base} ${colors[status]} ${active ? 'ring-2 ring-white ring-offset-2 ring-offset-light-navy' : ''} ${inactive ? 'opacity-50 hover:opacity-100' : ''}`;
    };

    return (
        <Card className="bg-light-navy border-slate-800">
            <h3 className="text-lg font-bold text-white mb-4">
                Antrenamentul de azi: {new Date(training.data + 'T' + training.ora_start).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                <Button onClick={() => handleClick('Confirm')} className={getButtonClasses('Confirm')} disabled={loading}>Particip</Button>
                <Button onClick={() => handleClick('Intarziat')} className={getButtonClasses('Intarziat')} disabled={loading}>Întârzii</Button>
                <Button onClick={() => handleClick('Absent')} className={getButtonClasses('Absent')} disabled={loading}>Nu vin</Button>
            </div>
        </Card>
    );
};


interface AthleteQuickActionsProps {
    currentUser: User;
    antrenamente: Antrenament[];
    anunturi: AnuntPrezenta[];
    setAnunturi: React.Dispatch<React.SetStateAction<AnuntPrezenta[]>>;
}

export const AthleteQuickActions: React.FC<AthleteQuickActionsProps> = ({ currentUser, antrenamente, anunturi, setAnunturi }) => {
    const { showSuccess, showError } = useError();
    const todayString = useMemo(() => new Date().toISOString().split('T')[0], []);

    const todaysTrainings = useMemo(() => {
        return antrenamente
            .filter(a => 
                a.data === todayString &&
                (a.grupa_id === currentUser.grupa_id || (currentUser.participa_vacanta && a.grupa_id === null))
            )
            .sort((a, b) => a.ora_start.localeCompare(b.ora_start));
    }, [antrenamente, todayString, currentUser]);

    const handleStatusChange = async (trainingId: string, status: AnuntStatus) => {
        if (!supabase) return;

        const existingAnunt = anunturi.find(a => a.antrenament_id === trainingId && a.sportiv_id === currentUser.id);
        
        const upsertData = {
            id: existingAnunt?.id,
            antrenament_id: trainingId,
            sportiv_id: currentUser.id,
            status: status,
            detalii: null 
        };

        const { data, error } = await supabase.from('anunturi_prezenta').upsert(upsertData, { onConflict: 'antrenament_id, sportiv_id' }).select().single();

        if (error) {
            showError("Eroare la trimitere", error);
        } else if (data) {
            showSuccess("Status actualizat", `Ai anunțat: ${status}`);
            setAnunturi(prev => {
                const existingIndex = prev.findIndex(a => a.id === data.id || (a.antrenament_id === data.antrenament_id && a.sportiv_id === data.sportiv_id));
                if (existingIndex > -1) {
                    const newAnunturi = [...prev];
                    newAnunturi[existingIndex] = data;
                    return newAnunturi;
                } else {
                    return [...prev, data];
                }
            });
        }
    };

    if (todaysTrainings.length === 0) {
        return null;
    }

    return (
        <div className="space-y-4">
            {todaysTrainings.map(training => (
                <TrainingActionCard
                    key={training.id}
                    training={training}
                    anunt={anunturi.find(a => a.antrenament_id === training.id && a.sportiv_id === currentUser.id)}
                    onStatusChange={handleStatusChange}
                />
            ))}
        </div>
    );
};
