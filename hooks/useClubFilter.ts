import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Permissions, User } from '../types';
import { useLocalStorage } from './useLocalStorage';
import { useClubAccess } from './useClubAccess';

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
    const { allowedClubs, loading: accessLoading } = useClubAccess();

    const canChangeClub = permissions.isFederationAdmin;

    useEffect(() => {
        if (accessLoading) return;
        setLoading(true);
        if (!currentUser) {
            setLoading(false);
            return;
        }

        const userClubId = currentUser.club_id;
        
        // Validation Logic: Check if the club is in the allowed list
        let targetClubId = canChangeClub ? (globalClubFilter || userClubId) : userClubId;
        
        // If targetClubId is not in allowedClubs and user is not super admin, reset to first allowed or null
        if (!canChangeClub && targetClubId && !allowedClubs.includes(targetClubId)) {
            targetClubId = allowedClubs.length > 0 ? allowedClubs[0] : null;
            setGlobalClubFilter(targetClubId);
        }

        setActiveClubId(targetClubId);
        
        // Ensure the global filter reflects this fixed context for UI consistency.
        if (!canChangeClub && globalClubFilter !== targetClubId) {
            setGlobalClubFilter(targetClubId);
        }
        
        setLoading(false);

    }, [currentUser, permissions.isFederationAdmin, globalClubFilter, setGlobalClubFilter, canChangeClub, allowedClubs, accessLoading]);

    return {
        activeClubId,
        loading,
        canChangeClub,
        globalClubFilter,
        setGlobalClubFilter,
    };
};
