import { useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { Sportiv } from '../types';

export const useClubMismatch = (selectedSportiv: Sportiv | null) => {
    const { activeClubId } = useData();

    useEffect(() => {
        if (selectedSportiv && activeClubId && selectedSportiv.club_id !== activeClubId) {
            // Check if the user is a super admin (who can see all clubs) or if this is a valid cross-club access
            // But the requirement is to alert on mismatch.
            // We'll assume this is for standard users or to warn about context switching.
            alert(`Mismatch de Club! Sportivul selectat aparține clubului ${selectedSportiv.club_id}, dar contextul activ este ${activeClubId}.`);
        }
    }, [selectedSportiv, activeClubId]);
};
