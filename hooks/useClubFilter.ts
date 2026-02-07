import React from 'react';
import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Permissions, User } from '../types';
import { useLocalStorage } from './useLocalStorage';
import { useError } from './useError';

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
    const { showError } = useError();
    
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

        const fetchContext = async () => {
            if (!supabase) {
                showError("Eroare Configurare", "Clientul Supabase nu a fost inițializat.");
                setLoading(false);
                return;
            }
            
            setLoading(true);
            const { data, error } = await supabase.rpc('get_primary_user_context');

            if (error) {
                showError("Eroare la preluarea contextului", `Nu s-a putut determina clubul activ. Detalii: ${error.message}`);
                setActiveClubId(null);
            } else if (data) {
                setActiveClubId(data.active_club_id || null);
            } else {
                // RPC a returnat null, probabil niciun context primar. Fallback la profilul propriu.
                setActiveClubId(currentUser.club_id);
            }
            setLoading(false);
        };
        
        fetchContext();

    }, [currentUser, permissions.isFederationAdmin, globalClubFilter, showError, setGlobalClubFilter, canChangeClub]);

    return {
        activeClubId,
        loading,
        canChangeClub,
        globalClubFilter,
        setGlobalClubFilter,
    };
};
