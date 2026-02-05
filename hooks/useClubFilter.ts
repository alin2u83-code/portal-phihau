import { useEffect, useMemo } from 'react';
import { User, Permissions } from '../types';
import { useLocalStorage } from './useLocalStorage';

export const useClubFilter = (currentUser: User | null, permissions: Permissions) => {
    const [globalClubFilter, setGlobalClubFilter] = useLocalStorage<string | null>('phi-hau-global-club-filter', null);
    
    // Set a default filter for federation admins on first load if none is set
    useEffect(() => {
        if (permissions.isFederationAdmin && globalClubFilter === null && currentUser?.club_id) {
            setGlobalClubFilter(currentUser.club_id);
        }
    }, [permissions.isFederationAdmin, globalClubFilter, currentUser?.club_id, setGlobalClubFilter]);

    const activeClubId = useMemo(() => {
        if (permissions.isFederationAdmin) {
            return globalClubFilter;
        }
        // Use the club_id from the user object directly!
        return currentUser?.club_id || null;
    }, [permissions.isFederationAdmin, globalClubFilter, currentUser]);
    
    useEffect(() => {
        // If user is not a federation admin, clear the global filter
        // to avoid incorrect state if their role changes.
        if (!permissions.isFederationAdmin) {
            setGlobalClubFilter(null);
        }
    }, [permissions.isFederationAdmin, setGlobalClubFilter]);

    return {
        activeClubId,
        globalClubFilter,
        setGlobalClubFilter,
        canChangeClub: permissions.isFederationAdmin,
    };
};