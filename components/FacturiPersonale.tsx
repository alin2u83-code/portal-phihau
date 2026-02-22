import React, { useMemo } from 'react';
import { User, VizualizarePlata } from '../types';
import { Button, Card } from './ui';
import { ArrowLeftIcon } from './icons';

interface IstoricPlatiProps {
    viewedUser: User;
    vizualizarePlati: VizualizarePlata[];
    onBack: () => void;
}

export const IstoricPlati: React.FC<IstoricPlatiProps> = ({ viewedUser, vizualizarePlati, onBack }) => {
    const userPlati = useMemo(() => {
        return vizualizarePlati
            .filter(p => p.sportiv_id === viewedUser.id || (p.familie_id && p.familie_id === viewedUser.familie_id))
            .sort((a, b) => new Date(b.data_emitere).getTime() - new Date(a.data_emitere).getTime());
    }, [viewedUser, vizualizarePlati]);

    const groupedPlati = useMemo(() => {
        const map = new Map<string, VizualizarePlata & { incasari: { data_plata: string, suma_incasata: number }[] }>();
        userPlati.forEach(p => {
            if (!map.has(p.plata_id)) {
                map.set(p.plata_id, { ...p, incasari: [] });
            }
            if (p.data_plata && p.suma_incasata) {
                map.get(p.plata_id)!.incasari.push({ data_plata: p.data_plata, suma_incasata: p.suma_incasata });
            }
        });
        return Array.from(map.values());
    }, [userPlati]);
    
    const totalRestant = useMemo(() => {
        return groupedPlati
            .filter(p => p.status !== 'Achitat')
            .reduce((sum, p) => {
                const totalIncasat = p.incasari.reduce((s, i) => s + (i.suma_incasata || 0), 0);
                return sum + (p.suma_datorata - totalIncasat);
            }, 0);
    }, [groupedPlati]);


    return (
        <div className="space-y-6">
            <Button onClick={onBack} variant="secondary"><ArrowLeftIcon className="w-5 h-5 mr-2" /> Înapoi la Portal</Button>
            
            <header className="text-left">
                 <h1 className="text-3xl font-bold text-white">Istoric Plăți</h1>
                 <p className="text-lg text-slate-300">{viewedUser.nume} {viewedUser.prenume}</p>
            </header>

            <Card>
                <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-white">Total de Plată Restant</h3>
                    <p className={`text-3xl font-bold ${totalRestant > 0 ? 'text-red-400' : 'text-green-400'}`}>
                        {totalRestant.toFixed(2)} RON
                    </p>
                </div>
            </Card>

            <Card className="p-0 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-700/50">
                            <tr>
                                <th className="p-3 font-semibold">Data Emiterii</th>
                                <th className="p-3 font-semibold">Descriere</th>
                                <th className="p-3 font-semibold text-right">Sumă Datorată</th>
                                <th className="p-3 font-semibold text-center">Status</th>
                                <th className="p-3 font-semibold">Data Ultimei Plăți</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700">
                            {groupedPlati.map(p => (
                                <tr key={p.plata_id} className="hover:bg-slate-700/30">
                                    <td className="p-3 whitespace-nowrap">{new Date(p.data_emitere).toLocaleDateString('ro-RO')}</td>
                                    <td className="p-3 font-semibold text-white">{p.descriere}</td>
                                    <td className="p-3 text-right font-bold">{p.suma_datorata.toFixed(2)} RON</td>
                                    <td className="p-3 text-center">
                                         <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                                            p.status === 'Achitat' ? 'bg-green-600/20 text-green-400 border-green-600/50' : 
                                            p.status === 'Achitat Parțial' ? 'bg-amber-600/20 text-amber-400 border-amber-600/50' : 
                                            'bg-red-600/20 text-red-400 border-red-600/50'
                                        }`}>
                                            {p.status}
                                        </span>
                                    </td>
                                    <td className="p-3 text-slate-400">{p.data_plata ? new Date(p.data_plata).toLocaleDateString('ro-RO') : '-'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {groupedPlati.length === 0 && <p className="p-8 text-center text-slate-500 italic">Nu ai nicio factură înregistrată.</p>}
                </div>
            </Card>
        </div>
    );
};