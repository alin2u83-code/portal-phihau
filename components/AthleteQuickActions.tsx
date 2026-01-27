import React, { useState, useMemo, useEffect } from 'react';
import { User, Antrenament, AnuntPrezenta, Sportiv } from '../types';
import { Card, Button, Select, Input } from './ui';
import { supabase } from '../supabaseClient';
import { useError } from './ErrorProvider';
import { CheckIcon } from './icons';

type AnuntStatus = 'Confirm' | 'Intarziat' | 'Absent';

interface TrainingActionCardProps {
    training: Antrenament;
    anunt: AnuntPrezenta | undefined;
    onStatusChange: (trainingId: string, status: AnuntStatus) => Promise<void>;
    currentUser: User;
}

const TrainingActionCard: React.FC<TrainingActionCardProps> = ({ training, anunt, onStatusChange, currentUser }) => {
    const [loading, setLoading] = useState(false);
    const [optimisticStatus, setOptimisticStatus] = useState<AnuntStatus | null>(null);

    useEffect(() => {
        setOptimisticStatus(anunt?.status || null);
    }, [anunt]);

    const handleClick = async (status: AnuntStatus) => {
        setLoading(true);
        setOptimisticStatus(status); // Optimistic UI update

        try {
            await onStatusChange(training.id, status);
        } catch (e) {
            // In case of error, revert to the actual state from props
            setOptimisticStatus(anunt?.status || null);
        } finally {
            setLoading(false);
        }
    };
    
    const getStyling = (status: AnuntStatus) => {
        const baseClasses = ['font-bold', 'gap-2', 'text-base'];
        const currentStatus = optimisticStatus;
        const isSelected = currentStatus === status;
        const isInactive = currentStatus !== null && !isSelected;

        if (isSelected) {
            baseClasses.push('ring-2', 'ring-white', 'ring-offset-2', 'ring-offset-[var(--bg-card)]', 'scale-[1.02]');
        }
        if (isInactive) {
            baseClasses.push('opacity-50', 'hover:opacity-100');
        }
        
        const variant: 'success' | 'warning' | 'danger' = status === 'Confirm' ? 'success' : status === 'Intarziat' ? 'warning' : 'danger';

        return { variant, className: baseClasses.join(' '), isSelected };
    };

    const ActionButton: React.FC<{ status: AnuntStatus; children: React.ReactNode; }> = ({ status, children }) => {
        const { variant, className, isSelected } = getStyling(status);
        return (
            <Button
                onClick={() => handleClick(status)}
                variant={variant}
                className={className}
                disabled={loading || !currentUser?.id}
            >
                {children}
                {isSelected && <CheckIcon className="w-5 h-5 ml-2" />}
            </Button>
        );
    };

    return (
        <Card className="bg-light-navy border-slate-800">
            <h3 className="text-xl font-bold text-white mb-4">
                Antrenamentul de azi: {new Date(training.data + 'T' + training.ora_start).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                <ActionButton status="Confirm">Participă</ActionButton>
                <ActionButton status="Intarziat">Întârzii</ActionButton>
                <ActionButton status="Absent">Absent</ActionButton>
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
            throw error;
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

            const antrenament = todaysTrainings.find(t => t.id === trainingId);
            if (!antrenament) return;

            const instructors = sportivi.filter(s =>
                s.club_id === currentUser.club_id &&
                s.roluri.some(r => r.nume === 'Instructor') &&
                s.user_id
            );

            const recipientIds = instructors.map(i => i.user_id).filter(Boolean) as string[];

            if (recipientIds.length > 0) {
                const message = `${currentUser.nume} ${currentUser.prenume} a anunțat: ${status} la antrenamentul de la ${antrenament.ora_start}.`;
                
                const notificationsToInsert = recipientIds.map(userId => ({
                    recipient_user_id: userId,
                    sent_by: currentUser.user_id,
                    message: message,
                    link_to: `prezenta`, 
                    sender_sportiv_id: currentUser.id
                }));
                
                const { error: notifError } = await supabase.from('notificari').insert(notificationsToInsert);
                if (notifError) {
                    showError("Avertisment Notificare", `Statusul prezenței a fost salvat, dar notificarea către instructori a eșuat: ${notifError.message}`);
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
                    currentUser={currentUser}
                />
            ))}
        </div>
    );
};