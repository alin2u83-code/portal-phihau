import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useError } from '../components/ErrorProvider';
import { SesiuneExamen, InscriereExamen, DecontFederatie } from '../types';

export const useExamManager = (
    setSesiuni: React.Dispatch<React.SetStateAction<SesiuneExamen[]>>,
    setInscrieri: React.Dispatch<React.SetStateAction<InscriereExamen[]>>,
    setDeconturiFederatie: React.Dispatch<React.SetStateAction<DecontFederatie[]>>
) => {
    const { showError, showSuccess } = useError();
    const [loading, setLoading] = useState(false);

    const saveSesiune = async (sesiuneData: Partial<SesiuneExamen>, sesiuneToEdit: SesiuneExamen | null, locatii: any[]) => {
        if (!supabase) {
            showError("Eroare", "Client Supabase neconfigurat.");
            return;
        }
        setLoading(true);
        try {
            const locatieSelectata = (locatii || []).find(l => l.id === sesiuneData.locatie_id);
            const dataToSave: Partial<SesiuneExamen> = {
                ...sesiuneData,
                localitate: locatieSelectata ? locatieSelectata.nume : 'Necunoscută',
                club_id: sesiuneData.club_id === '' ? null : sesiuneData.club_id
            };

            if (sesiuneToEdit) {
                const response = await supabase.from('sesiuni_examene').update(dataToSave).eq('id', sesiuneToEdit.id).select().single();
                console.log('Supabase Update Response:', response);
                const { data, error } = response;
                if (error) throw error;
                if (data) {
                    setSesiuni(prev => prev.map(e => e.id === data.id ? data as SesiuneExamen : e));
                    showSuccess("Succes", "Sesiunea a fost actualizată.");
                }
            } else {
                const response = await supabase.from('sesiuni_examene').insert(dataToSave).select().single();
                console.log('Supabase Insert Response:', response);
                const { data, error } = response;
                if (error) throw error;
                if (data) {
                    setSesiuni(prev => [...prev, data as SesiuneExamen]);
                    showSuccess("Succes", "Sesiunea a fost creată.");
                }
            }
        } catch (err: any) {
            console.error('DEBUG:', err);
            showError(sesiuneToEdit ? "Eroare la actualizare" : "Eroare la adăugare", err.message || err);
        } finally {
            setLoading(false);
        }
    };

    const deleteSesiune = async (id: string) => {
        if (!supabase) return;
        setLoading(true);
        try {
            const { error: inscrieriError } = await supabase.from('inscrieri_examene').delete().eq('sesiune_id', id);
            if (inscrieriError) throw inscrieriError;
            setInscrieri(prev => prev.filter(p => p.sesiune_id !== id));

            const { error: sesiuneError } = await supabase.from('sesiuni_examene').delete().eq('id', id);
            if (sesiuneError) throw sesiuneError;
            setSesiuni(prev => prev.filter(e => e.id !== id));
            showSuccess("Succes", "Sesiunea și înscrierile asociate au fost șterse.");
            return true;
        } catch (err: any) {
            console.error('DEBUG:', err);
            showError("Eroare la ștergere", err.message || err);
            return false;
        } finally {
            setLoading(false);
        }
    };

    const finalizeExamen = async (sesiuneId: string) => {
        if (!supabase) return;
        setLoading(true);
        try {
            const { data, error } = await supabase.rpc('finalizeaza_examen', { p_sesiune_id: sesiuneId });
            if (error) throw error;

            setSesiuni(prev => prev.map(s => s.id === sesiuneId ? { ...s, status: 'Finalizat' } : s));

            if (data) {
                setDeconturiFederatie(prev => [...prev, data]);
            }
            showSuccess("Examen Finalizat", "Decontul a fost generat și trimis către federație.");
            return true;
        } catch (err: any) {
            console.error('DEBUG:', err);
            showError("Eroare la finalizare", `Funcția RPC 'finalizeaza_examen' nu a putut fi executată. Detalii: ${err.message}`);
            return false;
        } finally {
            setLoading(false);
        }
    };

    return {
        saveSesiune,
        deleteSesiune,
        finalizeExamen,
        loading
    };
};
