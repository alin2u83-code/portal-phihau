import React, { useState, useEffect } from 'react';
import { Permissions, User } from '../types';
import { useLocalStorage } from './useLocalStorage';

interface UseClubFilterResult {
    activeClubId: string | null;
    loading: boolean;
    canChangeClub: boolean;
    globalClubFilter: string | null;
    setGlobalClubFilter: React.Dispatch<React.SetStateAction<string | null>>;
}

export const useClubFilter = (currentUser: User | null, permissions: Permissions, allowedClubs: string[] = [], accessLoading: boolean = false): UseClubFilterResult => {
    const [activeClubId, setActiveClubId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    
    const [globalClubFilter, setGlobalClubFilter] = useLocalStorage<string | null>('phi-hau-global-club-filter', null);

    const canChangeClub = permissions.isFederationAdmin;

    useEffect(() => {
        if (accessLoading) return;
        setLoading(true);
        
        if (!currentUser) {
            setActiveClubId(null);
            setLoading(false);
            return;
        }

        // 1. Determine the candidate club ID
        // If canChangeClub (Federation Admin), we respect the global filter, otherwise default to user's club
        let candidateClubId = canChangeClub ? (globalClubFilter || currentUser.club_id) : currentUser.club_id;

        // Sanitize candidateClubId to avoid "null" string
        if (candidateClubId === 'null' || candidateClubId === 'undefined') {
            candidateClubId = null;
        }

        // 2. Validate against allowedClubs
        // If candidateClubId is not in allowedClubs, force it to a valid one or null
        let finalClubId = candidateClubId;
        if (finalClubId && !allowedClubs.includes(finalClubId) && !canChangeClub) {
            finalClubId = allowedClubs.length > 0 ? allowedClubs[0] : null;
        }

        setActiveClubId(finalClubId);
        
        // Sync global filter if it changed to maintain consistency
        if (globalClubFilter !== finalClubId) {
            setGlobalClubFilter(finalClubId);
        }
        
        setLoading(false);
    }, [currentUser, canChangeClub, globalClubFilter, setGlobalClubFilter, allowedClubs, accessLoading]);

    return {
        activeClubId,
        loading,
        canChangeClub,
        globalClubFilter,
        setGlobalClubFilter,
    };
};
