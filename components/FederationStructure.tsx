
import React, { useMemo } from 'react';
import { Club, Sportiv, Grupa, View } from '../types';
import { Card, Button } from './ui';
import { ArrowLeftIcon, UsersIcon, ClipboardListIcon, BanknotesIcon } from './icons';

interface FederationStructureProps {
    clubs: Club[];
    sportivi: Sportiv[];
    grupe: Grupa[];
    onBack: () => void;
    onNavigate: (view: View) => void;
}

export const FederationStructure: React.FC<FederationStructureProps> = ({ clubs, sportivi, grupe, onBack, onNavigate }) => {
    
    const statsByClub = useMemo(() => {
        return clubs.map(club => {
            const clubSportivi = sportivi.filter(s => s.club_id === club.id);
            const clubGrupe = grupe.filter(g => g.club_id === club.id);
            const activeSportivi = clubSportivi.filter(s => s.status === 'Activ');

            return {
                ...club,
                totalSportivi: clubSportivi.length,
                activeSportivi: activeSportivi.length,
                totalGrupe: clubGrupe.length,
            };
        }).sort((a, b) => b.totalSportivi - a.totalSportivi);
    }, [clubs, sportivi, grupe]);

    const totalFederatie = useMemo(() => ({
        sportivi: sportivi.length,
        activi: sportivi.filter(s => s.status === 'Activ').length,
        cluburi: clubs.length,
        grupe: grupe.length
    }), [sportivi, clubs, grupe]);

    return (
        <div className="space-y-6">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <Button onClick={onBack} variant="secondary" className="mb-2">
                        <ArrowLeftIcon className="w-5 h-5 mr-2" /> Meniu
                    </Button>
                    <h1 className="text-3xl font-bold text-white">Structura Organizațională</h1>
                    <p className="text-slate-400">Vizualizare ierarhică a cluburilor și resurselor federației</p>
                </div>
                
                <div className="flex gap-3">
                    <Card className="!p-3 bg-brand-primary/10 border-brand-primary/30 text-center">
                        <p className="text-xs text-slate-400 uppercase font-bold">Total Sportivi</p>
                        <p className="text-2xl font-black text-white">{totalFederatie.sportivi}</p>
                    </Card>
                    <Card className="!p-3 bg-green-500/10 border-green-500/30 text-center">
                        <p className="text-xs text-slate-400 uppercase font-bold">Cluburi Active</p>
                        <p className="text-2xl font-black text-white">{totalFederatie.cluburi}</p>
                    </Card>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {statsByClub.map(club => (
                    <Card key={club.id} className="group hover:border-brand-primary/50 transition-all duration-300">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="text-xl font-bold text-white group-hover:text-brand-primary transition-colors">{club.nume}</h3>
                                <p className="text-sm text-slate-500">{club.oras || 'Localitate nespecificată'}</p>
                            </div>
                            <div className="p-2 bg-slate-800 rounded-lg">
                                <UsersIcon className="w-6 h-6 text-brand-secondary" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-800">
                                <p className="text-[10px] text-slate-500 uppercase font-bold">Sportivi Activi</p>
                                <p className="text-lg font-bold text-green-400">{club.activeSportivi} / {club.totalSportivi}</p>
                            </div>
                            <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-800">
                                <p className="text-[10px] text-slate-500 uppercase font-bold">Grupe Orar</p>
                                <p className="text-lg font-bold text-sky-400">{club.totalGrupe}</p>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-slate-800 flex justify-between items-center">
                            <span className="text-xs text-slate-500">ID: {club.id.slice(0,8)}...</span>
                            <Button size="sm" variant="secondary" onClick={() => onNavigate('cluburi')}>
                                Detalii Club
                            </Button>
                        </div>
                    </Card>
                ))}
            </div>

            <Card className="bg-slate-900/50 border-dashed">
                <div className="flex flex-col items-center justify-center p-4 md:p-8 text-center">
                    <div className="p-4 bg-slate-800 rounded-full mb-4">
                        <ClipboardListIcon className="w-12 h-12 text-slate-600" />
                    </div>
                    <h4 className="text-xl font-bold text-white">Adaugă un nou Club</h4>
                    <p className="text-slate-400 max-w-md mx-auto mt-2 mb-6">Extinde rețeaua federației prin înregistrarea unei noi filiale sau a unui club partener.</p>
                    <Button onClick={() => onNavigate('cluburi')} variant="primary" className="px-8">
                        Lansare Manager Cluburi
                    </Button>
                </div>
            </Card>
        </div>
    );
};
