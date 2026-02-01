import { useEffect, useMemo } from 'react';
import { User, Permissions } from '../types';
import { useLocalStorage } from './useLocalStorage';

export const useClubFilter = (currentUser: User | null, permissions: Permissions, activeRoleContext: any | null) => {
    const [globalClubFilter, setGlobalClubFilter] = useLocalStorage<string | null>('phi-hau-global-club-filter', null);
    
    const activeClubId = useMemo(() => {
        if (permissions.isFederationAdmin) {
            return globalClubFilter;
        }
        // Use the club_id from the selected context!
        return activeRoleContext?.club_id || null;
    }, [permissions.isFederationAdmin, globalClubFilter, activeRoleContext]);
    
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
