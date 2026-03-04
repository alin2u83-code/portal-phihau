import React, { useState, useEffect } from 'react';
import { Card, Button } from '../ui';
import { CalendarDaysIcon, CheckIcon } from '../icons';
import { Antrenament, AnuntPrezenta, User } from '../../types';

export type AnuntStatus = 'Confirm' | 'Intarziat' | 'Absent';

export interface TrainingActionCardProps {
    training: Antrenament;
    anunt: AnuntPrezenta | undefined;
    onStatusChange: (trainingId: string, status: AnuntStatus) => Promise<void>;
    currentUser: User;
}

export const TrainingActionCard: React.FC<TrainingActionCardProps> = ({ training, anunt, onStatusChange, currentUser }) => {
    const [loading, setLoading] = useState(false);
    const [optimisticStatus, setOptimisticStatus] = useState<AnuntStatus | null>(null);

    useEffect(() => {
        setOptimisticStatus(anunt?.status || null);
    }, [anunt]);

    const handleClick = async (status: AnuntStatus) => {
        setLoading(true);
        setOptimisticStatus(status);
        try {
            await onStatusChange(training.id, status);
        } catch (e) {
            setOptimisticStatus(anunt?.status || null);
        } finally {
            setLoading(false);
        }
    };
    
    const getStyling = (status: AnuntStatus) => {
        const baseClasses = ['font-bold', 'gap-2', 'text-sm', 'flex-1', 'py-3'];
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
            <Button onClick={() => handleClick(status)} variant={variant} className={className} disabled={loading || !currentUser?.id}>
                {children}
                {status === 'Confirm' ? 
                    <CheckIcon className="w-4 h-4 ml-1 text-white" /> :
                    (isSelected && <CheckIcon className="w-4 h-4 ml-1" />)
                }
            </Button>
        );
    };

    return (
        <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700 shadow-lg">
            <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-blue-500/20 rounded-full">
                    <CalendarDaysIcon className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-white">Antrenament Azi</h3>
                    <p className="text-sm text-slate-400">Ora: {new Date(training.data + 'T' + training.ora_start).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
            </div>
            <div className="flex flex-row gap-2">
                <ActionButton status="Confirm">Particip</ActionButton>
                <ActionButton status="Intarziat">Întârzii</ActionButton>
                <ActionButton status="Absent">Absent</ActionButton>
            </div>
        </Card>
    );
};
