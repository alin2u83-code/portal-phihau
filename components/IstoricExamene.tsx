import React, { useMemo } from 'react';
import { User, InscriereExamen, SesiuneExamen, Grad } from '../types';
import { Button, Card } from './ui';
import { ArrowLeftIcon } from './icons';

interface IstoricExameneProps {
    viewedUser: User;
    participari: InscriereExamen[];
    sesiuni: SesiuneExamen[];
    grade: Grad[];
    onBack: () => void;
}

export const IstoricExamene: React.FC<IstoricExameneProps> = ({ viewedUser, participari, sesiuni, grade, onBack }) => {

    const userParticipari = useMemo(() => {
        return participari
            .filter(p => p.sportiv_id === viewedUser.id)
            .map(p => {
                const sesiune = sesiuni.find(s => s.id === p.sesiune_id);
                const grad = grade.find(g => g.id === p.grad_sustinut_id);
                return {
                    ...p,
                    data_examen: sesiune?.data || 'N/A',
                    nume_grad: grad?.nume || 'N/A'
                };
            })
            .sort((a, b) => new Date(b.data_examen).getTime() - new Date(a.data_examen).getTime());
    }, [viewedUser.id, participari, sesiuni, grade]);

    return (
        <div className="space-y-6">
            <Button onClick={onBack} variant="secondary"><ArrowLeftIcon className="w-5 h-5 mr-2" /> Înapoi la Portal</Button>
            
            <header className="text-left">
                 <h1 className="text-3xl font-bold text-white">Istoric Examinări</h1>
                 <p className="text-lg text-slate-300">{viewedUser.nume} {viewedUser.prenume}</p>
            </header>

            <Card className="p-0 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-700/50">
                            <tr>
                                <th className="p-3 font-semibold">Data Examen</th>
                                <th className="p-3 font-semibold">Grad Susținut</th>
                                <th className="p-3 font-semibold text-center">Rezultat</th>
                                <th className="p-3 font-semibold">Observații</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700">
                            {userParticipari.map(p => (
                                <tr key={p.id} className="hover:bg-slate-700/30">
                                    <td className="p-3 whitespace-nowrap">{new Date(p.data_examen + 'T00:00:00').toLocaleDateString('ro-RO')}</td>
                                    <td className="p-3 font-semibold text-white">{p.nume_grad}</td>
                                    <td className="p-3 text-center">
                                         <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                                            p.rezultat === 'Admis' ? 'bg-green-600/20 text-green-400 border-green-600/50' : 
                                            p.rezultat === 'Respins' ? 'bg-red-600/20 text-red-400 border-red-600/50' : 
                                            'bg-slate-600/20 text-slate-400 border-slate-600/50'
                                        }`}>
                                            {p.rezultat}
                                        </span>
                                    </td>
                                    <td className="p-3 text-slate-400">{p.observatii || '-'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {userParticipari.length === 0 && <p className="p-8 text-center text-slate-500 italic">Nu ai participat la niciun examen încă.</p>}
                </div>
            </Card>
        </div>
    );
};
