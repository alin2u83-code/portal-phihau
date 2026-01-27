import { useEffect, useMemo } from 'react';
import { User } from '../types';
import { usePermissions } from './usePermissions';
import { useLocalStorage } from './useLocalStorage';

export const useClubFilter = (currentUser: User | null) => {
    const [globalClubFilter, setGlobalClubFilter] = useLocalStorage<string | null>('phi-hau-global-club-filter', null);
    const permissions = usePermissions(currentUser);

    const activeClubId = useMemo(() => {
        if (permissions.isFederationAdmin) {
            return globalClubFilter;
        }
        if (permissions.isAdminClub || permissions.isInstructor) {
            return currentUser?.club_id || null;
        }
        return null; 
    }, [currentUser, permissions, globalClubFilter]);
    
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
