import React from 'react';
import { Grupa } from '../../types';
import { Button, Card } from '../ui';
import { CalendarDaysIcon, UsersIcon, CogIcon } from '../icons';

export const GrupeList: React.FC<{ 
    onSelect: (id: string) => void; 
    onSelectToday: (id: string) => void; 
    onGlobalHistory: () => void; 
    grupe: (Grupa & {sportivi_count: {count: number}[]})[] 
}> = ({ onSelect, onSelectToday, onGlobalHistory, grupe }) => (
    <div className="space-y-4 md:space-y-8 animate-fade-in">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
                <h1 className="text-2xl md:text-4xl font-black text-white tracking-tight">Management Prezență</h1>
                <p className="text-slate-400 mt-1 text-sm">Gestionează orarul, calendarul și prezența sportivilor pe grupe.</p>
            </div>
            <Button variant="secondary" size="sm" onClick={onGlobalHistory} className="shrink-0">
                <CalendarDaysIcon className="w-4 h-4 mr-2 text-indigo-400" />
                Istoric Global
            </Button>
        </div>

        <div data-tour="prezenta-grupa" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
            {grupe.map(g => (
                <Card key={g.id} className="group relative flex flex-col overflow-hidden border-none shadow-xl hover:shadow-2xl transition-all duration-300 bg-slate-900/40 backdrop-blur-sm">
                    {/* Decorative accent */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500 opacity-50 group-hover:opacity-100 transition-opacity"></div>
                    
                    <div className="p-4 md:p-6 flex-grow">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-3 bg-indigo-500/10 rounded-2xl">
                                <UsersIcon className="w-6 h-6 text-indigo-400" />
                            </div>
                            <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 text-xs font-bold rounded-full border border-emerald-500/20">
                                {g.sportivi_count[0]?.count || 0} Sportivi
                            </span>
                        </div>

                        <h3 className="text-2xl font-bold text-white group-hover:text-indigo-300 transition-colors mb-2">{g.denumire}</h3>
                        
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm text-slate-400">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-600"></span>
                                <span>{g.sala || 'Sală nespecificată'}</span>
                            </div>
                            {g.program && g.program.length > 0 && (
                                <div className="flex items-center gap-2 text-sm text-slate-500">
                                    <CalendarDaysIcon className="w-3.5 h-3.5" />
                                    <span>{g.program.length} intervale săptămânale</span>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="p-4 md:p-6 pt-0 mt-auto space-y-3">
                        <Button 
                            variant="success" 
                            className="w-full justify-between group/btn shadow-lg shadow-emerald-900/20" 
                            onClick={() => onSelectToday(g.id)}
                        >
                            <span>Prezență Azi</span>
                            <span className="group-hover/btn:translate-x-1 transition-transform">&rarr;</span>
                        </Button>
                        <Button 
                            variant="primary" 
                            className="w-full justify-between group/btn bg-slate-800 hover:bg-slate-700 border-none" 
                            onClick={() => onSelect(g.id)}
                        >
                            <span>Configurare Orar</span>
                            <CogIcon className="w-4 h-4 group-hover/btn:rotate-90 transition-transform" />
                        </Button>
                    </div>
                </Card>
            ))}
        </div>
    </div>
);
