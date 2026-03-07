import React, { useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { Select } from './ui';

interface ClubGuardProps {
    children: React.ReactNode;
}

export const ClubGuard: React.FC<ClubGuardProps> = ({ children }) => {
    const { activeClubId, setGlobalClubFilter, clubs, allowedClubs, loading } = useData();

    useEffect(() => {
        if (!loading && allowedClubs.length > 0 && !activeClubId) {
            // Default to first allowed club if none selected
            setGlobalClubFilter(allowedClubs[0]);
        }
    }, [allowedClubs, loading, activeClubId, setGlobalClubFilter]);

    if (loading) {
        return <div className="flex items-center justify-center h-screen text-white">Se încarcă permisiunile...</div>;
    }

    if (allowedClubs.length === 0) {
        return (
            <div className="flex items-center justify-center h-screen text-white p-4">
                <div className="bg-slate-800 p-8 rounded-lg shadow-xl text-center max-w-md border border-red-500/30">
                    <h2 className="text-xl font-bold text-red-400 mb-4">Acces Restricționat</h2>
                    <p className="text-slate-300">
                        Contul dumneavoastră nu este încă asociat unui club Qwan Ki Do. 
                        Vă rugăm să contactați administratorul pentru a vă asocia unui club.
                    </p>
                </div>
            </div>
        );
    }

    return <>{children}</>;
};
