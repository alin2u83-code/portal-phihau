
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Permissions, User } from '../types';
import { useLocalStorage } from './useLocalStorage';

interface UseClubFilterResult {
    activeClubId: string | null;
    loading: boolean;
    canChangeClub: boolean;
    globalClubFilter: string | null;
    setGlobalClubFilter: React.Dispatch<React.SetStateAction<string | null>>;
}

export const useClubFilter = (currentUser: User | null, permissions: Permissions): UseClubFilterResult => {
    const [activeClubId, setActiveClubId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    
    const [globalClubFilter, setGlobalClubFilter] = useLocalStorage<string | null>('phi-hau-global-club-filter', null);

    const canChangeClub = permissions.isFederationAdmin;

    useEffect(() => {
        if (!currentUser) {
            setLoading(false);
            return;
        }

        if (canChangeClub) {
            setActiveClubId(globalClubFilter);
            setLoading(false);
            return; // Nu se apelează RPC pentru adminii de federație
        }
        
        // Resetează filtrul global dacă utilizatorul nu este admin de federație
        if (globalClubFilter !== null) {
            setGlobalClubFilter(null);
        }

        const fetchContextWithRetry = async (retries = 3, delay = 300) => {
            for (let i = 0; i < retries; i++) {
                if (!supabase) {
                    console.error("[useClubFilter] Clientul Supabase nu este disponibil.");
                    return { data: null, error: { message: "Clientul Supabase nu este disponibil." } };
                }
                
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) {
                    console.warn(`[useClubFilter] Reîncercare ${i + 1}/${retries}: Sesiunea Supabase nu este gata. Se reîncearcă...`);
                    if (i < retries - 1) {
                        await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
                        continue;
                    } else {
                        return { data: null, error: { message: "Sesiunea Supabase nu a fost disponibilă după mai multe încercări." } };
                    }
                }

                const { data, error } = await supabase.rpc('get_primary_user_context');

                if (!error && data) {
                    return { data, error: null }; // Succes
                }
                
                const errorMessage = error ? error.message : "Datele de context sunt nule.";
                console.warn(`[useClubFilter] Reîncercare ${i + 1}/${retries}: ${errorMessage}`);

                if (i < retries - 1) {
                    await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
                }
            }
            return { data: null, error: { message: "Preluarea contextului utilizatorului a eșuat după mai multe reîncercări." } };
        };

        const fetchContext = async () => {
            setLoading(true);
            const { data, error } = await fetchContextWithRetry();

            if (error) {
                console.error("[useClubFilter] Eroare la preluarea contextului:", `Nu s-a putut determina clubul activ. Detalii: ${error.message}`);
                // Fallback la club_id-ul direct al utilizatorului ca ultimă soluție
                setActiveClubId(currentUser.club_id); 
            } else if (data) {
                // Numele coloanei este 'active_club_id' din RPC
                setActiveClubId(data.active_club_id || null);
            } else {
                console.warn("[useClubFilter] RPC a returnat un context nul. Se folosește club_id-ul direct de pe profilul utilizatorului.");
                setActiveClubId(currentUser.club_id);
            }
            setLoading(false);
        };
        
        fetchContext();

    }, [currentUser, permissions.isFederationAdmin, globalClubFilter, setGlobalClubFilter, canChangeClub]);

    return {
        activeClubId,
        loading,
        canChangeClub,
        globalClubFilter,
        setGlobalClubFilter,
    };
};