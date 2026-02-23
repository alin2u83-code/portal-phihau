import React from 'react';
import { Sportiv } from '../types';
import { Card } from './ui';

interface SportiviGridProps {
    sportivi: Sportiv[] | null | undefined;
}

const CardSportiv: React.FC<{ sportiv: Sportiv }> = ({ sportiv }) => (
    <Card className="bg-slate-800 border-slate-700 p-4">
        <h3 className="font-bold text-white text-lg">{sportiv.nume} {sportiv.prenume}</h3>
        <p className="text-sm text-slate-400">{sportiv.cluburi?.nume || 'Club necunoscut'}</p>
        <p className="text-xs mt-2">
            Status: <span className={`font-semibold ${sportiv.status === 'Activ' ? 'text-green-400' : 'text-red-400'}`}>{sportiv.status}</span>
        </p>
    </Card>
);

export const SportiviGrid: React.FC<SportiviGridProps> = ({ sportivi }) => {
    const sportiviAfisati = sportivi?.filter(s => s !== null) || [];

    return (
        <div className="p-4 bg-slate-900 min-h-screen text-white">
            <header className="mb-6">
                <h1 className="text-3xl font-bold text-center text-amber-400">Debug Sportivi Grid</h1>
                <p className="text-center text-slate-400">Randează direct din hook, fără filtre.</p>
            </header>

            {sportiviAfisati.length > 0 && (
                <div className="bg-slate-800 p-2 rounded-md mb-4 text-xs font-mono overflow-x-auto">
                    <pre><code>{JSON.stringify(sportiviAfisati[0], null, 2)}</code></pre>
                </div>
            )}

            {sportiviAfisati.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {sportiviAfisati.map(sportiv => (
                        <CardSportiv key={sportiv.id} sportiv={sportiv} />
                    ))}
                </div>
            ) : (
                <div className="p-10 text-center bg-slate-800 rounded-lg">
                    <p className="text-lg font-semibold">Debug Info:</p>
                    <p className="text-slate-300">Datele sunt în hook (total: {sportivi?.length}), dar nu trec de filtrele paginii sau `sportiviAfisati` este gol.</p>
                    <p className="text-slate-400 mt-2 text-sm">Verifică dacă `sportivi` este `null` sau `undefined`.</p>
                </div>
            )}
        </div>
    );
};
