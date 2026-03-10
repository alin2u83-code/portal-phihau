import React, { useState, useMemo } from 'react';
import { Sportiv, Club } from '../types';
import { Card } from './ui';
import { SearchIcon } from './icons';

interface FederationDashboardMobileProps {
    sportivi: Sportiv[];
    clubs: Club[];
}

export const FederationDashboardMobile: React.FC<FederationDashboardMobileProps> = ({ sportivi, clubs }) => {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredSportivi = useMemo(() => {
        if (!searchTerm) return sportivi;
        const lowerTerm = searchTerm.toLowerCase();
        return sportivi.filter(s => 
            s.nume.toLowerCase().includes(lowerTerm) || 
            s.prenume.toLowerCase().includes(lowerTerm) ||
            s.cod_sportiv?.toLowerCase().includes(lowerTerm)
        );
    }, [sportivi, searchTerm]);

    const stats = useMemo(() => {
        return {
            totalSportivi: sportivi.length,
            vizeActive: sportivi.filter(s => s.status === 'Activ').length,
            numarCluburi: clubs.length
        };
    }, [sportivi, clubs]);

    return (
        <div className="space-y-4 p-4">
            {/* Statistici rapide */}
            <div className="grid grid-cols-3 gap-2">
                <Card className="p-2 text-center">
                    <div className="text-xs text-slate-400">Sportivi</div>
                    <div className="text-lg font-bold text-white">{stats.totalSportivi}</div>
                </Card>
                <Card className="p-2 text-center">
                    <div className="text-xs text-slate-400">Vize</div>
                    <div className="text-lg font-bold text-emerald-400">{stats.vizeActive}</div>
                </Card>
                <Card className="p-2 text-center">
                    <div className="text-xs text-slate-400">Cluburi</div>
                    <div className="text-lg font-bold text-blue-400">{stats.numarCluburi}</div>
                </Card>
            </div>

            {/* Căutare Globală */}
            <div className="relative">
                <SearchIcon className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                <input 
                    type="text"
                    placeholder="Caută nume sau legitimatie..."
                    className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {/* Listă Sportivi */}
            <div className="space-y-2">
                {filteredSportivi.map(s => {
                    const club = clubs.find(c => c.id === s.club_id);
                    return (
                        <div key={s.id} className="bg-slate-800 p-3 rounded-lg flex justify-between items-center border border-slate-700">
                            <div>
                                <div className="font-bold text-white">{s.nume} {s.prenume}</div>
                                <div className="text-xs text-slate-400">Leg: {s.cod_sportiv}</div>
                            </div>
                            {club && (
                                <span className="px-2 py-1 bg-slate-700 text-xs rounded-full text-slate-200">
                                    {club.nume}
                                </span>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
