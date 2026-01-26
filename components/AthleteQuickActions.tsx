import React, { useState, useMemo } from 'react';
import { User, Antrenament, AnuntPrezenta, Sportiv } from '../types';
import { Card, Button } from './ui';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';
import { CheckIcon } from './icons';

type AnuntStatus = 'Confirm' | 'Intarziat' | 'Absent';

interface TrainingActionCardProps {
    training: Antrenament;
    anunt: AnuntPrezenta | undefined;
    onStatusChange: (trainingId: string, status: AnuntStatus) => Promise<void>;
}

const TrainingActionCard: React.FC<TrainingActionCardProps> = ({ training, anunt, onStatusChange }) => {
    const [loading, setLoading] = useState(false);

    const handleClick = async (status: AnuntStatus) => {
        setLoading(true);
        await onStatusChange(training.id, status);
        setLoading(false);
    };

    const getButtonClasses = (status: AnuntStatus) => {
        const base = 'text-white font-bold transition-all duration-200 active:scale-95 flex items-center justify-center gap-2';
        
        const styles: Record<AnuntStatus, { bg: string; hover: string; }> = {
            Confirm: {
                bg: 'bg-emerald-600',
                hover: 'hover:bg-emerald-500 hover:shadow-glow-blue hover:scale-105',
            },
            Intarziat: {
                bg: 'bg-amber-600',
                hover: 'hover:bg-amber-500 hover:ring-2 hover:ring-white',
            },
            Absent: {
                bg: 'bg-rose-700',
                hover: 'hover:bg-rose-600 hover:opacity-100',
            }
        };

        const isSelected = anunt?.status === status;
        const isInactive = anunt !== undefined && !isSelected;

        const classes = [
            base,
            styles[status].bg,
            styles[status].hover
        ];

        if (isSelected) {
            classes.push('ring-2 ring-white ring-offset-2 ring-offset-light-navy scale-[1.02]');
        }

        if (isInactive) {
            classes.push('opacity-50 hover:opacity-100');
        }

        return classes.join(' ');
    };

    return (
        <Card className="bg-light-navy border-slate-800">
            <h3 className="text-lg font-bold text-white mb-4">
                Antrenamentul de azi: {new Date(training.data + 'T' + training.ora_start).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                <Button 
                    onClick={() => handleClick('Confirm')} 
                    className={getButtonClasses('Confirm')} 
                    disabled={loading}
                >
                    Participă
                    <CheckIcon className="w-5 h-5 text-green-200" />
                </Button>
                <Button onClick={() => handleClick('Intarziat')} className={getButtonClasses('Intarziat')} disabled={loading}>Întârzii</Button>
                <Button onClick={() => handleClick('Absent')} className={getButtonClasses('Absent')} disabled={loading}>Absent</Button>
            </div>
        </Card>
    );
};


interface AthleteQuickActionsProps {
    currentUser: User;
    antrenamente: Antrenament[];
    anunturi: AnuntPrezenta[];
    setAnunturi: React.Dispatch<React.SetStateAction<AnuntPrezenta[]>>;
    sportivi: Sportiv[];
}

export const AthleteQuickActions: React.FC<AthleteQuickActionsProps> = ({ currentUser, antrenamente, anunturi, setAnunturi, sportivi }) => {
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

            // --- NOU: Trimitere notificare către instructori ---
            const antrenament = todaysTrainings.find(t => t.id === trainingId);
            if (!antrenament) return;

            const instructors = sportivi.filter(s =>
                s.club_id === currentUser.club_id &&
                s.roluri.some(r => r.nume === 'Instructor') &&
                s.user_id // Asigură-te că instructorul are un cont de login
            );

            const recipientIds = instructors.map(i => i.user_id).filter(Boolean) as string[];

            if (recipientIds.length > 0) {
                const message = `${currentUser.nume} ${currentUser.prenume} a anunțat: ${status} la antrenamentul de la ${antrenament.ora_start}.`;
                
                const notificationsToInsert = recipientIds.map(userId => ({
                    recipient_user_id: userId,
                    message: message,
                    link_to: `prezenta`, 
                    sender_sportiv_id: currentUser.id
                }));
                
                const { error: notifError } = await supabase.from('in_app_notificari').insert(notificationsToInsert);
                if (notifError) {
                    console.error("Nu s-a putut crea notificarea:", notifError);
                }
            }
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