import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { Antrenament, Sportiv, Grupa, User } from '../types';
import { useError } from './ErrorProvider';
import { Card, Button, Select } from './ui';
import { ArrowLeftIcon, ArchiveBoxIcon, UserPlusIcon, XIcon } from './icons';

interface TrainingWithGroupAndAthletes extends Omit<Antrenament, 'grupe'> {
    grupe: (Grupa & { sportivi: Sportiv[] }) | null;
}

interface InstructorPrezentaPageProps {
    onBack: () => void;
    onNavigate: (view: any) => void;
    allClubSportivi: Sportiv[];
    currentUser: User;
}

export const InstructorPrezentaPage: React.FC<InstructorPrezentaPageProps> = ({ onBack, onNavigate, allClubSportivi, currentUser }) => {
    const [trainings, setTrainings] = useState<TrainingWithGroupAndAthletes[]>([]);
    const [attendance, setAttendance] = useState<Map<string, Set<string>>>(new Map()); // Map<antrenamentId, Set<sportivId>>
    const [extraAthletes, setExtraAthletes] = useState<Map<string, string[]>>(new Map()); // antrenamentId -> sportivId[]
    const [selectedExternalSportiv, setSelectedExternalSportiv] = useState<Record<string, string>>({}); // antrenamentId -> sportivId
    const [loading, setLoading] = useState(true);
    const [savingStates, setSavingStates] = useState<Record<string, boolean>>({});
    const { showError, showSuccess } = useError();
    const todayRo = useMemo(() => new Date().toLocaleDateString('ro-RO', { weekday: 'long' }).replace(/^\w/, c => c.toUpperCase()), []);

    useEffect(() => {
        const fetchTodaysTrainings = async () => {
            setLoading(true);
            const todayISO = new Date().toISOString().split('T')[0];

            if (!supabase) {
                showError("Eroare Configurare", "Clientul Supabase nu a fost găsit.");
                setLoading(false);
                return;
            }
            
            const { data: trainingsData, error: trainingsError } = await supabase
                .from('program_antrenamente')
                .select('*, grupe(*, sportivi(id, nume, prenume, status)), prezenta_antrenament(sportiv_id)')
                .eq('data', todayISO);

            if (trainingsError) {
                showError("Eroare la încărcarea antrenamentelor", trainingsError);
                setLoading(false);
                return;
            }

            const initialAttendance = new Map<string, Set<string>>();
            (trainingsData || []).forEach(training => {
                const presentIds = new Set((training.prezenta_antrenament as {sportiv_id: string}[]).map(p => p.sportiv_id));
                initialAttendance.set(training.id, presentIds);
            });
            setAttendance(initialAttendance);

            const processedTrainings = (trainingsData || []).map(t => {
                const { prezenta_antrenament, ...rest } = t;
                return {
                    ...rest,
                    grupe: t.grupe ? {
                        ...t.grupe,
                        sportivi: (t.grupe.sportivi || []).filter((s: Sportiv) => s.status === 'Activ')
                    } : null
                };
            });
            setTrainings(processedTrainings.sort((a,b) => a.ora_start.localeCompare(b.ora_start)) as TrainingWithGroupAndAthletes[]);

            setLoading(false);
        };
        fetchTodaysTrainings();
    }, [currentUser.id, showError]);

    // NOTE: The rest of this component was missing from the provided file and could not be reconstructed.
    // This fix makes the existing code syntactically correct, but the component will not render anything useful.
    if (loading) {
        return <div>Loading...</div>;
    }
    
    return (
        <div>
            <Button onClick={onBack}>Back</Button>
            <h1>Instructor Attendance</h1>
            {/* The rest of the component's JSX was missing */}
        </div>
    );
};