import React, { useState, useEffect } from 'react';
import { Card, Button } from '../ui';
import { CalendarDaysIcon, CheckIcon } from '../icons';
import { Antrenament, AnuntPrezenta, User, View } from '../../types';

export type AnuntStatus = 'Confirm' | 'Intarziat' | 'Absent';

export interface TrainingActionCardProps {
    training: Antrenament;
    anunt: AnuntPrezenta | undefined;
    onStatusChange: (trainingId: string, status: AnuntStatus) => Promise<void>;
    currentUser: User;
    onNavigate?: (view: View) => void;
}

export const TrainingActionCard: React.FC<TrainingActionCardProps> = ({ training, anunt, onStatusChange, currentUser, onNavigate }) => {
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
        const baseClasses = ['gap-2', 'text-sm', 'flex-1', 'min-h-11'];
        const isSelected = optimisticStatus === status;
        const isInactive = optimisticStatus !== null && !isSelected;

        if (isSelected) baseClasses.push('ring-2', 'ring-[var(--t-primary)]');
        if (isInactive) baseClasses.push('opacity-60', 'hover:opacity-100');

        const variant: 'primary' | 'secondary' = status === 'Confirm' ? 'primary' : 'secondary';

        return { variant, className: baseClasses.join(' '), isSelected };
    };

    const ActionButton: React.FC<{ status: AnuntStatus; children: React.ReactNode; }> = ({ status, children }) => {
        const { variant, className, isSelected } = getStyling(status);
        return (
            <Button onClick={() => handleClick(status)} variant={variant} className={className} disabled={loading || !currentUser?.id}>
                {children}
                {isSelected && <CheckIcon className="w-4 h-4 ml-1" />}
            </Button>
        );
    };

    return (
        <Card className="md:p-6">
            <div className="flex items-center gap-3 mb-4">
                <CalendarDaysIcon className="w-5 h-5 text-[var(--t-primary)] shrink-0" />
                <div>
                    <h3 className="text-base font-semibold text-[var(--t-text)]">Antrenament azi</h3>
                    <p className="text-sm text-[var(--t-text-muted)]">Ora: {new Date((training.data || '').toString().slice(0, 10) + 'T' + training.ora_start).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
            </div>
            <div className="flex flex-row gap-2">
                <ActionButton status="Confirm">Particip</ActionButton>
                <ActionButton status="Intarziat">Întârzii</ActionButton>
                <ActionButton status="Absent">Absent</ActionButton>
            </div>
            {onNavigate && (
                <Button variant="secondary" ghost size="sm" className="mt-3" onClick={() => onNavigate('calendar')}>
                    Vezi antrenamentul
                </Button>
            )}
        </Card>
    );
};
