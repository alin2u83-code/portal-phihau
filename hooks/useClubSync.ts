import { useEffect } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { User } from '../types';

export const useClubSync = (currentUser: User | null) => {
    const [globalFilter, setGlobalFilter] = useLocalStorage<string | null>('phi-hau-global-club-filter', null);

    useEffect(() => {
        if (currentUser && currentUser.club_id) {
            // If the user has a specific club_id in metadata (or profile), ensure local storage matches.
            // This is especially for users who are *not* super admins and should be locked to their club.
            const isSuperAdmin = currentUser.roluri?.some(r => r.nume === 'SUPER_ADMIN_FEDERATIE');
            
            if (!isSuperAdmin) {
                if (globalFilter !== currentUser.club_id) {
                    console.log(`Syncing club filter: Local (${globalFilter}) -> User (${currentUser.club_id})`);
                    setGlobalFilter(currentUser.club_id);
                    // Force reload if necessary, but changing local storage might trigger other hooks.
                    // However, useLocalStorage hook updates state, which triggers re-renders.
                }
            }
        }
    }, [currentUser, globalFilter, setGlobalFilter]);
};
