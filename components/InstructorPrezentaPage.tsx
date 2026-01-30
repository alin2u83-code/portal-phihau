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

            if (!supabase || !currentUser.club_id) {
                showError("Eroare Configurare", "Clubul utilizatorului nu a fost găsit.");
                setLoading(false);
                return;
            }
            
            const { data: grupeDataRaw, error: grupeError } = await supabase.from('grupe').select('id').eq('club_id', currentUser.club_id);
            if(grupeError) { showError("Eroare", grupeError); setLoading(false); return; }
            const grupaIds = (grupeDataRaw || []).map(g => g.id);

            if (grupaIds.length === 0) {
                setTrainings([]);
                setLoading(false);
                return;
            }
            
            const { data: trainingsData, error: trainingsError } = await supabase
                .from('program_antrenamente')
                .select('*, grupe(*, sportivi(id, nume, prenume, status)), prezenta_antrenament(sportiv_id)')
                .eq('data', todayISO)
                .in('grupa_id', grupaIds);

            if (trainingsError) {
                showError("Eroare la încărcarea antrenamentelor", trainingsError);
                setLoading(false);
                return;
            }

            const initialAttendance = new Map<string,