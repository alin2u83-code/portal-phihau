import React, { useEffect } from 'react';
import { useClubAccess } from '../hooks/useClubAccess';
import { useData } from '../contexts/DataContext';
import { Select } from './ui';

interface ClubGuardProps {
    children: React.ReactNode;
}

export const ClubGuard: React.FC<ClubGuardProps> = ({ children }) => {
    const { allowedClubs, loading } = useClubAccess();
    const { activeClubId, setGlobalClubFilter, clubs } = useData();

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

    return (
        <>
            {allowedClubs.length > 1 && (
                <div className="fixed top-20 right-4 z-50 bg-slate-900/90 p-2 rounded-lg border border-slate-700 shadow-lg backdrop-blur-sm">
                    <label className="block text-xs text-slate-400 mb-1 font-bold uppercase tracking-wider">Club Activ</label>
                    <Select 
                        value={activeClubId || ''} 
                        onChange={(e) => setGlobalClubFilter(e.target.value)}
                        className="!py-1 !text-sm min-w-[200px] bg-slate-800 border-slate-600 focus:ring-indigo-500"
                    >
                        {clubs
                            .filter(c => allowedClubs.includes(c.id))
                            .map(c => (
                                <option key={c.id} value={c.id}>{c.nume}</option>
                            ))
                        }
                    </Select>
                </div>
            )}
            {children}
        </>
    );
};
