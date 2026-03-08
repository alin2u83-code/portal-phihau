import { useState, useMemo, useCallback } from 'react';
import { Familie, Sportiv, Plata, Tranzactie } from '../types';
import * as familieService from '../services/familieService';
import { useError } from '../components/ErrorProvider';

export const useFamilyManager = (
    initialFamilii: Familie[],
    setFamilii: React.Dispatch<React.SetStateAction<Familie[]>>,
    sportivi: Sportiv[],
    setSportivi: React.Dispatch<React.SetStateAction<Sportiv[]>>,
    plati: Plata[] = [],
    tranzactii: Tranzactie[] = []
) => {
    const { showError, showSuccess } = useError();
    const [loading, setLoading] = useState(false);

    const familyBalances = useMemo(() => {
        const balances = new Map<string, number>();
        if (!initialFamilii || !plati || !tranzactii) return balances;
        
        initialFamilii.forEach(f => balances.set(f.id, 0));
        
        tranzactii.forEach(t => {
            if (t.familie_id) {
                balances.set(t.familie_id, (balances.get(t.familie_id) || 0) + t.suma);
            }
        });
        
        plati.forEach(p => {
            if (p.familie_id) {
                balances.set(p.familie_id, (balances.get(p.familie_id) || 0) - p.suma);
            }
        });
        
        return balances;
    }, [initialFamilii, plati, tranzactii]);

    const individualBalances = useMemo(() => {
        const balances = new Map<string, number>();
        if (!sportivi || !plati || !tranzactii) return balances;
        
        sportivi.forEach(s => {
            if (!s.familie_id) balances.set(s.id, 0);
        });
        
        tranzactii.forEach(t => {
            if (t.sportiv_id && !t.familie_id && balances.has(t.sportiv_id)) {
                balances.set(t.sportiv_id, (balances.get(t.sportiv_id) || 0) + t.suma);
            }
        });
        
        plati.forEach(p => {
            if (p.sportiv_id && !p.familie_id && balances.has(p.sportiv_id)) {
                balances.set(p.sportiv_id, (balances.get(p.sportiv_id) || 0) - p.suma);
            }
        });
        
        return balances;
    }, [sportivi, plati, tranzactii]);

    const unassignedSportivi = useMemo(() => {
        return sportivi.filter(s => !s.familie_id);
    }, [sportivi]);

    const handleCreateFamily = useCallback(async (nume: string, sportivIds?: string[], clubId?: string | null) => {
        setLoading(true);
        try {
            const { data: newFamily, error } = await familieService.createFamilie(nume, clubId);
            if (error) throw error;
            if (!newFamily) throw new Error("Familia a fost creată, dar nu a putut fi recuperată.");

            setFamilii(prev => [...prev, newFamily]);

            if (sportivIds && sportivIds.length > 0) {
                const { data: updatedSportivi, error: assignError } = await familieService.assignSportiviToFamilie(newFamily.id, sportivIds);
                if (assignError) throw assignError;

                setSportivi(prev => prev.map(s => {
                    const updated = updatedSportivi.find(u => u.id === s.id);
                    return updated ? { ...s, familie_id: newFamily.id } : s;
                }));
            }

            showSuccess("Succes", `Familia "${newFamily.nume}" a fost creată.`);
            return { success: true, data: newFamily };
        } catch (err) {
            showError("Eroare la Creare Familie", err);
            return { success: false, error: err };
        } finally {
            setLoading(false);
        }
    }, [setFamilii, setSportivi, showError, showSuccess]);

    const handleUpdateFamily = useCallback(async (id: string, updates: Partial<Familie>) => {
        try {
            const { error } = await familieService.updateFamilie(id, updates);
            if (error) throw error;

            setFamilii(prev => prev.map(f => (f.id === id ? { ...f, ...updates } : f)));
            return { success: true };
        } catch (err) {
            showError("Eroare la Actualizare Familie", err);
            return { success: false, error: err };
        }
    }, [setFamilii, showError]);

    const handleDeleteFamily = useCallback(async (id: string) => {
        const membri = sportivi.filter(s => s.familie_id === id);
        if (membri.length > 0) {
            showError("Ștergere Blocată", `Nu puteți șterge familia deoarece conține ${membri.length} membri.`);
            return { success: false };
        }

        setLoading(true);
        try {
            const { error } = await familieService.deleteFamilie(id);
            if (error) throw error;

            setFamilii(prev => prev.filter(f => f.id !== id));
            showSuccess('Succes', 'Familia a fost ștearsă.');
            return { success: true };
        } catch (err) {
            showError("Eroare la Ștergere Familie", err);
            return { success: false, error: err };
        } finally {
            setLoading(false);
        }
    }, [sportivi, setFamilii, showError, showSuccess]);

    const handleAssignToFamily = useCallback(async (familieId: string, sportivIds: string[]) => {
        try {
            const { data: updatedSportivi, error } = await familieService.assignSportiviToFamilie(familieId, sportivIds);
            if (error) throw error;

            setSportivi(prev => prev.map(s => {
                const updated = updatedSportivi.find(u => u.id === s.id);
                return updated ? { ...s, familie_id: familieId } : s;
            }));
            showSuccess("Succes", "Sportivii au fost asignați familiei.");
            return { success: true };
        } catch (err) {
            showError("Eroare la Asignare Familie", err);
            return { success: false, error: err };
        }
    }, [setSportivi, showError, showSuccess]);

    const handleRemoveFromFamily = useCallback(async (sportivId: string) => {
        try {
            const { error } = await familieService.removeSportivFromFamilie(sportivId);
            if (error) throw error;

            setSportivi(prev => prev.map(s => s.id === sportivId ? { ...s, familie_id: null } : s));
            showSuccess("Succes", "Sportivul a fost eliminat din familie.");
            return { success: true };
        } catch (err) {
            showError("Eroare la Eliminare din Familie", err);
            return { success: false, error: err };
        }
    }, [setSportivi, showError, showSuccess]);

    const handleSetRepresentative = useCallback(async (familieId: string, sportivId: string | null) => {
        try {
            const { error } = await familieService.updateFamilie(familieId, { reprezentant_id: sportivId });
            if (error) throw error;

            setFamilii(prev => prev.map(f => f.id === familieId ? { ...f, reprezentant_id: sportivId } : f));
            showSuccess("Succes", "Reprezentantul familiei a fost actualizat.");
            return { success: true };
        } catch (err) {
            showError("Eroare la Setare Reprezentant", err);
            return { success: false, error: err };
        }
    }, [setFamilii, showError, showSuccess]);

    return {
        loading,
        familyBalances,
        individualBalances,
        unassignedSportivi,
        handleCreateFamily,
        handleUpdateFamily,
        handleDeleteFamily,
        handleAssignToFamily,
        handleRemoveFromFamily,
        handleSetRepresentative
    };
};
