import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useError } from '../components/ErrorProvider';
import { Antrenament, Grupa } from '../types';
import { generateTrainingsFromSchedule } from '../utils/trainingGenerator';

export const useCalendarView = (grupaId: string, initialDate?: string) => {
   // Calculăm data curentă folosind ora locală, nu UTC, pentru a evita decalajul de o zi
    const todayLocal = new Date().toLocaleDateString('sv-SE'); // 'sv-SE' returnează formatul YYYY-MM-DD
    const [date, setDate] = useState(initialDate || todayLocal);
    const [selectedDate, setSelectedDate] = useState<string | null>(initialDate || todayLocal);
    const [daysToGenerate, setDaysToGenerate] = useState(30);
    const [antrenamente, setAntrenamente] = useState<Antrenament[]>([]);
    const [loading, setLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const { showError, showSuccess } = useError();

    const fetchAntrenamente = useCallback(async () => {
        setLoading(true);
        // Fetch the full month range based on the current `date` (month navigation)
        const startOfMonth = date.substring(0, 7) + '-01';
        const d = new Date(date);
        const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).toLocaleDateString('sv-SE');

        const { data, error } = await supabase.from('program_antrenamente')
            .select('*, grupe(*), prezenta:prezenta_antrenament(sportiv_id, status)')
            .eq('grupa_id', grupaId)
            .gte('data', startOfMonth)
            .lte('data', endOfMonth)
            .order('data')
            .order('ora_start');

        if (error) {
            showError("Eroare la încărcarea calendarului", error.message);
        } else {
            setAntrenamente((data || []).map(a => ({ ...a, prezenta: a.prezenta || [] })));
        }
        setLoading(false);
    }, [grupaId, date, showError]);

    useEffect(() => {
        fetchAntrenamente();
    }, [fetchAntrenamente]);

    const handleGenerate = async () => {
        setLoading(true);
        try {
            await generateTrainingsFromSchedule(daysToGenerate, grupaId);
            showSuccess("Succes", `Calendarul a fost populat pentru următoarele ${daysToGenerate} zile.`);
            await fetchAntrenamente();
        } catch (error: any) {
            // Fallback to global generation if group-specific fails (legacy support)
            try {
                await generateTrainingsFromSchedule(daysToGenerate);
                showSuccess("Succes", `Calendarul a fost populat pentru următoarele ${daysToGenerate} zile (Global).`);
                await fetchAntrenamente();
            } catch (error2: any) {
                showError("Eroare generare", error2.message);
            }
        }
        setLoading(false);
    };

    const handleSaveCustom = async (data: any, clubId?: string) => {
        if (data.is_recurent) {
            const { error } = await supabase.from('orar_saptamanal').insert({
                ziua: data.ziua,
                ora_start: data.ora_start,
                ora_sfarsit: data.ora_sfarsit,
                grupa_id: data.grupa_id,
                club_id: clubId,
                is_activ: true
            });
            if (error) {
                showError("Eroare la salvare orar", error.message);
            } else {
                showSuccess("Succes", "Antrenamentul recurent a fost adăugat în orar.");
                await handleGenerate();
            }
        } else {
            const { data: newAntrenament, error } = await supabase.from('program_antrenamente')
                .insert(data)
                .select('*, grupe(*), prezenta:prezenta_antrenament(sportiv_id, status)')
                .single();

            if (error) {
                showError("Eroare", error.message);
            } else if (newAntrenament) {
                showSuccess("Succes", "Antrenamentul personalizat a fost adăugat.");
                await fetchAntrenamente();
            }
        }
    };

    return {
        date,
        setDate,
        selectedDate,
        setSelectedDate,
        todayLocal, // Trimitem și data de azi pentru a fi folosită în UI la evidențiere
        daysToGenerate,
        setDaysToGenerate,
        antrenamente,
        setAntrenamente,
        loading,
        isFormOpen,
        setIsFormOpen,
        fetchAntrenamente,
        handleGenerate,
        handleSaveCustom
    };
};
