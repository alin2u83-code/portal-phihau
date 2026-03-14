import { useState, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useError } from '../components/ErrorProvider';
import { Grad, TipPlata } from '../types';
import { useCachedData } from './useCachedData';

export const useNomenclatoare = () => {
    const { showError, showSuccess } = useError();
    const [loading, setLoading] = useState(false);

    const { fetchData: fetchGradesCached, loading: loadingGrades } = useCachedData<Grad[]>({
        cacheKey: 'cache_grade',
        maxAgeMinutes: 10
    });

    const { fetchData: fetchTipuriPlataCached, loading: loadingTipuriPlata } = useCachedData<TipPlata[]>({
        cacheKey: 'cache_tipuriPlati',
        maxAgeMinutes: 10
    });

    // --- Grade ---
    const getGrades = useCallback(async (forceRefresh = false): Promise<Grad[]> => {
        const data = await fetchGradesCached(async () => {
            const { data, error } = await supabase.from('grade').select('*').order('ordine', { ascending: true });
            if (error) throw error;
            return data || [];
        }, forceRefresh);
        
        return data || [];
    }, [fetchGradesCached]);

    const addGrade = useCallback(async (gradeData: Partial<Grad>): Promise<Grad | null> => {
        setLoading(true);
        try {
            const { data, error } = await supabase.from('grade').insert([gradeData]).select().single();
            if (error) throw error;
            showSuccess("Succes", "Gradul a fost adăugat.");
            // Invalidate cache
            localStorage.removeItem('cache_grade');
            return data;
        } catch (error: any) {
            showError("Eroare la adăugarea gradului", error.message);
            return null;
        } finally {
            setLoading(false);
        }
    }, [showError, showSuccess]);

    const updateGrade = useCallback(async (id: string, gradeData: Partial<Grad>): Promise<Grad | null> => {
        setLoading(true);
        try {
            const { data, error } = await supabase.from('grade').update(gradeData).eq('id', id).select().single();
            if (error) throw error;
            showSuccess("Succes", "Gradul a fost actualizat.");
            // Invalidate cache
            localStorage.removeItem('cache_grade');
            return data;
        } catch (error: any) {
            showError("Eroare la actualizarea gradului", error.message);
            return null;
        } finally {
            setLoading(false);
        }
    }, [showError, showSuccess]);

    const deleteGrade = useCallback(async (id: string): Promise<boolean> => {
        setLoading(true);
        try {
            const { error } = await supabase.from('grade').delete().eq('id', id);
            if (error) throw error;
            showSuccess("Succes", "Gradul a fost șters.");
            // Invalidate cache
            localStorage.removeItem('cache_grade');
            return true;
        } catch (error: any) {
            showError("Eroare la ștergerea gradului", error.message);
            return false;
        } finally {
            setLoading(false);
        }
    }, [showError, showSuccess]);

    // --- Tipuri Plata ---
    const getTipuriPlata = useCallback(async (forceRefresh = false): Promise<TipPlata[]> => {
        const data = await fetchTipuriPlataCached(async () => {
            const { data, error } = await supabase.from('tipuri_plata').select('*').order('nume', { ascending: true });
            if (error) throw error;
            return data || [];
        }, forceRefresh);
        
        return data || [];
    }, [fetchTipuriPlataCached]);

    const addTipPlata = useCallback(async (tipPlataData: Partial<TipPlata>): Promise<TipPlata | null> => {
        setLoading(true);
        try {
            const { data, error } = await supabase.from('tipuri_plata').insert([tipPlataData]).select().single();
            if (error) throw error;
            showSuccess("Succes", "Tipul de plată a fost adăugat.");
            // Invalidate cache
            localStorage.removeItem('cache_tipuriPlati');
            return data;
        } catch (error: any) {
            showError("Eroare la adăugarea tipului de plată", error.message);
            return null;
        } finally {
            setLoading(false);
        }
    }, [showError, showSuccess]);

    const updateTipPlata = useCallback(async (id: string, tipPlataData: Partial<TipPlata>): Promise<TipPlata | null> => {
        setLoading(true);
        try {
            const { data, error } = await supabase.from('tipuri_plata').update(tipPlataData).eq('id', id).select().single();
            if (error) throw error;
            showSuccess("Succes", "Tipul de plată a fost actualizat.");
            // Invalidate cache
            localStorage.removeItem('cache_tipuriPlati');
            return data;
        } catch (error: any) {
            showError("Eroare la actualizarea tipului de plată", error.message);
            return null;
        } finally {
            setLoading(false);
        }
    }, [showError, showSuccess]);

    const deleteTipPlata = useCallback(async (id: string): Promise<boolean> => {
        setLoading(true);
        try {
            const { error } = await supabase.from('tipuri_plata').delete().eq('id', id);
            if (error) throw error;
            showSuccess("Succes", "Tipul de plată a fost șters.");
            // Invalidate cache
            localStorage.removeItem('cache_tipuriPlati');
            return true;
        } catch (error: any) {
            showError("Eroare la ștergerea tipului de plată", error.message);
            return false;
        } finally {
            setLoading(false);
        }
    }, [showError, showSuccess]);

    return {
        loading: loading || loadingGrades || loadingTipuriPlata,
        getGrades,
        addGrade,
        updateGrade,
        deleteGrade,
        getTipuriPlata,
        addTipPlata,
        updateTipPlata,
        deleteTipPlata
    };
};
