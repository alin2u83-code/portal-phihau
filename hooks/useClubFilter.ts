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
        setLoading(true);
        if (!currentUser) {
            setLoading(false);
            return;
        }

        // For federation-level admins, the active club is determined by the global filter they select.
        if (canChangeClub) {
            setActiveClubId(globalClubFilter);
        } else {
            // For club-level users, their context is fixed to their club.
            const userClubId = currentUser.club_id;
            setActiveClubId(userClubId);
            
            // Ensure the global filter reflects this fixed context for UI consistency.
            if (globalClubFilter !== userClubId) {
                setGlobalClubFilter(userClubId);
            }
        }
        
        setLoading(false);

    }, [currentUser, permissions.isFederationAdmin, globalClubFilter, setGlobalClubFilter, canChangeClub]);

    return {
        activeClubId,
        loading,
        canChangeClub,
        globalClubFilter,
        setGlobalClubFilter,
    };
};