import React, { useMemo } from 'react';
import { User, Plata, Tranzactie, Grad, Grupa, Participare, Examen, Reducere } from '../types';
import { Card, Button } from './ui';
import { ArrowLeftIcon, BanknotesIcon } from './icons';

// Props
interface ProfilSportivProps {
    currentUser: User;
    plati: Plata[];
    tranzactii: Tranzactie[];
    reduceri: Reducere[];
    grade: Grad[];
    grupe: Grupa[];
    participari: Participare[];
    examene: Examen[];
    onBack: () => void;
}

const getGrad = (gradId: string, allGrades: Grad[]) => allGrades.find(g => g.id === gradId);

const HistoryTable: React.FC<{ items: any[], title: string, emptyMessage: string }> = ({ items, title, emptyMessage }) => (
    <>
        <div className="p-4 bg-slate-700/80">
            <h4 className="font-semibold text-white">{title}</h4>
        </div>
        <div className="overflow-x-auto max-h-72">
            <table className="w-full text-left text-sm">
                 <thead className="bg-slate-800 text-slate-400 text-xs uppercase sticky top-0 backdrop-blur-sm">
                    <tr>
                        <th className="p-3">Descriere</th>
                        <th className="p-3 text-right">Sumă</th>
                        <th className="p-3">Data Emiterii</th>
                        <th className="p-3 text-center">Status</th>
                        <th className="p-3">Data Încasării</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                    {items.map(item => (
                        <tr key={item.id} className="hover:bg-slate-700/30">
                            <td className="p-3 font-medium text-white">{item.descriere}</td>
                            <td className="p-3 text-right font-semibold">
                                {item.suma_initiala && item.suma_initiala > item.suma ? (
                                    <div>
                                        <span>{item.suma.toFixed(2)} lei</span>
                                        <div className="text-xs text-slate-400 font-normal leading-tight whitespace-nowrap">
                                            ({item.suma_initiala.toFixed(2)} - {item.discountInfo})
                                        </div>
                                    </div>
                                ) : (
                                    <span>{item.suma.toFixed(2)} lei</span>
                                )}
                            </td>
                            <td className="p-3 text-slate-400">{new Date(item.data).toLocaleDateString('ro-RO')}</td>
                            <td className="p-3 text-center">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                                    item.status === 'Achitat' ? 'bg-green-600/20 text-green-400 border-green-600/50' : 
                                    item.status === 'Achitat Parțial' ? 'bg-amber-600/20 text-amber-400 border-amber-600/50' : 
                                    'bg-red-600/20 text-red-400 border-red-600/50'
                                }`}>
                                    {item.status}
                                </span>
                            </td>
                            <td className="p-3 text-slate-400">
                                {item.dataIncasare ? new Date(item.dataIncasare).toLocaleDateString('ro-RO') : '-'}
                            </td>
                        </tr>
                    ))}
                    {items.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-slate-500 italic">{emptyMessage}</td></tr>}
                </tbody>
            </table>
        </div>
    </>
);

export const ProfilSportiv: React.FC<ProfilSportivProps> = ({ currentUser, plati, tranzactii, reduceri, grade, grupe, participari, examene, onBack }) => {

    const { currentGrad, currentGrupa } = useMemo(() => {
        const admittedParticipations = participari
            .filter(p => p.sportiv_id === currentUser.id && p.rezultat === 'Admis')
            .sort((a, b) => {
                const dateA = examene.find(e => e.id === a.sesiune_id)?.data || '1970-01-01';
                const dateB = examene.find(e => e.id === b.sesiune_id)?.data || '1970-01-01';
                return new Date(dateB).getTime() - new Date(dateA).getTime();
            });
        
        const grad = admittedParticipations.length > 0 ? getGrad(admittedParticipations[0].grad_sustinut_id, grade) : null;
        const grupa = grupe.find(g => g.id === currentUser.grupa_id);

        return { currentGrad: grad, currentGrupa: grupa };
    }, [currentUser, participari, examene, grade, grupe]);

    const { sold, individualHistory, familieHistory } = useMemo(() => {
        // Calcul sold total
        const allRelevantPlati = plati.filter(p => p.sportiv_id === currentUser.id || (p.familie_id && p.familie_id === currentUser.familie_id));
        const allRelevantTranzactii = tranzactii.filter(t => t.sportiv_id === currentUser.id || (t.familie_id && t.familie_id === currentUser.familie_id));
        const totalDatorii = allRelevantPlati.reduce((sum, p) => sum + p.suma, 0);
        const totalIncasari = allRelevantTranzactii.reduce((sum, t) => sum + t.suma, 0);
        const currentSold = totalIncasari - totalDatorii;
        
        // Asigură unicitatea (DISTINCT ON)
        // FIX: The `[...map.values()]` pattern was causing a type inference issue, resulting in `unknown[]`.
        // Switched to `Array.from(map.values())` to ensure the correct type `Plata[]` is inferred.
        const uniquePlati: Plata[] = Array.from(new Map(allRelevantPlati.map(p => [p.id, p])).values());

        const processPlati = (platiList: Plata[]) => {
            return platiList.map(plata => {
                let dataIncasare: string | null = null;
                if (plata.status === 'Achitat' || plata.status === 'Achitat Parțial') {
                    const tranzactieCorespondenta = tranzactii.find(t => t.plata_ids?.includes(plata.id));
                    if (tranzactieCorespondenta) dataIncasare = tranzactieCorespondenta.data_platii;
                }
                const reducereAplicata = plata.reducere_id ? reduceri.find(r => r.id === plata.reducere_id) : null;
                let discountInfo = null;
                if (reducereAplicata && plata.suma_initiala) {
                    const valoareReducere = plata.suma_initiala - plata.suma;
                    discountInfo = `${valoareReducere.toFixed(2)} lei (${reducereAplicata.nume})`;
                }
                return { ...plata, dataIncasare, discountInfo };
            }).sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
        };

        const individualPlati = uniquePlati.filter(p => p.sportiv_id === currentUser.id && !p.familie_id);
        const familiePlati = uniquePlati.filter(p => p.familie_id && p.familie_id === currentUser.familie_id);
        
        return {
            sold: currentSold,
            individualHistory: processPlati(individualPlati),
            familieHistory: processPlati(familiePlati)
        };
    }, [plati, tranzactii, currentUser, reduceri]);


    return (
        <div className="space-y-6">
            <Button onClick={onBack} variant="secondary"><ArrowLeftIcon className="w-5 h-5 mr-2" /> Înapoi la Portal</Button>
            
            <Card className="bg-slate-800/70 border-brand-secondary/20">
                <div className="flex items-center gap-4">
                    <BanknotesIcon className="w-10 h-10 text-brand-secondary"/>
                    <div>
                        <h1 className="text-2xl font-bold text-white">{currentUser.nume} {currentUser.prenume}</h1>
                        <p className="text-sm text-slate-300">
                            {currentGrupa?.denumire || 'Fără grupă'} / {currentGrad?.nume || 'Începător'}
                        </p>
                    </div>
                </div>
            </Card>

            <Card className="p-0 overflow-hidden">
                <div className="p-4 bg-slate-700/50 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-white">Facturile mele</h2>
                    <p className={`text-sm font-bold ${sold >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        Sold Curent: {sold.toFixed(2)} RON
                    </p>
                </div>

                <HistoryTable items={individualHistory} title="Plăți Individuale" emptyMessage="Nicio plată individuală înregistrată." />

                {currentUser.familie_id && (
                     <HistoryTable items={familieHistory} title="Plăți Familie" emptyMessage="Nicio plată de familie înregistrată." />
                )}
            </Card>
        </div>
    );
};